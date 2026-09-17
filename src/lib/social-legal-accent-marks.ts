// Hand-drawn accent marks for the "You're not on it alone." Legal set.
//
// The set used to resolve on a straight gradient hairline. Straight, evenly
// weighted rules read as software drawing a box: they are the tell of a
// generated ad. Every rule in the campaign is now a DRAWN mark — a brush pass,
// a return loop, a chalk swell, a run of ticks — built from a deterministic
// jitter so the same ad always draws the same stroke, and set in one of the
// brand's own accent colours rather than always the same blue.
//
// Geometry is authored in a 0..100 by 0..16 box and stretched by the caller, so
// one mark works on a banner and on a story trim.

export type AccentMarkKind =
  | "brush" // one tapered pass, heavy at the start, dry at the tail
  | "return" // a pass and a faster return pass under it
  | "swell" // pressure in the middle, lifting at both ends
  | "ticks" // a run of short hand ticks
  | "sweep" // a long swept curve
  | "wave" // a slow drawn wave
  | "cross" // one pass crossed at the tail
  | "chalk"; // a broken, dragged line

export type AccentMarkTint = "accent" | "aqua" | "lavender" | "chalk" | "ink";

/** Brand-legal colours a mark may be drawn in. Accents are marks, never text. */
export const ACCENT_MARK_COLORS: Record<AccentMarkTint, string> = {
  accent: "#003FC7",
  aqua: "#A1FBF9",
  lavender: "#C2A3FF",
  chalk: "#EEF1F7",
  ink: "#FFFFFF",
};

export type SceneAccentMark = {
  kind: AccentMarkKind;
  tint: AccentMarkTint;
  /** Marks the word-level call-out underline in the same hand. */
  wordKind: AccentMarkKind;
};

const KINDS: AccentMarkKind[] = [
  "brush",
  "return",
  "swell",
  "ticks",
  "sweep",
  "wave",
  "cross",
  "chalk",
];

const WORD_KINDS: AccentMarkKind[] = ["brush", "return", "swell", "wave", "chalk"];

// On the campaign's near-black ground a hairline of Blue 500 disappears, so the
// drawn marks lean on the light secondaries and keep blue for the heavier hands.
const TINTS: AccentMarkTint[] = ["aqua", "lavender", "chalk", "accent", "aqua", "lavender"];

/** Small stable string hash, so a scene always draws the same hand. */
export function markSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Which mark a scene draws. Kind and colour both come off the seed, so the set
 * carries eight hands and four colours instead of one hairline.
 */
export function alongsideAccentMark(sceneId: string): SceneAccentMark {
  const seed = markSeed(sceneId);
  const r = rng(seed);
  return {
    kind: KINDS[Math.floor(r() * KINDS.length)]!,
    tint: TINTS[Math.floor(r() * TINTS.length)]!,
    wordKind: WORD_KINDS[Math.floor(r() * WORD_KINDS.length)]!,
  };
}

export type MarkStroke = {
  d: string;
  /** Stroke weight in box units; 0 means the path is filled instead. */
  width: number;
  fill?: boolean;
  opacity?: number;
};

const n = (v: number) => Math.round(v * 100) / 100;

/**
 * The drawn geometry for a mark, in a 100 × 16 box. `weight` scales the hand
 * from a fine pen (0.7) to a loaded brush (1.6).
 */
export function accentMarkStrokes(
  kind: AccentMarkKind,
  seed: number,
  weight = 1,
): MarkStroke[] {
  const r = rng(seed);
  const j = (amt: number) => (r() - 0.5) * amt;
  const y = 9 + j(1.2);

  switch (kind) {
    case "brush": {
      // A loaded start that dries out: drawn as a filled taper, not a rule.
      const top = y - 2.4 * weight;
      const bot = y + 2.1 * weight;
      return [
        {
          d: `M0 ${n(top + j(0.4))} C ${n(26 + j(6))} ${n(top - 0.9)}, ${n(62 + j(6))} ${n(top + 1.1)}, 100 ${n(y - 0.35 * weight)} L 100 ${n(y + 0.35 * weight)} C ${n(64 + j(6))} ${n(bot - 0.4)}, ${n(28 + j(6))} ${n(bot + 0.7)}, 0 ${n(bot + j(0.4))} Z`,
          width: 0,
          fill: true,
        },
      ];
    }
    case "return": {
      // One pass out, one faster pass back that overshoots at the left.
      return [
        {
          d: `M1 ${n(y - 1.4 + j(0.5))} C ${n(30 + j(8))} ${n(y - 3 + j(1))}, ${n(68 + j(8))} ${n(y - 0.4 + j(1))}, ${n(99 + j(1))} ${n(y - 1.8 + j(0.6))}`,
          width: 1.5 * weight,
        },
        {
          d: `M${n(97 + j(2))} ${n(y + 2.1 + j(0.5))} C ${n(66 + j(9))} ${n(y + 3.4)}, ${n(28 + j(9))} ${n(y + 1.2)}, ${n(-2 + j(2))} ${n(y + 2.8 + j(0.6))}`,
          width: 1.05 * weight,
          opacity: 0.72,
        },
      ];
    }
    case "swell": {
      // Pressure in the middle of the pass, lifting off both ends.
      const mid = y + j(0.5);
      return [
        {
          d: `M0 ${n(mid - 0.35)} C ${n(20 + j(4))} ${n(mid - 2.6 * weight)}, ${n(58 + j(6))} ${n(mid - 3.1 * weight)}, 100 ${n(mid - 0.3)} C ${n(58 + j(6))} ${n(mid + 2.3 * weight)}, ${n(20 + j(4))} ${n(mid + 1.9 * weight)}, 0 ${n(mid + 0.35)} Z`,
          width: 0,
          fill: true,
        },
      ];
    }
    case "ticks": {
      // A run of quick ticks, each one leaning a slightly different way.
      const count = 6;
      const out: MarkStroke[] = [];
      for (let i = 0; i < count; i += 1) {
        const x = 2 + (i * 96) / count + j(1.6);
        const lean = j(2.4);
        const len = 4.4 + j(1.6);
        out.push({
          d: `M${n(x)} ${n(y - len / 2)} C ${n(x + lean * 0.4)} ${n(y - len / 5)}, ${n(x + lean * 0.7)} ${n(y + len / 5)}, ${n(x + lean)} ${n(y + len / 2)}`,
          width: 1.35 * weight,
          opacity: 1 - i * 0.09,
        });
      }
      return out;
    }
    case "sweep": {
      // A long swept curve that lifts away at the tail.
      return [
        {
          d: `M0 ${n(y + 3.2 + j(0.6))} C ${n(24 + j(6))} ${n(y + 1.4)}, ${n(56 + j(8))} ${n(y - 2.2)}, ${n(99 + j(1))} ${n(y - 4.4 + j(0.8))}`,
          width: 1.7 * weight,
        },
      ];
    }
    case "wave": {
      // A slow drawn wave — the same hand as a signature flourish.
      return [
        {
          d: `M0 ${n(y + j(0.6))} C ${n(14 + j(3))} ${n(y - 3.4)}, ${n(30 + j(3))} ${n(y + 3.2)}, ${n(48 + j(3))} ${n(y - 0.3)} C ${n(66 + j(3))} ${n(y - 3.6)}, ${n(82 + j(3))} ${n(y + 3)}, 100 ${n(y - 0.6 + j(0.6))}`,
          width: 1.5 * weight,
        },
      ];
    }
    case "cross": {
      // One pass, crossed near the tail by a shorter one.
      return [
        {
          d: `M0 ${n(y + 1 + j(0.5))} C ${n(32 + j(8))} ${n(y - 1.6)}, ${n(70 + j(8))} ${n(y + 1.2)}, 100 ${n(y - 1.4 + j(0.5))}`,
          width: 1.6 * weight,
        },
        {
          d: `M${n(74 + j(4))} ${n(y - 5 + j(1))} C ${n(80)} ${n(y - 1)}, ${n(84)} ${n(y + 2)}, ${n(90 + j(3))} ${n(y + 5 + j(1))}`,
          width: 1.15 * weight,
          opacity: 0.8,
        },
      ];
    }
    case "chalk":
    default: {
      // A dragged line that breaks twice, the way chalk skips on board.
      const segs: [number, number][] = [
        [0, 52 + j(8)],
        [57 + j(4), 88 + j(6)],
        [92 + j(3), 100],
      ];
      return segs.map(([a, b], i) => ({
        d: `M${n(a)} ${n(y + j(1.4))} C ${n(a + (b - a) * 0.35)} ${n(y - 1.4 + j(1))}, ${n(a + (b - a) * 0.7)} ${n(y + 1.3 + j(1))}, ${n(b)} ${n(y + j(1.4))}`,
        width: (1.55 - i * 0.18) * weight,
        opacity: 1 - i * 0.14,
      }));
    }
  }
}

/**
 * The same geometry as a background-image data URI, for underlining a single
 * word inside a line of type where an SVG child cannot sit.
 */
export function accentMarkDataUri(
  kind: AccentMarkKind,
  seed: number,
  color: string,
  weight = 1,
): string {
  const strokes = accentMarkStrokes(kind, seed, weight);
  const body = strokes
    .map((s) =>
      s.fill
        ? `<path d="${s.d}" fill="${color}" opacity="${s.opacity ?? 1}"/>`
        : `<path d="${s.d}" fill="none" stroke="${color}" stroke-width="${s.width}" stroke-linecap="round" opacity="${s.opacity ?? 1}"/>`,
    )
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 16" preserveAspectRatio="none">${body}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}
