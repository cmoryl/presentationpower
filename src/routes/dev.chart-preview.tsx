import { createFileRoute } from "@tanstack/react-router";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { MODULE_VARIANTS, BRAND_MODES, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/dev/chart-preview")({
  component: DevChartPreview,
});

const SAMPLES: { variantId: string; content: Record<string, unknown> }[] = [
  {
    variantId: "MV-DASH-SALES-CHART",
    content: {
      title: "Trial enrollment velocity",
      kicker: "Program telemetry",
      headline: "Sites activated faster with GlobalLink orchestration.",
      series: [
        { label: "Jan", value: 32 }, { label: "Feb", value: 41 },
        { label: "Mar", value: 38 }, { label: "Apr", value: 55 },
        { label: "May", value: 62 }, { label: "Jun", value: 70 },
        { label: "Jul", value: 74 }, { label: "Aug", value: 88 },
      ],
      stat: { value: "+38", unit: "%", label: "vs prior half", delta: "▲ vs H1" },
    },
  },
  {
    variantId: "MV-GRAPH-AXIS-BARS",
    content: {
      title: "Regional throughput",
      kicker: "Volume · FY26",
      highlight: "APAC",
      unit: "M",
      bars: [
        { label: "NA", value: 42 }, { label: "EMEA", value: 58 },
        { label: "APAC", value: 74 }, { label: "LATAM", value: 31 },
      ],
    },
  },
  {
    variantId: "MV-GRAPH-DECADE-AREA",
    content: {
      title: "Ten-year trajectory",
      kicker: "Growth curve",
      calloutLabel: "2024",
      calloutNote: "Inflection point",
      series: Array.from({ length: 11 }, (_, i) => ({
        label: String(2016 + i),
        value: 20 + Math.round(Math.sin(i * 0.7) * 8) + i * 6,
      })),
    },
  },
  {
    variantId: "MV-DASH-DONUT-TRIO",
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
    variantId: "MV-GRAPH-RINGS",
    content: {
      title: "Program readiness",
      items: [
        { label: "Sites live", value: 88 },
        { label: "Regulatory ready", value: 64 },
        { label: "Data migrated", value: 46 },
      ],
    },
  },
];

function DevChartPreview() {
  return (
    <div className="min-h-screen bg-neutral-950 p-6 space-y-10">
      {SAMPLES.map((sample) => {
        const variant = byId(MODULE_VARIANTS, sample.variantId)!;
        const brand = BRAND_MODES.find((b) => b.id === "bm-tp-lifesci")!;
        const slide = {
          id: `prev-${sample.variantId}`,
          variantId: variant.id,
          sectionId: "sec-proof",
          order: 1,
          position: 0,
          layoutId: null,
          changes: [],
          content: sample.content,
        } as unknown as Parameters<typeof VariantRenderer>[0]["slide"];
        return (
          <div key={sample.variantId} className="space-y-4">
            <div className="text-xs uppercase tracking-widest text-white/60">{sample.variantId}</div>
            {(["dark", "light"] as const).map((mode) => (
              <div key={mode}>
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{mode}</div>
                <div className="aspect-[16/9] w-full max-w-[1400px]">
                  <ScaledSlide>
                    <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode={mode} />
                  </ScaledSlide>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
