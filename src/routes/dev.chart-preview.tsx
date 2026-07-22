import { createFileRoute } from "@tanstack/react-router";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { MODULE_VARIANTS, BRAND_MODES, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/dev/chart-preview")({
  component: DevChartPreview,
});

function DevChartPreview() {
  const variant = byId(MODULE_VARIANTS, "MV-DASH-SALES-CHART")!;
  const brand = BRAND_MODES.find((b) => b.id === "bm-tp-lifesci")!;
  const slide = {
    id: "prev-1",
    variantId: variant.id,
    sectionId: "sec-proof",
    order: 1,
    content: {
      title: "Trial enrollment velocity",
      kicker: "Program telemetry",
      headline: "Sites activated faster with GlobalLink orchestration.",
      source: "Life Sciences ops · Q3",
      series: [
        { label: "Jan", value: 32 }, { label: "Feb", value: 41 },
        { label: "Mar", value: 38 }, { label: "Apr", value: 55 },
        { label: "May", value: 62 }, { label: "Jun", value: 70 },
        { label: "Jul", value: 74 }, { label: "Aug", value: 88 },
      ],
      stat: { value: "+38", unit: "%", label: "vs prior half", delta: "▲ vs H1" },
    },
  } as Parameters<typeof VariantRenderer>[0]["slide"];

  return (
    <div className="min-h-screen bg-neutral-950 p-8 space-y-8">
      {(["dark", "light"] as const).map((mode) => (
        <div key={mode}>
          <div className="text-xs uppercase tracking-widest text-white/60 mb-2">Life Sciences · {mode}</div>
          <div className="aspect-[16/9] w-full max-w-[1400px]">
            <ScaledSlide>
              <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode={mode} />
            </ScaledSlide>
          </div>
        </div>
      ))}
    </div>
  );
}
