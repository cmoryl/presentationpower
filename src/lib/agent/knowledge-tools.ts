/**
 * SHARED KNOWLEDGE GROUNDING — every agent, not just the deck agent.
 *
 * The presentation agent has always been able to check the division-scoped
 * knowledge base (and therefore the translation glossary that mirrors into it)
 * before writing a factual claim. The print, social and events agents could
 * not, so the same brief produced grounded slides and ungrounded print/social
 * copy. These two tools are the shared grounding surface: identical retrieval
 * rulebook, identical never-translate rules, one implementation.
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SHARED_KNOWLEDGE_PROMPT = [
  "GROUNDING — non-negotiable.",
  "- Before you write any factual claim (a statistic, a client result, a capability, a date, a named reference), call search_knowledge for it and use what comes back. If nothing comes back, say the figure is not in the knowledge base and ask for it — never invent one and never attach a citation you did not retrieve.",
  "- Call list_glossary_terms before writing brand, product or service names. A term marked do-not-translate is written exactly as recorded, in every language, and is never paraphrased, pluralised or re-cased.",
  "- Prefer the division you are working for when searching; fall back to the master brand only when the division has nothing.",
  "- Call list_division_facts when you need a division's headline numbers or a customer quote: use the recorded value, unit, caption and source verbatim, and attribute a quote to the recorded author, role and company. Never round, re-word or re-attribute one.",
  "- Call search_event_knowledge for anything venue- or event-specific (addresses, room names, panel sizes, opening times, production notes). If it is not recorded there, say so instead of estimating.",
].join("\n");

type Db = Pick<SupabaseClient, "from">;

/** search_knowledge + list_glossary_terms, scoped by the caller's own client. */
export function buildSharedKnowledgeToolSet(ctx: { supabase: Db }): ToolSet {
  return {
    search_knowledge: tool({
      description:
        "Search the division-scoped knowledge base (knowledge entries, brand intelligence, uploaded brand documents) for verified facts, statistics, proof points and client references. Call this before writing any factual claim.",
      inputSchema: z.object({
        query: z.string().describe("What you need verified facts about."),
        division_id: z
          .string()
          .optional()
          .describe("Brand mode id such as 'bm-enterprise' or 'bm-tp-legal'. Defaults to the master brand."),
        limit: z.number().optional().describe("Max snippets to return (default 6, max 12)."),
      }),
      execute: async ({ query, division_id, limit }) => {
        try {
          const { retrieveGrounding } = await import("@/lib/knowledge-grounding.server");
          const { resolveBrandModeId, DEFAULT_BRAND_MODE_ID } = await import(
            "@/lib/mcp/brand-mode"
          );
          const divisionId = resolveBrandModeId(division_id);
          if (!divisionId)
            return `ERROR: unknown division id "${division_id}". Use a brand mode id such as ${DEFAULT_BRAND_MODE_ID}.`;
          const cap = Math.max(1, Math.min(12, Math.round(limit ?? 6)));
          const { snippets, divisionScoped } = await retrieveGrounding({
            supabase: ctx.supabase as never,
            divisionId,
            query,
            limit: cap,
          });
          return {
            divisionScoped,
            results: snippets.map((s) => ({
              source: s.source,
              title: s.title,
              body: s.body,
              tags: s.tags,
            })),
          };
        } catch (err) {
          return `ERROR: knowledge lookup failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    }),

    list_glossary_terms: tool({
      description:
        "List the approved translation glossary: terms that must never be translated, and the approved translation for those that may be. Call this before writing brand, product or service names.",
      inputSchema: z.object({
        scope: z.enum(["global", "division", "deck"]).optional(),
        scope_id: z.string().optional().describe("Division or deck id when scope is not global."),
      }),
      execute: async ({ scope, scope_id }) => {
        try {
          let q = ctx.supabase
            .from("glossary_terms")
            .select("term, do_not_translate, translations, scope, scope_id, notes");
          if (scope) q = q.eq("scope", scope);
          if (scope_id) q = q.eq("scope_id", scope_id);
          const { data, error } = await q.order("term", { ascending: true }).limit(200);
          if (error) return `ERROR: glossary lookup failed: ${error.message}`;
          return { terms: data ?? [] };
        } catch (err) {
          return `ERROR: glossary lookup failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    }),

    list_division_facts: tool({
      description:
        "List a division's recorded headline statistics and customer quotes (value, unit, caption, source; quote with author, role, company). Use these verbatim rather than writing your own numbers or testimonials.",
      inputSchema: z.object({
        division_id: z
          .string()
          .describe("Brand mode id such as 'bm-enterprise' or 'bm-tp-legal'."),
      }),
      execute: async ({ division_id }) => {
        try {
          const { resolveBrandModeId, DEFAULT_BRAND_MODE_ID } = await import(
            "@/lib/mcp/brand-mode"
          );
          const divisionId = resolveBrandModeId(division_id);
          if (!divisionId)
            return `ERROR: unknown division id "${division_id}". Use a brand mode id such as ${DEFAULT_BRAND_MODE_ID}.`;
          const [stats, quotes] = await Promise.all([
            ctx.supabase
              .from("division_stats")
              .select("label, value, unit, caption, source")
              .eq("division_id", divisionId)
              .order("sort_order", { ascending: true })
              .limit(40),
            ctx.supabase
              .from("division_quotes")
              .select("quote, author, role, company, source")
              .eq("division_id", divisionId)
              .order("sort_order", { ascending: true })
              .limit(20),
          ]);
          if (stats.error) return `ERROR: stats lookup failed: ${stats.error.message}`;
          if (quotes.error) return `ERROR: quote lookup failed: ${quotes.error.message}`;
          return {
            divisionId,
            stats: stats.data ?? [],
            quotes: quotes.data ?? [],
            note:
              (stats.data ?? []).length || (quotes.data ?? []).length
                ? "Use these verbatim."
                : "Nothing recorded for this division — ask for the figures instead of inventing them.",
          };
        } catch (err) {
          return `ERROR: division facts lookup failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    }),

    search_event_knowledge: tool({
      description:
        "Search recorded event and venue knowledge (addresses, rooms, panel and signage specs, opening times, production notes) captured from real event builds. Call this before writing anything venue- or event-specific.",
      inputSchema: z.object({
        query: z.string().describe("What you need about the event or venue."),
        city: z.string().optional().describe("Filter to a city, e.g. 'London'."),
        kind: z
          .string()
          .optional()
          .describe("Filter to a record kind, e.g. 'decision', 'lesson', 'spec'."),
        limit: z.number().optional().describe("Max records (default 8, max 20)."),
      }),
      execute: async ({ query, city, kind, limit }) => {
        try {
          const cap = Math.max(1, Math.min(20, Math.round(limit ?? 8)));
          const needle = query.trim().slice(0, 120).replace(/[%,]/g, " ");
          let q = ctx.supabase
            .from("event_venue_knowledge")
            .select("event_id, city, venue, panel_id, kind, title, body, facts, source");
          if (city) q = q.ilike("city", `%${city}%`);
          if (kind) q = q.eq("kind", kind);
          if (needle) q = q.or(`title.ilike.%${needle}%,body.ilike.%${needle}%`);
          const { data, error } = await q
            .order("updated_at", { ascending: false })
            .limit(cap);
          if (error) return `ERROR: event knowledge lookup failed: ${error.message}`;
          if (!data?.length)
            return {
              results: [],
              note: "Nothing recorded for that event or venue — say so and ask, rather than estimating.",
            };
          return { results: data };
        } catch (err) {
          return `ERROR: event knowledge lookup failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      },
    }),
  };
}
