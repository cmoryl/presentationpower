// /convert — Cross-format layout adapter.
//
// Take one approved piece of content (a deck slide, or copy typed in) and
// convert it into another medium: a social card, a 1-page print brief, or a
// 1-page case study. The adapter preserves the headline, body copy, supporting
// points, figure and photography, and re-shapes them into the target layout's
// own structure and typographic hierarchy. Anything that had to be shortened,
// left out, or refused is listed under the preview before you export.

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listMyCloudDecks, loadCloudDeck } from "@/lib/cloud-decks.functions";
import { useSessionUser } from "@/hooks/use-session-user";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { AssetExportMenu } from "@/components/AssetExportMenu";
import { PrintProofMenu } from "@/components/export/PrintProofMenu";
import { BrandHealthBadge } from "@/components/brand/BrandHealthBadge";
import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { PrintBriefPreview } from "@/components/convert/PrintBriefPreview";
import {
  ADAPT_TARGETS,
  adaptContent,
  adaptTargetFormat,
  applySelection,
  contentFromSlide,
  EMPTY_SELECTION,
  type AdaptFieldKey,
  type AdaptSelection,
  toSocialCopy,
  type AdaptContent,
  type AdaptTargetId,
} from "@/lib/cross-format-adapt";
import { CSS_DPI } from "@/lib/print-proof-export";
import { seedContent, useDeckStore, type Brief } from "@/lib/deck-store";
import { BRAND_MODES, byId, MODULE_FAMILIES, MODULE_VARIANTS } from "@/lib/taxonomy";

const SearchSchema = z.object({
  deck: z.string().optional(),
  module: z.string().optional(),
  slide: z.coerce.number().int().min(0).optional(),
  to: z.string().optional(),
});

export const Route = createFileRoute("/convert")({
  validateSearch: (raw) => SearchSchema.parse(raw ?? {}),
  head: () => ({
    meta: [
      { title: "Cross-format adapter · TransPerfect Element" },
      {
        name: "description",
        content:
          "Convert a deck slide or approved copy into a social card, a 1-page print brief, or a case study page — headline, body, points, figure and photography re-shaped for each medium.",
      },
      { property: "og:title", content: "Cross-format adapter · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "One piece of content, every medium: slide to social card, slide to print brief or case study, with high-resolution production proofs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConvertPage,
});

const SEVERITY_STYLE: Record<string, string> = {
  shortened: "border-[#FFEB66] bg-[#FFFBE6]",
  dropped: "border-[#FF9B70] bg-[#FFF3EC]",
  refused: "border-[#E53D2E] bg-[#FDECEA]",
};

/** Neutral brief the master modules seed their approved sample copy from. */
const MASTER_BRIEF: Brief = {
  id: "convert-master",
  createdAt: "2026-01-01T00:00:00.000Z",
  prospect: "Your client",
  industry: "Enterprise",
  meetingObjective: "Show how TransPerfect scales global content",
  audience: "Marketing leadership",
  brandModeId: "bm-enterprise" as Brief["brandModeId"],
  archetypeId: "arch-pitch",
  lengthTarget: 10,
  clientFacts: "",
};

type SourceKind = "module" | "deck" | "manual";

function ConvertPage() {
  const search = Route.useSearch();
  const decksMap = useDeckStore((s) => s.decks);
  const userId = useSessionUser();
  const listCloud = useServerFn(listMyCloudDecks);
  const loadCloud = useServerFn(loadCloudDeck);
  const cloud = useQuery({ queryKey: ["convert-cloud-decks"], queryFn: () => listCloud(), enabled: !!userId });

  // Decks open in this browser plus every deck saved to your account.
  type Choice = { id: string; title: string; brandModeId?: string; local: boolean };
  const decks: Choice[] = useMemo(() => {
    const local = Object.values(decksMap)
      .filter((d) => d.slides.length > 0)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((d) => ({ id: d.id, title: d.title, brandModeId: d.brandModeId, local: true }));
    const seen = new Set(local.map((d) => d.id));
    const saved = (cloud.data ?? [])
      .filter((d) => !seen.has(d.id))
      .map((d) => ({ id: d.id, title: `${d.title || "Untitled deck"} (saved)`, brandModeId: d.brand_mode_id ?? undefined, local: false }));
    return [...local, ...saved];
  }, [decksMap, cloud.data]);

  const [deckId, setDeckId] = useState<string>(search.deck ?? "");
  // The deck list fills in after the page opens; pick the first deck then.
  useEffect(() => {
    if (!decks.length) return;
    if (!deckId || !decks.some((d) => d.id === deckId)) setDeckId(decks[0].id);
  }, [decks, deckId]);
  const [slideIndex, setSlideIndex] = useState<number>(search.slide ?? 0);
  const [targetId, setTargetId] = useState<AdaptTargetId>(
    (ADAPT_TARGETS.find((t) => t.id === search.to)?.id as AdaptTargetId) ?? "social-card",
  );
  const [sourceKind, setSourceKind] = useState<SourceKind>(search.deck ? "deck" : "module");
  const manual = sourceKind === "manual";
  const [moduleId, setModuleId] = useState<string>(
    search.module && MODULE_VARIANTS.some((m) => m.id === search.module) ? search.module : "MV-OP-COVER",
  );
  const [moduleQuery, setModuleQuery] = useState("");
  const [familyId, setFamilyId] = useState<string>("all");
  const [moduleBrand, setModuleBrand] = useState<string>(BRAND_MODES[0].id);
  const [selection, setSelection] = useState<AdaptSelection>(EMPTY_SELECTION);
  const [view, setView] = useState<"one" | "all">("one");
  // Coming from the module catalog: bring the chosen module into view in the list.
  useEffect(() => {
    if (!search.module) return;
    const el = document.querySelector<HTMLElement>(`[data-module-id="${CSS.escape(search.module)}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [search.module]);
  const [draft, setDraft] = useState<{ headline: string; body: string; eyebrow: string }>({
    headline: "",
    body: "",
    eyebrow: "",
  });

  const choice = decks.find((d) => d.id === deckId) ?? null;
  const localDeck = choice?.local ? decksMap[choice.id] : undefined;
  const saved = useQuery({
    queryKey: ["convert-cloud-deck", deckId],
    queryFn: () => loadCloud({ data: { deckId } }),
    enabled: !!choice && !choice.local,
  });
  type SlideLite = { id: string; variantId: string; content: Record<string, unknown>; notes?: string | null; mode?: "light" | "dark" };
  const slides: SlideLite[] = useMemo(() => {
    if (localDeck) return localDeck.slides.map((s) => ({ id: s.id, variantId: s.variantId, content: s.content as Record<string, unknown>, notes: s.notes, mode: s.mode }));
    return (saved.data?.slides ?? []).map((s) => ({
      id: s.id,
      variantId: s.variant_id,
      content: (s.content ?? {}) as Record<string, unknown>,
      notes: s.notes,
      mode: ((s.content as Record<string, unknown> | null)?.mode === "dark" ? "dark" : "light") as "light" | "dark",
    }));
  }, [localDeck, saved.data]);
  const deck = choice ? { id: choice.id, title: choice.title, brandModeId: choice.brandModeId, slides } : null;
  const slide = slides[Math.min(slideIndex, slides.length - 1)] ?? null;

  const moduleVariant = byId(MODULE_VARIANTS, moduleId);
  const moduleList = useMemo(() => {
    const q = moduleQuery.trim().toLowerCase();
    return MODULE_VARIANTS.filter(
      (m) =>
        (familyId === "all" || m.familyId === familyId) &&
        (!q || `${m.name} ${m.description} ${m.id}`.toLowerCase().includes(q)),
    );
  }, [moduleQuery, familyId]);

  const rawSource: AdaptContent = useMemo(() => {
    if (sourceKind === "module") {
      const fam = MODULE_FAMILIES.find((f) => f.id === moduleVariant?.familyId)?.name ?? "";
      let content: Record<string, unknown> = {};
      try {
        content = seedContent(moduleId, MASTER_BRIEF, fam) as Record<string, unknown>;
      } catch {
        content = {};
      }
      return contentFromSlide({ content }, moduleVariant?.name);
    }
    if (manual || !slide) {
      return {
        eyebrow: draft.eyebrow || undefined,
        headline: draft.headline || "Type a headline",
        body: draft.body || undefined,
      };
    }
    return contentFromSlide(
      { content: slide.content, notes: slide.notes },
      byId(MODULE_VARIANTS, slide.variantId)?.name,
    );
  }, [sourceKind, moduleId, moduleVariant, manual, slide, draft]);

  // A new source starts with everything included and no edits.
  const sourceKey = sourceKind === "module" ? `m:${moduleId}` : manual ? "manual" : `d:${deckId}:${slideIndex}`;
  useEffect(() => setSelection(EMPTY_SELECTION), [sourceKey]);
  const source = useMemo(() => applySelection(rawSource, selection), [rawSource, selection]);

  const brandId = sourceKind === "module" ? moduleBrand : (deck?.brandModeId ?? BRAND_MODES[0].id);
  const mode: "light" | "dark" = sourceKind === "deck" ? (slide?.mode ?? "light") : "light";
  const result = useMemo(() => adaptContent(source, targetId), [source, targetId]);
  const format = adaptTargetFormat(result.target);

  const socialWrapRef = useRef<HTMLDivElement>(null);
  const printPageRef = useRef<HTMLDivElement>(null);
  const label = `${result.content.headline.slice(0, 40)} · ${result.target.label}`;

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1200px] px-5 py-10">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#666] uppercase">
          Cross-format adapter
        </p>
        <h1 className="mt-2 text-[34px] leading-[1.1] font-bold tracking-[-0.02em] text-[#03002C]">
          One piece of content, every medium
        </h1>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-[1.5] text-[#03002C]/75">
          Convert a slide into a social card, a 1-page print brief, or a case study page. The
          headline, body copy, supporting points, figure and photography carry across; the layout
          structure and type hierarchy are the target medium's own. Anything shortened or left out is
          listed before you export.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
          {/* ── Source ─────────────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[#666] uppercase">
              Source content
            </h2>

            <div role="group" aria-label="Source" className="grid grid-cols-3 gap-0.5 rounded-sm border border-[color:var(--color-border)] p-0.5">
              {(
                [
                  ["module", "Master module"],
                  ["deck", "Deck slide"],
                  ["manual", "Type copy"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={sourceKind === k}
                  onClick={() => setSourceKind(k)}
                  className={`rounded-sm px-2 py-1.5 text-[12px] font-semibold ${sourceKind === k ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]" : "text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {sourceKind === "module" ? (
              <div className="space-y-2">
                <label className="sr-only" htmlFor="module-search">Search master modules</label>
                <input
                  id="module-search"
                  value={moduleQuery}
                  onChange={(e) => setModuleQuery(e.target.value)}
                  placeholder="Search master modules…"
                  className="w-full rounded-sm border border-[color:var(--color-border)] px-3 py-2 text-[13px]"
                />
                <div className="flex gap-2">
                  <select
                    aria-label="Module family"
                    value={familyId}
                    onChange={(e) => setFamilyId(e.target.value)}
                    className="min-w-0 flex-1 rounded-sm border border-[color:var(--color-border)] px-2 py-1.5 text-[12px]"
                  >
                    <option value="all">All families</option>
                    {MODULE_FAMILIES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Division"
                    value={moduleBrand}
                    onChange={(e) => setModuleBrand(e.target.value)}
                    className="min-w-0 flex-1 rounded-sm border border-[color:var(--color-border)] px-2 py-1.5 text-[12px]"
                  >
                    {BRAND_MODES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <ul className="max-h-64 overflow-y-auto border border-[color:var(--color-border)]" aria-label="Master modules">
                  {moduleList.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        aria-pressed={m.id === moduleId}
                        data-module-id={m.id}
                        onClick={() => setModuleId(m.id)}
                        className={`block w-full border-b border-[color:var(--color-border)] px-3 py-2 text-left last:border-b-0 ${m.id === moduleId ? "bg-[color:var(--color-muted)] shadow-[inset_3px_0_0_var(--color-primary)]" : "hover:bg-[color:var(--color-muted)]/60"}`}
                      >
                        <span className="block text-[12.5px] font-semibold">{m.name}</span>
                        <span className="block truncate text-[11px] text-[color:var(--color-muted-foreground)]">{m.description}</span>
                      </button>
                    </li>
                  ))}
                  {moduleList.length === 0 ? (
                    <li className="px-3 py-2 text-[12px] text-[color:var(--color-muted-foreground)]">No modules match.</li>
                  ) : null}
                </ul>
                <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                  Shows the module's approved sample copy. Edit any field below.
                </p>
              </div>
            ) : null}

            {sourceKind === "module" ? null : manual ? (
              <div className="space-y-2">
                <input
                  value={draft.eyebrow}
                  onChange={(e) => setDraft((d) => ({ ...d, eyebrow: e.target.value }))}
                  placeholder="Eyebrow (optional)"
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-[13px]"
                />
                <input
                  value={draft.headline}
                  onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))}
                  placeholder="Headline"
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-[13px]"
                />
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  placeholder="Body copy"
                  rows={5}
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-[13px]"
                />
              </div>
            ) : decks.length === 0 ? (
              <p className="rounded-lg border border-black/10 bg-[#F2F2F2] p-3 text-[12.5px] text-[#03002C]">
                {cloud.isLoading ? "Loading your decks…" : "No decks yet — open or save a deck, or switch to “Type the copy”."}
              </p>
            ) : (
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-[#666]">Deck</label>
                <select
                  value={deckId}
                  onChange={(e) => {
                    setDeckId(e.target.value);
                    setSlideIndex(0);
                  }}
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-[13px]"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
                <label className="block text-[11px] font-medium text-[#666]">Slide</label>
                <select
                  value={String(Math.min(slideIndex, (deck?.slides.length ?? 1) - 1))}
                  onChange={(e) => setSlideIndex(Number(e.target.value))}
                  className="w-full rounded-lg border border-black/15 px-3 py-2 text-[13px]"
                >
                  {saved.isLoading && <option>Loading slides…</option>}
                  {(deck?.slides ?? []).map((s, i) => (
                    <option key={s.id} value={i}>
                      {i + 1}. {byId(MODULE_VARIANTS, s.variantId)?.name ?? s.variantId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {manual ? null : <InfoBuilder source={rawSource} selection={selection} onChange={setSelection} />}

            <h2 className="pt-2 text-[12px] font-semibold tracking-[0.12em] text-[#666] uppercase">
              Convert to
            </h2>
            <div className="grid gap-1">
              {ADAPT_TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetId(t.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-[12.5px] ${targetId === t.id ? "border-[#003FC7] bg-[#E0E8F5] text-[#03002C]" : "border-black/15 text-[#03002C] hover:border-[#003FC7]"}`}
                >
                  <span className="font-semibold">{t.label}</span>
                  <span className="mt-0.5 block text-[11px] text-[#666]">
                    {t.medium === "print"
                      ? `${Math.round((t.trimIn?.width ?? 0) * 25.4)} × ${Math.round((t.trimIn?.height ?? 0) * 25.4)} mm · headline ${t.type.headlinePx}px`
                      : `${adaptTargetFormat(t)?.width} × ${adaptTargetFormat(t)?.height} px · headline ${t.type.headlinePx}px`}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Adapted preview ────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[#666] uppercase">
                {result.target.label}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <AssetExportMenu
                  label="Digital export"
                  filename={label}
                  allowZip={false}
                  resolveTargets={() => {
                    if (format) {
                      const node =
                        socialWrapRef.current?.querySelector<HTMLElement>("[data-kit-asset-frame]") ??
                        null;
                      return node
                        ? [
                            {
                              node,
                              width: format.width,
                              height: format.height,
                              label: result.target.label,
                            },
                          ]
                        : [];
                    }
                    const node = printPageRef.current;
                    const trim = result.target.trimIn;
                    return node && trim
                      ? [
                          {
                            node,
                            width: Math.round(trim.width * CSS_DPI),
                            height: Math.round(trim.height * CSS_DPI),
                            label: result.target.label,
                          },
                        ]
                      : [];
                  }}
                />
                <PrintProofMenu
                  context={{
                    Document: result.target.label,
                    Source:
                      sourceKind === "module"
                        ? `Master module · ${moduleVariant?.name ?? moduleId}`
                        : manual || !deck
                          ? "typed copy"
                          : `${deck.title} · slide ${slideIndex + 1}`,
                    Division: BRAND_MODES.find((b) => b.id === brandId)?.name ?? "TransPerfect",
                  }}
                  resolveTarget={() => {
                    if (format) {
                      const node =
                        socialWrapRef.current?.querySelector<HTMLElement>("[data-kit-asset-frame]") ??
                        null;
                      return node
                        ? {
                            node,
                            width: format.width,
                            height: format.height,
                            label: result.target.label,
                          }
                        : null;
                    }
                    const node = printPageRef.current;
                    const trim = result.target.trimIn;
                    return node && trim
                      ? {
                          node,
                          width: Math.round(trim.width * CSS_DPI),
                          height: Math.round(trim.height * CSS_DPI),
                          label: result.target.label,
                        }
                      : null;
                  }}
                />
                <BrandHealthBadge
                  getRoots={() => {
                    const node = format
                      ? (socialWrapRef.current?.querySelector<HTMLElement>(
                          "[data-kit-asset-frame]",
                        ) ?? null)
                      : printPageRef.current;
                    return node ? [node] : [];
                  }}
                  surfaceLabel={`this ${result.target.label.toLowerCase()}`}
                  medium={format ? "social" : "print"}
                  divisionId={brandId}
                />
              </div>
            </div>

            <div role="group" aria-label="Preview" className="inline-flex gap-0.5 rounded-sm border border-[color:var(--color-border)] p-0.5">
              {(
                [
                  ["one", "This format"],
                  ["all", "Every size"],
                ] as const
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={view === k}
                  onClick={() => setView(k)}
                  className={`rounded-sm px-3 py-1 text-[12px] font-semibold ${view === k ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]" : "hover:bg-[color:var(--color-muted)]"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {view === "all" ? (
              <div className="grid items-end gap-4 border border-[color:var(--color-border)] bg-[color:var(--color-muted)] p-4 sm:grid-cols-2 xl:grid-cols-3">
                {ADAPT_TARGETS.map((t) => {
                  const r = adaptContent(source, t.id);
                  const f = adaptTargetFormat(t);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTargetId(t.id);
                        setView("one");
                      }}
                      className="flex flex-col items-center gap-2 p-2 text-left hover:bg-[color:var(--color-background)]/60 focus-visible:outline-2 focus-visible:outline-[color:var(--color-primary)]"
                      aria-label={`Open ${t.label}`}
                    >
                      <div className="pointer-events-none">
                        {f ? (
                          <SocialRenderer
                            format={f}
                            brandId={brandId}
                            mode={mode}
                            copy={toSocialCopy(r)}
                            imageUrl={r.content.media?.kind === "photo" ? r.content.media.url : undefined}
                            displayShortEdge={170}
                          />
                        ) : (
                          <PrintBriefPreview result={r} brandId={brandId} displayWidth={200} />
                        )}
                      </div>
                      <span className="text-[12px] font-semibold">{t.label}</span>
                      <span className="text-[11px] text-[color:var(--color-muted-foreground)]">
                        {r.notes.length ? `${r.notes.length} change${r.notes.length === 1 ? "" : "s"} to fit` : "Everything fitted"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className={`flex justify-center rounded-sm border border-black/10 bg-[#F2F2F2] p-6 ${view === "all" ? "hidden" : ""}`}>
              {format ? (
                <div ref={socialWrapRef}>
                  <SocialRenderer
                    format={format}
                    brandId={brandId}
                    mode={mode}
                    copy={toSocialCopy(result)}
                    imageUrl={
                      result.content.media?.kind === "photo" ? result.content.media.url : undefined
                    }
                    displayShortEdge={340}
                  />
                </div>
              ) : (
                <PrintBriefPreview ref={printPageRef} result={result} brandId={brandId} />
              )}
            </div>

            <div>
              <h3 className="text-[12px] font-semibold tracking-[0.12em] text-[#666] uppercase">
                What carried across
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-[#03002C]/80">
                {result.target.structure.join(" · ")}
              </p>
              {result.notes.length === 0 ? (
                <p className="mt-3 rounded-lg border border-[#A6FA87] bg-[#F1FEEC] p-3 text-[12.5px] text-[#03002C]">
                  Everything fitted — nothing shortened, nothing left out.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {result.notes.map((n, i) => (
                    <li
                      key={`${n.field}-${i}`}
                      className={`rounded-lg border p-2.5 text-[12.5px] leading-[1.45] text-[#03002C] ${SEVERITY_STYLE[n.severity] ?? "border-black/10 bg-white"}`}
                    >
                      <span className="font-semibold uppercase tracking-[0.1em] text-[10px] text-[#666]">
                        {n.severity} · {n.field}
                      </span>
                      <span className="mt-0.5 block">{n.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

// ── info builder ───────────────────────────────────────────────────────────

const FIELD_LABEL: Record<AdaptFieldKey, string> = {
  eyebrow: "Eyebrow",
  headline: "Headline",
  body: "Body",
  points: "Points",
  stat: "Figure",
  cta: "Call to action",
  footnote: "Source / footnote",
  media: "Picture",
};

function InfoBuilder({
  source,
  selection,
  onChange,
}: {
  source: AdaptContent;
  selection: AdaptSelection;
  onChange: (s: AdaptSelection) => void;
}) {
  const on = (k: AdaptFieldKey) => !selection.exclude.includes(k);
  const toggle = (k: AdaptFieldKey) =>
    onChange({
      ...selection,
      exclude: on(k) ? [...selection.exclude, k] : selection.exclude.filter((x) => x !== k),
    });
  const edit = (patch: AdaptSelection["edits"]) => onChange({ ...selection, edits: { ...selection.edits, ...patch } });
  const input = "w-full rounded-sm border border-[color:var(--color-border)] px-2 py-1 text-[12.5px] disabled:opacity-50";
  const textKeys = (["eyebrow", "headline", "body", "cta", "footnote"] as const).filter((k) => source[k]);
  const hasAny = textKeys.length || source.points?.length || source.stat || source.media;
  if (!hasAny) return null;
  return (
    <div className="space-y-3 border-t border-[color:var(--color-border)] pt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[color:var(--color-muted-foreground)] uppercase">
          Info to carry across
        </h2>
        <button type="button" className="text-[11px] font-semibold text-[color:var(--color-primary)] hover:underline" onClick={() => onChange(EMPTY_SELECTION)}>
          Reset
        </button>
      </div>
      {textKeys.map((k) => (
        <div key={k} className="space-y-1">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <input
              type="checkbox"
              className="accent-[color:var(--color-primary)]"
              checked={on(k)}
              disabled={k === "headline"}
              onChange={() => toggle(k)}
            />
            {FIELD_LABEL[k]}
          </label>
          {k === "body" ? (
            <textarea
              rows={3}
              className={input}
              disabled={!on(k)}
              value={selection.edits[k] ?? source[k] ?? ""}
              onChange={(e) => edit({ [k]: e.target.value })}
            />
          ) : (
            <input className={input} disabled={!on(k)} value={selection.edits[k] ?? source[k] ?? ""} onChange={(e) => edit({ [k]: e.target.value })} />
          )}
        </div>
      ))}
      {source.stat ? (
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <input type="checkbox" className="accent-[color:var(--color-primary)]" checked={on("stat")} onChange={() => toggle("stat")} />
            {FIELD_LABEL.stat}
          </label>
          <div className="grid grid-cols-[90px_1fr] gap-1">
            <input
              aria-label="Figure value"
              className={input}
              disabled={!on("stat")}
              value={selection.edits.stat?.value ?? source.stat.value}
              onChange={(e) => edit({ stat: { ...selection.edits.stat, value: e.target.value } })}
            />
            <input
              aria-label="Figure label"
              className={input}
              disabled={!on("stat")}
              value={selection.edits.stat?.label ?? source.stat.label}
              onChange={(e) => edit({ stat: { ...selection.edits.stat, label: e.target.value } })}
            />
          </div>
        </div>
      ) : null}
      {source.points?.length ? (
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <input type="checkbox" className="accent-[color:var(--color-primary)]" checked={on("points")} onChange={() => toggle("points")} />
            {FIELD_LABEL.points}
          </label>
          {source.points.map((p, i) => {
            const pointOn = !selection.excludePoints.includes(i);
            return (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  aria-label={`Include point ${i + 1}`}
                  className="accent-[color:var(--color-primary)]"
                  disabled={!on("points")}
                  checked={pointOn}
                  onChange={() =>
                    onChange({
                      ...selection,
                      excludePoints: pointOn ? [...selection.excludePoints, i] : selection.excludePoints.filter((x) => x !== i),
                    })
                  }
                />
                <input
                  aria-label={`Point ${i + 1}`}
                  className={input}
                  disabled={!on("points") || !pointOn}
                  value={selection.edits.points?.[i] ?? p}
                  onChange={(e) => edit({ points: { ...selection.edits.points, [i]: e.target.value } })}
                />
              </div>
            );
          })}
        </div>
      ) : null}
      {source.media ? (
        <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          <input type="checkbox" className="accent-[color:var(--color-primary)]" checked={on("media")} onChange={() => toggle("media")} />
          {FIELD_LABEL.media}
          <span className="font-normal normal-case tracking-normal text-[color:var(--color-muted-foreground)]">
            {source.media.kind === "photo" ? "photo" : source.media.kind === "token" ? "brand colour fill" : "not supported"}
          </span>
        </label>
      ) : null}
    </div>
  );
}
