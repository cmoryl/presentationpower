// Supplied Illustrator SVG artwork → flat vector shapes we can re-place inside
// the layered PDF/X-4 masters.
//
// Illustrator's SVG export puts every fill and stroke in a <style> block keyed
// by class (.st0 { fill: #fff }), so reading the element attributes alone loses
// the whole colourway. This parser resolves the class rules first, then walks
// the drawable elements in document order.

import { resolveAssetUrl } from "./asset-base-url";

export type MartArtShape = {
  d: string;
  fill: [number, number, number] | null;
  stroke: [number, number, number] | null;
  strokeWidth: number;
  evenOdd: boolean;
};

export type MartArtVector = {
  viewBox: [number, number, number, number];
  shapes: MartArtShape[];
};

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  none: "none",
};

function rgbOf(raw: string | undefined): [number, number, number] | null {
  if (!raw) return null;
  const value = (NAMED[raw.trim().toLowerCase()] ?? raw.trim()).toLowerCase();
  if (value === "none" || value.startsWith("url(")) return null;
  const m = HEX.exec(value);
  if (!m) return null;
  const hex = m[1]!.length === 3 ? m[1]!.split("").map((c) => c + c).join("") : m[1]!;
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

type Decls = Record<string, string>;

function parseDecls(body: string): Decls {
  const out: Decls = {};
  for (const part of body.split(";")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return out;
}

/** Class name → resolved declarations, in cascade order. */
function parseStyleBlock(svg: string): Record<string, Decls> {
  const out: Record<string, Decls> = {};
  for (const block of svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = block[1]!.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const decls = parseDecls(rule[2]!);
      for (const sel of rule[1]!.split(",")) {
        const name = sel.trim().replace(/^\./, "");
        if (!name || name.includes(" ")) continue;
        out[name] = { ...(out[name] ?? {}), ...decls };
      }
    }
  }
  return out;
}

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, "i").exec(tag)?.[1];
}

function num(tag: string, name: string): number | undefined {
  const v = Number(attr(tag, name));
  return Number.isFinite(v) ? v : undefined;
}

/** Merge class rules, a style attribute and presentation attributes. */
function resolve(tag: string, classes: Record<string, Decls>): Decls {
  let decls: Decls = {};
  for (const cls of (attr(tag, "class") ?? "").split(/\s+/).filter(Boolean)) {
    decls = { ...decls, ...(classes[cls] ?? {}) };
  }
  const inline = attr(tag, "style");
  if (inline) decls = { ...decls, ...parseDecls(inline) };
  for (const key of ["fill", "stroke", "stroke-width", "fill-rule"]) {
    const v = attr(tag, key);
    if (v) decls[key] = v;
  }
  return decls;
}

function shapeFrom(tag: string, d: string, classes: Record<string, Decls>): MartArtShape | null {
  if (!d) return null;
  const decls = resolve(tag, classes);
  const fill = decls.fill === undefined ? ([0, 0, 0] as [number, number, number]) : rgbOf(decls.fill);
  const stroke = rgbOf(decls.stroke);
  if (!fill && !stroke) return null;
  const sw = Number(String(decls["stroke-width"] ?? "").replace(/px$/i, ""));
  return {
    d,
    fill,
    stroke,
    strokeWidth: Number.isFinite(sw) && sw > 0 ? sw : stroke ? 1 : 0,
    evenOdd: (decls["fill-rule"] ?? "").toLowerCase() === "evenodd",
  };
}

/** Every drawable shape in the supplied artwork, in paint order. */
export function parseMartArtSvg(svg: string): MartArtVector | null {
  const box = /viewBox\s*=\s*["']([^"']+)["']/i.exec(svg)?.[1] ?? "";
  const nums = box.split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
  if (nums.length !== 4) return null;
  const classes = parseStyleBlock(svg);
  const shapes: MartArtShape[] = [];

  // Document order matters: later shapes paint over earlier ones.
  for (const m of svg.matchAll(/<(path|polygon|polyline|rect|circle|ellipse|line)\b[^>]*>/gi)) {
    const tag = m[0]!;
    const kind = m[1]!.toLowerCase();
    let d = "";
    if (kind === "path") {
      d = attr(tag, "d") ?? "";
    } else if (kind === "polygon" || kind === "polyline") {
      const pts = (attr(tag, "points") ?? "").trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n));
      if (pts.length < 4) continue;
      const parts: string[] = [];
      for (let i = 0; i + 1 < pts.length; i += 2) parts.push(`${i === 0 ? "M" : "L"}${pts[i]} ${pts[i + 1]}`);
      d = kind === "polygon" ? `${parts.join(" ")} Z` : parts.join(" ");
    } else if (kind === "rect") {
      const x = num(tag, "x") ?? 0;
      const y = num(tag, "y") ?? 0;
      const w = num(tag, "width");
      const h = num(tag, "height");
      if (w === undefined || h === undefined) continue;
      d = `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
    } else if (kind === "circle" || kind === "ellipse") {
      const cx = num(tag, "cx") ?? 0;
      const cy = num(tag, "cy") ?? 0;
      const r = num(tag, "r");
      const rx = r ?? num(tag, "rx");
      const ry = r ?? num(tag, "ry");
      if (rx === undefined || ry === undefined) continue;
      d = `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    } else {
      const x1 = num(tag, "x1");
      const y1 = num(tag, "y1");
      const x2 = num(tag, "x2");
      const y2 = num(tag, "y2");
      if ([x1, y1, x2, y2].some((v) => v === undefined)) continue;
      d = `M${x1} ${y1} L${x2} ${y2}`;
    }
    const shape = shapeFrom(tag, d, classes);
    if (shape) shapes.push(shape);
  }

  return shapes.length ? { viewBox: nums as [number, number, number, number], shapes } : null;
}

/** Fetch and parse a supplied artwork master. Returns null when unusable. */
export async function loadMartArtVector(url: string): Promise<MartArtVector | null> {
  if (!url) return null;
  try {
    const res = await fetch(resolveAssetUrl(url));
    if (!res.ok) return null;
    return parseMartArtSvg(await res.text());
  } catch {
    return null;
  }
}
