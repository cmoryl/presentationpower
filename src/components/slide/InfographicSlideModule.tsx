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
import { renderInfographic } from "@/lib/infographics/registry";
import { ensureA11y } from "@/lib/infographics/a11y";
import { ChartDataDrawer } from "./ChartDataDrawer";

type Props = {
  slide: DeckSlide;
  variant: ModuleVariant;
  brand: BrandMode;
  pageNumber: number;
  mode: "light" | "dark";
};

/** Map MV-VIZ-* id -> default InfographicKind. */
const KIND_BY_VARIANT: Record<string, InfographicKind> = {
  "MV-VIZ-SANKEY": "sankey",
  "MV-VIZ-CHORD": "chord",
  "MV-VIZ-BEESWARM": "beeswarm",
  "MV-VIZ-BUMP": "bump",
  "MV-VIZ-MARKET-MAP": "market-map",
  "MV-VIZ-TREEMAP": "treemap",
  "MV-VIZ-CALENDAR-HEATMAP": "calendar-heatmap",
};

function s(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}

export function InfographicSlideModule({ slide, variant, brand, pageNumber, mode }: Props) {
  const content = (slide.content ?? {}) as Record<string, unknown>;

  const spec: InfographicSpec = React.useMemo(() => {
    const declared = content.spec as Partial<InfographicSpec> | undefined;
    const kind = (declared?.kind ?? KIND_BY_VARIANT[variant.id] ?? "custom") as InfographicKind;
    const encoding = declared?.encoding ?? (content.encoding as InfographicSpec["encoding"]) ?? {};
    const rows = (declared?.data?.rows ??
      (content.rows as InfographicSpec["data"]["rows"]) ??
      []) as InfographicSpec["data"]["rows"];
    const source = declared?.data?.source ?? (s(content.source) || undefined);
    const columns =
      declared?.data?.columns ?? (content.columns as Record<string, string> | undefined);
    return ensureA11y({
      id: `${slide.id}-viz`,
      kind,
      title: s(content.title),
      subtitle: s(content.subtitle),
      data: { rows, source, columns },
      encoding,
      theme: {
        divisionId: brand.id,
        mode,
        accent: brand.tokens.accent,
        primary: brand.tokens.primary,
        ink: brand.tokens.ink,
        surface: brand.tokens.surface,
      },
      accessibility: declared?.accessibility ?? { shortAlt: "", longDesc: "" },
      export: { preferredFormat: "svg", rasterFallback: true },
    });
  }, [slide.id, variant.id, content, brand, mode]);

  const ctx: RenderContext = { width: 960, height: 460, exporting: false };

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
