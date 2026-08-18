/**
 * SCENE ART KIT — the shared drawing vocabulary for authored background art.
 *
 * `industry-scene-art.ts` owns the palettes, cache and assembly; this module
 * owns the low-level premium-render vocabulary the signature scenes are built
 * from: gradients, depth planes, material shading, rim light, feathered safe
 * zones. Keeping it separate lets the bespoke per-industry signatures live in
 * their own file without a circular import.
 *
 * Everything here is pure and deterministic — screen and export must match.
 */

export const W = 1280;
export const H = 720;

export type SceneKind = string;

export interface ArtSpec {
  kind: string;
  /** Page field the scene is drawn on. */
  surface: string;
  /** Deep tone for volume / far planes. */
  deep: string;
  /** Line + edge tone. */
  ink: string;
  /** Primary accent. */
  a1: string;
  /** Secondary accent. */
  a2: string;
  /** Rare signal accent (alerts, exceptions, quality marks). */
  signal: string;
  dark: boolean;
  /** Mark density, 0.6 sparse → 1.4 dense. */
  density: number;
}

export type SceneTierName = "hero" | "content" | "data" | "flow";

export interface Ctx {
  s: ArtSpec;
  tier: SceneTierName;
  take: number;
  /** 1 = mass on the left third, -1 = mirrored to the right. */
  dir: number;
  /** Global artwork alpha for the tier. */
  k: number;
  r: () => number;
  d: number;
}

/* ─────────────────────────────────────────────────────────────── colour math */

export function a(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(f.slice(0, 2), 16);
  const g = parseInt(f.slice(2, 4), 16);
  const b = parseInt(f.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

function chan(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(f.slice(0, 2), 16),
    parseInt(f.slice(2, 4), 16),
    parseInt(f.slice(4, 6), 16),
  ];
}

/** Blend two hexes; `t` = 0 keeps `from`, 1 keeps `to`. */
export function mix(from: string, to: string, t: number): string {
  const [r1, g1, b1] = chan(from);
  const [r2, g2, b2] = chan(to);
  const q = Math.max(0, Math.min(1, t));
  const h = (v1: number, v2: number) =>
    Math.round(v1 + (v2 - v1) * q).toString(16).padStart(2, "0");
  return `#${h(r1, r2)}${h(g1, g2)}${h(b1, b2)}`;
}

export function shade(hex: string, amount: number): string {
  return amount >= 0 ? mix(hex, "#ffffff", amount) : mix(hex, "#000000", -amount);
}

/** Perceptual luminance, 0 (black) → 1 (white). */
export function lum(hex: string): number {
  const [r, g, b] = chan(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Ink tone that always reads against the page field. Light industries used to
 * wash out because every mark was drawn in a mid tone at low alpha; this pushes
 * the mark tone away from the surface so midtones stay rich.
 */
export function contrastInk(s: ArtSpec): string {
  return s.dark ? shade(s.ink, 0.12) : shade(s.ink, -0.18);
}

/**
 * Contrast lift for light palettes: light sheets get a firmer hand so the art
 * keeps real midtones instead of a pale suggestion.
 */
export function lift(s: ArtSpec): number {
  return s.dark ? 1 : 1.42;
}


/* ───────────────────────────────────────────────────────── gradient builders */

export interface Stop {
  at: number;
  color: string;
}

export function linear(
  id: string,
  stops: Stop[],
  opts: { x1?: string; y1?: string; x2?: string; y2?: string } = {},
): string {
  const { x1 = "0%", y1 = "0%", x2 = "100%", y2 = "0%" } = opts;
  return (
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    stops
      .map((st) => `<stop offset="${(st.at * 100).toFixed(1)}%" stop-color="${st.color}"/>`)
      .join("") +
    `</linearGradient>`
  );
}

export function radial(
  id: string,
  cx: number,
  cy: number,
  r: number,
  stops: Stop[],
): string {
  return (
    `<radialGradient id="${id}" cx="${((cx / W) * 100).toFixed(1)}%" cy="${((cy / H) * 100).toFixed(1)}%" r="${(r * 100).toFixed(1)}%">` +
    stops
      .map((st) => `<stop offset="${(st.at * 100).toFixed(1)}%" stop-color="${st.color}"/>`)
      .join("") +
    `</radialGradient>`
  );
}

/** Unique id helper — ids are scoped per data-URL SVG but per-take is safer. */
export function uid(c: Ctx, name: string): string {
  return `${name}${c.take}${c.tier[0]}`;
}

/* ───────────────────────────────────────────────── atmosphere + depth planes */

/**
 * ATMOSPHERIC BACKPLATE — the far plane every signature scene sits on.
 *
 * Two offset radial washes plus a directional field gradient and a soft corner
 * vignette. This is what gives the art dimensional depth instead of flat vector
 * fill, and it is drawn in SVG (no giant CSS blur fields).
 */
export function atmosphere(
  c: Ctx,
  opts: { warm?: string; cool?: string; focusX?: number; focusY?: number; punch?: number } = {},
): string {
  const { s, k } = c;
  const L = lift(s);
  const punch = (opts.punch ?? 1) * L;
  const fx = opts.focusX ?? (c.dir > 0 ? W * 0.32 : W * 0.68);
  const fy = opts.focusY ?? H * 0.34;
  const warm = opts.warm ?? s.a1;
  const cool = opts.cool ?? s.a2;
  const g1 = uid(c, "atA");
  const g2 = uid(c, "atB");
  const g3 = uid(c, "atC");
  const g4 = uid(c, "atV");
  const defs =
    radial(g1, fx, fy, 0.78, [
      { at: 0, color: a(cool, 0.34 * k * punch) },
      { at: 0.55, color: a(cool, 0.12 * k * punch) },
      { at: 1, color: a(cool, 0) },
    ]) +
    radial(g2, W - fx * 0.7, H * 0.86, 0.72, [
      { at: 0, color: a(warm, 0.28 * k * punch) },
      { at: 1, color: a(warm, 0) },
    ]) +
    linear(
      g3,
      [
        { at: 0, color: a(s.dark ? s.deep : shade(s.surface, -0.06), 0.5 * k) },
        { at: 0.55, color: a(s.dark ? s.deep : s.surface, 0.06 * k) },
        { at: 1, color: a(s.dark ? "#000000" : shade(s.surface, -0.1), 0.34 * k) },
      ],
      { x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
    ) +
    radial(g4, W / 2, H / 2, 0.86, [
      { at: 0, color: a(s.dark ? "#000000" : shade(s.surface, -0.3), 0) },
      { at: 0.72, color: a(s.dark ? "#000000" : shade(s.surface, -0.3), 0.06 * k) },
      { at: 1, color: a(s.dark ? "#000000" : shade(s.surface, -0.3), 0.3 * k) },
    ]);

  return (
    `<defs>${defs}</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#${g3})"/>` +
    `<rect width="${W}" height="${H}" fill="url(#${g1})"/>` +
    `<rect width="${W}" height="${H}" fill="url(#${g2})"/>` +
    `<rect width="${W}" height="${H}" fill="url(#${g4})"/>`
  );
}

/**
 * MATERIAL PLANE — a translucent slab with a graded face and a lit edge.
 * The single most reused depth primitive: glass, stone, acrylic, metal, paper.
 */
export function plane(
  c: Ctx,
  o: {
    id: string;
    points?: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    rx?: number;
    /** 0 = far/faint, 1 = near/solid. */
    depth: number;
    material?: "glass" | "stone" | "metal" | "paper" | "liquid" | "neon";
    tint?: string;
    /** Which side carries the rim highlight. */
    rim?: "left" | "right" | "top" | "none";
    rimColor?: string;
  },
): string {
  const { s, k } = c;
  const L = lift(s);
  const mat = o.material ?? "glass";
  const tint = o.tint ?? (s.dark ? s.deep : mix(s.ink, s.surface, 0.55));
  const base =
    mat === "metal"
      ? 0.42
      : mat === "stone"
        ? 0.4
        : mat === "paper"
          ? 0.3
          : mat === "liquid"
            ? 0.3
            : mat === "neon"
              ? 0.22
              : 0.26;
  const near = 0.5 + o.depth * 0.85;
  const gid = `${o.id}g`;
  const stops: Stop[] =
    mat === "metal"
      ? [
          { at: 0, color: a(shade(tint, 0.24), base * near * k * L) },
          { at: 0.42, color: a(tint, base * 0.7 * near * k * L) },
          { at: 0.58, color: a(shade(tint, 0.3), base * 1.1 * near * k * L) },
          { at: 1, color: a(shade(tint, -0.25), base * near * k * L) },
        ]
      : mat === "stone"
        ? [
            { at: 0, color: a(shade(tint, 0.16), base * near * k * L) },
            { at: 1, color: a(shade(tint, -0.18), base * 1.1 * near * k * L) },
          ]
        : [
            { at: 0, color: a(tint, base * near * k * L) },
            { at: 1, color: a(shade(tint, s.dark ? -0.2 : -0.06), base * 0.55 * near * k * L) },
          ];
  const defs = linear(gid, stops, { x1: "0%", y1: "0%", x2: "40%", y2: "100%" });
  const shapeAttrs = o.points
    ? `points="${o.points}"`
    : `x="${(o.x ?? 0).toFixed(1)}" y="${(o.y ?? 0).toFixed(1)}" width="${(o.w ?? 0).toFixed(1)}" height="${(o.h ?? 0).toFixed(1)}" rx="${o.rx ?? 0}"`;
  const tag = o.points ? "polygon" : "rect";
  const edge = a(contrastInk(s), (0.14 + o.depth * 0.2) * k * L);
  const out = [
    `<defs>${defs}</defs>`,
    `<${tag} ${shapeAttrs} fill="url(#${gid})" stroke="${edge}" stroke-width="${(0.8 + o.depth).toFixed(1)}"/>`,
  ];
  // Rim light on a straight-sided plane.
  if (!o.points && o.rim && o.rim !== "none") {
    const rc = o.rimColor ?? (mat === "metal" ? shade(s.a2, 0.4) : s.a1);
    const x = o.x ?? 0;
    const y = o.y ?? 0;
    const w = o.w ?? 0;
    const h = o.h ?? 0;
    const alpha = (0.4 + o.depth * 0.45) * k * L;
    if (o.rim === "left")
      out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="2.4" height="${h.toFixed(1)}" fill="${a(rc, alpha)}"/>`);
    else if (o.rim === "right")
      out.push(`<rect x="${(x + w - 2.4).toFixed(1)}" y="${y.toFixed(1)}" width="2.4" height="${h.toFixed(1)}" fill="${a(rc, alpha)}"/>`);
    else out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="2.4" fill="${a(rc, alpha)}"/>`);
  }
  return out.join("");
}

/** Soft light bloom — a controlled glow, never a page-wide blur. */
export function bloom(c: Ctx, x: number, y: number, r: number, color: string, strength = 0.5): string {
  const id = uid(c, `bl${Math.round(x)}${Math.round(y)}${Math.round(r)}`);
  return (
    `<defs>${radial(id, x, y, r / W, [
      { at: 0, color: a(color, strength * c.k * lift(c.s)) },
      { at: 0.5, color: a(color, strength * 0.28 * c.k * lift(c.s)) },
      { at: 1, color: a(color, 0) },
    ])}</defs>` +
    `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="url(#${id})"/>`
  );
}

/** A single luminous beam / blade of light. */
export function beam(
  c: Ctx,
  o: { x1: number; y1: number; x2: number; y2: number; width: number; color: string; strength?: number },
): string {
  const id = uid(c, `bm${Math.round(o.x1)}${Math.round(o.y1)}`);
  const st = (o.strength ?? 0.5) * c.k * lift(c.s);
  const defs = linear(
    id,
    [
      { at: 0, color: a(o.color, st) },
      { at: 1, color: a(o.color, 0) },
    ],
    { x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
  );
  const ang = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
  const nx = Math.sin(ang) * (o.width / 2);
  const ny = -Math.cos(ang) * (o.width / 2);
  const pts = [
    `${(o.x1 + nx).toFixed(1)},${(o.y1 + ny).toFixed(1)}`,
    `${(o.x1 - nx).toFixed(1)},${(o.y1 - ny).toFixed(1)}`,
    `${(o.x2 - nx * 2.4).toFixed(1)},${(o.y2 - ny * 2.4).toFixed(1)}`,
    `${(o.x2 + nx * 2.4).toFixed(1)},${(o.y2 + ny * 2.4).toFixed(1)}`,
  ].join(" ");
  return `<defs>${defs}</defs><polygon points="${pts}" fill="url(#${id})"/>`;
}

/** Fine hairline hatch — material texture without raster grain. */
export function hatch(
  c: Ctx,
  o: { x: number; y: number; w: number; h: number; step?: number; color?: string; alpha?: number; angle?: number },
): string {
  const step = o.step ?? 9;
  const col = o.color ?? contrastInk(c.s);
  const al = (o.alpha ?? 0.1) * c.k * lift(c.s);
  const lines: string[] = [];
  const slope = Math.tan(((o.angle ?? 24) * Math.PI) / 180);
  for (let y = o.y - o.w * Math.abs(slope); y < o.y + o.h; y += step) {
    const y2 = y + o.w * slope;
    lines.push(
      `<path d="M${o.x.toFixed(1)} ${y.toFixed(1)} L${(o.x + o.w).toFixed(1)} ${y2.toFixed(1)}"/>`,
    );
  }
  const cid = uid(c, `hc${Math.round(o.x)}${Math.round(o.y)}`);
  return (
    `<defs><clipPath id="${cid}"><rect x="${o.x.toFixed(1)}" y="${o.y.toFixed(1)}" width="${o.w.toFixed(1)}" height="${o.h.toFixed(1)}"/></clipPath></defs>` +
    `<g clip-path="url(#${cid})" stroke="${a(col, al)}" stroke-width="1" fill="none">${lines.join("")}</g>`
  );
}

/**
 * COMPOSITION-AWARE SAFE ZONE.
 *
 * Not an opaque rectangle: an elliptical, feathered field of the page colour
 * placed over the copy third, so the surrounding art keeps its full density and
 * the calm zone has no visible edge. `coverage` is the share of the sheet the
 * calm field spans, `strength` its peak opacity at the copy anchor.
 */
export function safeField(
  c: Ctx,
  id: string,
  o: { strength: number; coverage: number; anchorY?: number; feather?: number },
): string {
  const { s } = c;
  const cover = Math.max(0.34, Math.min(0.8, o.coverage));
  const copyLeft = c.dir < 0; // scene mass sits opposite the copy
  const cx = copyLeft ? W * (cover * 0.5) : W * (1 - cover * 0.5);
  const cy = o.anchorY ?? H * 0.42;
  const gid = `${id}r`;
  const lid = `${id}l`;
  const defs =
    radial(gid, cx, cy, cover * 1.05, [
      { at: 0, color: a(s.surface, o.strength) },
      { at: 0.52, color: a(s.surface, o.strength * 0.82) },
      { at: 0.82, color: a(s.surface, o.strength * 0.3) },
      { at: 1, color: a(s.surface, 0) },
    ]) +
    // A second, wider soft ramp keeps type safety at the outer margin.
    linear(
      lid,
      copyLeft
        ? [
            { at: 0, color: a(s.surface, o.strength * 0.5) },
            { at: 0.5, color: a(s.surface, o.strength * 0.16) },
            { at: 1, color: a(s.surface, 0) },
          ]
        : [
            { at: 0, color: a(s.surface, 0) },
            { at: 0.5, color: a(s.surface, o.strength * 0.16) },
            { at: 1, color: a(s.surface, o.strength * 0.5) },
          ],
      { x1: "0%", y1: "0%", x2: "100%", y2: "0%" },
    );
  return (
    `<defs>${defs}</defs>` +
    `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(W * cover * 0.72).toFixed(0)}" ry="${(H * 0.62).toFixed(0)}" fill="url(#${gid})"/>` +
    `<rect width="${W}" height="${H}" fill="url(#${lid})"/>`
  );
}

/** Smooth polyline through points, as a cubic path (used by every flow scene). */
export function spline(pts: Array<[number, number]>): string {
  if (pts.length < 2) return "";
  const d: string[] = [`M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(
      `C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`,
    );
  }
  return d.join(" ");
}
