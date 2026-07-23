// Visual-QA route: renders the 3 print layouts × 2 modes × 3 stress divisions
// (bright / deep / mid) so Playwright can screenshot the 18-cell matrix
// during the fine-tuning pass. Also includes a "long content" stress variant
// per template so overflow / clamp behaviour can be verified against
// realistic AI-length copy (~1.5–2× seed length).
//
// Route is noindex; not linked from the UI. Delete once QA is signed off.

import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import type { BrandMode } from "@/lib/taxonomy";
import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { EBrochureLayout } from "@/components/print/EBrochureLayout";
import { AdaptorBriefLayout } from "@/components/print/AdaptorBriefLayout";
import {
  emptySpotlight,
  emptyEBrochure,
  emptyAdaptorBrief,
  type SpotlightContent,
  type EBrochureContent,
  type AdaptorBriefContent,
} from "@/lib/print-assets.types";

export const Route = createFileRoute("/test/print-qa")({
  head: () => ({
    meta: [
      { title: "Print QA matrix · internal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: PrintQAMatrix,
});

// -----------------------------------------------------------------------
// STRESS DIVISIONS
//   • bright — Life Sciences (accent #58ED21, high-chroma green)
//   • deep   — Legal (accent #3BBEB6 over deep navy primary)
//   • mid    — Digital Solutions (accent #C2A3FF, mid-lavender)
// -----------------------------------------------------------------------
const STRESS_BRAND_IDS = ["bm-tp-lifesci", "bm-tp-legal", "bm-tp-digital"] as const;

// Seed copy — normal length, matches the demo filler shape.
const SPOT_SEED: SpotlightContent = emptySpotlight({
  eyebrow: "Product spotlight",
  productName: "GlobalLink NEXT",
  tagline: "AI-native translation orchestration built for regulated enterprise pipelines.",
  summary:
    "One platform for continuous localization across web, product, and clinical content — with human review, model routing, and full auditability wired in from day one.",
  capabilities: [
    { heading: "Adaptive routing", body: "Route each string to the model + linguist blend that fits its risk and reuse profile — automatically." },
    { heading: "In-context QA", body: "Live visual QA against staging renders catches truncation, layout, and terminology drift pre-merge." },
    { heading: "Regulated workflows", body: "Signed audit trails, role-scoped review, and validated environments for life-sciences and financial workloads." },
    { heading: "Native connectors", body: "Deep hooks into Contentful, Adobe, GitHub, Figma, and 40+ CMS / DAM systems — no batch uploads." },
    { heading: "Human-in-the-loop", body: "Route exceptions to reviewers with the right context and controls." },
    { heading: "Analytics", body: "See quality, throughput, and spend as a single operating picture." },
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
  eyebrow: "E-brochure",
  title: "Localization at release-engineering speed",
  summary:
    "A partnership overview for global teams shipping regulated products across 40+ markets, with continuous translation wired into the same pipelines that ship code.",
  sections: [
    {
      heading: "The challenge",
      body: "Global content velocity outpaces manual localization. Teams end up cutting scope, missing markets, or degrading quality under pressure.",
      bullets: ["Fragmented tooling", "Manual review handoffs", "Opaque cost + quality"],
    },
    {
      heading: "Our approach",
      body: "Continuous localization that treats content the way engineering treats code — versioned, reviewed, observable, and shipped on demand.",
      bullets: ["Model + linguist routing", "In-context visual QA", "Signed audit trail"],
    },
    {
      heading: "The impact",
      body: "Enterprises ship weekly across 30+ locales at a fraction of the historical cost, with QA data flowing back into the model rooms.",
      bullets: ["62% faster to market", "40% cost reduction", "99.4% terminology fidelity"],
    },
  ],
  stats: [
    { label: "Languages", value: "170", unit: "+" },
    { label: "Faster GTM", value: "62", unit: "%" },
    { label: "Deployments", value: "300", unit: "+" },
    { label: "Uptime", value: "99.9", unit: "%" },
  ],
  quote: {
    text: "The kind of infrastructure we should have had five years ago — visible, versioned, and never a blocker.",
    author: "VP Product Ops",
    company: "Global medtech",
  },
  discover: {
    body: "How leading teams operationalize continuous localization without giving up review, control, or auditability.",
    bullets: [
      "Reference architecture for CMS + code content pipelines",
      "Model-routing playbook by risk and reuse profile",
      "Change-management pattern for regulated environments",
      "Cost model that scales with content volume, not headcount",
    ],
  },
});

const ADAPTOR_SEED: AdaptorBriefContent = emptyAdaptorBrief({
  eyebrow: "Adaptor brief",
  title: "Six ways the adaptor plugs into your stack",
  summary:
    "An internal enablement one-pager that shows how the adaptor supports, adapts to, and enables your existing content pipeline — no rebuilds required.",
  features: [
    { verb: "Supports", body: "Any CMS with a REST/GraphQL surface — auth is drop-in for OAuth or signed webhooks." },
    { verb: "Adapts", body: "Field mappings are declarative — new content types don't require a code change to translate." },
    { verb: "Enables", body: "Push translations back into staging so writers can review in-context before publish." },
    { verb: "Automates", body: "Continuous jobs trigger on content-change events; batch mode is available as a fallback." },
    { verb: "Triggers", body: "Downstream webhooks fire on job completion so QA, analytics, and notifications stay in sync." },
    { verb: "Learns", body: "Reviewer edits feed the routing model to reduce future human touchpoints on similar strings." },
  ],
  knowHow: ["Global reach", "Rapid deployment", "Expert reviewers", "Structured content", "Live analytics"],
  quote: {
    text: "The best adaptor is one we forget is running — this is the first that actually fit that bar.",
    author: "Head of Platform",
    company: "Retail·EU",
  },
});

// ---- LONG-CONTENT STRESS (~1.5–2× seed length) --------------------------
// Duplicate the body copy to simulate what real AI synthesis will emit.
const long = (s: string) => `${s} ${s.split(" ").slice(0, Math.floor(s.split(" ").length * 0.7)).join(" ")}`;

const SPOT_LONG: SpotlightContent = {
  ...SPOT_SEED,
  summary: long(SPOT_SEED.summary ?? ""),
  capabilities: SPOT_SEED.capabilities.map((c) => ({ ...c, body: long(c.body ?? "") })),
  quote: SPOT_SEED.quote
    ? { ...SPOT_SEED.quote, text: long(SPOT_SEED.quote.text) }
    : undefined,
};
const EBROCHURE_LONG: EBrochureContent = {
  ...EBROCHURE_SEED,
  summary: long(EBROCHURE_SEED.summary ?? ""),
  sections: EBROCHURE_SEED.sections.map((s) => ({ ...s, body: long(s.body ?? "") })),
  quote: EBROCHURE_SEED.quote
    ? { ...EBROCHURE_SEED.quote, text: long(EBROCHURE_SEED.quote.text) }
    : undefined,
  discover: EBROCHURE_SEED.discover
    ? { ...EBROCHURE_SEED.discover, body: long(EBROCHURE_SEED.discover.body) }
    : undefined,
};
const ADAPTOR_LONG: AdaptorBriefContent = {
  ...ADAPTOR_SEED,
  summary: long(ADAPTOR_SEED.summary ?? ""),
  features: ADAPTOR_SEED.features.map((f) => ({ ...f, body: long(f.body ?? "") })),
  quote: ADAPTOR_SEED.quote
    ? { ...ADAPTOR_SEED.quote, text: long(ADAPTOR_SEED.quote.text) }
    : undefined,
};

function Cell({
  label,
  brand,
  mode,
  children,
}: {
  label: string;
  brand: BrandMode;
  mode: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <div data-qa-cell={label} className="flex flex-col gap-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/60 dark:text-white/60">
        {label} · {brand.name} · {mode}
      </div>
      <div
        data-qa-slot={label}
        className={`overflow-hidden rounded-xl border ${
          mode === "dark" ? "border-white/10" : "border-black/10"
        }`}
        style={{ width: 640 }}
      >
        {children}
      </div>
    </div>
  );
}

function PrintQAMatrix() {
  const { brandModes } = useTaxonomy();
  const stress = useMemo(() => {
    return STRESS_BRAND_IDS.map((id) => brandModes.find((b) => b.id === id)).filter(
      (b): b is BrandMode => Boolean(b),
    );
  }, [brandModes]);

  if (stress.length === 0) {
    return <div className="p-10 text-sm">Loading brand modes…</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-[1400px]">
        <h1 className="text-xl font-semibold tracking-tight text-[#03002C] dark:text-white">
          Print QA matrix
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-black/60 dark:text-white/60">
          3 layouts × 2 modes × 3 stress divisions. Long-content stress row at the bottom.
        </p>

        {[
          { key: "spotlight", label: "Spotlight" },
          { key: "ebrochure", label: "E-Brochure" },
          { key: "adaptor", label: "Adaptor Brief" },
        ].map((tpl) => (
          <section key={tpl.key} className="mt-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-black/70 dark:text-white/70">
              {tpl.label}
            </h2>
            <div className="flex flex-wrap gap-8">
              {stress.map((brand) =>
                (["light", "dark"] as const).map((mode) => {
                  const label = `${tpl.key}-${brand.id}-${mode}`;
                  return (
                    <Cell key={label} label={label} brand={brand} mode={mode}>
                      {tpl.key === "spotlight" && (
                        <SpotlightLayout content={SPOT_SEED} brand={brand} mode={mode} />
                      )}
                      {tpl.key === "ebrochure" && (
                        <EBrochureLayout content={EBROCHURE_SEED} brand={brand} mode={mode} />
                      )}
                      {tpl.key === "adaptor" && (
                        <AdaptorBriefLayout content={ADAPTOR_SEED} brand={brand} mode={mode} />
                      )}
                    </Cell>
                  );
                }),
              )}
            </div>
          </section>
        ))}

        <section className="mt-14">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-black/70 dark:text-white/70">
            Long-content stress (~1.5–2× seed length)
          </h2>
          <div className="flex flex-wrap gap-8">
            {stress[0] && (
              <Cell label="spotlight-long" brand={stress[0]} mode="light">
                <SpotlightLayout content={SPOT_LONG} brand={stress[0]} mode="light" />
              </Cell>
            )}
            {stress[0] && (
              <Cell label="ebrochure-long" brand={stress[0]} mode="light">
                <EBrochureLayout content={EBROCHURE_LONG} brand={stress[0]} mode="light" />
              </Cell>
            )}
            {stress[0] && (
              <Cell label="adaptor-long" brand={stress[0]} mode="dark">
                <AdaptorBriefLayout content={ADAPTOR_LONG} brand={stress[0]} mode="dark" />
              </Cell>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
