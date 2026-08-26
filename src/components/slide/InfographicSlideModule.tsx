// Slide-level wrapper that renders any MV-VIZ-* variant. Reads the
// InfographicSpec from slide content (or synthesizes one from encoding
// hints), then delegates to the ECharts adapter via the infographics
// registry. Wraps the chart in flagship chrome (title, source, data
// drawer) so free-form aurora treatment stays consistent.
//
// Side-effect import of the adapter registration MUST live in a
// module reachable from the client bundle but never touched during
// module evaluation of an SSR route. We import it here because this
// component itself is only referenced from `VariantRenderer`'s switch
// case for MV-VIZ-* ids and mounted client-side.
import "./echarts-adapter";

import * as React from "react";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import { SlideFrame } from "./SlideChrome";
import { TitleBlock } from "./primitives";
import { AuroraLayer } from "./flagship";
import type { DeckSlide } from "@/lib/deck-store";
import type { InfographicKind, InfographicSpec, RenderContext } from "@/lib/infographics/spec";
import { useOpenSpaceFill } from "@/components/slide/OpenSpaceFill";
import { renderInfographic } from "@/lib/infographics/registry";
import { buildVizSpecFromContent } from "@/lib/infographics/from-content";
import { repairVizSpec } from "@/lib/infographics/repair";
import { useVizSurface } from "./VizSurfaceContext";
import { ChartDataDrawer } from "./ChartDataDrawer";
import { useStylePack } from "./StylePackContext";
import { vizTheme } from "@/lib/infographics/viz-theme";

type Props = {
  slide: DeckSlide;
  variant: ModuleVariant;
  brand: BrandMode;
  pageNumber: number;
  mode: "light" | "dark";
};

function s(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}

export function InfographicSlideModule({ slide, variant, brand, pageNumber, mode }: Props) {
  const content = (slide.content ?? {}) as Record<string, unknown>;
  // A chart has to be legible on the surface it actually lands on: dark mode
  // and every alternate look change the ground under it.
  const pack = useStylePack();
  const theme = React.useMemo(() => vizTheme({ brand, mode, pack }), [brand, mode, pack]);

  // Charts are audited/repaired for the surface they actually land on: a press
  // sheet and a feed post carry different legibility budgets than a slide.
  const surface = useVizSurface();
  const spec: InfographicSpec = React.useMemo(
    () =>
      repairVizSpec(
        buildVizSpecFromContent({
          content,
          variantId: variant.id,
          id: `${slide.id}-viz`,
          theme,
        }),
        { surface },
      ).spec,
    [slide.id, variant.id, content, theme, surface],
  );

  // Charts grow with the slide's open space (block axis), so a two-series bar
  // chart on an otherwise empty page fills the sheet instead of floating.
  const fill = useOpenSpaceFill();
  const ctx: RenderContext = {
    width: 960,
    height: 460,
    exporting: false,
    fill: fill.active ? fill.block : 1,
  };

  return (
    <SlideFrame brand={brand} pageNumber={pageNumber} variant="content">
      <AuroraLayer brand={brand} />
      <div className="relative z-10 flex h-full flex-col gap-6 px-16 py-14">
        <div className="flex items-start justify-between gap-6">
          <TitleBlock
            brand={brand}
            kicker={s(content.kicker) || variant.name}
            title={spec.title || variant.name}
          />
          <ChartDataDrawer spec={spec} />
        </div>
        <div className="flex-1 min-h-0">{renderInfographic(spec, ctx)}</div>
        {spec.data.source ? (
          <p className="text-[11px] opacity-70">Source: {spec.data.source}</p>
        ) : null}
      </div>
    </SlideFrame>
  );
}
