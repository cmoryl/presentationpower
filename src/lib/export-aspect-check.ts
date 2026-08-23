// -----------------------------------------------------------------------------
// Export aspect-ratio preflight
//
// Every export target (PDF page, PPTX slide) has a fixed trim geometry, but the
// pages we capture are live DOM nodes whose height can drift from the intended
// trim — a section that grew past the page box, a custom page size that no
// longer matches the preset, a hero that pushed content taller.
//
// What happens next depends on the exporter:
//  · the PDF writer places each raster across the full page box, so a mismatched
//    node is STRETCHED (type and logos visibly distort);
//  · the PPTX writer letterboxes, so nothing distorts but bands of empty white
//    appear and the page no longer fills the slide.
//
// This module measures the mismatch before either happens and produces a report
// the UI can surface. It is pure geometry: no capture, no DOM mutation, so it is
// cheap enough to run whenever the export menu opens.
// -----------------------------------------------------------------------------

/**
 * Trim ratios used for the "a different page size would fit" hint. Kept local
 * (rather than importing PRINT_PAGE_PRESETS) so the PDF exporter can import this
 * module without a circular dependency.
 */
const TRIM_RATIOS: Record<string, number> = {
  A4: 8.2677 / 11.6929,
  Letter: 8.5 / 11,
  Square: 1,
  HalfLetter: 5.5 / 8.5,
  A5: 5.8268 / 8.2677,
  "Letter landscape": 11 / 8.5,
  "16:9 slide": 16 / 9,
};

/** How the exporter fits a page into its target box. */
export type AspectFit = "stretch" | "letterbox";

export type AspectSeverity = "ok" | "warn" | "error";

export type AspectPageReport = {
  index: number;
  label: string;
  /** Measured width/height of the rendered page node. */
  pageRatio: number;
  /** Intended width/height from the trim geometry. */
  targetRatio: number;
  /** Absolute mismatch as a percentage of the target ratio. */
  deltaPct: number;
  severity: AspectSeverity;
  /**
   * What the export does to the page. `stretch` reports the non-uniform scale
   * PDF placement applies; `letterbox` reports the share of the target box left
   * empty on each axis.
   */
  distortion: { scaleX: number; scaleY: number };
  letterboxPct: { x: number; y: number };
  /** Which way the page is off: taller or wider than the trim. */
  direction: "taller" | "wider" | "match";
  message: string;
};

export type AspectCheckReport = {
  fit: AspectFit;
  target: { widthIn: number; heightIn: number };
  targetRatio: number;
  pages: AspectPageReport[];
  /** Pages at `warn` or `error`. */
  offenders: AspectPageReport[];
  worstDeltaPct: number;
  severity: AspectSeverity;
  /** Trim preset that would fit the measured pages, when one matches better. */
  suggestedPageSize: string | null;
  summary: string;
};

/**
 * Tolerances. A rendered page is laid out in CSS pixels and rounded by the
 * browser, so sub-half-percent drift is noise, not a defect. Past 2% the
 * distortion is visible on straight edges and circular logos.
 */
export const ASPECT_TOLERANCE = { ok: 0.5, warn: 2 } as const;

function severityFor(deltaPct: number): AspectSeverity {
  if (deltaPct <= ASPECT_TOLERANCE.ok) return "ok";
  if (deltaPct <= ASPECT_TOLERANCE.warn) return "warn";
  return "error";
}

function fmtPct(n: number): string {
  return `${n < 10 ? n.toFixed(1) : Math.round(n)}%`;
}

/** Nearest trim preset (by ratio) for a measured page ratio. */
function nearestPreset(ratio: number): { name: string; ratio: number; deltaPct: number } | null {
  let best: { name: string; ratio: number; deltaPct: number } | null = null;
  for (const [name, r] of Object.entries(TRIM_RATIOS)) {
    const delta = (Math.abs(r - ratio) / r) * 100;
    if (!best || delta < best.deltaPct) best = { name, ratio: r, deltaPct: delta };
  }
  return best;
}

/**
 * Measure each page node against the export's trim geometry.
 *
 * `nodes` must already be laid out (mounted, even offscreen) — a node with zero
 * width or height is reported as `error` because nothing can be verified about
 * it and the exporter would fall back to the target ratio blindly.
 */
export function checkExportAspect(
  nodes: HTMLElement[],
  opts: {
    widthIn: number;
    heightIn: number;
    fit?: AspectFit;
    labels?: string[];
    /** Pre-measured sizes, for callers that already have rects (tests, SSR). */
    sizes?: Array<{ width: number; height: number }>;
  },
): AspectCheckReport {
  const fit = opts.fit ?? "letterbox";
  const targetRatio = opts.widthIn / opts.heightIn;
  const pages: AspectPageReport[] = [];

  const count = opts.sizes?.length ?? nodes.length;
  for (let i = 0; i < count; i++) {
    const size = opts.sizes?.[i] ?? measure(nodes[i]);
    const label = opts.labels?.[i] ?? `Page ${i + 1}`;

    if (!size || size.width <= 0 || size.height <= 0) {
      pages.push({
        index: i,
        label,
        pageRatio: 0,
        targetRatio,
        deltaPct: 100,
        severity: "error",
        distortion: { scaleX: 1, scaleY: 1 },
        letterboxPct: { x: 0, y: 0 },
        direction: "match",
        message: `${label} has no measurable size — it cannot be verified and may export blank.`,
      });
      continue;
    }

    const pageRatio = size.width / size.height;
    const deltaPct = (Math.abs(pageRatio - targetRatio) / targetRatio) * 100;
    const severity = severityFor(deltaPct);
    const direction =
      deltaPct <= ASPECT_TOLERANCE.ok ? "match" : pageRatio < targetRatio ? "taller" : "wider";

    // Stretch: the raster is scaled to the box on both axes independently.
    const scaleX = 1;
    const scaleY = pageRatio / targetRatio; // >1 = vertically squashed, <1 = stretched

    // Letterbox: fit inside the box, empty band on the short axis.
    const fitted =
      pageRatio > targetRatio
        ? { w: 1, h: targetRatio / pageRatio }
        : { w: pageRatio / targetRatio, h: 1 };
    const letterboxPct = { x: (1 - fitted.w) * 100, y: (1 - fitted.h) * 100 };

    let message: string;
    if (severity === "ok") {
      message = `${label} matches the page ratio.`;
    } else if (fit === "stretch") {
      const pct = Math.abs(1 - scaleY) * 100;
      message =
        `${label} is ${fmtPct(deltaPct)} off the page ratio (${direction} than the trim) — ` +
        `the PDF would ${scaleY > 1 ? "squash" : "stretch"} it vertically by ${fmtPct(pct)}, ` +
        `distorting type and logos.`;
    } else {
      const band = Math.max(letterboxPct.x, letterboxPct.y);
      message =
        `${label} is ${fmtPct(deltaPct)} off the page ratio (${direction} than the trim) — ` +
        `it will be letterboxed with a ${fmtPct(band)} empty band rather than distorted.`;
    }

    pages.push({
      index: i,
      label,
      pageRatio,
      targetRatio,
      deltaPct,
      severity,
      distortion: { scaleX, scaleY },
      letterboxPct,
      direction,
      message,
    });
  }

  const offenders = pages.filter((p) => p.severity !== "ok");
  const worstDeltaPct = pages.reduce((m, p) => Math.max(m, p.deltaPct), 0);
  const severity: AspectSeverity = offenders.some((p) => p.severity === "error")
    ? "error"
    : offenders.length > 0
      ? "warn"
      : "ok";

  // Only suggest a different trim when EVERY page agrees on a ratio that a
  // preset matches better than the current target — otherwise the fix is the
  // page content, not the page size.
  let suggestedPageSize: string | null = null;
  if (offenders.length > 0 && pages.every((p) => p.pageRatio > 0)) {
    const ratios = pages.map((p) => p.pageRatio);
    const spread = (Math.max(...ratios) - Math.min(...ratios)) / Math.max(...ratios);
    if (spread <= 0.005) {
      const near = nearestPreset(ratios[0]!);
      if (near && near.deltaPct + 0.25 < worstDeltaPct) suggestedPageSize = near.name;
    }
  }

  const summary =
    severity === "ok"
      ? `All ${pages.length} page${pages.length === 1 ? "" : "s"} keep the intended ${opts.widthIn}×${opts.heightIn}in ratio.`
      : `${offenders.length} of ${pages.length} page${pages.length === 1 ? "" : "s"} ` +
        `${offenders.length === 1 ? "does" : "do"} not match the ${opts.widthIn}×${opts.heightIn}in page ratio ` +
        `(worst ${fmtPct(worstDeltaPct)})${suggestedPageSize ? ` — ${suggestedPageSize} would fit these pages` : ""}.`;

  return {
    fit,
    target: { widthIn: opts.widthIn, heightIn: opts.heightIn },
    targetRatio,
    pages,
    offenders,
    worstDeltaPct,
    severity,
    suggestedPageSize,
    summary,
  };
}

function measure(node: HTMLElement | undefined): { width: number; height: number } | null {
  if (!node || typeof node.getBoundingClientRect !== "function") return null;
  const rect = node.getBoundingClientRect();
  // A CSS transform (thumbnail scaling) changes the rect uniformly, so the ratio
  // survives it; offsetWidth is used only when the rect is collapsed.
  if (rect.width > 0 && rect.height > 0) return { width: rect.width, height: rect.height };
  if (node.offsetWidth > 0 && node.offsetHeight > 0)
    return { width: node.offsetWidth, height: node.offsetHeight };
  return null;
}

/** One-line warning for a toast/log, or null when everything is in tolerance. */
export function formatAspectWarning(report: AspectCheckReport): string | null {
  if (report.severity === "ok") return null;
  const worst = [...report.offenders].sort((a, b) => b.deltaPct - a.deltaPct)[0]!;
  return `${report.summary} ${worst.message}`;
}

/** Log the report at the right level; returns the report for chaining. */
export function logAspectReport(scope: string, report: AspectCheckReport): AspectCheckReport {
  const line = `[${scope}] aspect check — ${report.summary}`;
  if (report.severity === "error") console.error(line, report.offenders);
  else if (report.severity === "warn") console.warn(line, report.offenders);
  else console.info(line);
  return report;
}
