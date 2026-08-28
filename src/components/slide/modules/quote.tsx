// Quote / testimonial family — extracted from the legacy `VariantRenderer`
// switch onto the module registry. All five quote treatments share the same
// furniture (oversized quote mark, accent hairline, attribution block), so they
// belong to one owner: change the mark or rule here and every quote module
// moves with it.

import { registerSlideModule } from "../module-registry";
import { MediaTile, SlideFrame, SlideTitle, arr, s } from "../module-kit";
import {
  Attribution,
  DisplayTitle,
  Hairline,
  Kicker,
  MetaRow,
  QuoteMark,
  StatFigure,
} from "../primitives";
import { fillPx } from "@/lib/open-space-fill";

const ACCENT = "var(--slide-accent-text)";

registerSlideModule({
  id: "family:quote",
  variantIds: [
    "MV-QUOTE-MULTI",
    "MV-QUOTE-PORTRAIT",
    "MV-QUOTE-CARD",
    "MV-QUOTE-METRIC",
    "MV-QUOTE-POSTER",
  ],
  render: ({ variant, brand, pageNumber, c, ink }) => {
    switch (variant.id) {
      case "MV-QUOTE-MULTI":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "What clients tell us")} />
            <div className="mt-14 grid grid-cols-1 gap-0">
              {arr(c.items)
                .slice(0, 3)
                .map((it, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[80px_1fr_320px] items-start gap-10 py-10"
                    style={{ borderTop: i === 0 ? "none" : `1px solid ${ink.divider}` }}
                  >
                    <QuoteMark color={ACCENT} size={110} opacity={0.9} className="-mt-4" />
                    <div
                      style={{
                        fontSize: fillPx(30, "figure"),
                        lineHeight: 1.32,
                        letterSpacing: "-0.01em",
                        color: ink.strong,
                      }}
                    >
                      {s(it.quote)}
                    </div>
                    <div className="text-right">
                      <Attribution brand={brand} name={s(it.attribution)} role={s(it.role)} />
                    </div>
                  </div>
                ))}
            </div>
          </SlideFrame>
        );

      case "MV-QUOTE-PORTRAIT":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid h-full grid-cols-[420px_1fr] items-stretch gap-16">
              <MediaTile
                overrideUrl={s(c.mediaUrl)}
                mediaPath={s(c.mediaPath)}
                brand={brand}
                seed={s(c.mediaSeed, s(c.attribution, "portrait"))}
                pool="portrait"
                className="h-full w-full"
                portrait
              />
              <div className="relative flex flex-col justify-center">
                <QuoteMark color={ACCENT} size={520} className="absolute -top-4 -left-2" />
                <div className="relative">
                  <Kicker brand={brand}>In their words</Kicker>
                  <Hairline
                    color={ACCENT}
                    widthPx={72}
                    thicknessPx={2}
                    className="mt-6 mb-10"
                  />
                  <div
                    style={{
                      fontSize: fillPx(60, "display"),
                      fontWeight: 500,
                      lineHeight: 1.2,
                      letterSpacing: "-0.015em",
                      color: ink.strong,
                      maxWidth: 1080,
                    }}
                  >
                    {s(c.quote)}
                  </div>
                  <div className="mt-14">
                    <Attribution
                      brand={brand}
                      name={s(c.attribution)}
                      role={s(c.role)}
                      org={s(c.org)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </SlideFrame>
        );

      case "MV-QUOTE-CARD":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex h-full items-center justify-center">
              <div className="relative max-w-[1300px]">
                <QuoteMark color={ACCENT} size={560} className="absolute -top-10 -left-6" />
                <div className="relative">
                  <Kicker brand={brand}>Testimonial</Kicker>
                  <Hairline
                    color={ACCENT}
                    widthPx={72}
                    thicknessPx={2}
                    className="mt-6 mb-10"
                  />
                  <div
                    style={{
                      fontSize: fillPx(56, "display"),
                      fontWeight: 500,
                      lineHeight: 1.22,
                      letterSpacing: "-0.015em",
                      color: ink.strong,
                    }}
                  >
                    {s(c.quote)}
                  </div>
                  <div className="mt-14 flex items-end justify-between gap-10">
                    <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
                    {s(c.org) && (
                      <MetaRow>
                        <span>{s(c.org)}</span>
                      </MetaRow>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SlideFrame>
        );

      case "MV-QUOTE-METRIC":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="relative grid h-full grid-cols-[1.3fr_1fr] items-center gap-24">
              <QuoteMark color={ACCENT} size={520} className="absolute -top-6 -left-4" />
              <div className="relative">
                <Kicker brand={brand}>In their words</Kicker>
                <Hairline color={ACCENT} widthPx={72} thicknessPx={2} className="mt-6 mb-10" />
                <div
                  style={{
                    fontSize: fillPx(58, "display"),
                    fontWeight: 500,
                    lineHeight: 1.2,
                    letterSpacing: "-0.015em",
                    color: ink.strong,
                  }}
                >
                  {s(c.quote)}
                </div>
                <div className="mt-12">
                  <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
                </div>
              </div>
              <div>
                <Hairline color={ACCENT} widthPx={56} thicknessPx={2} className="mb-6" />
                <Kicker brand={brand}>{s(c.metricLabel, "Outcome")}</Kicker>
                <div className="mt-8">
                  <StatFigure
                    brand={brand}
                    value={s(c.metric)}
                    unit={s(c.unit)}
                    size="xl"
                    icon={s(c.icon)}
                    iconSize={s(c.iconSize)}
                  />
                </div>
              </div>
            </div>
          </SlideFrame>
        );

      case "MV-QUOTE-POSTER":
      default:
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
            <div data-on-media className="relative flex h-full flex-col justify-center text-white">
              <QuoteMark
                color={ACCENT}
                size={780}
                opacity={0.16}
                className="absolute -top-6 -left-4"
              />
              <div className="relative">
                <Kicker brand={brand} color={ACCENT}>
                  Testimonial
                </Kicker>
                <Hairline color={ACCENT} widthPx={120} thicknessPx={2} className="mt-8 mb-12" />
                <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1620}>
                  {s(c.quote)}
                </DisplayTitle>
                <div className="mt-16">
                  <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
                </div>
              </div>
            </div>
          </SlideFrame>
        );
    }
  },
});
