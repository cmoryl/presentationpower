// ---------------------------------------------------------------------------
// HIDDEN SECTIONS — authored suppression for live-editor deletes
// ---------------------------------------------------------------------------
// Deleting a section used to clear the content field it owned. That reads as
// "it keeps coming back" because layouts synthesise defaults from sibling
// data (engagement bullets fall back to the expert block, the footer falls
// back to transperfect.com, heroes fall back to a division plate).
//
// Instead a delete records the section key in `hiddenSections`. The data stays
// intact — the layout simply refuses to render that key, and nothing can
// repopulate it. Restoring is a single key removal, so undo is exact.

export type HiddenSectionKey =
  | "hero"
  | "stats"
  | "quote"
  | "engagement"
  | "cta"
  | "footer"
  | "features"
  | "knowHow"
  | "expert"
  | (string & {});

type MaybeHidden = { hiddenSections?: string[] } | null | undefined;

/** Normalised set of hidden section keys for any print content bag. */
export function hiddenSectionSet(content: unknown): Set<string> {
  const raw = (content as MaybeHidden)?.hiddenSections;
  return new Set(Array.isArray(raw) ? raw.filter((k) => typeof k === "string") : []);
}

/** True when the layout must not render this section at all. */
export function isSectionHidden(content: unknown, key: HiddenSectionKey): boolean {
  return hiddenSectionSet(content).has(key);
}

/** Add a key (idempotent). Returns the next array for a content patch. */
export function withSectionHidden(content: unknown, key: HiddenSectionKey): string[] {
  const set = hiddenSectionSet(content);
  set.add(key);
  return [...set];
}

/** Remove a key (idempotent). Returns the next array for a content patch. */
export function withSectionShown(content: unknown, key: HiddenSectionKey): string[] {
  const set = hiddenSectionSet(content);
  set.delete(key);
  return [...set];
}
