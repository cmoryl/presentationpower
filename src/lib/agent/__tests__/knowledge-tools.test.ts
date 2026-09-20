// The shared grounding surface every agent gets: glossary, division facts and
// event/venue knowledge, with honest "nothing recorded" answers.
import { describe, expect, it } from "vitest";
import { SHARED_KNOWLEDGE_PROMPT, buildSharedKnowledgeToolSet } from "../knowledge-tools";

type Row = Record<string, unknown>;

function stubDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const q: Record<string, unknown> = {};
      const chain = () => q;
      Object.assign(q, {
        select: chain,
        eq: chain,
        ilike: chain,
        or: chain,
        order: chain,
        limit: async () => ({ data: rows, error: null }),
        then: (res: (v: { data: Row[]; error: null }) => unknown) => res({ data: rows, error: null }),
      });
      return q;
    },
  };
}

const run = async (tool: unknown, input: unknown) =>
  (await (tool as { execute: (i: unknown) => Promise<unknown> }).execute(input)) as Record<
    string,
    unknown
  >;

describe("shared knowledge tools", () => {
  it("exposes the four grounding tools", () => {
    const set = buildSharedKnowledgeToolSet({ supabase: stubDb({}) as never });
    expect(Object.keys(set).sort()).toEqual([
      "list_division_facts",
      "list_glossary_terms",
      "search_event_knowledge",
      "search_knowledge",
    ]);
  });

  it("tells the agent to use recorded stats and venue facts verbatim", () => {
    expect(SHARED_KNOWLEDGE_PROMPT).toMatch(/list_division_facts/);
    expect(SHARED_KNOWLEDGE_PROMPT).toMatch(/search_event_knowledge/);
  });

  it("returns recorded stats and quotes for a division", async () => {
    const set = buildSharedKnowledgeToolSet({
      supabase: stubDb({
        division_stats: [{ label: "Faster delivery", value: "40", unit: "%", source: "Digital Reef" }],
        division_quotes: [{ quote: "Fast.", author: "A. Counsel", role: "GC", company: "Acme" }],
      }) as never,
    });
    const out = await run(set["list_division_facts"], { division_id: "bm-tp-legal" });
    expect((out["stats"] as Row[]).length).toBe(1);
    expect((out["quotes"] as Row[]).length).toBe(1);
    expect(out["note"]).toMatch(/verbatim/i);
  });

  it("says nothing is recorded instead of inventing venue facts", async () => {
    const set = buildSharedKnowledgeToolSet({
      supabase: stubDb({ event_venue_knowledge: [] }) as never,
    });
    const out = await run(set["search_event_knowledge"], { query: "cloakroom size" });
    expect(out["results"]).toEqual([]);
    expect(String(out["note"])).toMatch(/Nothing recorded/i);
  });

  it("rejects an unknown division id rather than guessing", async () => {
    const set = buildSharedKnowledgeToolSet({ supabase: stubDb({}) as never });
    const out = await run(set["list_division_facts"], { division_id: "bm-not-real" });
    expect(String(out)).toMatch(/unknown division id/i);
  });
});
