import { createFileRoute } from "@tanstack/react-router";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, byId, MODULE_VARIANTS } from "@/lib/taxonomy";
import { getDivisionLocationSet } from "@/lib/location-maps";

export const Route = createFileRoute("/__locpreview")({
  component: Page,
  head: () => ({
    meta: [{ title: "Locations preview" }, { name: "robots", content: "noindex" }],
  }),
});

function Page() {
  const brand = BRAND_MODES[0];
  const set = getDivisionLocationSet(brand.id);
  const variant = byId(MODULE_VARIANTS, "MV-LOC-WORLD-PINS")!;
  const slide = {
    id: "s1",
    variantId: variant.id,
    content: {
      title: "A footprint that follows the work",
      subtitle: "Offices, hubs and delivery centres across every major market.",
      items: set.pins,
    },
  } as never;
  return (
    <div style={{ display: "grid", gap: 24, padding: 24 }}>
      {(["light", "dark"] as const).map((m) => (
        <div key={m} style={{ width: 1280, height: 720, overflow: "hidden" }}>
          <div style={{ width: 1600, height: 900, transform: "scale(0.8)", transformOrigin: "top left" }}>
            <VariantRenderer
              slide={slide}
              variant={variant}
              brand={brand}
              pageNumber={1}
              mode={m}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
