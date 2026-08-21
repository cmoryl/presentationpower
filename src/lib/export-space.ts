// -----------------------------------------------------------------------------
// Export coordinate space
//
// The deck exporter measures the DOM into a canonical 1920x1080 stage space and
// converts to inches at a fixed 144 px/in density (1920 / 13.333 = 1080 / 7.5).
// Print pieces are authored at other trim sizes (8.5x11, A4, 11x17), so the
// SAME measurement + placement pipeline works as long as two things move with
// the page: the measurement space (px = trim inches * 144) and the slide bounds
// used by the clamps/off-slide guards.
//
// This module owns those bounds so the placement modules stay pure functions
// with no page-size argument threaded through every call site.
// -----------------------------------------------------------------------------

/** Measurement density shared by every exporter: 144 stage px per inch. */
export const EXPORT_PX_PER_IN = 144;

const DECK_BOUNDS = { wIn: 13.333, hIn: 7.5 } as const;

let bounds: { wIn: number; hIn: number } = { ...DECK_BOUNDS };

/** Current slide bounds in inches (defaults to the 16:9 deck slide). */
export function exportSlideBounds(): { wIn: number; hIn: number } {
  return bounds;
}

/** Run `fn` with the slide bounds of a differently sized page (print trim). */
export async function withExportSlideBounds<T>(
  wIn: number,
  hIn: number,
  fn: () => Promise<T> | T,
): Promise<T> {
  const prev = bounds;
  bounds = { wIn, hIn };
  try {
    return await fn();
  } finally {
    bounds = prev;
  }
}

/** Measurement space (stage px) for a page of the given trim size. */
export function spaceForTrim(wIn: number, hIn: number): { w: number; h: number } {
  return { w: wIn * EXPORT_PX_PER_IN, h: hIn * EXPORT_PX_PER_IN };
}
