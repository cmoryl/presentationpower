/**
 * TEMPORARY local matrix harness — deleted after QA screenshots.
 * Query params: ?template=spotlight|ebrochure|adaptor-brief|case-study
 *               &mode=light|dark
 *               &brand=bm-tp-lifesci|bm-tp-legal|bm-tp-digital|...
 *               &stress=1
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  emptySpotlight,
  emptyEBrochure,
  emptyAdaptorBrief,
  emptyCaseStudy,
} from "@/lib/print-assets.types";
import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { EBrochureLayout } from "@/components/print/EBrochureLayout";
import { AdaptorBriefLayout } from "@/components/print/AdaptorBriefLayout";
import { CaseStudyLayout } from "@/components/print/CaseStudyLayout";

export const Route = createFileRoute("/test/print-matrix")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: MatrixHarness,
  head: () => ({ meta: [{ title: "Print matrix" }, { name: "robots", content: "noindex" }] }),
});

const LONG_TITLE =
  "Reframing regulated launch operations across seventeen therapeutic areas with a single continuous global localization program";
const LONG_SUMMARY =
  "Across every affiliate, portal, and regulator, TransPerfect coordinates a single, always-on delivery motion — reducing hand-offs, compressing review cycles, and giving global program leaders defensible audit trails while local teams stay fully unblocked to hit every regulator window without escalation.";
const LONG_STAT_LABELS = [
  "average review cycle compression across covered geographies",
  "regulator submissions cleared without material observation",
  "affiliate teams operating on unified translation memory tier",
];

function applyStress<T extends { title?: string; summary?: string; stats?: Array<{ value?: string; label?: string }> }>(c: T): T {
  const stats = (c.stats ?? []).map((s, i) => ({ ...s, label: LONG_STAT_LABELS[i] ?? s.label }));
  return { ...c, title: LONG_TITLE, summary: LONG_SUMMARY, stats } as T;
}

function MatrixHarness() {
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const template = q.get("template") ?? "spotlight";
  const mode = (q.get("mode") === "dark" ? "dark" : "light") as "light" | "dark";
  const brandId = q.get("brand") ?? "bm-tp-lifesci";
  const stress = q.get("stress") === "1";
  const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];

  let node: React.ReactNode = null;
  if (template === "spotlight") {
    const c = stress ? applyStress(emptySpotlight()) : emptySpotlight();
    node = <SpotlightLayout content={c} brand={brand} mode={mode} />;
  } else if (template === "ebrochure") {
    const c = stress ? applyStress(emptyEBrochure()) : emptyEBrochure();
    node = <EBrochureLayout content={c} brand={brand} mode={mode} />;
  } else if (template === "adaptor-brief") {
    const c = stress ? applyStress(emptyAdaptorBrief()) : emptyAdaptorBrief();
    node = <AdaptorBriefLayout content={c} brand={brand} mode={mode} />;
  } else if (template === "case-study") {
    const c = stress ? applyStress(emptyCaseStudy()) : emptyCaseStudy();
    node = <CaseStudyLayout content={c} brand={brand} mode={mode} />;
  }

  return (
    <div data-testid="matrix-root" style={{ padding: 24, background: "#e5e5e5", minHeight: "100vh" }}>
      {node}
    </div>
  );
}
