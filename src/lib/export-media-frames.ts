// -----------------------------------------------------------------------------
// Measured media-tile geometry for PPTX export
// -----------------------------------------------------------------------------
// `export-photo-frame.ts` hand-lists inset photo boxes for three modules. That
// approach cannot scale: dozens of variants render a `MediaTile`, and every one
// that was missing from the table exported as an empty grey rectangle (the
// Bento media tile with the "IN-MARKET PRESENCE" label being the reported case).
//
// Instead of enumerating modules, measure the real thing. The exporter already
// mounts the actual renderer offscreen at the 1920×1080 stage to capture the
// ground plate; every media tile marks itself with `data-media-tile="true"`, so
// its box can be read off the settled DOM and converted to slide inches. The
// export then emits one discrete `<p:pic>` per measured tile.
//
// Full-bleed tiles are skipped: those ARE the slide ground and are already
// emitted as the background object, so re-emitting them would double-paint.
// -----------------------------------------------------------------------------

import { STAGE_H, STAGE_W } from "./export-quality";
import type { PhotoFrame } from "./export-photo-frame";

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

/** A tile covering this much of the stage in both axes is the ground itself. */
const FULL_BLEED_RATIO = 0.97;
/** Ignore slivers — decorative strips that would export as noise. */
const MIN_IN = 0.35;

/**
 * Read every inset media tile inside a settled exact-stage element and return
 * its box in slide inches. Works with `decorOnly` plates because those hide the
 * content plane with `visibility: hidden`, which preserves layout geometry.
 */
export interface MediaTileMeasurement extends PhotoFrame {
  /** The exact photo/poster URL the tile renders, so the export embeds it. */
  url: string | null;
}

function tileUrl(tile: HTMLElement): string | null {
  const img = tile.querySelector<HTMLImageElement>("img[src]");
  if (img?.currentSrc || img?.src) return img.currentSrc || img.src;
  const vid = tile.querySelector<HTMLVideoElement>("video[poster]");
  if (vid?.poster) return vid.poster;
  return null;
}

export function measureMediaFrames(stage: HTMLElement): MediaTileMeasurement[] {
  const host = stage.getBoundingClientRect();
  if (host.width <= 0 || host.height <= 0) return [];
  // The stage may be scaled; normalize through the authored stage size.
  const sx = SLIDE_W / host.width;
  const sy = SLIDE_H / host.height;

  const out: MediaTileMeasurement[] = [];
  const tiles = Array.from(stage.querySelectorAll<HTMLElement>('[data-media-tile="true"]'));
  for (const tile of tiles) {
    const r = tile.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const frame: MediaTileMeasurement = {
      url: tileUrl(tile),
      x: (r.left - host.left) * sx,
      y: (r.top - host.top) * sy,
      w: r.width * sx,
      h: r.height * sy,
    };
    if (frame.w < MIN_IN || frame.h < MIN_IN) continue;
    if (
      r.width >= host.width * FULL_BLEED_RATIO &&
      r.height >= host.height * FULL_BLEED_RATIO
    ) {
      continue;
    }
    // Clamp into the slide so a tile bled past the edge cannot push a picture
    // off-canvas in PowerPoint.
    frame.x = Math.max(0, Math.min(SLIDE_W - MIN_IN, frame.x));
    frame.y = Math.max(0, Math.min(SLIDE_H - MIN_IN, frame.y));
    frame.w = Math.min(frame.w, SLIDE_W - frame.x);
    frame.h = Math.min(frame.h, SLIDE_H - frame.y);
    out.push(frame);
  }
  // Drop tiles fully contained inside an earlier, larger tile (nested scrims).
  return out.filter((f, i) =>
    out.every((g, j) => {
      if (i === j) return true;
      const inside =
        f.x >= g.x - 0.02 &&
        f.y >= g.y - 0.02 &&
        f.x + f.w <= g.x + g.w + 0.02 &&
        f.y + f.h <= g.y + g.h + 0.02;
      const smaller = f.w * f.h < g.w * g.h;
      return !(inside && smaller);
    }),
  );
}

/** Stage-pixel size the measurement assumes, exported for tests. */
export const MEASURE_STAGE = { width: STAGE_W, height: STAGE_H };
