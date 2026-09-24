// Measures every rebuilt QEII floor against the others, so the set can be seen
// side by side and read as one house look.
//
// Nothing here changes a plan. It only reports what the issued artwork actually
// gives us floor by floor — sheet size, how walls are drawn, how big the names
// set — in plain wording, so a real difference is never mistaken for a fault and
// never quietly "corrected" by a guess.

import { qeiiFloorVectors, type QeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { LONDON_SHEETS_NOT_IN_USE } from "@/lib/next-london-venue-sheets";

import { qeiiPlanState } from "@/lib/next-london-qeii-plan";

/** Floors the issued design supplies as a picture, rebuilt by tracing it. */
const QEII_TRACED = new Set(["third"]);

export type QeiiFloorProfile = {
  id: string;
  marker: string;
  title: string;
  page: number;
  w: number;
  h: number;
  shapes: number;
  labels: number;
  /** Shapes carrying a wall line. */
  strokes: number;
  /** Median wall line weight in sheet units, 0 when none are drawn. */
  wallWeight: number;
  /** Share of filled shapes reading dark, light and white. */
  dark: number;
  light: number;
  white: number;
  /** Median issued name size as a share of the sheet width. */
  nameShare: number;
  /** Rebuilt from a picture of the plan rather than drawn artwork. */
  traced: boolean;
};

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function qeiiFloorProfile(floor: QeiiFloorVector): QeiiFloorProfile {
  const fills = floor.shapes.filter((s) => s.fill && s.fill !== "none");
  const strokes = floor.shapes.filter((s) => s.stroke && s.stroke !== "none");
  let dark = 0;
  let light = 0;
  let white = 0;
  for (const shape of fills) {
    const l = luminance(shape.fill!);
    if (l >= 0.92) white += 1;
    else if (l <= 0.3) dark += 1;
    else light += 1;
  }
  const total = fills.length || 1;
  return {
    id: floor.id,
    marker: floor.marker,
    title: floor.title,
    page: floor.page,
    w: floor.w,
    h: floor.h,
    shapes: floor.shapes.length,
    labels: floor.labels.length,
    strokes: strokes.length,
    wallWeight: median(strokes.map((s) => s.w ?? 0)),
    dark: dark / total,
    light: light / total,
    white: white / total,
    nameShare: median(floor.labels.map((l) => l.size / floor.w)),
    traced: QEII_TRACED.has(floor.id),
  };
}

/** Every floor the viewer can draw as native artwork, in issued order.
 *  Floors the reviewer marked as not needed for the event are left out. */
export function qeiiAllFloors(): QeiiFloorVector[] {
  return qeiiFloorVectors().filter((f) => !LONDON_SHEETS_NOT_IN_USE.includes(f.id))
    .map((f) => qeiiPlanState(f.id))
    .filter((state): state is { floor: QeiiFloorVector; rebuilt: true } => !!state?.rebuilt)
    .map((state) => state.floor);
}


export function qeiiFloorProfiles(): QeiiFloorProfile[] {
  return qeiiAllFloors().map(qeiiFloorProfile);
}

export type QeiiCohesionNote = {
  floorId: string;
  /** "matched" when the set already agrees, "differs" when it genuinely does. */
  kind: "matched" | "differs";
  note: string;
};

/**
 * Plain-language differences across the set. A note is only raised where the
 * issued artwork really differs — not where a floor is simply a different size.
 */
export function qeiiCohesionNotes(profiles = qeiiFloorProfiles()): QeiiCohesionNote[] {
  if (profiles.length < 2) return [];
  const notes: QeiiCohesionNote[] = [];
  const houseName = median(profiles.map((p) => p.nameShare));
  const houseWeight = median(profiles.filter((p) => p.wallWeight > 0).map((p) => p.wallWeight));
  const houseWidth = median(profiles.map((p) => p.w));
  const houseWhite = median(profiles.map((p) => p.white));

  for (const p of profiles) {
    if (p.traced) {
      notes.push({
        floorId: p.id,
        kind: "differs",
        note: `${p.title} is the one floor the issued design supplies as a picture, so it was traced back into shapes. Its walls read as slightly softer edges than the drawn floors.`,
      });
    }
    if (houseName > 0 && Math.abs(p.nameShare - houseName) / houseName > 0.4) {
      notes.push({
        floorId: p.id,
        kind: "differs",
        note:
          p.nameShare > houseName
            ? `${p.title} carries its room names larger than the rest of the set, because the issued sheet sets them that way.`
            : `${p.title} carries its room names smaller than the rest of the set, because the issued sheet sets them that way.`,
      });
    }
    if (houseWeight > 0 && p.wallWeight > 0 && Math.abs(p.wallWeight - houseWeight) / houseWeight > 0.4) {
      notes.push({
        floorId: p.id,
        kind: "differs",
        note: `${p.title} draws its walls ${p.wallWeight > houseWeight ? "heavier" : "finer"} than the rest of the set. The shared wall setting on this page draws them all alike on screen and in every download.`,
      });
    }
    if (houseWidth > 0 && Math.abs(p.w - houseWidth) / houseWidth > 0.12) {
      notes.push({
        floorId: p.id,
        kind: "matched",
        note: `${p.title} covers a ${p.w > houseWidth ? "wider" : "narrower"} footprint than the others. Shown here at the same scale as the rest, so the sizes compare truthfully.`,
      });
    }
    // Only a floor built differently from the rest is worth saying anything about;
    // the way most of the set is drawn is the house norm, not a difference.
    if (houseWhite > 0 && Math.abs(p.white - houseWhite) > 0.2) {
      notes.push({
        floorId: p.id,
        kind: "differs",
        note:
          p.white > houseWhite
            ? `${p.title} is drawn with more white blocking than the rest of the set, so its tones sit a shade lighter.`
            : `${p.title} is drawn with less white blocking than the rest of the set, so its tones sit a shade heavier.`,
      });
    }
  }
  return notes;
}

/** One line summarising how close the set is, for the top of the comparison. */
export function qeiiCohesionSummary(notes = qeiiCohesionNotes()): string {
  const differs = notes.filter((n) => n.kind === "differs").length;
  if (!differs) return "Every floor draws to the same house look — walls, tones and names all agree.";
  return `${differs} genuine difference${differs === 1 ? "" : "s"} across the set come from the issued sheets themselves. Everything we set here — tones, wall weight, name size, lockups — is already shared by all floors.`;
}
