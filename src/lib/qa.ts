// Shared QA gate logic used by editor and export.
// Blocking issues (severity: "block") halt export until resolved.
// Warnings (severity: "warn") are surfaced but non-blocking.

import type { DeckSlide } from "./deck-store";
import { MODULE_VARIANTS, byId, type ModuleVariant } from "./taxonomy";

export type QaSeverity = "block" | "warn";
export type QaIssue = {
  slideId: string;
  severity: QaSeverity;
  message: string;
  code: string;
};

export function runQa(slides: DeckSlide[]): QaIssue[] {
  const issues: QaIssue[] = [];
  for (const slide of slides) {
    const variant = byId(MODULE_VARIANTS, slide.variantId);
    if (!variant) continue;

    // Empty editable fields → block (placeholder completeness)
    for (const path of variant.editableFields) {
      for (const cp of expandPath(path, slide.content)) {
        const v = readPath(slide.content, cp);
        if (v == null || (typeof v === "string" && v.trim() === "")) {
          issues.push({
            slideId: slide.id,
            severity: "block",
            code: "empty-field",
            message: `Empty field: ${cp}`,
          });
        }
      }
    }

    // Capacity: items array bounds → block
    checkCapacity(slide, variant, issues);

    // Character caps → warn (title/body caps from variant)
    checkCharCaps(slide, variant, issues);

    // Sources missing on proof stats → warn (Section 25 QA gate)
    if (variant.familyId === "MF-05" && Array.isArray(slide.content.items)) {
      const items = slide.content.items as Array<Record<string, unknown>>;
      const missingSources = items.some(
        (it) => "value" in it && (it.source == null || String(it.source).trim() === ""),
      );
      if (missingSources) {
        issues.push({
          slideId: slide.id,
          severity: "warn",
          code: "missing-source",
          message: "Proof stats should cite sources",
        });
      }
    }
  }
  return issues;
}

export const blockingIssues = (issues: QaIssue[]) => issues.filter((i) => i.severity === "block");
export const warningIssues = (issues: QaIssue[]) => issues.filter((i) => i.severity === "warn");

function checkCapacity(slide: DeckSlide, variant: ModuleVariant, issues: QaIssue[]) {
  const cap = variant.capacity.items;
  if (!cap) return;
  const items = slide.content.items;
  const n = Array.isArray(items) ? items.length : 0;
  if (n < cap.min) {
    issues.push({
      slideId: slide.id,
      severity: "block",
      code: "under-capacity",
      message: `Needs at least ${cap.min} items (has ${n})`,
    });
  }
  if (n > cap.max) {
    issues.push({
      slideId: slide.id,
      severity: "block",
      code: "over-capacity",
      message: `Over capacity: ${n} items, max ${cap.max}`,
    });
  }
}

function checkCharCaps(slide: DeckSlide, variant: ModuleVariant, issues: QaIssue[]) {
  const titleCap = variant.capacity.titleChars;
  const bodyCap = variant.capacity.bodyChars;
  if (titleCap) {
    const t = slide.content.title;
    if (typeof t === "string" && t.length > titleCap) {
      issues.push({
        slideId: slide.id,
        severity: "warn",
        code: "title-too-long",
        message: `Title exceeds ${titleCap} chars (${t.length})`,
      });
    }
  }
  if (bodyCap && Array.isArray(slide.content.items)) {
    const over = (slide.content.items as Array<Record<string, unknown>>).some((it) => {
      const b = it.body ?? it.description;
      return typeof b === "string" && b.length > bodyCap;
    });
    if (over) {
      issues.push({
        slideId: slide.id,
        severity: "warn",
        code: "body-too-long",
        message: `Item body exceeds ${bodyCap} chars — consider splitting the slide`,
      });
    }
  }
}

export function expandPath(pattern: string, content: Record<string, unknown>): string[] {
  if (!pattern.includes("[]")) return [pattern];
  const [head, ...rest] = pattern.split("[]");
  const arrKey = head.replace(/\.$/, "");
  const arrVal = readPath(content, arrKey);
  if (!Array.isArray(arrVal)) return [];
  const tail = rest.join("[]");
  return arrVal.map((_, i) => `${arrKey}[${i}]${tail}`);
}

export function readPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").flatMap((p) => {
    const m = /^([^\[]+)(\[(\d+)\])?$/.exec(p);
    if (!m) return [p];
    return m[3] !== undefined ? [m[1], Number(m[3])] : [m[1]];
  });
  let cur: unknown = obj;
  for (const k of parts) {
    if (cur == null) return undefined;
    // @ts-expect-error dynamic
    cur = cur[k];
  }
  return cur;
}
