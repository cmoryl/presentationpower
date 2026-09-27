// Native vector artwork for the California kiosk .pdf / .ai.
//
// The earlier builder embedded the whole London page once and cut every piece
// out of it with a clip. In Illustrator that opens as dozens of clip groups,
// each hiding a full copy of the London booth — thousands of invisible paths,
// no usable objects, and a file that takes a minute to open.
//
// This writes the partner's own art as real path objects instead: each path
// from the lifted artwork SVG is transformed into place and written once,
// only where it shows. Pieces and objects become plain groups; nothing hidden
// sits under a mask. Pure functions — no DOM, so they run in tests.

export type Affine = [number, number, number, number, number, number];
export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** SVG-order matrix product: apply `n`, then `m`. */
export function mul(m: Affine, n: Affine): Affine {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}
export const translate = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];
export const scale = (s: number): Affine => [s, 0, 0, s, 0, 0];
export function rotateAbout(deg: number, cx: number, cy: number): Affine {
  if (!deg) return IDENTITY;
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return mul(translate(cx, cy), mul([c, s, -s, c, 0, 0], translate(-cx, -cy)));
}
const apply = (m: Affine, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

type Seg = { op: "M" | "L" | "C" | "Z"; p: number[] };
export type Box = { x0: number; y0: number; x1: number; y1: number };
export type ArtPath = { segs: Seg[]; subs: { segs: Seg[]; box: Box }[]; fill: [number, number, number]; box: Box; clips: number[]; evenOdd: boolean; blend?: string };
export type ArtClip = { segs: Seg[]; box: Box };
export type ArtImage = { href: string; m: Affine; box: Box; clips: number[]; blend?: string };
export type ParsedArt = {
  paths: ArtPath[];
  clips: ArtClip[];
  images: ArtImage[];
  /** Draw order: paths and placed images interleaved as in the source. */
  order: ({ kind: "path"; i: number } | { kind: "image"; i: number })[];
  /** Effects this writer cannot reproduce as live vector (masks, blend modes). */
  unsupported: string[];
};

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;
function tokens(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([MLHVCSQTZmlhvcsqtz])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : Number(m[2]));
  return out;
}
void NUM;

/** Parse path data into absolute M/L/C/Z segments (H/V/S/Q/T resolved). */
export function parsePath(d: string, t: Affine = IDENTITY): Seg[] {
  const tk = tokens(d);
  const segs: Seg[] = [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, qx = 0, qy = 0, prev = "";
  const n = () => tk[i++] as number;
  const push = (op: Seg["op"], pts: number[]) => {
    const p: number[] = [];
    for (let k = 0; k < pts.length; k += 2) p.push(...apply(t, pts[k]!, pts[k + 1]!));
    segs.push({ op, p });
  };
  while (i < tk.length) {
    if (typeof tk[i] === "string") cmd = tk[i++] as string;
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === "Z") { push("Z", []); x = sx; y = sy; prev = "Z"; if (typeof tk[i] !== "string") cmd = ""; continue; }
    if (typeof tk[i] !== "number") { i++; continue; }
    switch (C) {
      case "M": x = ox + n(); y = oy + n(); sx = x; sy = y; push("M", [x, y]); cmd = rel ? "l" : "L"; break;
      case "L": x = ox + n(); y = oy + n(); push("L", [x, y]); break;
      case "H": x = ox + n(); push("L", [x, y]); break;
      case "V": y = (rel ? y : 0) + n(); push("L", [x, y]); break;
      case "C": {
        const x1 = ox + n(), y1 = oy + n(), x2 = ox + n(), y2 = oy + n();
        x = ox + n(); y = oy + n(); cx = x2; cy = y2; push("C", [x1, y1, x2, y2, x, y]); break;
      }
      case "S": {
        const x1 = /[CS]/.test(prev) ? 2 * x - cx : x, y1 = /[CS]/.test(prev) ? 2 * y - cy : y;
        const x2 = ox + n(), y2 = oy + n();
        x = ox + n(); y = oy + n(); cx = x2; cy = y2; push("C", [x1, y1, x2, y2, x, y]); break;
      }
      case "Q": case "T": {
        let x1: number, y1: number;
        if (C === "Q") { x1 = ox + n(); y1 = oy + n(); }
        else { x1 = /[QT]/.test(prev) ? 2 * x - qx : x; y1 = /[QT]/.test(prev) ? 2 * y - qy : y; }
        const ex = ox + n(), ey = oy + n();
        push("C", [x + (2 / 3) * (x1 - x), y + (2 / 3) * (y1 - y), ex + (2 / 3) * (x1 - ex), ey + (2 / 3) * (y1 - ey), ex, ey]);
        qx = x1; qy = y1; x = ex; y = ey; break;
      }
      default: i++; // arcs never appear in lifted PDF art
    }
    prev = C;
  }
  return segs;
}

function boxOf(segs: Seg[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segs) for (let k = 0; k < s.p.length; k += 2) {
    const px = s.p[k]!, py = s.p[k + 1]!;
    if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
  }
  return { x0, y0, x1, y1 };
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
function parseTransform(v: string | undefined): Affine {
  if (!v) return IDENTITY;
  let m = IDENTITY;
  for (const [, fn, args] of v.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const a = args!.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === "matrix") m = mul(m, a as Affine);
    else if (fn === "translate") m = mul(m, translate(a[0] ?? 0, a[1] ?? 0));
    else if (fn === "scale") m = mul(m, [a[0]!, 0, 0, a[1] ?? a[0]!, 0, 0]);
    else if (fn === "rotate") m = mul(m, rotateAbout(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0));
  }
  return m;
}
function hexRgb(v: string | undefined): [number, number, number] | null {
  if (!v || v === "none") return null;
  let h = v.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255) as [number, number, number];
}

/** Read the lifted artwork SVG: every filled path and placed image, in art coordinates, with its clip chain. */
export function parseArtSvg(svg: string): ParsedArt {
  const clipIndex = new Map<string, number>();
  const clips: ArtClip[] = [];
  const unsupported: string[] = [];
  if (/<mask\b/.test(svg)) unsupported.push("mask");
  for (const m of svg.matchAll(/<clipPath\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/clipPath>/g)) {
    const segs: Seg[] = [];
    for (const p of m[2]!.matchAll(/<path\b[^>]*>/g)) segs.push(...parsePath(attr(p[0], "d") ?? "", parseTransform(attr(p[0], "transform"))));
    clipIndex.set(m[1]!, clips.length);
    clips.push({ segs, box: boxOf(segs) });
  }
  // Reusable defs (glyph outlines, images) that <use> points at.
  const defs = new Map<string, string>();
  for (const d of svg.matchAll(/<defs>([\s\S]*?)<\/defs>/g))
    for (const e of d[1]!.matchAll(/<(path|image)\b[^>]*\bid="([^"]+)"[^>]*\/?>/g)) defs.set(e[2]!, e[0]);
  const body = svg.replace(/<defs>[\s\S]*?<\/defs>/g, "");
  const paths: ArtPath[] = [];
  const images: ArtImage[] = [];
  const order: ParsedArt["order"] = [];
  const stack: { clip: number | null; t: Affine; fill?: string; blend?: string }[] = [];
  const blendNow = () => stack[stack.length - 1]?.blend;
  const clipChain = () => stack.map((st) => st.clip).filter((c): c is number => c != null);
  const addPath = (tag: string, t: Affine, fillAttr?: string) => {
    const fill = hexRgb(fillAttr ?? attr(tag, "fill") ?? stack[stack.length - 1]?.fill ?? "#000000");
    if (!fill) return;
    const segs = parsePath(attr(tag, "d") ?? "", mul(t, parseTransform(attr(tag, "transform"))));
    if (!segs.length) return;
    const subs: { segs: Seg[]; box: Box }[] = [];
    for (const sg of segs) {
      if (sg.op === "M" || !subs.length) subs.push({ segs: [], box: { x0: 0, y0: 0, x1: 0, y1: 0 } });
      subs[subs.length - 1]!.segs.push(sg);
    }
    for (const sb of subs) sb.box = boxOf(sb.segs);
    order.push({ kind: "path", i: paths.length });
    paths.push({ segs, subs, fill, box: boxOf(segs), clips: clipChain(), evenOdd: attr(tag, "fill-rule") === "evenodd", blend: blendNow() });
  };
  const addImage = (tag: string, t: Affine) => {
    const href = attr(tag, "xlink:href") ?? attr(tag, "href");
    if (!href?.startsWith("data:image/")) return;
    const x = Number(attr(tag, "x") ?? 0), y = Number(attr(tag, "y") ?? 0);
    const w = Number(attr(tag, "width") ?? 0), h = Number(attr(tag, "height") ?? 0);
    if (!(w > 0 && h > 0)) return;
    const m = mul(mul(t, parseTransform(attr(tag, "transform"))), [w, 0, 0, -h, x, y + h]);
    const pts = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 0, 1), apply(m, 1, 1)];
    const box = { x0: Math.min(...pts.map((p) => p[0])), x1: Math.max(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), y1: Math.max(...pts.map((p) => p[1])) };
    order.push({ kind: "image", i: images.length });
    images.push({ href, m, box, clips: clipChain(), blend: blendNow() });
  };
  for (const m of body.matchAll(/<(\/?)(g|path|image|use)\b([^>]*?)(\/?)>/g)) {
    const [, close, tag, rest, self] = m;
    const r = ` ${rest}`;
    if (tag === "g") {
      if (close) { stack.pop(); continue; }
      const cid = rest!.match(/clip-path="url\(#([^)]+)\)"/)?.[1];
      const parent = stack[stack.length - 1];
      stack.push({ clip: cid != null ? clipIndex.get(cid) ?? null : null, t: mul(parent?.t ?? IDENTITY, parseTransform(attr(r, "transform"))), fill: attr(r, "fill") ?? parent?.fill, blend: rest!.match(/mix-blend-mode:\s*([a-z-]+)/)?.[1] ?? parent?.blend });
      if (self) stack.pop();
      continue;
    }
    if (close) continue;
    const t = stack[stack.length - 1]?.t ?? IDENTITY;
    if (tag === "path") addPath(r, t);
    else if (tag === "image") addImage(r, t);
    else {
      const id = (attr(r, "xlink:href") ?? attr(r, "href") ?? "").replace(/^#/, "");
      const ref = defs.get(id);
      if (!ref) continue;
      const ut = mul(mul(t, parseTransform(attr(r, "transform"))), translate(Number(attr(r, "x") ?? 0), Number(attr(r, "y") ?? 0)));
      if (ref.startsWith("<path")) addPath(` ${ref.slice(5)}`, ut, attr(r, "fill"));
      else addImage(` ${ref.slice(6)}`, ut);
    }
  }
  return { paths, clips, images, order, unsupported };
}

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
export function segsToPdf(segs: Seg[], m: Affine): string {
  const out: string[] = [];
  for (const s of segs) {
    const p: string[] = [];
    for (let k = 0; k < s.p.length; k += 2) { const [x, y] = apply(m, s.p[k]!, s.p[k + 1]!); p.push(f(x), f(y)); }
    out.push(s.op === "M" ? `${p.join(" ")} m` : s.op === "L" ? `${p.join(" ")} l` : s.op === "C" ? `${p.join(" ")} c` : "h");
  }
  return out.join("\n");
}
const rectPdf = (b: Box, m: Affine) => segsToPdf([
  { op: "M", p: [b.x0, b.y0] }, { op: "L", p: [b.x1, b.y0] }, { op: "L", p: [b.x1, b.y1] }, { op: "L", p: [b.x0, b.y1] }, { op: "Z", p: [] },
], m);
const overlaps = (a: Box, b: Box) => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;

/**
 * Draw the art paths that fall inside `region` (art coordinates), mapped by
 * `m` (art → page). `clip` is written first as the group's only mask; `holes`
 * are even-odd cut-outs from it (where separate objects sit).
 */
export function artRegionPdf(art: ParsedArt, region: Box, m: Affine, holes: Box[] = [], imageName?: (i: number) => string, blendGs?: (mode: string) => string): { ops: string; count: number } {
  const out: string[] = ["q", rectPdf(region, m), ...holes.map((h) => rectPdf(h, m)), holes.length ? "W* n" : "W n"];
  let count = 0;
  let open: string | null = null;
  const setClips = (cl: number[]) => {
    const clips = cl.filter((c) => { const cb = art.clips[c]!.box; return !(cb.x0 <= region.x0 && cb.x1 >= region.x1 && cb.y0 <= region.y0 && cb.y1 >= region.y1); });
    if (clips.some((c) => !overlaps(art.clips[c]!.box, region))) return false;
    const key = clips.join(",");
    if (open !== key) {
      if (open !== null) out.push("Q");
      out.push("q", ...clips.map((c) => `${segsToPdf(art.clips[c]!.segs, m)}\nW n`));
      open = key;
    }
    return true;
  };
  for (const o of art.order) {
    if (o.kind === "image") {
      const im = art.images[o.i]!;
      if (!overlaps(im.box, region) || !imageName) continue;
      if (!setClips(im.clips)) continue;
      const k = mul(m, im.m);
      const bl = im.blend && blendGs ? `${blendGs(im.blend)}\n` : "";
      out.push(`q\n${bl}${k.map(f).join(" ")} cm\n/${imageName(o.i)} Do\nQ`);
      count++;
      continue;
    }
    const p = art.paths[o.i]!;
    if (!overlaps(p.box, region)) continue;
    if (holes.some((h) => p.box.x0 >= h.x0 && p.box.x1 <= h.x1 && p.box.y0 >= h.y0 && p.box.y1 <= h.y1)) continue;
    if (!setClips(p.clips)) continue;
    // Only the sub-shapes that show here, so a page-wide pattern isn't
    // written again, whole, under every piece.
    const inside = p.box.x0 >= region.x0 && p.box.x1 <= region.x1 && p.box.y0 >= region.y0 && p.box.y1 <= region.y1;
    const segs = inside ? p.segs : p.subs.filter((sb) => overlaps(sb.box, region)).flatMap((sb) => sb.segs);
    if (!segs.length) continue;
    const bl = p.blend && blendGs;
    if (bl) out.push("q", blendGs(p.blend!));
    out.push(`${p.fill.map(f).join(" ")} rg`, segsToPdf(segs, m), p.evenOdd ? "f*" : "f");
    if (bl) out.push("Q");
    count++;
  }
  if (open !== null) out.push("Q");
  out.push("Q");
  return { ops: out.join("\n"), count };
}

/** A rectangle (optionally with round ends) as a filled PDF path. */
export function roundRectPdf(w: number, h: number, round: boolean, m: Affine): string {
  if (!round) return rectPdf({ x0: 0, y0: 0, x1: w, y1: h }, m);
  const r = Math.min(h / 2, w / 2), k = 0.5523 * r;
  return segsToPdf([
    { op: "M", p: [r, 0] }, { op: "L", p: [w - r, 0] },
    { op: "C", p: [w - r + k, 0, w, r - k, w, r] }, { op: "C", p: [w, r + k, w - r + k, h, w - r, h] },
    { op: "L", p: [r, h] },
    { op: "C", p: [r - k, h, 0, r + k, 0, r] }, { op: "C", p: [0, r - k, r - k, 0, r, 0] },
    { op: "Z", p: [] },
  ], m);
}
