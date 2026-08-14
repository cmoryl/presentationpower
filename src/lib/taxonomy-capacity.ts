// ---------------------------------------------------------------------------
// The capacity ⇄ field invariant.
//
// A caller writing content for a variant must be able to answer two questions
// from the taxonomy alone: which keys may I send, and how long may each be.
// That only holds if the two vocabularies stay welded together:
//
//   1. Every editable TEXT field has a character budget.
//   2. Every budget names a field that actually exists in `editableFields`.
//
// Break either direction and content silently disappears: before this existed,
// 54 of 190 variants carried a budget no field could claim, and content written
// to the generic `title`/`body` keys passed every declared check and was then
// dropped by the deep merge.
//
// `assertCapacityIntegrity()` is the build-time gate. It runs in unit tests and
// from `bun run scripts/check-capacity.ts`, and it throws listing every offence
// rather than the first, so a bad variant is fixed in one pass.
// ---------------------------------------------------------------------------

import { MODULE_VARIANTS, type ModuleVariant } from "./taxonomy";
import { type FieldSpec } from "./taxonomy-field-kinds";



/** One resolved field: the path a caller writes, and what fits there. */
export type ResolvedField = {
  /** Path as listed in `editableFields`, e.g. `items[].label`. */
  path: string;
  kind: FieldSpec["kind"];
  /** Character budget — present only for `kind: "text"`. */
  chars?: number;
  /** True when the field lives inside the repeating `items` array. */
  item: boolean;
};

/** The per-field schema for a variant — what `list_variants` publishes. */
export type ResolvedCapacity = {
  variantId: string;
  fields: ResolvedField[];
  items?: { path: string; min: number; max: number };
};

/**
 * Flatten a variant's capacity into an addressable per-field schema. Item
 * fields are re-prefixed with their collection root (`items[].`, `series[].`…)
 * so every returned path is exactly a path a caller may write.
 */
export function resolveCapacity(variant: ModuleVariant): ResolvedCapacity {
  const fields: ResolvedField[] = [];
  const push = (path: string, spec: FieldSpec, item: boolean) => {
    fields.push(
      spec.kind === "text"
        ? { path, kind: "text", chars: spec.chars, item }
        : { path, kind: spec.kind, item },
    );
  };
  for (const [path, spec] of Object.entries(variant.capacity.fields)) push(path, spec, false);
  const root = variant.capacity.items?.path ?? "items";
  for (const [sub, spec] of Object.entries(variant.capacity.items?.fields ?? {})) {
    push(`${root}[].${sub}`, spec, true);
  }
  return {
    variantId: variant.id,
    fields,
    items: variant.capacity.items
      ? {
          path: variant.capacity.items.path ?? "items",
          min: variant.capacity.items.min,
          max: variant.capacity.items.max,
        }
      : undefined,
  };
}

/** Every problem found in one variant. Empty array means the variant is sound. */
export function capacityProblems(variant: ModuleVariant): string[] {
  const problems: string[] = [];
  const declared = new Set(variant.editableFields);
  const budgeted = new Set(resolveCapacity(variant).fields.map((f) => f.path));

  // Direction 1 — an editable field with no budget: a caller cannot know what
  // fits, so any value is a guess.
  for (const path of declared) {
    if (!budgeted.has(path)) {
      problems.push(`${variant.id}: editable field "${path}" has no capacity entry`);
    }
  }
  // Direction 2 — a budget with no field: an orphan, which is exactly what made
  // `titleChars`/`bodyChars` unusable.
  for (const path of budgeted) {
    if (!declared.has(path)) {
      problems.push(`${variant.id}: capacity budget "${path}" matches no editable field`);
    }
  }
  // A text budget must actually be a number a caller can respect.
  for (const f of resolveCapacity(variant).fields) {
    if (f.kind === "text" && (!Number.isFinite(f.chars) || (f.chars ?? 0) <= 0)) {
      problems.push(`${variant.id}: text field "${f.path}" has a non-positive character budget`);
    }
    if (f.kind !== "text" && f.chars != null) {
      problems.push(`${variant.id}: non-text field "${f.path}" declares a character budget`);
    }
  }
  // An items budget is meaningless without item fields, and vice versa.
  // Zero item fields is legitimate when the count bounds an opaque row list
  // (`rows`, `cells` on the data-viz variants) that the caller sends whole.
  const itemFieldCount = Object.keys(variant.capacity.items?.fields ?? {}).length;
  const listRoot = variant.capacity.items?.path;
  const boundsAList =
    !!listRoot && variant.capacity.fields[listRoot]?.kind === "list";
  if (variant.capacity.items && itemFieldCount === 0 && !boundsAList) {
    problems.push(`${variant.id}: declares items ${variant.capacity.items.min}-${variant.capacity.items.max} but no item fields`);
  }
  if (variant.capacity.items && variant.capacity.items.min > variant.capacity.items.max) {
    problems.push(`${variant.id}: items min exceeds max`);
  }
  return problems;
}

/** Throws listing every offending variant. The build-time gate. */
export function assertCapacityIntegrity(variants: ModuleVariant[] = MODULE_VARIANTS): void {
  const problems = variants.flatMap(capacityProblems);
  if (problems.length) {
    throw new Error(
      `Variant capacity is not addressable by field (${problems.length} problems):\n- ${problems.join("\n- ")}`,
    );
  }
}
