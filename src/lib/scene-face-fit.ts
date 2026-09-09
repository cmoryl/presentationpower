// Mounting printed artwork onto a measured installation face.
//
// The old behaviour contain-fitted the artwork inside the measured placement
// rectangle. When the item's trim ratio did not match the face ratio (a 1500 ×
// 4000 flag on a wide wall run, a 4000 × 800 fascia on a tall door) the print
// collapsed into a sliver floating in the middle of a blank grey block — it
// never looked mounted on anything.
//
// A real installation is constrained by ONE physical edge of the surface: a
// column has a fixed width, a stage fascia has a fixed height. So we scale the
// artwork to fill that fixed axis exactly, let the free axis follow the true
// trim ratio, and only shrink uniformly if the result would run off the plate.

export interface FaceRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which edge of the surface physically fixes the print size. */
export type SceneFixedAxis = "w" | "h";

export interface MountOptions {
  /** Measured placement rectangle, fractions of the plate. */
  face: FaceRect;
  plate: { w: number; h: number };
  /** Artwork trim aspect (w / h). */
  ratio: number;
  fixed: SceneFixedAxis;
  /** Where the print hangs on the free axis. */
  anchorY?: "top" | "center" | "bottom";
  anchorX?: "left" | "center" | "right";
}

/**
 * Artwork box as fractions of the rendered plate: fills the surface's fixed
 * edge, keeps the trim ratio exactly, stays inside the plate.
 */
export function mountArtworkOnFace({
  face,
  plate,
  ratio,
  fixed,
  anchorY = "center",
  anchorX = "center",
}: MountOptions): FaceRect {
  const target = ratio > 0 && Number.isFinite(ratio) ? ratio : 1;
  const facePxW = Math.max(1, face.w * plate.w);
  const facePxH = Math.max(1, face.h * plate.h);

  let w: number;
  let h: number;
  if (fixed === "w") {
    w = facePxW;
    h = w / target;
  } else {
    h = facePxH;
    w = h * target;
  }

  // Never let a print leave the photograph; shrink uniformly if it would.
  const maxW = plate.w * 0.98;
  const maxH = plate.h * 0.96;
  const shrink = Math.min(1, maxW / w, maxH / h);
  w *= shrink;
  h *= shrink;

  const faceLeft = face.x * plate.w;
  const faceTop = face.y * plate.h;

  let x: number;
  if (anchorX === "left") x = faceLeft;
  else if (anchorX === "right") x = faceLeft + facePxW - w;
  else x = faceLeft + (facePxW - w) / 2;

  let y: number;
  if (anchorY === "top") y = faceTop;
  else if (anchorY === "bottom") y = faceTop + facePxH - h;
  else y = faceTop + (facePxH - h) / 2;

  // Keep the whole print on the plate.
  x = Math.min(Math.max(x, plate.w * 0.01), plate.w * 0.99 - w);
  y = Math.min(Math.max(y, plate.h * 0.02), plate.h * 0.98 - h);

  return { x: x / plate.w, y: y / plate.h, w: w / plate.w, h: h / plate.h };
}
