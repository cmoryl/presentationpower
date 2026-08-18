/**
 * INDUSTRY SIGNATURE SCENES — one bespoke composition per R-code.
 *
 * The first authoring pass shared 16 base generators across 30 industries, so
 * whole clusters (R01/R11/R20/R25, R02/R07/R16, R04/R17/R29 …) read as "same
 * scene grammar, different colour". This module gives every R-code its own
 * SIGNATURE SCENE GRAMMAR: a distinct silhouette that identifies the sector at
 * thumbnail size even in grayscale.
 *
 * Scenes may share low-level helpers from `scene-art-kit.ts` (planes, beams,
 * atmosphere, splines) — what must not repeat is the composition: focal
 * position, depth stack, dominant form and the way the calm reading field is
 * carved out of the art.
 *
 * DATA and FLOW are not universal overlays either: each signature family gets
 * its own treatment (transaction pulses, clinical evidence bands, production
 * telemetry, network propagation, routing lanes, people pathways …).
 */

import {
  H,
  W,
  a,
  atmosphere,
  beam,
  bloom,
  contrastInk,
  hatch,
  lift,
  linear,
  mix,
  plane,
  radial,
  shade,
  spline,
  uid,
  type Ctx,
} from "./scene-art-kit";

/* ─────────────────────────────────────────────────────────── local helpers */

/** Ground shadow under a mass, so forms sit in space instead of floating. */
function ground(c: Ctx, x: number, y: number, w: number, h = 26): string {
  const id = uid(c, `gs${Math.round(x)}${Math.round(y)}`);
  return (
    `<defs>${radial(id, x, y, (w / W) * 0.6, [
      { at: 0, color: a(c.s.dark ? "#000000" : shade(c.s.ink, -0.2), 0.34 * c.k) },
      { at: 1, color: a(c.s.dark ? "#000000" : shade(c.s.ink, -0.2), 0) },
    ])}</defs>` +
    `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(w / 2).toFixed(0)}" ry="${h}" fill="url(#${id})"/>`
  );
}

/** Perspective floor: converging rays plus compressed depth rules. */
function floor(c: Ctx, vpx: number, vpy: number, rays = 15, alpha = 0.13): string {
  const { s, k } = c;
  const L = lift(s);
  const out: string[] = [];
  for (let i = 0; i <= rays; i += 1) {
    const x = (i / rays) * W;
    out.push(
      `<path d="M${x.toFixed(0)} ${H} L${vpx.toFixed(0)} ${vpy.toFixed(0)}" stroke="${a(contrastInk(s), alpha * k * L)}" stroke-width="1"/>`,
    );
  }
  for (let i = 1; i <= 6; i += 1) {
    const y = vpy + (H - vpy) * Math.pow(i / 7, 2.1);
    out.push(
      `<path d="M0 ${y.toFixed(1)} H${W}" stroke="${a(contrastInk(s), alpha * 0.7 * k * L)}" stroke-width="1"/>`,
    );
  }
  return out.join("");
}

/** Stroked path with a soft outer halo — the "lit line" primitive. */
function litPath(c: Ctx, d: string, color: string, width: number, strength = 0.55): string {
  const L = lift(c.s);
  return (
    `<path d="${d}" fill="none" stroke="${a(color, strength * 0.24 * c.k * L)}" stroke-width="${(width * 4).toFixed(1)}" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${a(color, strength * c.k * L)}" stroke-width="${width.toFixed(1)}" stroke-linecap="round"/>`
  );
}

function node(c: Ctx, x: number, y: number, r: number, color: string, filled = true): string {
  const L = lift(c.s);
  return (
    `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${filled ? a(color, 0.32 * c.k * L) : a(c.s.surface, 0.5 * c.k)}" stroke="${a(color, 0.75 * c.k * L)}" stroke-width="1.6"/>`
  );
}

/* ══════════════════════════════════════════════ ARCHITECTURE-FAMILY SIGNATURES
 * R01 atrium · R11 decision architecture · R20 sculptural stone · R25 massing
 * Grayscale test: R01 = tall converging glass fins; R11 = intersecting diagonal
 * pathways on a low horizon; R20 = arch + plinth silhouette; R25 = orthographic
 * plan grid with extruded blocks.
 */

/** R01 CORPORATE — luminous glass executive atrium, monumental open space. */
function atrium(c: Ctx): string {
  const { s, k } = c;
  const vpx = c.dir > 0 ? W * 0.34 : W * 0.66;
  const out = [atmosphere(c, { focusX: vpx, focusY: H * 0.3, punch: 1.1 })];
  out.push(floor(c, vpx, H * 0.46, 17, 0.12));
  // Skylight shafts from above the vanishing point.
  for (let i = 0; i < 3; i += 1) {
    out.push(
      beam(c, {
        x1: vpx + (i - 1) * 90,
        y1: -30,
        x2: vpx + (i - 1) * 320,
        y2: H * 0.72,
        width: 120,
        color: s.a2,
        strength: 0.34 - i * 0.07,
      }),
    );
  }
  // Glass fins stepping into depth on the mass side.
  const fins = 5;
  for (let i = 0; i < fins; i += 1) {
    const depth = 1 - i / fins;
    const w = 132 - i * 18;
    const x = c.dir > 0 ? 44 + i * (w * 0.78) : W - 44 - i * (w * 0.78) - w;
    const top = 62 + i * 46;
    const bot = H - 74 - i * 30;
    out.push(
      plane(c, {
        id: uid(c, `at${i}`),
        x,
        y: top,
        w,
        h: bot - top,
        depth,
        material: "glass",
        rim: c.dir > 0 ? "right" : "left",
        rimColor: s.a1,
      }),
    );
    for (let m = 1; m < 4; m += 1) {
      const mx = x + (w / 4) * m;
      out.push(
        `<path d="M${mx.toFixed(1)} ${top} V${bot}" stroke="${a(contrastInk(s), 0.12 * k * lift(s))}" stroke-width="1"/>`,
      );
    }
    out.push(ground(c, x + w / 2, bot + 6, w * 1.5, 14));
  }
  // Cobalt blade — the single monumental gesture.
  const bx = c.dir > 0 ? W * 0.58 : W * 0.42;
  out.push(
    `<rect x="${bx.toFixed(0)}" y="40" width="7" height="${H - 150}" fill="${a(s.a1, 0.85 * k)}"/>`,
    bloom(c, bx + 3, H * 0.4, 190, s.a1, 0.3),
  );
  return out.join("");
}

/** R11 CONSULTING — decision architecture: intersecting strategy pathways. */
function decisionArch(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.62, punch: 0.9 })];
  // Exhibit planes: low, wide, overlapping strategy boards in perspective.
  const boards: Array<[number, number, number, number, number]> = [
    [W * 0.16, H * 0.4, 420, 250, 0.35],
    [W * 0.34, H * 0.31, 470, 300, 0.62],
    [W * 0.56, H * 0.44, 380, 220, 0.95],
  ];
  boards.forEach(([x, y, w, h, depth], i) => {
    const px = c.dir > 0 ? x : W - x - w;
    out.push(
      plane(c, {
        id: uid(c, `db${i}`),
        points: [
          `${px.toFixed(0)},${(y + 26).toFixed(0)}`,
          `${(px + w).toFixed(0)},${y.toFixed(0)}`,
          `${(px + w).toFixed(0)},${(y + h).toFixed(0)}`,
          `${px.toFixed(0)},${(y + h + 26).toFixed(0)}`,
        ].join(" "),
        depth,
        material: "acrylic" as unknown as "glass",
        tint: i === 1 ? s.a1 : undefined,
      }),
    );
  });
  // Decision lattice: diagonal pathways branching to weighted outcomes.
  const ox = c.dir > 0 ? 120 : W - 120;
  const sgn = c.dir > 0 ? 1 : -1;
  for (let branch = 0; branch < 3; branch += 1) {
    const y0 = H * 0.58;
    const y1 = H * (0.26 + branch * 0.22);
    const d = spline([
      [ox, y0],
      [ox + sgn * 260, (y0 + y1) / 2],
      [ox + sgn * 620, y1],
      [ox + sgn * 980, y1 - 24],
    ]);
    out.push(litPath(c, d, branch === 1 ? s.a1 : s.a2, branch === 1 ? 3 : 1.6, branch === 1 ? 0.75 : 0.4));
    out.push(node(c, ox + sgn * 620, y1, branch === 1 ? 13 : 8, branch === 1 ? s.signal : s.a2));
  }
  out.push(node(c, ox, H * 0.58, 18, s.a1));
  out.push(
    `<path d="M${(ox - sgn * 40).toFixed(0)} ${(H * 0.58).toFixed(0)} h${(sgn * 80).toFixed(0)}" stroke="${a(contrastInk(s), 0.2 * k * L)}" stroke-width="1"/>`,
  );
  return out.join("");
}

/** R20 LUXURY — sculptural stone arches and plinths, champagne edge light. */
function sculptural(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.24, punch: 0.8 })];
  const cx = c.dir > 0 ? W * 0.38 : W * 0.62;
  // Three nested stone arches, gallery scale, deep negative space around them.
  for (let i = 2; i >= 0; i -= 1) {
    const w = 470 - i * 118;
    const h = 470 - i * 96;
    const x = cx - w / 2 + (i - 1) * 26;
    const yTop = H - 96 - h;
    out.push(
      plane(c, {
        id: uid(c, `ar${i}`),
        points: [
          `${x.toFixed(0)},${(H - 96).toFixed(0)}`,
          `${x.toFixed(0)},${(yTop + h * 0.42).toFixed(0)}`,
          `${(x + w * 0.5).toFixed(0)},${yTop.toFixed(0)}`,
          `${(x + w).toFixed(0)},${(yTop + h * 0.42).toFixed(0)}`,
          `${(x + w).toFixed(0)},${(H - 96).toFixed(0)}`,
        ].join(" "),
        depth: 0.35 + i * 0.3,
        material: "stone",
        tint: i === 2 ? shade(s.a2, 0.1) : undefined,
      }),
    );
    // Champagne rim on the lit edge only.
    out.push(
      `<path d="M${x.toFixed(0)} ${(yTop + h * 0.42).toFixed(0)} Q ${(x + w * 0.5).toFixed(0)} ${(yTop - 6).toFixed(0)}, ${(x + w).toFixed(0)} ${(yTop + h * 0.42).toFixed(0)}" fill="none" stroke="${a(s.a1, (0.4 + i * 0.16) * k * L)}" stroke-width="${(1 + i * 0.7).toFixed(1)}"/>`,
    );
  }
  // Plinth + horizon rule.
  out.push(
    plane(c, { id: uid(c, "pl"), x: cx - 300, y: H - 96, w: 600, h: 34, depth: 1, material: "stone" }),
    ground(c, cx, H - 58, 760, 20),
    `<path d="M0 ${H - 62} H${W}" stroke="${a(s.a1, 0.24 * k * L)}" stroke-width="1"/>`,
  );
  out.push(bloom(c, cx, H * 0.2, 300, s.a2, 0.24));
  return out.join("");
}

/** R25 REAL ESTATE — orthographic plan/elevation plus extruded massing. */
function massing(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.5, punch: 0.85 })];
  // Plan grid — the drafting layer, held to the mass side.
  const gx = c.dir > 0 ? 40 : W * 0.42;
  out.push(hatch(c, { x: gx, y: 90, w: W * 0.56, h: H - 190, step: 34, alpha: 0.14, angle: 0 }));
  for (let i = 0; i <= 12; i += 1) {
    const x = gx + (i / 12) * W * 0.56;
    out.push(
      `<path d="M${x.toFixed(0)} 90 V${H - 100}" stroke="${a(contrastInk(s), 0.09 * k * L)}" stroke-width="1"/>`,
    );
  }
  // Floorplate outline: an L-shaped plan with dimension marks.
  const px = gx + 60;
  const py = 150;
  out.push(
    `<path d="M${px} ${py} h360 v150 h190 v230 h-550 Z" fill="${a(s.a2, 0.1 * k * L)}" stroke="${a(s.a1, 0.55 * k * L)}" stroke-width="2"/>`,
    `<path d="M${px - 26} ${py} v530 M${px - 34} ${py} h16 M${px - 34} ${py + 530} h16" stroke="${a(contrastInk(s), 0.3 * k * L)}" stroke-width="1"/>`,
  );
  // Extruded massing — the same plan raised as axonometric volumes.
  const mx = c.dir > 0 ? W * 0.66 : W * 0.2;
  const blocks: Array<[number, number, number]> = [
    [0, 0, 150],
    [78, 44, 230],
    [156, 88, 110],
  ];
  blocks.forEach(([dx, dy, hgt], i) => {
    const bx = mx + dx;
    const by = H * 0.62 + dy;
    const w = 92;
    out.push(
      `<polygon points="${bx},${by - hgt} ${bx + w},${by - hgt + w * 0.5} ${bx},${by - hgt + w} ${bx - w},${by - hgt + w * 0.5}" fill="${a(mix(s.a2, s.surface, 0.35), 0.5 * k * L)}" stroke="${a(contrastInk(s), 0.34 * k * L)}" stroke-width="1"/>`,
      `<polygon points="${bx - w},${by - hgt + w * 0.5} ${bx},${by - hgt + w} ${bx},${by + w} ${bx - w},${by + w * 0.5}" fill="${a(s.deep, 0.3 * k * L)}" stroke="${a(contrastInk(s), 0.26 * k * L)}" stroke-width="1"/>`,
      `<polygon points="${bx},${by - hgt + w} ${bx + w},${by - hgt + w * 0.5} ${bx + w},${by + w * 0.5} ${bx},${by + w}" fill="${a(s.deep, 0.42 * k * L)}" stroke="${a(contrastInk(s), 0.26 * k * L)}" stroke-width="1"/>`,
    );
    if (i === 1)
      out.push(
        `<polygon points="${bx},${by - hgt} ${bx + w},${by - hgt + w * 0.5} ${bx},${by - hgt + w} ${bx - w},${by - hgt + w * 0.5}" fill="none" stroke="${a(s.signal, 0.7 * k * L)}" stroke-width="1.8"/>`,
      );
  });
  return out.join("");
}

/* ═════════════════════════════════════════════════ TECH-FAMILY SIGNATURES
 * R02 modular cloud stack · R07 nested secure zones · R16 coverage propagation
 */

/** R02 SAAS — stacked service architecture with luminous seams. */
function serviceStack(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: c.dir > 0 ? W * 0.34 : W * 0.66, focusY: H * 0.42 })];
  const cx = c.dir > 0 ? W * 0.34 : W * 0.66;
  // Four stacked platform slabs in mild axonometric — the "cloud tiers".
  for (let i = 0; i < 4; i += 1) {
    const y = H * 0.74 - i * 108;
    const w = 620 - i * 64;
    const skew = 34;
    out.push(
      plane(c, {
        id: uid(c, `ss${i}`),
        points: [
          `${(cx - w / 2).toFixed(0)},${y.toFixed(0)}`,
          `${(cx + w / 2).toFixed(0)},${(y - skew).toFixed(0)}`,
          `${(cx + w / 2).toFixed(0)},${(y - skew + 52).toFixed(0)}`,
          `${(cx - w / 2).toFixed(0)},${(y + 52).toFixed(0)}`,
        ].join(" "),
        depth: 0.35 + i * 0.18,
        material: "glass",
        tint: i === 2 ? s.a1 : undefined,
      }),
      // Luminous seam under each tier.
      `<path d="M${(cx - w / 2).toFixed(0)} ${(y + 52).toFixed(0)} L${(cx + w / 2).toFixed(0)} ${(y - skew + 52).toFixed(0)}" stroke="${a(i % 2 ? s.a2 : s.a1, 0.75 * k * L)}" stroke-width="2"/>`,
    );
    // Service modules riding the tier.
    const mods = 3 + (i % 2);
    for (let m = 0; m < mods; m += 1) {
      const t = (m + 0.5) / mods;
      const mxp = cx - w / 2 + t * w;
      const myp = y - skew * t + 8;
      out.push(
        `<rect x="${(mxp - 26).toFixed(0)}" y="${(myp - 30).toFixed(0)}" width="52" height="30" rx="5" fill="${a(s.deep, 0.5 * k)}" stroke="${a(m === 1 ? s.a2 : contrastInk(s), (m === 1 ? 0.7 : 0.28) * k * L)}" stroke-width="1.2"/>`,
      );
    }
  }
  // Vertical service links between tiers.
  for (let i = 0; i < 3; i += 1) {
    const x = cx - 180 + i * 180;
    out.push(
      `<path d="M${x} ${(H * 0.74 - 6).toFixed(0)} V${(H * 0.74 - 330).toFixed(0)}" stroke="${a(s.a2, 0.3 * k * L)}" stroke-width="1" stroke-dasharray="5 7"/>`,
    );
  }
  out.push(bloom(c, cx, H * 0.3, 260, s.a1, 0.3));
  return out.join("");
}

/** R07 CYBERSECURITY — nested secure zones with a volumetric shield boundary. */
function secureZones(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const cx = c.dir > 0 ? W * 0.36 : W * 0.64;
  const cy = H * 0.5;
  const out = [atmosphere(c, { focusX: cx, focusY: cy, punch: 1.1 })];
  // Circuit perimeter telemetry — orthogonal traces around the frame edge.
  for (let i = 0; i < 14; i += 1) {
    const t = i / 14;
    const y = 40 + t * (H - 80);
    const len = 46 + ((i * 37) % 90);
    out.push(
      `<path d="M18 ${y.toFixed(0)} h${len} v18" stroke="${a(s.a1, 0.2 * k * L)}" stroke-width="1"/>`,
      `<path d="M${W - 18} ${(H - y).toFixed(0)} h-${len} v-18" stroke="${a(s.a1, 0.2 * k * L)}" stroke-width="1"/>`,
    );
  }
  // Nested shields: hexagonal boundary layers, tightest at the core.
  for (let ring = 4; ring >= 0; ring -= 1) {
    const r = 96 + ring * 66;
    const pts: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const ang = (Math.PI / 3) * i - Math.PI / 2;
      pts.push(`${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r * 1.06).toFixed(1)}`);
    }
    const breach = ring === 3;
    out.push(
      `<polygon points="${pts.join(" ")}" fill="${a(s.a1, (0.05 + (4 - ring) * 0.035) * k * L)}" stroke="${a(breach ? s.signal : s.a2, (0.28 + (4 - ring) * 0.12) * k * L)}" stroke-width="${breach ? 2.2 : 1.4}" stroke-dasharray="${breach ? "16 10" : "none"}"/>`,
    );
  }
  // Locked core.
  out.push(
    bloom(c, cx, cy, 190, s.a1, 0.42),
    `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="44" fill="${a(s.deep, 0.7 * k)}" stroke="${a(s.a1, 0.9 * k * L)}" stroke-width="2.4"/>`,
    `<path d="M${(cx - 16).toFixed(0)} ${(cy + 12).toFixed(0)} h32 v-22 h-32 Z" fill="none" stroke="${a(s.a2, 0.8 * k * L)}" stroke-width="2"/>`,
    `<path d="M${(cx - 8).toFixed(0)} ${(cy - 10).toFixed(0)} a8 8 0 0 1 16 0" fill="none" stroke="${a(s.a2, 0.8 * k * L)}" stroke-width="2"/>`,
  );
  return out.join("");
}

/** R16 TELECOM — coverage mesh, tower anchors, propagation rings, arc links. */
function coverageMesh(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.82, punch: 1 })];
  // Ground mesh in perspective — the coverage plane.
  const hy = H * 0.52;
  for (let i = -10; i <= 10; i += 1) {
    out.push(
      `<path d="M${(W / 2 + i * 46).toFixed(0)} ${hy.toFixed(0)} L${(W / 2 + i * 300).toFixed(0)} ${H + 40}" stroke="${a(s.a2, 0.16 * k * L)}" stroke-width="1"/>`,
    );
  }
  for (let i = 1; i <= 8; i += 1) {
    const y = hy + (H + 40 - hy) * Math.pow(i / 8, 2.2);
    out.push(`<path d="M0 ${y.toFixed(0)} H${W}" stroke="${a(s.a2, 0.14 * k * L)}" stroke-width="1"/>`);
  }
  // Three abstract vertical tower anchors at unequal thirds.
  const towers = [W * 0.22, W * 0.52, W * 0.79].map((x, i) => ({ x, top: H * (0.2 + i * 0.06) }));
  towers.forEach((t, i) => {
    out.push(
      `<path d="M${t.x.toFixed(0)} ${t.top.toFixed(0)} L${(t.x - 20).toFixed(0)} ${hy + 40} M${t.x.toFixed(0)} ${t.top.toFixed(0)} L${(t.x + 20).toFixed(0)} ${hy + 40}" stroke="${a(contrastInk(s), 0.4 * k * L)}" stroke-width="1.6"/>`,
      `<path d="M${(t.x - 12).toFixed(0)} ${(t.top + 60).toFixed(0)} h24 M${(t.x - 16).toFixed(0)} ${(t.top + 120).toFixed(0)} h32" stroke="${a(contrastInk(s), 0.24 * k * L)}" stroke-width="1"/>`,
    );
    // Propagation rings expanding from the mast head.
    for (let rr = 1; rr <= 3; rr += 1) {
      out.push(
        `<ellipse cx="${t.x.toFixed(0)}" cy="${t.top.toFixed(0)}" rx="${(rr * 62).toFixed(0)}" ry="${(rr * 24).toFixed(0)}" fill="none" stroke="${a(i === 1 ? s.a1 : s.signal, (0.42 - rr * 0.1) * k * L)}" stroke-width="1.4"/>`,
      );
    }
    out.push(bloom(c, t.x, t.top, 90, s.a1, 0.3));
  });
  // Long connectivity arcs between anchors.
  out.push(
    litPath(
      c,
      spline([
        [towers[0]!.x, towers[0]!.top],
        [(towers[0]!.x + towers[1]!.x) / 2, H * 0.1],
        [towers[1]!.x, towers[1]!.top],
        [(towers[1]!.x + towers[2]!.x) / 2, H * 0.12],
        [towers[2]!.x, towers[2]!.top],
      ]),
      s.a1,
      2,
      0.6,
    ),
  );
  return out.join("");
}

/* ═══════════════════════════════════════════ RAILS-FAMILY SIGNATURES
 * R04 liquidity ribbons · R17 isometric hub network · R29 people constellation
 */

/** R04 FINTECH — liquidity ribbons over payment rails, with pulses. */
function liquidity(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: c.dir > 0 ? W * 0.3 : W * 0.7, focusY: H * 0.55 })];
  // Straight payment rails behind the fluid layer.
  for (let i = 0; i < 6; i += 1) {
    const y = H * 0.3 + i * 62;
    out.push(
      `<path d="M0 ${y.toFixed(0)} H${W}" stroke="${a(contrastInk(s), 0.1 * k * L)}" stroke-width="1"/>`,
    );
  }
  // Liquidity ribbons: thick gradient bands, banking left to right.
  for (let i = 0; i < 4; i += 1) {
    const t = i / 4;
    const gid = uid(c, `lq${i}`);
    const y0 = H * (0.28 + t * 0.34);
    const y1 = H * (0.62 - t * 0.3);
    const d = spline([
      [-60, y0],
      [W * 0.3, y0 - 70],
      [W * 0.62, y1 + 60],
      [W + 60, y1],
    ]);
    out.push(
      `<defs>${linear(gid, [
        { at: 0, color: a(s.a2, 0.05 * k * L) },
        { at: 0.45, color: a(i % 2 ? s.a2 : s.a1, (0.62 - t * 0.2) * k * L) },
        { at: 1, color: a(s.a1, 0.06 * k * L) },
      ])}</defs>`,
      `<path d="${d}" fill="none" stroke="url(#${gid})" stroke-width="${(26 - i * 5).toFixed(0)}" stroke-linecap="round"/>`,
    );
  }
  // Transaction pulses riding the rails.
  for (let i = 0; i < 16; i += 1) {
    const y = H * 0.3 + Math.floor(c.r() * 6) * 62;
    const x = 60 + c.r() * (W - 120);
    const hot = c.r() > 0.82;
    out.push(
      `<rect x="${x.toFixed(0)}" y="${(y - 3).toFixed(0)}" width="${(14 + c.r() * 34).toFixed(0)}" height="6" rx="3" fill="${a(hot ? s.signal : s.a2, (hot ? 0.9 : 0.55) * k * L)}"/>`,
    );
  }
  out.push(bloom(c, c.dir > 0 ? W * 0.28 : W * 0.72, H * 0.46, 230, s.a1, 0.26));
  return out.join("");
}

/** R17 LOGISTICS — isometric hub-and-route network with directional lanes. */
function hubNetwork(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.6, punch: 0.85 })];
  const iso = (x: number, y: number) => [W * 0.5 + (x - y) * 0.86, H * 0.44 + (x + y) * 0.44] as const;
  // Iso ground grid.
  for (let i = -6; i <= 6; i += 1) {
    const [ax, ay] = iso(i * 90, -560);
    const [bx, by] = iso(i * 90, 560);
    const [cx2, cy2] = iso(-560, i * 90);
    const [dx, dy] = iso(560, i * 90);
    out.push(
      `<path d="M${ax.toFixed(0)} ${ay.toFixed(0)} L${bx.toFixed(0)} ${by.toFixed(0)}" stroke="${a(contrastInk(s), 0.08 * k * L)}" stroke-width="1"/>`,
      `<path d="M${cx2.toFixed(0)} ${cy2.toFixed(0)} L${dx.toFixed(0)} ${dy.toFixed(0)}" stroke="${a(contrastInk(s), 0.08 * k * L)}" stroke-width="1"/>`,
    );
  }
  // Distribution hubs: flat pads with stacked freight volumes.
  const hubs: Array<[number, number, number]> = [
    [-330, -120, 1],
    [120, -300, 0.7],
    [260, 190, 1],
    [-160, 320, 0.6],
  ];
  const centers = hubs.map(([hx, hy]) => iso(hx, hy));
  // Lanes first, so hubs sit on top.
  centers.forEach((p, i) => {
    const q = centers[(i + 1) % centers.length]!;
    out.push(litPath(c, `M${p[0].toFixed(0)} ${p[1].toFixed(0)} L${q[0].toFixed(0)} ${q[1].toFixed(0)}`, i % 2 ? s.a1 : s.a2, 2, 0.45));
    // Directional chevrons along the lane.
    for (let t = 0.3; t < 0.9; t += 0.28) {
      const mx = p[0] + (q[0] - p[0]) * t;
      const my = p[1] + (q[1] - p[1]) * t;
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const dxp = Math.cos(ang) * 11;
      const dyp = Math.sin(ang) * 11;
      out.push(
        `<path d="M${(mx - dxp - dyp * 0.7).toFixed(0)} ${(my - dyp + dxp * 0.7).toFixed(0)} L${(mx + dxp).toFixed(0)} ${(my + dyp).toFixed(0)} L${(mx - dxp + dyp * 0.7).toFixed(0)} ${(my - dyp - dxp * 0.7).toFixed(0)}" fill="none" stroke="${a(s.signal, 0.62 * k * L)}" stroke-width="1.6"/>`,
      );
    }
  });
  hubs.forEach(([hx, hy, scale], i) => {
    const [px, py] = iso(hx, hy);
    const w = 62 * scale;
    out.push(
      `<polygon points="${px},${py - w * 0.5} ${px + w},${py} ${px},${py + w * 0.5} ${px - w},${py}" fill="${a(s.a2, 0.24 * k * L)}" stroke="${a(contrastInk(s), 0.34 * k * L)}" stroke-width="1.2"/>`,
    );
    const hgt = 34 + i * 16;
    out.push(
      `<polygon points="${px},${py - w * 0.5 - hgt} ${px + w * 0.6},${py - hgt - w * 0.2} ${px + w * 0.6},${py - w * 0.2} ${px},${py - w * 0.5}" fill="${a(s.deep, 0.5 * k * L)}" stroke="${a(contrastInk(s), 0.28 * k * L)}" stroke-width="1"/>`,
      `<polygon points="${px},${py - w * 0.5 - hgt} ${px - w * 0.6},${py - hgt - w * 0.2} ${px - w * 0.6},${py - w * 0.2} ${px},${py - w * 0.5}" fill="${a(s.deep, 0.34 * k * L)}" stroke="${a(contrastInk(s), 0.28 * k * L)}" stroke-width="1"/>`,
    );
  });
  return out.join("");
}

/** R29 HR — connected people-system modules, a warm team constellation. */
function constellation(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const cx = c.dir > 0 ? W * 0.38 : W * 0.62;
  const out = [atmosphere(c, { focusX: cx, focusY: H * 0.44, punch: 1.05 })];
  // Soft concentric belonging rings.
  for (let i = 1; i <= 3; i += 1) {
    out.push(
      `<circle cx="${cx.toFixed(0)}" cy="${(H * 0.46).toFixed(0)}" r="${(96 + i * 82).toFixed(0)}" fill="none" stroke="${a(s.a2, (0.22 - i * 0.04) * k * L)}" stroke-width="1" stroke-dasharray="3 9"/>`,
    );
  }
  // People modules — rounded capsules with a head disc, never literal figures.
  const people: Array<[number, number, number]> = [];
  for (let i = 0; i < 9; i += 1) {
    const ang = (i / 9) * Math.PI * 2 + c.take * 0.4;
    const rad = 120 + (i % 3) * 96;
    people.push([cx + Math.cos(ang) * rad, H * 0.46 + Math.sin(ang) * rad * 0.62, i % 3]);
  }
  people.forEach(([px, py], i) => {
    const q = people[(i + 4) % people.length]!;
    out.push(
      `<path d="${spline([[px, py], [(px + q[0]) / 2, (py + q[1]) / 2 - 40], [q[0], q[1]]])}" fill="none" stroke="${a(s.a1, 0.2 * k * L)}" stroke-width="1"/>`,
    );
  });
  people.forEach(([px, py, band], i) => {
    const col = band === 0 ? s.a1 : band === 1 ? s.a2 : s.signal;
    const rr = 15 + band * 5;
    out.push(
      `<circle cx="${px.toFixed(0)}" cy="${(py - rr * 0.9).toFixed(0)}" r="${(rr * 0.52).toFixed(1)}" fill="${a(col, 0.6 * k * L)}"/>`,
      `<path d="M${(px - rr).toFixed(0)} ${(py + rr * 0.7).toFixed(0)} a${rr} ${rr * 0.9} 0 0 1 ${(rr * 2).toFixed(0)} 0 Z" fill="${a(col, 0.3 * k * L)}" stroke="${a(col, 0.7 * k * L)}" stroke-width="1.4"/>`,
    );
    if (i % 4 === 0) out.push(bloom(c, px, py, 90, col, 0.2));
  });
  out.push(node(c, cx, H * 0.46, 26, s.a1));
  return out.join("");
}

/* ═════════════════════════════════════ CARE / SCIENCE FAMILY SIGNATURES
 * R06 coverage shells · R08 clinical corridor · R09 membrane · R26 inquiry
 */

/** R06 INSURANCE — nested protective shells and risk boundary bands. */
function coverageShells(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const cx = c.dir > 0 ? W * 0.34 : W * 0.66;
  const cy = H * 0.56;
  const out = [atmosphere(c, { focusX: cx, focusY: cy * 0.8, punch: 1.15 })];
  // Shell bands — half-dome arcs nested over a protected base.
  for (let i = 5; i >= 0; i -= 1) {
    const r = 120 + i * 62;
    const gid = uid(c, `cs${i}`);
    out.push(
      `<defs>${linear(gid, [
        { at: 0, color: a(i % 2 ? s.a1 : s.a2, (0.3 - i * 0.035) * k * L) },
        { at: 1, color: a(i % 2 ? s.a1 : s.a2, 0.02 * k * L) },
      ], { x1: "0%", y1: "0%", x2: "0%", y2: "100%" })}</defs>`,
      `<path d="M${(cx - r).toFixed(0)} ${cy.toFixed(0)} a${r} ${(r * 0.86).toFixed(0)} 0 0 1 ${(r * 2).toFixed(0)} 0 Z" fill="url(#${gid})" stroke="${a(i === 0 ? s.a1 : contrastInk(s), (i === 0 ? 0.8 : 0.2) * k * L)}" stroke-width="${i === 0 ? 2.4 : 1.2}"/>`,
    );
  }
  // Risk boundary ticks on the outermost band.
  for (let i = 0; i <= 18; i += 1) {
    const ang = Math.PI + (i / 18) * Math.PI;
    const r = 430;
    const x1 = cx + Math.cos(ang) * r;
    const y1 = cy + Math.sin(ang) * r * 0.86;
    out.push(
      `<path d="M${x1.toFixed(0)} ${y1.toFixed(0)} l${(Math.cos(ang) * 12).toFixed(1)} ${(Math.sin(ang) * 10).toFixed(1)}" stroke="${a(i % 3 === 0 ? s.signal : contrastInk(s), 0.32 * k * L)}" stroke-width="1.4"/>`,
    );
  }
  out.push(
    `<path d="M0 ${cy} H${W}" stroke="${a(contrastInk(s), 0.24 * k * L)}" stroke-width="1.4"/>`,
    ground(c, cx, cy + 8, 620, 16),
  );
  return out.join("");
}

/** R08 HEALTHCARE — clinical corridor with translucent care layers. */
function corridor(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const vpx = c.dir > 0 ? W * 0.42 : W * 0.58;
  const vpy = H * 0.44;
  const out = [atmosphere(c, { focusX: vpx, focusY: vpy, punch: 1.25 })];
  out.push(floor(c, vpx, vpy, 13, 0.14));
  // Corridor portals receding — bright, glazed, deep.
  for (let i = 5; i >= 0; i -= 1) {
    const t = i / 5;
    const w = 300 + t * 620;
    const h = 200 + t * 420;
    const x = vpx - w / 2;
    const y = vpy - h * 0.42;
    out.push(
      plane(c, {
        id: uid(c, `co${i}`),
        points: [
          `${x.toFixed(0)},${(y + h).toFixed(0)}`,
          `${x.toFixed(0)},${(y + h * 0.28).toFixed(0)}`,
          `${(x + w * 0.5).toFixed(0)},${y.toFixed(0)}`,
          `${(x + w).toFixed(0)},${(y + h * 0.28).toFixed(0)}`,
          `${(x + w).toFixed(0)},${(y + h).toFixed(0)}`,
        ].join(" "),
        depth: 0.25 + t * 0.6,
        material: "glass",
        tint: i % 2 ? s.a2 : s.a1,
      }),
    );
  }
  // Care pathway on the floor: a lit route to the far portal.
  out.push(
    litPath(
      c,
      spline([
        [c.dir > 0 ? 90 : W - 90, H - 40],
        [vpx + (c.dir > 0 ? -130 : 130), H * 0.78],
        [vpx, vpy + 40],
      ]),
      s.a1,
      3,
      0.6,
    ),
  );
  // Translucent care layers — soft horizontal bands, right of the focal axis.
  for (let i = 0; i < 4; i += 1) {
    const y = 96 + i * 58;
    const w = 250 + i * 40;
    const x = c.dir > 0 ? W - 70 - w : 70;
    out.push(
      `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="26" rx="13" fill="${a(i % 2 ? s.a2 : s.a1, 0.16 * k * L)}" stroke="${a(s.a1, 0.36 * k * L)}" stroke-width="1"/>`,
    );
  }
  out.push(bloom(c, vpx, vpy, 260, s.a2, 0.36));
  return out.join("");
}

/** R09 PHARMA — cellular membrane macro: vesicles, bilayer, lattice. */
function membrane(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: c.dir > 0 ? W * 0.36 : W * 0.64, focusY: H * 0.5, punch: 1.2 })];
  // Bilayer band sweeping the lower half.
  const yb = H * 0.68;
  const d1 = spline([[-40, yb - 40], [W * 0.3, yb + 30], [W * 0.7, yb - 40], [W + 40, yb + 20]]);
  const d2 = spline([[-40, yb + 34], [W * 0.3, yb + 104], [W * 0.7, yb + 34], [W + 40, yb + 94]]);
  out.push(
    `<path d="${d1}" fill="none" stroke="${a(s.a1, 0.5 * k * L)}" stroke-width="3"/>`,
    `<path d="${d2}" fill="none" stroke="${a(s.a1, 0.34 * k * L)}" stroke-width="2"/>`,
  );
  for (let i = 0; i <= 30; i += 1) {
    const x = (i / 30) * W;
    const y = yb - 40 + Math.sin((x / W) * Math.PI * 2) * 34;
    out.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="7" fill="${a(s.a2, 0.42 * k * L)}"/>`,
      `<path d="M${x.toFixed(0)} ${(y + 7).toFixed(0)} v58" stroke="${a(s.a2, 0.26 * k * L)}" stroke-width="1.2"/>`,
    );
  }
  // Vesicles: translucent spheres with rim light and inner nucleus.
  const cells: Array<[number, number, number]> = [
    [c.dir > 0 ? W * 0.3 : W * 0.7, H * 0.36, 168],
    [c.dir > 0 ? W * 0.52 : W * 0.48, H * 0.2, 84],
    [c.dir > 0 ? W * 0.14 : W * 0.86, H * 0.6, 66],
  ];
  cells.forEach(([cx, cy, r], i) => {
    const gid = uid(c, `ve${i}`);
    out.push(
      `<defs>${radial(gid, cx - r * 0.3, cy - r * 0.35, (r * 1.6) / W, [
        { at: 0, color: a(shade(s.a2, 0.3), 0.5 * k * L) },
        { at: 0.6, color: a(s.a1, 0.16 * k * L) },
        { at: 1, color: a(s.a1, 0.04 * k * L) },
      ])}</defs>`,
      `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r}" fill="url(#${gid})" stroke="${a(s.a1, 0.5 * k * L)}" stroke-width="1.6"/>`,
      `<circle cx="${(cx - r * 0.22).toFixed(0)} " cy="${(cy - r * 0.24).toFixed(0)}" r="${(r * 0.3).toFixed(0)}" fill="${a(s.a2, 0.3 * k * L)}"/>`,
    );
    if (i === 0) {
      // Bonded compound inside the primary vesicle.
      for (let n = 0; n < 6; n += 1) {
        const ang = (n / 6) * Math.PI * 2;
        const px = cx + Math.cos(ang) * r * 0.52;
        const py = cy + Math.sin(ang) * r * 0.52;
        out.push(
          `<path d="M${cx} ${cy} L${px.toFixed(0)} ${py.toFixed(0)}" stroke="${a(s.deep, 0.3 * k * L)}" stroke-width="1.2"/>`,
          node(c, px, py, 9, s.signal),
        );
      }
      out.push(node(c, cx, cy, 13, s.a1));
    }
  });
  return out.join("");
}

/** R26 EDUCATION — layered knowledge planes with radiating inquiry arcs. */
function inquiry(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const ax = c.dir > 0 ? W * 0.28 : W * 0.72;
  const ay = H * 0.72;
  const out = [atmosphere(c, { focusX: ax, focusY: H * 0.4, punch: 1.15 })];
  // Stacked knowledge planes — tilted sheets gaining height.
  for (let i = 0; i < 5; i += 1) {
    const y = H * 0.78 - i * 46;
    const w = 560 - i * 52;
    const x = ax - w * 0.3;
    out.push(
      plane(c, {
        id: uid(c, `kp${i}`),
        points: [
          `${x.toFixed(0)},${y.toFixed(0)}`,
          `${(x + w).toFixed(0)},${(y - 40).toFixed(0)}`,
          `${(x + w).toFixed(0)},${(y - 18).toFixed(0)}`,
          `${x.toFixed(0)},${(y + 22).toFixed(0)}`,
        ].join(" "),
        depth: 0.3 + i * 0.14,
        material: "paper",
        tint: i === 4 ? s.a1 : undefined,
      }),
    );
  }
  // Radiating inquiry arcs fanning from the stack.
  for (let i = 0; i < 7; i += 1) {
    const ang = (-Math.PI / 2) + (i - 3) * 0.24;
    const r = 250 + (i % 3) * 90;
    const ex = ax + Math.cos(ang) * r * (c.dir > 0 ? 1 : -1);
    const ey = ay + Math.sin(ang) * r * 0.9;
    out.push(
      `<path d="${spline([[ax, ay], [(ax + ex) / 2 + 40, (ay + ey) / 2], [ex, ey]])}" fill="none" stroke="${a(i % 2 ? s.a1 : s.a2, (0.42 - (i % 3) * 0.08) * k * L)}" stroke-width="${i === 3 ? 2.4 : 1.2}"/>`,
      node(c, ex, ey, i === 3 ? 12 : 7, i === 3 ? s.signal : s.a2),
    );
  }
  out.push(bloom(c, ax, ay, 200, s.a1, 0.28));
  return out.join("");
}

/* ═══════════════════════════════════ TERRAIN / MOTION FAMILY SIGNATURES
 * R13 energy grid · R24 destination horizon · R14 aero body · R23 lanes
 */

/** R13 ENERGY — infrastructure terrain with a luminous transmission grid. */
function energyGrid(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.3, punch: 1.05 })];
  // Terrain ridges, compressed toward the horizon.
  for (let i = 0; i < 14; i += 1) {
    const t = i / 14;
    const y = H * 0.46 + Math.pow(t, 1.7) * H * 0.6;
    const pts: Array<[number, number]> = [];
    for (let x = -40; x <= W + 40; x += 80) {
      pts.push([x, y + Math.sin((x / W) * 6.2 + i * 0.7 + c.take) * (24 + t * 34)]);
    }
    out.push(
      `<path d="${spline(pts)}" fill="none" stroke="${a(i % 4 === 0 ? s.a1 : contrastInk(s), (i % 4 === 0 ? 0.4 : 0.14) * k * L)}" stroke-width="${i % 4 === 0 ? 1.8 : 1}"/>`,
    );
  }
  // Transmission pylons + energised catenary spans.
  const pyl = [W * 0.16, W * 0.42, W * 0.68, W * 0.92];
  pyl.forEach((x, i) => {
    const top = H * (0.24 + (i % 2) * 0.05);
    const base = H * 0.62 + i * 18;
    out.push(
      `<path d="M${x.toFixed(0)} ${top.toFixed(0)} V${base.toFixed(0)} M${(x - 34).toFixed(0)} ${(top + 30).toFixed(0)} H${(x + 34).toFixed(0)} M${(x - 24).toFixed(0)} ${(top + 68).toFixed(0)} H${(x + 24).toFixed(0)}" stroke="${a(contrastInk(s), 0.42 * k * L)}" stroke-width="1.6"/>`,
    );
    if (i < pyl.length - 1) {
      const nx = pyl[i + 1]!;
      const nt = H * (0.24 + ((i + 1) % 2) * 0.05);
      out.push(
        litPath(c, `M${x} ${top + 30} Q ${(x + nx) / 2} ${(top + nt) / 2 + 60}, ${nx} ${nt + 30}`, s.signal, 1.6, 0.5),
      );
    }
    out.push(`<circle cx="${x.toFixed(0)}" cy="${top.toFixed(0)}" r="5" fill="${a(s.signal, 0.9 * k * L)}"/>`);
  });
  out.push(bloom(c, W * 0.5, H * 0.44, 340, s.a2, 0.24));
  return out.join("");
}

/** R24 TRAVEL — atmospheric destination horizon with tidal topography. */
function horizonSpace(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const hy = H * 0.44;
  const sunX = c.dir > 0 ? W * 0.32 : W * 0.68;
  const out = [atmosphere(c, { focusX: sunX, focusY: hy, punch: 1.2 })];
  // Sky bands.
  for (let i = 0; i < 5; i += 1) {
    const gid = uid(c, `sk${i}`);
    out.push(
      `<defs>${linear(gid, [
        { at: 0, color: a(i % 2 ? s.a2 : s.a1, (0.2 - i * 0.03) * k * L) },
        { at: 1, color: a(s.a2, 0) },
      ], { x1: "0%", y1: "0%", x2: "0%", y2: "100%" })}</defs>`,
      `<rect x="0" y="${(hy - 220 + i * 40).toFixed(0)}" width="${W}" height="60" fill="url(#${gid})"/>`,
    );
  }
  // Sun/atmosphere disc sitting on the horizon.
  out.push(
    bloom(c, sunX, hy - 20, 260, s.a2, 0.42),
    `<circle cx="${sunX.toFixed(0)}" cy="${(hy - 26).toFixed(0)}" r="72" fill="${a(shade(s.a2, 0.25), 0.42 * k * L)}" stroke="${a(s.a1, 0.5 * k * L)}" stroke-width="1.4"/>`,
  );
  // Distant headland silhouettes — depth planes.
  [[0.55, 0.22], [0.75, 0.34], [1, 0.5]].forEach(([depth, alpha], i) => {
    const y = hy + i * 16;
    const pts: Array<[number, number]> = [];
    for (let x = -40; x <= W + 40; x += 120) {
      pts.push([x, y - Math.abs(Math.sin(x / 300 + i)) * (60 - i * 14)]);
    }
    out.push(
      `<path d="${spline(pts)} L${W + 40} ${H} L-40 ${H} Z" fill="${a(mix(s.deep, s.surface, 1 - (depth as number)), (alpha as number) * k * L)}"/>`,
    );
  });
  // Tidal topographic bands across the foreground water.
  for (let i = 0; i < 9; i += 1) {
    const y = hy + 80 + i * 34;
    const pts: Array<[number, number]> = [];
    for (let x = -40; x <= W + 40; x += 90) {
      pts.push([x, y + Math.sin((x / W) * 7 + i * 0.6) * (5 + i)]);
    }
    out.push(
      `<path d="${spline(pts)}" fill="none" stroke="${a(i % 3 === 0 ? s.a1 : contrastInk(s), (0.3 - i * 0.02) * k * L)}" stroke-width="${i % 3 === 0 ? 1.6 : 1}"/>`,
    );
  }
  return out.join("");
}

/** R14 AUTOMOTIVE — metallic aerodynamic body surfaces and speed light. */
function aeroBody(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: c.dir > 0 ? W * 0.42 : W * 0.58, focusY: H * 0.44, punch: 0.95 })];
  const flip = c.dir > 0 ? 1 : -1;
  const mirror = (x: number) => (flip > 0 ? x : W - x);
  // Body surface: two long tapering panels with a specular sweep between them.
  const gid = uid(c, "car");
  out.push(
    `<defs>${linear(gid, [
      { at: 0, color: a(shade(s.ink, 0.1), 0.1 * k * L) },
      { at: 0.44, color: a(shade(s.a2, 0.3), 0.5 * k * L) },
      { at: 0.52, color: a(shade(s.ink, 0.4), 0.6 * k * L) },
      { at: 0.62, color: a(s.a1, 0.24 * k * L) },
      { at: 1, color: a(s.deep, 0.44 * k * L) },
    ], { x1: "0%", y1: "0%", x2: "20%", y2: "100%" })}</defs>`,
  );
  const top = spline([
    [mirror(-80), H * 0.62],
    [mirror(W * 0.24), H * 0.44],
    [mirror(W * 0.52), H * 0.36],
    [mirror(W * 0.8), H * 0.46],
    [mirror(W + 80), H * 0.58],
  ]);
  const bottom = spline([
    [mirror(W + 80), H * 0.78],
    [mirror(W * 0.7), H * 0.72],
    [mirror(W * 0.35), H * 0.7],
    [mirror(-80), H * 0.82],
  ]);
  out.push(`<path d="${top} L${mirror(W + 80).toFixed(0)} ${(H * 0.78).toFixed(0)} ${bottom.replace(/^M[^C]*/, "")} Z" fill="url(#${gid})" stroke="${a(shade(s.a2, 0.4), 0.5 * k * L)}" stroke-width="1.6"/>`);
  // Crease lines following the body.
  for (let i = 1; i <= 3; i += 1) {
    const d = spline([
      [mirror(-60), H * (0.64 + i * 0.03)],
      [mirror(W * 0.4), H * (0.48 + i * 0.035)],
      [mirror(W + 60), H * (0.62 + i * 0.03)],
    ]);
    out.push(`<path d="${d}" fill="none" stroke="${a(shade(s.ink, 0.3), (0.3 - i * 0.06) * k * L)}" stroke-width="1.2"/>`);
  }
  // Headlight blade + speed streaks trailing behind.
  out.push(
    beam(c, { x1: mirror(W * 0.86), y1: H * 0.52, x2: mirror(W * 0.2), y2: H * 0.5, width: 26, color: s.signal, strength: 0.6 }),
  );
  for (let i = 0; i < 12; i += 1) {
    const y = H * 0.24 + c.r() * H * 0.6;
    const len = 120 + c.r() * 420;
    const x0 = mirror(c.r() * (W - len));
    out.push(
      `<path d="M${x0.toFixed(0)} ${y.toFixed(0)} h${(flip * len).toFixed(0)}" stroke="${a(c.r() > 0.85 ? s.signal : s.a2, (0.1 + c.r() * 0.28) * k * L)}" stroke-width="${(1 + c.r() * 3).toFixed(1)}" stroke-linecap="round"/>`,
    );
  }
  out.push(ground(c, W * 0.5, H * 0.84, 900, 26));
  return out.join("");
}

/** R23 SPORTS — performance lanes, velocity bands, impact geometry. */
function performanceLanes(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const vpx = c.dir > 0 ? W * 0.72 : W * 0.28;
  const vpy = H * 0.2;
  const out = [atmosphere(c, { focusX: vpx, focusY: vpy, punch: 1.15 })];
  // Aggressive perspective track: lanes converging high and off-centre.
  for (let i = -5; i <= 5; i += 1) {
    const xb = W * 0.5 + i * 190;
    out.push(
      `<path d="M${xb.toFixed(0)} ${H + 40} L${vpx.toFixed(0)} ${vpy.toFixed(0)}" stroke="${a(i === 0 ? s.a1 : contrastInk(s), (i === 0 ? 0.5 : 0.16) * k * L)}" stroke-width="${i === 0 ? 2.4 : 1.2}"/>`,
    );
  }
  for (let i = 1; i <= 7; i += 1) {
    const y = vpy + (H + 40 - vpy) * Math.pow(i / 7, 2.4);
    out.push(`<path d="M0 ${y.toFixed(0)} H${W}" stroke="${a(contrastInk(s), 0.12 * k * L)}" stroke-width="1"/>`);
  }
  // Velocity bands: hard diagonal slashes with motion falloff.
  for (let i = 0; i < 7; i += 1) {
    const y = H * 0.24 + i * 74;
    const len = 300 + c.r() * 520;
    const x = c.dir > 0 ? -40 + c.r() * 200 : W + 40 - len - c.r() * 200;
    const gid = uid(c, `vb${i}`);
    out.push(
      `<defs>${linear(gid, [
        { at: 0, color: a(i % 3 === 0 ? s.a1 : s.a2, 0) },
        { at: 0.5, color: a(i % 3 === 0 ? s.a1 : s.a2, (0.6 - i * 0.05) * k * L) },
        { at: 1, color: a(s.signal, 0) },
      ])}</defs>`,
      `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${len.toFixed(0)} ${(-len * 0.22).toFixed(0)}" stroke="url(#${gid})" stroke-width="${(6 + (i % 3) * 7).toFixed(0)}" stroke-linecap="round"/>`,
    );
  }
  // Impact geometry: a burst of angular shards at the focal third.
  const ix = c.dir > 0 ? W * 0.3 : W * 0.7;
  const iy = H * 0.62;
  for (let i = 0; i < 9; i += 1) {
    const ang = (i / 9) * Math.PI * 2 + 0.3;
    const r0 = 44;
    const r1 = 92 + c.r() * 90;
    out.push(
      `<path d="M${(ix + Math.cos(ang) * r0).toFixed(0)} ${(iy + Math.sin(ang) * r0).toFixed(0)} L${(ix + Math.cos(ang + 0.08) * r1).toFixed(0)} ${(iy + Math.sin(ang + 0.08) * r1).toFixed(0)}" stroke="${a(i % 2 ? s.signal : s.a1, 0.6 * k * L)}" stroke-width="${(2 + c.r() * 3).toFixed(1)}" stroke-linecap="round"/>`,
    );
  }
  out.push(bloom(c, ix, iy, 190, s.a1, 0.34));
  return out.join("");
}

/* ═══════════════════════════════════════════ LIGHT-SPACE FAMILY SIGNATURES
 * R21 cinematic lens space · R30 immersive stage architecture
 */

/** R21 MEDIA — cinematic frame, lens beams, anamorphic flare. */
function lensSpace(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const fx = c.dir > 0 ? W * 0.36 : W * 0.64;
  const out = [atmosphere(c, { focusX: fx, focusY: H * 0.42, punch: 1.1 })];
  // Projection cone from a single off-frame source.
  for (let i = 0; i < 4; i += 1) {
    out.push(
      beam(c, {
        x1: c.dir > 0 ? -40 : W + 40,
        y1: H * 0.16,
        x2: fx + (i - 1.5) * 220,
        y2: H + 40,
        width: 60 + i * 20,
        color: i % 2 ? s.a1 : s.a2,
        strength: 0.28 - i * 0.04,
      }),
    );
  }
  // Lens iris rings at the focal third.
  for (let i = 0; i < 4; i += 1) {
    out.push(
      `<circle cx="${fx.toFixed(0)}" cy="${(H * 0.42).toFixed(0)}" r="${(60 + i * 46).toFixed(0)}" fill="none" stroke="${a(i === 0 ? s.signal : s.a2, (0.5 - i * 0.1) * k * L)}" stroke-width="${i === 0 ? 2.2 : 1}"/>`,
    );
  }
  out.push(bloom(c, fx, H * 0.42, 230, s.a1, 0.42));
  // Anamorphic streak through the focus.
  out.push(
    beam(c, { x1: 0, y1: H * 0.42, x2: W, y2: H * 0.42 - 26, width: 10, color: s.signal, strength: 0.42 }),
  );
  // Cinema frame bars, top and bottom — the letterbox gesture.
  out.push(
    `<rect x="0" y="0" width="${W}" height="52" fill="${a(s.deep, 0.55 * k)}"/>`,
    `<rect x="0" y="${H - 52}" width="${W}" height="52" fill="${a(s.deep, 0.55 * k)}"/>`,
    `<path d="M0 52 H${W} M0 ${H - 52} H${W}" stroke="${a(s.a1, 0.34 * k * L)}" stroke-width="1"/>`,
  );
  return out.join("");
}

/** R30 EVENTS — immersive stage: truss architecture and prismatic light space. */
function stageSpace(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const cx = W * 0.5;
  const out = [atmosphere(c, { focusX: cx, focusY: H * 0.7, punch: 1.2 })];
  // Fan of prismatic beams from an overhead rig — colour-split, symmetric.
  for (let i = -5; i <= 5; i += 1) {
    const col = i % 3 === 0 ? s.a1 : i % 3 === 1 ? s.a2 : s.signal;
    out.push(
      beam(c, {
        x1: cx + i * 40,
        y1: 96,
        x2: cx + i * 236,
        y2: H + 30,
        width: 40,
        color: col,
        strength: 0.3 - Math.abs(i) * 0.025,
      }),
    );
  }
  // Truss architecture: overhead grid + two vertical towers.
  const trussY = 78;
  out.push(
    `<path d="M60 ${trussY} H${W - 60} M60 ${trussY + 26} H${W - 60}" stroke="${a(contrastInk(s), 0.44 * k * L)}" stroke-width="2"/>`,
  );
  for (let x = 60; x < W - 60; x += 42) {
    out.push(
      `<path d="M${x} ${trussY} l21 26 l21 -26" fill="none" stroke="${a(contrastInk(s), 0.26 * k * L)}" stroke-width="1"/>`,
    );
  }
  [92, W - 92].forEach((x) => {
    out.push(
      `<path d="M${x} ${trussY} V${H * 0.78} M${x - 16} ${trussY} V${H * 0.78} M${x + 16} ${trussY} V${H * 0.78}" stroke="${a(contrastInk(s), 0.3 * k * L)}" stroke-width="1.2"/>`,
    );
    for (let y = trussY + 30; y < H * 0.78; y += 40) {
      out.push(`<path d="M${x - 16} ${y} l16 20 l16 -20" fill="none" stroke="${a(contrastInk(s), 0.2 * k * L)}" stroke-width="1"/>`);
    }
  });
  // Fixtures on the rig.
  for (let i = 0; i < 9; i += 1) {
    const x = 150 + i * ((W - 300) / 8);
    out.push(
      `<rect x="${(x - 9).toFixed(0)}" y="${trussY + 26}" width="18" height="20" rx="4" fill="${a(s.deep, 0.7 * k)}" stroke="${a(s.a2, 0.5 * k * L)}" stroke-width="1"/>`,
      bloom(c, x, trussY + 52, 60, i % 2 ? s.a1 : s.signal, 0.35),
    );
  }
  // Stage deck and crowd-field haze.
  out.push(
    `<path d="M${W * 0.18} ${H * 0.8} H${W * 0.82} L${W * 0.9} ${H * 0.88} H${W * 0.1} Z" fill="${a(s.deep, 0.6 * k)}" stroke="${a(s.a2, 0.4 * k * L)}" stroke-width="1.4"/>`,
    bloom(c, cx, H * 0.82, 420, s.a1, 0.3),
  );
  return out.join("");
}

/* ═════════════════════════════════════════════ CIVIC / MATERIAL SIGNATURES
 * R10 judicial authority · R27 civic service · R19 material strata · R28 earth
 */

/** R10 LEGAL — documentary authority: columns, filing volumes, seal geometry. */
function judicial(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: c.dir > 0 ? W * 0.3 : W * 0.7, focusY: H * 0.3, punch: 1.1 })];
  // Heavy columns — few, tall, deeply shaded (authority, not civic openness).
  const colX = c.dir > 0 ? [70, 190, 310] : [W - 130, W - 250, W - 370];
  colX.forEach((x, i) => {
    out.push(
      plane(c, { id: uid(c, `jc${i}`), x, y: 60, w: 60, h: H - 190, depth: 1 - i * 0.22, material: "stone", rim: "left", rimColor: s.signal }),
      hatch(c, { x, y: 60, w: 60, h: H - 190, step: 7, alpha: 0.1, angle: 0 }),
    );
  });
  out.push(
    `<rect x="${(colX[2] ?? 0) > (colX[0] ?? 0) ? 40 : W - 400}" y="30" width="360" height="30" fill="${a(s.deep, 0.4 * k * L)}" stroke="${a(s.signal, 0.4 * k * L)}" stroke-width="1"/>`,
    `<path d="M0 ${H - 130} H${W}" stroke="${a(contrastInk(s), 0.3 * k * L)}" stroke-width="2"/>`,
  );
  // Filing volumes: stacked document blocks stepping across the base.
  for (let i = 0; i < 7; i += 1) {
    const x = (c.dir > 0 ? 430 : 60) + i * 108;
    const hgt = 40 + ((i * 47) % 90);
    out.push(
      `<rect x="${x}" y="${(H - 130 - hgt).toFixed(0)}" width="76" height="${hgt}" fill="${a(mix(s.a2, s.surface, 0.4), 0.34 * k * L)}" stroke="${a(contrastInk(s), 0.3 * k * L)}" stroke-width="1"/>`,
    );
    for (let ln = 1; ln * 9 < hgt; ln += 1) {
      out.push(
        `<path d="M${x} ${(H - 130 - hgt + ln * 9).toFixed(0)} h76" stroke="${a(contrastInk(s), 0.1 * k * L)}" stroke-width="1"/>`,
      );
    }
    if (i === 3)
      out.push(
        `<rect x="${x}" y="${(H - 130 - hgt).toFixed(0)}" width="76" height="6" fill="${a(s.a1, 0.8 * k * L)}"/>`,
      );
  }
  // Seal: concentric ring cluster in the upper opposite third.
  const sx = c.dir > 0 ? W * 0.78 : W * 0.22;
  out.push(
    `<circle cx="${sx.toFixed(0)}" cy="${(H * 0.24).toFixed(0)}" r="72" fill="none" stroke="${a(s.a1, 0.5 * k * L)}" stroke-width="2"/>`,
    `<circle cx="${sx.toFixed(0)}" cy="${(H * 0.24).toFixed(0)}" r="56" fill="none" stroke="${a(s.signal, 0.4 * k * L)}" stroke-width="1" stroke-dasharray="4 6"/>`,
  );
  return out.join("");
}

/** R27 GOVERNMENT — open civic service architecture on an institutional grid. */
function civicService(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.36, punch: 1.15 })];
  // Institutional grid across the whole sheet — measured, public, open.
  for (let x = 0; x <= W; x += 80)
    out.push(`<path d="M${x} 0 V${H}" stroke="${a(contrastInk(s), 0.07 * k * L)}" stroke-width="1"/>`);
  for (let y = 0; y <= H; y += 80)
    out.push(`<path d="M0 ${y} H${W}" stroke="${a(contrastInk(s), 0.07 * k * L)}" stroke-width="1"/>`);
  // A low, wide civic canopy: slender piers under a light roof plane.
  const base = H * 0.72;
  const piers = 11;
  for (let i = 0; i < piers; i += 1) {
    const x = 90 + i * ((W - 180) / (piers - 1));
    out.push(
      `<rect x="${(x - 5).toFixed(0)}" y="${(H * 0.42).toFixed(0)}" width="10" height="${(base - H * 0.42).toFixed(0)}" fill="${a(mix(s.ink, s.surface, 0.5), 0.3 * k * L)}" stroke="${a(contrastInk(s), 0.22 * k * L)}" stroke-width="1"/>`,
    );
  }
  out.push(
    plane(c, { id: uid(c, "cvroof"), x: 60, y: H * 0.36, w: W - 120, h: 46, depth: 0.9, material: "stone", rim: "top", rimColor: s.a1 }),
    `<path d="M40 ${base} H${W - 40}" stroke="${a(contrastInk(s), 0.34 * k * L)}" stroke-width="2"/>`,
  );
  // Public-service modules: an even rank of open cards below the canopy.
  for (let i = 0; i < 5; i += 1) {
    const w = 170;
    const x = 90 + i * ((W - 180 - w) / 4);
    out.push(
      `<rect x="${x.toFixed(0)}" y="${(base + 26).toFixed(0)}" width="${w}" height="66" rx="6" fill="${a(s.a2, 0.14 * k * L)}" stroke="${a(i === 2 ? s.a1 : contrastInk(s), (i === 2 ? 0.6 : 0.26) * k * L)}" stroke-width="${i === 2 ? 1.8 : 1}"/>`,
      `<path d="M${(x + 14).toFixed(0)} ${(base + 78).toFixed(0)} h${(w - 28).toFixed(0)}" stroke="${a(s.signal, 0.4 * k * L)}" stroke-width="1.6"/>`,
    );
  }
  return out.join("");
}

/** R19 CPG / FOOD — layered tactile material strata and pack-form volumes. */
function materialStrata(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: c.dir > 0 ? W * 0.66 : W * 0.34, focusY: H * 0.3, punch: 1.25 })];
  // Ingredient strata: thick, warm, slightly irregular horizontal layers.
  let y = H * 0.42;
  for (let i = 0; i < 6; i += 1) {
    const h = 42 + (i % 3) * 18;
    const pts: Array<[number, number]> = [];
    for (let x = -40; x <= W + 40; x += 120) {
      pts.push([x, y + Math.sin(x / 260 + i) * 10]);
    }
    const tint = i % 3 === 0 ? s.a1 : i % 3 === 1 ? s.a2 : s.signal;
    out.push(
      `<path d="${spline(pts)} L${W + 40} ${(y + h).toFixed(0)} L-40 ${(y + h).toFixed(0)} Z" fill="${a(tint, (0.3 - i * 0.025) * k * L)}" stroke="${a(shade(tint, -0.2), 0.3 * k * L)}" stroke-width="1"/>`,
    );
    if (i % 2 === 0) out.push(hatch(c, { x: 0, y, w: W, h, step: 11, color: shade(tint, -0.3), alpha: 0.1, angle: 8 }));
    y += h;
  }
  // Pack-form abstractions: soft-shouldered vessels standing in the top third.
  const packs: Array<[number, number, number]> = [
    [c.dir > 0 ? W * 0.62 : W * 0.38, 128, 1],
    [c.dir > 0 ? W * 0.75 : W * 0.25, 90, 0.8],
    [c.dir > 0 ? W * 0.86 : W * 0.14, 150, 0.66],
  ];
  packs.forEach(([px, hgt, sc], i) => {
    const w = 86 * sc;
    const yTop = H * 0.42 - hgt;
    out.push(
      `<path d="M${(px - w / 2).toFixed(0)} ${(H * 0.42).toFixed(0)} V${(yTop + 26).toFixed(0)} q0 -26 ${(w / 2).toFixed(0)} -26 q${(w / 2).toFixed(0)} 0 ${(w / 2).toFixed(0)} 26 V${(H * 0.42).toFixed(0)} Z" fill="${a(i === 0 ? s.a1 : mix(s.a2, s.surface, 0.3), 0.4 * k * L)}" stroke="${a(shade(s.ink, -0.1), 0.36 * k * L)}" stroke-width="1.4"/>`,
      `<path d="M${(px - w / 2 + 6).toFixed(0)} ${(yTop + 40).toFixed(0)} V${(H * 0.42 - 10).toFixed(0)}" stroke="${a(shade(s.surface, 0.4), 0.5 * k * L)}" stroke-width="3" stroke-linecap="round"/>`,
      ground(c, px, H * 0.42 + 6, w * 2.2, 10),
    );
  });
  return out.join("");
}

/** R28 ESG — earth-system contours, ecosystem network, regenerative layers. */
function earthSystem(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const cx = c.dir > 0 ? W * 0.34 : W * 0.66;
  const cy = H * 0.52;
  const out = [atmosphere(c, { focusX: cx, focusY: cy, punch: 1.2 })];
  // Contour basin: closed loops, denser at the core, drifting off-axis.
  for (let i = 10; i >= 0; i -= 1) {
    const t = i / 10;
    const rr = 60 + t * 400;
    const pts: Array<[number, number]> = [];
    for (let ang = 0; ang <= 360; ang += 15) {
      const rad = (ang * Math.PI) / 180;
      const wob = 1 + Math.sin(rad * 3 + i * 0.6) * 0.1 + Math.sin(rad * 5 + i) * 0.05;
      pts.push([cx + Math.cos(rad) * rr * wob + t * 40, cy + Math.sin(rad) * rr * 0.7 * wob]);
    }
    pts.push(pts[0]!);
    out.push(
      `<path d="${spline(pts)}" fill="${i === 0 ? a(s.a1, 0.24 * k * L) : "none"}" stroke="${a(i % 3 === 0 ? s.a2 : s.a1, (0.36 - t * 0.16) * k * L)}" stroke-width="${i % 3 === 0 ? 1.8 : 1}"/>`,
    );
  }
  // Ecosystem network: sparse nodes linked across the basin.
  const eco: Array<[number, number]> = [];
  for (let i = 0; i < 7; i += 1) {
    const ang = (i / 7) * Math.PI * 2 + 0.6;
    eco.push([cx + Math.cos(ang) * (200 + (i % 3) * 90), cy + Math.sin(ang) * (140 + (i % 2) * 80)]);
  }
  eco.forEach((p, i) => {
    const q = eco[(i + 2) % eco.length]!;
    out.push(
      `<path d="M${p[0].toFixed(0)} ${p[1].toFixed(0)} L${q[0].toFixed(0)} ${q[1].toFixed(0)}" stroke="${a(s.a2, 0.26 * k * L)}" stroke-width="1"/>`,
      node(c, p[0], p[1], i % 3 === 0 ? 11 : 7, i % 3 === 0 ? s.signal : s.a2),
    );
  });
  // Regenerative strata at the base — evidence layers.
  for (let i = 0; i < 4; i += 1) {
    const y = H - 30 - i * 30;
    const pts: Array<[number, number]> = [];
    for (let x = -40; x <= W + 40; x += 150) pts.push([x, y - Math.sin(x / 320 + i) * 14]);
    out.push(
      `<path d="${spline(pts)}" fill="none" stroke="${a(i % 2 ? s.signal : contrastInk(s), (0.3 - i * 0.05) * k * L)}" stroke-width="1.4"/>`,
    );
  }
  return out.join("");
}

/* ════════════════════════════════════════ REMAINING SECTOR SIGNATURES */

/** R03 ANALYTICS — signal volume: layered waveform terrain and particle depth. */
function signalVolume(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: c.dir > 0 ? W * 0.3 : W * 0.7, focusY: H * 0.5 })];
  for (let i = 0; i < 9; i += 1) {
    const t = i / 9;
    const base = H * 0.28 + t * H * 0.52;
    const pts: Array<[number, number]> = [];
    for (let x = -40; x <= W + 40; x += 48) {
      pts.push([
        x,
        base + Math.sin((x / W) * Math.PI * (2.4 + t * 2) + t * 4 + c.take) * (56 - t * 26),
      ]);
    }
    const gid = uid(c, `sv${i}`);
    out.push(
      `<defs>${linear(gid, [
        { at: 0, color: a(s.a1, 0.04 * k * L) },
        { at: 0.5, color: a(i % 3 === 0 ? s.a2 : s.a1, (0.5 - t * 0.22) * k * L) },
        { at: 1, color: a(s.a2, 0.04 * k * L) },
      ])}</defs>`,
      `<path d="${spline(pts)}" fill="none" stroke="url(#${gid})" stroke-width="${(2.6 - t * 1.4).toFixed(1)}"/>`,
    );
  }
  for (let i = 0; i < 140; i += 1) {
    const bias = Math.pow(c.r(), 1.7);
    const x = c.dir > 0 ? bias * W : W - bias * W;
    const y = 90 + c.r() * (H - 160);
    out.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + c.r() * 2.6).toFixed(1)}" fill="${a(c.r() > 0.84 ? s.signal : s.a2, (0.12 + c.r() * 0.45) * k * L)}"/>`,
    );
  }
  out.push(bloom(c, c.dir > 0 ? W * 0.26 : W * 0.74, H * 0.5, 300, s.a1, 0.24));
  return out.join("");
}

/** R05 BANKING — vault ledger: institutional bands, gold rules, column stacks. */
function vaultLedger(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.34, punch: 0.9 })];
  // Vault door geometry, off-centre and deep.
  const vx = c.dir > 0 ? W * 0.74 : W * 0.26;
  for (let i = 0; i < 4; i += 1) {
    out.push(
      `<circle cx="${vx.toFixed(0)}" cy="${(H * 0.5).toFixed(0)}" r="${(112 + i * 44).toFixed(0)}" fill="${i === 0 ? a(s.deep, 0.5 * k) : "none"}" stroke="${a(i === 0 ? s.a1 : s.a2, (0.5 - i * 0.09) * k * L)}" stroke-width="${i === 0 ? 2.6 : 1.2}"/>`,
    );
  }
  for (let i = 0; i < 8; i += 1) {
    const ang = (i / 8) * Math.PI * 2;
    out.push(
      `<path d="M${(vx + Math.cos(ang) * 112).toFixed(0)} ${(H * 0.5 + Math.sin(ang) * 112).toFixed(0)} L${(vx + Math.cos(ang) * 244).toFixed(0)} ${(H * 0.5 + Math.sin(ang) * 244).toFixed(0)}" stroke="${a(s.a1, 0.24 * k * L)}" stroke-width="1"/>`,
    );
  }
  // Ledger bands with gold rules on the opposite third.
  const lx = c.dir > 0 ? 70 : W - 570;
  for (let i = 0; i < 7; i += 1) {
    const y = 108 + i * 72;
    out.push(
      `<rect x="${lx}" y="${y}" width="500" height="46" fill="${a(s.deep, 0.26 * k * L)}" stroke="${a(contrastInk(s), 0.16 * k * L)}" stroke-width="1"/>`,
      `<path d="M${lx} ${y + 46} h500" stroke="${a(s.a1, (0.6 - i * 0.06) * k * L)}" stroke-width="${i === 0 ? 2.2 : 1}"/>`,
      `<rect x="${lx + 14}" y="${y + 13}" width="${(60 + ((i * 71) % 180)).toFixed(0)}" height="20" fill="${a(s.a2, 0.22 * k * L)}"/>`,
    );
  }
  return out.join("");
}

/** R12 MANUFACTURING — isometric production cell with quality marks. */
function productionCell(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.34, punch: 1.05 })];
  const iso = (x: number, y: number, z = 0) =>
    [W * (c.dir > 0 ? 0.38 : 0.62) + (x - y) * 0.9, H * 0.42 + (x + y) * 0.44 - z] as const;
  for (let i = 0; i <= 10; i += 1) {
    const [ax, ay] = iso(i * 76, 0);
    const [bx, by] = iso(i * 76, 760);
    const [cx2, cy2] = iso(0, i * 76);
    const [dx, dy] = iso(760, i * 76);
    out.push(
      `<path d="M${ax.toFixed(0)} ${ay.toFixed(0)} L${bx.toFixed(0)} ${by.toFixed(0)}" stroke="${a(contrastInk(s), 0.1 * k * L)}" stroke-width="1"/>`,
      `<path d="M${cx2.toFixed(0)} ${cy2.toFixed(0)} L${dx.toFixed(0)} ${dy.toFixed(0)}" stroke="${a(contrastInk(s), 0.1 * k * L)}" stroke-width="1"/>`,
    );
  }
  // Line of machine volumes along one axis — a production line, not scattered.
  for (let i = 0; i < 6; i += 1) {
    const hgt = 60 + ((i * 53) % 90);
    const [tx, ty] = iso(i * 130, 120, hgt);
    const w = 58;
    out.push(
      `<polygon points="${tx},${ty} ${tx + w},${ty + w * 0.5} ${tx},${ty + w} ${tx - w},${ty + w * 0.5}" fill="${a(s.a2, 0.34 * k * L)}" stroke="${a(contrastInk(s), 0.34 * k * L)}" stroke-width="1"/>`,
      `<polygon points="${tx - w},${ty + w * 0.5} ${tx},${ty + w} ${tx},${ty + w + hgt} ${tx - w},${ty + w * 0.5 + hgt}" fill="${a(s.deep, 0.3 * k * L)}" stroke="${a(contrastInk(s), 0.24 * k * L)}" stroke-width="1"/>`,
      `<polygon points="${tx},${ty + w} ${tx + w},${ty + w * 0.5} ${tx + w},${ty + w * 0.5 + hgt} ${tx},${ty + w + hgt}" fill="${a(s.deep, 0.44 * k * L)}" stroke="${a(contrastInk(s), 0.24 * k * L)}" stroke-width="1"/>`,
    );
    if (i % 2 === 0)
      out.push(`<polygon points="${tx},${ty} ${tx + w},${ty + w * 0.5} ${tx},${ty + w} ${tx - w},${ty + w * 0.5}" fill="none" stroke="${a(s.signal, 0.75 * k * L)}" stroke-width="1.8"/>`);
  }
  // Conveyor path linking the cells.
  const [sx, sy] = iso(-60, 240);
  const [ex, ey] = iso(720, 240);
  out.push(litPath(c, `M${sx.toFixed(0)} ${sy.toFixed(0)} L${ex.toFixed(0)} ${ey.toFixed(0)}`, s.a1, 3, 0.55));
  return out.join("");
}

/** R15 AEROSPACE — orbital horizon with mission trajectories. */
function orbital(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const cx = c.dir > 0 ? W * 0.26 : W * 0.74;
  const cy = H * 1.28;
  const out = [atmosphere(c, { focusX: cx, focusY: H * 0.6, punch: 1 })];
  out.push(
    bloom(c, cx, H * 0.92, 620, s.a1, 0.3),
    `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="640" fill="${a(s.deep, 0.66 * k)}" stroke="${a(s.a1, 0.7 * k * L)}" stroke-width="2.4"/>`,
    `<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="686" fill="none" stroke="${a(s.a2, 0.24 * k * L)}" stroke-width="1"/>`,
  );
  for (let i = 0; i < 4; i += 1) {
    const rr = 720 + i * 70;
    out.push(
      `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rr}" ry="${(rr * (0.5 + i * 0.07)).toFixed(0)}" fill="none" stroke="${a(i % 2 ? s.a2 : contrastInk(s), 0.26 * k * L)}" stroke-width="1" stroke-dasharray="${i % 2 ? "10 12" : "2 8"}"/>`,
    );
  }
  // Instrument frame ticks along the top.
  for (let i = 0; i <= 26; i += 1) {
    const x = 60 + (i / 26) * (W - 120);
    out.push(`<path d="M${x.toFixed(0)} 70 v${i % 4 === 0 ? 18 : 9}" stroke="${a(contrastInk(s), 0.3 * k * L)}" stroke-width="1"/>`);
  }
  // Star field + a single tracked craft with a trajectory tail.
  for (let i = 0; i < 60; i += 1) {
    out.push(
      `<circle cx="${(c.r() * W).toFixed(0)}" cy="${(c.r() * H * 0.7).toFixed(0)}" r="${(0.6 + c.r() * 1.5).toFixed(1)}" fill="${a(s.ink, (0.2 + c.r() * 0.5) * k * L)}"/>`,
    );
  }
  const tx = c.dir > 0 ? W * 0.72 : W * 0.28;
  out.push(
    litPath(c, spline([[tx - 300, H * 0.44], [tx - 120, H * 0.3], [tx, H * 0.26]]), s.signal, 2, 0.6),
    `<polygon points="${tx},${(H * 0.26).toFixed(0)} ${(tx - 20).toFixed(0)},${(H * 0.29).toFixed(0)} ${(tx - 14).toFixed(0)},${(H * 0.25).toFixed(0)}" fill="${a(s.signal, 0.9 * k * L)}"/>`,
  );
  return out.join("");
}

/** R18 RETAIL — display architecture: lit product plinths and shelf datums. */
function displayArch(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const out = [atmosphere(c, { focusX: W * 0.5, focusY: H * 0.28, punch: 1.2 })];
  // Backdrop shelf datums.
  for (let i = 0; i < 3; i += 1) {
    const y = H * (0.3 + i * 0.16);
    out.push(
      `<path d="M60 ${y.toFixed(0)} H${W - 60}" stroke="${a(contrastInk(s), 0.2 * k * L)}" stroke-width="2"/>`,
      `<path d="M60 ${(y + 7).toFixed(0)} H${W - 60}" stroke="${a(s.a2, 0.16 * k * L)}" stroke-width="4"/>`,
    );
  }
  // Product volumes on plinths — three heroes plus a supporting rank.
  const heroes: Array<[number, number, number]> = [
    [W * 0.3, 190, 1],
    [W * 0.47, 250, 0.9],
    [W * 0.64, 150, 0.8],
  ];
  heroes.forEach(([x, hgt, sc], i) => {
    const w = 104 * sc;
    const yb = H * 0.78;
    out.push(
      bloom(c, x, yb - hgt * 0.6, 150, i === 1 ? s.a1 : s.a2, 0.26),
      plane(c, {
        id: uid(c, `pv${i}`),
        x: x - w / 2,
        y: yb - hgt,
        w,
        h: hgt,
        rx: i === 1 ? w / 2 : 10,
        depth: 0.9,
        material: i === 1 ? "glass" : "paper",
        tint: i === 1 ? s.a1 : undefined,
        rim: "left",
        rimColor: s.signal,
      }),
      `<rect x="${(x - w * 0.72).toFixed(0)}" y="${yb.toFixed(0)}" width="${(w * 1.44).toFixed(0)}" height="18" fill="${a(s.deep, 0.3 * k * L)}"/>`,
      ground(c, x, yb + 22, w * 2.4, 12),
    );
  });
  for (let i = 0; i < 8; i += 1) {
    const x = 90 + i * ((W - 180) / 7);
    out.push(
      `<rect x="${(x - 20).toFixed(0)}" y="${(H * 0.3 - 46).toFixed(0)}" width="40" height="46" rx="6" fill="${a(s.a2, 0.16 * k * L)}" stroke="${a(contrastInk(s), 0.22 * k * L)}" stroke-width="1"/>`,
    );
  }
  return out.join("");
}

/** R22 GAMING — neon grid horizon with angular energy shards. */
function neonHorizon(c: Ctx): string {
  const { s, k } = c;
  const L = lift(s);
  const hy = H * 0.44 + c.take * 10;
  const vpx = c.dir > 0 ? W * 0.4 : W * 0.6;
  const out = [atmosphere(c, { focusX: vpx, focusY: hy, punch: 1.1 })];
  for (let i = -14; i <= 14; i += 1) {
    out.push(
      `<path d="M${(vpx + i * 42).toFixed(0)} ${hy.toFixed(0)} L${(vpx + i * 260).toFixed(0)} ${H + 60}" stroke="${a(s.a1, 0.28 * k * L)}" stroke-width="1"/>`,
    );
  }
  for (let i = 1; i <= 9; i += 1) {
    const y = hy + (H + 60 - hy) * Math.pow(i / 9, 2.4);
    out.push(`<path d="M0 ${y.toFixed(0)} H${W}" stroke="${a(s.a2, 0.24 * k * L)}" stroke-width="1"/>`);
  }
  out.push(
    bloom(c, vpx, hy, 340, s.a2, 0.4),
    `<path d="M0 ${hy} H${W}" stroke="${a(s.a1, 0.85 * k * L)}" stroke-width="2.6"/>`,
  );
  for (let i = 0; i < 11; i += 1) {
    const x = c.r() * W;
    const hgt = 50 + c.r() * 230;
    const w = 20 + c.r() * 66;
    out.push(
      `<polygon points="${x.toFixed(0)},${(hy - hgt).toFixed(0)} ${(x + w).toFixed(0)},${(hy - hgt + w * 0.6).toFixed(0)} ${(x + w * 0.6).toFixed(0)},${hy} ${(x - w * 0.3).toFixed(0)},${hy}" fill="${a(i % 3 === 0 ? s.a2 : s.signal, 0.18 * k * L)}" stroke="${a(i % 2 ? s.a1 : s.a2, 0.55 * k * L)}" stroke-width="1.3"/>`,
    );
  }
  return out.join("");
}

/* ─────────────────────────────────────────────────────── signature registry */

export type SignatureId =
  | "atrium"
  | "serviceStack"
  | "signalVolume"
  | "liquidity"
  | "vaultLedger"
  | "coverageShells"
  | "secureZones"
  | "corridor"
  | "membrane"
  | "judicial"
  | "decisionArch"
  | "productionCell"
  | "energyGrid"
  | "aeroBody"
  | "orbital"
  | "coverageMesh"
  | "hubNetwork"
  | "displayArch"
  | "materialStrata"
  | "sculptural"
  | "lensSpace"
  | "neonHorizon"
  | "performanceLanes"
  | "horizonSpace"
  | "massing"
  | "inquiry"
  | "civicService"
  | "earthSystem"
  | "constellation"
  | "stageSpace";

export const SIGNATURES: Record<SignatureId, (c: Ctx) => string> = {
  atrium,
  serviceStack,
  signalVolume,
  liquidity,
  vaultLedger,
  coverageShells,
  secureZones,
  corridor,
  membrane,
  judicial,
  decisionArch,
  productionCell,
  energyGrid,
  aeroBody,
  orbital,
  coverageMesh,
  hubNetwork,
  displayArch,
  materialStrata,
  sculptural,
  lensSpace,
  neonHorizon,
  performanceLanes,
  horizonSpace,
  massing,
  inquiry,
  civicService,
  earthSystem,
  constellation,
  stageSpace,
};

/** One bespoke signature per industry recipe — no two codes share a scene. */
export const INDUSTRY_SIGNATURE: Record<string, SignatureId> = {
  R01: "atrium",
  R02: "serviceStack",
  R03: "signalVolume",
  R04: "liquidity",
  R05: "vaultLedger",
  R06: "coverageShells",
  R07: "secureZones",
  R08: "corridor",
  R09: "membrane",
  R10: "judicial",
  R11: "decisionArch",
  R12: "productionCell",
  R13: "energyGrid",
  R14: "aeroBody",
  R15: "orbital",
  R16: "coverageMesh",
  R17: "hubNetwork",
  R18: "displayArch",
  R19: "materialStrata",
  R20: "sculptural",
  R21: "lensSpace",
  R22: "neonHorizon",
  R23: "performanceLanes",
  R24: "horizonSpace",
  R25: "massing",
  R26: "inquiry",
  R27: "civicService",
  R28: "earthSystem",
  R29: "constellation",
  R30: "stageSpace",
};

/* ═══════════════════════════════════════ INDUSTRY-AWARE FAMILY TREATMENTS */

export type DataTreatment =
  | "pulses"
  | "evidence"
  | "telemetry"
  | "editorial"
  | "signalField"
  | "assurance";

export type FlowTreatment =
  | "propagation"
  | "lanes"
  | "people"
  | "journey"
  | "transmission"
  | "pathway";

/** DATA treatment per signature family — never one universal bar row. */
export const DATA_TREATMENT: Record<SignatureId, DataTreatment> = {
  atrium: "editorial",
  serviceStack: "telemetry",
  signalVolume: "signalField",
  liquidity: "pulses",
  vaultLedger: "pulses",
  coverageShells: "assurance",
  secureZones: "signalField",
  corridor: "evidence",
  membrane: "evidence",
  judicial: "assurance",
  decisionArch: "editorial",
  productionCell: "telemetry",
  energyGrid: "telemetry",
  aeroBody: "telemetry",
  orbital: "signalField",
  coverageMesh: "signalField",
  hubNetwork: "telemetry",
  displayArch: "pulses",
  materialStrata: "editorial",
  sculptural: "editorial",
  lensSpace: "editorial",
  neonHorizon: "signalField",
  performanceLanes: "telemetry",
  horizonSpace: "editorial",
  massing: "assurance",
  inquiry: "evidence",
  civicService: "assurance",
  earthSystem: "evidence",
  constellation: "people" as unknown as DataTreatment,
  stageSpace: "signalField",
};

/** FLOW treatment per signature family. */
export const FLOW_TREATMENT: Record<SignatureId, FlowTreatment> = {
  atrium: "pathway",
  serviceStack: "propagation",
  signalVolume: "propagation",
  liquidity: "lanes",
  vaultLedger: "lanes",
  coverageShells: "pathway",
  secureZones: "propagation",
  corridor: "pathway",
  membrane: "pathway",
  judicial: "pathway",
  decisionArch: "pathway",
  productionCell: "lanes",
  energyGrid: "transmission",
  aeroBody: "lanes",
  orbital: "transmission",
  coverageMesh: "propagation",
  hubNetwork: "lanes",
  displayArch: "journey",
  materialStrata: "journey",
  sculptural: "journey",
  lensSpace: "journey",
  neonHorizon: "propagation",
  performanceLanes: "lanes",
  horizonSpace: "journey",
  massing: "pathway",
  inquiry: "people",
  civicService: "people",
  earthSystem: "transmission",
  constellation: "people",
  stageSpace: "journey",
};

/* ───────────────────────────────────────────────────── DATA treatment art */

export function dataTreatment(c: Ctx, id: DataTreatment): string {
  const { s, k } = c;
  const L = lift(s);
  const out: string[] = [];
  const baseY = H - 96;
  const mx = c.dir > 0 ? 70 : W - 70;
  switch (id) {
    case "pulses": {
      // Transaction pulses: short lit dashes travelling a pair of rails.
      for (let row = 0; row < 2; row += 1) {
        const y = baseY - row * 44;
        out.push(`<path d="M70 ${y} H${W - 70}" stroke="${a(contrastInk(s), 0.14 * k * L)}" stroke-width="1"/>`);
        for (let i = 0; i < 7; i += 1) {
          const x = 90 + i * ((W - 200) / 7) + (row ? 30 : 0);
          out.push(
            `<rect x="${x.toFixed(0)}" y="${(y - 3).toFixed(0)}" width="${(18 + ((i * 29) % 46)).toFixed(0)}" height="6" rx="3" fill="${a(i % 4 === 0 ? s.signal : s.a1, 0.6 * k * L)}"/>`,
          );
        }
      }
      break;
    }
    case "evidence": {
      // Clinical evidence bands: soft confidence intervals, no bars.
      for (let i = 0; i < 3; i += 1) {
        const y = baseY - i * 52;
        const w = W - 260 - i * 90;
        const x = c.dir > 0 ? 80 : W - 80 - w;
        out.push(
          `<rect x="${x.toFixed(0)}" y="${(y - 9).toFixed(0)}" width="${w.toFixed(0)}" height="18" rx="9" fill="${a(s.a2, 0.16 * k * L)}"/>`,
          `<path d="M${(x + w * 0.62).toFixed(0)} ${(y - 15).toFixed(0)} v30" stroke="${a(i === 0 ? s.signal : s.a1, 0.66 * k * L)}" stroke-width="2"/>`,
        );
      }
      break;
    }
    case "telemetry": {
      // Production telemetry: a fine tick ladder and a tolerance corridor.
      out.push(
        `<path d="M70 ${baseY} H${W - 70}" stroke="${a(contrastInk(s), 0.16 * k * L)}" stroke-width="1"/>`,
        `<rect x="70" y="${(baseY - 74).toFixed(0)}" width="${W - 140}" height="34" fill="${a(s.a2, 0.08 * k * L)}" stroke="${a(s.a2, 0.24 * k * L)}" stroke-width="1" stroke-dasharray="6 8"/>`,
      );
      for (let i = 0; i <= 26; i += 1) {
        const x = 70 + (i / 26) * (W - 140);
        out.push(
          `<path d="M${x.toFixed(0)} ${baseY} v${i % 4 === 0 ? -14 : -7}" stroke="${a(contrastInk(s), 0.22 * k * L)}" stroke-width="1"/>`,
        );
      }
      break;
    }
    case "editorial": {
      // Minimal editorial metric field: one rule, two measure marks.
      out.push(`<path d="M${mx} ${baseY} h${c.dir > 0 ? 180 : -180}" stroke="${a(s.a1, 0.4 * k * L)}" stroke-width="2"/>`);
      for (let i = 1; i <= 2; i += 1) {
        out.push(
          `<path d="M${mx} ${(baseY - i * 78).toFixed(0)} h${c.dir > 0 ? 30 : -30}" stroke="${a(contrastInk(s), 0.2 * k * L)}" stroke-width="1"/>`,
        );
      }
      break;
    }
    case "signalField": {
      // Diagnostic signal field: a sparse scatter with one traced envelope.
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 9; i += 1) {
        const x = 90 + (i / 9) * (W - 180);
        const y = baseY - 26 - Math.abs(Math.sin(i * 1.1 + c.take)) * 96;
        pts.push([x, y]);
        out.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="3.4" fill="${a(s.a2, 0.6 * k * L)}"/>`);
      }
      out.push(`<path d="${spline(pts)}" fill="none" stroke="${a(s.a1, 0.4 * k * L)}" stroke-width="1.4"/>`);
      break;
    }
    case "assurance":
    default: {
      // Coverage assurance: nested boundary brackets, no plotted series.
      for (let i = 0; i < 3; i += 1) {
        const inset = 84 + i * 30;
        out.push(
          `<path d="M${inset} ${baseY} v-${(40 + i * 16).toFixed(0)} M${W - inset} ${baseY} v-${(40 + i * 16).toFixed(0)}" stroke="${a(i === 0 ? s.a1 : contrastInk(s), (0.4 - i * 0.1) * k * L)}" stroke-width="${i === 0 ? 2 : 1}"/>`,
        );
      }
      out.push(`<path d="M84 ${baseY} H${W - 84}" stroke="${a(contrastInk(s), 0.16 * k * L)}" stroke-width="1"/>`);
      break;
    }
  }
  return out.join("");
}

/* ───────────────────────────────────────────────────── FLOW treatment art */

export function flowTreatment(c: Ctx, id: FlowTreatment): string {
  const { s, k } = c;
  const L = lift(s);
  const out: string[] = [];
  const y = H * 0.68;
  const from = c.dir > 0 ? 110 : W - 110;
  const to = c.dir > 0 ? W - 110 : 110;
  switch (id) {
    case "propagation": {
      // Network propagation: concentric reach from an origin, not a spline.
      const ox = c.dir > 0 ? W * 0.24 : W * 0.76;
      for (let i = 1; i <= 5; i += 1) {
        out.push(
          `<ellipse cx="${ox.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(i * 118).toFixed(0)}" ry="${(i * 46).toFixed(0)}" fill="none" stroke="${a(i === 1 ? s.a1 : s.a2, (0.5 - i * 0.08) * k * L)}" stroke-width="${i === 1 ? 2 : 1.2}"/>`,
        );
      }
      for (let i = 0; i < 5; i += 1) {
        const x = ox + (c.dir > 0 ? 1 : -1) * (120 + i * 190);
        out.push(node(c, x, y + Math.sin(i * 1.4) * 60, i === 2 ? 12 : 7, i === 2 ? s.signal : s.a2));
      }
      break;
    }
    case "lanes": {
      // Routing lanes: parallel directional lanes with chevrons and hubs.
      for (let lane = 0; lane < 3; lane += 1) {
        const ly = y - 70 + lane * 70;
        out.push(
          `<path d="M${from} ${ly} H${to}" stroke="${a(lane === 1 ? s.a1 : contrastInk(s), (lane === 1 ? 0.5 : 0.2) * k * L)}" stroke-width="${lane === 1 ? 2.4 : 1.2}"/>`,
        );
        for (let i = 0; i < 5; i += 1) {
          const x = from + (to - from) * (0.12 + i * 0.19);
          const sgn = c.dir > 0 ? 1 : -1;
          out.push(
            `<path d="M${(x - sgn * 9).toFixed(0)} ${(ly - 7).toFixed(0)} L${(x + sgn * 9).toFixed(0)} ${ly} L${(x - sgn * 9).toFixed(0)} ${(ly + 7).toFixed(0)}" fill="none" stroke="${a(lane === 1 ? s.signal : s.a2, 0.55 * k * L)}" stroke-width="1.6"/>`,
          );
        }
      }
      out.push(node(c, from, y, 15, s.a1), node(c, to, y, 15, s.signal));
      break;
    }
    case "people": {
      // Connected people pathways: rounded capsule nodes on soft arcs.
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 4; i += 1) {
        pts.push([from + ((to - from) * i) / 4, y - 40 + Math.sin(i * 1.25 + c.take) * 62]);
      }
      out.push(`<path d="${spline(pts)}" fill="none" stroke="${a(s.a1, 0.42 * k * L)}" stroke-width="2.2"/>`);
      pts.forEach(([px, py], i) => {
        const col = i === 4 ? s.signal : i % 2 ? s.a2 : s.a1;
        out.push(
          `<circle cx="${px.toFixed(0)}" cy="${(py - 15).toFixed(0)}" r="7" fill="${a(col, 0.7 * k * L)}"/>`,
          `<path d="M${(px - 14).toFixed(0)} ${(py + 10).toFixed(0)} a14 13 0 0 1 28 0 Z" fill="${a(col, 0.32 * k * L)}" stroke="${a(col, 0.7 * k * L)}" stroke-width="1.4"/>`,
        );
      });
      break;
    }
    case "journey": {
      // Attendee/journey light path: a beam-lit route with waypoint glows.
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 5; i += 1) {
        pts.push([from + ((to - from) * i) / 5, y - 20 + Math.sin(i * 0.9 + c.take) * 74]);
      }
      const d = spline(pts);
      out.push(litPath(c, d, s.a1, 3, 0.7));
      pts.forEach(([px, py], i) => {
        if (i % 2) return;
        out.push(bloom(c, px, py, 74, i === 4 ? s.signal : s.a2, 0.4), node(c, px, py, 9, i === 4 ? s.signal : s.a2));
      });
      break;
    }
    case "transmission": {
      // Grid transmission: a trunk line with tapped spurs and load nodes.
      out.push(`<path d="M${from} ${y} H${to}" stroke="${a(s.a1, 0.55 * k * L)}" stroke-width="3"/>`);
      for (let i = 0; i < 6; i += 1) {
        const x = from + (to - from) * (0.08 + i * 0.17);
        const up = i % 2 === 0;
        const ty = y + (up ? -84 : 76);
        out.push(
          `<path d="M${x.toFixed(0)} ${y} V${ty.toFixed(0)} h${c.dir > 0 ? 42 : -42}" fill="none" stroke="${a(s.a2, 0.42 * k * L)}" stroke-width="1.4"/>`,
          node(c, x + (c.dir > 0 ? 42 : -42), ty, i === 2 ? 11 : 7, i === 2 ? s.signal : s.a2),
        );
      }
      break;
    }
    case "pathway":
    default: {
      // Spatial pathway: a single confident route with a destination marker.
      const pts: Array<[number, number]> = [
        [from, y + 60],
        [from + (to - from) * 0.34, y - 30],
        [from + (to - from) * 0.68, y + 26],
        [to, y - 54],
      ];
      out.push(litPath(c, spline(pts), s.a1, 2.6, 0.6));
      out.push(
        node(c, from, y + 60, 10, s.a2),
        node(c, to, y - 54, 14, s.signal),
        `<circle cx="${to}" cy="${(y - 54).toFixed(0)}" r="26" fill="none" stroke="${a(s.signal, 0.34 * k * L)}" stroke-width="1"/>`,
      );
      break;
    }
  }
  return out.join("");
}
