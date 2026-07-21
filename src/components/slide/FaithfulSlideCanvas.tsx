// FaithfulSlideCanvas — renders an imported PPTX slide 1:1 using the
// captured layout (see extractSlideLayout in pptx-import.functions.ts).
// Coordinates are inches; we scale the whole thing with a CSS transform so
// the same JSX works for tiny thumbnails and full-fidelity inspect modals.
//
// Perf: the parsed spTree lives in the deck record; on the client we
// additionally cache the *resolved* per-shape styling (frame/border/fill/
// mask/text runs) in a module-level WeakMap keyed by the layout object.
// Thumbnail (320px) + preview (1100px) + lightbox render the exact same
// SlideLayout reference, so the O(shapes) resolution work runs once per
// (layout, theme) tuple and every extra render is just React reconciling
// pre-built style objects.

import { useMemo } from "react";
import type {
  SlideLayout,
  LayoutShape,
  LayoutFrame,
  LayoutFill,
  LayoutRun,
  LayoutPara,
  LayoutSrcRect,
} from "@/lib/pptx-import.functions";


type SlideLayoutWithUrls = SlideLayout & {
  shapes: (LayoutShape & { url?: string; fill?: LayoutFill & { url?: string } })[];
};

// PPTX schemeClr tokens → default web colors. We accept a theme override so
// per-deck accents flow through when available.
const SCHEME_DEFAULTS: Record<string, string> = {
  bg1: "#FFFFFF", tx1: "#0B0B12", bg2: "#F2F2F2", tx2: "#333333",
  accent1: "#003FC7", accent2: "#5A6ACF", accent3: "#8892D0", accent4: "#A1FBF9",
  accent5: "#C2A3FF", accent6: "#FFEB66", dk1: "#0B0B12", dk2: "#03002C",
  lt1: "#FFFFFF", lt2: "#F5F5F5", hlink: "#003FC7", folHlink: "#5A6ACF",
  phClr: "#0B0B12",
};

function resolveColor(c: string | undefined, theme?: Record<string, string>): string | undefined {
  if (!c) return undefined;
  const m = /^var\(--pptx-([\w]+)\)$/.exec(c);
  if (!m) return c;
  const key = m[1];
  return theme?.[key] ?? SCHEME_DEFAULTS[key] ?? "#0B0B12";
}

function fillToCss(fill: LayoutFill | undefined, theme?: Record<string, string>): string | undefined {
  if (!fill) return undefined;
  if (fill.kind === "solid") {
    const base = resolveColor(fill.color, theme);
    if (!base) return undefined;
    if (fill.opacity !== undefined && fill.opacity < 1) return withAlpha(base, fill.opacity);
    return base;
  }
  if (fill.kind === "none") return "transparent";
  if (fill.kind === "gradient") {
    const stops = fill.stops
      .map((s) => {
        const c = resolveColor(s.color, theme) ?? "#000";
        const withA = s.opacity !== undefined && s.opacity < 1 ? withAlpha(c, s.opacity) : c;
        return `${withA} ${(s.pos * 100).toFixed(1)}%`;
      })
      .join(", ");
    // DrawingML angles: 0° goes right; CSS `linear-gradient` 0deg goes up.
    const cssDeg = 90 - fill.angle;
    return `linear-gradient(${cssDeg}deg, ${stops})`;
  }
  return undefined;
}

function withAlpha(color: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (m) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, "0");
    return `#${m[1]}${a}`;
  }
  return color;
}

// PPTX preset-geometry → CSS clip-path / border-radius. Covers the common
// masks used for pictures: roundRect, ellipse, triangle, right-triangle,
// diamond, hexagon, octagon, pentagon, parallelogram, chevron, star.
function prstToMask(prst: string | undefined): { borderRadius?: string; clipPath?: string } {
  if (!prst) return {};
  switch (prst) {
    case "ellipse": return { borderRadius: "50%" };
    case "roundRect": return { borderRadius: "8%" };
    case "round1Rect": return { borderRadius: "8% 8% 0 0" };
    case "round2SameRect": return { borderRadius: "8% 0 0 8%" };
    case "triangle": return { clipPath: "polygon(50% 0, 100% 100%, 0 100%)" };
    case "rtTriangle": return { clipPath: "polygon(0 0, 0 100%, 100% 100%)" };
    case "diamond": return { clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" };
    case "parallelogram": return { clipPath: "polygon(20% 0, 100% 0, 80% 100%, 0 100%)" };
    case "trapezoid": return { clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" };
    case "pentagon": return { clipPath: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)" };
    case "hexagon": return { clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)" };
    case "octagon": return { clipPath: "polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)" };
    case "chevron": return { clipPath: "polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%, 25% 50%)" };
    case "star5": return { clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" };
    default: return {};
  }
}

function frameStyle(frame: LayoutFrame): React.CSSProperties {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${frame.x}in`,
    top: `${frame.y}in`,
    width: `${frame.w}in`,
    height: `${frame.h}in`,
  };
  const transforms: string[] = [];
  if (frame.rot) transforms.push(`rotate(${frame.rot}deg)`);
  if (frame.flipH) transforms.push("scaleX(-1)");
  if (frame.flipV) transforms.push("scaleY(-1)");
  if (transforms.length) style.transform = transforms.join(" ");
  return style;
}

function runStyle(run: LayoutRun, theme?: Record<string, string>): React.CSSProperties {
  return {
    fontWeight: run.bold ? 600 : undefined,
    fontStyle: run.italic ? "italic" : undefined,
    textDecoration: run.underline ? "underline" : undefined,
    fontSize: run.sizePt ? `${run.sizePt}pt` : undefined,
    color: resolveColor(run.color, theme),
    fontFamily: run.font ? `"${run.font}", inherit` : undefined,
  };
}

// ── Resolved-shape cache ───────────────────────────────────────────────
// Every shape's derived style (frame CSS, border string, background,
// mask, resolved fill URL, per-run inline style) is deterministic given
// the immutable `SlideLayout` + `theme`. Compute once and reuse across
// every FaithfulSlideCanvas that mounts against the same layout ref
// (thumbnail card + preview modal + lightbox all share the same object
// coming out of the loader).

type ResolvedRun = { text: string; isBreak: boolean; style: React.CSSProperties };
type ResolvedPara = {
  align: "left" | "center" | "right" | "justify";
  indent: string | undefined;
  bulletChar: boolean;
  anchorJustify: "flex-start" | "center" | "flex-end";
  runs: ResolvedRun[];
};
type ResolvedShape = {
  kind: LayoutShape["kind"];
  base: React.CSSProperties;
  // Optional per-kind extras — all pre-resolved.
  text?: {
    bg?: string;
    border?: string;
    borderRadius?: string;
    clipPath?: string;
    anchorJustify: "flex-start" | "center" | "flex-end";
    fillUrl?: string;
    fillSrcRect?: LayoutSrcRect;
    fillOpacity?: number;
    paras: ResolvedPara[];
  };
  image?: {
    url?: string;
    borderRadius?: string;
    clipPath?: string;
    border?: string;
    srcRect?: LayoutSrcRect;
    opacity?: number;
  };
  line?: {
    stroke: string;
    strokeWidth: number;
    strokeDash?: string;
    hasArrow: boolean;
    viewBox: string;
    x2: number;
    y2: number;
  };
  table?: {
    header: string[];
    rows: string[][];
  };
  placeholderKind?: string;
};

type ResolvedLayout = {
  size: { w: number; h: number };
  backgroundIsImage: boolean;
  bg: string;
  bgImage?: LayoutFill & { url?: string; srcRect?: LayoutSrcRect; opacity?: number };
  shapes: ResolvedShape[];
};

// Two-level cache: WeakMap<layout, Map<themeKey, ResolvedLayout>>. Layout
// is the object identity from server data; themeKey is a stable string of
// the theme entries. Using a Map on the inner level keeps GC clean when
// the layout goes away.
const resolvedLayoutCache: WeakMap<SlideLayoutWithUrls, Map<string, ResolvedLayout>> = new WeakMap();

function themeKey(theme: Record<string, string> | undefined): string {
  if (!theme) return "";
  const keys = Object.keys(theme).sort();
  return keys.map((k) => `${k}:${theme[k]}`).join("|");
}

function resolvePara(para: LayoutPara, theme: Record<string, string> | undefined): ResolvedPara {
  return {
    align:
      para.align === "ctr" ? "center" :
      para.align === "r" ? "right" :
      para.align === "just" ? "justify" : "left",
    indent: para.level ? `${(para.level ?? 0) * 0.25}in` : undefined,
    bulletChar: para.bullet === "char",
    anchorJustify: "flex-start", // set on shape; harmless default here
    runs: para.runs.map((r) => ({
      text: r.text,
      isBreak: r.text === "\n",
      style: runStyle(r, theme),
    })),
  };
}

function resolveShape(
  shape: SlideLayoutWithUrls["shapes"][number],
  theme: Record<string, string> | undefined,
): ResolvedShape {
  const base = frameStyle(shape.frame);

  if (shape.kind === "text") {
    const fillIsImage = shape.fill?.kind === "image";
    const bg = shape.fill && !fillIsImage ? fillToCss(shape.fill, theme) : undefined;
    const border = shape.line?.color
      ? `${(shape.line.widthPt ?? 0.75).toFixed(2)}pt ${shape.line.dashStyle === "dash" ? "dashed" : "solid"} ${resolveColor(shape.line.color, theme)}`
      : undefined;
    const mask = prstToMask(shape.prst);
    const anchor = shape.text.anchor;
    const anchorJustify: "flex-start" | "center" | "flex-end" =
      anchor === "ctr" ? "center" : anchor === "b" ? "flex-end" : "flex-start";
    const fillObj = fillIsImage
      ? (shape.fill as LayoutFill & { url?: string; srcRect?: LayoutSrcRect; opacity?: number })
      : undefined;
    return {
      kind: "text",
      base,
      text: {
        bg,
        border,
        borderRadius: mask.borderRadius,
        clipPath: mask.clipPath,
        anchorJustify,
        fillUrl: fillObj?.url,
        fillSrcRect: fillObj?.srcRect,
        fillOpacity: fillObj?.opacity,
        paras: shape.text.paras.map((p) => resolvePara(p, theme)),
      },
    };
  }

  if (shape.kind === "image") {
    const mask = prstToMask(shape.prst);
    const border = shape.line?.color
      ? `${(shape.line.widthPt ?? 0.75).toFixed(2)}pt ${shape.line.dashStyle === "dash" ? "dashed" : "solid"} ${resolveColor(shape.line.color, theme)}`
      : undefined;
    return {
      kind: "image",
      base,
      image: {
        url: shape.url,
        borderRadius: mask.borderRadius,
        clipPath: mask.clipPath,
        border,
        srcRect: shape.srcRect,
        opacity: shape.opacity,
      },
    };
  }

  if (shape.kind === "line") {
    const stroke = resolveColor(shape.line?.color, theme) ?? "#0B0B12";
    return {
      kind: "line",
      base,
      line: {
        stroke,
        strokeWidth: (shape.line?.widthPt ?? 1) / 72,
        strokeDash:
          shape.line?.dashStyle === "dash" ? "6 4" :
          shape.line?.dashStyle === "dot" ? "2 3" : undefined,
        hasArrow: !!shape.line?.tailArrow,
        viewBox: `0 0 ${shape.frame.w} ${shape.frame.h}`,
        x2: shape.frame.w,
        y2: shape.frame.h,
      },
    };
  }

  if (shape.kind === "table") {
    return {
      kind: "table",
      base,
      table: { header: shape.header, rows: shape.rows },
    };
  }

  return { kind: shape.kind, base, placeholderKind: shape.kind };
}

function resolveLayout(
  layout: SlideLayoutWithUrls,
  theme: Record<string, string> | undefined,
): ResolvedLayout {
  const backgroundIsImage = layout.background?.kind === "image";
  return {
    size: layout.size ?? { w: 13.333, h: 7.5 },
    backgroundIsImage,
    bg: backgroundIsImage ? "#FFFFFF" : (fillToCss(layout.background, theme) ?? "#FFFFFF"),
    bgImage: backgroundIsImage
      ? (layout.background as LayoutFill & { url?: string; srcRect?: LayoutSrcRect; opacity?: number })
      : undefined,
    shapes: (layout.shapes ?? []).map((sh) => resolveShape(sh, theme)),
  };
}

function getResolvedLayout(
  layout: SlideLayoutWithUrls,
  theme: Record<string, string> | undefined,
): ResolvedLayout {
  let inner = resolvedLayoutCache.get(layout);
  if (!inner) {
    inner = new Map();
    resolvedLayoutCache.set(layout, inner);
  }
  const key = themeKey(theme);
  let hit = inner.get(key);
  if (!hit) {
    hit = resolveLayout(layout, theme);
    inner.set(key, hit);
  }
  return hit;
}

// ── Renderers over resolved shapes ─────────────────────────────────────

/** Renders `<img>` inside a `frame`-sized clipped box, honoring a:srcRect
 * crop by scaling the image up so the visible src region fills the frame. */
function CroppedImage({
  url,
  srcRect,
  opacity,
  style,
}: {
  url: string;
  srcRect?: LayoutSrcRect;
  opacity?: number;
  style: React.CSSProperties;
}) {
  if (!srcRect) {
    return <img src={url} alt="" draggable={false} style={{ ...style, objectFit: "cover", opacity }} />;
  }
  const vw = Math.max(0.01, 1 - srcRect.l - srcRect.r);
  const vh = Math.max(0.01, 1 - srcRect.t - srcRect.b);
  const scaleX = 1 / vw;
  const scaleY = 1 / vh;
  const offX = srcRect.l / vw;
  const offY = srcRect.t / vh;
  return (
    <div style={{ ...style, overflow: "hidden" }}>
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          display: "block",
          width: `${scaleX * 100}%`,
          height: `${scaleY * 100}%`,
          marginLeft: `${-offX * 100}%`,
          marginTop: `${-offY * 100}%`,
          objectFit: "fill",
          opacity,
        }}
      />
    </div>
  );
}

function ParaBlock({ para }: { para: ResolvedPara }) {
  return (
    <p style={{ textAlign: para.align, marginLeft: para.indent, margin: 0, marginBottom: "0.06in", lineHeight: 1.2 }}>
      {para.bulletChar && <span style={{ marginRight: "0.08in" }}>•</span>}
      {para.runs.map((r, i) =>
        r.isBreak ? <br key={i} /> : <span key={i} style={r.style}>{r.text}</span>,
      )}
    </p>
  );
}

function ResolvedShapeNode({ shape }: { shape: ResolvedShape }) {
  if (shape.kind === "text" && shape.text) {
    const t = shape.text;
    return (
      <div
        style={{
          ...shape.base,
          background: t.bg,
          border: t.border,
          borderRadius: t.borderRadius,
          clipPath: t.clipPath,
          overflow: "hidden",
        }}
      >
        {t.fillUrl && (
          <CroppedImage
            url={t.fillUrl}
            srcRect={t.fillSrcRect}
            opacity={t.fillOpacity}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        )}
        <div style={{
          position: "relative",
          padding: "0.08in 0.12in",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: t.anchorJustify,
        }}>
          {t.paras.map((p, i) => <ParaBlock key={i} para={p} />)}
        </div>
      </div>
    );
  }

  if (shape.kind === "image" && shape.image) {
    const im = shape.image;
    if (!im.url) {
      return <div style={{ ...shape.base, background: "#E5E7EB", borderRadius: im.borderRadius, clipPath: im.clipPath, border: im.border }} />;
    }
    return (
      <CroppedImage
        url={im.url}
        srcRect={im.srcRect}
        opacity={im.opacity}
        style={{ ...shape.base, borderRadius: im.borderRadius, clipPath: im.clipPath, border: im.border }}
      />
    );
  }

  if (shape.kind === "line" && shape.line) {
    const ln = shape.line;
    return (
      <svg style={{ ...shape.base, overflow: "visible" }} viewBox={ln.viewBox} preserveAspectRatio="none">
        <line
          x1={0} y1={0} x2={ln.x2} y2={ln.y2}
          stroke={ln.stroke}
          strokeWidth={ln.strokeWidth}
          strokeDasharray={ln.strokeDash}
          markerEnd={ln.hasArrow ? "url(#faithful-arrow)" : undefined}
        />
      </svg>
    );
  }

  if (shape.kind === "table" && shape.table) {
    return (
      <div style={{ ...shape.base, overflow: "hidden" }}>
        <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", fontSize: "10pt", color: "#0B0B12" }}>
          {shape.table.header.length > 0 && (
            <thead>
              <tr>
                {shape.table.header.map((h, i) => (
                  <th key={i} style={{ padding: "4px 6px", borderBottom: "1px solid #0B0B12", textAlign: "left", fontWeight: 600, background: "#F5F5F5" }}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {shape.table.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "3px 6px", borderBottom: "1px solid #E5E7EB" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ ...shape.base, background: "#F5F5F5", border: "1px dashed #C4C4C4", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: "9pt" }}>
      {shape.placeholderKind ?? shape.kind}
    </div>
  );
}

/**
 * Render a captured PPTX slide layout at any target width.
 * The internal coordinate space is in inches; we set a fixed inch grid
 * (via CSS `in` units + `transform: scale`) so the result is 1:1 at any
 * container width — thumbnail, card, or full-screen inspect modal.
 */
export function FaithfulSlideCanvas({
  layout,
  width,
  theme,
  className,
}: {
  layout: SlideLayoutWithUrls | undefined;
  /** Rendered width in pixels. Height is derived from the slide aspect ratio. */
  width: number;
  theme?: Record<string, string>;
  className?: string;
}) {
  // Resolve (and cache) all per-shape styling for the given (layout, theme).
  // Different widths reuse the same resolved tree — only the outer scale
  // transform changes, so thumbnail ↔ preview switches are effectively free.
  const resolved = useMemo<ResolvedLayout | undefined>(
    () => (layout ? getResolvedLayout(layout, theme) : undefined),
    [layout, theme],
  );

  const size = resolved?.size ?? { w: 13.333, h: 7.5 };
  const innerPx = size.w * 96;
  const scale = width / innerPx;
  const height = (size.h * 96) * scale;

  return (
    <div
      className={className}
      style={{ width, height, position: "relative", overflow: "hidden", background: resolved?.bg ?? "#FFFFFF" }}
    >
      {resolved?.bgImage?.url && (
        <CroppedImage
          url={resolved.bgImage.url}
          srcRect={resolved.bgImage.srcRect}
          opacity={resolved.bgImage.opacity}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      )}

      <div
        style={{
          width: `${size.w}in`,
          height: `${size.h}in`,
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
        }}
      >
        {(resolved?.shapes ?? []).map((sh, i) => (
          <ResolvedShapeNode key={i} shape={sh} />
        ))}
      </div>
    </div>
  );
}
