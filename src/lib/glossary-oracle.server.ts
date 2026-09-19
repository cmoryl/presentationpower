/**
 * Translation glossary → Oracle mirror mapping.
 *
 * Glossary terms live in `glossary_terms` with their own lookup. Grounding
 * reads them live, but the Oracle store (and the Oracle brain panel that reads
 * only `oracle_knowledge_base`) never saw them, so "is GlobalLink ever
 * translated?" had no source in the store even though the rule was recorded.
 *
 * A single term is far too short to survive the Oracle digest floor, so terms
 * are batched into scope-keyed sheets. Keys are stable (`scope` + batch index)
 * so a re-sync updates rather than duplicates.
 */

import type { OracleMirrorDoc } from "@/lib/oracle-mirror.server";

export type GlossaryOracleRow = {
  term: string;
  scope: string;
  scopeId: string | null;
  doNotTranslate: boolean;
  notes: string | null;
  translations: Record<string, unknown> | null;
};

const TERMS_PER_DOC = 40;

function line(r: GlossaryOracleRow): string {
  const parts = [r.term];
  if (r.doNotTranslate) parts.push("— never translate; keep as written");
  const langs = Object.entries(r.translations ?? {})
    .filter(([, v]) => typeof v === "string" && (v as string).trim() !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);
  if (langs.length) parts.push(`(${langs.join("; ")})`);
  if (r.notes?.trim()) parts.push(`— ${r.notes.trim()}`);
  return parts.join(" ");
}

export function glossaryOracleDocs(rows: GlossaryOracleRow[]): OracleMirrorDoc[] {
  const byScope = new Map<string, GlossaryOracleRow[]>();
  for (const r of rows) {
    if (!r.term?.trim()) continue;
    const key = r.scopeId ? `${r.scope}:${r.scopeId}` : r.scope;
    const list = byScope.get(key) ?? [];
    list.push(r);
    byScope.set(key, list);
  }

  const docs: OracleMirrorDoc[] = [];
  for (const [scopeKey, list] of byScope) {
    const sorted = [...list].sort((a, b) => a.term.localeCompare(b.term));
    for (let i = 0; i < sorted.length; i += TERMS_PER_DOC) {
      const batch = sorted.slice(i, i + TERMS_PER_DOC);
      const part = Math.floor(i / TERMS_PER_DOC) + 1;
      const total = Math.ceil(sorted.length / TERMS_PER_DOC);
      docs.push({
        mirrorKey: `glossary:${scopeKey}:${part}`,
        title:
          total > 1
            ? `Translation glossary — ${scopeKey} (${part}/${total})`
            : `Translation glossary — ${scopeKey}`,
        text: [
          `Approved translation glossary for scope ${scopeKey}.`,
          "Terms marked never translate must appear exactly as written in every language.",
          ...batch.map((r) => `• ${line(r)}`),
        ].join("\n"),
        divisionId: null,
        sourceType: "glossary",
        tags: [
          "glossary",
          `scope:${scopeKey}`,
          ...(batch.some((r) => r.doNotTranslate) ? ["do-not-translate"] : []),
        ],
      });
    }
  }
  return docs;
}

/**
 * Continuous learning: after any glossary edit, rebuild that scope's Oracle
 * sheets from the live rows so the store never drifts behind the glossary.
 * Returns the outcome instead of throwing — a save must not fail because the
 * mirror did, but the caller reports the failure rather than hiding it.
 */
export async function mirrorGlossaryScope(
  supabase: unknown,
  scope: string,
  scopeId: string | null,
  userId?: string | null,
): Promise<{ synced: boolean; error?: string }> {
  type QB = PromiseLike<{ data: unknown; error: unknown }> & {
    select: (cols?: string) => QB;
    eq: (col: string, val: unknown) => QB;
    is: (col: string, val: unknown) => QB;
    limit: (n: number) => QB;
  };
  const sb = supabase as { from: (t: string) => QB };
  try {
    let q = sb
      .from("glossary_terms")
      .select("term, scope, scope_id, do_not_translate, notes, translations")
      .eq("scope", scope);
    q = scopeId ? q.eq("scope_id", scopeId) : q.is("scope_id", null);
    const { data, error } = await q.limit(2000);
    if (error) throw new Error(String((error as { message?: string }).message ?? error));
    const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      term: String(r["term"] ?? ""),
      scope: String(r["scope"] ?? "global"),
      scopeId: (r["scope_id"] as string | null) ?? null,
      doNotTranslate: Boolean(r["do_not_translate"]),
      notes: (r["notes"] as string | null) ?? null,
      translations: (r["translations"] ?? {}) as Record<string, unknown>,
    }));
    if (rows.length === 0) return { synced: true };
    const { mirrorOracleKnowledge } = await import("@/lib/oracle-mirror.server");
    const res = await mirrorOracleKnowledge(supabase, glossaryOracleDocs(rows), userId ?? null);
    if (res.errors.length) return { synced: false, error: res.errors.join("; ") };
    return { synced: true };
  } catch (e) {
    return { synced: false, error: (e as Error).message };
  }
}
