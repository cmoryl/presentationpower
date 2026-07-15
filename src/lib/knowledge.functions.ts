// Knowledge base server functions — per-division entries with cross-division sharing.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KnowledgeKind = "fact" | "proof_point" | "case_study" | "policy" | "terminology" | "note";
export type KnowledgeVisibility = "private" | "shared" | "global";

export type KnowledgeEntry = {
  id: string;
  owner_division_id: string;
  title: string;
  body: string;
  kind: KnowledgeKind;
  tags: string[];
  sources: string[];
  visibility: KnowledgeVisibility;
  shared_with_division_ids: string[];
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ListInput = {
  divisionId?: string;         // filter to entries visible to this division
  includeShared?: boolean;     // include entries shared with this division from other owners
  includeGlobal?: boolean;     // include global entries
  kind?: KnowledgeKind;
  search?: string;
  tag?: string;
};

export const listKnowledgeEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ListInput | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("knowledge_entries")
      .select("*")
      .order("updated_at", { ascending: false });

    if (data.divisionId) {
      const includeShared = data.includeShared ?? true;
      const includeGlobal = data.includeGlobal ?? true;
      const clauses = [`owner_division_id.eq.${data.divisionId}`];
      if (includeShared) clauses.push(`shared_with_division_ids.cs.{${data.divisionId}}`);
      if (includeGlobal) clauses.push(`visibility.eq.global`);
      query = query.or(clauses.join(","));
    }
    if (data.kind) query = query.eq("kind", data.kind);
    if (data.tag) query = query.contains("tags", [data.tag]);
    if (data.search && data.search.trim().length > 0) {
      const s = data.search.trim().replace(/[%_]/g, "");
      query = query.or(`title.ilike.%${s}%,body.ilike.%${s}%`);
    }

    const { data: rows, error } = await query.limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as KnowledgeEntry[];
  });

export const getKnowledgeEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("knowledge_entries")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as KnowledgeEntry | null;
  });

type UpsertInput = {
  id?: string;
  owner_division_id: string;
  title: string;
  body: string;
  kind: KnowledgeKind;
  tags: string[];
  sources: string[];
  visibility: KnowledgeVisibility;
  shared_with_division_ids: string[];
  expires_at?: string | null;
};

export const upsertKnowledgeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UpsertInput) => data)
  .handler(async ({ data, context }) => {
    const payload = {
      owner_division_id: data.owner_division_id,
      title: data.title.trim(),
      body: data.body,
      kind: data.kind,
      tags: (data.tags ?? []).map((t) => t.trim()).filter(Boolean),
      sources: (data.sources ?? []).map((s) => s.trim()).filter(Boolean),
      visibility: data.visibility,
      shared_with_division_ids: data.visibility === "shared" ? data.shared_with_division_ids ?? [] : [],
      expires_at: data.expires_at ?? null,
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("knowledge_entries")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row as KnowledgeEntry;
    }
    const { data: row, error } = await context.supabase
      .from("knowledge_entries")
      .insert({ ...payload, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as KnowledgeEntry;
  });

export const deleteKnowledgeEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("knowledge_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const KNOWLEDGE_KIND_META: Record<KnowledgeKind, { label: string; description: string }> = {
  fact: { label: "Fact", description: "Verified statement or figure" },
  proof_point: { label: "Proof point", description: "Metric or outcome usable in decks" },
  case_study: { label: "Case study", description: "Narrative client outcome" },
  policy: { label: "Policy", description: "Rule or process the division follows" },
  terminology: { label: "Terminology", description: "Preferred term / do-not-use" },
  note: { label: "Note", description: "Working knowledge or lore" },
};
