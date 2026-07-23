import { createFileRoute } from "@tanstack/react-router";
import { useTaxonomy } from "@/hooks/use-taxonomy";
import { CaseStudyLayout } from "@/components/print/CaseStudyLayout";
import { emptyCaseStudy } from "@/lib/print-assets.types";

// Throwaway QA route for CaseStudyLayout screenshot pass.
export const Route = createFileRoute("/test/casestudy-qa")({
  head: () => ({ meta: [{ title: "CaseStudy QA" }, { name: "robots", content: "noindex" }] }),
  component: CaseStudyQA,
});

const SEED = emptyCaseStudy({
  eyebrow: "Client case study",
  client: "Northwind Health",
  summary: "How a regulated MedTech leader shipped 12 markets in one quarter without adding QA headcount.",
  industry: "Life Sciences · Global",
  audience: "Global content operations",
  stats: [
    { label: "Markets shipped", value: "12", unit: "" },
    { label: "Time-to-market", value: "62", unit: "% faster" },
    { label: "Quality score", value: "98", unit: "%" },
  ],
  challenge: {
    heading: "The Challenge",
    body: "Regulatory-grade content across 12 markets, fragmented tooling, and no single source of truth for terminology or approvals — release windows kept slipping.",
  },
  solution: {
    heading: "The Solution",
    body: "GlobalLink NEXT orchestrated model-routed translation, in-context QA, and signed audit trails across the entire authoring stack — from Contentful drafts to compliance sign-off.",
  },
  result: {
    heading: "The Result",
    body: "One quarter after go-live, Northwind hit 98% quality across all 12 markets with a smaller QA footprint and zero missed release windows.",
  },
  quote: {
    text: "It stopped feeling like localization and started feeling like release engineering.",
    author: "Head of Global Content",
    company: "Northwind Health",
  },
  engagement: {
    title: "Engagement Snapshot",
    bullets: ["12 markets scoped in 3 weeks", "Compliance sign-off automated", "Zero missed release windows", "Native Contentful + GitHub hooks"],
  },
  expert: { name: "Jordan Reyes", role: "Solutions architect · GlobalLink", email: "jreyes@transperfect.com" },
  cta: { label: "Book a walkthrough", subhead: "See how GlobalLink NEXT lands in your stack.", buttonLabel: "Talk to us »" },
});

function Cell({ label, brandId, mode }: { label: string; brandId: string; mode: "light" | "dark" }) {
  const { brandModes } = useTaxonomy();
  const brand = brandModes.find((b) => b.id === brandId) ?? brandModes[0];
  if (!brand) return null;
  return (
    <div data-qa-slot={label} className="w-[640px] shrink-0">
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/60">{label}</div>
      <div className="w-[640px] overflow-hidden rounded-2xl border border-black/10 shadow-lg">
        <CaseStudyLayout content={SEED} brand={brand} mode={mode} pageSize="Letter" density="standard" />
      </div>
    </div>
  );
}

function CaseStudyQA() {
  return (
    <div className="min-h-screen bg-neutral-100 p-8">
      <h1 className="mb-4 text-lg font-semibold">CaseStudyLayout QA — Letter portrait</h1>
      <div className="flex flex-wrap gap-8">
        <Cell label="casestudy-legal-light" brandId="bm-tp-legal" mode="light" />
        <Cell label="casestudy-legal-dark" brandId="bm-tp-legal" mode="dark" />
        <Cell label="casestudy-lifesci-light" brandId="bm-tp-lifesci" mode="light" />
        <Cell label="casestudy-lifesci-dark" brandId="bm-tp-lifesci" mode="dark" />
      </div>
    </div>
  );
}
