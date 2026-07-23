import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileText,
  Layers,
  PenSquare,
  Rocket,
  Sparkles,
  Trash2,
  Pencil,
  ArrowRight,
  X,
  Clock,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { EBrochureLayout } from "@/components/print/EBrochureLayout";
import { AdaptorBriefLayout } from "@/components/print/AdaptorBriefLayout";
import { CaseStudyLayout } from "@/components/print/CaseStudyLayout";
import {
  emptySpotlight, emptyEBrochure, emptyAdaptorBrief, emptyCaseStudy,
  type SpotlightContent, type EBrochureContent, type AdaptorBriefContent, type CaseStudyContent,
  type PrintAssetKind,
} from "@/lib/print-assets.types";
import {
  listMyPrintAssets,
  deletePrintAsset,
} from "@/lib/print-assets.functions";
import type { BrandMode } from "@/lib/taxonomy";

export const Route = createFileRoute("/library/print")({
  head: () => ({
    meta: [
      { title: "Print templates · Library" },
      {
        name: "description",
        content:
          "Print-ready design templates — Client Spotlights, Case Studies, e-Brochures, and Adaptor Briefs — rendered on the same brand engine as your decks.",
      },
      { property: "og:title", content: "Print templates · TransPerfect Modular" },
      {
        property: "og:description",
        content:
          "Browse print templates, preview them per division, and spin up a new print asset in one click.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: PrintCenterPage,
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="p-10 text-sm text-red-600">Print center failed to load: {error.message}</div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <div className="p-10">Not found.</div>
    </AppShell>
  ),
});

// ---------------------------------------------------------------------------
// Template catalog
// ---------------------------------------------------------------------------
type Template = {
  id: PrintAssetKind;
  label: string;
  tagline: string;
  desc: string;
  live: boolean;
  icon: React.ReactNode;
};

const TEMPLATES: Template[] = [
  {
    id: "spotlight",
    label: "Client Spotlight",
    tagline: "Product · service · single-page hero",
    desc: "One-page product spotlight — hero, quote card, project stats, and capability columns on the portrait aurora.",
    live: true,
    icon: <Layers size={16} />,
  },
  {
    id: "case-study",
    label: "Case Study",
    tagline: "Challenge · Approach · Outcome",
    desc: "Print-ready case study wired to the shared brief so the AI can synthesize the arc from division knowledge.",
    live: true,
    icon: <FileText size={16} />,
  },
  {
    id: "ebrochure",
    label: "E-Brochure",
    tagline: "Challenge · Approach · Impact",
    desc: "Single-page marketing PDF — pastel aurora hero, three summary cards, stat row, quote + Discover panel, and a division-tokenized CTA band.",
    live: true,
    icon: <PenSquare size={16} />,
  },
  {
    id: "adaptor-brief",
    label: "Adaptor Brief",
    tagline: "Dark aurora hero + 6 capability cards",
    desc: "Application / adaptor brief for enterprise integrations. Dark→light gradient hero, six verb cards, a 'We Know How' strip, and a pull-quote.",
    live: true,
    icon: <Rocket size={16} />,
  },
];

const SPOTLIGHT_SEED: SpotlightContent = emptySpotlight({
  eyebrow: "Product spotlight",
  productName: "GlobalLink NEXT",
  tagline: "AI-native translation orchestration built for regulated enterprise pipelines.",
  summary:
    "One platform for continuous localization across web, product, and clinical content — with human review, model routing, and full auditability wired in from day one.",
  capabilities: [
    { heading: "Adaptive model routing", body: "Route each string to the model / linguist blend that fits its risk and reuse profile — automatically." },
    { heading: "In-context QA", body: "Live visual QA against staging renders catches truncation, layout, and terminology drift pre-merge." },
    { heading: "Regulated workflows", body: "Signed audit trails, role-scoped review, and validated environments for life-sciences and financial workloads." },
  ],
  stats: [
    { label: "Languages supported", value: "170", unit: "+" },
    { label: "Faster time-to-market", value: "62", unit: "%" },
    { label: "Enterprise deployments", value: "300", unit: "+" },
  ],
  quote: {
    text: "It stopped feeling like localization and started feeling like release engineering.",
    author: "Head of Global Content",
    role: "Fortune 100 medtech",
  },
  expert: { name: "Jordan Reyes", role: "Solutions architect · GlobalLink", email: "jreyes@transperfect.com" },
  cta: { label: "Book a walkthrough", url: "https://transperfect.com" },
});

const EBROCHURE_SEED: EBrochureContent = emptyEBrochure({
  title: "Helping Global Teams Move Faster with GlobalLink",
  summary: "See how a leading technology company streamlined content operations, reduced turnaround times, and improved quality across 35+ markets with GlobalLink AI.",
  sections: [
    { heading: "The Challenge", body: "Fragmented tools, inconsistent terminology, and slow localization made rapid market expansion hard.",
      bullets: ["Disconnected systems and manual processes", "Inconsistent brand and terminology", "Long turnaround times across markets", "Limited visibility into content progress"] },
    { heading: "Our Approach", body: "GlobalLink AI to unify content operations, automate workflows, and embed governance — on-brand content faster, everywhere.",
      bullets: ["Unified content orchestration", "AI-powered translation + workflow automation", "Centralized terminology and governance", "Real-time dashboards and reporting"] },
    { heading: "The Impact", body: "Measurable improvements in speed, quality, and efficiency — teams scale global content with confidence.",
      bullets: ["3.4× faster time-to-market", "48% reduction in localization costs", "98% translation quality score", "Consistent brand across 35+ markets"] },
  ],
  stats: [
    { label: "Global teams empowered", value: "100", unit: "%" },
    { label: "Reduction in localization costs", value: "48", unit: "%" },
    { label: "Translation quality score", value: "98", unit: "%" },
    { label: "Markets supported", value: "35", unit: "+" },
    { label: "Faster time-to-market", value: "3.4", unit: "×" },
  ],
  quote: {
    text: "TransPerfect helped us simplify a complex localization process and free our internal team to focus on higher-value work.",
    author: "Global Content Lead", company: "Fortune 100 client",
  },
  cta: { label: "See GlobalLink in Action", subhead: "Explore how GlobalLink AI can transform your content operations." },
});

const ADAPTOR_SEED: AdaptorBriefContent = emptyAdaptorBrief({
  title: "GlobalLink for Adobe Experience Manager Plus",
  summary: "TransPerfect GlobalLink brings people, content, and technology together to help global teams translate, adapt, and deliver with speed and clarity.",
  features: [
    { verb: "Supports", body: "Adobe AEM 6.5 LTS SP packages with cross-environment compatibility" },
    { verb: "Adapts", body: "To any AEM content tree, out-of-the-box or custom" },
    { verb: "Enables", body: "Custom localization for URLs and internal and external links" },
    { verb: "Automates", body: "Translation submission through AEM publishing workflow triggers" },
    { verb: "Triggers", body: "AEM workflows with AI and human oversight" },
    { verb: "Learns", body: "Adaptive forms with dictionaries stored under new path locations" },
  ],
  quote: {
    text: "TransPerfect helped us simplify a complex localization process and free our internal team to focus on higher-value work.",
    author: "Aesop",
  },
});

const CASE_STUDY_SEED: CaseStudyContent = emptyCaseStudy({
  eyebrow: "Client case study",
  client: "Aēsop",
  industry: "Beauty & personal care",
  audience: "Global product knowledge teams",
  summary: "Aēsop's success story in rapid product knowledge localization",
  challenge: {
    heading: "The Challenge",
    body: "Aēsop needed to localize hundreds of product knowledge modules — combining technical content, regulatory updates, and training materials — across multiple markets. Their internal team was overloaded with disconnected processes, inconsistent terminology, and manual handoffs that slowed delivery and increased costs.",
  },
  solution: {
    heading: "The Solution",
    body: "TransPerfect's GlobalLink for Adobe Experience Manager Plus unified content, automation, and workflows in one centralized ecosystem. We integrated directly with AEM, automated translation submissions, enforced terminology consistency, and delivered localized modules through a one-click workflow with full visibility and control.",
  },
  result: {
    heading: "The Result",
    body: "Aēsop cut project management time by more than 70% and reduced engineering localization costs by 33%. With automated workflows and centralized governance, their team scaled content delivery across 7 markets — on time, on budget, and with consistent quality.",
  },
  stats: [
    { label: "Project management time reduced", value: "3 mo → 10 days", unit: "" },
    { label: "Reduction in engineering localization costs", value: "33", unit: "%" },
    { label: "Modules rolled out within budget", value: "On Time", unit: "" },
  ],
  quote: {
    text: "TransPerfect helped us simplify a complex localization process and free our internal team to focus on higher-value work.",
    author: "Aēsop",
  },
  cta: {
    label: "See GlobalLink in Action",
    subhead: "Explore how GlobalLink AI can transform your content operations.",
  },
  engagement: {
    title: "Engagement Snapshot",
    bullets: [
      "Trusted Adobe Gold Partner",
      "Deep global content expertise",
      "Hands-on, human partnership",
    ],
  },
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function PrintCenterPage() {
  const { brandModes } = useTaxonomy();
  const [previewBrandId, setPreviewBrandId] = useState<string>(
    () => brandModes.find((b) => b.id === "bm-tp-lifesci")?.id ?? brandModes[0]?.id ?? "bm-enterprise",
  );
  const previewBrand = useMemo(
    () => brandModes.find((b) => b.id === previewBrandId) ?? brandModes[0],
    [brandModes, previewBrandId],
  );
  const [openTemplate, setOpenTemplate] = useState<PrintAssetKind | null>(null);

  const listFn = useServerFn(listMyPrintAssets);
  const delFn = useServerFn(deletePrintAsset);
  const assetsQuery = useQuery({
    queryKey: ["print-assets", "mine"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this print asset? This cannot be undone.")) return;
    try {
      await delFn({ data: { id } });
      toast.success("Deleted");
      assetsQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Library · Print</div>
        <div className="mt-3"><LibrarySubnav active="/library/print" /></div>
        <h1 className="mt-4 text-4xl font-semibold text-[#03002C]">Print design templates.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          One-pagers, brochures, and briefs rendered on the same aurora + glass brand engine as your decks.
          Pick a template, preview it in the division that fits, then spin up an editable asset.
        </p>
      </div>

      {/* Brand switcher for previews */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-black/10 pb-6">
        <div className="mr-2 text-xs uppercase tracking-[0.24em] text-black/50">Preview division</div>
        {brandModes.map((b) => {
          const active = b.id === previewBrandId;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setPreviewBrandId(b.id)}
              className={
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition " +
                (active
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : "border-black/15 bg-white text-black/70 hover:border-[#003FC7]")
              }
            >
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{ background: b.tokens.accent }}
              />
              {b.name}
            </button>
          );
        })}
      </div>

      {/* Template gallery */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-black/50">Templates</div>
            <h2 className="mt-1 text-xl font-semibold text-[#03002C]">Pick a starting point.</h2>
          </div>
          <div className="text-xs text-black/50">
            {TEMPLATES.filter((t) => t.live).length} live · {TEMPLATES.filter((t) => !t.live).length} coming soon
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              brand={previewBrand}
              onPreview={() => setOpenTemplate(tpl.id)}
            />
          ))}
        </div>
      </section>

      {/* My print assets */}
      <section className="mt-14">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-black/50">Your print assets</div>
            <h2 className="mt-1 text-xl font-semibold text-[#03002C]">
              {assetsQuery.data?.length ?? 0} saved
            </h2>
          </div>
          <Link
            to="/asset/new"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#03002C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#03002C]/85"
          >
            <Sparkles size={12} /> Start blank
          </Link>
        </div>

        {assetsQuery.isLoading ? (
          <div className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/60">Loading…</div>
        ) : assetsQuery.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-sm text-red-700">
            Couldn't load your print assets: {(assetsQuery.error as Error).message}
          </div>
        ) : (assetsQuery.data?.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
            <p className="text-sm text-black/60">You haven't drafted any print assets yet.</p>
            <Link
              to="/asset/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#003FC7] px-4 py-2 text-xs font-medium text-[#003FC7] hover:bg-[#003FC7] hover:text-white"
            >
              Draft your first one <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assetsQuery.data!.map((row) => {
              const brand = brandModes.find((b) => b.id === row.brand_mode_id);
              const tpl = TEMPLATES.find((t) => t.id === (row.kind as PrintAssetKind));
              return (
                <div
                  key={row.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-[#003FC7]/50 hover:shadow-md"
                >
                  <div
                    className="relative h-24"
                    style={{
                      background: brand
                        ? `linear-gradient(135deg, ${brand.tokens.primary} 0%, ${brand.tokens.accent} 100%)`
                        : "linear-gradient(135deg,#03002C,#003FC7)",
                    }}
                  >
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#03002C]">
                      {tpl?.icon} {tpl?.label ?? row.kind}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="line-clamp-2 text-sm font-medium text-[#03002C]">{row.title || "Untitled"}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-black/50">
                      <Clock size={10} /> Updated {new Date(row.updated_at).toLocaleDateString()}
                      {brand ? <> · <span>{brand.name}</span></> : null}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      <Link
                        to="/asset/$assetId"
                        params={{ assetId: row.id }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85"
                      >
                        <Pencil size={11} /> Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(row.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-black/15 px-2.5 py-1.5 text-xs text-black/50 hover:border-red-300 hover:text-red-600"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail overlay */}
      {openTemplate && previewBrand ? (
        <TemplateDetailOverlay
          kind={openTemplate}
          brand={previewBrand}
          onClose={() => setOpenTemplate(null)}
        />
      ) : null}
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Template card with a scaled Spotlight thumbnail (or aurora placeholder)
// ---------------------------------------------------------------------------
function TemplateCard({
  tpl,
  brand,
  onPreview,
}: {
  tpl: Template;
  brand: BrandMode | undefined;
  onPreview: () => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-[#003FC7]/50 hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative aspect-[8.5/11] w-full overflow-hidden bg-[#0b0a2a]">
        {brand ? <ThumbLive kind={tpl.id} brand={brand} /> : <ThumbPlaceholder brand={brand} kind={tpl.id} />}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
              (tpl.live
                ? "bg-[#A6FA87] text-[#03002C]"
                : "bg-white/80 text-[#03002C]")
            }
          >
            {tpl.live ? "Live" : "Coming soon"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-black/50">
          {tpl.icon} {tpl.tagline}
        </div>
        <h3 className="mt-2 text-lg font-semibold text-[#03002C]">{tpl.label}</h3>
        <p className="mt-2 text-sm text-black/60">{tpl.desc}</p>

        <div className="mt-5 flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            Preview
          </button>
          {tpl.live ? (
            <Link
              to="/asset/new"
              search={{ kind: tpl.id, brandModeId: brand?.id }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85"
            >
              Use template <ArrowRight size={12} />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-black/20 px-3 py-1.5 text-xs text-black/40">
              In production
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Dispatch a scaled-down live layout for the given kind. Uses container-relative
// units, so a full-width wrapper fills the thumbnail.
function ThumbLive({ kind, brand }: { kind: PrintAssetKind; brand: BrandMode }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {kind === "spotlight" && (
        <SpotlightLayout content={SPOTLIGHT_SEED} brand={brand} mode="light" pageSize="Letter" density="standard" />
      )}
      {kind === "ebrochure" && (
        <EBrochureLayout content={EBROCHURE_SEED} brand={brand} mode="light" pageSize="Letter" density="standard" />
      )}
      {kind === "adaptor-brief" && (
        <AdaptorBriefLayout content={ADAPTOR_SEED} brand={brand} mode="dark" pageSize="Letter" density="standard" />
      )}
      {kind === "case-study" && (
        <CaseStudyLayout content={CASE_STUDY_SEED} brand={brand} mode="light" pageSize="Letter" density="standard" />
      )}
    </div>
  );
}

// Aurora placeholder for kinds that don't have a live layout yet. Uses the
// division tokens directly so the card still feels "of the division".
function ThumbPlaceholder({
  brand,
  kind,
}: {
  brand: BrandMode | undefined;
  kind: PrintAssetKind;
}) {
  const primary = brand?.tokens.primary ?? "#03002C";
  const accent = brand?.tokens.accent ?? "#003FC7";
  const label =
    kind === "ebrochure" ? "E-Brochure" :
    kind === "adaptor-brief" ? "Adaptor Brief" :
    kind === "case-study" ? "Case Study" : "Spotlight";
  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(circle at 20% 15%, ${accent}88 0%, transparent 45%),` +
            `radial-gradient(circle at 85% 80%, ${accent}55 0%, transparent 55%),` +
            `linear-gradient(135deg, ${primary} 0%, #0b0a2a 100%)`,
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-5 text-white/85">
        <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/60">
          TransPerfect · {brand?.name ?? "Master"}
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Template preview</div>
          <div className="mt-1 text-2xl font-semibold leading-tight">{label}</div>
          <div
            aria-hidden
            className="mt-3 h-[3px] w-14 rounded-full"
            style={{ background: accent }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail overlay — full-size Light + Dark render for the selected template
// ---------------------------------------------------------------------------
function TemplateDetailOverlay({
  kind,
  brand,
  onClose,
}: {
  kind: PrintAssetKind;
  brand: BrandMode;
  onClose: () => void;
}) {
  const tpl = TEMPLATES.find((t) => t.id === kind)!;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[1600px] rounded-2xl bg-[#f5f5f2] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-black/50">Template preview · {brand.name}</div>
            <h2 className="mt-1 text-2xl font-semibold text-[#03002C]">{tpl.label}</h2>
            <p className="mt-1 max-w-2xl text-sm text-black/60">{tpl.desc}</p>
          </div>
          <div className="flex items-center gap-2">
            {tpl.live ? (
              <Link
                to="/asset/new"
                search={{ kind: tpl.id, brandModeId: brand.id }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85"
              >
                Use this template <ArrowRight size={12} />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-full border border-black/15 bg-white p-2 text-black/60 hover:border-black/40"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PreviewFrame label="Light"><PrintPreview kind={kind} brand={brand} mode="light" /></PreviewFrame>
          <PreviewFrame label="Dark"><PrintPreview kind={kind} brand={brand} mode="dark" /></PreviewFrame>
        </div>
      </div>
    </div>
  );
}

function PrintPreview({ kind, brand, mode }: { kind: PrintAssetKind; brand: BrandMode; mode: "light" | "dark" }) {
  if (kind === "spotlight") return <SpotlightLayout content={SPOTLIGHT_SEED} brand={brand} mode={mode} pageSize="Letter" density="standard" />;
  if (kind === "ebrochure") return <EBrochureLayout content={EBROCHURE_SEED} brand={brand} mode={mode} pageSize="Letter" density="standard" />;
  if (kind === "adaptor-brief") return <AdaptorBriefLayout content={ADAPTOR_SEED} brand={brand} mode={mode} pageSize="Letter" density="standard" />;
  return null;
}

function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/50">{label}</div>
      <div className="overflow-hidden rounded-2xl border border-black/10 shadow-xl">{children}</div>
    </div>
  );
}
