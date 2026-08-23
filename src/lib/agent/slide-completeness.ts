// ---------------------------------------------------------------------------
// SLIDE FULLNESS — is this slide actually finished?
//
// `visual-data-gaps.ts` answers "does this chart plot anything". This module
// answers the wider question the user keeps hitting: a slide that renders but
// is HALF EMPTY — a three-up grid with one card written, a bento with blank
// support fields, a 220-character narrative slot carrying four words, a slide
// with no speaker notes. Those slides look unfinished on screen and waste the
// space the layout reserved for them.
//
// Every judgement here comes from the variant's own capacity contract
// (`taxonomy.ts` → `resolveCapacity`), so it is deterministic and identical for
// every agent surface: required fields, item slot ranges and per-field character
// budgets. Nothing is invented and nothing is model-dependent.
//
// Severity contract:
//   • "blocking"  — the slide is visibly incomplete (empty field, items under
//                   the layout's minimum, empty chart). Must be fixed before a
//                   deck is reported as done.
//   • "advisory"  — the slide works but leaves reserved space unused (items
//                   below the layout's capacity, copy far under budget, no
//                   speaker notes). Fix when there is real content to add;
//                   never pad with filler.
// ---------------------------------------------------------------------------

import { MODULE_VARIANTS, byId, type ModuleVariant } from "@/lib/taxonomy";
import { resolveCapacity } from "@/lib/taxonomy-capacity";
import { visualDataGap, visualDigestFor } from "./visual-data-gaps";

export type CompletenessSeverity = "blocking" | "advisory";

export interface CompletenessIssue {
  severity: CompletenessSeverity;
  /** Machine code so callers can group: empty_field, items_below_min, … */
  code:
    | "empty_field"
    | "items_below_min"
    | "items_below_capacity"
    | "thin_copy"
    | "empty_visual"
    | "missing_notes";
  /** Content path to write, e.g. "narrative" or "items[].body". */
  field?: string;
  message: string;
}

export interface SlideCompleteness {
  position: number;
  variant_id: string;
  variant_name: string;
  /** 0–100. 100 = every field written and every slot used. */
  fill_score: number;
  issues: CompletenessIssue[];
  /** Paths the agent may write on this slide, with their character budgets. */
  writable_fields: { path: string; kind: string; chars?: number }[];
  items_contract?: { path: string; min: number; max: number; current: number };
}

export interface SlideForCompleteness {
  position: number;
  variant_id: string;
  content: Record<string, unknown> | null;
  notes?: string | null;
}

/** Text long enough to count as written at all. */
function filled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function textLength(value: unknown): number {
  return typeof value === "string" ? value.trim().length : 0;
}

/** Root collection key for a variant's repeating slots. */
function itemsRoot(variant: ModuleVariant): string {
  return variant.capacity.items?.path ?? "items";
}

function itemsArray(content: Record<string, unknown>, root: string): Record<string, unknown>[] {
  const raw = content[root];
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
}

/**
 * Fields that are decorative by design — never flagged as missing, because a
 * good slide often omits them on purpose.
 */
const OPTIONAL_FIELDS = new Set([
  "eyebrow",
  "kicker",
  "footnote",
  "source",
  "badge",
  "date",
  "presenter",
  "clientName",
  "logo",
  "logoSlug",
  "imageUrl",
  "image",
  "icon",
  "iconName",
  "watermark",
  "qrUrl",
]);

/** Copy at or under this share of its budget is leaving the layout hungry. */
const THIN_RATIO = 0.3;
/** Only budgets this large are worth flagging as underfilled. */
const THIN_MIN_BUDGET = 120;

/** Audit one slide against its own layout contract. */
export function slideCompleteness(slide: SlideForCompleteness): SlideCompleteness | null {
  const variant = byId(MODULE_VARIANTS, slide.variant_id);
  if (!variant) return null;

  const content = (slide.content ?? {}) as Record<string, unknown>;
  const capacity = resolveCapacity(variant);
  const issues: CompletenessIssue[] = [];

  // ---- top-level fields -------------------------------------------------
  const topFields = capacity.fields.filter((f) => !f.item);
  let slotsExpected = 0;
  let slotsFilled = 0;

  for (const field of topFields) {
    const value = content[field.path];
    const optional = OPTIONAL_FIELDS.has(field.path);
    if (!optional) slotsExpected += 1;
    if (filled(value)) {
      if (!optional) slotsFilled += 1;
      if (
        field.kind === "text" &&
        field.chars &&
        field.chars >= THIN_MIN_BUDGET &&
        textLength(value) > 0 &&
        textLength(value) < Math.round(field.chars * THIN_RATIO)
      ) {
        issues.push({
          severity: "advisory",
          code: "thin_copy",
          field: field.path,
          message: `"${field.path}" holds ${textLength(value)} of ~${field.chars} characters the layout reserves, so the block reads under-set. Write the full thought (context, the specific proof, the implication) rather than a fragment.`,
        });
      }
    } else if (!optional) {
      issues.push({
        severity: "blocking",
        code: "empty_field",
        field: field.path,
        message: `"${field.path}" is empty, so that region of the slide renders blank${field.chars ? ` (budget ~${field.chars} chars)` : ""}. Write real content for it with update_slide_content.`,
      });
    }
  }

  // ---- repeating slots --------------------------------------------------
  let itemsContract: SlideCompleteness["items_contract"];
  if (capacity.items) {
    const root = itemsRoot(variant);
    const rows = itemsArray(content, root);
    const itemFields = capacity.fields.filter((f) => f.item);
    itemsContract = {
      path: root,
      min: capacity.items.min,
      max: capacity.items.max,
      current: rows.length,
    };
    slotsExpected += capacity.items.min;
    slotsFilled += Math.min(rows.length, capacity.items.min);

    if (rows.length < capacity.items.min) {
      issues.push({
        severity: "blocking",
        code: "items_below_min",
        field: `${root}[]`,
        message: `This layout is built for ${capacity.items.min}–${capacity.items.max} ${root}, and only ${rows.length} ${rows.length === 1 ? "is" : "are"} written — the remaining cells render as empty boxes. Add ${capacity.items.min - rows.length} more with real content.`,
      });
    } else if (rows.length < capacity.items.max) {
      issues.push({
        severity: "advisory",
        code: "items_below_capacity",
        field: `${root}[]`,
        message: `${rows.length} of ${capacity.items.max} ${root} used. If the story supports it, use the full set so the grid balances; otherwise switch to a variant sized for ${rows.length}.`,
      });
    }

    // per-row field gaps: a row present but half written is the worst read.
    rows.forEach((row, index) => {
      for (const field of itemFields) {
        const key = field.path.replace(/^[^.]+\[\]\./, "");
        if (OPTIONAL_FIELDS.has(key)) continue;
        if (!filled(row[key])) {
          issues.push({
            severity: "blocking",
            code: "empty_field",
            field: `${root}[${index}].${key}`,
            message: `${root}[${index}] is missing "${key}", so that card renders partly blank. Write it with update_slide_content.`,
          });
        }
      }
    });
  }

  // ---- plotted data -----------------------------------------------------
  if (visualDigestFor(slide.variant_id)) {
    const gap = visualDataGap(slide.variant_id, content);
    if (gap) {
      issues.push({
        severity: "blocking",
        code: "empty_visual",
        field: gap.empty_fields.join(", ") || gap.plotted_fields.join(", "),
        message: `${gap.module_name} plots nothing yet: ${gap.problems.join(" ")}`,
      });
    }
  }

  // ---- speaker notes ----------------------------------------------------
  if (!filled(slide.notes)) {
    issues.push({
      severity: "advisory",
      code: "missing_notes",
      message:
        "No speaker notes. Add what the presenter says here (the point, the proof, the transition) — a deck without notes is not a deliverable.",
    });
  }

  const blocking = issues.filter((i) => i.severity === "blocking").length;
  const base = slotsExpected > 0 ? Math.round((slotsFilled / slotsExpected) * 100) : 100;
  const fill_score = Math.max(0, Math.min(100, base - blocking * 6));

  return {
    position: slide.position,
    variant_id: slide.variant_id,
    variant_name: variant.name,
    fill_score,
    issues,
    writable_fields: capacity.fields.map((f) => ({
      path: f.path,
      kind: f.kind,
      ...(f.chars ? { chars: f.chars } : {}),
    })),
    ...(itemsContract ? { items_contract: itemsContract } : {}),
  };
}

export interface DeckCompletenessReport {
  ok: boolean;
  slides: number;
  /** Mean fill score across the deck, 0–100. */
  deck_fill_score: number;
  blocking_slides: number;
  advisory_slides: number;
  incomplete: SlideCompleteness[];
  instruction: string;
}

/**
 * Audit a whole deck. `incomplete` lists only slides with something to fix,
 * worst first, so an agent can work the list top-down.
 */
export function auditDeckCompleteness(
  slides: SlideForCompleteness[],
  options: { include_advisory?: boolean } = {},
): DeckCompletenessReport {
  const includeAdvisory = options.include_advisory ?? true;
  const audited = slides
    .map((s) => slideCompleteness(s))
    .filter((s): s is SlideCompleteness => !!s);

  const withIssues = audited
    .map((s) => ({
      ...s,
      issues: includeAdvisory ? s.issues : s.issues.filter((i) => i.severity === "blocking"),
    }))
    .filter((s) => s.issues.length > 0)
    .sort((a, b) => a.fill_score - b.fill_score || a.position - b.position);

  const blockingSlides = audited.filter((s) =>
    s.issues.some((i) => i.severity === "blocking"),
  ).length;
  const advisorySlides = audited.filter(
    (s) => !s.issues.some((i) => i.severity === "blocking") && s.issues.length > 0,
  ).length;
  const deckFill = audited.length
    ? Math.round(audited.reduce((sum, s) => sum + s.fill_score, 0) / audited.length)
    : 100;

  return {
    ok: blockingSlides === 0,
    slides: audited.length,
    deck_fill_score: deckFill,
    blocking_slides: blockingSlides,
    advisory_slides: advisorySlides,
    incomplete: withIssues,
    instruction: blockingSlides
      ? 'Slides above marked "blocking" render with blank regions, half-written cards or empty charts — the user sees an unfinished deck. Fix every one with update_slide_content, writing real content into the exact paths listed in writable_fields (item paths look like items[2].body). Use the user\'s brief, the deck\'s own narrative and search_knowledge; where a figure is genuinely unknown write a visibly marked placeholder and list those slides for the user. Then re-run this audit until ok is true. Treat "advisory" items as the finishing pass: fill remaining slots and write speaker notes where there is real content to add, and never pad with filler.'
      : advisorySlides
        ? "No slide renders blank. Finish the deck: work the advisory items — unused slots, copy far under its layout budget, and missing speaker notes — using real content only."
        : "Every slide is fully written: no empty regions, all layout slots used, all visuals plotted, speaker notes present.",
  };
}
