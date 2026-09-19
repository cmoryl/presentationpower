// Oracle mirror backfill: pushes every already-ingested division document
// (PDFs, print collateral, imported decks) into `oracle_knowledge_base` as a
// division-scoped digest, so the Oracle keyword pass and the vector pass see
// the same corpus. Idempotent — keyed on metadata.mirrorKey.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { mirrorOracleKnowledge, type OracleMirrorDoc } from "@/lib/oracle-mirror.server";

type QueryResult = { data: unknown; error: unknown };
interface QB extends PromiseLike<QueryResult> {
  select: (cols?: string) => QB;
  eq: (col: string, val: unknown) => QB;
  not: (col: string, op: string, val: unknown) => QB;
  order: (col: string, opts?: { ascending?: boolean }) => QB;
  range: (from: number, to: number) => QB;
  limit: (n: number) => QB;
}
type Sb = {
  from: (t: string) => QB;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<QueryResult>;
};

export const backfillOracleMirror = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ limit: z.number().min(1).max(500).default(400) }).parse(d ?? {}),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      considered: number;
      inserted: number;
      updated: number;
      errors: string[];
    }> => {
      const s = context.supabase as unknown as Sb;
      const { data: isAdmin } = await s.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Forbidden: admin required");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sa = supabaseAdmin as unknown as Sb;

      const { data: rows, error } = await sa
        .from("brand_assets")
        .select("id, title, division_id, kind, entity_type, tags, extracted_text")
        .not("extracted_text", "is", null)
        .order("updated_at", { ascending: false })
        .limit(data.limit);
      if (error) throw new Error(String((error as { message?: string }).message ?? error));

      const list = (rows ?? []) as Array<{
        id: string;
        title: string;
        division_id: string | null;
        kind: string | null;
        entity_type: string | null;
        tags: string[] | null;
        extracted_text: string | null;
      }>;

      const docs: OracleMirrorDoc[] = list
        .filter((r) => (r.extracted_text ?? "").trim().length >= 120)
        .map((r) => ({
          mirrorKey:
            r.entity_type === "print-library" ? `print-asset:${r.id}` : `brand-asset:${r.id}`,
          title: r.title,
          text: r.extracted_text as string,
          divisionId: r.division_id,
          sourceType: r.entity_type === "print-library" ? "print" : (r.kind ?? "pdf"),
          assetId: r.id,
          tags: r.tags ?? [],
        }));

      // Event knowledge lives in its own store with its own embeddings; the
      // Oracle only reads oracle_knowledge_base, so mirror it here too.
      const { data: evk } = await sa
        .from("event_venue_knowledge")
        .select(
          "event_id, city, venue, template_family_id, panel_id, kind, title, body, facts, source, fingerprint",
        )
        .limit(1000);
      const { eventKnowledgeOracleDocs } = await import("@/lib/event-knowledge-oracle.server");
      const eventDocs = eventKnowledgeOracleDocs(
        ((evk ?? []) as Array<Record<string, unknown>>).map((r) => ({
          eventId: String(r["event_id"] ?? ""),
          city: String(r["city"] ?? ""),
          venue: String(r["venue"] ?? ""),
          templateFamilyId: (r["template_family_id"] as string | null) ?? null,
          panelId: (r["panel_id"] as string | null) ?? null,
          kind: r["kind"] as never,
          title: String(r["title"] ?? ""),
          body: String(r["body"] ?? ""),
          facts: (r["facts"] ?? {}) as never,
          source: r["source"] as never,
          fingerprint: String(r["fingerprint"] ?? ""),
        })),
      );

      // The translation glossary is its own store too — mirror the approved
      // terms so the Oracle can cite "never translate" rules from the record.
      const { data: glos } = await sa
        .from("glossary_terms")
        .select("term, scope, scope_id, do_not_translate, notes, translations")
        .limit(2000);
      const { glossaryOracleDocs } = await import("@/lib/glossary-oracle.server");
      const glossaryDocs = glossaryOracleDocs(
        ((glos ?? []) as Array<Record<string, unknown>>).map((r) => ({
          term: String(r["term"] ?? ""),
          scope: String(r["scope"] ?? "global"),
          scopeId: (r["scope_id"] as string | null) ?? null,
          doNotTranslate: Boolean(r["do_not_translate"]),
          notes: (r["notes"] as string | null) ?? null,
          translations: (r["translations"] ?? {}) as Record<string, unknown>,
        })),
      );

      const docs2 = [...docs, ...eventDocs, ...glossaryDocs];
      const res = await mirrorOracleKnowledge(sa, docs2, context.userId);
      return { ok: res.errors.length === 0, considered: docs2.length, ...res };

    },
  );
