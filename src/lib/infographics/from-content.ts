// Single source of truth for turning slide/module content into an
// InfographicSpec.
//
// Presentation slides, print sheets and social posts all render the same
// MV-VIZ-* modules, and each of them used to rebuild the spec inline. That
// meant a correctness fix (encoding fallbacks, sample-data substitution,
// contrast-guarded theme) only landed on whichever surface was being edited.
// Everything now funnels through buildVizSpecFromContent, so an audit or a
// repair applies identically wherever the chart is drawn.

import type { InfographicKind, InfographicSpec, InfographicTheme } from "./spec";
import { ensureA11y } from "./a11y";
import { vizKindForVariant } from "./variant-kinds";
import { sampleDatasetFor } from "./sample-data";

function str(v: unknown, fb = ""): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : fb;
}

export type BuildVizSpecInput = {
  /** Raw module/slide content object as authored. */
  content: Record<string, unknown>;
  /** Variant id (e.g. MV-VIZ-SANKEY) used to infer the chart kind. */
  variantId: string;
  /** Stable id for the rendered chart. */
  id: string;
  /** Surface-resolved theme (see vizTheme). */
  theme: InfographicTheme;
  /** Fall back to the kind's sample dataset when no rows are authored. */
  allowSampleData?: boolean;
};

/** Build a complete, accessible spec from authored content. */
export function buildVizSpecFromContent({
  content,
  variantId,
  id,
  theme,
  allowSampleData = true,
}: BuildVizSpecInput): InfographicSpec {
  const declared = content.spec as Partial<InfographicSpec> | undefined;
  const kind = (declared?.kind ?? vizKindForVariant(variantId)) as InfographicKind;

  const declaredEncoding =
    declared?.encoding ?? (content.encoding as InfographicSpec["encoding"]) ?? {};
  const authoredRows = (declared?.data?.rows ??
    (content.rows as InfographicSpec["data"]["rows"]) ??
    []) as InfographicSpec["data"]["rows"];

  // A viz module with no data yet (library preview, blank slide, fresh insert)
  // must still draw a real chart — otherwise the card reads as broken.
  const demo = authoredRows.length === 0 && allowSampleData ? sampleDatasetFor(kind) : null;
  const rows = demo ? demo.rows : authoredRows;
  const encoding =
    Object.keys(declaredEncoding).length > 0
      ? declaredEncoding
      : (demo?.encoding ?? declaredEncoding);
  const source = declared?.data?.source ?? (str(content.source) || demo?.source || undefined);
  const columns =
    declared?.data?.columns ??
    (content.columns as Record<string, string> | undefined) ??
    demo?.columns;

  return ensureA11y({
    id,
    kind,
    title: declared?.title ?? str(content.title),
    subtitle: declared?.subtitle ?? str(content.subtitle),
    data: { rows, source, columns },
    encoding,
    theme: declared?.theme ? { ...theme, ...declared.theme } : theme,
    annotations: declared?.annotations ?? (content.annotations as InfographicSpec["annotations"]),
    accessibility: declared?.accessibility ?? { shortAlt: "", longDesc: "" },
    export: declared?.export ?? { preferredFormat: "svg", rasterFallback: true },
  });
}
