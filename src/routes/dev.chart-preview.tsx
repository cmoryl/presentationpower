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
