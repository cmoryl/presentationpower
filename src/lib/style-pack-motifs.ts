/**
 * STYLE PACK MOTIFS — the signature imagery layer.
 *
 * A pack's `ground` gives it a page field: washes, rules, blocks. That alone
 * makes packs *tinted*, not *designed*. This file gives every pack one large
 * procedural motif — its own piece of art — so a reviewer flipping through the
 * directory sees a genuinely different sheet each time rather than the same
 * slide in ten colourways.
 *
 * Every motif is a generated SVG data URI: no binary assets, instant switching,
 * prints crisp at any scale, and re-tones itself from the pack's own tokens.
 * Motifs are decorative only — they sit under content at low alpha, are
 * `aria-hidden`, and never carry meaning.
 */

import type { StylePack, StylePackId } from "./style-packs";

/**
 * Where a motif is allowed to live on the sheet. Design review finding: a
 * signature painted edge-to-edge competes with the copy and cards — it reads
 * as interference, not art. Every motif is now assigned a reserve zone and
 * dissolved into the field with a feathered mask, so the centre of the page
 * (where titles, cards and figures sit) stays quiet.
 */
export type MotifZone =
  | "bottom-band"
  | "top-band"
  | "left-field"
  | "right-field"
  | "corner-tr"
  | "corner-br"
  | "corner-bl"
  /** All-over patterns: kept at the margins, centre cleared. */
  | "edges";

export const MOTIF_ZONE_MASK: Record<MotifZone, string> = {
  "bottom-band": "linear-gradient(to top, #000 0%, #000 24%, transparent 56%)",
  "top-band": "linear-gradient(to bottom, #000 0%, #000 18%, transparent 44%)",
  "left-field": "linear-gradient(to right, #000 0%, #000 22%, transparent 58%)",
  "right-field": "linear-gradient(to left, #000 0%, #000 24%, transparent 60%)",
  "corner-tr": "radial-gradient(74% 80% at 100% 0%, #000 0%, #000 28%, transparent 72%)",
  "corner-br": "radial-gradient(74% 80% at 100% 100%, #000 0%, #000 28%, transparent 72%)",
  "corner-bl": "radial-gradient(78% 82% at 0% 100%, #000 0%, #000 30%, transparent 74%)",
  edges:
    "radial-gradient(118% 112% at 50% 50%, transparent 0%, transparent 44%, #000 82%, #000 100%)",
};

export interface SignatureLayer {
  /** CSS `background` value (SVG data URI plus sizing). */
  background: string;
  /** Layer opacity. */
  opacity: number;
  /** Blend against the pack ground. */
  blend: "normal" | "multiply" | "screen" | "overlay" | "soft-light";
  /** Optional clip so the motif occupies a compositional zone, not the sheet. */
  clip?: string;
  /** Feathered reserve zone. Applied as a mask by the chrome. */
  zone?: MotifZone;
  /** Resolved mask-image for `zone`. */
  mask?: string;
}


/* ── encoding ────────────────────────────────────────────────────────────── */

function svg(body: string, w: number, h: number): string {
  const doc = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' width='${w}' height='${h}'>${body}</svg>`;
  const enc = doc
    .replace(/#/g, "%23")
    .replace(/"/g, "'")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\n/g, "");
  return `url("data:image/svg+xml;utf8,${enc}")`;
}

function layer(
  body: string,
  w: number,
  h: number,
  opts: {
    size?: string;
    position?: string;
    repeat?: string;
    opacity: number;
    blend?: SignatureLayer["blend"];
    clip?: string;
  },
): SignatureLayer {
  const size = opts.size ?? "cover";
  const position = opts.position ?? "center";
  const repeat = opts.repeat ?? "no-repeat";
  return {
    background: `${svg(body, w, h)} ${position} / ${size} ${repeat}`,
    opacity: opts.opacity,
    blend: opts.blend ?? "normal",
    clip: opts.clip,
  };
}

/* ── motif vocabulary ────────────────────────────────────────────────────── */

/** Halftone cone — dots gaining radius down a diagonal. Swiss / risograph. */
function halftoneCone(c: string): string {
  let out = "";
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 22; col++) {
      const t = (row / 15) * 0.6 + (col / 21) * 0.4;
      const r = 0.6 + t * 5.4;
      out += `<circle cx='${col * 24 + 12}' cy='${row * 24 + 12}' r='${r.toFixed(2)}' fill='${c}'/>`;
    }
  }
  return out;
}

/** Concentric arc field radiating from one corner. Bauhaus / poster. */
function arcFan(c: string, cx: number, cy: number): string {
  let out = "";
  for (let i = 1; i <= 14; i++) {
    out += `<circle cx='${cx}' cy='${cy}' r='${i * 46}' fill='none' stroke='${c}' stroke-width='${i % 3 === 0 ? 3 : 1.2}'/>`;
  }
  return out;
}

/** Topographic contour bands — organic, hand-surveyed feel. */
function contours(c: string): string {
  let out = "";
  for (let i = 0; i < 11; i++) {
    const y = 90 + i * 52;
    const amp = 34 + i * 5;
    const d = `M -40 ${y} C 140 ${y - amp} 300 ${y + amp} 480 ${y - amp * 0.6} S 760 ${y + amp} 1000 ${y - amp * 0.4} S 1240 ${y + amp * 0.8} 1480 ${y}`;
    out += `<path d='${d}' fill='none' stroke='${c}' stroke-width='${i % 4 === 0 ? 2.4 : 1.1}'/>`;
  }
  return out;
}

/** Isometric cube lattice — engineered, dimensional. */
function isoLattice(c: string): string {
  let out = "";
  for (let x = -1; x < 20; x++) {
    out += `<path d='M ${x * 80} 0 L ${x * 80 + 400} 800' stroke='${c}' stroke-width='1' fill='none'/>`;
    out += `<path d='M ${x * 80} 0 L ${x * 80 - 400} 800' stroke='${c}' stroke-width='1' fill='none'/>`;
  }
  for (let y = 0; y < 12; y++) {
    out += `<path d='M 0 ${y * 68} H 1440' stroke='${c}' stroke-width='0.7' fill='none'/>`;
  }
  return out;
}

/** Ribbon waves — long horizontal bands, vaporwave / chrome. */
function ribbons(a: string, b: string): string {
  let out = "";
  for (let i = 0; i < 7; i++) {
    const y = 120 + i * 96;
    const d = `M -60 ${y} C 260 ${y - 84} 560 ${y + 84} 860 ${y - 30} S 1240 ${y + 70} 1500 ${y - 10}`;
    out += `<path d='${d}' fill='none' stroke='${i % 2 ? b : a}' stroke-width='${18 - i * 1.6}' stroke-linecap='round'/>`;
  }
  return out;
}

/** Moiré ring pair — interference pattern, optical. */
function moire(c: string): string {
  let out = "";
  for (let i = 1; i <= 42; i++) {
    out += `<circle cx='320' cy='400' r='${i * 15}' fill='none' stroke='${c}' stroke-width='0.9'/>`;
    out += `<circle cx='1120' cy='420' r='${i * 15.9}' fill='none' stroke='${c}' stroke-width='0.9'/>`;
  }
  return out;
}

/** Blueprint dimension lines with tick terminals and a plate outline. */
function blueprint(c: string): string {
  let out = `<rect x='60' y='60' width='1320' height='690' fill='none' stroke='${c}' stroke-width='1.4' stroke-dasharray='14 10'/>`;
  for (let i = 0; i < 5; i++) {
    const y = 150 + i * 140;
    out += `<path d='M 120 ${y} H 1320' stroke='${c}' stroke-width='0.9'/>`;
    out += `<path d='M 120 ${y - 9} V ${y + 9} M 1320 ${y - 9} V ${y + 9}' stroke='${c}' stroke-width='1.6'/>`;
  }
  out += `<circle cx='1180' cy='560' r='128' fill='none' stroke='${c}' stroke-width='1.2'/>`;
  out += `<circle cx='1180' cy='560' r='66' fill='none' stroke='${c}' stroke-width='1.2'/>`;
  out += `<path d='M 1010 560 H 1350 M 1180 390 V 730' stroke='${c}' stroke-width='0.8'/>`;
  return out;
}

/** Woven linen hatch — soft textile crosshatch. */
function weave(c: string): string {
  let out = "";
  for (let i = 0; i < 40; i++) {
    out += `<path d='M ${i * 16} 0 V 640' stroke='${c}' stroke-width='${i % 4 === 0 ? 2.6 : 1}'/>`;
    out += `<path d='M 0 ${i * 16} H 640' stroke='${c}' stroke-width='${i % 4 === 0 ? 2.6 : 1}'/>`;
  }
  return out;
}

/** Starfield with a faint horizon glow — deep-space neon. */
function starfield(c: string, glow: string): string {
  let out = `<defs><radialGradient id='g' cx='50%' cy='100%'><stop offset='0%' stop-color='${glow}' stop-opacity='0.55'/><stop offset='100%' stop-color='${glow}' stop-opacity='0'/></radialGradient></defs><rect width='1440' height='810' fill='url(%23g)'/>`;
  let s = 7;
  for (let i = 0; i < 240; i++) {
    s = (s * 48271) % 2147483647;
    const x = (s % 1440).toFixed(1);
    const y = ((s >> 7) % 810).toFixed(1);
    const r = ((s >> 3) % 100) / 90 + 0.3;
    out += `<circle cx='${x}' cy='${y}' r='${r.toFixed(2)}' fill='${c}'/>`;
  }
  return out;
}

/** Hand-graded seminato terrazzo — irregular polygon chips, three tones,
 * quarry-graded sizes, with a fine grout speckle. No rotated rectangles. */
function terrazzo(a: string, b: string, ink: string): string {
  let out = "";
  let s = 1337;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
  const chip = (cx: number, cy: number, r: number, fill: string, op: number) => {
    const n = 5 + Math.floor(rnd() * 3);
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + rnd() * 0.5;
      const rad = r * (0.58 + rnd() * 0.52);
      pts.push(`${(cx + Math.cos(ang) * rad).toFixed(1)},${(cy + Math.sin(ang) * rad * 0.86).toFixed(1)}`);
    }
    out += `<polygon points='${pts.join(" ")}' fill='${fill}' opacity='${op.toFixed(2)}'/>`;
  };
  // large aggregate
  for (let i = 0; i < 56; i++) chip(rnd() * 1440, rnd() * 810, 15 + rnd() * 15, i % 3 === 0 ? b : a, 0.5 + rnd() * 0.22);
  // mid aggregate
  for (let i = 0; i < 210; i++) chip(rnd() * 1440, rnd() * 810, 7 + rnd() * 7, i % 4 === 0 ? b : i % 7 === 0 ? ink : a, 0.34 + rnd() * 0.26);
  // fine aggregate
  for (let i = 0; i < 420; i++) chip(rnd() * 1440, rnd() * 810, 2.4 + rnd() * 3.2, i % 5 === 0 ? ink : i % 3 === 0 ? b : a, 0.2 + rnd() * 0.2);
  // grout speckle
  for (let i = 0; i < 260; i++)
    out += `<circle cx='${(rnd() * 1440).toFixed(1)}' cy='${(rnd() * 810).toFixed(1)}' r='${(0.5 + rnd() * 0.9).toFixed(2)}' fill='${ink}' opacity='0.16'/>`;
  return out;
}

/** Sunburst rays from a low centre — retro print. */
function sunburst(c: string): string {
  let out = "";
  for (let i = 0; i < 48; i++) {
    const a0 = (i / 48) * Math.PI * 2;
    const a1 = a0 + Math.PI / 96;
    const x0 = 720 + Math.cos(a0) * 1400;
    const y0 = 760 + Math.sin(a0) * 1400;
    const x1 = 720 + Math.cos(a1) * 1400;
    const y1 = 760 + Math.sin(a1) * 1400;
    out += `<path d='M 720 760 L ${x0.toFixed(0)} ${y0.toFixed(0)} L ${x1.toFixed(0)} ${y1.toFixed(0)} Z' fill='${c}'/>`;
  }
  return out;
}

/** Instrument placard — a machined panel edge: a graduated scale rail with
 * major/minor ticks, two milled slots and one registration crosshair. Fine
 * hairlines only, held in a narrow band so module cards stay legible. */
function circuit(c: string): string {
  let out = "";
  out += `<path d='M 96 96 H 1344' stroke='${c}' stroke-width='1' fill='none' opacity='0.7'/>`;
  for (let x = 96; x <= 1344; x += 16) {
    const major = (x - 96) % 128 === 0;
    out += `<path d='M ${x} 96 V ${96 + (major ? 22 : 9)}' stroke='${c}' stroke-width='${major ? 1.2 : 0.7}' opacity='${major ? 0.8 : 0.45}'/>`;
  }
  out += `<rect x='96' y='150' width='214' height='6' rx='3' fill='none' stroke='${c}' stroke-width='1' opacity='0.5'/>`;
  out += `<rect x='96' y='170' width='96' height='6' rx='3' fill='none' stroke='${c}' stroke-width='1' opacity='0.32'/>`;
  out += `<circle cx='1288' cy='176' r='13' fill='none' stroke='${c}' stroke-width='1' opacity='0.5'/>`;
  out += `<path d='M 1288 155 V 197 M 1267 176 H 1309' stroke='${c}' stroke-width='0.8' opacity='0.4'/>`;
  return out;
}


/** Sumi-e gesture — a single calligraphic stroke drawn as a filled silhouette
 * with a pointed entry, a loaded shoulder and a dry, splitting tail. Edge
 * displacement is light so the stroke keeps its bite instead of going soft. */
function brushStrokes(c: string): string {
  let out = `<defs><filter id='bleed' x='-8%' y='-8%' width='116%' height='116%'>`;
  out += `<feTurbulence type='fractalNoise' baseFrequency='0.012 0.06' numOctaves='3' seed='7' result='n'/>`;
  out += `<feDisplacementMap in='SourceGraphic' in2='n' scale='7' xChannelSelector='R' yChannelSelector='G'/>`;
  out += `<feGaussianBlur stdDeviation='0.35'/></filter></defs>`;
  out += `<g filter='url(%23bleed)'>`;

  /* principal gesture: thin entry top-left, loaded belly, dry exit right */
  out += `<path d='M 92 372 C 300 420 430 566 604 654 C 772 738 926 776 1108 776 C 926 812 764 782 588 706 C 414 630 300 470 96 402 Z' fill='${c}' opacity='0.88'/>`;

  /* second pressure pass inside the belly — where the brush sat longest */
  out += `<path d='M 254 470 C 380 544 484 638 638 700 C 744 742 844 762 960 768 C 834 784 722 764 602 714 C 458 654 340 552 250 488 Z' fill='${c}' opacity='0.5'/>`;

  /* dry-brush tail: bristle slivers leaving the stroke */
  let s = 91;
  for (let i = 0; i < 22; i++) {
    s = (s * 48271) % 2147483647;
    const x = 1020 + (s % 340);
    const y = 752 + ((s >> 6) % 44) - 22;
    const len = 30 + ((s >> 3) % 130);
    out += `<path d='M ${x} ${y} q ${(len / 2).toFixed(0)} ${((s >> 9) % 10) - 5} ${len} ${((s >> 11) % 16) - 8}' fill='none' stroke='${c}' stroke-width='${(0.9 + ((s >> 4) % 18) / 9).toFixed(2)}' stroke-linecap='round' opacity='${(0.22 + ((s >> 7) % 26) / 90).toFixed(2)}'/>`;
  }

  /* the counter-gesture — one quiet accent low left, tapered both ends */
  out += `<path d='M 812 236 C 936 214 1032 196 1156 208 C 1030 232 934 254 816 250 Z' fill='${c}' opacity='0.55'/>`;
  out += `</g>`;
  return out;
}

/** Column arcade — architectural verticals with capital arches. */
function arcade(c: string): string {
  let out = "";
  for (let i = 0; i < 9; i++) {
    const x = 70 + i * 160;
    out += `<path d='M ${x} 810 V 300 A 55 55 0 0 1 ${x + 110} 300 V 810' fill='none' stroke='${c}' stroke-width='1.6'/>`;
  }
  out += `<path d='M 0 300 H 1440' stroke='${c}' stroke-width='1'/>`;
  return out;
}

/** Data ladder — stacked bar/step marks reading as a chart ghost. */
function dataLadder(c: string): string {
  let out = "";
  let s = 5;
  for (let i = 0; i < 34; i++) {
    s = (s * 48271) % 2147483647;
    const h = 40 + (s % 420);
    out += `<rect x='${i * 42 + 20}' y='${810 - h}' width='22' height='${h}' fill='${c}'/>`;
  }
  return out;
}

/** Woodcut plank grain — long directional fibres. */
function plankGrain(c: string): string {
  let out = "";
  for (let i = 0; i < 26; i++) {
    const y = i * 32 + 10;
    out += `<path d='M -20 ${y} C 300 ${y + (i % 2 ? 7 : -7)} 700 ${y - (i % 3 ? 6 : 10)} 1460 ${y + (i % 2 ? -5 : 6)}' fill='none' stroke='${c}' stroke-width='${i % 5 === 0 ? 2.6 : 1.1}'/>`;
  }
  return out;
}

/** Perspective floor grid receding to a horizon. */
function perspectiveGrid(c: string): string {
  let out = `<path d='M 0 380 H 1440' stroke='${c}' stroke-width='1.4'/>`;
  for (let i = -14; i <= 14; i++) {
    out += `<path d='M 720 380 L ${720 + i * 190} 830' stroke='${c}' stroke-width='1'/>`;
  }
  let y = 386;
  let step = 6;
  while (y < 830) {
    out += `<path d='M 0 ${y.toFixed(0)} H 1440' stroke='${c}' stroke-width='0.9'/>`;
    y += step;
    step *= 1.32;
  }
  return out;
}

/* ── per-pack assignment ─────────────────────────────────────────────────── */

/**
 * Each pack gets exactly one signature motif, tuned to its own palette and
 * placed where it will not fight the reading zone. Returning null means the
 * pack is intentionally motif-free.
 */
/* ── pattern-first motifs (flat ink, hard edges, no washes) ─────────────── */

/** Patchwork field — pieced blocks of flat colour. */
function patchwork(a: string, b: string): string {
  let out = "";
  const cells = 6;
  const w = 1440 / cells;
  const h = 810 / 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cells; c++) {
      const x = c * w;
      const y = r * h;
      const k = (r * cells + c) % 4;
      const fill = k % 2 ? a : b;
      if (k === 0) out += `<path d='M${x} ${y} L${x + w} ${y} L${x} ${y + h} Z' fill='${fill}'/>`;
      else if (k === 1) out += `<path d='M${x + w / 2} ${y} L${x + w} ${y + h / 2} L${x + w / 2} ${y + h} L${x} ${y + h / 2} Z' fill='${fill}'/>`;
      else if (k === 2) out += `<rect x='${x + w * 0.18}' y='${y + h * 0.18}' width='${w * 0.64}' height='${h * 0.64}' fill='${fill}'/>`;
      else out += `<circle cx='${x + w / 2}' cy='${y + h / 2}' r='${Math.min(w, h) * 0.32}' fill='${fill}'/>`;
    }
  }
  return out;
}

/** Glazed tile medallion — one large radial-symmetry ornament, drawn in line. */
function tileMedallion(c: string, alt: string): string {
  let out = `<g fill='none' stroke='${c}' stroke-width='3'>`;
  for (let i = 1; i <= 5; i++) {
    const r = i * 62;
    out += `<path d='M720 ${405 - r} L${720 + r} 405 L720 ${405 + r} L${720 - r} 405 Z'/>`;
  }
  out += "</g>";
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    out += `<circle cx='${(720 + Math.cos(ang) * 300).toFixed(1)}' cy='${(405 + Math.sin(ang) * 300).toFixed(1)}' r='14' fill='${alt}'/>`;
  }
  return out;
}

/** Speed lines converging on a point — comic action burst. */
function speedLines(c: string, cx: number, cy: number): string {
  let out = "";
  for (let i = 0; i < 48; i++) {
    const ang = (i / 48) * Math.PI * 2;
    const w = i % 3 === 0 ? 9 : 3.4;
    out += `<path d='M ${cx} ${cy} L ${cx + Math.cos(ang) * 1900} ${cy + Math.sin(ang) * 1900}' stroke='${c}' stroke-width='${w}' fill='none'/>`;
  }
  return out;
}

/** Photocopy artefacts — toner streaks, tape strips, torn edges. */
function xeroxCollage(c: string): string {
  let out = "";
  for (let i = 0; i < 9; i++) {
    const y = 40 + i * 88;
    out += `<rect x='${(i * 137) % 900}' y='${y}' width='${380 + (i % 4) * 120}' height='${3 + (i % 3) * 2}' fill='${c}'/>`;
  }
  for (let i = 0; i < 5; i++) {
    const x = 90 + i * 280;
    const y = 120 + ((i * 173) % 520);
    out += `<rect x='${x}' y='${y}' width='150' height='44' fill='${c}' opacity='0.5' transform='rotate(${i % 2 ? -7 : 6} ${x + 75} ${y + 22})'/>`;
  }
  out += `<path d='M0 806 L120 770 L280 800 L440 764 L610 798 L780 760 L950 796 L1130 762 L1300 798 L1440 768 L1440 810 L0 810 Z' fill='${c}'/>`;
  return out;
}

/** Pressed botanical silhouettes — specimen sheet. */
function pressedBotanical(c: string): string {
  let out = "";
  const stems = [
    [180, 760, -18],
    [640, 800, 6],
    [1180, 780, 14],
  ] as const;
  for (const [x, y, tilt] of stems) {
    out += `<g transform='rotate(${tilt} ${x} ${y})' fill='none' stroke='${c}' stroke-width='3'>`;
    out += `<path d='M${x} ${y} C ${x - 30} ${y - 220} ${x + 40} ${y - 430} ${x} ${y - 640}'/>`;
    for (let i = 1; i <= 7; i++) {
      const ly = y - i * 84;
      const dir = i % 2 ? 1 : -1;
      out += `<path d='M${x} ${ly} C ${x + dir * 70} ${ly - 34} ${x + dir * 120} ${ly - 10} ${x + dir * 132} ${ly + 26} C ${x + dir * 80} ${ly + 40} ${x + dir * 26} ${ly + 24} ${x} ${ly}' fill='${c}' fill-opacity='0.16'/>`;
    }
    out += `</g>`;
  }
  return out;
}

/** Stepped deco arches and inlay bars. */
function decoArches(c: string, alt: string): string {
  let out = "";
  for (let i = 0; i < 4; i++) {
    const r = 300 - i * 62;
    out += `<path d='M ${720 - r} 810 L ${720 - r} ${520 - i * 20} A ${r} ${r} 0 0 1 ${720 + r} ${520 - i * 20} L ${720 + r} 810' fill='none' stroke='${i % 2 ? alt : c}' stroke-width='${i === 0 ? 12 : 5}'/>`;
  }
  for (let i = 0; i < 7; i++) {
    const h = 26 + i * 22;
    out += `<rect x='${60 + i * 26}' y='${810 - h}' width='10' height='${h}' fill='${c}'/>`;
    out += `<rect x='${1380 - i * 26}' y='${810 - h}' width='10' height='${h}' fill='${c}'/>`;
  }
  return out;
}

/**
 * Reserve zone per pack — decided in the design review so every look keeps its
 * signature gesture but stops fighting the content. All-over patterns get
 * `edges`; single gestures get the corner or band they were composed for.
 */
const MOTIF_ZONES: Record<StylePackId, MotifZone> = {
  "swiss-noir": "corner-br",
  "neo-brutal": "corner-bl",
  "editorial-serif": "edges",
  "vapor-chrome": "bottom-band",
  "midnight-neon": "edges",
  "desert-clay": "bottom-band",
  "blueprint-cyan": "edges",
  "bauhaus-primary": "corner-br",
  "sage-linen": "edges",
  "graphite-chrome": "edges",
  "ink-sumi": "left-field",
  "terrazzo-studio": "edges",
  "optic-moire": "edges",
  "cyber-terminal": "top-band",
  "atlas-plate": "corner-tr",
  "riso-woodcut": "edges",
  "quant-grid": "bottom-band",
  "retro-arcade": "bottom-band",
  "quilt-folk": "edges",
  "azulejo-tile": "right-field",
  "comic-panel": "corner-tr",
  "xerox-punk": "edges",
  "herbarium-press": "bottom-band",
  "deco-marquee": "bottom-band",
};

/** Ceiling on motif presence. Subtractive blends read heavier than additive. */
const MOTIF_OPACITY_CAP: Record<SignatureLayer["blend"], number> = {
  normal: 0.14,
  multiply: 0.15,
  screen: 0.22,
  overlay: 0.18,
  "soft-light": 0.26,
};

/**
 * Public signature: the raw gesture, zoned and levelled. One place decides how
 * loud any pack is allowed to be, so the directory stays consistent in feel
 * even though every sheet is a different design.
 */
export function packSignature(pack: StylePack): SignatureLayer | null {
  const raw = rawSignature(pack);
  if (!raw) return null;
  const zone = MOTIF_ZONES[pack.id] ?? "edges";
  const cap = MOTIF_OPACITY_CAP[raw.blend];
  // All-over patterns are the busiest, so they sit a further step back.
  const trim = zone === "edges" ? 0.8 : 1;
  return {
    ...raw,
    zone,
    mask: MOTIF_ZONE_MASK[zone],
    opacity: Math.min(raw.opacity, cap) * trim,
    // The mask supersedes hard clips — feathered edges layer, clips cut.
    clip: undefined,
  };
}

function rawSignature(pack: StylePack): SignatureLayer | null {

  const { accent, accentAlt, ink } = pack.tokens;
  const id: StylePackId = pack.id;

  switch (id) {
    case "swiss-noir":
      return layer(halftoneCone(ink), 528, 384, {
        size: "62% auto",
        position: "right bottom",
        opacity: 0.16,
        blend: "multiply",
      });

    case "neo-brutal":
      return layer(sunburst(accentAlt), 1440, 810, {
        size: "120% auto",
        position: "left -30% bottom -40%",
        opacity: 0.16,
        blend: "multiply",
      });

    case "editorial-serif":
      return layer(contours(accent), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.14,
        blend: "multiply",
      });

    case "vapor-chrome":
      return layer(ribbons(accent, accentAlt), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.3,
        blend: "screen",
      });

    case "midnight-neon":
      return layer(starfield(ink, accent), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.5,
        blend: "screen",
      });

    case "desert-clay":
      return layer(arcade(accent), 1440, 810, {
        size: "cover",
        position: "center bottom",
        opacity: 0.16,
        blend: "multiply",
      });

    case "blueprint-cyan":
      return layer(blueprint(accent), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.4,
        blend: "screen",
      });

    case "bauhaus-primary":
      return layer(arcFan(accent, 1380, 60), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.22,
        blend: "multiply",
      });

    case "sage-linen":
      // Woven cloth, not a grid: a wider repeat reads as slub in the weave.
      return layer(weave(accent), 640, 640, {
        size: "440px 440px",
        repeat: "repeat",
        opacity: 0.11,
        blend: "multiply",
      });

    case "graphite-chrome":
      return layer(isoLattice(accentAlt), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.14,
        blend: "screen",
      });

    /* extended set */
    case "ink-sumi":
      return layer(brushStrokes(ink), 1440, 810, {
        size: "cover",
        position: "left center",
        opacity: 0.2,
        blend: "multiply",
      });

    case "terrazzo-studio":
      return layer(terrazzo(accent, accentAlt, ink), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.5,
        blend: "multiply",
      });

    case "optic-moire":
      return layer(moire(ink), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.16,
        blend: "multiply",
      });

    case "cyber-terminal":
      /* placard sits in the top margin band only — never behind cards. */
      return layer(circuit(ink), 1440, 810, {
        size: "100% auto",
        position: "left top",
        opacity: 0.16,
        blend: "screen",
        clip: "inset(0 0 76% 0)",
      });

    case "atlas-plate":
      return layer(contours(accentAlt), 1440, 810, {
        size: "140% auto",
        position: "right top",
        opacity: 0.26,
        blend: "screen",
      });

    case "riso-woodcut":
      return layer(plankGrain(accent), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.3,
        blend: "multiply",
      });

    case "quant-grid":
      return layer(dataLadder(accent), 1440, 810, {
        size: "100% 46%",
        position: "left bottom",
        opacity: 0.16,
        blend: "screen",
      });

    case "retro-arcade":
      return layer(perspectiveGrid(accent), 1440, 810, {
        size: "cover",
        position: "center bottom",
        opacity: 0.42,
        blend: "screen",
      });

    /* pattern-first set */
    case "quilt-folk":
      return layer(patchwork(accent, accentAlt), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.2,
        blend: "multiply",
      });

    case "azulejo-tile":
      return layer(tileMedallion(accent, accentAlt), 1440, 810, {
        size: "78% auto",
        position: "right center",
        opacity: 0.3,
        blend: "multiply",
      });

    case "comic-panel":
      return layer(speedLines(ink, 1180, 120), 1440, 810, {
        size: "cover",
        position: "center",
        opacity: 0.1,
        blend: "multiply",
      });

    case "xerox-punk":
      return layer(xeroxCollage(ink), 1440, 810, {
        size: "100% 100%",
        position: "center",
        opacity: 0.22,
        blend: "multiply",
      });

    case "herbarium-press":
      return layer(pressedBotanical(accent), 1440, 810, {
        size: "cover",
        position: "center bottom",
        opacity: 0.28,
        blend: "multiply",
      });

    case "deco-marquee":
      return layer(decoArches(accent, accentAlt), 1440, 810, {
        size: "cover",
        position: "center bottom",
        opacity: 0.3,
        blend: "screen",
      });

    default:
      return null;
  }
}
