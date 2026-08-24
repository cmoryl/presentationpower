/**
 * Page masthead lockup scale.
 *
 * The top-of-sheet TransPerfect / division lockup renders 30% smaller than its
 * authored size so it reads as a masthead signature instead of competing with
 * the hero headline. Scaling the container-query unit shrinks the whole lockup
 * (mark + wordmark + gap) proportionally, so the official artwork is never
 * distorted or recolored.
 */
export const MASTHEAD_LOGO_SCALE = 0.7;

/** Wrap a print layout's `cq` unit so a lockup renders at masthead scale. */
export function mastheadUnit(cq: (px: number) => string) {
  return (px: number) => cq(px * MASTHEAD_LOGO_SCALE);
}
