// LinkedIn banner gradient engine.
//
// Recreates the approved TransPerfect corporate/enterprise social banner
// look-and-feel (soft mesh gradients: aqua/lavender light washes and deep
// navy glows) as a deterministic, procedural system. Same recipe in, same
// pixels out — so a banner can be previewed in the DOM and exported as a
// real PNG at LinkedIn's 1584x396 spec.

export const LI_BANNER_W = 1584;
export const LI_BANNER_H = 396;

export type BannerMode = "light" | "dark";

export type BannerBlob = {
  /** 0..1 of width / height. */
  x: number;
  y: number;
  /** Radius as a fraction of width. */
  r: number;
  color: string;
  alpha: number;
};

export type BannerRecipe = {
  id: string;
  name: string;
  family: BannerFamily;
  mode: BannerMode;
  /** Horizontal base gradient stops (offset 0..1). */
  base: { at: number; color: string }[];
  /** Base gradient angle in degrees (0 = left→right). */
  angle: number;
  blobs: BannerBlob[];
  /** Headline row colors: [line 1, line 2 start, line 2 end]. */
  ink: { line1: string; line2From: string; line2To: string; wordmark: string };
};

export type BannerFamily = "light-mesh" | "pastel-dome" | "navy-glow" | "band-sweep";

export const BANNER_FAMILIES: { id: BannerFamily; label: string; blurb: string }[] = [
  {
    id: "light-mesh",
    label: "Light mesh",
    blurb: "Lavender → aqua wash on the left, dissolving into paper white. Dark or blue headline.",
  },
  {
    id: "pastel-dome",
    label: "Pastel dome",
    blurb: "Full-bleed aqua/lavender field with a soft dome arc. White headline.",
  },
  {
    id: "navy-glow",
    label: "Navy glow",
    blurb: "Deep navy field with an aqua or blue glow anchored left. White + aqua headline.",
  },
  {
    id: "band-sweep",
    label: "Band sweep",
    blurb: "Aqua → blue → navy → violet horizontal sweep. Reads strongest at large sizes.",
  },
];

// Approved palette (brand v3.0).
export const P = {
  blue500: "#003FC7",
  blue800: "#03002C",
  aqua: "#A1FBF9",
  lavender: "#C2A3FF",
  sky: "#5BA8F7",
  paper: "#F4F4F6",
  white: "#FFFFFF",
  ice: "#E0E8F5",
  violet: "#6C5BE0",
} as const;

/** The nine authored reference banners (the approved set). */
export const APPROVED_BANNERS: BannerRecipe[] = [
  {
    id: "li-01",
    name: "Aurora Light · blue accent",
    family: "light-mesh",
    mode: "light",
    angle: 0,
    base: [
      { at: 0, color: P.lavender },
      { at: 0.28, color: P.aqua },
      { at: 0.62, color: P.paper },
      { at: 1, color: "#F7FAF9" },
    ],
    blobs: [
      { x: 0.05, y: 0.35, r: 0.28, color: P.lavender, alpha: 0.85 },
      { x: 0.26, y: 0.55, r: 0.3, color: P.aqua, alpha: 0.8 },
      { x: 0.55, y: 0.3, r: 0.3, color: P.white, alpha: 0.7 },
    ],
    ink: { line1: P.blue500, line2From: P.blue800, line2To: P.blue800, wordmark: P.blue800 },
  },
  {
    id: "li-02",
    name: "Aurora Light · dark accent",
    family: "light-mesh",
    mode: "light",
    angle: 0,
    base: [
      { at: 0, color: P.lavender },
      { at: 0.3, color: P.aqua },
      { at: 0.64, color: P.paper },
      { at: 1, color: "#F6F6F8" },
    ],
    blobs: [
      { x: 0.04, y: 0.4, r: 0.3, color: P.lavender, alpha: 0.9 },
      { x: 0.24, y: 0.5, r: 0.32, color: P.aqua, alpha: 0.75 },
      { x: 0.6, y: 0.4, r: 0.3, color: P.white, alpha: 0.75 },
    ],
    ink: { line1: P.blue800, line2From: P.blue500, line2To: P.lavender, wordmark: P.blue800 },
  },
  {
    id: "li-03",
    name: "Deep Navy · aqua beam",
    family: "navy-glow",
    mode: "dark",
    angle: 0,
    base: [
      { at: 0, color: "#8FE7FA" },
      { at: 0.22, color: "#2E86E8" },
      { at: 0.55, color: "#0A1E6B" },
      { at: 1, color: P.blue800 },
    ],
    blobs: [
      { x: 0.06, y: 0.42, r: 0.24, color: "#B6F2FF", alpha: 0.85 },
      { x: 0.34, y: 0.6, r: 0.3, color: P.blue500, alpha: 0.5 },
      { x: 0.82, y: 0.4, r: 0.35, color: P.blue800, alpha: 0.7 },
    ],
    ink: { line1: P.white, line2From: P.aqua, line2To: P.aqua, wordmark: P.white },
  },
  {
    id: "li-04",
    name: "Deep Navy · violet fade",
    family: "navy-glow",
    mode: "dark",
    angle: 0,
    base: [
      { at: 0, color: "#A8D4FA" },
      { at: 0.18, color: "#6E8BF0" },
      { at: 0.45, color: "#1B1B7A" },
      { at: 1, color: "#050427" },
    ],
    blobs: [
      { x: 0.02, y: 0.4, r: 0.22, color: "#BFE0FF", alpha: 0.8 },
      { x: 0.22, y: 0.7, r: 0.28, color: P.violet, alpha: 0.45 },
      { x: 0.75, y: 0.45, r: 0.4, color: "#050427", alpha: 0.75 },
    ],
    ink: { line1: P.white, line2From: P.aqua, line2To: P.lavender, wordmark: P.white },
  },
  {
    id: "li-05",
    name: "Pastel Dome",
    family: "pastel-dome",
    mode: "dark",
    angle: 20,
    base: [
      { at: 0, color: "#7FE6F4" },
      { at: 0.4, color: "#8FB6F0" },
      { at: 0.75, color: "#8E8CE0" },
      { at: 1, color: "#6F76C8" },
    ],
    blobs: [
      { x: 0.5, y: 0.95, r: 0.55, color: P.lavender, alpha: 0.55 },
      { x: 0.15, y: 0.05, r: 0.3, color: P.aqua, alpha: 0.65 },
      { x: 0.9, y: 0.1, r: 0.3, color: "#7FE6F4", alpha: 0.5 },
    ],
    ink: { line1: P.white, line2From: P.white, line2To: P.aqua, wordmark: P.white },
  },
  {
    id: "li-06",
    name: "Band Sweep · violet tail",
    family: "band-sweep",
    mode: "dark",
    angle: 0,
    base: [
      { at: 0, color: "#9DEEFB" },
      { at: 0.2, color: "#2C7FE6" },
      { at: 0.45, color: "#071243" },
      { at: 0.72, color: "#12309C" },
      { at: 1, color: "#7B5BF0" },
    ],
    blobs: [
      { x: 0.08, y: 0.35, r: 0.24, color: "#BDF4FF", alpha: 0.75 },
      { x: 0.45, y: 0.5, r: 0.22, color: "#050427", alpha: 0.6 },
      { x: 0.98, y: 0.5, r: 0.28, color: "#8B6BFF", alpha: 0.6 },
    ],
    ink: { line1: P.white, line2From: P.aqua, line2To: P.aqua, wordmark: P.white },
  },
  {
    id: "li-07",
    name: "Deep Navy · blue beam",
    family: "navy-glow",
    mode: "dark",
    angle: 0,
    base: [
      { at: 0, color: "#8DE4FA" },
      { at: 0.2, color: "#2079E4" },
      { at: 0.5, color: "#0A1A5E" },
      { at: 1, color: "#060531" },
    ],
    blobs: [
      { x: 0.05, y: 0.35, r: 0.26, color: "#AFEFFF", alpha: 0.8 },
      { x: 0.62, y: 0.6, r: 0.3, color: P.violet, alpha: 0.28 },
      { x: 0.9, y: 0.5, r: 0.3, color: "#060531", alpha: 0.6 },
    ],
    ink: { line1: P.white, line2From: P.lavender, line2To: P.aqua, wordmark: P.white },
  },
  {
    id: "li-08",
    name: "Deep Navy · soft edge",
    family: "navy-glow",
    mode: "dark",
    angle: 0,
    base: [
      { at: 0, color: "#93E9FB" },
      { at: 0.16, color: "#2C86EC" },
      { at: 0.42, color: "#0B1C63" },
      { at: 1, color: "#060531" },
    ],
    blobs: [
      { x: 0.03, y: 0.3, r: 0.3, color: "#B7F2FF", alpha: 0.8 },
      { x: 0.3, y: 0.75, r: 0.26, color: P.blue500, alpha: 0.4 },
      { x: 0.72, y: 0.5, r: 0.4, color: "#060531", alpha: 0.8 },
    ],
    ink: { line1: P.white, line2From: P.lavender, line2To: P.white, wordmark: P.white },
  },
  {
    id: "li-09",
    name: "Aurora Light · gradient headline",
    family: "light-mesh",
    mode: "light",
    angle: 0,
    base: [
      { at: 0, color: P.lavender },
      { at: 0.26, color: "#B3F6F7" },
      { at: 0.6, color: "#F2F2F5" },
      { at: 1, color: "#F5F7F6" },
    ],
    blobs: [
      { x: 0.06, y: 0.45, r: 0.28, color: P.lavender, alpha: 0.8 },
      { x: 0.28, y: 0.45, r: 0.3, color: P.aqua, alpha: 0.7 },
      { x: 0.62, y: 0.5, r: 0.32, color: P.white, alpha: 0.8 },
    ],
    ink: { line1: P.blue800, line2From: P.blue800, line2To: P.lavender, wordmark: P.blue800 },
  },
];

/* ------------------------------------------------------------------ */
/* Procedural expansion                                                */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Generate a new on-brand recipe in a family. Deterministic per (family, seed),
 * so a generated banner can be re-created later from its id alone.
 */
export function generateBanner(family: BannerFamily, seed: number): BannerRecipe {
  const r = rng(seed * 2654435761);
  const id = `gen-${family}-${seed}`;
  const name = `${BANNER_FAMILIES.find((f) => f.id === family)!.label} · ${seed
    .toString(36)
    .toUpperCase()}`;

  if (family === "light-mesh") {
    const left = pick(r, [P.lavender, "#C9AEFF", "#B7B0FF", "#D3A9F6"]);
    const mid = pick(r, [P.aqua, "#B3F6F7", "#9EF0EA", "#BFF2FF"]);
    const inkPair = pick(r, [
      { line1: P.blue500, line2From: P.blue800, line2To: P.blue800 },
      { line1: P.blue800, line2From: P.blue500, line2To: P.lavender },
      { line1: P.blue800, line2From: P.blue800, line2To: P.blue500 },
    ]);
    return {
      id,
      name,
      family,
      mode: "light",
      angle: lerp(-8, 8, r()),
      base: [
        { at: 0, color: left },
        { at: lerp(0.22, 0.34, r()), color: mid },
        { at: lerp(0.58, 0.68, r()), color: P.paper },
        { at: 1, color: pick(r, ["#F7FAF9", "#F6F6F8", "#F4F6FA"]) },
      ],
      blobs: [
        { x: lerp(0.0, 0.1, r()), y: lerp(0.25, 0.6, r()), r: lerp(0.24, 0.32, r()), color: left, alpha: lerp(0.75, 0.9, r()) },
        { x: lerp(0.2, 0.34, r()), y: lerp(0.35, 0.7, r()), r: lerp(0.26, 0.34, r()), color: mid, alpha: lerp(0.65, 0.85, r()) },
        { x: lerp(0.52, 0.66, r()), y: lerp(0.3, 0.6, r()), r: lerp(0.28, 0.34, r()), color: P.white, alpha: lerp(0.65, 0.85, r()) },
      ],
      ink: { ...inkPair, wordmark: P.blue800 },
    };
  }

  if (family === "pastel-dome") {
    const a = pick(r, ["#7FE6F4", "#8CEBEA", "#93DDF7"]);
    const b = pick(r, ["#8E8CE0", "#9A8BE6", "#8FB6F0"]);
    return {
      id,
      name,
      family,
      mode: "dark",
      angle: lerp(10, 30, r()),
      base: [
        { at: 0, color: a },
        { at: 0.4, color: "#8FB6F0" },
        { at: 0.75, color: b },
        { at: 1, color: pick(r, ["#6F76C8", "#7A6FC4", "#6B84CC"]) },
      ],
      blobs: [
        { x: lerp(0.4, 0.6, r()), y: lerp(0.88, 1.0, r()), r: lerp(0.48, 0.6, r()), color: P.lavender, alpha: lerp(0.45, 0.6, r()) },
        { x: lerp(0.08, 0.22, r()), y: lerp(0.0, 0.14, r()), r: lerp(0.26, 0.34, r()), color: P.aqua, alpha: lerp(0.55, 0.7, r()) },
        { x: lerp(0.82, 0.98, r()), y: lerp(0.0, 0.2, r()), r: lerp(0.26, 0.34, r()), color: a, alpha: lerp(0.4, 0.6, r()) },
      ],
      ink: { line1: P.white, line2From: P.white, line2To: P.aqua, wordmark: P.white },
    };
  }

  if (family === "band-sweep") {
    return {
      id,
      name,
      family,
      mode: "dark",
      angle: lerp(-5, 5, r()),
      base: [
        { at: 0, color: pick(r, ["#9DEEFB", "#8DE4FA", "#AFF3FF"]) },
        { at: lerp(0.16, 0.24, r()), color: pick(r, ["#2C7FE6", "#2079E4", "#1F6FD8"]) },
        { at: lerp(0.4, 0.5, r()), color: "#071243" },
        { at: lerp(0.68, 0.78, r()), color: pick(r, ["#12309C", "#1A2FB0", "#0E2A8C"]) },
        { at: 1, color: pick(r, ["#7B5BF0", "#8B6BFF", "#6C5BE0"]) },
      ],
      blobs: [
        { x: lerp(0.04, 0.12, r()), y: lerp(0.25, 0.5, r()), r: lerp(0.2, 0.28, r()), color: "#BDF4FF", alpha: lerp(0.65, 0.82, r()) },
        { x: lerp(0.4, 0.52, r()), y: lerp(0.4, 0.6, r()), r: lerp(0.2, 0.26, r()), color: "#050427", alpha: lerp(0.5, 0.68, r()) },
        { x: lerp(0.92, 1.0, r()), y: lerp(0.4, 0.6, r()), r: lerp(0.24, 0.32, r()), color: "#8B6BFF", alpha: lerp(0.5, 0.68, r()) },
      ],
      ink: { line1: P.white, line2From: P.aqua, line2To: P.aqua, wordmark: P.white },
    };
  }

  // navy-glow
  const glow = pick(r, ["#B6F2FF", "#AFEFFF", "#BFE0FF", "#B7F2FF"]);
  const midBlue = pick(r, ["#2E86E8", "#2079E4", "#6E8BF0", "#2C86EC"]);
  const deep = pick(r, [P.blue800, "#050427", "#060531"]);
  return {
    id,
    name,
    family,
    mode: "dark",
    angle: lerp(-6, 6, r()),
    base: [
      { at: 0, color: pick(r, ["#8FE7FA", "#93E9FB", "#A8D4FA"]) },
      { at: lerp(0.14, 0.24, r()), color: midBlue },
      { at: lerp(0.42, 0.56, r()), color: pick(r, ["#0A1E6B", "#0B1C63", "#1B1B7A"]) },
      { at: 1, color: deep },
    ],
    blobs: [
      { x: lerp(0.0, 0.08, r()), y: lerp(0.28, 0.48, r()), r: lerp(0.22, 0.3, r()), color: glow, alpha: lerp(0.72, 0.88, r()) },
      { x: lerp(0.24, 0.62, r()), y: lerp(0.55, 0.78, r()), r: lerp(0.24, 0.32, r()), color: pick(r, [P.blue500, P.violet]), alpha: lerp(0.28, 0.5, r()) },
      { x: lerp(0.7, 0.92, r()), y: lerp(0.4, 0.55, r()), r: lerp(0.3, 0.42, r()), color: deep, alpha: lerp(0.6, 0.8, r()) },
    ],
    ink: {
      line1: P.white,
      line2From: pick(r, [P.aqua, P.lavender]),
      line2To: pick(r, [P.aqua, P.white, P.lavender]),
      wordmark: P.white,
    },
  };
}

/* ------------------------------------------------------------------ */
/* CSS preview                                                         */
/* ------------------------------------------------------------------ */

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Layered CSS background that mirrors the canvas painter closely enough for DOM previews. */
export function bannerCss(rec: BannerRecipe): string {
  const layers = rec.blobs
    .map(
      (b) =>
        `radial-gradient(${b.r * 200}% ${b.r * 640}% at ${b.x * 100}% ${b.y * 100}%, ${hexA(
          b.color,
          b.alpha,
        )} 0%, ${hexA(b.color, b.alpha * 0.45)} 42%, ${hexA(b.color, 0)} 72%)`,
    )
    .join(", ");
  const base = `linear-gradient(${90 + rec.angle}deg, ${rec.base
    .map((s) => `${s.color} ${Math.round(s.at * 100)}%`)
    .join(", ")})`;
  return `${layers}, ${base}`;
}

/* ------------------------------------------------------------------ */
/* Canvas painter + PNG export                                         */
/* ------------------------------------------------------------------ */

export type BannerCopy = {
  line1: string;
  line2: string;
  /** Show the TRANSPERFECT wordmark bottom-right. */
  wordmark: boolean;
};

export function paintBanner(
  ctx: CanvasRenderingContext2D,
  rec: BannerRecipe,
  w: number,
  h: number,
  copy?: BannerCopy,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Base sweep.
  const rad = ((rec.angle + 0) * Math.PI) / 180;
  const dx = Math.cos(rad) * w;
  const dy = Math.sin(rad) * h;
  const g = ctx.createLinearGradient((w - dx) / 2, (h - dy) / 2, (w + dx) / 2, (h + dy) / 2);
  for (const s of rec.base) g.addColorStop(Math.min(1, Math.max(0, s.at)), s.color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft mesh blobs.
  for (const b of rec.blobs) {
    const cx = b.x * w;
    const cy = b.y * h;
    const rr = b.r * w;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    rg.addColorStop(0, hexA(b.color, b.alpha));
    rg.addColorStop(0.45, hexA(b.color, b.alpha * 0.5));
    rg.addColorStop(1, hexA(b.color, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();

  if (!copy) return;

  // Copy block, right-aligned — mirrors the approved layout.
  const scale = h / LI_BANNER_H;
  const right = w - 66 * scale;
  const size = 62 * scale;
  const lineGap = size * 1.16;
  const baseY = h * 0.42;

  ctx.save();
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";

  const font = (weight: number) =>
    `${weight} ${size}px Geist, "Geist Sans", Inter, system-ui, sans-serif`;

  if (copy.line1) {
    ctx.font = font(rec.mode === "dark" ? 500 : 700);
    ctx.fillStyle = rec.ink.line1;
    ctx.fillText(copy.line1, right, baseY);
  }
  if (copy.line2) {
    ctx.font = font(700);
    const tw = ctx.measureText(copy.line2).width;
    const lg = ctx.createLinearGradient(right - tw, 0, right, 0);
    lg.addColorStop(0, rec.ink.line2From);
    lg.addColorStop(1, rec.ink.line2To);
    ctx.fillStyle = lg;
    ctx.fillText(copy.line2, right, baseY + lineGap);
  }
  if (copy.wordmark) {
    const ws = 26 * scale;
    ctx.font = `600 ${ws}px Geist, "Geist Sans", Inter, system-ui, sans-serif`;
    ctx.fillStyle = rec.ink.wordmark;
    const label = "TRANSPERFECT";
    ctx.save();
    // Loose tracking to match the wordmark rhythm.
    const track = ws * 0.1;
    let x = right;
    for (let i = label.length - 1; i >= 0; i--) {
      const ch = label[i]!;
      const cw = ctx.measureText(ch).width;
      x -= cw;
      ctx.fillText(ch, x + cw, baseY + lineGap * 1.9);
      x -= track;
    }
    ctx.restore();
  }
  ctx.restore();
}

export async function exportBannerPng(
  rec: BannerRecipe,
  copy: BannerCopy,
  scale = 1,
): Promise<Blob> {
  const w = Math.round(LI_BANNER_W * scale);
  const h = Math.round(LI_BANNER_H * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await (document as Document).fonts.ready;
    } catch {
      /* fonts API optional */
    }
  }
  paintBanner(ctx, rec, w, h, copy);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png"),
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
