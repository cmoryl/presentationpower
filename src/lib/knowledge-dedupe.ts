/**
 * Cross-source knowledge dedup.
 *
 * `oracle_knowledge_base` was originally seeded by copying rows out of
 * `knowledge_entries`, so the same fact routinely exists twice under two
 * different ids (`kb:<uuid>` and `oracle:<uuid>`). Both copies score the same
 * against a brief, so both get retrieved — which burns two of the twelve
 * prompt slots on one fact and, worse, reads to the model as two independent
 * sources corroborating each other.
 *
 * Dedup on normalised title + body prefix. `preferredOrder` decides which copy
 * survives; callers pass the canonical/editable source first.
 */

export type DedupableKnowledge = {
  id: string;
  title: string;
  body: string;
};

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeKey(item: DedupableKnowledge): string {
  // Title alone is too collision-prone ("Overview", "Key stats"); the full body
  // is too brittle (one edited word defeats it). Title + 160 body chars is the
  // balance that catches the mirrored copies without merging distinct facts.
  return `${normalise(item.title)}::${normalise(item.body).slice(0, 160)}`;
}

export function dedupeKnowledge<T extends DedupableKnowledge>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = dedupeKey(item);
    // An entry with neither title nor body carries no signal to dedupe on;
    // keep it rather than collapsing every empty row into one.
    if (key === "::") {
      out.push(item);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
