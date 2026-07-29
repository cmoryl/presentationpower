/**
 * Shared retrieval primitives for every knowledge/RAG surface.
 *
 * Two things used to be copy-pasted (and drift) across
 * `knowledge-grounding.server.ts`, `ai-rag.functions.ts`, `ai-oracle.functions.ts`
 * and `admin.functions.ts`: the division-scoping predicate and the keyword
 * scorer. Both had real bugs. They live here now so a fix lands once.
 *
 * Pure module: no Supabase import, no env reads — safe to unit test.
 */

/**
 * Every embedding, at ingest and at query time, must use this exact model.
 * Vectors from different models are not comparable, and a mismatch degrades
 * silently (cosine similarity just gets worse) rather than erroring.
 */
export const EMBEDDING_MODEL = "google/gemini-embedding-001";

/** Chunks below this cosine similarity are noise; injecting them as
 *  "verified knowledge" actively misleads the model. */
export const MIN_CHUNK_SIMILARITY = 0.22;

/**
 * PostgREST `or=` predicate restricting `knowledge_entries` to what a division
 * may see.
 *
 * The bug this fixes: ingestion writes org-wide facts with
 * `owner_division_id = 'global'` (admin.functions.ts), but every retrieval site
 * matched `owner_division_id.is.null`. NULL never equals 'global', so as soon as
 * a caller passed a division id, 100% of the curated knowledge base was filtered
 * out and grounding silently fell back to raw document chunks only.
 * `visibility = 'global'` is included for the same reason — an entry owned by
 * one division but published globally is meant to be readable everywhere.
 */
export function knowledgeDivisionFilter(divisionId: string): string {
  const d = divisionId.trim();
  return [
    "owner_division_id.is.null",
    "owner_division_id.eq.global",
    "visibility.eq.global",
    `owner_division_id.eq.${d}`,
    `shared_with_division_ids.cs.{${d}}`,
  ].join(",");
}

/** Normalises a division id, treating the master brand as "no filter". */
export function normalizeDivisionFilter(divisionId?: string | null): string | null {
  const d = divisionId?.trim();
  return d && d !== "master" && d !== "global" ? d : null;
}

// ── keyword scoring ────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "this","that","with","from","have","will","your","their","about","into","been",
  "they","them","were","what","when","which","would","there","these","those",
  "should","could","also","more","than","then","only","some","such","most",
  "make","made","need","want","help","using","used","like","just","very","much",
]);

/** Splits text into scoreable terms: alphanumeric, >3 chars, non-stopword. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

export type ScorableDoc = {
  /** Pre-joined searchable text (title + body + tags). */
  text: string;
  tags?: string[];
};

const K1 = 1.2;
const B = 0.75;

/**
 * BM25 over the candidate set.
 *
 * Replaces the previous scorer, which added +1 per query term found via
 * `String.includes()`. That had three defects: substring matching produced
 * false positives ("art" matched "chart", "sign" matched "design"); every term
 * counted equally, so a term present in every document carried as much weight
 * as a rare, discriminating one; and there was no length normalisation, so the
 * longest entries in the corpus won nearly every query regardless of relevance.
 *
 * BM25 fixes all three: exact token matching, IDF weighting, and document
 * length normalisation.
 *
 * @returns scores aligned by index with `docs`; 0 means no match.
 */
export function bm25Scores(
  docs: ScorableDoc[],
  query: string,
  brandTags: string[] = [],
): number[] {
  const terms = Array.from(new Set(tokenize(query)));
  if (!docs.length) return [];

  const docTokens = docs.map((d) => tokenize(d.text));
  const avgLen =
    docTokens.reduce((sum, t) => sum + t.length, 0) / Math.max(1, docTokens.length) || 1;

  // Term frequency per doc, and document frequency per term.
  const tfMaps = docTokens.map((tokens) => {
    const m = new Map<string, number>();
    for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });
  const df = new Map<string, number>();
  for (const term of terms) {
    let n = 0;
    for (const m of tfMaps) if (m.has(term)) n += 1;
    df.set(term, n);
  }

  const N = docs.length;
  const lowerBrandTags = brandTags.map((t) => t.toLowerCase()).filter(Boolean);

  return docs.map((doc, i) => {
    const tf = tfMaps[i];
    const dl = docTokens[i].length;
    let score = 0;
    for (const term of terms) {
      const f = tf.get(term);
      if (!f) continue;
      const n = df.get(term) ?? 0;
      // +1 inside the log keeps IDF non-negative for terms present everywhere.
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * dl) / avgLen)));
    }
    if (score > 0 && lowerBrandTags.length) {
      const tags = (doc.tags ?? []).map((t) => t.toLowerCase());
      for (const bt of lowerBrandTags) {
        if (tags.some((tg) => tg.includes(bt))) score *= 1.25;
      }
    }
    return score;
  });
}

/**
 * Reciprocal rank fusion of several ranked id lists.
 *
 * Keyword scores and cosine similarities are not on a comparable scale, so the
 * previous merge just alternated one from each list — which let an irrelevant
 * vector chunk outrank a strong keyword hit. RRF combines by *rank*, which is
 * scale-free, and rewards items that both retrievers agree on.
 */
export function reciprocalRankFusion(lists: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, idx) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + idx + 1));
    });
  }
  return scores;
}
