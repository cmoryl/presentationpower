// -----------------------------------------------------------------------------
// Editability grading for one exported slide.
//
// `buildLayerReport` (layer-report.ts) says WHAT objects an exported slide part
// carries. This module answers the question users actually ask: "can I edit the
// module in PowerPoint, or is it a picture?"
//
// A slide is graded from its own object tree:
//   native  — no rasterized design plate at all; every pixel is a real object
//   layered — a plate carries CSS-only decor, but the module's cards, rules,
//             icons, photos and copy are all discrete editable objects on top
//   thin    — a plate plus copy only: the graphic itself is baked
//   flat    — one picture and nothing above it
//
// The grade is derived, never asserted by the exporter, so it cannot drift away
// from the bytes we ship. The audit script (scripts/editability-audit.mjs) runs
// this over every module variant in every format we emit.
// -----------------------------------------------------------------------------

import type { LayerReport } from "./layer-report";

export type EditabilityGrade = "native" | "layered" | "thin" | "flat";

export interface EditabilityScore {
  grade: EditabilityGrade;
  /** Total objects on the slide, plate included. */
  objects: number;
  /** Objects a user can retype or restyle. */
  editable: number;
  /** Rasterized design plates found. */
  plates: number;
  /** Slide area covered by plates, 0..1 (overlaps counted once, approximately). */
  plateArea: number;
  /** Discrete non-plate objects. */
  content: number;
  /** Non-text native content: cards, rules, icons, photos, charts. */
  graphic: number;
  /** 0..1 headline number: share of the slide a user can actually edit. */
  score: number;
  issues: string[];
}

const AREA = (r: { w: number; h: number }) => Math.max(0, r.w) * Math.max(0, r.h);

/** Grade one slide's object tree. Pure: safe in tests and in the browser. */
export function scoreSlideEditability(report: LayerReport): EditabilityScore {
  const plates = report.objects.filter((o) => o.type === "plate");
  const content = report.objects.filter((o) => o.type !== "plate");
  const graphic = content.filter((o) => o.type !== "text");
  const plateArea = Math.min(1, plates.reduce((n, p) => n + AREA(p.rect), 0));

  const issues: string[] = [];
  let grade: EditabilityGrade;
  if (content.length === 0) {
    grade = "flat";
    issues.push("slide is one flattened picture — nothing is editable");
  } else if (plates.length === 0) {
    grade = "native";
  } else if (graphic.length === 0) {
    grade = "thin";
    issues.push("only copy is editable — the module graphic is baked into the plate");
  } else {
    grade = "layered";
  }

  if (plates.length > 1) issues.push(`${plates.length} design plates stacked on one slide`);
  const nonEditable = content.filter((o) => !o.editable);
  for (const o of nonEditable) {
    issues.push(`${o.type} "${o.name || o.id}" is not editable${o.note ? ` (${o.note})` : ""}`);
  }

  // Headline score: content objects carry the slide, and a plate that covers
  // real estate the objects do not is straight uneditable surface.
  const editableShare = report.objects.length ? report.editableCount / report.objects.length : 0;
  const score = Math.max(0, Math.min(1, editableShare * (1 - 0.45 * plateArea)));

  return {
    grade,
    objects: report.objects.length,
    editable: report.editableCount,
    plates: plates.length,
    plateArea: Number(plateArea.toFixed(4)),
    content: content.length,
    graphic: graphic.length,
    score: Number(score.toFixed(4)),
    issues,
  };
}

/** Grades that mean the user cannot edit the module's graphic. */
export const FAILING_GRADES: readonly EditabilityGrade[] = ["thin", "flat"];

export function isEditableEnough(score: EditabilityScore): boolean {
  return !FAILING_GRADES.includes(score.grade) && score.issues.length === 0;
}
