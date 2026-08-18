/**
 * INDUSTRY SCENE ART — the authored artwork layer for R01–R30.
 *
 * The procedural gradient engine in `skin-backgrounds.ts` stays exactly where it
 * is, but it is now only the UNDERLAY. The primary read of an industry
 * background is a deterministic, hand-parametrised VECTOR SCENE drawn here and
 * handed back as an inline-SVG background layer, so a card no longer reads as
 * "same blurred field, different colour".
 *
 * Rules for this artwork:
 *   • no readable text, no fake UI, no charts with legible values, no logos,
 *     no photography, no people;
 *   • stylised industry-relevant FORM is welcome and wanted — architecture,
 *     molecular lattices, production isometrics, route lanes, orbital geometry,
 *     topographic contours, stage light, commerce volumes;
 *   • rule-of-thirds: every scene keeps a headline third clear;
 *   • four scene families per industry, each strongly differentiated:
 *       HERO     cinematic / spatial, full scene
 *       CONTENT  calmer structural environment, 55–70% quiet field
 *       DATA     restrained signal geometry over a quiet environment
 *       FLOW     directional pathway / route composition
 *   • four deterministic takes per family (mirror, anchor, rhythm, depth).
 *
 * Everything is pure and seeded, so screen and PPTX/PDF/PNG exports match.
 */

import { SCENE_TIER, type SceneTier, type SkinScene } from "./skin-backgrounds";

/* ────────────────────────────────────────────────────────── palette + seed */

export type SceneKind =
  | "architecture"
  | "techSystem"
  | "dataField"
  | "rails"
  | "ledger"
  | "clinical"
  | "molecular"
  | "isometric"
  | "contour"
  | "aero"
  | "orbital"
  | "commerce"
  | "cinematic"
  | "neonGrid"
  | "organic"
  | "civic";

interface ArtSpec {
  kind: SceneKind;
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

/**
 * Per-industry art direction. Authored, never derived: the colour story and the
 * scene family are the two things that make a sector instantly readable.
 */
export const INDUSTRY_ART: Record<string, ArtSpec> = {
  R01: { kind: "architecture", surface: "#F3F6FB", deep: "#0A2342", ink: "#0A2342", a1: "#0150EF", a2: "#5CE1E6", signal: "#FFB347", dark: false, density: 1 },
  R02: { kind: "techSystem", surface: "#07101F", deep: "#040A14", ink: "#8FB2FF", a1: "#4F7CFF", a2: "#7C5CFF", signal: "#5CE1E6", dark: true, density: 1.2 },
  R03: { kind: "dataField", surface: "#080D1E", deep: "#04060F", ink: "#B9CBFF", a1: "#49A8FF", a2: "#A78BFA", signal: "#E7F0FF", dark: true, density: 1.3 },
  R04: { kind: "rails", surface: "#0B1030", deep: "#050723", ink: "#C6D4FF", a1: "#3B5BFF", a2: "#28D9D0", signal: "#FF7A5C", dark: true, density: 1.1 },
  R05: { kind: "ledger", surface: "#0E1420", deep: "#070B12", ink: "#E8DFC8", a1: "#C8A75A", a2: "#8FA6C4", signal: "#F2E3B6", dark: true, density: 0.9 },
  R06: { kind: "clinical", surface: "#EEF3F7", deep: "#0E2A47", ink: "#123A5C", a1: "#1D63A8", a2: "#2E9E7B", signal: "#0E2A47", dark: false, density: 0.9 },
  R07: { kind: "techSystem", surface: "#050A0C", deep: "#020506", ink: "#7FE3C6", a1: "#25E6C0", a2: "#3AA0FF", signal: "#FF5C4D", dark: true, density: 1.3 },
  R08: { kind: "clinical", surface: "#F2F9FA", deep: "#0B3B4A", ink: "#0E4657", a1: "#159FBF", a2: "#4FC9A6", signal: "#0B3B4A", dark: false, density: 0.8 },
  R09: { kind: "molecular", surface: "#F6F8FC", deep: "#141B3C", ink: "#26305C", a1: "#3ABEC7", a2: "#9B8CFA", signal: "#26305C", dark: false, density: 1.2 },
  R10: { kind: "civic", surface: "#F6F2EA", deep: "#1B1D22", ink: "#26282E", a1: "#6B1F2E", a2: "#1F3757", signal: "#A88451", dark: false, density: 0.95 },
  R11: { kind: "architecture", surface: "#FBFCFE", deep: "#0B1B33", ink: "#12233D", a1: "#0B4CE0", a2: "#5A7BB5", signal: "#0B4CE0", dark: false, density: 1.05 },
  R12: { kind: "isometric", surface: "#EDF1F5", deep: "#16283C", ink: "#1D3category", a1: "#20415F", a2: "#6E8AA6", signal: "#F2A31C", dark: false, density: 1.25 },
  R13: { kind: "contour", surface: "#08222A", deep: "#04141A", ink: "#9FD9CF", a1: "#12A88C", a2: "#2F7FB8", signal: "#B6F26B", dark: true, density: 1.15 },
  R14: { kind: "aero", surface: "#0A0C10", deep: "#04050A", ink: "#C3CBD8", a1: "#8B98AC", a2: "#3C7BFF", signal: "#E5372B", dark: true, density: 1 },
  R15: { kind: "orbital", surface: "#071528", deep: "#030A16", ink: "#BBD3EA", a1: "#3EA6D9", a2: "#7F94AC", signal: "#E9F4FF", dark: true, density: 1.05 },
  R16: { kind: "techSystem", surface: "#08122E", deep: "#040919", ink: "#BCD0FF", a1: "#2F6BFF", a2: "#38D2E6", signal: "#9B6BFF", dark: true, density: 1.35 },
  R17: { kind: "rails", surface: "#101823", deep: "#080D14", ink: "#C4CFDC", a1: "#3B6E9E", a2: "#8B9BAD", signal: "#F0A32A", dark: true, density: 1.2 },
  R18: { kind: "commerce", surface: "#FAF7F2", deep: "#12251E", ink: "#1B3229", a1: "#0F7A57", a2: "#C29B6B", signal: "#E0653F", dark: false, density: 1.1 },
  R19: { kind: "organic", surface: "#FBF5E9", deep: "#2B3520", ink: "#3A3323", a1: "#6B8F3E", a2: "#E08A2C", signal: "#C2571F", dark: false, density: 1.05 },
  R20: { kind: "architecture", surface: "#F7F2EC", deep: "#221C18", ink: "#2C241E", a1: "#B08A5C", a2: "#DFC7BA", signal: "#8A6A3E", dark: false, density: 0.75 },
  R21: { kind: "cinematic", surface: "#08070B", deep: "#030204", ink: "#EDE7F5", a1: "#E1263C", a2: "#8B4CE6", signal: "#FFFFFF", dark: true, density: 1.05 },
  R22: { kind: "neonGrid", surface: "#0A0721", deep: "#050313", ink: "#CDBBFF", a1: "#25E5F0", a2: "#F0359B", signal: "#8A5CFF", dark: true, density: 1.3 },
  R23: { kind: "aero", surface: "#0C0C0E", deep: "#050506", ink: "#EDEDED", a1: "#E1252B", a2: "#22C9E6", signal: "#FFFFFF", dark: true, density: 1.25 },
  R24: { kind: "contour", surface: "#EEF6F5", deep: "#0C3B41", ink: "#12474C", a1: "#2A9A96", a2: "#D9C29A", signal: "#0C3B41", dark: false, density: 0.95 },
  R25: { kind: "architecture", surface: "#F4F1EC", deep: "#2A2E33", ink: "#33383E", a1: "#7A6A57", a2: "#4E6377", signal: "#B08A5C", dark: false, density: 1.1 },
  R26: { kind: "molecular", surface: "#F8F4EC", deep: "#152743", ink: "#1E3050", a1: "#0F4FC4", a2: "#8B6BE0", signal: "#E8A020", dark: false, density: 1.05 },
  R27: { kind: "civic", surface: "#F4F7FB", deep: "#0E2647", ink: "#153458", a1: "#1552A8", a2: "#7C93B4", signal: "#C0A053", dark: false, density: 1 },
  R28: { kind: "organic", surface: "#F5F1E6", deep: "#1E3327", ink: "#2B3B2E", a1: "#2F6B4A", a2: "#3FA9A0", signal: "#C4643A", dark: false, density: 1.1 },
  R29: { kind: "rails", surface: "#FBF6F1", deep: "#1B2A44", ink: "#25344C", a1: "#2A63C4", a2: "#9B7FE0", signal: "#EE7A5F", dark: false, density: 1 },
  R30: { kind: "cinematic", surface: "#08072A", deep: "#03021A", ink: "#DCE4FF", a1: "#3A5CFF", a2: "#25D8E6", signal: "#B98BFF", dark: true, density: 1.2 },
};

// Guard against a typo'd hex ever reaching the renderer.
INDUSTRY_ART["R12"]!.ink = "#1D3145";

const W = 1280;
const H = 720;

function rng(seedStr: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function a(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(f.slice(0, 2), 16);
  const g = parseInt(f.slice(2, 4), 16);
  const b = parseInt(f.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

/** Tier loudness for the artwork itself (the gradient underlay keeps its own). */
const TIER_ALPHA: Record<SceneTier, number> = {
  hero: 1,
  content: 0.6,
  data: 0.46,
  flow: 0.68,
};

interface Ctx {
  s: ArtSpec;
  tier: SceneTier;
  take: number;
  /** 1 = mass on the left third, -1 = mirrored to the right. */
  dir: number;
  /** Global artwork alpha for the tier. */
  k: number;
  r: () => number;
  d: number;
}

/* ───────────────────────────────────────────────────────── scene generators */

function architecture(c: Ctx): string {
  const { s, k, d } = c;
  const vpx = c.dir > 0 ? 880 : 400;
  const vpy = 300 + c.take * 18;
  const out: string[] = [];
  // Far light wash from the vanishing point.
  out.push(
    `<radialGradient id="vp" cx="${(vpx / W) * 100}%" cy="${(vpy / H) * 100}%" r="70%"><stop offset="0" stop-color="${a(s.a2, 0.5 * k)}"/><stop offset="1" stop-color="${a(s.a2, 0)}"/></radialGradient>`,
  );
  const defs = out.splice(0);
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#vp)"/>`];
  // Floor lines converging.
  for (let i = 0; i <= 14; i += 1) {
    const x = (i / 14) * W;
    body.push(
      `<path d="M${x} ${H} L${vpx} ${vpy}" stroke="${a(s.ink, 0.1 * k)}" stroke-width="1" fill="none"/>`,
    );
  }
  for (let i = 1; i <= 6; i += 1) {
    const t = i / 7;
    const y = vpy + (H - vpy) * Math.pow(t, 2.1);
    body.push(`<path d="M0 ${y.toFixed(1)} H${W}" stroke="${a(s.ink, 0.09 * k)}" stroke-width="1"/>`);
  }
  // Glass planes: tall mullioned slabs stepping into depth.
  const planes = Math.round(4 * d);
  for (let i = 0; i < planes; i += 1) {
    const depth = i / Math.max(1, planes - 1);
    const w = 190 - depth * 90;
    const x = c.dir > 0 ? 40 + i * (w * 0.82) : W - 40 - i * (w * 0.82) - w;
    const top = 90 + depth * 130 + (c.take % 2) * 20;
    const bottom = H - 60 - depth * 60;
    body.push(
      `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${(bottom - top).toFixed(1)}" fill="${a(s.deep, (0.16 + depth * 0.1) * k)}" stroke="${a(s.ink, 0.18 * k)}" stroke-width="1"/>`,
    );
    const cols = 4;
    for (let m = 1; m < cols; m += 1) {
      const mx = x + (w / cols) * m;
      body.push(
        `<path d="M${mx.toFixed(1)} ${top.toFixed(1)} V${bottom.toFixed(1)}" stroke="${a(s.ink, 0.12 * k)}" stroke-width="1"/>`,
      );
    }
    const rows = 8;
    for (let m = 1; m < rows; m += 1) {
      const my = top + ((bottom - top) / rows) * m;
      body.push(
        `<path d="M${x.toFixed(1)} ${my.toFixed(1)} H${(x + w).toFixed(1)}" stroke="${a(s.ink, 0.08 * k)}" stroke-width="1"/>`,
      );
    }
    if (i % 2 === 0) {
      body.push(
        `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="3" height="${(bottom - top).toFixed(1)}" fill="${a(s.a1, 0.5 * k)}"/>`,
      );
    }
  }
  return `<defs>${defs.join("")}</defs>${body.join("")}`;
}

function techSystem(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  const cols = Math.round(9 * d);
  const rows = Math.round(5 * d);
  const cw = W / cols;
  const ch = H / rows;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (c.r() > 0.72) continue;
      const px = x * cw + 8;
      const py = y * ch + 8;
      const w = cw * (c.r() > 0.7 ? 2 : 1) - 16;
      const h = ch - 16;
      const lit = c.r() > 0.78;
      body.push(
        `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${Math.max(12, w).toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${a(s.deep, 0.5 * k)}" stroke="${a(lit ? s.a1 : s.ink, (lit ? 0.55 : 0.16) * k)}" stroke-width="${lit ? 1.6 : 1}"/>`,
      );
      if (lit) {
        body.push(
          `<rect x="${px.toFixed(1)}" y="${(py + h - 3).toFixed(1)}" width="${Math.max(12, w).toFixed(1)}" height="2.5" fill="${a(s.a2, 0.75 * k)}"/>`,
        );
      }
    }
  }
  // Luminous seams: orthogonal traces linking blocks.
  const seams = Math.round(9 * d);
  for (let i = 0; i < seams; i += 1) {
    const y = Math.round(c.r() * rows) * ch;
    const x0 = Math.round(c.r() * cols) * cw;
    const x1 = Math.min(W, x0 + (1 + Math.floor(c.r() * 4)) * cw);
    const y1 = Math.max(0, Math.min(H, y + (c.r() > 0.5 ? ch : -ch)));
    body.push(
      `<path d="M${x0.toFixed(0)} ${y.toFixed(0)} H${x1.toFixed(0)} V${y1.toFixed(0)}" stroke="${a(i % 3 === 0 ? s.a2 : s.a1, 0.4 * k)}" stroke-width="1.5" fill="none"/>`,
      `<circle cx="${x1.toFixed(0)}" cy="${y1.toFixed(0)}" r="3.5" fill="${a(s.signal, 0.7 * k)}"/>`,
    );
  }
  return body.join("");
}

function dataField(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  const waves = Math.round(11 * d);
  for (let i = 0; i < waves; i += 1) {
    const t = i / waves;
    const base = 180 + t * 420;
    const amp = 44 + Math.sin(t * 3 + c.take) * 26;
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 32) {
      const y = base + Math.sin((x / W) * Math.PI * (2 + c.take * 0.4) + t * 2.4) * amp * (1 - t * 0.4);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    body.push(
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${a(i % 3 === 0 ? s.a2 : s.a1, (0.34 - t * 0.14) * k)}" stroke-width="${(2.2 - t).toFixed(1)}"/>`,
    );
  }
  // Particle volume, denser toward the mass third.
  const dots = Math.round(160 * d);
  for (let i = 0; i < dots; i += 1) {
    const bias = Math.pow(c.r(), 1.6);
    const x = c.dir > 0 ? bias * W : W - bias * W;
    const y = 120 + c.r() * (H - 200);
    const rr = 0.8 + c.r() * 2.4;
    body.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${a(c.r() > 0.8 ? s.signal : s.ink, (0.1 + c.r() * 0.4) * k)}"/>`,
    );
  }
  return body.join("");
}

function rails(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  const ribbons = Math.round(6 * d);
  for (let i = 0; i < ribbons; i += 1) {
    const t = i / ribbons;
    const y0 = 120 + t * 460;
    const y1 = 200 + (1 - t) * 380;
    const cw = 0.45 + c.r() * 0.3;
    const dir = c.dir > 0 ? 1 : -1;
    const path =
      dir > 0
        ? `M-40 ${y0.toFixed(0)} C ${(W * cw).toFixed(0)} ${(y0 - 140).toFixed(0)}, ${(W * (1 - cw * 0.5)).toFixed(0)} ${(y1 + 120).toFixed(0)}, ${W + 40} ${y1.toFixed(0)}`
        : `M${W + 40} ${y0.toFixed(0)} C ${(W * (1 - cw)).toFixed(0)} ${(y0 - 140).toFixed(0)}, ${(W * cw * 0.5).toFixed(0)} ${(y1 + 120).toFixed(0)}, -40 ${y1.toFixed(0)}`;
    body.push(
      `<path d="${path}" fill="none" stroke="${a(i % 2 ? s.a2 : s.a1, (0.42 - t * 0.16) * k)}" stroke-width="${(9 - i).toFixed(1)}" stroke-linecap="round"/>`,
      `<path d="${path}" fill="none" stroke="${a(s.ink, 0.12 * k)}" stroke-width="1"/>`,
    );
  }
  // Nodes / hubs on the lanes.
  const nodes = Math.round(11 * d);
  for (let i = 0; i < nodes; i += 1) {
    const x = 70 + c.r() * (W - 140);
    const y = 140 + c.r() * (H - 260);
    const rr = 5 + c.r() * 14;
    const hot = c.r() > 0.82;
    body.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="${a(hot ? s.signal : s.a1, 0.2 * k)}" stroke="${a(hot ? s.signal : s.ink, 0.5 * k)}" stroke-width="1.4"/>`,
    );
    if (hot)
      body.push(
        `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(rr + 9).toFixed(1)}" fill="none" stroke="${a(s.signal, 0.28 * k)}" stroke-width="1"/>`,
      );
  }
  return body.join("");
}

function ledger(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  // Institutional bands with fine rules and tall columns.
  const bands = Math.round(6 * d);
  for (let i = 0; i < bands; i += 1) {
    const y = 90 + i * ((H - 150) / bands);
    const h = (H - 150) / bands - 12;
    body.push(
      `<rect x="${c.dir > 0 ? 60 : 300}" y="${y.toFixed(0)}" width="${(W - 360).toFixed(0)}" height="${h.toFixed(0)}" fill="${a(s.deep, 0.22 * k)}"/>`,
      `<path d="M${c.dir > 0 ? 60 : 300} ${(y + h).toFixed(0)} h${(W - 360).toFixed(0)}" stroke="${a(s.a1, (0.5 - i * 0.05) * k)}" stroke-width="${i === 0 ? 2 : 1}"/>`,
    );
  }
  const cols = Math.round(7 * d);
  for (let i = 0; i < cols; i += 1) {
    const x = c.dir > 0 ? W - 300 + i * 40 : 60 + i * 40;
    const top = 120 + ((i * 53 + c.take * 31) % 200);
    body.push(
      `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="18" height="${(H - 90 - top).toFixed(0)}" fill="${a(s.a2, 0.18 * k)}" stroke="${a(s.ink, 0.22 * k)}" stroke-width="1"/>`,
      `<rect x="${x.toFixed(0)}" y="${top.toFixed(0)}" width="18" height="4" fill="${a(s.a1, 0.7 * k)}"/>`,
    );
  }
  return body.join("");
}

function clinical(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  // Luminous corridor: nested arches receding, soft translucent care layers.
  const arches = Math.round(6 * d);
  for (let i = 0; i < arches; i += 1) {
    const t = i / arches;
    const w = 900 - t * 620;
    const h = 560 - t * 380;
    const cx = c.dir > 0 ? 470 + t * 140 : W - 470 - t * 140;
    body.push(
      `<path d="M${(cx - w / 2).toFixed(0)} ${H - 60} V${(H - 60 - h * 0.55).toFixed(0)} A${(w / 2).toFixed(0)} ${(h * 0.45).toFixed(0)} 0 0 1 ${(cx + w / 2).toFixed(0)} ${(H - 60 - h * 0.55).toFixed(0)} V${H - 60} Z" fill="${a(s.a1, (0.05 + t * 0.05) * k)}" stroke="${a(s.a1, (0.4 - t * 0.2) * k)}" stroke-width="1.4"/>`,
    );
  }
  const pills = Math.round(7 * d);
  for (let i = 0; i < pills; i += 1) {
    const y = 120 + i * 78;
    const w = 180 + c.r() * 320;
    const x = c.dir > 0 ? W - 60 - w : 60;
    body.push(
      `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="34" rx="17" fill="${a(i % 3 === 0 ? s.a2 : s.a1, 0.14 * k)}" stroke="${a(s.a2, 0.3 * k)}" stroke-width="1"/>`,
    );
  }
  body.push(
    `<circle cx="${c.dir > 0 ? 300 : 980}" cy="200" r="${(120 + c.take * 12).toFixed(0)}" fill="none" stroke="${a(s.a2, 0.28 * k)}" stroke-width="1.6"/>`,
  );
  return body.join("");
}

function molecular(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  // Hex membrane lattice.
  const R = 46 / Math.max(0.7, d);
  for (let row = -1; row * R * 1.5 < H + R; row += 1) {
    for (let col = -1; col * R * 1.73 < W + R; col += 1) {
      const cx = col * R * 1.73 + (row % 2 ? R * 0.87 : 0);
      const cy = row * R * 1.5;
      const pts: string[] = [];
      for (let i = 0; i < 6; i += 1) {
        const ang = (Math.PI / 3) * i + Math.PI / 6;
        pts.push(`${(cx + Math.cos(ang) * R).toFixed(1)},${(cy + Math.sin(ang) * R).toFixed(1)}`);
      }
      const near = c.dir > 0 ? cx < W * 0.55 : cx > W * 0.45;
      body.push(
        `<polygon points="${pts.join(" ")}" fill="none" stroke="${a(s.ink, (near ? 0.16 : 0.07) * k)}" stroke-width="1"/>`,
      );
    }
  }
  // Molecule cluster: bonded nodes.
  const n = Math.round(13 * d);
  const cx0 = c.dir > 0 ? 400 : 880;
  const nodes: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i += 1) {
    const ang = (i / n) * Math.PI * 2 + c.take * 0.5;
    const rad = 80 + c.r() * 190;
    nodes.push([cx0 + Math.cos(ang) * rad, 360 + Math.sin(ang) * rad * 0.7, 6 + c.r() * 16]);
  }
  for (let i = 0; i < nodes.length; i += 1) {
    const [x, y, rr] = nodes[i]!;
    const [nx, ny] = nodes[(i + 1) % nodes.length]!;
    body.push(
      `<path d="M${x.toFixed(0)} ${y.toFixed(0)} L${nx.toFixed(0)} ${ny.toFixed(0)}" stroke="${a(s.a1, 0.3 * k)}" stroke-width="1.3"/>`,
    );
    body.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(1)}" fill="${a(i % 3 === 0 ? s.a2 : s.a1, 0.3 * k)}" stroke="${a(s.ink, 0.3 * k)}" stroke-width="1"/>`,
    );
  }
  return body.join("");
}

function isometric(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  const iso = (x: number, y: number, z = 0) => [x - y, (x + y) * 0.5 - z] as const;
  const ox = c.dir > 0 ? 320 : 940;
  const oy = 250;
  const step = 74 / Math.max(0.8, d);
  // Blueprint iso grid.
  for (let i = 0; i <= 12; i += 1) {
    const [ax, ay] = iso(i * step, 0);
    const [bx, by] = iso(i * step, 12 * step);
    const [cx, cy] = iso(0, i * step);
    const [dx, dy] = iso(12 * step, i * step);
    body.push(
      `<path d="M${(ox + ax).toFixed(0)} ${(oy + ay).toFixed(0)} L${(ox + bx).toFixed(0)} ${(oy + by).toFixed(0)}" stroke="${a(s.ink, 0.1 * k)}" stroke-width="1"/>`,
      `<path d="M${(ox + cx).toFixed(0)} ${(oy + cy).toFixed(0)} L${(ox + dx).toFixed(0)} ${(oy + dy).toFixed(0)}" stroke="${a(s.ink, 0.1 * k)}" stroke-width="1"/>`,
    );
  }
  // Production volumes.
  const count = Math.round(9 * d);
  for (let i = 0; i < count; i += 1) {
    const gx = Math.floor(c.r() * 9) * step;
    const gy = Math.floor(c.r() * 9) * step;
    const hgt = 30 + c.r() * 96;
    const w = step;
    const [tx, ty] = iso(gx, gy, hgt);
    const top = `${ox + tx},${oy + ty} ${ox + tx + w},${oy + ty + w * 0.5} ${ox + tx},${oy + ty + w} ${ox + tx - w},${oy + ty + w * 0.5}`;
    body.push(
      `<polygon points="${top}" fill="${a(s.a2, 0.3 * k)}" stroke="${a(s.ink, 0.3 * k)}" stroke-width="1"/>`,
      `<polygon points="${ox + tx - w},${oy + ty + w * 0.5} ${ox + tx},${oy + ty + w} ${ox + tx},${oy + ty + w + hgt} ${ox + tx - w},${oy + ty + w * 0.5 + hgt}" fill="${a(s.deep, 0.24 * k)}" stroke="${a(s.ink, 0.24 * k)}" stroke-width="1"/>`,
      `<polygon points="${ox + tx},${oy + ty + w} ${ox + tx + w},${oy + ty + w * 0.5} ${ox + tx + w},${oy + ty + w * 0.5 + hgt} ${ox + tx},${oy + ty + w + hgt}" fill="${a(s.deep, 0.34 * k)}" stroke="${a(s.ink, 0.24 * k)}" stroke-width="1"/>`,
    );
    if (i % 3 === 0)
      body.push(
        `<polygon points="${top}" fill="none" stroke="${a(s.signal, 0.6 * k)}" stroke-width="1.6"/>`,
      );
  }
  return body.join("");
}

function contour(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  const lines = Math.round(20 * d);
  for (let i = 0; i < lines; i += 1) {
    const t = i / lines;
    const pts: string[] = [];
    for (let x = 0; x <= W; x += 24) {
      const p = x / W;
      const y =
        180 +
        t * 460 +
        Math.sin(p * Math.PI * 2.2 + t * 3 + c.take * 0.7) * (60 - t * 26) +
        Math.sin(p * Math.PI * 5.3 + t * 1.4) * 16 * (1 - t);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    body.push(
      `<polyline points="${pts.join(" ")}" fill="none" stroke="${a(i % 5 === 0 ? s.a1 : s.ink, (i % 5 === 0 ? 0.4 : 0.16) * k)}" stroke-width="${i % 5 === 0 ? 1.8 : 1}"/>`,
    );
  }
  // Infrastructure markers standing in the terrain.
  const pylons = Math.round(4 * d);
  for (let i = 0; i < pylons; i += 1) {
    const x = c.dir > 0 ? 140 + i * 190 : W - 140 - i * 190;
    const top = 150 + c.r() * 120;
    body.push(
      `<path d="M${x} ${top.toFixed(0)} V${H - 90}" stroke="${a(s.a2, 0.5 * k)}" stroke-width="1.6"/>`,
      `<circle cx="${x}" cy="${top.toFixed(0)}" r="6" fill="${a(s.signal, 0.7 * k)}"/>`,
      `<path d="M${x - 34} ${(top + 34).toFixed(0)} H${x + 34}" stroke="${a(s.a2, 0.4 * k)}" stroke-width="1.2"/>`,
    );
  }
  return body.join("");
}

function aero(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  // Aerodynamic body: long tapering curves.
  const shells = Math.round(5 * d);
  for (let i = 0; i < shells; i += 1) {
    const t = i / shells;
    const y = 250 + t * 200;
    const path =
      c.dir > 0
        ? `M-60 ${(y + 150).toFixed(0)} C 340 ${(y - 60 - t * 40).toFixed(0)}, 860 ${(y - 100).toFixed(0)}, ${W + 60} ${(y + 40 + t * 60).toFixed(0)}`
        : `M${W + 60} ${(y + 150).toFixed(0)} C 940 ${(y - 60 - t * 40).toFixed(0)}, 420 ${(y - 100).toFixed(0)}, -60 ${(y + 40 + t * 60).toFixed(0)}`;
    body.push(
      `<path d="${path}" fill="none" stroke="${a(i === 0 ? s.a2 : s.ink, (0.5 - t * 0.28) * k)}" stroke-width="${(3.4 - t * 2).toFixed(1)}"/>`,
    );
  }
  // Speed blades.
  const blades = Math.round(16 * d);
  for (let i = 0; i < blades; i += 1) {
    const y = 90 + c.r() * (H - 180);
    const len = 90 + c.r() * 420;
    const x = c.dir > 0 ? c.r() * (W - len) : W - len - c.r() * (W - len);
    const th = 2 + c.r() * 7;
    const hot = c.r() > 0.86;
    body.push(
      `<path d="M${x.toFixed(0)} ${y.toFixed(0)} l${len.toFixed(0)} ${(-len * 0.12).toFixed(0)}" stroke="${a(hot ? s.signal : s.a1, (hot ? 0.7 : 0.24) * k)}" stroke-width="${th.toFixed(1)}" stroke-linecap="round"/>`,
    );
  }
  return body.join("");
}

function orbital(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  const cx = c.dir > 0 ? 300 : 980;
  const cy = 860;
  // Planetary horizon.
  body.push(
    `<circle cx="${cx}" cy="${cy}" r="620" fill="${a(s.deep, 0.5 * k)}" stroke="${a(s.a1, 0.55 * k)}" stroke-width="2"/>`,
    `<circle cx="${cx}" cy="${cy}" r="668" fill="none" stroke="${a(s.a1, 0.2 * k)}" stroke-width="1"/>`,
  );
  // Mission trajectories.
  const arcs = Math.round(4 * d);
  for (let i = 0; i < arcs; i += 1) {
    const rr = 700 + i * 64;
    body.push(
      `<ellipse cx="${cx}" cy="${cy}" rx="${rr}" ry="${(rr * (0.5 + i * 0.06)).toFixed(0)}" fill="none" stroke="${a(i % 2 ? s.a2 : s.ink, 0.24 * k)}" stroke-width="1" stroke-dasharray="${i % 2 ? "10 12" : "2 8"}"/>`,
    );
  }
  // Schematic tick frame + crosshair markers.
  for (let i = 0; i < Math.round(26 * d); i += 1) {
    const x = 60 + (i / 26) * (W - 120);
    body.push(`<path d="M${x.toFixed(0)} 80 v${i % 4 === 0 ? 16 : 8}" stroke="${a(s.ink, 0.28 * k)}" stroke-width="1"/>`);
  }
  const marks = Math.round(4 * d);
  for (let i = 0; i < marks; i += 1) {
    const x = 200 + c.r() * (W - 400);
    const y = 140 + c.r() * 240;
    body.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="14" fill="none" stroke="${a(s.signal, 0.5 * k)}" stroke-width="1"/>`,
      `<path d="M${(x - 26).toFixed(0)} ${y.toFixed(0)} h52 M${x.toFixed(0)} ${(y - 26).toFixed(0)} v52" stroke="${a(s.signal, 0.35 * k)}" stroke-width="1"/>`,
    );
  }
  return body.join("");
}

function commerce(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  // Modular commerce volumes: product zones and display planes.
  const cols = Math.round(6 * d);
  const rows = 3;
  for (let x = 0; x < cols; x += 1) {
    for (let y = 0; y < rows; y += 1) {
      if (c.r() > 0.78) continue;
      const w = (W - 160) / cols - 18;
      const h = (H - 220) / rows - 18;
      const px = 80 + x * ((W - 160) / cols);
      const py = 130 + y * ((H - 220) / rows);
      const fill = c.r() > 0.7 ? s.a1 : c.r() > 0.4 ? s.a2 : s.deep;
      const round = c.r() > 0.6;
      body.push(
        `<rect x="${px.toFixed(0)}" y="${py.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="${round ? Math.min(w, h) / 2 : 8}" fill="${a(fill, 0.2 * k)}" stroke="${a(s.ink, 0.2 * k)}" stroke-width="1"/>`,
      );
      if (c.r() > 0.66)
        body.push(
          `<path d="M${px.toFixed(0)} ${(py + h).toFixed(0)} h${w.toFixed(0)}" stroke="${a(s.signal, 0.55 * k)}" stroke-width="2.4"/>`,
        );
    }
  }
  // Shelf datum lines.
  for (let y = 1; y < rows; y += 1) {
    const yy = 130 + y * ((H - 220) / rows) - 9;
    body.push(`<path d="M40 ${yy.toFixed(0)} H${W - 40}" stroke="${a(s.ink, 0.16 * k)}" stroke-width="1"/>`);
  }
  return body.join("");
}

function cinematic(c: Ctx): string {
  const { s, k, d } = c;
  const defs: string[] = [];
  const body: string[] = [];
  const bx = c.dir > 0 ? 340 : 940;
  defs.push(
    `<radialGradient id="beam" cx="${((bx / W) * 100).toFixed(0)}%" cy="0%" r="95%"><stop offset="0" stop-color="${a(s.a2, 0.55 * k)}"/><stop offset="0.55" stop-color="${a(s.a1, 0.22 * k)}"/><stop offset="1" stop-color="${a(s.a1, 0)}"/></radialGradient>`,
  );
  body.push(`<rect width="${W}" height="${H}" fill="url(#beam)"/>`);
  // Stage light shafts.
  const shafts = Math.round(9 * d);
  for (let i = 0; i < shafts; i += 1) {
    const spread = 90 + c.r() * 220;
    const foot = bx + (c.r() - 0.5) * 1500;
    body.push(
      `<polygon points="${bx},-40 ${(foot - spread).toFixed(0)},${H + 40} ${(foot + spread).toFixed(0)},${H + 40}" fill="${a(i % 3 === 0 ? s.a1 : s.a2, 0.07 * k)}"/>`,
    );
  }
  // Prismatic frame + bokeh.
  body.push(
    `<rect x="70" y="60" width="${W - 140}" height="${H - 120}" fill="none" stroke="${a(s.ink, 0.2 * k)}" stroke-width="1"/>`,
    `<rect x="88" y="78" width="${W - 176}" height="${H - 156}" fill="none" stroke="${a(s.a1, 0.24 * k)}" stroke-width="1"/>`,
  );
  for (let i = 0; i < Math.round(24 * d); i += 1) {
    const x = c.r() * W;
    const y = 120 + c.r() * (H - 200);
    const rr = 4 + c.r() * 34;
    body.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="${a(c.r() > 0.7 ? s.signal : s.a2, 0.09 * k)}" stroke="${a(s.a2, 0.14 * k)}" stroke-width="1"/>`,
    );
  }
  return `<defs>${defs.join("")}</defs>${body.join("")}`;
}

function neonGrid(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  const hy = 300 + c.take * 14;
  const vpx = c.dir > 0 ? 520 : 760;
  // Perspective floor.
  for (let i = -14; i <= 14; i += 1) {
    body.push(
      `<path d="M${(vpx + i * 44).toFixed(0)} ${hy} L${(vpx + i * 260).toFixed(0)} ${H + 60}" stroke="${a(s.a1, 0.28 * k)}" stroke-width="1"/>`,
    );
  }
  for (let i = 1; i <= 9; i += 1) {
    const y = hy + (H + 60 - hy) * Math.pow(i / 9, 2.4);
    body.push(`<path d="M0 ${y.toFixed(0)} H${W}" stroke="${a(s.a2, 0.22 * k)}" stroke-width="1"/>`);
  }
  body.push(
    `<path d="M0 ${hy} H${W}" stroke="${a(s.a1, 0.75 * k)}" stroke-width="2.4"/>`,
    `<path d="M0 ${hy - 6} H${W}" stroke="${a(s.a2, 0.2 * k)}" stroke-width="8"/>`,
  );
  // Angular energy shards above the horizon.
  const shards = Math.round(12 * d);
  for (let i = 0; i < shards; i += 1) {
    const x = c.r() * W;
    const h = 40 + c.r() * 210;
    const w = 18 + c.r() * 70;
    body.push(
      `<polygon points="${x.toFixed(0)},${(hy - h).toFixed(0)} ${(x + w).toFixed(0)},${(hy - h + w * 0.6).toFixed(0)} ${(x + w * 0.6).toFixed(0)},${hy} ${(x - w * 0.3).toFixed(0)},${hy}" fill="${a(i % 3 === 0 ? s.a2 : s.signal, 0.16 * k)}" stroke="${a(i % 2 ? s.a1 : s.a2, 0.45 * k)}" stroke-width="1.2"/>`,
    );
  }
  return body.join("");
}

function organic(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  // Earth-system contours in soft closed loops.
  const rings = Math.round(9 * d);
  const cx = c.dir > 0 ? 420 : 860;
  for (let i = 0; i < rings; i += 1) {
    const t = i / rings;
    const rr = 70 + t * 420;
    const pts: string[] = [];
    for (let ang = 0; ang <= 360; ang += 12) {
      const rad = (ang * Math.PI) / 180;
      const wob = 1 + Math.sin(rad * 3 + i * 0.8 + c.take) * 0.09 + Math.sin(rad * 5) * 0.05;
      pts.push(`${(cx + Math.cos(rad) * rr * wob).toFixed(1)},${(370 + Math.sin(rad) * rr * 0.72 * wob).toFixed(1)}`);
    }
    body.push(
      `<polygon points="${pts.join(" ")}" fill="${i === 0 ? a(s.a1, 0.18 * k) : "none"}" stroke="${a(i % 3 === 0 ? s.a2 : s.a1, (0.34 - t * 0.16) * k)}" stroke-width="${i % 3 === 0 ? 1.8 : 1}"/>`,
    );
  }
  // Layered evidence strata at the base.
  for (let i = 0; i < Math.round(5 * d); i += 1) {
    const y = H - 40 - i * 34;
    body.push(
      `<path d="M0 ${y} C 320 ${(y - 22).toFixed(0)}, 900 ${(y + 20).toFixed(0)}, ${W} ${(y - 12).toFixed(0)}" fill="none" stroke="${a(i % 2 ? s.signal : s.ink, 0.2 * k)}" stroke-width="1.4"/>`,
    );
  }
  return body.join("");
}

function civic(c: Ctx): string {
  const { s, k, d } = c;
  const body: string[] = [];
  // Institutional colonnade abstracted: rhythm of columns + entablature.
  const cols = Math.round(9 * d);
  const gap = (W - 200) / cols;
  const top = 170;
  const base = H - 120;
  for (let i = 0; i < cols; i += 1) {
    const x = 100 + i * gap;
    body.push(
      `<rect x="${x.toFixed(0)}" y="${top}" width="${(gap * 0.42).toFixed(0)}" height="${base - top}" fill="${a(s.deep, 0.14 * k)}" stroke="${a(s.ink, 0.2 * k)}" stroke-width="1"/>`,
      `<path d="M${x.toFixed(0)} ${top} h${(gap * 0.42).toFixed(0)}" stroke="${a(s.a1, 0.4 * k)}" stroke-width="2"/>`,
    );
  }
  body.push(
    `<rect x="70" y="${top - 42}" width="${W - 140}" height="26" fill="${a(s.a2, 0.2 * k)}" stroke="${a(s.ink, 0.24 * k)}" stroke-width="1"/>`,
    `<path d="M70 ${base} H${W - 70}" stroke="${a(s.ink, 0.3 * k)}" stroke-width="2"/>`,
    `<path d="M40 ${base + 26} H${W - 40}" stroke="${a(s.signal, 0.45 * k)}" stroke-width="1.4"/>`,
  );
  // Service grid in the upper third, kept out of the headline zone side.
  const gx = c.dir > 0 ? W - 420 : 60;
  for (let r0 = 0; r0 < 3; r0 += 1) {
    for (let c0 = 0; c0 < 4; c0 += 1) {
      body.push(
        `<rect x="${gx + c0 * 88}" y="${40 + r0 * 34}" width="72" height="20" fill="none" stroke="${a(s.ink, 0.16 * k)}" stroke-width="1"/>`,
      );
    }
  }
  return body.join("");
}

const GENERATORS: Record<SceneKind, (c: Ctx) => string> = {
  architecture,
  techSystem,
  dataField,
  rails,
  ledger,
  clinical,
  molecular,
  isometric,
  contour,
  aero,
  orbital,
  commerce,
  cinematic,
  neonGrid,
  organic,
  civic,
};

/* ─────────────────────────────────────────────────── family modifier layers */

/** DATA tier: restrained signal geometry — no legible values, no fake chart. */
function signalOverlay(c: Ctx): string {
  const { s, d } = c;
  const k = 0.9;
  const body: string[] = [];
  const n = Math.round(9 * d);
  const x0 = c.dir > 0 ? 90 : W - 90 - n * 52;
  for (let i = 0; i < n; i += 1) {
    const h = 40 + ((i * 67 + c.take * 41) % 200);
    body.push(
      `<rect x="${(x0 + i * 52).toFixed(0)}" y="${(H - 110 - h).toFixed(0)}" width="20" height="${h}" fill="${a(i % 4 === 3 ? s.signal : s.a1, (i % 4 === 3 ? 0.5 : 0.26) * k)}"/>`,
    );
  }
  body.push(
    `<path d="M60 ${H - 110} H${W - 60}" stroke="${a(s.ink, 0.3 * k)}" stroke-width="1.4"/>`,
    `<path d="M60 ${H - 260} H${W - 60}" stroke="${a(s.ink, 0.12 * k)}" stroke-width="1" stroke-dasharray="4 10"/>`,
  );
  return body.join("");
}

/** FLOW tier: a directional route across the sheet with stage markers. */
function routeOverlay(c: Ctx): string {
  const { s } = c;
  const k = 0.95;
  const y = 470;
  const from = c.dir > 0 ? 90 : W - 90;
  const to = c.dir > 0 ? W - 90 : 90;
  const body: string[] = [
    `<path d="M${from} ${y} C ${(from + (to - from) * 0.35).toFixed(0)} ${y - 120}, ${(from + (to - from) * 0.65).toFixed(0)} ${y + 110}, ${to} ${y - 30}" fill="none" stroke="${a(s.a1, 0.5 * k)}" stroke-width="3"/>`,
  ];
  for (let i = 0; i <= 4; i += 1) {
    const x = from + ((to - from) * i) / 4;
    const yy = y - 30 + Math.sin(i * 1.3 + c.take) * 60;
    body.push(
      `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="${i === 4 ? 15 : 10}" fill="${a(i === 4 ? s.signal : s.surface, 0.9 * k)}" stroke="${a(i === 4 ? s.signal : s.a2, 0.85 * k)}" stroke-width="2"/>`,
      `<path d="M${x.toFixed(0)} ${(yy + 26).toFixed(0)} v54" stroke="${a(s.ink, 0.22 * k)}" stroke-width="1"/>`,
    );
  }
  return body.join("");
}

/** CONTENT tier: keeps 55–70% of the sheet as a calm reading field. */
function calmField(c: Ctx): string {
  const { s } = c;
  const x = c.dir > 0 ? W * 0.36 : 0;
  return `<rect x="${x.toFixed(0)}" y="0" width="${(W * 0.64).toFixed(0)}" height="${H}" fill="${a(s.surface, 0.62)}"/>`;
}

/** HERO: keeps the headline third readable without flattening the scene. */
function heroClear(c: Ctx): string {
  const { s } = c;
  const x = c.dir > 0 ? W * 0.42 : 0;
  return `<rect x="${x.toFixed(0)}" y="0" width="${(W * 0.58).toFixed(0)}" height="${(H * 0.52).toFixed(0)}" fill="${a(s.surface, 0.3)}"/>`;
}

/* ───────────────────────────────────────────────────────────────── assembly */

function svgFor(code: string, scene: SkinScene, take: number): string | null {
  const s = INDUSTRY_ART[code.toUpperCase()];
  if (!s) return null;
  const tier = SCENE_TIER[scene] ?? "content";
  const t = ((take % 4) + 4) % 4;
  const r = rng(`${code}|${scene}|${t}`);
  const c: Ctx = {
    s,
    tier,
    take: t,
    dir: t % 2 === 0 ? 1 : -1,
    k: TIER_ALPHA[tier],
    r,
    d: s.density * (tier === "hero" ? 1 : tier === "content" ? 0.8 : 0.7),
  };
  const scene0 = GENERATORS[s.kind](c);
  const overlay =
    tier === "data"
      ? calmField(c) + signalOverlay(c)
      : tier === "flow"
        ? routeOverlay(c)
        : tier === "content"
          ? calmField(c)
          : heroClear(c);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">` +
    scene0 +
    overlay +
    `</svg>`;
  return svg;
}

const cache = new Map<string, string[]>();

/**
 * The authored artwork layers for one industry scene, front-most first.
 * Empty when `code` is not an industry recipe (S01–S28 keep their own art).
 */
export function industrySceneLayers(
  code: string | null | undefined,
  scene: SkinScene,
  take = 0,
): string[] {
  if (!code) return [];
  const key = `${code}|${scene}|${take}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const svg = svgFor(code, scene, take);
  if (!svg) return [];
  const layer = `url("data:image/svg+xml,${encodeURIComponent(svg)}") center center / cover no-repeat`;
  const out = [layer];
  cache.set(key, out);
  return out;
}

/** True when this code has authored industry scene art. */
export function hasIndustrySceneArt(code: string | null | undefined): boolean {
  return Boolean(code && INDUSTRY_ART[code.toUpperCase()]);
}

/** The authored scene kind, for studio/debug captions. */
export function industrySceneKind(code: string | null | undefined): SceneKind | null {
  return code ? (INDUSTRY_ART[code.toUpperCase()]?.kind ?? null) : null;
}
