// ---------------------------------------------------------------------------
// LEGAL CAMPAIGN — bloom variation, MOTION
//
// The still ads are laid out by social-legal-bloom-layout.ts. This file adds
// everything the moving versions need, and nothing that touches a canvas:
//
//   · the social placements the set is delivered in — platform, trim, how long
//     a clip may run there, and the file weight we write under
//   · the motion presets: how the picture travels inside its frame, how the
//     words arrive, when the lockup lands
//   · a frame function: given a preset and a moment in the clip, what every
//     part of the ad is doing
//   · the bitrate that keeps a clip inside its placement's file weight
//   · the file naming, carried over from the print/static pack convention
//
// Rules carried over: the picture always travels INSIDE its frame (the frame
// itself is the campaign's shape and never distorts), the accent word is never
// smaller than the line it sits in, and nothing in the artwork becomes a CTA.
// ---------------------------------------------------------------------------

import { bloomHeadline, type BloomAperture, type BloomScene } from "./social-legal-bloom";
import { BLOOM_PACK_BRAND, BLOOM_PACK_CAMPAIGN, BLOOM_PACK_VERSION, csvRows, packToken } from "./social-legal-bloom-pack";

// ---------------------------------------------------------------------------
// Social placements
//
// `maxSeconds` is the longest clip the placement takes for this kind of post,
// and `writeUnderMb` is the weight WE write under — deliberately well inside
// each platform's own stated ceiling (`platformCapMb`), because a light file
// starts playing sooner and survives re-encoding better.

export type BloomPlacement = {
  id: string;
  platform: string;
  placement: string;
  w: number;
  h: number;
  /** Longest clip this placement is used for in this campaign. */
  maxSeconds: number;
  /** What we write under. */
  writeUnderMb: number;
  /** The platform's own stated ceiling, for reference. */
  platformCapMb: number;
  /**
   * Share of the height kept clear at top and bottom because the platform's own
   * interface sits there. 0 when nothing overlays the frame.
   */
  safeTop: number;
  safeBottom: number;
  note: string;
};

export const BLOOM_PLACEMENTS: BloomPlacement[] = [
  {
    id: "li-feed-square",
    platform: "LinkedIn",
    placement: "Feed video, square",
    w: 1080,
    h: 1080,
    maxSeconds: 30,
    writeUnderMb: 40,
    platformCapMb: 5120,
    safeTop: 0,
    safeBottom: 0,
    note: "The workhorse. Square holds its size in the feed on both desktop and phone.",
  },
  {
    id: "li-feed-portrait",
    platform: "LinkedIn",
    placement: "Feed video, portrait 4:5",
    w: 1080,
    h: 1350,
    maxSeconds: 30,
    writeUnderMb: 45,
    platformCapMb: 5120,
    safeTop: 0,
    safeBottom: 0,
    note: "Tallest shape the feed shows in full. Best reach on a phone.",
  },
  {
    id: "li-feed-landscape",
    platform: "LinkedIn",
    placement: "Feed video, landscape 16:9",
    w: 1920,
    h: 1080,
    maxSeconds: 30,
    writeUnderMb: 50,
    platformCapMb: 5120,
    safeTop: 0,
    safeBottom: 0,
    note: "For desktop-led audiences and for re-use in decks and on the site.",
  },
  {
    id: "ig-feed-square",
    platform: "Instagram",
    placement: "Feed video, square",
    w: 1080,
    h: 1080,
    maxSeconds: 30,
    writeUnderMb: 35,
    platformCapMb: 4096,
    safeTop: 0,
    safeBottom: 0,
    note: "Keep the accent word clear of the centre-bottom, where the caption opens.",
  },
  {
    id: "ig-reel",
    platform: "Instagram",
    placement: "Reel / Story, 9:16",
    w: 1080,
    h: 1920,
    maxSeconds: 30,
    writeUnderMb: 40,
    platformCapMb: 4096,
    safeTop: 0.14,
    safeBottom: 0.2,
    note: "The interface covers the top and bottom fifth — copy and lockup stay inside the safe band.",
  },
  {
    id: "fb-feed-portrait",
    platform: "Facebook",
    placement: "Feed video, portrait 4:5",
    w: 1080,
    h: 1350,
    maxSeconds: 30,
    writeUnderMb: 40,
    platformCapMb: 4096,
    safeTop: 0,
    safeBottom: 0,
    note: "Same cut as the LinkedIn portrait, re-written at Facebook's weight.",
  },
  {
    id: "fb-story",
    platform: "Facebook",
    placement: "Story, 9:16",
    w: 1080,
    h: 1920,
    maxSeconds: 20,
    writeUnderMb: 35,
    platformCapMb: 4096,
    safeTop: 0.14,
    safeBottom: 0.2,
    note: "Short and front-loaded: the accent word has to land in the first two seconds.",
  },
  {
    id: "x-feed-landscape",
    platform: "X",
    placement: "Feed video, 16:9",
    w: 1280,
    h: 720,
    maxSeconds: 20,
    writeUnderMb: 30,
    platformCapMb: 512,
    safeTop: 0,
    safeBottom: 0,
    note: "Tight ceiling on the platform side, so this one is written lightest.",
  },
  {
    id: "x-feed-square",
    platform: "X",
    placement: "Feed video, square",
    w: 1080,
    h: 1080,
    maxSeconds: 20,
    writeUnderMb: 30,
    platformCapMb: 512,
    safeTop: 0,
    safeBottom: 0,
    note: "Square crops less in the timeline than 16:9.",
  },
  {
    id: "tiktok",
    platform: "TikTok",
    placement: "In-feed, 9:16",
    w: 1080,
    h: 1920,
    maxSeconds: 30,
    writeUnderMb: 60,
    platformCapMb: 287,
    safeTop: 0.1,
    safeBottom: 0.24,
    note: "The heaviest interface of the set — the bottom quarter is captions and buttons.",
  },
  {
    id: "yt-short",
    platform: "YouTube",
    placement: "Short, 9:16",
    w: 1080,
    h: 1920,
    maxSeconds: 30,
    writeUnderMb: 60,
    platformCapMb: 256,
    safeTop: 0.1,
    safeBottom: 0.18,
    note: "Loops on repeat, so the last frame should sit close to the first.",
  },
  {
    id: "site-hero",
    platform: "Owned",
    placement: "Site / deck hero, 16:9",
    w: 1920,
    h: 1080,
    maxSeconds: 12,
    writeUnderMb: 12,
    platformCapMb: 12,
    safeTop: 0,
    safeBottom: 0,
    note: "Silent background loop on our own pages — written light so it starts instantly.",
  },
];

export function bloomPlacement(id: string): BloomPlacement {
  return BLOOM_PLACEMENTS.find((p) => p.id === id) ?? BLOOM_PLACEMENTS[0]!;
}

/** The placements grouped by platform, in the order above. */
export function bloomPlacementsByPlatform(): { platform: string; placements: BloomPlacement[] }[] {
  const out: { platform: string; placements: BloomPlacement[] }[] = [];
  for (const p of BLOOM_PLACEMENTS) {
    const row = out.find((r) => r.platform === p.platform);
    if (row) row.placements.push(p);
    else out.push({ platform: p.platform, placements: [p] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Motion presets

export type BloomMotionPreset = {
  id: string;
  label: string;
  /** Plain description for the board. */
  says: string;
  /** How far the picture is pushed in at the start (1 = no push). */
  push: number;
  /** How far the picture drifts across its frame, as a share of the frame. */
  drift: { x: number; y: number };
  /** Words rise this far, as a share of the short edge. */
  rise: number;
  /** Seconds between one word and the next. */
  stagger: number;
  /** How much bigger the accent word starts before it settles. */
  turnOvershoot: number;
  /** A light sweep crosses the picture once when true. */
  sweep: boolean;
  /** The last frame returns to the first, for placements that loop. */
  loopSafe: boolean;
};

export const BLOOM_MOTION_PRESETS: BloomMotionPreset[] = [
  {
    id: "lift",
    label: "Quiet lift",
    says: "The picture pushes in slowly while the line rises word by word.",
    push: 1.1,
    drift: { x: 0.012, y: -0.02 },
    rise: 0.05,
    stagger: 0.09,
    turnOvershoot: 1.22,
    sweep: false,
    loopSafe: false,
  },
  {
    id: "travel",
    label: "Long travel",
    says: "A long pan across the photograph, the words already holding.",
    push: 1.18,
    drift: { x: 0.075, y: 0 },
    rise: 0.03,
    stagger: 0.05,
    turnOvershoot: 1.1,
    sweep: false,
    loopSafe: false,
  },
  {
    id: "turn",
    label: "Turn and settle",
    says: "The accent word arrives big and settles into the line.",
    push: 1.06,
    drift: { x: -0.02, y: 0.02 },
    rise: 0.045,
    stagger: 0.11,
    turnOvershoot: 1.55,
    sweep: false,
    loopSafe: false,
  },
  {
    id: "sweep",
    label: "Light sweep",
    says: "Light crosses the picture once as the line completes.",
    push: 1.12,
    drift: { x: 0.02, y: -0.015 },
    rise: 0.04,
    stagger: 0.08,
    turnOvershoot: 1.28,
    sweep: true,
    loopSafe: false,
  },
  {
    id: "hold",
    label: "Held drift",
    says: "Almost still: a slow drift only, for looping placements and banners.",
    push: 1.07,
    drift: { x: 0.03, y: 0 },
    rise: 0.018,
    stagger: 0.04,
    turnOvershoot: 1.06,
    sweep: false,
    loopSafe: true,
  },
];

export function bloomPreset(id: string): BloomMotionPreset {
  return BLOOM_MOTION_PRESETS.find((p) => p.id === id) ?? BLOOM_MOTION_PRESETS[0]!;
}

/** What every part of the ad is doing at one moment of the clip. */
export type BloomMotionFrame = {
  /** The photograph inside its frame — the frame itself never moves. */
  photo: { scale: number; x: number; y: number };
  /** The whole picture unit, easing into place at the top of the clip. */
  frame: { scale: number; opacity: number };
  bloom: { scale: number; opacity: number };
  splash: { scale: number; opacity: number };
  /** Per-word reveal of the headline: how far through the line the reveal is. */
  words: { progress: number; rise: number };
  turn: { scale: number; opacity: number; rise: number };
  support: { opacity: number; rise: number };
  logo: { opacity: number; rise: number };
  /** -1 when no sweep, otherwise 0–1 across the picture. */
  sweep: number;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ease out on a 0–1 window of the clip. */
function seg(t: number, from: number, to: number): number {
  if (to <= from) return t >= to ? 1 : 0;
  return clamp01((t - from) / (to - from));
}
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/**
 * The ad's state `t` seconds into a clip of `seconds`. Everything is a plain
 * number, so the same frame drives the on-screen preview and the written file.
 */
export function bloomMotionFrame(
  preset: BloomMotionPreset,
  t: number,
  seconds: number,
): BloomMotionFrame {
  const dur = Math.max(0.5, seconds);
  const time = Math.max(0, Math.min(dur, t));
  const p = time / dur;

  // The picture travels for the whole clip; on a looping preset it comes back.
  const travel = preset.loopSafe ? Math.sin(p * Math.PI * 2) * 0.5 + 0.5 : easeInOut(p);
  const settle = preset.loopSafe ? travel : p;
  const scale = preset.push + (1 - preset.push) * settle;

  const inA = easeOut(seg(p, 0, 0.28));
  const words = seg(p, 0.1, 0.1 + Math.min(0.55, preset.stagger * 8));
  const turnIn = easeOut(seg(p, 0.22, 0.58));
  const supportIn = easeOut(seg(p, 0.4, 0.72));
  const logoIn = easeOut(seg(p, 0.55, 0.85));

  return {
    photo: {
      scale,
      x: preset.drift.x * (travel - 0.5) * 2,
      y: preset.drift.y * (travel - 0.5) * 2,
    },
    frame: { scale: 1 + (1 - inA) * 0.02, opacity: inA },
    bloom: { scale: 0.94 + inA * 0.06, opacity: inA },
    splash: { scale: 0.9 + easeOut(seg(p, 0.1, 0.7)) * 0.1, opacity: easeOut(seg(p, 0.05, 0.6)) },
    words: { progress: easeOut(words), rise: (1 - easeOut(words)) * preset.rise },
    turn: {
      scale: preset.turnOvershoot + (1 - preset.turnOvershoot) * turnIn,
      opacity: turnIn,
      rise: (1 - turnIn) * preset.rise * 1.4,
    },
    support: { opacity: supportIn, rise: (1 - supportIn) * preset.rise * 0.7 },
    logo: { opacity: logoIn, rise: (1 - logoIn) * preset.rise * 0.4 },
    sweep: preset.sweep ? seg(p, 0.45, 0.8) : -1,
  };
}

// ---------------------------------------------------------------------------
// Weight: how hard to write, so a clip lands inside its placement

/**
 * Bits per second for a clip of `seconds` that must stay under the placement's
 * written weight. A tenth is left for the container and the audio-free header.
 */
export function bloomVideoBitrate(placement: BloomPlacement, seconds: number): number {
  const cap = Math.min(placement.writeUnderMb, placement.platformCapMb);
  const budgetBits = cap * 1024 * 1024 * 8 * 0.88;
  const wanted = budgetBits / Math.max(1, seconds);
  // A floor keeps a long clip watchable; a ceiling stops a short one being
  // written far heavier than the picture needs.
  const pixels = placement.w * placement.h;
  const ceiling = pixels * 0.11 * 30; // ~ 3.5 Mbps at 1080x1080, 30fps
  return Math.round(Math.max(1_400_000, Math.min(wanted, ceiling)));
}

/** The weight a clip is expected to land at, in MB, for the board to show. */
export function bloomExpectedMb(placement: BloomPlacement, seconds: number): number {
  const bits = bloomVideoBitrate(placement, seconds) * seconds;
  return Math.round((bits / 8 / 1024 / 1024) * 10) / 10;
}

/** Longest clip a placement takes, and the longest this campaign writes. */
export function bloomClipSeconds(placement: BloomPlacement, wanted: number): number {
  return Math.max(3, Math.min(placement.maxSeconds, Math.round(wanted)));
}

// ---------------------------------------------------------------------------
// Naming and the specification sheet

/** e.g. TP-LEGAL_BLOOM_TRICKY_LI-FEED-SQUARE_1080x1080_8s_30fps_v1 */
export function bloomMotionStem(
  scene: BloomScene,
  placement: BloomPlacement,
  seconds: number,
  fps: number,
): string {
  return [
    BLOOM_PACK_BRAND,
    BLOOM_PACK_CAMPAIGN,
    packToken(scene.turn),
    packToken(placement.id),
    `${placement.w}x${placement.h}`,
    `${Math.round(seconds)}s`,
    `${fps}fps`,
    BLOOM_PACK_VERSION,
  ].join("_");
}

/** e.g. 04_Motion/LinkedIn_Feed-video-square_1080x1080/ */
export function bloomMotionFolder(placement: BloomPlacement): string {
  const platform = packToken(placement.platform)
    .split("-")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join("-");
  const place = packToken(placement.placement)
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
  return `${platform}_${place}_${placement.w}x${placement.h}`;
}

export function bloomMotionPath(
  scene: BloomScene,
  placement: BloomPlacement,
  seconds: number,
  fps: number,
  ext: string,
): string {
  return `04_Motion/${bloomMotionFolder(placement)}/${bloomMotionStem(scene, placement, seconds, fps)}.${ext}`;
}

/** The placement sheet: what each social location takes, and what we wrote. */
export function bloomMotionSpecCsv(
  placements: BloomPlacement[],
  seconds: number,
  fps: number,
): string {
  return csvRows([
    [
      "platform",
      "placement",
      "width_px",
      "height_px",
      "aspect",
      "clip_seconds",
      "fps",
      "written_under_mb",
      "expected_mb",
      "platform_cap_mb",
      "safe_top_pct",
      "safe_bottom_pct",
      "folder",
      "note",
    ],
    ...placements.map((p) => {
      const secs = bloomClipSeconds(p, seconds);
      return [
        p.platform,
        p.placement,
        String(p.w),
        String(p.h),
        bloomAspectLabel(p.w, p.h),
        String(secs),
        String(fps),
        String(p.writeUnderMb),
        String(bloomExpectedMb(p, secs)),
        String(p.platformCapMb),
        String(Math.round(p.safeTop * 100)),
        String(Math.round(p.safeBottom * 100)),
        bloomMotionFolder(p),
        p.note,
      ];
    }),
  ]);
}

export function bloomAspectLabel(w: number, h: number): string {
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
  const d = g(w, h);
  return `${w / d}:${h / d}`;
}

/** The motion sheet for the pack readme. */
export function bloomMotionReadme(
  scenes: BloomScene[],
  placements: BloomPlacement[],
  preset: BloomMotionPreset,
  seconds: number,
  fps: number,
  ext: string,
): string {
  const lines: string[] = [];
  lines.push("04_Motion — the moving versions");
  lines.push("");
  lines.push(`Motion:      ${preset.label} — ${preset.says}`);
  lines.push(`Length:      up to ${Math.round(seconds)}s, ${fps} frames a second, no sound`);
  lines.push(`Format:      .${ext}, one folder per platform placement`);
  lines.push("");
  lines.push("HOW THE MOTION IS BUILT");
  lines.push("  · the photograph travels inside its frame; the frame itself never moves");
  lines.push("  · the line rises word by word, and the accent word settles in last");
  lines.push("  · the lockup lands after the words and holds to the end");
  lines.push("");
  lines.push("PLACEMENTS IN THIS PACK");
  for (const p of placements) {
    const secs = bloomClipSeconds(p, seconds);
    lines.push(
      `  ${p.platform} · ${p.placement} — ${p.w}x${p.h} (${bloomAspectLabel(p.w, p.h)}), ${secs}s, under ${p.writeUnderMb}MB`,
    );
    if (p.safeTop || p.safeBottom) {
      lines.push(
        `      interface safe band: top ${Math.round(p.safeTop * 100)}%, bottom ${Math.round(p.safeBottom * 100)}%`,
      );
    }
  }
  lines.push("");
  lines.push("ADS IN THIS PACK");
  for (const s of scenes) lines.push(`  ${bloomHeadline(s)}`);
  lines.push("");
  lines.push("These are screen deliverables for social and owned channels. They carry no");
  lines.push("call to action and no typed division name — the lockup carries it.");
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// Geometry the canvas renderer needs
//
// The still ad states its frame as a CSS border-radius. A canvas has to build
// the same shape from numbers, so the radii live here in one place.

export function bloomCornerRadii(
  aperture: BloomAperture,
  w: number,
  h: number,
): { tl: number; tr: number; br: number; bl: number } {
  const short = Math.min(w, h);
  const r = aperture.startsWith("turn") ? short / 2 : short / 4;
  return aperture.endsWith("left")
    ? { tl: r, tr: 0, br: r, bl: 0 }
    : { tl: 0, tr: r, br: 0, bl: r };
}

// ---------------------------------------------------------------------------
// Keeping the words out from under the platform's own interface
//
// A story or reel places captions, buttons and a profile row over the frame.
// The picture may run behind them, but the line, the supporting sentence and the
// lockup have to sit inside the clear band.

export function bloomSafeLayout<T extends { copy: { x: number; y: number; w: number; h: number }; lockup: { x: number; y: number; h: number } }>(
  layout: T,
  safeTop: number,
  safeBottom: number,
): T {
  if (safeTop <= 0 && safeBottom <= 0) return layout;
  const span = Math.max(0.2, 1 - safeTop - safeBottom);
  return {
    ...layout,
    copy: {
      ...layout.copy,
      y: safeTop + layout.copy.y * span,
      h: layout.copy.h * span,
    },
    lockup: {
      ...layout.lockup,
      y: safeBottom + layout.lockup.y,
    },
  };
}
