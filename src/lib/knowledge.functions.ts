// Knowledge base server functions — per-division entries with cross-division sharing.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type KnowledgeKind =
  | "fact"
  | "proof_point"
  | "case_study"
  | "policy"
  | "terminology"
  | "note"
  | "source_deck"
  | "source_pdf";
export type KnowledgeVisibility = "private" | "shared" | "global";

// Map a public bm-* division id to the brand-guide slug used by admin
// uploads (imported_decks.division_id, pdf_extractions entity slugs).
// Mirrors BRAND_GUIDES in src/lib/brand-guides.ts. Kept local so this
// server-only module stays free of client asset imports.
const BM_TO_GUIDE_SLUG: Record<string, string> = {
  "bm-enterprise": "transperfect-master",
  "bm-tp-lifesci": "transperfect-life-sciences",
  "bm-tp-legal": "transperfect-legal",
  "bm-tp-media": "transperfect-media",
  "bm-tp-games": "transperfect-gaming",
  "bm-tp-digital": "transperfect-digital",
  "bm-trial-interactive": "trial-interactive",
  "bm-cobrand": "transperfect-cobrand",
  "bm-product": "dataforce",
  "bm-division": "globallink",
};


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

// Persisted (editable) kinds — must match the DB check/enum on
// public.knowledge_entries. Virtual kinds (source_deck / source_pdf)
// are synthesized at read time only and never inserted.
export type EditableKnowledgeKind =
  | "fact"
  | "proof_point"
  | "case_study"
  | "policy"
  | "terminology"
  | "note";

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
    if (data.kind && data.kind !== "source_deck" && data.kind !== "source_pdf") {
      query = query.eq("kind", data.kind);
    }
    if (data.tag) query = query.contains("tags", [data.tag]);
    if (data.search && data.search.trim().length > 0) {
      const s = data.search.trim().replace(/[%_]/g, "");
      query = query.or(`title.ilike.%${s}%,body.ilike.%${s}%`);
    }

    const { data: rows, error } = await query.limit(200);
    if (error) throw new Error(error.message);
    const persisted = (rows ?? []) as KnowledgeEntry[];

    // Merge in virtual entries synthesized from uploaded division assets
    // (imported PPTX decks + ingested PDF sources) so this "knowledge base"
    // reads as one cohesive per-division library instead of three separate
    // Admin tabs.
    const virtuals = await loadVirtualEntriesForDivision(
      context.supabase as unknown as { from: (t: string) => any },
      data.divisionId,
      { kind: data.kind, search: data.search, tag: data.tag },
    );

    return [...persisted, ...virtuals];
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
  kind: EditableKnowledgeKind;
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
  source_deck: { label: "Uploaded deck", description: "PowerPoint uploaded to this division's brand area" },
  source_pdf: { label: "Source PDF", description: "Ingested brand/reference PDF for this division" },
};

// ── Virtual entries ──────────────────────────────────────────────────────
// Uploaded PPTs (imported_decks) and ingested PDFs (pdf_extractions) live
// against per-division brand-guide slugs, not bm-* mode ids. We map the
// caller's bm-* divisionId to the matching guide slug, fetch the recent
// uploads, and return them shaped like read-only KnowledgeEntry rows.
async function loadVirtualEntriesForDivision(
  supabase: { from: (t: string) => any },
  divisionId: string | undefined,
  filters: { kind?: KnowledgeKind; search?: string; tag?: string },
): Promise<KnowledgeEntry[]> {
  if (!divisionId) return [];
  const guideSlug = BM_TO_GUIDE_SLUG[divisionId];
  if (!guideSlug) return [];

  const wantDecks = !filters.kind || filters.kind === "source_deck";
  const wantPdfs = !filters.kind || filters.kind === "source_pdf";
  const needle = filters.search?.trim().toLowerCase() ?? "";

  const results: KnowledgeEntry[] = [];

  if (wantDecks) {
    try {
      const { data: decks } = await supabase
        .from("imported_decks")
        .select("id, original_filename, file_size, slide_count, status, chunk_count, embedded_at, created_at")
        .eq("division_id", guideSlug)
        .order("created_at", { ascending: false })
        .limit(50);
      for (const d of (decks ?? []) as Array<{
        id: string;
        original_filename: string;
        file_size: number;
        slide_count: number;
        status: string;
        chunk_count: number | null;
        embedded_at: string | null;
        created_at: string;
      }>) {
        const title = d.original_filename;
        const body = `${d.slide_count} slide${d.slide_count === 1 ? "" : "s"} · ${(d.file_size / 1024).toFixed(0)} KB · ${d.status}${
          (d.chunk_count ?? 0) > 0 ? ` · ${d.chunk_count} RAG chunks` : ""
        }`;
        if (needle && !title.toLowerCase().includes(needle) && !body.toLowerCase().includes(needle)) continue;
        if (filters.tag && filters.tag !== "uploaded-deck") continue;
        results.push({
          id: `deck:${d.id}`,
          owner_division_id: divisionId,
          title,
          body,
          kind: "source_deck",
          tags: ["uploaded-deck"],
          sources: [],
          visibility: "private",
          shared_with_division_ids: [],
          expires_at: null,
          created_by: null,
          created_at: d.created_at,
          updated_at: d.embedded_at ?? d.created_at,
        });
      }
    } catch {
      /* silent — never fail the whole list because uploads are unavailable */
    }
  }

  if (wantPdfs) {
    try {
      const { data: pdfs } = await supabase
        .from("pdf_extractions")
        .select("id, title, source_url, char_count, chunk_count, status, entity_slug, updated_at, created_at")
        .eq("entity_slug", guideSlug)
        .order("created_at", { ascending: false })
        .limit(50);
      for (const p of (pdfs ?? []) as Array<{
        id: string;
        title: string | null;
        source_url: string | null;
        char_count: number | null;
        chunk_count: number | null;
        status: string;
        entity_slug: string;
        updated_at: string | null;
        created_at: string;
      }>) {
        const title = p.title || p.source_url || "Untitled PDF";
        const body = `${(p.char_count ?? 0).toLocaleString()} chars${
          (p.chunk_count ?? 0) > 0 ? ` · ${p.chunk_count} RAG chunks` : ""
        } · ${p.status}`;
        if (needle && !title.toLowerCase().includes(needle) && !body.toLowerCase().includes(needle)) continue;
        if (filters.tag && filters.tag !== "source-pdf") continue;
        results.push({
          id: `pdf:${p.id}`,
          owner_division_id: divisionId,
          title,
          body,
          kind: "source_pdf",
          tags: ["source-pdf"],
          sources: p.source_url ? [p.source_url] : [],
          visibility: "private",
          shared_with_division_ids: [],
          expires_at: null,
          created_by: null,
          created_at: p.created_at,
          updated_at: p.updated_at ?? p.created_at,
        });
      }
    } catch {
      /* silent */
    }
  }

  return results;
}

