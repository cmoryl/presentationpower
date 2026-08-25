// -----------------------------------------------------------------------------
// Module variety engine
//
// Deck assembly used to take `pool[0]` for every slide, so a narrative that
// repeats a section (four solution beats, two proof beats) rendered the same
// module four times — the deck read as one layout wearing different words.
// Nothing was broken; the picker simply had no memory of what it had already
// used.
//
// This module gives the picker that memory. Selection stays deterministic (same
// brief + same plan → same deck) but now scores candidates against what the deck
// has already spent: the exact module, its family, and how recently either
// appeared. It also reports over-use after the fact, so the agent — which writes
// slides one `insert_slide` at a time and has even less memory than the
// assembler did — gets told when it is leaning on one layout.
// -----------------------------------------------------------------------------

import { MODULE_FAMILIES, MODULE_VARIANTS, byId, variantsForSection } from "./taxonomy";
import type { ModuleVariant } from "./taxonomy";

/** Stable small hash so tie-breaks rotate per deck instead of always picking the same option. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type VarietyPick = {
  /** Candidates permitted for this slot, already filtered by brand scope. */
  pool: ModuleVariant[];
  /** Variant ids already placed in the deck, in slide order. */
  usedVariantIds: string[];
  /** Strategy/agent suggestion for this section, if any. */
  suggestedVariantId?: string | undefined;
  /** Division-preferred module ids. */
  preferredVariantIds?: Set<string>;
  /** Deterministic rotation seed — use the brief/deck identity plus the section. */
  seed?: string;
};

// Repeating the identical module is the loudest defect, repeating its family is
// the quieter one; both fade the further back the last use was.
const SAME_VARIANT_PENALTY = 260;
const SAME_FAMILY_PENALTY = 46;
const RECENCY_WINDOW = 4;
const RECENCY_BONUS_PENALTY = 90;

/**
 * Pick the module for one slot, preferring layouts the deck has not spent yet.
 *
 * A suggested variant still wins its first appearance — the strategist's intent
 * matters — but the second time the same section comes round, the suggestion is
 * treated as "already used" and a sibling takes the slot.
 */
export function pickVariedVariant(input: VarietyPick): ModuleVariant | undefined {
  const { pool, usedVariantIds, suggestedVariantId, preferredVariantIds, seed = "" } = input;
  if (pool.length === 0) return undefined;
  if (pool.length === 1) return pool[0];

  const usedCount = new Map<string, number>();
  const familyCount = new Map<string, number>();
  for (const id of usedVariantIds) {
    usedCount.set(id, (usedCount.get(id) ?? 0) + 1);
    const fam = byId(MODULE_VARIANTS, id)?.familyId;
    if (fam) familyCount.set(fam, (familyCount.get(fam) ?? 0) + 1);
  }
  const recent = usedVariantIds.slice(-RECENCY_WINDOW);
  const recentFamilies = new Set(
    recent.map((id) => byId(MODULE_VARIANTS, id)?.familyId).filter(Boolean) as string[],
  );

  let best: ModuleVariant | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const v of pool) {
    let score = 0;
    score += (usedCount.get(v.id) ?? 0) * SAME_VARIANT_PENALTY;
    score += (familyCount.get(v.familyId) ?? 0) * SAME_FAMILY_PENALTY;
    if (recent.includes(v.id)) score += RECENCY_BONUS_PENALTY;
    if (recentFamilies.has(v.familyId)) score += RECENCY_BONUS_PENALTY / 3;
    // Intent and brand scope pull candidates forward, but never far enough to
    // out-rank "this exact module is already on screen twice".
    if (v.id === suggestedVariantId && !usedCount.has(v.id)) score -= 200;
    if (preferredVariantIds?.has(v.id)) score -= 30;
    // Deterministic rotation: same inputs → same deck, different decks → a
    // different first choice among equally good options.
    score += (hash(`${seed}:${v.id}`) % 17) / 2;
    if (score < bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best ?? pool[0];
}

export type VarietyIssue = {
  severity: "blocking" | "advisory";
  variant_id: string;
  variant_name: string;
  used_on_slides: number[];
  message: string;
  alternates: Array<{ id: string; name: string; useInstead: string }>;
};

export type VarietyReport = {
  ok: boolean;
  slides: number;
  distinct_variants: number;
  distinct_families: number;
  /** 0–100: how much of the deck's layout budget is actually different layouts. */
  variety_score: number;
  most_used: Array<{ variant_id: string; name: string; count: number }>;
  unused_options: Array<{ id: string; name: string; section_id: string }>;
  issues: VarietyIssue[];
  instruction: string;
};

export type SlideForVariety = {
  position: number;
  variant_id: string;
  section_id?: string | null;
};

/** Beyond this many uses of one module, a deck starts to look templated. */
const MAX_SAME_VARIANT = 2;
/** Cover/closing style singletons are naturally unique; grids are the repeat risk. */
function repeatLimit(v: ModuleVariant | undefined): number {
  if (!v) return MAX_SAME_VARIANT;
  // Content-carrying grids and pillar boards are exactly what gets over-used.
  return v.capacity.items ? MAX_SAME_VARIANT : MAX_SAME_VARIANT + 1;
}

/**
 * Report layout repetition across a deck with concrete swaps, so a caller can
 * fix it with `change_slide_variant` instead of guessing.
 */
export function varietyReport(slides: SlideForVariety[]): VarietyReport {
  const counts = new Map<string, number[]>();
  for (const s of slides) {
    const list = counts.get(s.variant_id) ?? [];
    list.push(s.position);
    counts.set(s.variant_id, list);
  }
  const families = new Set<string>();
  for (const id of counts.keys()) {
    const fam = byId(MODULE_VARIANTS, id)?.familyId;
    if (fam) families.add(fam);
  }

  const usedIds = new Set(counts.keys());
  const sectionIds = Array.from(
    new Set(slides.map((s) => s.section_id).filter((x): x is string => !!x)),
  );

  const issues: VarietyIssue[] = [];
  for (const [variantId, positions] of counts) {
    const v = byId(MODULE_VARIANTS, variantId);
    const limit = repeatLimit(v);
    if (positions.length <= limit) continue;
    // Alternates: unused siblings that can carry the same content shape.
    const sameShape = MODULE_VARIANTS.filter(
      (cand) =>
        cand.id !== variantId &&
        !usedIds.has(cand.id) &&
        (v ? cand.familyId === v.familyId || sharesShape(cand, v) : true),
    ).slice(0, 4);
    issues.push({
      severity: positions.length >= limit + 2 ? "blocking" : "advisory",
      variant_id: variantId,
      variant_name: v?.name ?? variantId,
      used_on_slides: positions.map((p) => p + 1),
      message: `${v?.name ?? variantId} is used on ${positions.length} slides (limit ${limit}). Keep the strongest one or two and move the rest to a different layout that carries the same content shape.`,
      alternates: sameShape.map((cand) => ({
        id: cand.id,
        name: cand.name,
        useInstead: cand.description,
      })),
    });
  }

  const unused: VarietyReport["unused_options"] = [];
  for (const sectionId of sectionIds) {
    for (const v of variantsForSection(sectionId)) {
      if (usedIds.has(v.id)) continue;
      if (unused.some((u) => u.id === v.id)) continue;
      unused.push({ id: v.id, name: v.name, section_id: sectionId });
    }
  }

  const varietyScore = slides.length ? Math.round((usedIds.size / slides.length) * 100) : 100;
  const mostUsed = Array.from(counts.entries())
    .map(([variant_id, positions]) => ({
      variant_id,
      name: byId(MODULE_VARIANTS, variant_id)?.name ?? variant_id,
      count: positions.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const blocking = issues.filter((i) => i.severity === "blocking").length;
  return {
    ok: blocking === 0,
    slides: slides.length,
    distinct_variants: usedIds.size,
    distinct_families: families.size,
    variety_score: varietyScore,
    most_used: mostUsed,
    unused_options: unused.slice(0, 24),
    issues,
    instruction: blocking
      ? "This deck reuses the same module layout too many times — it reads as one template with different words, which is the single most visible sign of an auto-generated deck. For every blocking entry, keep at most two slides on that module and move the others to one of the listed alternates with change_slide_variant, then re-write the content for the new layout's fields and re-run this audit. Prefer layouts from unused_options: they are already permitted for the sections in this deck."
      : issues.length
        ? "No module is badly over-used, but the advisory entries repeat. Swap one of them to an unused layout so consecutive slides do not read alike."
        : "Layout variety is healthy: no module carries more of the deck than it should.",
  };
}

/** Two variants carry the same content shape when both are item grids or both are single statements. */
function sharesShape(a: ModuleVariant, b: ModuleVariant): boolean {
  const aItems = !!a.capacity.items;
  const bItems = !!b.capacity.items;
  if (aItems !== bItems) return false;
  if (!aItems) return true;
  const ar = a.capacity.items!;
  const br = b.capacity.items!;
  // Overlapping item ranges — content written for one fits the other.
  return ar.min <= br.max && br.min <= ar.max;
}

/** Human-readable family label, for tool output. */
export function familyLabel(variantId: string): string {
  const v = byId(MODULE_VARIANTS, variantId);
  return v ? (byId(MODULE_FAMILIES, v.familyId)?.name ?? v.familyId) : variantId;
}
