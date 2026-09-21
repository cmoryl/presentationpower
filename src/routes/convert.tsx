// /convert — Cross-format layout adapter.
//
// Take one approved piece of content (a deck slide, or copy typed in) and
// convert it into another medium: a social card, a 1-page print brief, or a
// 1-page case study. The adapter preserves the headline, body copy, supporting
// points, figure and photography, and re-shapes them into the target layout's
// own structure and typographic hierarchy. Anything that had to be shortened,
// left out, or refused is listed under the preview before you export.

import { useMemo, useRef, useState } from "react";
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
  contentFromSlide,
  toSocialCopy,
  type AdaptContent,
  type AdaptTargetId,
} from "@/lib/cross-format-adapt";
import { CSS_DPI } from "@/lib/print-proof-export";
import { useDeckStore } from "@/lib/deck-store";
import { BRAND_MODES, byId, MODULE_VARIANTS } from "@/lib/taxonomy";

const SearchSchema = z.object({
  deck: z.string().optional(),
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

function ConvertPage() {
  const search = Route.useSearch();
  const decksMap = useDeckStore((s) => s.decks);
  const decks = useMemo(
    () =>
      Object.values(decksMap)
        .filter((d) => d.slides.length > 0)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [decksMap],
  );

  const [deckId, setDeckId] = useState<string>(search.deck ?? decks[0]?.id ?? "");
  const [slideIndex, setSlideIndex] = useState<number>(search.slide ?? 0);
  const [targetId, setTargetId] = useState<AdaptTargetId>(
    (ADAPT_TARGETS.find((t) => t.id === search.to)?.id as AdaptTargetId) ?? "social-card",
  );
  const [manual, setManual] = useState(false);
  const [draft, setDraft] = useState<{ headline: string; body: string; eyebrow: string }>({
    headline: "",
    body: "",
    eyebrow: "",
  });

  const deck = decks.find((d) => d.id === deckId) ?? null;
  const slide = deck?.slides[Math.min(slideIndex, deck.slides.length - 1)] ?? null;

  const source: AdaptContent = useMemo(() => {
    if (manual || !slide) {
      return {
        eyebrow: draft.eyebrow || undefined,
        headline: draft.headline || "Type a headline",
        body: draft.body || undefined,
      };
    }
    return contentFromSlide({ content: slide.content as Record<string, unknown>, notes: slide.notes });
  }, [manual, slide, draft]);

  const brandId = deck?.brandModeId ?? BRAND_MODES[0].id;
  const mode: "light" | "dark" = slide?.mode ?? "light";
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

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setManual(false)}
                className={`flex-1 rounded-lg border px-3 py-2 text-[12px] ${!manual ? "border-[#003FC7] bg-[#003FC7] text-white" : "border-black/15 text-[#03002C]"}`}
              >
                A deck slide
              </button>
              <button
                type="button"
                onClick={() => setManual(true)}
                className={`flex-1 rounded-lg border px-3 py-2 text-[12px] ${manual ? "border-[#003FC7] bg-[#003FC7] text-white" : "border-black/15 text-[#03002C]"}`}
              >
                Type the copy
              </button>
            </div>

            {manual ? (
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
                No decks open in this browser yet. Open a deck, or switch to “Type the copy”.
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
                  {(deck?.slides ?? []).map((s, i) => (
                    <option key={s.id} value={i}>
                      {i + 1}. {byId(MODULE_VARIANTS, s.variantId)?.name ?? s.variantId}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                    Source: manual || !deck ? "typed copy" : `${deck.title} · slide ${slideIndex + 1}`,
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

            <div className="flex justify-center rounded-2xl border border-black/10 bg-[#F2F2F2] p-6">
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
