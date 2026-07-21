// FaithfulSlideCanvas — renders an imported PPTX slide 1:1 using the
// captured layout (see extractSlideLayout in pptx-import.functions.ts).
// Coordinates are inches; we scale the whole thing with a CSS transform so
// the same JSX works for tiny thumbnails and full-fidelity inspect modals.

import { useMemo } from "react";
import type {
  SlideLayout,
  LayoutShape,
  LayoutFrame,
  LayoutFill,
  LayoutRun,
  LayoutPara,
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
  if (fill.kind === "solid") return resolveColor(fill.color, theme);
  if (fill.kind === "none") return "transparent";
  if (fill.kind === "gradient") {
    const stops = fill.stops
      .map((s) => `${resolveColor(s.color, theme) ?? "#000"} ${(s.pos * 100).toFixed(1)}%`)
      .join(", ");
    // DrawingML angles: 0° goes right; CSS `linear-gradient` 0deg goes up.
    const cssDeg = 90 - fill.angle;
    return `linear-gradient(${cssDeg}deg, ${stops})`;
  }
  return undefined;
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

function ParaBlock({ para, theme }: { para: LayoutPara; theme?: Record<string, string> }) {
  const align =
    para.align === "ctr" ? "center" :
    para.align === "r" ? "right" :
    para.align === "just" ? "justify" : "left";
  const indent = para.level ? `${(para.level ?? 0) * 0.25}in` : undefined;
  return (
    <p style={{ textAlign: align, marginLeft: indent, margin: 0, marginBottom: "0.06in", lineHeight: 1.2 }}>
      {para.bullet === "char" && <span style={{ marginRight: "0.08in" }}>•</span>}
      {para.runs.map((r, i) =>
        r.text === "\n" ? <br key={i} /> : (
          <span key={i} style={runStyle(r, theme)}>{r.text}</span>
        ),
      )}
    </p>
  );
}

function ShapeNode({ shape, theme }: { shape: SlideLayoutWithUrls["shapes"][number]; theme?: Record<string, string> }) {
  const style = frameStyle(shape.frame);

  if (shape.kind === "text") {
    const bg = shape.fill ? fillToCss(shape.fill, theme) : undefined;
    const border = shape.line?.color
      ? `${(shape.line.widthPt ?? 0.75).toFixed(2)}pt ${shape.line.dashStyle === "dash" ? "dashed" : "solid"} ${resolveColor(shape.line.color, theme)}`
      : undefined;
    const isRound = shape.prst === "roundRect" || shape.prst === "ellipse";
    const anchor = shape.text.anchor;
    return (
      <div style={{ ...style, background: bg, border, borderRadius: shape.prst === "ellipse" ? "50%" : isRound ? "0.08in" : 0, overflow: "hidden" }}>
        <div style={{
          padding: "0.08in 0.12in",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: anchor === "ctr" ? "center" : anchor === "b" ? "flex-end" : "flex-start",
        }}>
          {shape.text.paras.map((p, i) => <ParaBlock key={i} para={p} theme={theme} />)}
        </div>
      </div>
    );
  }

  if (shape.kind === "image") {
    const url = shape.url;
    if (!url) return <div style={{ ...style, background: "#E5E7EB" }} />;
    return <img src={url} alt="" style={{ ...style, objectFit: "cover" }} draggable={false} />;
  }

  if (shape.kind === "line") {
    // Render as an SVG line inside the shape's bounding box (with flips baked
    // into the frame transform).
    const stroke = resolveColor(shape.line?.color, theme) ?? "#0B0B12";
    const strokeW = shape.line?.widthPt ?? 1;
    const strokeDash = shape.line?.dashStyle === "dash" ? "6 4" : shape.line?.dashStyle === "dot" ? "2 3" : undefined;
    return (
      <svg style={{ ...style, overflow: "visible" }} viewBox={`0 0 ${shape.frame.w} ${shape.frame.h}`} preserveAspectRatio="none">
        <line
          x1={0} y1={0} x2={shape.frame.w} y2={shape.frame.h}
          stroke={stroke}
          strokeWidth={strokeW / 72}
          strokeDasharray={strokeDash}
          markerEnd={shape.line?.tailArrow ? "url(#faithful-arrow)" : undefined}
        />
      </svg>
    );
  }

  if (shape.kind === "table") {
    return (
      <div style={{ ...style, overflow: "hidden" }}>
        <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", fontSize: "10pt", color: "#0B0B12" }}>
          {shape.header.length > 0 && (
            <thead>
              <tr>
                {shape.header.map((h, i) => (
                  <th key={i} style={{ padding: "4px 6px", borderBottom: "1px solid #0B0B12", textAlign: "left", fontWeight: 600, background: "#F5F5F5" }}>{h}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {shape.rows.map((row, ri) => (
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

  // Chart / diagram placeholder
  return (
    <div style={{ ...style, background: "#F5F5F5", border: "1px dashed #C4C4C4", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: "9pt" }}>
      {shape.kind}
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
  const size = layout?.size ?? { w: 13.333, h: 7.5 };
  // Convert inches → the 96-dpi CSS pixels the browser uses for `in` units.
  const innerPx = size.w * 96;
  const scale = width / innerPx;
  const height = (size.h * 96) * scale;

  const bg = useMemo(() => fillToCss(layout?.background, theme) ?? "#FFFFFF", [layout?.background, theme]);

  return (
    <div
      className={className}
      style={{ width, height, position: "relative", overflow: "hidden", background: bg }}
    >
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
        {(layout?.shapes ?? []).map((sh, i) => (
          <ShapeNode key={i} shape={sh as SlideLayoutWithUrls["shapes"][number]} theme={theme} />
        ))}
      </div>
    </div>
  );
}
