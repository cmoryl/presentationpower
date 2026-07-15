import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import {
  BRAND_MODES,
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  byId,
  type ModuleVariant,
} from "@/lib/taxonomy";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library · TransPerfect Modular" },
      { name: "description", content: "Approved module variants ready to drop into a deck." },
    ],
  }),
  component: Library,
});

function Library() {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MODULE_VARIANTS.filter((v) => {
      if (family !== "all" && v.familyId !== family) return false;
      if (!needle) return true;
      return (
        v.id.toLowerCase().includes(needle) ||
        v.name.toLowerCase().includes(needle) ||
        v.description.toLowerCase().includes(needle)
      );
    });
  }, [q, family]);

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Library</div>
        <h1 className="mt-3 text-4xl font-semibold">Approved module variants.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Search and preview the modules the assembler pulls from. Cloud-backed governance (approval status, expiration,
          industry tags) lands in phase 3.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules…"
          className="w-72 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All families</option>
          {MODULE_FAMILIES.map((mf) => (
            <option key={mf.id} value={mf.id}>{mf.id} · {mf.name}</option>
          ))}
        </select>
        <div className="ml-auto text-sm text-black/50">{filtered.length} of {MODULE_VARIANTS.length}</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 xl:grid-cols-3">
        {filtered.map((v) => (
          <VariantCard key={v.id} variant={v} />
        ))}
      </div>

      <div className="mt-10">
        <Link to="/brief/new" className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm text-white">
          Start a brief →
        </Link>
      </div>
    </AppShell>
  );
}

function VariantCard({ variant }: { variant: ModuleVariant }) {
  const mf = byId(MODULE_FAMILIES, variant.familyId);
  const brand = BRAND_MODES[0];
  const sf = SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(variant.familyId));
  const previewSlide = {
    id: variant.id,
    position: 0,
    sectionId: sf?.id ?? "",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: samplePreviewContent(variant.id),
    changes: [],
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="aspect-[16/9] bg-white">
        <ScaledSlide>
          <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} />
        </ScaledSlide>
      </div>
      <div className="border-t border-black/10 p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-xs text-black/50">{variant.id}</div>
          <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]">
            {variant.familyId}
          </span>
        </div>
        <div className="mt-1 font-medium">{variant.name}</div>
        <div className="mt-1 text-sm text-black/60">{variant.description}</div>
        <div className="mt-3 text-xs text-black/50">
          <div>Family: {mf?.name}</div>
          <div>Layouts: {variant.permittedLayoutIds.join(", ")}</div>
          {variant.capacity.items && (
            <div>Items: {variant.capacity.items.min}–{variant.capacity.items.max}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function samplePreviewContent(variantId: string): Record<string, unknown> {
  switch (variantId) {
    case "MV-OP-COVER":
      return { title: "Acme Corp", subtitle: "Strategic partnership review", clientName: "Acme Corp", presenter: "TransPerfect", date: "Preview" };
    case "MV-OP-AGENDA":
      return { title: "Agenda", items: [{ label: "Where you are today" }, { label: "What we heard" }, { label: "Our recommendation" }, { label: "Proof" }, { label: "Next steps" }] };
    case "MV-OP-DIVIDER":
      return { kicker: "Section", title: "Context" };
    case "MV-CTX-CARDS-3":
      return { title: "Where Acme is today", items: [{ title: "Fragmented workflows", body: "Content moves across teams without a single source of truth." }, { title: "Rising volume", body: "Global demand is outpacing review capacity." }, { title: "Compliance drag", body: "Regulated markets add review steps." }] };
    case "MV-CTX-COST":
      return { stat: "40", unit: "%", label: "of launch delays trace back to translation bottlenecks", narrative: "Every quarter of delay compounds into lost revenue." };
    case "MV-INS-CALLOUT":
      return { insight: "The bottleneck is orchestration, not translation.", narrative: "The linguistic talent exists — the connective tissue is missing." };
    case "MV-INS-QUOTE":
      return { quote: "We were spending more time chasing files than shipping content.", attribution: "Global Marketing Lead", role: "Enterprise client" };
    case "MV-SOL-PILLARS-3":
      return { title: "Our recommendation", items: [{ title: "Unified intake", body: "One request surface." }, { title: "AI-assisted review", body: "Humans on the exceptions." }, { title: "Governed publish", body: "Approved-only routing." }] };
    case "MV-SOL-PILLARS-4":
      return { title: "Capability set", items: [{ title: "Translation", body: "150+ languages." }, { title: "QA", body: "Automated + human." }, { title: "Publish", body: "Native integrations." }, { title: "Analytics", body: "SLA + quality dashboards." }] };
    case "MV-PROC-TIMELINE":
      return { title: "How we get there", items: [{ label: "Week 1", body: "Discovery" }, { label: "Week 2–3", body: "Pilot" }, { label: "Week 4", body: "Scale" }] };
    case "MV-PROOF-STATS-3":
      return { title: "Proof", items: [{ value: "36", unit: "%", label: "faster time to market", source: "TransPerfect, 2025" }, { value: "22", unit: "%", label: "lower cost", source: "Client, 2024" }, { value: "99.5", unit: "%", label: "QA acceptance", source: "2025" }] };
    case "MV-DEC-MATRIX":
      return { title: "Where each option lands", axisX: "Speed", axisY: "Control", q1: "Managed program", q2: "In-house team", q3: "Freelance stack", q4: "Point tools" };
    case "MV-CASE-SPREAD":
      return { client: "Global life-sciences leader", challenge: "Localized 4,000+ regulated documents / year.", solution: "Managed program with AI-assisted QA.", result: "38% faster launches, zero reopenings.", metric: "38% ↓ time to market" };
    case "MV-REC-NEXT":
      return { recommendation: "We recommend starting with a focused pilot in the highest-volume market.", rationale: "This isolates the workflow change and produces measurable results in one quarter." };
    case "MV-CLOSE-CTA":
      return { message: "Ready to scope the pilot.", nextSteps: "Two-week discovery, then a two-month pilot.", owner: "TransPerfect account team", followUp: "Kickoff within 10 business days." };
    default:
      return { title: "Preview" };
  }
}
