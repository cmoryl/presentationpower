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
//
// A standard motion library, grouped the way an edit suite groups it: camera
// moves on the photograph, reveals of the picture itself, typography arrivals,
// light passes, and loop-safe moves for placements that run round again.
//
// Every preset obeys the campaign: the photograph travels INSIDE its frame, the
// frame's turned shape never distorts, the accent word never ends smaller than
// the line, and the lockup lands last and holds to the end.

/** How the photograph itself travels inside the frame. */
export type BloomPhotoMove =
  | "push-in"
  | "pull-back"
  | "pan-right"
  | "pan-left"
  | "tilt-up"
  | "tilt-down"
  | "hold";

/** How the picture is uncovered at the top of the clip. */
export type BloomRevealMode =
  | "none"
  | "wipe-up"
  | "wipe-side"
  | "iris"
  | "corner"
  | "bloom-first";

/** How the line arrives. */
export type BloomTextMode =
  | "rise"
  | "cascade"
  | "fade"
  | "slide"
  | "typewrite"
  | "drop"
  | "hold";

export type BloomMotionFamily = "Camera" | "Reveal" | "Typography" | "Light" | "Loop";

export type BloomMotionPreset = {
  id: string;
  label: string;
  family: BloomMotionFamily;
  /** Plain description for the board. */
  says: string;
  /** How fast the whole thing reads. */
  pacing: "slow" | "steady" | "quick";
  photo: {
    move: BloomPhotoMove;
    /** Push or pull as a share of the frame (0.1 = 10% bigger at its widest). */
    zoom: number;
    /** Travel across the frame, as a share of the frame. */
    travel: number;
  };
  reveal: {
    mode: BloomRevealMode;
    /** Share of the clip by which the picture is fully uncovered. */
    until: number;
  };
  text: {
    mode: BloomTextMode;
    /** Seconds between one word and the next. */
    stagger: number;
    /** Words rise (or drop) this far, as a share of the short edge. */
    rise: number;
    /** Words slide in from this far to the side, as a share of the short edge. */
    slide: number;
    /** Share of the clip at which the line begins. */
    start: number;
  };
  /** How much bigger the accent word starts before it settles. */
  turnOvershoot: number;
  /** A light sweep crosses the picture once when true. */
  sweep: boolean;
  /** The last frame returns to the first, for placements that loop. */
  loopSafe: boolean;
  /** Share of the clip held fully composed at the end, for a clean last frame. */
  endHold: number;
};

export const BLOOM_MOTION_PRESETS: BloomMotionPreset[] = [
  // ---- Camera: the classic slow moves on a still photograph
  {
    id: "push-slow",
    label: "Slow push in",
    family: "Camera",
    says: "The photograph moves gently closer while the line rises word by word.",
    pacing: "slow",
    photo: { move: "push-in", zoom: 0.1, travel: 0.012 },
    reveal: { mode: "none", until: 0.28 },
    text: { mode: "rise", stagger: 0.09, rise: 0.05, slide: 0, start: 0.1 },
    turnOvershoot: 1.22,
    sweep: false,
    loopSafe: false,
    endHold: 0.12,
  },
  {
    id: "push-strong",
    label: "Strong push in",
    family: "Camera",
    says: "A firmer move in on the subject, for a short, punchy cut.",
    pacing: "quick",
    photo: { move: "push-in", zoom: 0.2, travel: 0.02 },
    reveal: { mode: "none", until: 0.18 },
    text: { mode: "cascade", stagger: 0.06, rise: 0.06, slide: 0, start: 0.06 },
    turnOvershoot: 1.34,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "pull-back",
    label: "Slow pull back",
    family: "Camera",
    says: "Opens tight on the subject and eases out to the whole scene.",
    pacing: "slow",
    photo: { move: "pull-back", zoom: 0.16, travel: 0.01 },
    reveal: { mode: "none", until: 0.3 },
    text: { mode: "fade", stagger: 0.05, rise: 0.03, slide: 0, start: 0.16 },
    turnOvershoot: 1.16,
    sweep: false,
    loopSafe: false,
    endHold: 0.16,
  },
  {
    id: "pan-across",
    label: "Pan across",
    family: "Camera",
    says: "A long move left to right across the photograph, the words holding.",
    pacing: "slow",
    photo: { move: "pan-right", zoom: 0.14, travel: 0.075 },
    reveal: { mode: "none", until: 0.24 },
    text: { mode: "rise", stagger: 0.05, rise: 0.03, slide: 0, start: 0.08 },
    turnOvershoot: 1.1,
    sweep: false,
    loopSafe: false,
    endHold: 0.12,
  },
  {
    id: "pan-back",
    label: "Pan back",
    family: "Camera",
    says: "The same long move, running the other way.",
    pacing: "slow",
    photo: { move: "pan-left", zoom: 0.14, travel: 0.075 },
    reveal: { mode: "none", until: 0.24 },
    text: { mode: "rise", stagger: 0.05, rise: 0.03, slide: 0, start: 0.08 },
    turnOvershoot: 1.1,
    sweep: false,
    loopSafe: false,
    endHold: 0.12,
  },
  {
    id: "tilt-up",
    label: "Tilt up",
    family: "Camera",
    says: "Rises up the frame — good for cliffs, masts and tall shots.",
    pacing: "steady",
    photo: { move: "tilt-up", zoom: 0.14, travel: 0.06 },
    reveal: { mode: "none", until: 0.26 },
    text: { mode: "rise", stagger: 0.08, rise: 0.055, slide: 0, start: 0.12 },
    turnOvershoot: 1.24,
    sweep: false,
    loopSafe: false,
    endHold: 0.12,
  },
  {
    id: "tilt-down",
    label: "Tilt down",
    family: "Camera",
    says: "Settles down the frame onto the subject.",
    pacing: "steady",
    photo: { move: "tilt-down", zoom: 0.14, travel: 0.06 },
    reveal: { mode: "none", until: 0.26 },
    text: { mode: "drop", stagger: 0.08, rise: 0.05, slide: 0, start: 0.12 },
    turnOvershoot: 1.24,
    sweep: false,
    loopSafe: false,
    endHold: 0.12,
  },

  // ---- Reveal: the picture itself is uncovered
  {
    id: "wipe-up",
    label: "Wipe up",
    family: "Reveal",
    says: "The picture is uncovered from the bottom up, then holds.",
    pacing: "steady",
    photo: { move: "push-in", zoom: 0.08, travel: 0.01 },
    reveal: { mode: "wipe-up", until: 0.34 },
    text: { mode: "rise", stagger: 0.08, rise: 0.05, slide: 0, start: 0.22 },
    turnOvershoot: 1.24,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "wipe-side",
    label: "Side wipe",
    family: "Reveal",
    says: "The picture opens across from the copy side outwards.",
    pacing: "quick",
    photo: { move: "pan-right", zoom: 0.08, travel: 0.03 },
    reveal: { mode: "wipe-side", until: 0.3 },
    text: { mode: "slide", stagger: 0.07, rise: 0.02, slide: 0.05, start: 0.18 },
    turnOvershoot: 1.2,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "iris-open",
    label: "Iris open",
    family: "Reveal",
    says: "The picture opens out from the middle of the frame.",
    pacing: "steady",
    photo: { move: "pull-back", zoom: 0.12, travel: 0.01 },
    reveal: { mode: "iris", until: 0.38 },
    text: { mode: "fade", stagger: 0.05, rise: 0.03, slide: 0, start: 0.28 },
    turnOvershoot: 1.18,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "corner-open",
    label: "Turned-corner open",
    family: "Reveal",
    says: "The picture arrives along its own turned diagonal — the house shape moving.",
    pacing: "steady",
    photo: { move: "push-in", zoom: 0.1, travel: 0.015 },
    reveal: { mode: "corner", until: 0.4 },
    text: { mode: "cascade", stagger: 0.09, rise: 0.05, slide: 0, start: 0.26 },
    turnOvershoot: 1.3,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "bloom-first",
    label: "Bloom first",
    family: "Reveal",
    says: "The colour blooms open on the empty ground and the picture lands into it.",
    pacing: "slow",
    photo: { move: "push-in", zoom: 0.12, travel: 0.012 },
    reveal: { mode: "bloom-first", until: 0.46 },
    text: { mode: "rise", stagger: 0.09, rise: 0.05, slide: 0, start: 0.34 },
    turnOvershoot: 1.28,
    sweep: false,
    loopSafe: false,
    endHold: 0.12,
  },

  // ---- Typography: the line does the work
  {
    id: "word-cascade",
    label: "Word cascade",
    family: "Typography",
    says: "Each word steps up in turn, one clearly after the other.",
    pacing: "steady",
    photo: { move: "push-in", zoom: 0.08, travel: 0.012 },
    reveal: { mode: "none", until: 0.22 },
    text: { mode: "cascade", stagger: 0.13, rise: 0.07, slide: 0, start: 0.08 },
    turnOvershoot: 1.3,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "type-on",
    label: "Type on",
    family: "Typography",
    says: "The line types itself on, letter by letter.",
    pacing: "quick",
    photo: { move: "hold", zoom: 0.05, travel: 0.008 },
    reveal: { mode: "none", until: 0.2 },
    text: { mode: "typewrite", stagger: 0.03, rise: 0, slide: 0, start: 0.08 },
    turnOvershoot: 1.12,
    sweep: false,
    loopSafe: false,
    endHold: 0.18,
  },
  {
    id: "line-slide",
    label: "Line slide in",
    family: "Typography",
    says: "The words slide in from the side and lock into place.",
    pacing: "quick",
    photo: { move: "pan-left", zoom: 0.08, travel: 0.03 },
    reveal: { mode: "none", until: 0.2 },
    text: { mode: "slide", stagger: 0.07, rise: 0.01, slide: 0.07, start: 0.08 },
    turnOvershoot: 1.2,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "drop-settle",
    label: "Drop and settle",
    family: "Typography",
    says: "The words drop in from above and settle.",
    pacing: "steady",
    photo: { move: "push-in", zoom: 0.09, travel: 0.012 },
    reveal: { mode: "none", until: 0.22 },
    text: { mode: "drop", stagger: 0.09, rise: 0.06, slide: 0, start: 0.1 },
    turnOvershoot: 1.26,
    sweep: false,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "turn-hero",
    label: "Accent word hero",
    family: "Typography",
    says: "The italic word arrives large and settles into the line — the campaign's own move.",
    pacing: "steady",
    photo: { move: "push-in", zoom: 0.07, travel: 0.015 },
    reveal: { mode: "none", until: 0.22 },
    text: { mode: "rise", stagger: 0.1, rise: 0.045, slide: 0, start: 0.06 },
    turnOvershoot: 1.62,
    sweep: false,
    loopSafe: false,
    endHold: 0.16,
  },

  // ---- Light: a single pass across the picture
  {
    id: "light-sweep",
    label: "Light sweep",
    family: "Light",
    says: "Light crosses the picture once as the line completes.",
    pacing: "steady",
    photo: { move: "push-in", zoom: 0.12, travel: 0.02 },
    reveal: { mode: "none", until: 0.24 },
    text: { mode: "rise", stagger: 0.08, rise: 0.04, slide: 0, start: 0.1 },
    turnOvershoot: 1.28,
    sweep: true,
    loopSafe: false,
    endHold: 0.14,
  },
  {
    id: "shine-hold",
    label: "Shine and hold",
    family: "Light",
    says: "Almost still, with one late pass of light and a long clean last frame.",
    pacing: "slow",
    photo: { move: "hold", zoom: 0.05, travel: 0.008 },
    reveal: { mode: "none", until: 0.2 },
    text: { mode: "fade", stagger: 0.04, rise: 0.02, slide: 0, start: 0.12 },
    turnOvershoot: 1.1,
    sweep: true,
    loopSafe: false,
    endHold: 0.24,
  },

  // ---- Loop: the last frame matches the first
  {
    id: "loop-breathe",
    label: "Loop breathe",
    family: "Loop",
    says: "A slow breath in and back out — seamless when the post loops.",
    pacing: "slow",
    photo: { move: "push-in", zoom: 0.07, travel: 0.01 },
    reveal: { mode: "none", until: 0.2 },
    text: { mode: "hold", stagger: 0.03, rise: 0.012, slide: 0, start: 0.02 },
    turnOvershoot: 1.06,
    sweep: false,
    loopSafe: true,
    endHold: 0,
  },
  {
    id: "loop-drift",
    label: "Loop drift",
    family: "Loop",
    says: "A drift across and back, for banners and site headers.",
    pacing: "slow",
    photo: { move: "pan-right", zoom: 0.06, travel: 0.03 },
    reveal: { mode: "none", until: 0.2 },
    text: { mode: "hold", stagger: 0.03, rise: 0.01, slide: 0, start: 0.02 },
    turnOvershoot: 1.04,
    sweep: false,
    loopSafe: true,
    endHold: 0,
  },
  {
    id: "end-card",
    label: "Held end card",
    family: "Loop",
    says: "Arrives early and holds still — a title card at the end of a longer edit.",
    pacing: "quick",
    photo: { move: "hold", zoom: 0.04, travel: 0.006 },
    reveal: { mode: "none", until: 0.14 },
    text: { mode: "fade", stagger: 0.03, rise: 0.02, slide: 0, start: 0.04 },
    turnOvershoot: 1.1,
    sweep: false,
    loopSafe: false,
    endHold: 0.4,
  },
];

export function bloomPreset(id: string): BloomMotionPreset {
  return BLOOM_MOTION_PRESETS.find((p) => p.id === id) ?? BLOOM_MOTION_PRESETS[0]!;
}

/** The presets grouped by family, in the order above. */
export function bloomPresetsByFamily(): { family: BloomMotionFamily; presets: BloomMotionPreset[] }[] {
  const out: { family: BloomMotionFamily; presets: BloomMotionPreset[] }[] = [];
  for (const p of BLOOM_MOTION_PRESETS) {
    const row = out.find((r) => r.family === p.family);
    if (row) row.presets.push(p);
    else out.push({ family: p.family, presets: [p] });
  }
  return out;
}

/** What every part of the ad is doing at one moment of the clip. */
export type BloomMotionFrame = {
  /** The photograph inside its frame — the frame itself never moves. */
  photo: { scale: number; x: number; y: number };
  /** The whole picture unit, easing into place at the top of the clip. */
  frame: {
    scale: number;
    opacity: number;
    /** 0–1 of the uncovering; 1 = fully visible. */
    reveal: number;
    revealMode: BloomRevealMode;
  };
  /**
   * The accent aura. `drift` is a slow wander in fractions of the short edge;
   * it runs whole cycles across the clip so the last frame matches the first.
   */
  bloom: { scale: number; opacity: number; driftX: number; driftY: number };
  splash: { scale: number; opacity: number; driftX: number; driftY: number };

  /** How the line arrives, and how far through that arrival this moment is. */
  words: { progress: number; rise: number; slide: number; mode: BloomTextMode };
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
  const raw = time / dur;

  // Everything after the hold point stays exactly as the hold point left it, so
  // the last frame of a clip is a clean, composed still.
  const active = Math.max(0.2, 1 - preset.endHold);
  const p = preset.loopSafe ? raw : clamp01(raw / active);

  // The camera move: a share of the clip travelled, coming back on a loop.
  const travel = preset.loopSafe ? Math.sin(raw * Math.PI * 2) * 0.5 + 0.5 : easeInOut(p);
  const journey = preset.loopSafe ? travel : travel;
  const z = preset.photo.zoom;
  const move = preset.photo.move;
  const scale =
    move === "pull-back" ? 1 + z * (1 - journey) : move === "hold" ? 1 + z * 0.5 : 1 + z * journey;
  const across = (journey - 0.5) * 2 * preset.photo.travel;
  const photo = {
    scale,
    x: move === "pan-right" ? across : move === "pan-left" ? -across : across * 0.18,
    y: move === "tilt-up" ? -across : move === "tilt-down" ? across : across * -0.12,
  };

  const inA = easeOut(seg(p, 0, preset.reveal.mode === "bloom-first" ? 0.1 : 0.24));
  const revealed =
    preset.reveal.mode === "none"
      ? 1
      : easeOut(seg(p, preset.reveal.mode === "bloom-first" ? 0.2 : 0.04, preset.reveal.until));
  const frameIn = preset.reveal.mode === "bloom-first" ? easeOut(seg(p, 0.2, 0.5)) : inA;

  const start = preset.text.start;
  // The whole arrival — line, supporting sentence and lockup — has to finish
  // before the clip does, whatever the pacing, so no clip ends mid-move.
  const span = Math.min(
    Math.min(0.62, Math.max(0.16, preset.text.stagger * 7)),
    Math.max(0.12, 0.94 - 0.32 - start),
  );
  const wordsRaw = preset.text.mode === "hold" ? 1 : seg(p, start, start + span);
  const words = preset.text.mode === "typewrite" ? wordsRaw : easeOut(wordsRaw);
  const turnIn =
    preset.text.mode === "hold"
      ? 1
      : easeOut(seg(p, start + span * 0.35, Math.min(0.94, start + span + 0.16)));
  const supportIn = easeOut(seg(p, start + span * 0.7, Math.min(0.96, start + span + 0.3)));
  const logoIn = easeOut(
    seg(p, Math.min(0.7, start + span + 0.06), Math.min(0.98, start + span + 0.32)),
  );

  return {
    photo,
    frame: {
      scale: 1 + (1 - frameIn) * 0.02,
      opacity: frameIn,
      reveal: revealed,
      revealMode: preset.reveal.mode,
    },
    bloom: {
      scale: (0.94 + inA * 0.06) * (1 + aura * 0.035),
      opacity: inA * (1 - auraB * 0.05),
      driftX: aura * 0.02,
      driftY: auraB * 0.016,
    },
    splash: {
      scale: (0.9 + easeOut(seg(p, 0.1, 0.7)) * 0.1) * (1 - aura * 0.03),
      opacity: easeOut(seg(p, 0.05, 0.6)) * (1 + auraB * 0.04),
      driftX: -auraB * 0.018,
      driftY: aura * 0.012,
    },

    words: {
      progress: words,
      rise: (1 - words) * preset.text.rise,
      slide: (1 - words) * preset.text.slide,
      mode: preset.text.mode,
    },
    turn: {
      scale: preset.turnOvershoot + (1 - preset.turnOvershoot) * turnIn,
      opacity: turnIn,
      rise: (1 - turnIn) * preset.text.rise * 1.4,
    },
    support: { opacity: supportIn, rise: (1 - supportIn) * preset.text.rise * 0.7 },
    logo: { opacity: logoIn, rise: (1 - logoIn) * preset.text.rise * 0.4 },
    sweep: preset.sweep ? seg(p, 0.45, 0.86) : -1,
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
