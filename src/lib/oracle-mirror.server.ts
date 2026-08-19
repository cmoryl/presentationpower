/**
 * Oracle mirror.
 *
 * Division PDFs (pdf_extractions → brand_assets) and curated print collateral
 * are embedded into `brand_asset_chunks` for vector retrieval, but the Oracle's
 * keyword pass reads `oracle_knowledge_base`. Without a mirror, uploaded
 * documents were only reachable through the vector path — so an Oracle question
 * phrased with exact document wording could miss its own source.
 *
 * This writes one compact digest row per document, keyed by
 * `metadata.mirrorKey`, so re-syncs update rather than duplicate. `category`
 * carries the division id and `tags` carry `division:<id>` so grounding can
 * scope Oracle rows the same way it scopes chunks (a global doc has a null
 * division and stays visible to every brand).
 */

type QueryResult = { data: unknown; error: unknown };
interface QB extends PromiseLike<QueryResult> {
  select: (cols?: string) => QB;
  insert: (rows: unknown) => QB;
  update: (row: unknown) => QB;
  eq: (col: string, val: unknown) => QB;
  in: (col: string, val: unknown[]) => QB;
  limit: (n: number) => QB;
  maybeSingle: () => Promise<QueryResult>;
}
type Sb = { from: (t: string) => QB };

export type OracleMirrorDoc = {
  /** Stable key for this document across re-syncs. */
  mirrorKey: string;
  title: string;
  text: string;
  divisionId: string | null;
  /** "pdf" | "print" | ... — recorded on the mirrored row. */
  sourceType: string;
  /** Companion brand_assets row id, when one exists. */
  assetId?: string | null;
  tags?: string[];
};

/** Oracle rows are a digest, not the full document — chunks carry the detail. */
const MAX_DIGEST_CHARS = 6000;

function digest(text: string): string {
  const clean = text.replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= MAX_DIGEST_CHARS) return clean;
  return `${clean.slice(0, MAX_DIGEST_CHARS).trimEnd()}…`;
}

export async function mirrorOracleKnowledge(
  sb: unknown,
  docs: OracleMirrorDoc[],
  createdBy?: string | null,
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const s = sb as Sb;
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;

  for (const doc of docs) {
    const content = digest(doc.text);
    if (content.length < 120) continue;
    const tags = Array.from(
      new Set([
        ...(doc.tags ?? []),
        `source:${doc.sourceType}`,
        ...(doc.divisionId ? [`division:${doc.divisionId}`] : []),
      ]),
    );
    const payload = {
      title: doc.title,
      content,
      content_type: "text",
      source_type: doc.sourceType,
      source_entity_id: doc.assetId ?? null,
      source_entity_type: "brand_asset",
      category: doc.divisionId,
      tags,
      is_active: true,
      metadata: { mirrorKey: doc.mirrorKey, mirroredAt: new Date().toISOString() },
    };
    try {
      const { data: prior } = await s
        .from("oracle_knowledge_base")
        .select("id")
        .eq("metadata->>mirrorKey", doc.mirrorKey)
        .maybeSingle();
      const priorId = (prior as { id: string } | null)?.id ?? null;
      if (priorId) {
        const { error } = await s.from("oracle_knowledge_base").update(payload).eq("id", priorId);
        if (error) throw new Error(String((error as { message?: string }).message ?? error));
        updated += 1;
      } else {
        const { error } = await s
          .from("oracle_knowledge_base")
          .insert({ ...payload, created_by: createdBy ?? null });
        if (error) throw new Error(String((error as { message?: string }).message ?? error));
        inserted += 1;
      }
    } catch (e) {
      errors.push(`${doc.title}: ${(e as Error).message}`);
    }
  }

  return { inserted, updated, errors };
}
