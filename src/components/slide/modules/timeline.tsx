// Timeline family — extracted from the legacy `VariantRenderer` switch onto the
// module registry. Timeline furniture (spine, ticks, date rail) is the part of
// the deck that kept regressing on PPTX export, so it earns its own file with a
// single owner: change the rail here and every timeline module moves with it.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s } from "../module-kit";
import { fillPx } from "@/lib/open-space-fill";

registerSlideModule({
  id: "family:timeline",
  variantIds: ["MV-TIMELINE-VERTICAL"],
  render: ({ variant, brand, pageNumber, c, ink }) => {
    const items = arr(c.items);
    return (
      <SlideFrame brand={brand} pageNumber={pageNumber}>
        <SlideTitle brand={brand} title={s(c.title, variant.name)} />
        <div className="relative mt-12 pl-32">
          {/* Spine: kept as its own element (never a background paint) so the
              export decomposer emits it as an editable shape. */}
          <div
            className="absolute bottom-2 left-24 top-2 w-[2px]"
            style={{ background: brand.tokens.accent }}
          />
          <div className="flex flex-col gap-10">
            {items.map((it, i) => (
              <div key={i} className="relative">
                <div
                  className="absolute -left-[38px] top-3 h-4 w-4 rounded-full"
                  style={{ background: "#fff", border: `3px solid ${brand.tokens.accent}` }}
                />
                <div
                  className="absolute -left-32 top-1 w-24 pr-4 text-right tabular-nums uppercase"
                  style={{
                    fontSize: fillPx(18, "body"),
                    letterSpacing: "0.24em",
                    color: "var(--slide-accent-text)",
                    fontWeight: 600,
                  }}
                >
                  {s(it.date)}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: fillPx(30, "figure"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: fillPx(22, "body"),
                      lineHeight: 1.42,
                      color: ink.muted,
                      maxWidth: 1080,
                    }}
                  >
                    {s(it.body)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideFrame>
    );
  },
});
