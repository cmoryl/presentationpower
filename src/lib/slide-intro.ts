// Intro choreography for enlarged module previews.
//
// Every module in the library gets an entrance animation when it opens in the
// lightbox — previously only a handful of modules happened to move (hero
// ken-burns, video autoplay), which read as inconsistent. The recipe is chosen
// from the variant id so each layout family animates in a way that suits its
// structure: bento tiles pop in a grid cascade, step chains sweep left→right,
// comparison splits fly in from their own side, image-led slides wipe up.

export type IntroOrder = "top-down" | "left-right" | "grid" | "center-out";
export type IntroKeyframe =
  | "tp-in-rise"
  | "tp-in-lift"
  | "tp-in-pop"
  | "tp-in-left"
  | "tp-in-right"
  | "tp-in-clip";

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
  [/^MV-BENTO/, RECIPES.bento],
  [/^MV-(PROC-STEP-CHAIN|TIME|TIMELINE|JOURNEY|ROADMAP|PHASE|PROCESS|PROC-FLOW)/, RECIPES.chain],
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
