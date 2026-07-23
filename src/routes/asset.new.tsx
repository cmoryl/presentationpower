import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { BrandLockup } from "@/components/BrandLockup";
import { createPrintAssetWithBrief } from "@/lib/print-assets.functions";
import { FileText, Rocket, Layers, PenSquare } from "lucide-react";

// Query-string seeds so all four entry points converge on this one wizard.
const searchSchema = z.object({
  sourceDeckId: z.string().uuid().optional(),
  slideIds: z.string().optional(),
  sourceModuleId: z.string().optional(),
  prospect: z.string().optional(),
  industry: z.string().optional(),
  brandModeId: z.string().optional(),
});

export const Route = createFileRoute("/asset/new")({
  head: () => ({
    meta: [
      { title: "New print asset · TransPerfect Modular" },
      { name: "description", content: "Draft a print-ready case study using the same brand engine that powers your decks." },
      { property: "og:title", content: "New print asset · TransPerfect Modular" },
      { property: "og:description", content: "Print-ready case studies, brochures, and spotlights from the shared brand system." },
    ],
  }),
  validateSearch: (raw) => searchSchema.parse(raw ?? {}),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: NewAssetPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Wizard failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

const KINDS: Array<{
  id: "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  label: string;
  desc: string;
  live: boolean;
  icon: React.ReactNode;
}> = [
  { id: "case-study",   label: "Case Study",     desc: "Challenge · Approach · Outcome, print-ready.",  live: true,  icon: <FileText size={16} /> },
  { id: "spotlight",    label: "Client Spotlight", desc: "Project stats + Need/Approach/Impact.",      live: false, icon: <Layers size={16} /> },
  { id: "ebrochure",    label: "E-Brochure",     desc: "GlobalLink-style clean marketing PDF.",         live: false, icon: <PenSquare size={16} /> },
  { id: "adaptor-brief",label: "Adaptor Brief",  desc: "Dark aurora hero + capability grid.",           live: false, icon: <Rocket size={16} /> },
];

function NewAssetPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { brandModes } = useTaxonomy();
  const create = useServerFn(createPrintAssetWithBrief);

  const [kind, setKind] = useState<"case-study" | "spotlight" | "ebrochure" | "adaptor-brief">("case-study");
  const [title, setTitle] = useState(search.prospect ? `${search.prospect} — Case Study` : "");
  const [brandModeId, setBrandModeId] = useState(
    search.brandModeId ?? (brandModes.find((b) => b.id === "bm-tp-lifesci")?.id ?? brandModes[0]?.id ?? "bm-enterprise"),
  );
  const [prospect, setProspect] = useState(search.prospect ?? "");
  const [industry, setIndustry] = useState(search.industry ?? "");
  const [audience, setAudience] = useState("");
  const [summary, setSummary] = useState("");
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Square">("A4");
  const [distribution, setDistribution] = useState<"sales-enablement" | "web-download" | "print">("sales-enablement");
  const [ctaLabel, setCtaLabel] = useState("Start a conversation");
  const [ctaUrl, setCtaUrl] = useState("");
  const [contactCard, setContactCard] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const brand = useMemo(
    () => brandModes.find((b) => b.id === brandModeId) ?? brandModes[0],
    [brandModes, brandModeId],
  );

  const canGenerate = kind === "case-study" && title.trim().length > 0 && prospect.trim().length > 0;

  async function handleGenerate() {
    setBusy(true);
    setErr(null);
    try {
      const slideIds = (search.slideIds ?? "").split(",").filter((s) => /^[0-9a-f-]{36}$/i.test(s));
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
          content: {},
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

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-2 py-10">
        <header className="mb-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#003FC7] dark:text-[#A1FBF9]">
            Print asset studio
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#03002C] dark:text-white">
            New print asset
          </h1>
          <p className="mt-3 max-w-xl text-sm text-black/60 dark:text-white/60">
            Same brand engine, same division knowledge. This wizard drafts a print-ready case
            study wired to the shared source — logos, aurora, stats, and quotes come from the
            division you pick.
          </p>
          {seedNote && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#A1FBF9]/40 bg-[#A1FBF9]/10 px-3 py-1 text-[11px] text-[#03002C] dark:border-[#A1FBF9]/30 dark:text-[#A1FBF9]">
              {seedNote}
            </div>
          )}
        </header>

        {/* OUTCOME */}
        <Section index="01" title="Outcome">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {KINDS.map((k) => {
              const active = kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => k.live && setKind(k.id)}
                  disabled={!k.live}
                  className={`text-left rounded-2xl border p-4 transition ${
                    active
                      ? "border-[#003FC7] bg-[#003FC7]/5 dark:border-[#A1FBF9] dark:bg-[#A1FBF9]/[0.06]"
                      : "border-black/10 bg-white hover:border-black/25 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/25"
                  } ${k.live ? "" : "opacity-50 cursor-not-allowed"}`}
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

          <Field label="Asset title">
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Acme Global — Life Sciences Case Study"
            />
          </Field>

          <Field label="Division">
            <select
              className={inputCls}
              value={brandModeId}
              onChange={(e) => setBrandModeId(e.target.value)}
            >
              {brandModes.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {brand && (
              <div className="mt-2 inline-flex items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                <BrandLockup brand={brand} height={22} />
              </div>
            )}
          </Field>
        </Section>

        {/* STORY */}
        <Section index="02" title="Story">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Client / prospect">
              <input className={inputCls} value={prospect} onChange={(e) => setProspect(e.target.value)} />
            </Field>
            <Field label="Industry">
              <input className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </Field>
          </div>
          <Field label="Audience">
            <input className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Head of Localization, VP Product" />
          </Field>
          <Field label="Engagement summary (one line)">
            <textarea
              rows={2}
              className={inputCls}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Rolled out multilingual clinical trial content across 12 new markets in 14 weeks."
            />
          </Field>
        </Section>

        {/* PRINT SPEC */}
        <Section index="03" title="Print spec">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Page size">
              <select className={inputCls} value={pageSize} onChange={(e) => setPageSize(e.target.value as typeof pageSize)}>
                <option value="A4">A4</option>
                <option value="Letter">US Letter</option>
                <option value="Square">Square (1:1)</option>
              </select>
            </Field>
            <Field label="Distribution">
              <select className={inputCls} value={distribution} onChange={(e) => setDistribution(e.target.value as typeof distribution)}>
                <option value="sales-enablement">Sales enablement</option>
                <option value="web-download">Web download</option>
                <option value="print">Print</option>
              </select>
            </Field>
            <Field label="Contact card">
              <label className="flex h-[46px] items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                <input
                  type="checkbox"
                  checked={contactCard}
                  onChange={(e) => setContactCard(e.target.checked)}
                />
                Include on final page
              </label>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="CTA label">
              <input className={inputCls} value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
            </Field>
            <Field label="CTA URL (optional)">
              <input className={inputCls} value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://…" />
            </Field>
          </div>
        </Section>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            ← Cancel
          </Link>
          <button
            type="button"
            disabled={!canGenerate || busy}
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#003FC7]/30 transition hover:bg-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-[#03002C]"
          >
            <Rocket size={14} />
            {busy ? "Generating…" : "Generate print asset"}
          </button>
        </div>
        {err && <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/15 transition-all dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-white/35";

function Section({ index, title, children }: { index: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-3xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
      <header className="mb-4 flex items-center gap-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-black/40 dark:text-white/40">{index}</div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#03002C] dark:text-white">{title}</div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C] dark:text-white">
        {label}
      </label>
      {children}
    </div>
  );
}
