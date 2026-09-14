/**
 * Where the ink actually sits inside each approved lockup file.
 *
 * The supplied Illustrator SVGs carry clear space inside their viewBox — the
 * City Series stacked mark starts roughly a fifth of the way down its own box.
 * Fitting that file into a layout box aligns the empty space, not the artwork,
 * so the logo reads as indented and floating above the copy. These are measured
 * ink boxes (a browser getBBox sweep over every drawn node) as fractions of the
 * viewBox: [left, top, width, height]. Every surface that places a lockup
 * positions the ink box, not the file box, so the mark sits flush on the same
 * left edge as the copy.
 *
 * Regenerate by re-measuring the files in public/next-2026/logos.
 */
const LOGO_INK: Record<string, [number, number, number, number]> = {
  "city-series-ssv1-color.svg": [0.01483, 0.07418, 0.96025, 0.84593],
  "city-series-ssv1-reverse.svg": [0.01483, 0.07418, 0.96025, 0.84593],
  "city-series-ssv1-white.svg": [0.01483, 0.07418, 0.96025, 0.84593],
  "city-series-ssv2-color.svg": [0.01654, 0.08177, 0.96235, 0.86077],
  "city-series-ssv2-reverse.svg": [0.01654, 0.08177, 0.96235, 0.86077],
  "city-series-ssv2-white.svg": [0.01654, 0.08177, 0.96235, 0.86077],
  "city-series-stacked-color.svg": [0.01194, 0.01770, 0.97778, 0.95435],
  "city-series-stacked-reverse.svg": [0.01194, 0.01770, 0.97778, 0.95435],
  "city-series-stacked-white.svg": [0.00806, 0.02143, 0.98361, 0.95948],
  "dataforce-side-by-side-color.svg": [0.02839, 0.09686, 0.94871, 0.77763],
  "dataforce-side-by-side-reverse.svg": [0.02839, 0.09686, 0.94871, 0.77763],
  "dataforce-side-by-side-white.svg": [0.02839, 0.09686, 0.94871, 0.77763],
  "dataforce-stacked-color.svg": [0.06203, 0.11509, 0.88102, 0.78553],
  "dataforce-stacked-reverse.svg": [0.06203, 0.11509, 0.88102, 0.78553],
  "dataforce-stacked-white.svg": [0.06203, 0.11509, 0.88102, 0.78553],
  "digital-side-by-side-color.svg": [0.04491, 0.21370, 0.92242, 0.66202],
  "digital-side-by-side-reverse.svg": [0.04491, 0.21370, 0.92242, 0.66202],
  "digital-side-by-side-white.svg": [0.04491, 0.21370, 0.92242, 0.66202],
  "digital-stacked-color.svg": [0.06203, 0.10943, 0.88102, 0.79057],
  "digital-stacked-reverse.svg": [0.06203, 0.10943, 0.88102, 0.79057],
  "digital-stacked-white.svg": [0.06203, 0.10943, 0.88102, 0.79057],
  "experience-side-by-side-color.svg": [0.03469, 0.21370, 0.94174, 0.66202],
  "experience-side-by-side-reverse.svg": [0.03469, 0.21370, 0.94174, 0.66202],
  "experience-side-by-side-white.svg": [0.03469, 0.21370, 0.94174, 0.66202],
  "experience-stacked-color.svg": [0.06203, 0.10943, 0.88102, 0.79057],
  "experience-stacked-reverse.svg": [0.06203, 0.10943, 0.88102, 0.79057],
  "experience-stacked-white.svg": [0.06203, 0.10943, 0.88102, 0.79057],
  "finance-side-by-side-color.svg": [0.03141, 0.21370, 0.93916, 0.66202],
  "finance-side-by-side-reverse.svg": [0.03141, 0.21370, 0.93916, 0.66202],
  "finance-side-by-side-white.svg": [0.03141, 0.21370, 0.93916, 0.66202],
  "finance-stacked-color.svg": [0.06169, 0.10377, 0.88136, 0.79623],
  "finance-stacked-reverse.svg": [0.06169, 0.10377, 0.88136, 0.79623],
  "finance-stacked-white.svg": [0.06169, 0.10377, 0.88136, 0.79623],
  "games-side-by-side-color.svg": [0.04232, 0.21370, 0.92720, 0.66202],
  "games-side-by-side-reverse.svg": [0.04232, 0.21370, 0.92720, 0.66202],
  "games-side-by-side-white.svg": [0.04232, 0.21370, 0.92720, 0.66202],
  "games-stacked-color.svg": [0.05763, 0.10755, 0.88542, 0.79245],
  "games-stacked-reverse.svg": [0.05763, 0.10755, 0.88542, 0.79245],
  "games-stacked-white.svg": [0.05763, 0.10755, 0.88542, 0.79245],
  "globallink-side-by-side-color.svg": [0.02612, 0.14506, 0.94170, 0.73171],
  "globallink-side-by-side-reverse.svg": [0.02612, 0.14506, 0.94170, 0.73171],
  "globallink-side-by-side-white.svg": [0.02612, 0.14506, 0.94170, 0.73171],
  "globallink-stacked-color.svg": [0.05966, 0.10314, 0.88339, 0.79686],
  "globallink-stacked-reverse.svg": [0.05966, 0.10314, 0.88339, 0.79686],
  "globallink-stacked-white.svg": [0.05966, 0.10314, 0.88339, 0.79686],
  "learn-side-by-side-color.svg": [0.04023, 0.21370, 0.92461, 0.66202],
  "learn-side-by-side-reverse.svg": [0.04023, 0.21370, 0.92461, 0.66202],
  "learn-side-by-side-white.svg": [0.04023, 0.21370, 0.92461, 0.66202],
  "learn-stacked-color.svg": [0.06203, 0.11509, 0.88102, 0.78491],
  "learn-stacked-reverse.svg": [0.06203, 0.11509, 0.88102, 0.78491],
  "learn-stacked-white.svg": [0.06203, 0.11509, 0.88102, 0.78491],
  "legal-side-by-side-color.svg": [0.03586, 0.21370, 0.92862, 0.66202],
  "legal-side-by-side-reverse.svg": [0.03586, 0.21370, 0.92862, 0.66202],
  "legal-side-by-side-white.svg": [0.03586, 0.21370, 0.92862, 0.66202],
  "legal-stacked-color.svg": [0.06136, 0.10629, 0.88169, 0.79371],
  "legal-stacked-reverse.svg": [0.06136, 0.10629, 0.88169, 0.79371],
  "legal-stacked-white.svg": [0.06136, 0.10629, 0.88169, 0.79371],
  "life-sci-side-by-side-color.svg": [0.05380, 0.21254, 0.89239, 0.66318],
  "life-sci-side-by-side-reverse.svg": [0.05380, 0.21254, 0.89239, 0.66318],
  "life-sci-side-by-side-white.svg": [0.05380, 0.21254, 0.89239, 0.66318],
  "life-sci-stacked-color.svg": [0.06203, 0.10818, 0.88102, 0.79371],
  "life-sci-stacked-reverse.svg": [0.06203, 0.10818, 0.88102, 0.79371],
  "life-sci-stacked-white.svg": [0.06203, 0.10818, 0.88102, 0.79371],
  "media-side-by-side-color.svg": [0.04164, 0.21370, 0.92485, 0.66202],
  "media-side-by-side-reverse.svg": [0.04164, 0.21370, 0.92485, 0.66202],
  "media-side-by-side-white.svg": [0.04164, 0.21370, 0.92485, 0.66202],
  "media-stacked-color.svg": [0.06203, 0.10943, 0.88102, 0.79120],
  "media-stacked-reverse.svg": [0.06203, 0.10943, 0.88102, 0.79120],
  "media-stacked-white.svg": [0.06203, 0.10943, 0.88102, 0.79120],
  "nexst26lines-navy.svg": [0.04752, 0.01997, 0.91963, 0.95524],
  "nexst26lines-only.svg": [0.04752, 0.01997, 0.91963, 0.95524],
  "nexst26lines-white.svg": [0.04752, 0.01997, 0.91963, 0.95524],
  "next26word-navy.svg": [0.02012, 0.02875, 0.95070, 0.91374],
  "next26word-only.svg": [0.02012, 0.02875, 0.95070, 0.91374],
  "next26word-white.svg": [0.02012, 0.02875, 0.95070, 0.91374],
  "transperfect-side-by-side-color.svg": [0.01929, 0.16031, 0.95695, 0.65191],
  "transperfect-side-by-side-reverse.svg": [0.01929, 0.16031, 0.95695, 0.65191],
  "transperfect-side-by-side-white.svg": [0.01929, 0.16031, 0.95695, 0.65191],
  "transperfect-stacked-color.svg": [0.06136, 0.13648, 0.88169, 0.70289],
  "transperfect-stacked-reverse.svg": [0.06136, 0.13648, 0.88169, 0.70289],
  "transperfect-stacked-white.svg": [0.06136, 0.13648, 0.88169, 0.70289],
};

export type LogoInkBox = {
  /** Ink inset from the file left edge, as a fraction of file width. */
  left: number;
  /** Ink inset from the file top edge, as a fraction of file height. */
  top: number;
  /** Ink width as a fraction of file width. */
  width: number;
  /** Ink height as a fraction of file height. */
  height: number;
};

function fileName(url: string): string {
  const clean = (url || "").split("?")[0]!.split("#")[0]!;
  return clean.slice(clean.lastIndexOf("/") + 1);
}

/** Measured ink box of a lockup file, or null when the file is not measured. */
export function logoInkBox(url: string): LogoInkBox | null {
  const hit = LOGO_INK[fileName(url)];
  if (!hit) return null;
  const [left, top, width, height] = hit;
  if (!(width > 0) || !(height > 0)) return null;
  return { left, top, width, height };
}

/**
 * Aspect ratio of the visible artwork. Falls back to the file ratio when the
 * lockup has not been measured, so an unmeasured file still lays out.
 */
export function logoInkRatio(url: string, fileRatio: number): number {
  const ink = logoInkBox(url);
  if (!ink || !(fileRatio > 0)) return fileRatio;
  return (fileRatio * ink.width) / ink.height;
}

/**
 * Given the box the artwork must fill, return the box to draw the whole file in
 * so the ink lands exactly on it. Anything outside that is the file own clear
 * space and falls outside the target box.
 */
export function logoInkPlacement(
  url: string,
  box: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const ink = logoInkBox(url);
  if (!ink) return box;
  const w = box.w / ink.width;
  const h = box.h / ink.height;
  return { x: box.x - ink.left * w, y: box.y - ink.top * h, w, h };
}
