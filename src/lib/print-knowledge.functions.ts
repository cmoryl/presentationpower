// Print library → knowledge sync.
//
// Turns every curated print seed (Legal e-brochures, Legal + Media case
// studies, and anything imported later) into an embedded knowledge document so
// deck/print generation and the Oracle stay current with the newest collateral.
// Idempotent: a per-seed content hash is stored on the brand asset metadata,
// so unchanged seeds are skipped on re-runs.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { printKnowledgeDocs } from "@/lib/print-library/knowledge-text";
import { chunkPrintText, embedPrintChunks } from "@/lib/print-knowledge.server";
import { mirrorOracleKnowledge } from "@/lib/oracle-mirror.server";

type SupaCtx = { supabase: unknown; userId: string };

type QueryResult = { data: unknown; error: unknown };
interface QueryBuilder extends PromiseLike<QueryResult> {
  select: (cols?: string) => QueryBuilder;
  insert: (rows: unknown) => QueryBuilder;
  update: (row: unknown) => QueryBuilder;
  delete: () => QueryBuilder;
  upsert: (rows: unknown, opts?: Record<string, unknown>) => QueryBuilder;
  eq: (col: string, val: unknown) => QueryBuilder;
  gte: (col: string, val: unknown) => QueryBuilder;
  in: (col: string, val: unknown[]) => QueryBuilder;
  maybeSingle: () => Promise<QueryResult>;
  single: () => Promise<QueryResult>;
}
type SbClient = {
  from: (t: string) => QueryBuilder;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

async function assertAdmin(ctx: SupaCtx) {
  const s = ctx.supabase as SbClient;
  const { data } = await s.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden: admin required");
}

const SOURCE_TYPE = "print";

/** What the catalog holds vs. what is embedded — drives the admin status card. */
export const printKnowledgeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const s = context.supabase as unknown as SbClient;
    const docs = printKnowledgeDocs();
    const { data } = await s
      .from("brand_assets")
      .select("id, title, metadata, storage_path")
      .eq("entity_type", "print-library");
    const rows = (data ?? []) as Array<{
      id: string;
      title: string;
      metadata: Record<string, unknown> | null;
      storage_path: string;
    }>;
    const byKey = new Map(rows.map((r) => [String(r.metadata?.["printItemId"] ?? ""), r]));
    let synced = 0;
    let stale = 0;
    for (const d of docs) {
      const row = byKey.get(d.id);
      if (!row) continue;
      if (String(row.metadata?.["contentHash"] ?? "") === d.hash) synced += 1;
      else stale += 1;
    }
    return {
      catalogCount: docs.length,
      synced,
      stale,
      missing: docs.length - synced - stale,
    };
  });

const syncInput = z.object({ force: z.boolean().default(false) });

export const syncPrintLibraryKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => syncInput.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      ingested: number;
      skipped: number;
      chunks: number;
      oracleMirrored: number;
      errors: string[];
    }> => {
      await assertAdmin(context);
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey)
        return {
          ok: false,
          ingested: 0,
          skipped: 0,
          chunks: 0,
          oracleMirrored: 0,
          errors: ["LOVABLE_API_KEY missing"],
        };

      const s = context.supabase as unknown as SbClient;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sa = supabaseAdmin as unknown as SbClient;

      const docs = printKnowledgeDocs();
      const errors: string[] = [];
      let ingested = 0;
      let skipped = 0;
      let chunkTotal = 0;
      let oracleMirrored = 0;

      const { data: existing } = await s
        .from("brand_assets")
        .select("id, metadata")
        .eq("entity_type", "print-library");
      const byKey = new Map(
        ((existing ?? []) as Array<{ id: string; metadata: Record<string, unknown> | null }>).map(
          (r) => [String(r.metadata?.["printItemId"] ?? ""), r],
        ),
      );

      for (const doc of docs) {
        try {
          const prior = byKey.get(doc.id);
          if (prior && !data.force && String(prior.metadata?.["contentHash"] ?? "") === doc.hash) {
            skipped += 1;
            continue;
          }

          const metadata = {
            printItemId: doc.id,
            contentHash: doc.hash,
            printKind: doc.kind,
            collection: doc.collection,
            syncedAt: new Date().toISOString(),
          };

          let assetId = prior?.id;
          if (assetId) {
            await sa
              .from("brand_assets")
              .update({
                title: doc.title,
                description: `Curated print asset (${doc.kind}) · ${doc.collection}`,
                division_id: doc.divisionId,
                tags: doc.tags,
                metadata,
                extracted_text: doc.text.slice(0, 200_000),
              })
              .eq("id", assetId);
          } else {
            const { data: row, error } = await sa
              .from("brand_assets")
              .insert({
                division_id: doc.divisionId,
                entity_type: "print-library",
                kind: "brochure",
                title: doc.title,
                description: `Curated print asset (${doc.kind}) · ${doc.collection}`,
                source_filename: doc.sourceFile,
                storage_path: `print-library/${doc.id}`,
                tags: doc.tags,
                metadata,
                extracted_text: doc.text.slice(0, 200_000),
                created_by: context.userId,
              })
              .select("id")
              .single();
            if (error) throw new Error(String((error as { message?: string }).message ?? error));
            assetId = (row as { id: string }).id;
          }

          const chunks = chunkPrintText(doc.text);
          const vectors = await embedPrintChunks(apiKey, chunks);
          const rows = chunks.map((content, i) => ({
            asset_id: assetId,
            division_id: doc.divisionId,
            chunk_index: i,
            content,
            embedding: `[${vectors[i]?.join(",") ?? ""}]`,
            source_type: SOURCE_TYPE,
            tags: doc.tags,
          }));
          for (let i = 0; i < rows.length; i += 100) {
            const { error } = await sa
              .from("brand_asset_chunks")
              .upsert(rows.slice(i, i + 100), { onConflict: "asset_id,chunk_index" });
            if (error) throw new Error(String((error as { message?: string }).message ?? error));
          }
          await sa
            .from("brand_asset_chunks")
            .delete()
            .eq("asset_id", assetId)
            .gte("chunk_index", rows.length);

          // Mirror a digest into the Oracle knowledge base so the keyword pass
          // sees this collateral, not just the vector pass.
          const mirror = await mirrorOracleKnowledge(
            sa,
            [
              {
                mirrorKey: `print:${doc.id}`,
                title: doc.title,
                text: doc.text,
                divisionId: doc.divisionId,
                sourceType: SOURCE_TYPE,
                assetId,
                tags: doc.tags,
              },
            ],
            context.userId,
          );
          if (mirror.errors.length) errors.push(...mirror.errors);
          oracleMirrored += mirror.inserted + mirror.updated;

          ingested += 1;
          chunkTotal += rows.length;
        } catch (e) {
          errors.push(`${doc.title}: ${(e as Error).message}`);
        }
      }

      return {
        ok: errors.length === 0,
        ingested,
        skipped,
        chunks: chunkTotal,
        oracleMirrored,
        errors,
      };
    },
  );
