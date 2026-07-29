// Client-safe citation shape for knowledge-grounded AI output.
//
// The grounding prompt numbers retrieved excerpts [1], [2], … in retrieval
// order (see formatGroundingBlock in knowledge-grounding.server.ts). This
// module mirrors that numbering into a serialisable DTO so any surface can
// show the user exactly which documents informed a generation.
//
// Kept out of *.server.ts on purpose: components import this type directly.

export type GroundingCitation = {
  /** 1-based index matching the [n] markers handed to the model. */
  ref: number;
  source: string;
  title: string;
  excerpt: string;
  /** True when the excerpt came from outside the requested division. */
  crossDivision?: boolean;
};

/** Minimal structural shape of a retrieved snippet — avoids importing the server module. */
type SnippetLike = {
  source: string;
  title: string;
  body: string;
  crossDivision?: boolean;
};

/** Map retrieval snippets onto citations, preserving the prompt's [n] order. */
export function toCitations(snippets: SnippetLike[], excerptChars = 400): GroundingCitation[] {
  return snippets.map((s, i) => ({
    ref: i + 1,
    source: s.source,
    title: s.title,
    excerpt: s.body.slice(0, excerptChars).trim(),
    crossDivision: s.crossDivision,
  }));
}

/**
 * Drop hallucinated references. Models routinely cite [7] when only 5 excerpts
 * were supplied; those must never reach the UI as clickable citations.
 */
export function sanitizeRefs(refs: number[] | undefined, available: number): number[] {
  if (!refs?.length) return [];
  const seen = new Set<number>();
  return refs.filter((r) => {
    if (!Number.isInteger(r) || r < 1 || r > available || seen.has(r)) return false;
    seen.add(r);
    return true;
  });
}
