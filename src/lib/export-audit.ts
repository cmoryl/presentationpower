// -----------------------------------------------------------------------------
// Export-time assertions
//
// Two classes of defect were only ever caught by parsing an exported deck by
// hand. Both are now assertions that run on the shapes a slide emits, so the
// class of bug cannot come back:
//
//   1. CONTRAST — text rendered inside a filled shape must clear WCAG 4.5:1
//      against that fill (see `export-foreground.ts` for the pairing table).
//   2. OVERLAP — two text-bearing shapes may not overlap by more than 35% of
//      the smaller shape's area, because that only happens when the renderer
//      performed the text layout itself instead of delegating it to PowerPoint.
//
// Deliberate layering (oversized display numerals, monogram letters, opening
// quotation marks sitting behind copy) is correct design, so a shape can be
// tagged decorative and is then exempt from (2).
// -----------------------------------------------------------------------------

import { MIN_TEXT_CONTRAST, canonicalizeInk, contrastRatio } from "./export-foreground";

/** Marker written into `objectName` to exempt a shape from the overlap rule. */
export const DECOR_TAG = "[decor]";

/** Tag an object name as an intentional decorative layer. */
export function decorName(name: string): string {
  return name.includes(DECOR_TAG) ? name : `${DECOR_TAG} ${name}`;
}

/** True when an object name carries the decorative exemption. */
export function isDecorName(name: string | undefined | null): boolean {
  return !!name && name.includes(DECOR_TAG);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AuditFill extends Rect {
  /** rrggbb without '#'. */
  hex: string;
  /** 0-100 PowerPoint transparency. Translucent fills do not govern contrast. */
  transparency?: number;
  name?: string;
}

export interface AuditText extends Rect {
  text: string;
  /** rrggbb without '#'. */
  color: string;
  /** Points. */
  fontSize?: number;
  name?: string;
}

export interface ContrastFailure {
  text: string;
  textColor: string;
  fillColor: string;
  ratio: number;
  name?: string;
}

export interface OverlapFailure {
  a: string;
  b: string;
  /** Overlap as a fraction of the smaller shape's area. */
  fraction: number;
}

const area = (r: Rect) => Math.max(0, r.w) * Math.max(0, r.h);

function intersection(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** True when the text box centre sits inside the filled rect. */
function containedIn(t: Rect, f: Rect, tol = 0.02): boolean {
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  return (
    cx >= f.x - tol && cx <= f.x + f.w + tol && cy >= f.y - tol && cy <= f.y + f.h + tol
  );
}

/**
 * The fill a run of text sits on: the smallest opaque filled rect containing
 * it, which is the one whose colour the eye actually reads against.
 */
export function fillBehind(text: Rect, fills: AuditFill[]): AuditFill | null {
  let best: AuditFill | null = null;
  for (const f of fills) {
    if ((f.transparency ?? 0) >= 35) continue;
    if (canonicalizeInk(f.hex).length !== 6) continue;
    if (!containedIn(text, f)) continue;
    if (!best || area(f) < area(best)) best = f;
  }
  return best;
}

/** Every text run whose contrast against its own fill is below 4.5:1. */
export function auditContrast(texts: AuditText[], fills: AuditFill[]): ContrastFailure[] {
  const out: ContrastFailure[] = [];
  for (const t of texts) {
    if (!t.text.trim()) continue;
    const fill = fillBehind(t, fills);
    if (!fill) continue;
    const ratio = contrastRatio(t.color, fill.hex);
    if (ratio < MIN_TEXT_CONTRAST) {
      out.push({
        text: t.text.slice(0, 60),
        textColor: canonicalizeInk(t.color),
        fillColor: canonicalizeInk(fill.hex),
        ratio,
        name: t.name,
      });
    }
  }
  return out;
}

/** Throws listing every offending pair. */
export function assertContrast(texts: AuditText[], fills: AuditFill[]): void {
  const bad = auditContrast(texts, fills);
  if (bad.length) {
    throw new Error(
      `Text contrast below ${MIN_TEXT_CONTRAST}:1 (${bad.length}):\n- ${bad
        .map((b) => `"${b.text}" ${b.textColor} on ${b.fillColor} = ${b.ratio}`)
        .join("\n- ")}`,
    );
  }
}

/** Overlap threshold as a fraction of the smaller shape's area. */
export const MAX_TEXT_OVERLAP = 0.35;

/**
 * Non-decorative text shapes that collide. A shape is exempt when its name
 * carries {@link DECOR_TAG}.
 */
export function auditTextOverlap(texts: AuditText[]): OverlapFailure[] {
  const live = texts.filter((t) => t.text.trim() && !isDecorName(t.name) && area(t) > 0);
  const out: OverlapFailure[] = [];
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = live[i]!;
      const b = live[j]!;
      const inter = intersection(a, b);
      if (!inter) continue;
      const fraction = inter / Math.min(area(a), area(b));
      if (fraction > MAX_TEXT_OVERLAP) {
        out.push({
          a: a.name ?? a.text.slice(0, 40),
          b: b.name ?? b.text.slice(0, 40),
          fraction: Math.round(fraction * 100) / 100,
        });
      }
    }
  }
  return out;
}

/** Throws listing every colliding pair. */
export function assertNoTextOverlap(texts: AuditText[]): void {
  const bad = auditTextOverlap(texts);
  if (bad.length) {
    throw new Error(
      `Overlapping text shapes (${bad.length}):\n- ${bad
        .map((b) => `${b.a} ↔ ${b.b} = ${Math.round(b.fraction * 100)}%`)
        .join("\n- ")}`,
    );
  }
}
