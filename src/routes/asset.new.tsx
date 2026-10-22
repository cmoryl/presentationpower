import { BRAND } from "@/lib/brand-colors";
import { useRequireSignIn } from "@/hooks/use-require-sign-in";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { BrandLockup } from "@/components/BrandLockup";
import { createPrintAsset, createPrintAssetWithBrief } from "@/lib/print-assets.functions";
import { curatedMasterFor } from "@/lib/print-library/catalog";
import { toEditableContent } from "@/lib/print-library/editable";
import { STARTER_GROUPS, STARTER_TEMPLATES, starterContent, type StarterTemplate } from "@/lib/print-library/starter-templates";
import { FileText, Rocket, Layers, PenSquare } from "lucide-react";

// Query-string seeds so all four entry points converge on this one wizard.
const searchSchema = z.object({
  sourceDeckId: z.string().uuid().optional(),
  slideIds: z.string().optional(),
  sourceModuleId: z.string().optional(),
  prospect: z.string().optional(),
  industry: z.string().optional(),
  brandModeId: z.string().optional(),
  kind: z
    .enum([
      "case-study",
      "spotlight",
      "ebrochure",
      "adaptor-brief",
      "msa-partnership",
      "solution-proposal",
    ])
    .optional(),
});

export const Route = createFileRoute("/asset/new")({
  head: () => ({
    meta: [
      { title: "New print asset · TransPerfect Element" },
      {
        name: "description",
        content:
          "Draft a print-ready case study using the same brand engine that powers your decks.",
      },
      { property: "og:title", content: "New print asset · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Print-ready case studies, brochures, and spotlights from the shared brand system.",
      },
    ],
  }),
  validateSearch: (raw) => searchSchema.parse(raw ?? {}),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: NewAssetPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Wizard failed to load: {(error as Error).message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

const KINDS: Array<{
  id:
    | "case-study"
    | "spotlight"
    | "ebrochure"
    | "adaptor-brief"
    | "msa-partnership"
    | "solution-proposal";
  label: string;
  desc: string;
  live: boolean;
  icon: React.ReactNode;
}> = [
  {
    id: "case-study",
    label: "Case Study",
    desc: "Challenge · Approach · Outcome, print-ready.",
    live: true,
    icon: <FileText size={16} />,
  },
  {
    id: "spotlight",
    label: "Client Spotlight",
    desc: "Product/service hero + stats + capabilities.",
    live: true,
    icon: <Layers size={16} />,
  },
  {
    id: "ebrochure",
    label: "E-Brochure",
    desc: "GlobalLink-style clean marketing PDF.",
    live: true,
    icon: <PenSquare size={16} />,
  },
  {
    id: "adaptor-brief",
    label: "Adaptor Brief",
    desc: "Dark aurora hero + capability grid.",
    live: true,
    icon: <Rocket size={16} />,
  },
  {
    id: "solution-proposal",
    label: "Solution Proposal",
    desc: "Scope, deliverables, timeline, and cost summary.",
    live: true,
    icon: <FileText size={16} />,
  },
];

function NewAssetPage() {
  useRequireSignIn();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { brandModes } = useTaxonomy();
  const create = useServerFn(createPrintAssetWithBrief);
  const createBlank = useServerFn(createPrintAsset);

  // Blank page: just a title over an empty page — no generated copy, no sample
  // stats or quote — so people add modules from the library and fill it in.
  const [tplGroup, setTplGroup] = useState<(typeof STARTER_GROUPS)[number]["id"]>("brochure");
  async function handleTemplate(t: StarterTemplate) {
    setBusy(true);
    setErr(null);
    try {
      const name = title.trim() || t.title;
      const asset = await createBlank({
        data: {
          kind: "case-study",
          title: name,
          brandModeId,
          content: starterContent(t, name),
          context: {
            pageSize: t.pageSize,
            distribution,
            contactCard: false,
            starterTemplateId: t.id,
            ...(t.exportPrefs ? { exportPrefs: t.exportPrefs } : {}),
          },
        },
      });
      navigate({ to: "/asset/$assetId", params: { assetId: asset.id } });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function handleBlank() {
    setBusy(true);
    setErr(null);
    try {
      const name = title.trim() || "Untitled page";
      const asset = await createBlank({
        data: {
          kind: "case-study",
          title: name,
          brandModeId,
          content: {
            title: name,
            eyebrow: "",
            client: prospect.trim(),
            industry: "",
            audience: "",
            summary: name,
            challenge: { heading: "", body: "" },
            solution: { heading: "", body: "" },
            result: { heading: "", body: "" },
            stats: [],
            engagement: { title: "", bullets: [] },
            modules: [],
            hiddenSections: ["story", "stats", "quote", "engagement", "cta"],
          },
          context: { pageSize, distribution, contactCard: false, blankStart: true },
        },
      });
      navigate({ to: "/asset/$assetId", params: { assetId: asset.id } });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const [kind, setKind] = useState<
    | "case-study"
    | "spotlight"
    | "ebrochure"
    | "adaptor-brief"
    | "msa-partnership"
    | "solution-proposal"
  >(search.kind ?? "case-study");
  const [title, setTitle] = useState(search.prospect ? `${search.prospect} — Case Study` : "");
  const [brandModeId, setBrandModeId] = useState(
    search.brandModeId ??
      brandModes.find((b) => b.id === "bm-tp-lifesci")?.id ??
      brandModes[0]?.id ??
      "bm-enterprise",
  );
  const [prospect, setProspect] = useState(search.prospect ?? "");
  const [industry, setIndustry] = useState(search.industry ?? "");
  const [audience, setAudience] = useState("");
  const [summary, setSummary] = useState("");
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Square">("A4");
  const [distribution, setDistribution] = useState<"sales-enablement" | "web-download" | "print">(
    "sales-enablement",
  );
  const [ctaLabel, setCtaLabel] = useState("Start a conversation");
  const [ctaUrl, setCtaUrl] = useState("");
  const [contactCard, setContactCard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const brand = useMemo(
    () => brandModes.find((b) => b.id === brandModeId) ?? brandModes[0],
    [brandModes, brandModeId],
  );

  const requiresProspect = kind === "case-study" || kind === "spotlight";
  const canGenerate = title.trim().length > 0 && (!requiresProspect || prospect.trim().length > 0);

  async function handleGenerate() {
    setBusy(true);
    setErr(null);
    try {
      const slideIds = (search.slideIds ?? "")
        .split(",")
        .filter((s: string) => /^[0-9a-f-]{36}$/i.test(s));
      // Kinds that ship a curated master (Solution Proposal, MSA partnership)
      // open populated and fully editable instead of an empty document.
      const master =
        kind === "solution-proposal" || kind === "msa-partnership"
          ? curatedMasterFor(kind, brandModeId)
          : undefined;
      const seeded = master ? (toEditableContent(master) ?? {}) : {};
      const asset = await create({
        data: {
          kind,
          title: title.trim(),
          brandModeId,
          prospect,
          industry,
          audience,
          meetingObjective: summary,
          sourceDeckId: search.sourceDeckId,
          sourceSlideIds: slideIds,
          sourceModuleIds: search.sourceModuleId ? [search.sourceModuleId] : [],
          content: { ...seeded, ...(title.trim() ? { title: title.trim() } : {}) },

          context: {
            pageSize,
            distribution,
            contactCard,
            cta: { label: ctaLabel, url: ctaUrl || undefined },
          },
        },
      });
      navigate({ to: "/asset/$assetId", params: { assetId: asset.id } });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  const seedNote = (() => {
    if (search.sourceDeckId) return "Seeded from deck slides.";
    if (search.sourceModuleId) return `Seeded from module ${search.sourceModuleId}.`;
    return null;
  })();

  const kindMeta = KINDS.find((k) => k.id === kind);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-2 py-10">
        <header className="mb-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#003FC7] dark:text-[#A1FBF9]">
            Print asset studio
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#03002C] dark:text-white">
            New print asset
          </h1>
          <p className="mt-3 max-w-xl text-sm text-black/60 dark:text-white/60">
            Same brand engine, same division knowledge. This wizard drafts a print-ready case study
            wired to the shared source — logos, aurora, stats, and quotes come from the division you
            pick.
          </p>
          {seedNote && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#A1FBF9]/40 bg-[#A1FBF9]/10 px-3 py-1 text-[11px] text-[#03002C] dark:border-[#A1FBF9]/30 dark:text-[#A1FBF9]">
              {seedNote}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {/* OUTCOME */}
            <Section index="00" title="Start from a template">
              <p className="text-xs text-black/55 dark:text-white/55">
                Pick a ready-made layout instead of a blank page. Every block is an editable section — swap, remove or add more in the editor. Bracketed text is placeholder copy to replace.
              </p>
              <div role="tablist" aria-label="Template type" className="flex flex-wrap gap-2">
                {STARTER_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    role="tab"
                    aria-selected={tplGroup === g.id}
                    onClick={() => setTplGroup(g.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${tplGroup === g.id ? "border-[#003FC7] bg-[#003FC7] text-white" : "border-black/15 text-[#03002C] hover:border-[#003FC7] dark:border-white/20 dark:text-white"}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {STARTER_TEMPLATES.filter((t) => t.group === tplGroup).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleTemplate(t)}
                    className="group flex gap-3 rounded-xl border border-black/10 p-3 text-left transition hover:border-[#003FC7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003FC7] disabled:opacity-50 dark:border-white/10"
                  >
                    <TemplateThumb t={t} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[#03002C] dark:text-white">{t.title}</span>
                      <span className="mt-0.5 block text-xs text-black/55 dark:text-white/55">{t.description}</span>
                      <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">{t.sizeLabel}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <Section index="01" title="Outcome">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {KINDS.map((k) => {
                  const active = kind === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => k.live && setKind(k.id)}
                      disabled={!k.live}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-[#003FC7] bg-[#003FC7]/5 dark:border-[#A1FBF9] dark:bg-[#A1FBF9]/[0.06]"
                          : "border-black/10 bg-white hover:border-black/25 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25"
                      } ${k.live ? "" : "cursor-not-allowed opacity-50"}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#03002C] dark:text-white">
                        {k.icon}
                        {k.label}
                        {!k.live && (
                          <span className="ml-auto rounded-full bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-black/60 dark:bg-white/10 dark:text-white/60">
                            Next release
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-black/60 dark:text-white/60">{k.desc}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Asset title">
                  {(id) => (
                    <input
                      id={id}
                      className={inputCls}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Acme Global — Life Sciences Case Study"
                    />
                  )}
                </Field>

                <Field label="Division">
                  {(id) => (
                    <select
                      id={id}
                      className={inputCls}
                      value={brandModeId}
                      onChange={(e) => setBrandModeId(e.target.value)}
                    >
                      {brandModes.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
            </Section>

            {/* STORY */}
            <Section index="02" title="Story">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Client / prospect">
                  {(id) => (
                    <input
                      id={id}
                      className={inputCls}
                      value={prospect}
                      onChange={(e) => setProspect(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Industry">
                  {(id) => (
                    <input
                      id={id}
                      className={inputCls}
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Field label="Audience">
                {(id) => (
                  <input
                    id={id}
                    className={inputCls}
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Head of Localization, VP Product"
                  />
                )}
              </Field>
              <Field label="Engagement summary (one line)">
                {(id) => (
                  <textarea
                    id={id}
                    rows={2}
                    className={inputCls}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Rolled out multilingual clinical trial content across 12 new markets in 14 weeks."
                  />
                )}
              </Field>
            </Section>

            {/* PRINT SPEC */}
            <Section index="03" title="Print spec">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Page size">
                  {(id) => (
                    <select
                      id={id}
                      className={inputCls}
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as typeof pageSize)}
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">US Letter</option>
                      <option value="Square">Square (1:1)</option>
                    </select>
                  )}
                </Field>
                <Field label="Distribution">
                  {(id) => (
                    <select
                      id={id}
                      className={inputCls}
                      value={distribution}
                      onChange={(e) => setDistribution(e.target.value as typeof distribution)}
                    >
                      <option value="sales-enablement">Sales enablement</option>
                      <option value="web-download">Web download</option>
                      <option value="print">Print</option>
                    </select>
                  )}
                </Field>
                <Field label="Contact card">
                  {(id) => (
                    <label
                      htmlFor={id}
                      className="flex h-[46px] items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={contactCard}
                        onChange={(e) => setContactCard(e.target.checked)}
                      />
                      Include on final page
                    </label>
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="CTA label">
                  {(id) => (
                    <input
                      id={id}
                      className={inputCls}
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="CTA URL (optional)">
                  {(id) => (
                    <input
                      id={id}
                      className={inputCls}
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  )}
                </Field>
              </div>
            </Section>
          </div>

          {/* SUMMARY RAIL */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
                Summary
              </div>
              {brand && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                  <BrandLockup brand={brand} color={BRAND.ink} size="sm" />
                </div>
              )}
              <dl className="mt-4 space-y-2 text-xs">
                {[
                  ["Format", kindMeta?.label ?? "—"],
                  ["Title", title.trim() || "Untitled"],
                  ["Client", prospect.trim() || "—"],
                  ["Page size", pageSize],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-3">
                    <dt className="text-black/50 dark:text-white/50">{k}</dt>
                    <dd className="truncate text-right font-medium text-[#03002C] dark:text-white">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>

              <button
                type="button"
                disabled={!canGenerate || busy}
                onClick={handleGenerate}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#03002C] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-[#003FC7]/30 transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#03002C]"
              >
                <Rocket size={14} />
                {busy ? "Generating…" : "Generate print asset"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleBlank}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#03002C]/20 px-6 py-2.5 text-sm font-semibold text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:text-white"
              >
                <FileText size={14} />
                Start a blank page
              </button>
              <p className="mt-1 text-center text-[11px] text-black/50 dark:text-white/50">
                Just a title on an empty page — add sections from the library and fill it in yourself.
              </p>
              {!canGenerate && (
                <p className="mt-2 text-center text-[11px] text-black/50 dark:text-white/50">
                  {requiresProspect && !prospect.trim()
                    ? "Add a title and client to continue."
                    : "Add a title to continue."}
                </p>
              )}
              <Link
                to="/"
                className="mt-3 block text-center text-xs text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              >
                ← Cancel
              </Link>
              {err && (
                <div
                  role="alert"
                  className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700"
                >
                  {err}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/15 transition-all dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/35";

/** Wireframe of the template's section stack at its page proportion. */
function TemplateThumb({ t }: { t: StarterTemplate }) {
  const ratio = t.exportPrefs?.customW && t.exportPrefs.customH ? t.exportPrefs.customH / t.exportPrefs.customW : t.pageSize === "Letter" ? 11 / 8.5 : 1.414;
  const weight = (k: string) => (k === "hero" ? 3 : k === "logo-grid" || k === "feature-list" ? 2.2 : k === "contact" ? 0.9 : 1.4);
  return (
    <span aria-hidden className="flex w-14 shrink-0 flex-col gap-[3px] rounded-sm border border-black/10 bg-[#EEF1F7] p-[4px]" style={{ height: 56 * Math.min(ratio, 1.6) }}>
      {t.sections.map((s, i) => (
        <span key={i} className={`rounded-[2px] ${s.kind === "hero" ? "bg-[#03002C]" : s.kind === "contact" ? "bg-[#003FC7]" : "bg-white"}`} style={{ flex: weight(s.kind) }} />
      ))}
    </span>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-3xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
      <header className="mb-4 flex items-center gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/40 dark:text-white/40">
          {index}
        </div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#03002C] dark:text-white">
          {title}
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode | ((id: string) => React.ReactNode);
}) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C] dark:text-white"
      >
        {label}
      </label>
      {typeof children === "function" ? children(id) : children}
    </div>
  );
}
