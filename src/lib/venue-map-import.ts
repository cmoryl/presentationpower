// Venue floor import — turns a venue's own vector floor plan (SVG, as exported
// from Illustrator, Canva or a PDF editor) into the same floor record the QEII
// map engine draws, colours and exports. Nothing is redrawn: every path is the
// venue's own geometry with its transforms flattened, and every text element
// becomes a live room label at its drawn position.
//
// What cannot be carried honestly is reported, never faked: a picture-only file
// (a placed scan with no drawn shapes) comes back as kind "artwork" with a
// reason, and elliptical arcs are straightened to their end point and counted.

import type { QeiiFloorVector, QeiiLabel, QeiiShape } from "@/lib/next-london-qeii-vectors";

export type Matrix = [number, number, number, number, number, number];
const I: Matrix = [1, 0, 0, 1, 0, 0];

export function mul(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function parseTransform(src: string | null | undefined): Matrix {
  let m: Matrix = I;
  if (!src) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(src))) {
    const a = hit[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let n: Matrix = I;
    switch (hit[1]) {
      case "matrix":
        if (a.length === 6) n = a as Matrix;
        break;
      case "translate":
        n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        break;
      case "scale":
        n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const r = ((a[0] ?? 0) * Math.PI) / 180;
        const c = Math.cos(r);
        const s = Math.sin(r);
        n = [c, s, -s, c, 0, 0];
        if (a.length >= 3) n = mul(mul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      }
      case "skewX":
        n = [1, 0, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case "skewY":
        n = [1, Math.tan(((a[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
    }
    m = mul(m, n);
  }
  return m;
}

const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Rewrite path data as absolute M/L/C/Q/Z commands with the matrix applied.
 * Arcs are straightened to their end point; the count is returned so the
 * importer can say so.
 */
export function transformPath(d: string, m: Matrix): { d: string; arcs: number; points: [number, number][] } {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out: string[] = [];
  const points: [number, number][] = [];
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let arcs = 0;
  let lastCtrl: [number, number] | null = null;
  let lastQ: [number, number] | null = null;
  const num = () => Number(tokens[i++]);
  const emit = (c: string, pts: [number, number][]) => {
    const t = pts.map(([px, py]) => apply(m, px, py));
    points.push(...t);
    out.push(`${c} ${t.map(([a, b]) => `${r2(a)} ${r2(b)}`).join(" ")}`);
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case "M": {
        x = ox + num();
        y = oy + num();
        sx = x;
        sy = y;
        emit("M", [[x, y]]);
        cmd = rel ? "l" : "L";
        lastCtrl = lastQ = null;
        break;
      }
      case "L":
        x = ox + num();
        y = oy + num();
        emit("L", [[x, y]]);
        lastCtrl = lastQ = null;
        break;
      case "H":
        x = (rel ? x : 0) + num();
        emit("L", [[x, y]]);
        lastCtrl = lastQ = null;
        break;
      case "V":
        y = (rel ? y : 0) + num();
        emit("L", [[x, y]]);
        lastCtrl = lastQ = null;
        break;
      case "C": {
        const c1: [number, number] = [ox + num(), oy + num()];
        const c2: [number, number] = [ox + num(), oy + num()];
        x = ox + num();
        y = oy + num();
        emit("C", [c1, c2, [x, y]]);
        lastCtrl = c2;
        lastQ = null;
        break;
      }
      case "S": {
        const c1: [number, number] = lastCtrl ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
        const c2: [number, number] = [ox + num(), oy + num()];
        x = ox + num();
        y = oy + num();
        emit("C", [c1, c2, [x, y]]);
        lastCtrl = c2;
        lastQ = null;
        break;
      }
      case "Q": {
        const c: [number, number] = [ox + num(), oy + num()];
        x = ox + num();
        y = oy + num();
        emit("Q", [c, [x, y]]);
        lastQ = c;
        lastCtrl = null;
        break;
      }
      case "T": {
        const c: [number, number] = lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
        x = ox + num();
        y = oy + num();
        emit("Q", [c, [x, y]]);
        lastQ = c;
        lastCtrl = null;
        break;
      }
      case "A": {
        i += 5;
        x = ox + num();
        y = oy + num();
        arcs += 1;
        emit("L", [[x, y]]);
        lastCtrl = lastQ = null;
        break;
      }
      case "Z":
        out.push("Z");
        x = sx;
        y = sy;
        lastCtrl = lastQ = null;
        break;
      default:
        i += 1;
    }
  }
  return { d: out.join(" "), arcs, points };
}

type Style = { fill?: string; stroke?: string; strokeWidth?: number; fontSize?: number; anchor?: string; display?: string };

function readDecls(src: string): Style {
  const s: Style = {};
  for (const part of src.split(";")) {
    const [k, v] = part.split(":").map((t) => t?.trim());
    if (!k || v == null) continue;
    if (k === "fill") s.fill = v;
    else if (k === "stroke") s.stroke = v;
    else if (k === "stroke-width") s.strokeWidth = parseFloat(v);
    else if (k === "font-size") s.fontSize = parseFloat(v);
    else if (k === "text-anchor") s.anchor = v;
    else if (k === "display") s.display = v;
  }
  return s;
}

function classRules(doc: Document): Map<string, Style> {
  const rules = new Map<string, Style>();
  for (const el of Array.from(doc.getElementsByTagName("style"))) {
    const css = el.textContent ?? "";
    for (const hit of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const decl = readDecls(hit[2]);
      for (const sel of hit[1].split(",")) {
        const name = sel.trim().replace(/^\./, "");
        if (name && /^[\w-]+$/.test(name)) rules.set(name, { ...rules.get(name), ...decl });
      }
    }
  }
  return rules;
}

const normColour = (c?: string): string | undefined => {
  if (!c || c === "none" || c === "transparent") return undefined;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c.slice(1).split("").map((h) => h + h).join("")}`.toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  const rgb = c.match(/rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
  if (c === "white") return "#ffffff";
  if (c === "black") return "#000000";
  return undefined;
};

function shapeD(el: Element): string | null {
  const n = (a: string) => parseFloat(el.getAttribute(a) ?? "0") || 0;
  switch (el.tagName.toLowerCase()) {
    case "path":
      return el.getAttribute("d");
    case "rect": {
      const [x, y, w, h] = [n("x"), n("y"), n("width"), n("height")];
      return w > 0 && h > 0 ? `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z` : null;
    }
    case "line":
      return `M ${n("x1")} ${n("y1")} L ${n("x2")} ${n("y2")}`;
    case "polygon":
    case "polyline": {
      const p = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number);
      if (p.length < 4) return null;
      let d = `M ${p[0]} ${p[1]}`;
      for (let k = 2; k + 1 < p.length; k += 2) d += ` L ${p[k]} ${p[k + 1]}`;
      return el.tagName.toLowerCase() === "polygon" ? `${d} Z` : d;
    }
    case "circle":
    case "ellipse": {
      const cx = n("cx");
      const cy = n("cy");
      const rx = el.tagName.toLowerCase() === "circle" ? n("r") : n("rx");
      const ry = el.tagName.toLowerCase() === "circle" ? n("r") : n("ry");
      if (!(rx > 0 && ry > 0)) return null;
      const k = 0.5523;
      return `M ${cx + rx} ${cy} C ${cx + rx} ${cy + k * ry} ${cx + k * rx} ${cy + ry} ${cx} ${cy + ry} C ${cx - k * rx} ${cy + ry} ${cx - rx} ${cy + k * ry} ${cx - rx} ${cy} C ${cx - rx} ${cy - k * ry} ${cx - k * rx} ${cy - ry} ${cx} ${cy - ry} C ${cx + k * rx} ${cy - ry} ${cx + rx} ${cy - k * ry} ${cx + rx} ${cy} Z`;
    }
  }
  return null;
}

export type FloorImport = {
  floor: QeiiFloorVector;
  /** Plain-language notes on anything that could not be carried exactly. */
  notes: string[];
};

export type FloorImportMeta = { id: string; marker: string; title: string; page?: number };

const MARGIN = 6;

/** Import one floor from SVG text. Pass a DOMParser outside the browser. */
export function importSvgFloor(
  svg: string,
  meta: FloorImportMeta,
  parser: { parseFromString(s: string, t: string): Document } = new DOMParser(),
): FloorImport {
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) {
    throw new Error("This file isn't a readable SVG. Export the floor plan from Illustrator, Canva or Acrobat as SVG.");
  }
  const rules = classRules(doc);
  const raw: (QeiiShape & { pts: [number, number][] })[] = [];
  const labels: QeiiLabel[] = [];
  let arcs = 0;
  let images = 0;
  let scale = 1;

  const styleOf = (el: Element, inherited: Style): Style => {
    const s: Style = { ...inherited };
    for (const cls of (el.getAttribute("class") ?? "").split(/\s+/)) Object.assign(s, rules.get(cls) ?? {});
    for (const [attr, key] of [
      ["fill", "fill"],
      ["stroke", "stroke"],
      ["text-anchor", "anchor"],
      ["display", "display"],
    ] as const) {
      const v = el.getAttribute(attr);
      if (v) (s as Record<string, unknown>)[key] = v;
    }
    const sw = el.getAttribute("stroke-width");
    if (sw) s.strokeWidth = parseFloat(sw);
    const fs = el.getAttribute("font-size");
    if (fs) s.fontSize = parseFloat(fs);
    Object.assign(s, readDecls(el.getAttribute("style") ?? ""));
    return s;
  };

  const walk = (el: Element, m: Matrix, inherited: Style) => {
    const tag = el.tagName.toLowerCase().replace(/^svg:/, "");
    if (["defs", "clippath", "mask", "style", "title", "desc", "metadata", "symbol", "pattern", "lineargradient", "radialgradient"].includes(tag)) return;
    const s = styleOf(el, inherited);
    if (s.display === "none") return;
    const mm = mul(m, parseTransform(el.getAttribute("transform")));
    if (tag === "image") {
      images += 1;
      return;
    }
    if (tag === "text") {
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!text) return;
      const first = el.querySelector("tspan");
      const x = parseFloat(el.getAttribute("x") ?? first?.getAttribute("x") ?? "0") || 0;
      const y = parseFloat(el.getAttribute("y") ?? first?.getAttribute("y") ?? "0") || 0;
      const size = s.fontSize ?? 12;
      const width = text.length * size * 0.56;
      const left = s.anchor === "middle" ? x - width / 2 : s.anchor === "end" ? x - width : x;
      const [cx, cy] = apply(mm, left + width / 2, y - size * 0.35);
      const k = Math.hypot(mm[0], mm[1]);
      const angle = Math.round((Math.atan2(mm[1], mm[0]) * 180) / Math.PI);
      labels.push({ text, x: cx, y: cy, size: r2(size * k * 0.7), ...(angle ? { angle } : {}) });
      return;
    }
    const d = shapeD(el);
    if (d) {
      const t = transformPath(d, mm);
      arcs += t.arcs;
      const fill = s.fill === undefined ? "#000000" : normColour(s.fill);
      const stroke = normColour(s.stroke);
      const k = Math.hypot(mm[0], mm[1]);
      if ((fill || stroke) && t.points.length) {
        raw.push({
          d: t.d,
          ...(fill ? { fill } : {}),
          ...(stroke ? { stroke, w: r2((s.strokeWidth ?? 1) * k) } : {}),
          pts: t.points,
        });
      }
      return;
    }
    for (const child of Array.from(el.children)) walk(child, mm, s);
  };

  // The viewBox maps to sheet units 1:1; width/height only scale the page.
  walk(root, I, {});
  void scale;

  const notes: string[] = [];
  if (!raw.length) {
    return {
      floor: { id: meta.id, marker: meta.marker, title: meta.title, page: meta.page ?? 1, kind: "artwork", w: 0, h: 0, shapes: [], labels },
      notes: [
        images
          ? "This file only holds a picture of the plan, not drawn walls and rooms, so it can't be rebuilt or coloured. Ask the venue for the vector floor plan (PDF, AI or SVG)."
          : "No drawn shapes were found in this file.",
      ],
    };
  }

  // Crop to the drawing and move it to a small margin, like the QEII sheets.
  const xs = raw.flatMap((s) => s.pts.map((p) => p[0]));
  const ys = raw.flatMap((s) => s.pts.map((p) => p[1]));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const dx = MARGIN - minX;
  const dy = MARGIN - minY;
  const shift: Matrix = [1, 0, 0, 1, dx, dy];
  const shapes: QeiiShape[] = raw.map(({ pts: _p, ...s }) => ({ ...s, d: transformPath(s.d, shift).d }));
  const placed = labels
    .map((l) => ({ ...l, x: r2(l.x + dx), y: r2(l.y + dy) }))
    .filter((l) => l.x >= 0 && l.y >= 0 && l.x <= maxX - minX + MARGIN * 2 && l.y <= maxY - minY + MARGIN * 2);

  if (arcs) notes.push(`${arcs} curved arc${arcs === 1 ? " was" : "s were"} straightened to its end point.`);
  if (images) notes.push(`${images} placed picture${images === 1 ? " was" : "s were"} left out; only drawn shapes are used.`);
  if (!placed.length)
    notes.push("No live room names were found — the text may be outlined. Room names can't be matched to rooms until they're live text.");
  if (labels.length > placed.length) notes.push(`${labels.length - placed.length} text item(s) outside the plan were left out.`);

  return {
    floor: {
      id: meta.id,
      marker: meta.marker,
      title: meta.title,
      page: meta.page ?? 1,
      kind: shapes.length >= 20 ? "vector" : "vector",
      w: r2(maxX - minX + MARGIN * 2),
      h: r2(maxY - minY + MARGIN * 2),
      shapes,
      labels: placed,
    },
    notes,
  };
}

/** Floor ids for non-London events are namespaced so no London room rule ever applies. */
export const eventFloorId = (eventId: string, key: string) => `${eventId}:${key}`;
