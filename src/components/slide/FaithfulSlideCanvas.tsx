// FaithfulSlideCanvas — renders an imported PPTX slide 1:1 using the
// captured layout (see extractSlideLayout in pptx-import.functions.ts).
// Coordinates are inches; we scale the whole thing with a CSS transform so
// the same JSX works for tiny thumbnails and full-fidelity inspect modals.
//
// This renderer honors the full PPTX fidelity captured by the parser:
// color transforms (lumMod/lumOff/shade/tint/satMod/alpha), effects
// (outer/inner shadow, glow, soft edges, blur), extended preset geometries,
// custGeom SVG paths, text body insets + autofit + rotation, paragraph
// spacing + hanging indent + real bullet chars, run strike/cap/spc/baseline,
// and richer tables (cell fills, per-side borders).

import { useMemo, useId } from "react";
import type {
  SlideLayout,
  LayoutShape,
  LayoutFrame,
  LayoutFill,
  LayoutLine,
  LayoutRun,
  LayoutPara,
  LayoutTextBody,
  LayoutSrcRect,
  LayoutEffect,
  CustomPath,
  TableCell,
  ParsedChart,
} from "@/lib/pptx-import";
import { applyColorMods } from "@/lib/pptx-import";




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

// Parses `var(--pptx-accent1)?lm=750&lo=250` → { key: "accent1", mods: {...} }
function parseSchemeToken(c: string): { key?: string; mods?: Parameters<typeof applyColorMods>[1]; base?: string } {
  const m = /^(var\(--pptx-([\w]+)\)|#[0-9A-Fa-f]{6})(?:\?(.*))?$/.exec(c);
  if (!m) return { base: c };
  const isVar = m[1].startsWith("var(");
  const suffix = m[3];
  let mods: Parameters<typeof applyColorMods>[1] | undefined;
  if (suffix) {
    const parts = suffix.split("&");
    const parse = (name: string) => {
      const hit = parts.find((p) => p.startsWith(`${name}=`));
      return hit ? Number(hit.slice(name.length + 1)) / 1000 : undefined;
    };
    mods = {
      lumMod: parse("lm"),
      lumOff: parse("lo"),
      shade: parse("sh"),
      tint: parse("tn"),
      satMod: parse("sm"),
      alpha: parse("al"),
    };
    if (!Object.values(mods).some((v) => v !== undefined)) mods = undefined;
  }
  if (isVar) return { key: m[2], mods };
  return { base: m[1], mods };
}

function resolveColor(c: string | undefined, theme?: Record<string, string>): string | undefined {
  if (!c) return undefined;
  const parsed = parseSchemeToken(c);
  let base: string;
  if (parsed.key) base = theme?.[parsed.key] ?? SCHEME_DEFAULTS[parsed.key] ?? "#0B0B12";
  else if (parsed.base) base = parsed.base;
  else return c;
  if (parsed.mods) {
    base = applyColorMods(base, parsed.mods);
    if (parsed.mods.alpha !== undefined && parsed.mods.alpha < 1) return withAlpha(base, parsed.mods.alpha);
  }
  return base;
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
    if (fill.radial) return `radial-gradient(circle at center, ${stops})`;
    // DrawingML angles: 0° goes right; CSS `linear-gradient` 0deg goes up.
    const cssDeg = 90 - fill.angle;
    return `linear-gradient(${cssDeg}deg, ${stops})`;
  }
  if (fill.kind === "pattern") {
    // Approximate a PPTX preset pattern as a two-tone diagonal fallback.
    const fg = resolveColor(fill.fg, theme) ?? "#0B0B12";
    const bg = resolveColor(fill.bg, theme) ?? "#FFFFFF";
    const pct = /pct(\d+)/.exec(fill.preset)?.[1];
    if (pct) {
      const alpha = Math.max(0, Math.min(100, Number(pct))) / 100;
      return `linear-gradient(0deg, ${withAlpha(fg, alpha)}, ${withAlpha(fg, alpha)}), ${bg}`;
    }
    return `repeating-linear-gradient(45deg, ${fg} 0 4px, ${bg} 4px 8px)`;
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

// PPTX preset-geometry → CSS clip-path / border-radius.
// Expanded set: rounded/snip rects, arrows, callouts, plus/cross, bracket
// pair, plaque, cloud, sun, moon, arc, chord — cover the geometry surface
// encountered across most real-world decks.
function prstToMask(prst: string | undefined): { borderRadius?: string; clipPath?: string } {
  if (!prst) return {};
  switch (prst) {
    case "ellipse": return { borderRadius: "50%" };
    case "roundRect": return { borderRadius: "8%" };
    case "round1Rect": return { borderRadius: "8% 8% 0 0" };
    case "round2SameRect": return { borderRadius: "8% 0 0 8%" };
    case "round2DiagRect": return { borderRadius: "8% 0 8% 0" };
    case "snip1Rect": return { clipPath: "polygon(0 0, 92% 0, 100% 8%, 100% 100%, 0 100%)" };
    case "snip2SameRect": return { clipPath: "polygon(8% 0, 92% 0, 100% 8%, 100% 100%, 0 100%, 0 8%)" };
    case "snip2DiagRect": return { clipPath: "polygon(8% 0, 100% 0, 100% 92%, 92% 100%, 0 100%, 0 8%)" };
    case "snipRoundRect": return { borderRadius: "0 8% 0 8%" };
    case "triangle": return { clipPath: "polygon(50% 0, 100% 100%, 0 100%)" };
    case "rtTriangle": return { clipPath: "polygon(0 0, 0 100%, 100% 100%)" };
    case "diamond": return { clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" };
    case "parallelogram": return { clipPath: "polygon(20% 0, 100% 0, 80% 100%, 0 100%)" };
    case "trapezoid": return { clipPath: "polygon(20% 0, 80% 0, 100% 100%, 0 100%)" };
    case "pentagon": return { clipPath: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)" };
    case "hexagon": return { clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)" };
    case "heptagon": return { clipPath: "polygon(50% 0, 90% 20%, 100% 60%, 78% 100%, 22% 100%, 0 60%, 10% 20%)" };
    case "octagon": return { clipPath: "polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)" };
    case "chevron": return { clipPath: "polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%, 25% 50%)" };
    case "star5": return { clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" };
    case "star6": return { clipPath: "polygon(50% 0, 65% 25%, 100% 25%, 82% 50%, 100% 75%, 65% 75%, 50% 100%, 35% 75%, 0 75%, 18% 50%, 0 25%, 35% 25%)" };
    case "star4": return { clipPath: "polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)" };
    case "leftArrow": return { clipPath: "polygon(0 50%, 40% 0, 40% 30%, 100% 30%, 100% 70%, 40% 70%, 40% 100%)" };
    case "rightArrow": return { clipPath: "polygon(100% 50%, 60% 0, 60% 30%, 0 30%, 0 70%, 60% 70%, 60% 100%)" };
    case "upArrow": return { clipPath: "polygon(50% 0, 100% 40%, 70% 40%, 70% 100%, 30% 100%, 30% 40%, 0 40%)" };
    case "downArrow": return { clipPath: "polygon(50% 100%, 100% 60%, 70% 60%, 70% 0, 30% 0, 30% 60%, 0 60%)" };
    case "leftRightArrow": return { clipPath: "polygon(0 50%, 20% 20%, 20% 40%, 80% 40%, 80% 20%, 100% 50%, 80% 80%, 80% 60%, 20% 60%, 20% 80%)" };
    case "upDownArrow": return { clipPath: "polygon(50% 0, 80% 20%, 60% 20%, 60% 80%, 80% 80%, 50% 100%, 20% 80%, 40% 80%, 40% 20%, 20% 20%)" };
    case "notchedRightArrow": return { clipPath: "polygon(0 30%, 60% 30%, 60% 0, 100% 50%, 60% 100%, 60% 70%, 0 70%, 10% 50%)" };
    case "plus": return { clipPath: "polygon(35% 0, 65% 0, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0 65%, 0 35%, 35% 35%)" };
    case "mathPlus": return { clipPath: "polygon(35% 0, 65% 0, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0 65%, 0 35%, 35% 35%)" };
    case "cross": return { clipPath: "polygon(35% 0, 65% 0, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0 65%, 0 35%, 35% 35%)" };
    case "bevel": return { clipPath: "polygon(10% 10%, 90% 10%, 100% 0, 100% 100%, 90% 90%, 10% 90%, 0 100%, 0 0)" };
    case "plaque": return { clipPath: "polygon(0 15%, 15% 0, 85% 0, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0 85%)" };
    case "cloud": return { borderRadius: "50% 40% 45% 50% / 60% 55% 50% 55%" };
    case "sun": return { clipPath: "polygon(50% 0%, 60% 20%, 82% 15%, 78% 38%, 100% 50%, 78% 62%, 82% 85%, 60% 80%, 50% 100%, 40% 80%, 18% 85%, 22% 62%, 0 50%, 22% 38%, 18% 15%, 40% 20%)" };
    case "moon": return { clipPath: "ellipse(50% 50% at 40% 50%)" };
    case "arc": return { borderRadius: "50%" };
    case "chord": return { borderRadius: "50%" };
    case "pie": return { borderRadius: "50%" };
    case "bracketPair": return { clipPath: "polygon(10% 0, 15% 4%, 15% 96%, 10% 100%, 90% 100%, 85% 96%, 85% 4%, 90% 0)" };
    case "leftBracket": return { clipPath: "polygon(0 0, 100% 5%, 20% 5%, 20% 95%, 100% 95%, 0 100%)" };
    case "rightBracket": return { clipPath: "polygon(0 5%, 80% 5%, 80% 95%, 0 95%, 100% 100%, 100% 0)" };
    case "callout1": case "wedgeRectCallout":
      return { borderRadius: "6%" };
    case "cube": return { clipPath: "polygon(0 20%, 20% 0, 100% 0, 100% 80%, 80% 100%, 0 100%)" };
    case "can": return { borderRadius: "50% / 12%" };
    case "rect": default: return {};
  }
}

// PPTX effect → CSS box-shadow / filter chain
function effectToCss(effect: LayoutEffect | undefined, theme?: Record<string, string>): { boxShadow?: string; filter?: string } {
  if (!effect) return {};
  const shadows: string[] = [];
  const filters: string[] = [];
  if (effect.outerShadow) {
    const s = effect.outerShadow;
    const dist = s.distPx ?? 4;
    const dir = ((s.dirDeg ?? 0) * Math.PI) / 180;
    const dx = Math.round(Math.cos(dir) * dist);
    const dy = Math.round(Math.sin(dir) * dist);
    const col = resolveColor(s.color, theme) ?? "#000000";
    const withA = s.opacity !== undefined ? withAlpha(col, s.opacity) : withAlpha(col, 0.4);
    shadows.push(`${dx}px ${dy}px ${Math.round(s.blurPx ?? 8)}px ${withA}`);
  }
  if (effect.innerShadow) {
    const s = effect.innerShadow;
    const dist = s.distPx ?? 4;
    const dir = ((s.dirDeg ?? 0) * Math.PI) / 180;
    const dx = Math.round(Math.cos(dir) * dist);
    const dy = Math.round(Math.sin(dir) * dist);
    const col = resolveColor(s.color, theme) ?? "#000000";
    const withA = s.opacity !== undefined ? withAlpha(col, s.opacity) : withAlpha(col, 0.4);
    shadows.push(`inset ${dx}px ${dy}px ${Math.round(s.blurPx ?? 8)}px ${withA}`);
  }
  if (effect.glow) {
    const col = resolveColor(effect.glow.color, theme) ?? "#FFFFFF";
    const r = Math.max(2, Math.round(effect.glow.radPx));
    shadows.push(`0 0 ${r}px ${withAlpha(col, 0.6)}`);
    shadows.push(`0 0 ${r * 2}px ${withAlpha(col, 0.3)}`);
  }
  if (effect.softEdge) {
    filters.push(`blur(${Math.max(0.5, effect.softEdge.radPx / 2).toFixed(1)}px)`);
  }
  if (effect.blur !== undefined && effect.blur > 0) {
    filters.push(`blur(${effect.blur.toFixed(1)}px)`);
  }
  return {
    boxShadow: shadows.length ? shadows.join(", ") : undefined,
    filter: filters.length ? filters.join(" ") : undefined,
  };
}

function customPathClipId(salt: string, path: CustomPath): string {
  return `pptx-custpath-${salt}-${simpleHash(path.d)}`;
}
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
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
  const s: React.CSSProperties = {
    fontWeight: run.bold ? 700 : undefined,
    fontStyle: run.italic ? "italic" : undefined,
    fontSize: run.sizePt ? `${run.sizePt}pt` : undefined,
    color: resolveColor(run.color, theme),
    fontFamily: run.font ? `"${run.font}", inherit` : undefined,
  };
  const decorations: string[] = [];
  if (run.underline) decorations.push("underline");
  if (run.strike) decorations.push("line-through");
  if (decorations.length) s.textDecoration = decorations.join(" ");
  if (run.cap === "all") s.textTransform = "uppercase";
  else if (run.cap === "small") s.fontVariantCaps = "small-caps";
  if (run.spacingPct !== undefined) s.letterSpacing = `${run.spacingPct}pt`;
  if (run.baselinePct !== undefined && run.baselinePct !== 0) {
    if (run.baselinePct > 0) { s.verticalAlign = "super"; s.fontSize = run.sizePt ? `${run.sizePt * 0.75}pt` : "0.75em"; }
    else { s.verticalAlign = "sub"; s.fontSize = run.sizePt ? `${run.sizePt * 0.75}pt` : "0.75em"; }
  }
  return s;
}

function borderFromLine(line: LayoutLine | undefined, theme?: Record<string, string>): string | undefined {
  if (!line || !line.color) return undefined;
  const w = (line.widthPt ?? 0.75).toFixed(2);
  const dash =
    line.dashStyle === "dash" || line.dashStyle === "sysDash" ? "dashed" :
    line.dashStyle === "dot" || line.dashStyle === "sysDot" ? "dotted" :
    line.dashStyle === "dashDot" ? "dashed" : "solid";
  const col = resolveColor(line.color, theme);
  return `${w}pt ${dash} ${col}`;
}

// ── Resolved-shape cache ───────────────────────────────────────────────

type ResolvedRun = { text: string; isBreak: boolean; style: React.CSSProperties; hlink?: string };
type ResolvedPara = {
  align: "left" | "center" | "right" | "justify";
  marginLeft: string | undefined;
  textIndent: string | undefined;
  bulletChar?: string;
  bulletStyle?: React.CSSProperties;
  spcBefore?: string;
  spcAfter?: string;
  lineHeight?: number | string;
  runs: ResolvedRun[];
};
type ResolvedShape = {
  kind: LayoutShape["kind"];
  base: React.CSSProperties;
  text?: {
    bg?: string;
    border?: string;
    borderRadius?: string;
    clipPath?: string;
    boxShadow?: string;
    filter?: string;
    anchorJustify: "flex-start" | "center" | "flex-end";
    fillUrl?: string;
    fillSrcRect?: LayoutSrcRect;
    fillOpacity?: number;
    insetsCss: string;
    fontScale?: number;
    rotDeg?: number;
    paras: ResolvedPara[];
    customPath?: CustomPath;
  };
  image?: {
    url?: string;
    borderRadius?: string;
    clipPath?: string;
    border?: string;
    boxShadow?: string;
    filter?: string;
    srcRect?: LayoutSrcRect;
    opacity?: number;
    duotone?: [string, string];
    customPath?: CustomPath;
  };
  line?: {
    stroke: string;
    strokeWidth: number;
    strokeDash?: string;
    strokeCap?: "butt" | "round" | "square";
    hasArrow: boolean;
    viewBox: string;
    x2: number;
    y2: number;
  };
  table?: {
    header: string[];
    rows: string[][];
    cellGrid?: TableCell[][];
    colWidthsIn?: number[];
    rowHeightsIn?: number[];
    firstRow?: boolean;
    bandRow?: boolean;
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

const resolvedLayoutCache: WeakMap<SlideLayoutWithUrls, Map<string, ResolvedLayout>> = new WeakMap();

function themeKey(theme: Record<string, string> | undefined): string {
  if (!theme) return "";
  const keys = Object.keys(theme).sort();
  return keys.map((k) => `${k}:${theme[k]}`).join("|");
}

function resolvePara(para: LayoutPara, textBody: LayoutTextBody, theme: Record<string, string> | undefined): ResolvedPara {
  const lineHeight: number | string | undefined = para.lineSpacing
    ? "mult" in para.lineSpacing ? para.lineSpacing.mult : `${para.lineSpacing.pt}pt`
    : undefined;
  const marL = para.marLIn ?? (para.level ? (para.level + 1) * 0.25 : undefined);
  const indent = para.indentIn;
  // hanging indent is negative textIndent (bullet outdents)
  const textIndent = indent !== undefined ? `${indent}in` : undefined;
  const bulletCharDefault = para.bullet === "char" ? (para.bulletChar || "•") : undefined;
  const bulletCharAuto = para.bullet === "auto" ? "1." : undefined;
  return {
    align:
      para.align === "ctr" ? "center" :
      para.align === "r" ? "right" :
      para.align === "just" ? "justify" : "left",
    marginLeft: marL !== undefined ? `${marL}in` : undefined,
    textIndent,
    bulletChar: bulletCharDefault ?? bulletCharAuto,
    bulletStyle: para.bulletColor ? {
      color: resolveColor(para.bulletColor, theme),
      fontFamily: para.bulletFont ? `"${para.bulletFont}", inherit` : undefined,
    } : para.bulletFont ? { fontFamily: `"${para.bulletFont}", inherit` } : undefined,
    spcBefore: para.spcBeforePt !== undefined ? `${para.spcBeforePt}pt` : undefined,
    spcAfter: para.spcAfterPt !== undefined ? `${para.spcAfterPt}pt` : undefined,
    lineHeight,
    runs: para.runs.map((r) => {
      const scaled = textBody.fontScale && r.sizePt ? { ...r, sizePt: r.sizePt * textBody.fontScale } : r;
      return {
        text: r.text,
        isBreak: r.text === "\n",
        style: runStyle(scaled, theme),
        hlink: r.hlink,
      };
    }),
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
    const border = borderFromLine(shape.line, theme);
    const mask = prstToMask(shape.prst);
    const effect = effectToCss(shape.effect, theme);
    const anchor = shape.text.anchor;
    const anchorJustify: "flex-start" | "center" | "flex-end" =
      anchor === "ctr" ? "center" : anchor === "b" ? "flex-end" : "flex-start";
    const fillObj = fillIsImage
      ? (shape.fill as LayoutFill & { url?: string; srcRect?: LayoutSrcRect; opacity?: number })
      : undefined;
    const ins = shape.text.insets ?? { l: 0.1, t: 0.05, r: 0.1, b: 0.05 };
    return {
      kind: "text",
      base,
      text: {
        bg,
        border,
        borderRadius: mask.borderRadius,
        clipPath: mask.clipPath,
        boxShadow: effect.boxShadow,
        filter: effect.filter,
        anchorJustify,
        fillUrl: fillObj?.url,
        fillSrcRect: fillObj?.srcRect,
        fillOpacity: fillObj?.opacity,
        insetsCss: `${ins.t}in ${ins.r}in ${ins.b}in ${ins.l}in`,
        fontScale: shape.text.fontScale,
        rotDeg: shape.text.rotDeg,
        paras: shape.text.paras.map((p) => resolvePara(p, shape.text, theme)),
        customPath: shape.customPath,
      },
    };
  }

  if (shape.kind === "image") {
    const mask = prstToMask(shape.prst);
    const border = borderFromLine(shape.line, theme);
    const effect = effectToCss(shape.effect, theme);
    return {
      kind: "image",
      base,
      image: {
        url: shape.url,
        borderRadius: mask.borderRadius,
        clipPath: mask.clipPath,
        border,
        boxShadow: effect.boxShadow,
        filter: effect.filter,
        srcRect: shape.srcRect,
        opacity: shape.opacity,
        duotone: shape.duotone,
        customPath: shape.customPath,
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
          shape.line?.dashStyle === "dash" || shape.line?.dashStyle === "sysDash" ? "6 4" :
          shape.line?.dashStyle === "dot" || shape.line?.dashStyle === "sysDot" ? "2 3" :
          shape.line?.dashStyle === "dashDot" ? "6 3 2 3" : undefined,
        strokeCap:
          shape.line?.cap === "rnd" ? "round" :
          shape.line?.cap === "sq" ? "square" :
          shape.line?.cap === "flat" ? "butt" : undefined,
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
      table: {
        header: shape.header, rows: shape.rows,
        cellGrid: shape.cellGrid,
        colWidthsIn: shape.colWidthsIn,
        rowHeightsIn: shape.rowHeightsIn,
        firstRow: shape.firstRow,
        bandRow: shape.bandRow,
      },
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

function CroppedImage({
  url, srcRect, opacity, style, duotone,
}: {
  url: string;
  srcRect?: LayoutSrcRect;
  opacity?: number;
  style: React.CSSProperties;
  duotone?: [string, string];
}) {
  // Duotone: cheap approximation — mix-blend-mode over a coloured overlay.
  const duoOverlay = duotone ? (
    <>
      <div style={{ position: "absolute", inset: 0, background: duotone[0], mixBlendMode: "multiply", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: duotone[1], mixBlendMode: "screen", pointerEvents: "none" }} />
    </>
  ) : null;
  if (!srcRect) {
    return (
      <div style={{ ...style, overflow: "hidden", position: "absolute" }}>
        <img src={url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", opacity, display: "block", filter: duotone ? "grayscale(1) contrast(1.1)" : undefined }} />
        {duoOverlay}
      </div>
    );
  }
  const vw = Math.max(0.01, 1 - srcRect.l - srcRect.r);
  const vh = Math.max(0.01, 1 - srcRect.t - srcRect.b);
  const scaleX = 1 / vw;
  const scaleY = 1 / vh;
  const offX = srcRect.l / vw;
  const offY = srcRect.t / vh;
  return (
    <div style={{ ...style, overflow: "hidden", position: style.position ?? "absolute" }}>
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
          filter: duotone ? "grayscale(1) contrast(1.1)" : undefined,
        }}
      />
      {duoOverlay}
    </div>
  );
}

function ParaBlock({ para }: { para: ResolvedPara }) {
  return (
    <p style={{
      textAlign: para.align,
      marginLeft: para.marginLeft,
      textIndent: para.textIndent,
      marginTop: para.spcBefore,
      marginBottom: para.spcAfter ?? "0.06in",
      lineHeight: para.lineHeight ?? 1.2,
    }}>
      {para.bulletChar && <span style={{ marginRight: "0.08in", ...para.bulletStyle }}>{para.bulletChar}</span>}
      {para.runs.map((r, i) => {
        if (r.isBreak) return <br key={i} />;
        if (r.hlink) return <a key={i} href="#" style={{ ...r.style, textDecoration: "underline" }}>{r.text}</a>;
        return <span key={i} style={r.style}>{r.text}</span>;
      })}
    </p>
  );
}

function CustomPathClipDef({ id, path }: { id: string; path: CustomPath }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <clipPath id={id} clipPathUnits="objectBoundingBox">
          <path d={path.d} />
        </clipPath>
      </defs>
    </svg>
  );
}

function TableGrid({ table, theme }: { table: NonNullable<ResolvedShape["table"]>; theme?: Record<string, string> }) {
  // Prefer the rich cellGrid path when available; falls back to plain rows.
  if (!table.cellGrid) {
    return (
      <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", fontSize: "10pt", color: "#0B0B12" }}>
        {table.header.length > 0 && (
          <thead>
            <tr>
              {table.header.map((h, i) => (
                <th key={i} style={{ padding: "4px 6px", borderBottom: "1px solid #0B0B12", textAlign: "left", fontWeight: 600, background: "#F5F5F5" }}>{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "3px 6px", borderBottom: "1px solid #E5E7EB" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  const totalW = (table.colWidthsIn ?? []).reduce((s, w) => s + w, 0);
  return (
    <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", fontSize: "10pt", color: "#0B0B12", tableLayout: "fixed" }}>
      {table.colWidthsIn && totalW > 0 && (
        <colgroup>
          {table.colWidthsIn.map((w, i) => (
            <col key={i} style={{ width: `${(w / totalW * 100).toFixed(2)}%` }} />
          ))}
        </colgroup>
      )}
      <tbody>
        {table.cellGrid.map((row, ri) => {
          const isHeader = ri === 0 && table.firstRow;
          const bandBg = table.bandRow && ri > 0 && ri % 2 === 0 ? "#F5F5F5" : undefined;
          return (
            <tr key={ri} style={{ height: table.rowHeightsIn?.[ri] ? `${table.rowHeightsIn[ri]}in` : undefined }}>
              {row.map((cell, ci) => {
                if (cell.hMerge || cell.vMerge) return null;
                const bg = fillToCss(cell.fill, theme) ?? (isHeader ? "#F5F5F5" : bandBg);
                const bt = borderFromLine(cell.borders?.t, theme);
                const br = borderFromLine(cell.borders?.r, theme);
                const bb = borderFromLine(cell.borders?.b, theme) ?? "1px solid #E5E7EB";
                const bl = borderFromLine(cell.borders?.l, theme);
                const marginsCss = cell.margins ? `${cell.margins.t}in ${cell.margins.r}in ${cell.margins.b}in ${cell.margins.l}in` : "3px 6px";
                const anchor = cell.anchor ?? (isHeader ? "ctr" : "t");
                const vAlign: "top" | "middle" | "bottom" = anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : "top";
                return (
                  <td key={ci}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    style={{
                      padding: marginsCss,
                      background: bg,
                      borderTop: bt, borderRight: br, borderBottom: bb, borderLeft: bl,
                      verticalAlign: vAlign,
                      fontWeight: isHeader ? 600 : undefined,
                    }}
                  >
                    {cell.text.paras.map((p, i) => {
                      const rp = resolvePara(p, cell.text, theme);
                      return <ParaBlock key={i} para={rp} />;
                    })}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ResolvedShapeNode({ shape, salt, theme }: { shape: ResolvedShape; salt: string; theme?: Record<string, string> }) {
  if (shape.kind === "text" && shape.text) {
    const t = shape.text;
    const clipId = t.customPath ? customPathClipId(salt, t.customPath) : undefined;
    return (
      <>
        {t.customPath && clipId && <CustomPathClipDef id={clipId} path={t.customPath} />}
        <div
          style={{
            ...shape.base,
            background: t.bg,
            border: t.border,
            borderRadius: t.borderRadius,
            clipPath: clipId ? `url(#${clipId})` : t.clipPath,
            boxShadow: t.boxShadow,
            filter: t.filter,
            overflow: "hidden",
            transform: [
              (shape.base.transform ?? ""),
              t.rotDeg ? `rotate(${t.rotDeg}deg)` : "",
            ].filter(Boolean).join(" ") || undefined,
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
            padding: t.insetsCss,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: t.anchorJustify,
          }}>
            {t.paras.map((p, i) => <ParaBlock key={i} para={p} />)}
          </div>
        </div>
      </>
    );
  }

  if (shape.kind === "image" && shape.image) {
    const im = shape.image;
    const clipId = im.customPath ? customPathClipId(salt, im.customPath) : undefined;
    if (!im.url) {
      return (
        <>
          {im.customPath && clipId && <CustomPathClipDef id={clipId} path={im.customPath} />}
          <div style={{
            ...shape.base,
            background: "#E5E7EB",
            borderRadius: im.borderRadius,
            clipPath: clipId ? `url(#${clipId})` : im.clipPath,
            border: im.border,
            boxShadow: im.boxShadow,
          }} />
        </>
      );
    }
    return (
      <>
        {im.customPath && clipId && <CustomPathClipDef id={clipId} path={im.customPath} />}
        <CroppedImage
          url={im.url}
          srcRect={im.srcRect}
          opacity={im.opacity}
          duotone={im.duotone}
          style={{
            ...shape.base,
            borderRadius: im.borderRadius,
            clipPath: clipId ? `url(#${clipId})` : im.clipPath,
            border: im.border,
            boxShadow: im.boxShadow,
            filter: im.filter,
          }}
        />
      </>
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
          strokeLinecap={ln.strokeCap}
          markerEnd={ln.hasArrow ? "url(#faithful-arrow)" : undefined}
        />
      </svg>
    );
  }

  if (shape.kind === "table" && shape.table) {
    return (
      <div style={{ ...shape.base, overflow: "hidden" }}>
        <TableGrid table={shape.table} theme={theme} />
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
  const salt = useId().replace(/[^a-zA-Z0-9]/g, "");
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
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <defs>
            <marker id="faithful-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
        </svg>
        {(resolved?.shapes ?? []).map((sh, i) => (
          <ResolvedShapeNode key={i} shape={sh} salt={salt} theme={theme} />
        ))}
      </div>
    </div>
  );
}
