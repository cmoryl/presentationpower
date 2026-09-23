// -----------------------------------------------------------------------------
// Reviewer-authorised room splits on the QEII Centre plans.
//
// The issued venue artwork draws some spaces as one room with no dividing wall.
// Where the reviewer marked such a space as split for the event — "split in half
// widthways for Finance and Experience" on the 2nd floor — the divider is drawn
// here, from that instruction, and nowhere else.
//
// The line is not invented geometry: it is the perpendicular bisector between the
// two room names the reviewer named, so each half is the piece its own name sits
// in. Nothing is split unless the reviewer asked for it, and every split is
// recorded with the instruction it came from so it can be checked.
// -----------------------------------------------------------------------------

export type QeiiReviewerSplit = {
  /** Floor sheet id the split applies to. */
  sheetId: string;
  /** The two room names sharing one drawn space. */
  rooms: [string, string];
  /** The reviewer's own instruction, printed wherever the split is reported. */
  note: string;
};

export const QEII_REVIEWER_SPLITS: QeiiReviewerSplit[] = [
  {
    sheetId: "second",
    rooms: ["Victoria", "Albert"],
    note: "Reviewer marked this space “split in half widthways for Finance and Experience”, so the plan divides it midway between the two room names.",
  },
];

/** The split covering these two rooms, when the reviewer marked one. */
export function qeiiReviewerSplitFor(
  sheetId: string,
  room: string,
  others: string[],
): QeiiReviewerSplit | undefined {
  const has = (split: QeiiReviewerSplit, name: string) =>
    split.rooms.some((r) => r.toLowerCase() === name.trim().toLowerCase());
  return QEII_REVIEWER_SPLITS.find(
    (split) =>
      split.sheetId === sheetId && has(split, room) && others.some((o) => has(split, o)),
  );
}

/**
 * The divider run for a reviewer-marked split: the perpendicular bisector of the
 * line between the two names, carried well past the space so it cuts right
 * through it. Returned in plan units.
 */
export function qeiiReviewerSplitRun(
  a: { x: number; y: number },
  b: { x: number; y: number },
  reach: number,
): [number, number][] {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [];
  // Across the line between the names, so each name keeps its own half.
  const nx = -dy / len;
  const ny = dx / len;
  return [
    [mx - nx * reach, my - ny * reach],
    [mx + nx * reach, my + ny * reach],
  ];
}
