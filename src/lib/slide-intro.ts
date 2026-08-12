// Intro choreography for enlarged module previews.
//
// Every module in the library gets an entrance animation when it opens in the
// lightbox — previously only a handful of modules happened to move (hero
// ken-burns, video autoplay), which read as inconsistent. The recipe is chosen
// from the variant id so each layout family animates in a way that suits its
// structure: bento tiles pop in a grid cascade, step chains sweep left→right,
// comparison splits fly in from their own side, image-led slides wipe up.

export type IntroOrder =
  | "top-down"
  | "left-right"
  | "grid"
  | "center-out"
  // Flywheels/rings/orbits: walk the spokes clockwise from the top of the hub.
  | "clockwise";
export type IntroKeyframe =
  | "tp-in-rise"
  | "tp-in-lift"
  | "tp-in-pop"
  | "tp-in-left"
  | "tp-in-right"
  | "tp-in-clip"
  | "tp-in-step"
  | "tp-in-spin"
  | "tp-in-grow"
  | "tp-in-grow-x"
  | "tp-in-count"
  | "tp-in-orbit";

export type IntroRecipe = {
  id: string;
  /** Human label shown in the lightbox chrome. */
  label: string;
  /** Base keyframe used for every item unless `split` is set. */
  keyframe: IntroKeyframe;
  /** Comparison layouts: items left of centre come from the left, right from the right. */
  split?: boolean;
  order: IntroOrder;
  /** Per-item stagger in ms. */
  stepMs: number;
  /** Per-item animation duration in ms. */
  durationMs: number;
  /** Delay before the first item moves. */
  leadMs: number;
};

const RECIPES: Record<string, IntroRecipe> = {
  bento: {
    id: "bento",
    label: "Grid cascade",
    keyframe: "tp-in-pop",
    order: "grid",
    stepMs: 55,
    durationMs: 520,
    leadMs: 90,
  },
  chain: {
    id: "chain",
    label: "Left-to-right sweep",
    keyframe: "tp-in-left",
    order: "left-right",
    stepMs: 70,
    durationMs: 540,
    leadMs: 90,
  },
  // Numbered sequences (step chains, phases, arc flows, timelines): a slower,
  // punchier beat per item so the viewer reads step 1 → 2 → 3 as discrete
  // moves instead of one soft wash.
  steps: {
    id: "steps",
    label: "Step-by-step build",
    keyframe: "tp-in-step",
    order: "left-right",
    stepMs: 190,
    durationMs: 460,
    leadMs: 140,
  },
  // Same punchy per-item beat as `steps`, but for stacked/vertical sequences
  // (vertical timelines, agendas, checklists, next-step lists) so the build
  // reads down the page in the order the numbering implies.
  stepsDown: {
    id: "steps-down",
    label: "Step-by-step build (down)",
    keyframe: "tp-in-step",
    order: "top-down",
    stepMs: 190,
    durationMs: 460,
    leadMs: 140,
  },
  split: {
    id: "split",
    label: "Split converge",
    keyframe: "tp-in-left",
    split: true,
    order: "center-out",
    stepMs: 80,
    durationMs: 600,
    leadMs: 100,
  },
  // Circular data devices (orbit stats, donuts, gauges, dials): the ring draws
  // itself while the satellites fly outward along their own radius, clockwise
  // from 12 o'clock. Lead is longer than other recipes so the ring is already
  // sweeping before the first label lands on it.
  orbit: {
    id: "orbit",
    label: "Ring draw + orbit",
    keyframe: "tp-in-orbit",
    order: "clockwise",
    stepMs: 105,
    durationMs: 560,
    leadMs: 260,
  },
  // Hub & satellite layouts (centre disc + orbiting nodes + flanking copy):
  // the connector ring draws itself on, then the satellites radiate outward
  // along their own radius clockwise from 12 o'clock while the copy blocks
  // ride the same beat. Settles on the exact static design so the PPTX /
  // print raster is unchanged.
  hub: {
    id: "hub",
    label: "Hub radiate",
    keyframe: "tp-in-orbit",
    order: "clockwise",
    stepMs: 95,
    durationMs: 580,
    leadMs: 300,
  },
  // Flywheels and cycles: spokes swing in clockwise around the hub.
  cycle: {
    id: "cycle",
    label: "Flywheel spin-up",
    keyframe: "tp-in-spin",
    order: "clockwise",
    stepMs: 130,
    durationMs: 560,
    leadMs: 120,
  },
  // Charts: series grow off their baseline left→right like a plot being drawn.
  plot: {
    id: "plot",
    label: "Chart plot-in",
    keyframe: "tp-in-grow",
    order: "left-right",
    stepMs: 75,
    durationMs: 640,
    leadMs: 120,
  },
  // Horizontal bar/row charts fill sideways rather than growing off a baseline.
  plotX: {
    id: "plot-x",
    label: "Bars fill across",
    keyframe: "tp-in-grow-x",
    order: "top-down",
    stepMs: 110,
    durationMs: 620,
    leadMs: 120,
  },
  // Stat/KPI walls: figures snap into focus one at a time, like a tally.
  figures: {
    id: "figures",
    label: "Figures tally",
    keyframe: "tp-in-count",
    order: "left-right",
    stepMs: 145,
    durationMs: 520,
    leadMs: 130,
  },
  data: {
    id: "data",
    label: "Figures lift",
    keyframe: "tp-in-lift",
    order: "top-down",
    stepMs: 85,
    durationMs: 620,
    leadMs: 110,
  },
  media: {
    id: "media",
    label: "Editorial wipe",
    keyframe: "tp-in-clip",
    order: "top-down",
    stepMs: 120,
    durationMs: 760,
    leadMs: 80,
  },
  wall: {
    id: "wall",
    label: "Logo shimmer",
    keyframe: "tp-in-pop",
    order: "grid",
    stepMs: 38,
    durationMs: 460,
    leadMs: 80,
  },
  editorial: {
    id: "editorial",
    label: "Copy rise",
    keyframe: "tp-in-rise",
    order: "top-down",
    stepMs: 110,
    durationMs: 700,
    leadMs: 100,
  },
  default: {
    id: "default",
    label: "Content rise",
    keyframe: "tp-in-rise",
    order: "top-down",
    stepMs: 90,
    durationMs: 620,
    leadMs: 100,
  },
};

const MATCHERS: Array<[RegExp, IntroRecipe]> = [
  // Hub layouts radiate from the centre outward; arc flows sweep like a chain.
  [/HUB/, RECIPES.hub],
  [/^MV-INFO-SATELLITES/, RECIPES.hub],
  [/^MV-PROC-ARC-FLOW/, RECIPES.steps],
  // Comparison-shaped process modules keep the converge build.
  [/^MV-PROC-BEFORE-AFTER/, RECIPES.split],
  // Every sequenced/numbered process module gets the same defined step beat as
  // the numbered step chain — vertical stacks build downward, rails sweep across.
  [
    /^MV-(PROC-JOURNEY-VERTICAL|PROC-SWIMLANE-FLOW|TIMELINE-VERTICAL|OP-AGENDA|OP-DIVIDER-NUMBERED|CLOSE-CHECKLIST|CLOSE-TIMELINE|DEC-CHECKLIST|REC-NEXT|CTX-CHALLENGE-STACK|RISK-MITIGATION|GOV-RACI)/,
    RECIPES.stepsDown,
  ],
  [/^MV-(PROC|HORIZON|MATURITY-CURVE)/, RECIPES.steps],
  [/^MV-BENTO/, RECIPES.bento],
  // Cyclical devices spin up; charts plot in; figure walls tally.
  [/(ORBIT|DONUT|GAUGE|PIE|RADIAL|RING|DIAL)/, RECIPES.orbit],
  [/(FLYWHEEL|CYCLE|LOOP)/, RECIPES.cycle],
  [/(BAR-COMPARE|PERCENT-COMPARE|STACKED-BAR|CATEGORY-BARS|GAUGE-ROW|RANKING|LEADERBOARD)/, RECIPES.plotX],
  [
    /(GRAPH|CHART|BARS?|COLUMNS?|AREA|WATERFALL|HEATMAP|TREEMAP|BUBBLE|LINE-MULTI|SERIES|TREND|SPARK|FUNNEL|BREAKDOWN)/,
    RECIPES.plot,
  ],
  [
    /^MV-(STAT|PROOF-STATS|NUMBERS|KPI|CASE-METRICS|QUOTE-METRIC|CTX-STAT|DASH-REGION-STATS|DASH-SUMMARY|LOC-WORLD-STATS|CLOSE-METRIC)/,
    RECIPES.figures,
  ],
  // Anything else that numbers or sequences its content gets the step build.
  [
    /^MV-(TIMELINE|TIME|JOURNEY|ROADMAP|PHASE|PROCESS|STEPS|NUMBERED)/,
    RECIPES.steps,
  ],
  [/(BEFORE-AFTER|COMPARE|COMPARISON|VERSUS|SPLIT-COMPARE|TWO-COL)/, RECIPES.split],
  [/^MV-(NUMBERS|KPI|DASH|PROOF|GRAPH|STAT|COUNTDOWN|ICEBERG|MATRIX|CLIENT-MATRIX)/, RECIPES.data],
  [/^MV-(IMG|EDITORIAL-IMAGE|OP-COVER|STAT-IMAGE|MEDIA|VIDEO|HERO)/, RECIPES.media],
  [/(LOGO|CLIENT-WALL|LOGOS)/, RECIPES.wall],
  [/^MV-(EDITORIAL|PULL|QUOTE|DEFINITION|PRINCIPLES|SPLIT)/, RECIPES.editorial],
];

export function introRecipeFor(variantId: string): IntroRecipe {
  for (const [re, recipe] of MATCHERS) if (re.test(variantId)) return recipe;
  return RECIPES.default;
}

/**
 * Order the collected blocks for the given choreography. `items` carry slide
 * coordinates (1920x1080 space) so ordering is layout-aware, not DOM-order.
 */
export function orderIntroItems<T extends { x: number; y: number; w: number }>(
  items: T[],
  order: IntroOrder,
): T[] {
  const rowBand = 120;
  const byRow = (a: T, b: T) => {
    const ra = Math.floor(a.y / rowBand);
    const rb = Math.floor(b.y / rowBand);
    return ra !== rb ? ra - rb : a.x - b.x;
  };
  switch (order) {
    case "left-right":
      return [...items].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
    case "grid":
      return [...items].sort(byRow);
    case "clockwise": {
      // Angle from the hub, starting at 12 o'clock and sweeping clockwise, so
      // the wheel builds in the direction the diagram implies.
      const cx = 960;
      const cy = 540;
      const angle = (b: T) => {
        const a = Math.atan2(b.x + b.w / 2 - cx, cy - b.y);
        return a < 0 ? a + Math.PI * 2 : a;
      };
      return [...items].sort((a, b) => angle(a) - angle(b));
    }
    case "center-out": {
      const cx = 960;
      return [...items].sort(
        (a, b) => Math.abs(a.x + a.w / 2 - cx) - Math.abs(b.x + b.w / 2 - cx),
      );
    }
    case "top-down":
    default:
      return [...items].sort(byRow);
  }
}

// ── Shared motion tokens ────────────────────────────────────────────────────
// One easing curve and one time budget for every module, so the library reads
// as a single choreographed system instead of per-recipe guesses. Animation is
// PRESENTATION ONLY: it lives in the SlideIntro wrapper and never touches the
// element tree the exporter rasterizes, which is why smoother motion can never
// cost export fidelity.

/** Canonical entrance easing: quick out, long settle (no overshoot wobble). */
export const INTRO_EASE = "cubic-bezier(0.22, 0.9, 0.24, 1)";

/**
 * The whole cascade must finish inside this window. Without a cap, an 18-tile
 * bento at 55ms/beat plus a 520ms move runs well past a second and reads slow;
 * capping compresses the stagger instead of shortening each move, so items keep
 * their individual smoothness while the slide settles promptly.
 */
export const INTRO_BUDGET_MS = 1250;

/**
 * Per-item delay for a recipe, compressed so lead + last beat + duration stays
 * within the budget. `beats` is the number of distinct beats (pinned steps let
 * several elements share one).
 */
export function introBeatDelay(recipe: IntroRecipe, beat: number, beats: number): number {
  const spare = Math.max(0, INTRO_BUDGET_MS - recipe.leadMs - recipe.durationMs);
  const lastBeat = Math.max(1, beats - 1);
  const step = Math.min(recipe.stepMs, spare / lastBeat);
  return Math.round(recipe.leadMs + beat * step);
}

/* ── Ring draw-on ─────────────────────────────────────────────────────────
 * Circular figures carry their progress in an SVG dash pattern. The intro
 * grows that dash from zero so the ring is drawn rather than revealed. Timing
 * lives here next to the recipes so the ring and its satellites stay in step.
 */

/** Any dash segment shorter than this is a decorative hairline, not a value arc. */
export const ARC_MIN_DASH_PX = 24;
/** Ring sweep duration. Deliberately longer than a block move — it is the hero. */
export const ARC_DRAW_MS = 900;
/** Second and later arcs on the same figure trail the first. */
export const ARC_STEP_MS = 120;
/** Sweep easing: quick off the mark, long settle, no overshoot on a curve. */
export const ARC_EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

/* ── Headline statistic emphasis ───────────────────────────────────────────
 * On stat/KPI/figure-led modules the single largest number is the point of the
 * slide, so it gets its own beat: it swells past its resting size, de-blurs and
 * settles back onto the authored type size (never a permanent scale change), and
 * an accent flare pulses out from behind it and disappears. Because both
 * keyframes land on the element's natural style — and inline animation is
 * stripped on animationend — the settled slide the PPTX rasterizer captures is
 * identical to the static design.
 */

/** Recipes whose slides are figure-led, and therefore get the hero-stat beat. */
export const HERO_STAT_RECIPES = new Set(["figures", "data", "orbit", "plot", "plot-x"]);
/** Below this rendered size (slide-space px) a number is a caption, not a hero. */
export const HERO_STAT_MIN_PX = 56;
/** How much bigger the hero must be than the runner-up to stand alone. */
export const HERO_STAT_DOMINANCE = 1.18;
/** At most this many figures get emphasised, largest first (stat walls/triptychs). */
export const HERO_STAT_MAX = 4;
/** Emphasis duration: longer than a block move — it is the memorable moment. */
export const HERO_STAT_MS = 780;
/** Each additional figure on a wall trails the previous one. */
export const HERO_STAT_STEP_MS = 130;
/** Beat offset after the figure's own container has begun landing. */
export const HERO_STAT_OFFSET_MS = 90;
/** Swell easing: fast attack, soft settle back to the resting size. */
export const HERO_STAT_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
