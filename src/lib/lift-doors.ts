// Lift door split: where the two door leaves sit on a lift wrap, so the editor
// can show them and the exporter can cut one print file per door.
//
// San Francisco lifts (as supplied): 41.5 in full width, ~21.3 in per door,
// 84 in high. 2 × 21.3 = 42.6 in, so the leaves overlap 1.1 in at the meeting
// edge (the right leaf runs behind the left). Each door file keeps the artwork
// that is actually on that leaf, plus ⅛ in bleed. Other sizes split at the middle.

export type LiftDoor = { side: "left" | "right"; x0: number; x1: number };

const SF_DOORS: { w: number; h: number; doorW: number }[] = [{ w: 41.5, h: 84, doorW: 21.3 }];

export const isLiftLayout = (id: string) => /-lift-/.test(id);

/** Door leaves in points across a lift face `wPt` × `hPt`. */
export function liftDoors(wPt: number, hPt: number): LiftDoor[] {
  const wIn = wPt / 72, hIn = hPt / 72;
  const known = SF_DOORS.find((d) => Math.abs(d.w - wIn) < 0.05 && Math.abs(d.h - hIn) < 0.05);
  const dw = known ? Math.min(known.doorW * 72, wPt) : wPt / 2;
  return [
    { side: "left", x0: 0, x1: dw },
    { side: "right", x0: wPt - dw, x1: wPt },
  ];
}
