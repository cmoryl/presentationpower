/**
 * Event knowledge + translation glossary as general-grounding sources.
 *
 * Both stores were silos: reachable only through their own dedicated searches,
 * so the measured event facts (panel specs, grounds, substrates, lessons,
 * decisions) and the approved terminology never reached general answers. They
 * are curated fact stores, so the shared retrieval path reads them like any
 * other source.
 *
 * Neither table carries a division axis — event knowledge is event/venue
 * scoped, the glossary is language/deck scoped — so both are treated as global
 * knowledge, exactly how `category IS NULL` oracle rows are.
 *
 * Pure row→snippet shaping only, shared by `knowledge-grounding.server.ts` and
 * `ai-oracle.functions.ts` so the two paths cannot drift apart again.
 */

export type EventKnowledgeRow = {
  id: string;
  title: string;
  body: string | null;
  kind: string | null;
  city: string | null;
  venue: string | null;
  event_id: string | null;
  panel_id: string | null;
};

export type GlossaryRow = {
  id: string;
  term: string;
  notes: string | null;
  do_not_translate: boolean | null;
  scope: string | null;
  scope_id: string | null;
};

export type SiloSnippet = {
  id: string;
  title: string;
  body: string;
  tags: string[];
};

export function eventKnowledgeSnippets(rows: EventKnowledgeRow[]): SiloSnippet[] {
  return rows
    .map((r) => ({
      id: `event:${r.id}`,
      title: [r.city, r.title].filter(Boolean).join(" — ") || r.title,
      body: r.body ?? "",
      tags: [
        r.kind ? `kind:${r.kind}` : "",
        r.event_id ? `event:${r.event_id}` : "",
        r.city ?? "",
        r.venue ?? "",
        r.panel_id ?? "",
      ].filter(Boolean),
    }))
    .filter((s) => s.body.trim().length > 0);
}

export function glossarySnippets(rows: GlossaryRow[]): SiloSnippet[] {
  return rows
    .map((r) => {
      // A glossary row is a rule, not prose: state the rule so a model can act
      // on it, and list the approved renderings so it can quote them verbatim.
      const rule = r.do_not_translate
        ? "Never translate this term — keep it exactly as written in every language."
        : "Approved terminology. Use this wording rather than a synonym.";
      return {
        id: `glossary:${r.id}`,
        title: `Glossary: ${r.term}`,
        body: [rule, r.notes ?? ""].filter(Boolean).join(" ").trim(),
        tags: [
          "glossary",
          r.scope ? `scope:${r.scope}` : "",
          r.scope_id ?? "",
          r.do_not_translate ? "do-not-translate" : "",
        ].filter(Boolean),
      };
    })
    .filter((s) => s.body.trim().length > 0);
}
