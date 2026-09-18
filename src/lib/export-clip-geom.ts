// -----------------------------------------------------------------------------
// CSS clip-path / mask → native PowerPoint custom geometry (`a:custGeom`)
// -----------------------------------------------------------------------------
// PowerPoint DOES have arbitrary shape outlines: `a:custGeom` is what its own
// "Edit Points" editor and "Crop to Shape" command write. A masked photograph is
// simply a `p:pic` whose geometry is a custom path instead of a rectangle.
//
// Until now `export-dom-decompose` refused every clip beyond a straight-edged
// `inset(...)` and parked the element (plus its subtree) on the flat design
// plate: pixel-correct, but nothing selectable. This module closes that gap by
// translating the clip shapes the renderer actually uses — `polygon()`,
// `inset()`, `circle()`, `ellipse()` and `path()` — into a normalised outline in
// 0..1 box space, which is then emitted as real editable geometry.
//
// What deliberately stays flat art: gradient/image masks, feathered or blurred
// edges and blend-mode washes. OOXML has no equivalent, so approximating them
// would ship a hard-edged lie instead of the designed softness.
// -----------------------------------------------------------------------------

/** One outline command in normalised (0..1 of the shape box) coordinates. */
export type ClipCmd =
  | { c: "M"; x: number; y: number }
  | { c: "L"; x: number; y: number }
  | { c: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number };

/** Path space PowerPoint scales to the shape's extents. */
const PATH_SPACE = 100000;

/** Bezier handle length for a quarter circle. */
const KAPPA = 0.5522847498;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

function num(token: string): number | null {
  const n = parseFloat(token);
  return Number.isFinite(n) ? n : null;
}

/** Resolve one CSS length token against an extent, in px. */
function lenPx(token: string, extent: number): number | null {
  const t = token.trim();
  if (!t || /calc|var|env|min\(|max\(|clamp\(/.test(t)) return null;
  if (t.endsWith("%")) {
    const n = num(t.slice(0, -1));
    return n === null ? null : (n / 100) * extent;
  }
  if (t.endsWith("px")) return num(t.slice(0, -2));
  // Unitless 0 is legal; any other unit (em, rem, vw) cannot be resolved here.
  const bare = num(t);
  return bare === 0 ? 0 : null;
}

function splitArgs(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of body) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function rectCmds(l: number, t: number, r: number, b: number): ClipCmd[] {
  return [
    { c: "M", x: l, y: t },
    { c: "L", x: r, y: t },
    { c: "L", x: r, y: b },
    { c: "L", x: l, y: b },
  ];
}

function ellipseCmds(cx: number, cy: number, rx: number, ry: number): ClipCmd[] {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { c: "M", x: cx - rx, y: cy },
    { c: "C", x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
    { c: "C", x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
    { c: "C", x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
    { c: "C", x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
  ];
}

/** `at <x> <y>` position inside circle()/ellipse(), defaulting to the centre. */
function centreOf(tail: string, w: number, h: number): { cx: number; cy: number } | null {
  const at = tail.match(/\bat\s+(.+)$/i);
  if (!at) return { cx: w / 2, cy: h / 2 };
  const parts = at[1].trim().split(/\s+/);
  const keyword = (tok: string, extent: number): number | null => {
    const k = tok.toLowerCase();
    if (k === "center" || k === "centre") return extent / 2;
    if (k === "left" || k === "top") return 0;
    if (k === "right" || k === "bottom") return extent;
    return null;
  };
  const cx = keyword(parts[0] ?? "", w) ?? lenPx(parts[0] ?? "", w);
  const cyTok = parts[1] ?? "center";
  const cy = keyword(cyTok, h) ?? lenPx(cyTok, h);
  if (cx === null || cy === null) return null;
  return { cx, cy };
}

/** SVG `d` subset: M L H V C S Q T Z, absolute and relative. */
export function parseSvgPathCmds(d: string): ClipCmd[] | null {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return null;
  const out: ClipCmd[] = [];
  let i = 0;
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let prevCtrl: { x: number; y: number } | null = null;
  let op = "";
  const nextNum = (): number | null => {
    const t = tokens[i];
    if (t === undefined || /[A-Za-z]/.test(t)) return null;
    i += 1;
    return parseFloat(t);
  };

  while (i < tokens.length) {
    const t = tokens[i];
    if (/[A-Za-z]/.test(t)) {
      op = t;
      i += 1;
      if (op === "Z" || op === "z") {
        x = sx;
        y = sy;
        prevCtrl = null;
        continue;
      }
    }
    if (!op) return null;
    const rel = op === op.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;

    switch (op.toUpperCase()) {
      case "M": {
        const a = nextNum();
        const b = nextNum();
        if (a === null || b === null) return null;
        x = ox + a;
        y = oy + b;
        sx = x;
        sy = y;
        out.push({ c: "M", x, y });
        // Implicit following pairs are line-to.
        op = rel ? "l" : "L";
        prevCtrl = null;
        break;
      }
      case "L": {
        const a = nextNum();
        const b = nextNum();
        if (a === null || b === null) return null;
        x = ox + a;
        y = oy + b;
        out.push({ c: "L", x, y });
        prevCtrl = null;
        break;
      }
      case "H": {
        const a = nextNum();
        if (a === null) return null;
        x = ox + a;
        out.push({ c: "L", x, y });
        prevCtrl = null;
        break;
      }
      case "V": {
        const a = nextNum();
        if (a === null) return null;
        y = oy + a;
        out.push({ c: "L", x, y });
        prevCtrl = null;
        break;
      }
      case "C": {
        const v = [nextNum(), nextNum(), nextNum(), nextNum(), nextNum(), nextNum()];
        if (v.some((n) => n === null)) return null;
        const [a, b, c, dd, e, f] = v as number[];
        const x1 = ox + a;
        const y1 = oy + b;
        const x2 = ox + c;
        const y2 = oy + dd;
        x = ox + e;
        y = oy + f;
        out.push({ c: "C", x1, y1, x2, y2, x, y });
        prevCtrl = { x: x2, y: y2 };
        break;
      }
      case "S": {
        const v = [nextNum(), nextNum(), nextNum(), nextNum()];
        if (v.some((n) => n === null)) return null;
        const [c, dd, e, f] = v as number[];
        const x1 = prevCtrl ? 2 * x - prevCtrl.x : x;
        const y1 = prevCtrl ? 2 * y - prevCtrl.y : y;
        const x2 = ox + c;
        const y2 = oy + dd;
        x = ox + e;
        y = oy + f;
        out.push({ c: "C", x1, y1, x2, y2, x, y });
        prevCtrl = { x: x2, y: y2 };
        break;
      }
      case "Q":
      case "T": {
        let qx: number;
        let qy: number;
        if (op.toUpperCase() === "Q") {
          const a = nextNum();
          const b = nextNum();
          if (a === null || b === null) return null;
          qx = ox + a;
          qy = oy + b;
        } else {
          qx = prevCtrl ? 2 * x - prevCtrl.x : x;
          qy = prevCtrl ? 2 * y - prevCtrl.y : y;
        }
        const e = nextNum();
        const f = nextNum();
        if (e === null || f === null) return null;
        const ex = ox + e;
        const ey = oy + f;
        // Quadratic → cubic: control points at 1/3 and 2/3.
        out.push({
          c: "C",
          x1: x + (2 / 3) * (qx - x),
          y1: y + (2 / 3) * (qy - y),
          x2: ex + (2 / 3) * (qx - ex),
          y2: ey + (2 / 3) * (qy - ey),
          x: ex,
          y: ey,
        });
        prevCtrl = { x: qx, y: qy };
        x = ex;
        y = ey;
        break;
      }
      default:
        // Arcs (A/a) would need flattening; refuse rather than guess.
        return null;
    }
  }
  return out.length >= 2 ? out : null;
}

/**
 * Translate a computed `clip-path` value into a normalised outline.
 *
 * Returns null when the clip is not a shape PowerPoint can hold (gradient or
 * image mask, `url(#…)` reference, arcs, unresolvable units) — the caller then
 * keeps that element on the flat design plate, which is the honest outcome.
 */
export function parseClipOutline(
  clip: string | null | undefined,
  boxW: number,
  boxH: number,
): ClipCmd[] | null {
  const raw = (clip ?? "").trim();
  if (!raw || raw === "none" || boxW <= 0 || boxH <= 0) return null;
  // A reference to an SVG clipPath, a mask image or a box keyword carries no
  // geometry we can read here.
  if (/^url\(/i.test(raw)) return null;

  const fn = raw.match(/^([a-z-]+)\((([\s\S])*)\)\s*(?:border-box|padding-box|content-box)?$/i);
  if (!fn) return null;
  const name = fn[1].toLowerCase();
  const body = fn[2];

  let px: ClipCmd[] | null = null;

  if (name === "polygon") {
    const args = splitArgs(body).filter((a) => !/^\s*(nonzero|evenodd)\s*$/i.test(a));
    const pts: ClipCmd[] = [];
    for (const arg of args) {
      const parts = arg.trim().split(/\s+/);
      if (parts.length < 2) return null;
      const cx = lenPx(parts[0], boxW);
      const cy = lenPx(parts[1], boxH);
      if (cx === null || cy === null) return null;
      pts.push({ c: pts.length === 0 ? "M" : "L", x: cx, y: cy });
    }
    if (pts.length < 3) return null;
    px = pts;
  } else if (name === "inset") {
    // `round <radius>` is dropped on purpose: the corner radius already travels
    // as the shape's own rounded geometry.
    const tokens = body.replace(/\bround\b[\s\S]*$/i, "").trim().split(/\s+/);
    const t = lenPx(tokens[0] ?? "0", boxH);
    const r = lenPx(tokens[1] ?? tokens[0] ?? "0", boxW);
    const b = lenPx(tokens[2] ?? tokens[0] ?? "0", boxH);
    const l = lenPx(tokens[3] ?? tokens[1] ?? tokens[0] ?? "0", boxW);
    if (t === null || r === null || b === null || l === null) return null;
    px = rectCmds(l, t, boxW - r, boxH - b);
  } else if (name === "circle") {
    const head = body.replace(/\bat\b[\s\S]*$/i, "").trim();
    // Percentage radii reference the box diagonal, per the CSS spec.
    const ref = Math.sqrt((boxW * boxW + boxH * boxH) / 2);
    const r = head ? lenPx(head, ref) : Math.min(boxW, boxH) / 2;
    const c = centreOf(body, boxW, boxH);
    if (r === null || r <= 0 || !c) return null;
    px = ellipseCmds(c.cx, c.cy, r, r);
  } else if (name === "ellipse") {
    const head = body.replace(/\bat\b[\s\S]*$/i, "").trim();
    const parts = head ? head.split(/\s+/) : [];
    const rx = parts[0] ? lenPx(parts[0], boxW) : boxW / 2;
    const ry = parts[1] ? lenPx(parts[1], boxH) : boxH / 2;
    const c = centreOf(body, boxW, boxH);
    if (rx === null || ry === null || rx <= 0 || ry <= 0 || !c) return null;
    px = ellipseCmds(c.cx, c.cy, rx, ry);
  } else if (name === "path") {
    const d = body.trim().replace(/^["']|["']$/g, "");
    px = parseSvgPathCmds(d);
  } else {
    return null;
  }

  if (!px) return null;
  // Normalise into 0..1 box space and clamp: a clip that reaches outside its own
  // box is already invisible on screen.
  const norm = px.map((cmd) =>
    cmd.c === "C"
      ? {
          c: "C" as const,
          x1: clamp01(cmd.x1 / boxW),
          y1: clamp01(cmd.y1 / boxH),
          x2: clamp01(cmd.x2 / boxW),
          y2: clamp01(cmd.y2 / boxH),
          x: clamp01(cmd.x / boxW),
          y: clamp01(cmd.y / boxH),
        }
      : { c: cmd.c, x: clamp01(cmd.x / boxW), y: clamp01(cmd.y / boxH) },
  );
  // A degenerate outline (all points collapsed) would export as an invisible
  // object; keep such an element plated instead.
  const xs = norm.map((c) => c.x);
  const ys = norm.map((c) => c.y);
  if (Math.max(...xs) - Math.min(...xs) < 0.01 && Math.max(...ys) - Math.min(...ys) < 0.01) {
    return null;
  }
  return norm;
}

// -----------------------------------------------------------------------------
// Object-name tag: `[cg:<commands>]`
//
// The outline travels on the shape's objectName, the same side channel the
// gradient / crop / rounded-picture passes already use, because pptxgenjs has no
// custom-geometry API. `withCustomGeometry` consumes and strips it.
// -----------------------------------------------------------------------------

export const CLIP_GEOM_TAG_RE = /\[cg:([^\]]*)\]\s*/;

/** Encoded outlines longer than this are refused — see `clipGeomTag`. */
const MAX_TAG_LEN = 1400;

const p = (n: number) => Math.round(clamp01(n) * PATH_SPACE);

/** Encode an outline for the object name, or null when it is too large to carry. */
export function clipGeomTag(cmds: ClipCmd[]): string | null {
  const body = cmds
    .map((c) =>
      c.c === "C"
        ? `C${p(c.x1)},${p(c.y1)},${p(c.x2)},${p(c.y2)},${p(c.x)},${p(c.y)}`
        : `${c.c}${p(c.x)},${p(c.y)}`,
    )
    .join("");
  const tag = `[cg:${body}]`;
  return tag.length > MAX_TAG_LEN ? null : tag;
}

export function stripClipGeomTag(name: string): string {
  return name.replace(CLIP_GEOM_TAG_RE, "").trim();
}

/** Decode a `[cg:…]` tag body back into path-space commands (0..100000). */
export function parseClipGeomTag(name: string): ClipCmd[] | null {
  const m = CLIP_GEOM_TAG_RE.exec(name);
  if (!m) return null;
  const parts = m[1].match(/[MLC][\d,]+/g);
  if (!parts) return null;
  const out: ClipCmd[] = [];
  for (const part of parts) {
    const kind = part[0];
    const nums = part
      .slice(1)
      .split(",")
      .map((n) => Number(n));
    if (nums.some((n) => !Number.isFinite(n))) return null;
    if (kind === "C") {
      if (nums.length !== 6) return null;
      out.push({ c: "C", x1: nums[0], y1: nums[1], x2: nums[2], y2: nums[3], x: nums[4], y: nums[5] });
    } else {
      if (nums.length !== 2) return null;
      out.push({ c: kind === "M" ? "M" : "L", x: nums[0], y: nums[1] });
    }
  }
  return out.length >= 2 && out[0].c === "M" ? out : null;
}

/**
 * The `a:custGeom` element for an outline, in PowerPoint's own path space.
 *
 * `w`/`h` on `a:path` are the path's coordinate space, which PowerPoint scales
 * to the shape's extents — so one geometry serves any size the user drags the
 * object to, and "Edit Points" opens on the real outline.
 */
export function custGeomXml(cmds: ClipCmd[]): string {
  const moves = cmds
    .map((c) => {
      const pt = (x: number, y: number) =>
        `<a:pt x="${Math.round(x)}" y="${Math.round(y)}"/>`;
      if (c.c === "M") return `<a:moveTo>${pt(c.x, c.y)}</a:moveTo>`;
      if (c.c === "L") return `<a:lnTo>${pt(c.x, c.y)}</a:lnTo>`;
      return `<a:cubicBezTo>${pt(c.x1, c.y1)}${pt(c.x2, c.y2)}${pt(c.x, c.y)}</a:cubicBezTo>`;
    })
    .join("");
  return (
    "<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>" +
    `<a:rect l="0" t="0" r="r" b="b"/>` +
    `<a:pathLst><a:path w="${PATH_SPACE}" h="${PATH_SPACE}">${moves}<a:close/></a:path></a:pathLst>` +
    "</a:custGeom>"
  );
}

// -----------------------------------------------------------------------------
// Containment test — is a descendant safe to export UNCLIPPED?
//
// On screen a clip applies to the whole subtree; PowerPoint has no clipping
// container. A descendant that sits wholly INSIDE its ancestor's outline is
// unaffected by the mask and ships as an ordinary editable object. One that
// crosses the outline would visibly overflow, so the caller keeps it on the flat
// plate rather than exporting a shape that spills past the designed edge.
// -----------------------------------------------------------------------------

export interface ClipContextBox {
  cmds: ClipCmd[];
  /** Stage px. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Flatten an outline to a polygon in stage px (beziers sampled). */
export function flattenOutline(ctx: ClipContextBox, steps = 8): Array<[number, number]> {
  const px = (nx: number, ny: number): [number, number] => [ctx.x + nx * ctx.w, ctx.y + ny * ctx.h];
  const pts: Array<[number, number]> = [];
  let cur: [number, number] = [0, 0];
  for (const c of ctx.cmds) {
    if (c.c === "C") {
      const p0 = cur;
      const p1 = px(c.x1, c.y1);
      const p2 = px(c.x2, c.y2);
      const p3 = px(c.x, c.y);
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const mt = 1 - t;
        pts.push([
          mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
          mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1],
        ]);
      }
      cur = p3;
      continue;
    }
    cur = px(c.x, c.y);
    pts.push(cur);
  }
  return pts;
}

function pointInPolygon(poly: Array<[number, number]>, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function segmentsCross(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): boolean {
  const s = (p: [number, number], q: [number, number], r: [number, number]) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return s(a, b, c) !== s(a, b, d) && s(c, d, a) !== s(c, d, b);
}

/** True when `rect` lies wholly inside the outline (edges included). */
export function outlineContainsRect(ctx: ClipContextBox, rect: StageRect, pad = 0.5): boolean {
  const poly = flattenOutline(ctx);
  if (poly.length < 3) return false;
  const l = rect.x + pad;
  const t = rect.y + pad;
  const r = rect.x + rect.w - pad;
  const b = rect.y + rect.h - pad;
  const corners: Array<[number, number]> = [
    [l, t],
    [r, t],
    [r, b],
    [l, b],
  ];
  for (const [cx, cy] of corners) {
    if (!pointInPolygon(poly, cx, cy)) return false;
  }
  // Concave outlines (notches, chevrons) can cut through a rectangle whose
  // corners are all inside, so every edge pair is checked too.
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    for (let k = 0; k < 4; k += 1) {
      if (segmentsCross(poly[j], poly[i], corners[k], corners[(k + 1) % 4])) return false;
    }
  }
  return true;
}
