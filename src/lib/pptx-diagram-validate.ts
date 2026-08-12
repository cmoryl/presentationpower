/**
 * Runtime validation for imported SmartArt / diagram recovery.
 *
 * The importer recovers SmartArt by walking `ppt/diagrams/drawing*.xml` and
 * emitting real shapes. When that recovery silently returns nothing, the slide
 * used to import as an empty rectangle and the failure only surfaced visually.
 * These assertions make that case loud and actionable at import time.
 */
import type { LayoutShape, ParsedDeck, ParsedSlide } from "./pptx-import";

export type DiagramIssueCode =
  | "blank-diagram-frame"
  | "empty-diagram-nodes"
  | "missing-node-labels";

export type DiagramIssue = {
  code: DiagramIssueCode;
  /** 1-based slide number as shown in PowerPoint. */
  slideNumber: number;
  message: string;
  /** What the operator/developer should do about it. */
  remedy: string;
};

/** Thrown when diagram recovery produced blank shapes or blank labels. */
export class DiagramRecoveryError extends Error {
  readonly issues: DiagramIssue[];
  constructor(filename: string, issues: DiagramIssue[]) {
    super(
      `Import aborted: ${issues.length} diagram recovery problem${
        issues.length === 1 ? "" : "s"
      } in "${filename}".\n` +
        issues.map((i) => `• Slide ${i.slideNumber}: ${i.message} → ${i.remedy}`).join("\n"),
    );
    this.name = "DiagramRecoveryError";
    this.issues = issues;
  }
}

const REMEDY: Record<DiagramIssueCode, string> = {
  "blank-diagram-frame":
    "The SmartArt drawing part was missing or produced no shapes. Re-save the deck in PowerPoint (which regenerates ppt/diagrams/drawing*.xml), or convert the SmartArt to shapes (Convert → Convert to Shapes) and re-upload.",
  "empty-diagram-nodes":
    "The SmartArt data model carried no readable nodes. Check the graphic still has content in PowerPoint, then re-save and re-upload.",
  "missing-node-labels":
    "Node labels were parsed but none of that text reached the rendered layer. Re-save the deck in PowerPoint so the drawing part matches the data model, or convert the SmartArt to shapes and re-upload.",
};

function shapeText(sh: LayoutShape): string {
  if (sh.kind === "text") {
    return (sh.text?.paragraphs ?? [])
      .flatMap((p: any) => (p?.runs ?? []).map((r: any) => r?.text ?? ""))
      .join(" ");
  }
  if (sh.kind === "table") {
    return [...(sh.header ?? []), ...(sh.rows ?? []).flat()].join(" ");
  }
  return "";
}

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Collect diagram recovery issues for one slide. */
export function validateSlideDiagrams(slide: ParsedSlide): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  const slideNumber = slide.index + 1;
  const shapes = slide.layout?.shapes ?? [];

  // 1. Frames that fell back to a bare box even though SmartArt was present.
  const blanks = shapes.filter(
    (sh) =>
      sh.kind === "diagram" &&
      (sh.fallbackReason === "smartart-no-drawing" ||
        sh.fallbackReason === "smartart-empty-drawing"),
  );
  for (const b of blanks) {
    if (b.kind !== "diagram") continue;
    issues.push({
      code: "blank-diagram-frame",
      slideNumber,
      message: `a SmartArt frame at ${b.frame.x.toFixed(2)}in, ${b.frame.y.toFixed(
        2,
      )}in recovered no shapes (${b.fallbackReason})`,
      remedy: REMEDY["blank-diagram-frame"],
    });
  }

  const smartart = (slide.diagrams ?? []).filter((d) => d.kind === "smartart");
  if (smartart.length === 0) return issues;

  // 2. Diagrams that parsed with zero usable nodes.
  for (const d of smartart) {
    const labelled = d.nodes.filter((n) => norm(n.text).length > 0);
    if (d.nodes.length === 0 || labelled.length === 0) {
      issues.push({
        code: "empty-diagram-nodes",
        slideNumber,
        message: `a SmartArt graphic produced ${d.nodes.length} node(s) and no non-empty labels`,
        remedy: REMEDY["empty-diagram-nodes"],
      });
    }
  }

  // 3. Labels exist in the data model but never reached a rendered layer.
  const rendered = norm(shapes.map(shapeText).join(" "));
  const allLabels = smartart.flatMap((d) => d.nodes.map((n) => norm(n.text))).filter(Boolean);
  if (allLabels.length > 0 && shapes.length > 0) {
    const found = allLabels.filter((l) => rendered.includes(l));
    if (found.length === 0) {
      issues.push({
        code: "missing-node-labels",
        slideNumber,
        message: `${allLabels.length} SmartArt node label(s) are missing from the recovered shapes`,
        remedy: REMEDY["missing-node-labels"],
      });
    }
  }

  return issues;
}

/** Collect every diagram recovery issue across a parsed deck. */
export function validateDiagramRecovery(deck: ParsedDeck): DiagramIssue[] {
  return deck.slides.flatMap((s) => validateSlideDiagrams(s));
}

/**
 * Throw a `DiagramRecoveryError` when any diagram came back blank.
 * Call this right after parsing so a broken import never reaches the editor.
 */
export function assertDiagramRecovery(deck: ParsedDeck): void {
  const issues = validateDiagramRecovery(deck);
  if (issues.length > 0) throw new DiagramRecoveryError(deck.filename, issues);
}
