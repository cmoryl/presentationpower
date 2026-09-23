// Reviewer-placed captions on the QEII floor plans.
//
// Two spaces on the issued event schedule are not named anywhere on the venue's
// own artwork, so the reviewer pinned where each one belongs on the proof:
//
//   * the Foyer Café Space, which holds NEXTBrew, beside Sanctuary,
//   * the Registration & Helpdesk room in the lower foyer, which the venue sheet
//     leaves unnamed.
//
// Their positions are taken from the review pins on the studio proof
// (app.markup.io markup 664a00b2, page 1), converted into plan units against two
// named captions on the same sheet. Nothing else is invented: the copy is the
// schedule's own wording and the plan's own layout engine still sets and clears
// each caption like any other room name.

import type { QeiiFloorVector, QeiiLabel } from "@/lib/next-london-qeii-vectors";

export type QeiiCallout = QeiiLabel & { sheetId: string };

export const QEII_REVIEWER_CALLOUTS: QeiiCallout[] = [
  // Pin 2 — "NEXTBrew". The schedule's Foyer Café Space, which the sheet leaves unnamed.
  { sheetId: "ground", text: "Foyer Café Space", x: 447, y: 556, size: 12 },
  // Pin 3 — "REGISTRATION & HELPDESK", in the unnamed lower-foyer room.
  { sheetId: "ground", text: "Registration & Helpdesk", x: 256, y: 450, size: 12 },
];

/** The reviewer's captions for a sheet, in plan units. */
export function qeiiCalloutsFor(sheetId: string): QeiiLabel[] {
  return QEII_REVIEWER_CALLOUTS.filter((c) => c.sheetId === sheetId).map(
    ({ sheetId: _sheetId, ...label }) => label,
  );
}

/** The same floor with the reviewer's captions added to its printed names. */
export function qeiiWithCallouts(floor: QeiiFloorVector): QeiiFloorVector {
  const extra = qeiiCalloutsFor(floor.id).filter(
    (c) => !floor.labels.some((l) => l.text.toLowerCase() === c.text.toLowerCase()),
  );
  if (!extra.length) return floor;
  return { ...floor, labels: [...floor.labels, ...extra] };
}
