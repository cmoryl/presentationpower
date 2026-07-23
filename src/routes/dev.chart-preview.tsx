import { createFileRoute } from "@tanstack/react-router";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { MODULE_VARIANTS, BRAND_MODES, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/dev/chart-preview")({
  component: DevChartPreview,
});

// Pilot samples for the aurora free-form treatment. Matches the reference
// images exactly: 2×2 stats (100 / 48 / 98 / 35+) and a donut trio.
const PILOTS = [
  {
    variantId: "MV-PROOF-STATS-4",
    label: "AuroraStatGrid pilot (2×2)",
    content: {
      title: "Aēsop · outcomes",
      items: [
        { value: "100", unit: "%", label: "Global teams empowered", icon: "handshake" },
        { value: "48", unit: "%", label: "Reduction in localization costs", icon: "trending-down" },
        { value: "98", unit: "%", label: "Translation quality score", icon: "check-circle" },
        { value: "35", unit: "+", label: "Markets supported", icon: "globe" },
      ],
    },
  },
  {
    variantId: "MV-DASH-DONUT-TRIO",
    label: "Donut trio (airy chart — verify no box)",
    content: {
      title: "Portfolio distribution",
      items: [
        { meta: "Enrollment", label: "Trials on-track", body: "of the current portfolio", value: 74 },
        { meta: "Translation", label: "Faster turnaround", body: "vs previous vendor", value: 52 },
        { meta: "Adoption", label: "Sites onboarded", body: "across three regions", value: 88 },
      ],
    },
  },
  {
    variantId: "MV-DASH-SALES-CHART",
    label: "Free-form area chart (Aurora v2)",
    content: {
      kicker: "Fiscal 2026 · Life Sciences trial revenue",
      title: "Trial revenue compounds through the second half.",
      headline:
        "Feathered accent bloom sits directly on the aurora — no plate, no panel. The last point halos so the current reading remains legible.",
      stat: { value: "42", unit: "%", label: "YoY revenue growth", delta: "+12 pts vs plan" },
      series: [
        { label: "Jan", value: 42 },
        { label: "Feb", value: 48 },
        { label: "Mar", value: 46 },
        { label: "Apr", value: 55 },
        { label: "May", value: 61 },
        { label: "Jun", value: 58 },
        { label: "Jul", value: 68 },
        { label: "Aug", value: 74 },
        { label: "Sep", value: 79 },
        { label: "Oct", value: 82 },
        { label: "Nov", value: 90 },
        { label: "Dec", value: 96 },
      ],
    },
  },
  {
    variantId: "MV-DASH-PERFORMANCE",
    label: "Free-form bar chart (Aurora v2)",
    content: {
      kicker: "Region · Q3 performance",
      title: "APAC pulls ahead on program conversion.",
      headline:
        "Highlighted bar carries the bloom, halo, and glow. Non-highlight bars sit as quiet feathered forms on the same baseline hairline.",
      stat: { value: "72", unit: "%", label: "APAC conversion rate" },
      highlight: "APAC",
      bars: [
        { label: "NA", value: 48 },
        { label: "EMEA", value: 54 },
        { label: "LATAM", value: 39 },
        { label: "APAC", value: 72 },
        { label: "MEA", value: 31 },
      ],
      legend: [
        { label: "APAC (highlight)", value: "72%" },
        { label: "Regional peers", value: "avg 43%" },
      ],
    },
  },
  {
    variantId: "MV-DASH-GROWTH-COLUMNS",
    label: "Free-form growth columns (Aurora v2)",
    content: {
      kicker: "Trajectory · Life Sciences",
      title: "Five years of compounding revenue.",
      headline:
        "Columns sit on a single hairline baseline. The last column blooms with a radial halo and thin accent top-edge so the current year reads without a label.",
      items: [
        { year: "2022", value: "18", unit: "M", note: "Foundation" },
        { year: "2023", value: "27", unit: "M", note: "First expansion" },
        { year: "2024", value: "44", unit: "M", note: "Product-market fit" },
        { year: "2025", value: "68", unit: "M", note: "Scale phase" },
        { year: "2026", value: "96", unit: "M", note: "Projected" },
      ],
    },
  },
  {
    variantId: "MV-DASH-GAUGE-ROW",
    label: "Free-form semi-gauges (Aurora v2)",
    content: {
      kicker: "Signals · Q3",
      title: "Program health across the portfolio.",
      items: [
        { label: "On-track", body: "vs plan", value: 82 },
        { label: "Utilization", body: "resourcing", value: 68 },
        { label: "Quality", body: "audit score", value: 94 },
        { label: "Adoption", body: "of rollouts", value: 57 },
        { label: "Retention", body: "renewals", value: 76 },
      ],
    },
  },
  {
    variantId: "MV-DASH-DONUT-TRIO",
    label: "Free-form donut trio (Aurora v2)",
    content: {
      kicker: "Portfolio · Q3",
      title: "Portfolio distribution.",
      items: [
        { label: "Trials on-track", body: "of the current portfolio", value: 74 },
        { label: "Faster turnaround", body: "vs previous vendor", value: 52 },
        { label: "Sites onboarded", body: "across three regions", value: 88 },
      ],
    },
  },
  {
    variantId: "MV-DASH-BREAKDOWN",
    label: "Free-form breakdown rows (Aurora v2)",
    content: {
      kicker: "Revenue mix",
      title: "Where the top line comes from.",
      items: [
        { label: "Enterprise deals", percent: 46, value: "46", unit: "%", delta: "+8pt YoY" },
        { label: "Renewals", percent: 28, value: "28", unit: "%", delta: "+3pt YoY" },
        { label: "New logos", percent: 18, value: "18", unit: "%", delta: "+2pt YoY" },
        { label: "Services", percent: 8, value: "8", unit: "%", delta: "-1pt YoY" },
      ],
    },
  },
  {
    variantId: "MV-DASH-REPORT-CARDS",
    label: "Free-form report cards (Aurora v2)",
    content: {
      kicker: "Half-year report",
      title: "Two headline movements.",
      items: [
        { meta: "Growth", label: "Revenue lift from expanded footprint across APAC and EMEA.", value: "+62%", delta: "+62%", series: [12, 18, 22, 30, 44, 62] },
        { meta: "Reduction", label: "Localization spend as a share of program budget.", value: "-38%", delta: "-38%", series: [78, 70, 66, 58, 46, 40] },
      ],
    },
  },
] as const;


const BRANDS = [
  { id: "bm-enterprise", label: "Enterprise (matches reference)" },
  { id: "bm-tp-lifesci", label: "Life Sciences (division-aware)" },
] as const;


function DevChartPreview() {
  return (
    <div className="min-h-screen bg-neutral-950 p-6 space-y-12">
      {PILOTS.map((sample) => {
        const variant = byId(MODULE_VARIANTS, sample.variantId)!;
        return (
          <div key={sample.variantId} className="space-y-4">
            <div className="text-sm font-semibold text-white">{sample.label}</div>
            <div className="text-xs uppercase tracking-widest text-white/50">{sample.variantId}</div>
            {BRANDS.map((b) => {
              const brand = BRAND_MODES.find((x) => x.id === b.id)!;
              return (
                <div key={b.id} className="space-y-2">
                  <div className="text-[11px] uppercase tracking-widest text-white/50 mt-4">{b.label}</div>
                  {(["dark", "light"] as const).map((mode) => {
                    const slide = {
                      id: `prev-${sample.variantId}-${b.id}-${mode}`,
                      variantId: variant.id,
                      sectionId: "sec-proof",
                      order: 1,
                      position: 0,
                      layoutId: null,
                      changes: [],
                      content: sample.content,
                    } as unknown as Parameters<typeof VariantRenderer>[0]["slide"];
                    return (
                      <div key={mode}>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{mode}</div>
                        <div className="aspect-[16/9] w-full max-w-[1400px]">
                          <ScaledSlide>
                            <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode={mode} />
                          </ScaledSlide>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
