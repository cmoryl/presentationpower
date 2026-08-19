// Corpus re-embed for imported_decks using the shared section-aware chunker.
// Mirrors the embedImportedDecks server handler exactly (same asset row,
// same (asset_id, chunk_index) upsert contract, same trailing-chunk prune).
//   bun run scripts/embed-imported-decks.ts [--force]
import { createClient } from "@supabase/supabase-js";
import { chunkDeckDocument, buildDeckDocument } from "../src/lib/imported-deck-document";
import type { ImportedSlideLite, DeckSectionLite } from "../src/lib/imported-deck-document";
import { normalizeImportedDeckDivision } from "../src/lib/imported-deck-division";

const SUPA_URL = process.env.SUPABASE_URL!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LK = process.env.LOVABLE_API_KEY!;
if (!SUPA_URL || !SR || !LK) throw new Error("missing env");
const FORCE = process.argv.includes("--force");
const EMBEDDING_MODEL = "google/gemini-embedding-001";

const sa = createClient(SUPA_URL, SR, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const h = new Headers(init?.headers);
      if (h.get("Authorization") === `Bearer ${SR}`) h.delete("Authorization");
      h.set("apikey", SR);
      return fetch(input, { ...init, headers: h });
    },
  },
});

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  // Google caps at 100 inputs per request; stay well under it.
  for (let i = 0; i < inputs.length; i += 50) {
    const batch = inputs.slice(i, i + 50);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LK}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    });
    if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = (await res.json()) as { data: Array<{ embedding: number[] }> };
    for (const d of j.data ?? []) out.push(d.embedding);
  }
  return out;
}

let q = sa
  .from("imported_decks")
  .select("id, division_id, original_filename, slides, sections, chunk_count, status")
  .eq("status", "parsed");
if (!FORCE) q = q.eq("chunk_count", 0);
const { data, error } = await q;
if (error) throw error;
const rows = (data ?? []) as Array<{
  id: string;
  division_id: string;
  original_filename: string;
  slides: ImportedSlideLite[] | null;
  sections: DeckSectionLite[] | null;
  chunk_count: number;
}>;
console.log(`Decks to embed: ${rows.length}`);

let total = 0;
for (const [idx, row] of rows.entries()) {
  const tag = `[${idx + 1}/${rows.length}] ${row.original_filename}`;
  try {
    const doc = buildDeckDocument(row.slides ?? []);
    if (doc.trim().length < 60) {
      console.log(`${tag} — SKIP empty`);
      continue;
    }
    const divisionId = normalizeImportedDeckDivision(row.division_id);

    const { data: existingAsset } = await sa
      .from("brand_assets")
      .select("id")
      .eq("metadata->>imported_deck_id", row.id)
      .maybeSingle();
    let assetId = (existingAsset as { id: string } | null)?.id ?? null;
    if (!assetId) {
      const { data: ins, error: e1 } = await sa
        .from("brand_assets")
        .insert({
          division_id: divisionId,
          kind: "pptx",
          source_type: "pptx",
          title: row.original_filename,
          description: `Imported deck · ${(row.slides ?? []).length} slides`,
          source_filename: row.original_filename,
          tags: ["imported_deck", divisionId],
          metadata: {
            source: "imported_deck",
            imported_deck_id: row.id,
            original_filename: row.original_filename,
            division_slug: row.division_id,
          },
        })
        .select("id")
        .single();
      if (e1 || !ins) throw new Error(`asset insert: ${e1?.message ?? "?"}`);
      assetId = (ins as { id: string }).id;
    }

    const chunks = chunkDeckDocument(row.slides ?? [], row.sections);
    if (!chunks.length) {
      console.log(`${tag} — SKIP no-chunks`);
      continue;
    }
    const vectors = await embedBatch(chunks);
    const chunkRows = chunks.map((content, i) => ({
      asset_id: assetId,
      division_id: divisionId,
      chunk_index: i,
      content,
      embedding: `[${vectors[i].join(",")}]`,
      source_type: "pptx",
      tags: ["imported_deck", divisionId],
      metadata: {
        source: "imported_deck",
        imported_deck_id: row.id,
        original_filename: row.original_filename,
      },
    }));
    for (let i = 0; i < chunkRows.length; i += 100) {
      const { error: e2 } = await sa
        .from("brand_asset_chunks")
        .upsert(chunkRows.slice(i, i + 100), { onConflict: "asset_id,chunk_index" });
      if (e2) throw new Error(`chunk upsert: ${e2.message}`);
    }
    await sa
      .from("brand_asset_chunks")
      .delete()
      .eq("asset_id", assetId)
      .gte("chunk_index", chunkRows.length);
    await sa
      .from("imported_decks")
      .update({ chunk_count: chunkRows.length, embedded_at: new Date().toISOString() })
      .eq("id", row.id);
    total += chunkRows.length;
    console.log(`${tag} — OK div=${divisionId} ${row.chunk_count} → ${chunkRows.length} chunks`);
  } catch (e) {
    console.log(`${tag} — FAIL ${(e as Error).message}`);
  }
}
console.log(`\nTotal chunks written: ${total}`);
