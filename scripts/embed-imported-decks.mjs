// One-shot server-side embedding runner for imported_decks.
// Mirrors embedImportedDecks handler exactly.
// Idempotent (skips chunk_count > 0 unless --force). Run manually:
//   node scripts/embed-imported-decks.mjs
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LK = process.env.LOVABLE_API_KEY;
if (!SUPA_URL || !SR || !LK) throw new Error("missing env");
const FORCE = process.argv.includes("--force");
const VERIFY = process.argv.includes("--verify");

const sa = createClient(SUPA_URL, SR, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if ((SR.startsWith("sb_publishable_") || SR.startsWith("sb_secret_")) && h.get("Authorization") === `Bearer ${SR}`) {
        h.delete("Authorization");
      }
      h.set("apikey", SR);
      return fetch(input, { ...init, headers: h });
    },
  },
});

// Must match IMPORTED_DECK_SLUG_TO_DIVISION in src/lib/imported-decks.functions.ts.
// The old prefix-strip produced ids ("master", "life-sciences") that no
// division-filtered query could ever match.
const SLUG_TO_DIVISION = {
  "transperfect-master": "bm-enterprise",
  globallink: "bm-division",
  "transperfect-life-sciences": "bm-tp-lifesci",
  "transperfect-legal": "bm-tp-legal",
  "transperfect-media": "bm-tp-media",
  "transperfect-gaming": "bm-tp-games",
  "transperfect-digital": "bm-tp-digital",
  dataforce: "bm-product",
  "transperfect-cobrand": "bm-cobrand",
  "trial-interactive": "bm-trial-interactive",
};
function normalizeDivision(v) { return SLUG_TO_DIVISION[v] ?? v; }

function chunkText(text, size = 1200, overlap = 200) {
  const clean = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (clean.length <= size) return clean.length > 40 ? [clean] : [];
  const chunks = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + size);
    let cut = end;
    if (end < clean.length) {
      const p = clean.lastIndexOf("\n\n", end);
      if (p > i + size / 2) cut = p;
    }
    chunks.push(clean.slice(i, cut).trim());
    if (cut >= clean.length) break;
    i = Math.max(cut - overlap, i + 1);
  }
  return chunks.filter((c) => c.length > 40);
}

async function embedBatch(inputs) {
  const out = [];
  for (let i = 0; i < inputs.length; i += 50) {
    const batch = inputs.slice(i, i + 50);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LK}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: batch }),
    });
    if (!res.ok) throw new Error(`embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const j = await res.json();
    for (const d of j.data ?? []) out.push(d.embedding);
  }
  return out;
}

function buildDoc(slides) {
  return (slides ?? []).map((s) => {
    const t = (s.title || "(untitled)").trim();
    const bl = (s.bullets ?? []).filter(Boolean).map((b) => `• ${b.trim()}`).join("\n");
    const n = (s.notes || "").trim();
    let block = `Slide ${s.index + 1}: ${t}`;
    if (bl) block += `\n${bl}`;
    if (n) block += `\nNotes: ${n}`;
    return block;
  }).join("\n\n");
}

// ── EMBED PASS ──────────────────────────────────────────────────────────
let q = sa.from("imported_decks")
  .select("id, division_id, original_filename, slides, chunk_count, status")
  .eq("status", "parsed");
if (!FORCE) q = q.eq("chunk_count", 0);
const { data: rows, error } = await q;
if (error) throw error;
console.log(`Pending imported decks: ${rows.length}`);

for (const [idx, row] of rows.entries()) {
  const tag = `[${idx + 1}/${rows.length}] ${row.original_filename}`;
  try {
    const doc = buildDoc(row.slides);
    if (doc.trim().length < 60) { console.log(`${tag} — SKIP empty`); continue; }
    const divisionId = normalizeDivision(row.division_id);
    console.log(`${tag} — div=${divisionId} doc=${doc.length}ch`);

    const { data: existingAsset } = await sa
      .from("brand_assets").select("id")
      .eq("metadata->>imported_deck_id", row.id).maybeSingle();
    let assetId = existingAsset?.id ?? null;
    if (!assetId) {
      const { data: ins, error: e1 } = await sa.from("brand_assets").insert({
        division_id: divisionId,
        kind: "pptx",
        title: row.original_filename,
        description: `Imported deck · ${(row.slides ?? []).length} slides`,
        source_filename: row.original_filename,
        tags: ["imported_deck", divisionId],
        source_type: "pptx",
        metadata: { source: "imported_deck", imported_deck_id: row.id, original_filename: row.original_filename, division_slug: row.division_id },
      }).select("id").single();
      if (e1 || !ins) throw new Error(`asset insert: ${e1?.message ?? "?"}`);
      assetId = ins.id;
    }

    const chunks = chunkText(doc);
    if (!chunks.length) { console.log(`${tag} — SKIP no-chunks`); continue; }
    const vectors = await embedBatch(chunks);
    const chunkRows = chunks.map((content, i) => ({
      asset_id: assetId, division_id: divisionId, chunk_index: i, content,
      embedding: `[${vectors[i].join(",")}]`,
      source_type: "pptx",
      tags: ["imported_deck", divisionId],
      metadata: { source: "imported_deck", imported_deck_id: row.id, original_filename: row.original_filename },
    }));
    const { error: e2 } = await sa
      .from("brand_asset_chunks")
      .upsert(chunkRows, { onConflict: "asset_id,chunk_index" });
    if (e2) throw new Error(`chunk upsert: ${e2.message}`);
    await sa.from("brand_asset_chunks").delete().eq("asset_id", assetId).gte("chunk_index", chunkRows.length);
    await sa.from("imported_decks").update({ chunk_count: chunkRows.length, embedded_at: new Date().toISOString() }).eq("id", row.id);
    console.log(`${tag} — OK ${chunkRows.length} chunks`);
  } catch (e) {
    console.log(`${tag} — FAIL ${e.message}`);
  }
}

// ── UNIFIED RETRIEVAL PROOF ────────────────────────────────────────────
if (VERIFY || !rows.length || rows.length) {
  console.log("\n═══ UNIFIED RETRIEVAL PROOF (life-sciences) ═══");
  const query = "clinical trial regulatory compliance and commercial launch localization";
  const eRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${LK}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-embedding-001", input: query }),
  });
  const eJson = await eRes.json();
  const qv = eJson.data[0].embedding;
  const { data: matches, error: mErr } = await sa.rpc("match_brand_chunks", {
    query_embedding: `[${qv.join(",")}]`,
    match_count: 8,
    filter_division: "life-sciences",
  });
  if (mErr) { console.log("match_brand_chunks error:", mErr.message); process.exit(1); }
  console.log(`Query: "${query}"\nTop ${matches.length} results under division=life-sciences:\n`);
  for (const m of matches) {
    // pull tags for source identification
    const { data: chunkRow } = await sa.from("brand_asset_chunks").select("tags, metadata").eq("id", m.id).single();
    const src = m.source_type ?? (chunkRow?.tags?.includes("imported_deck") ? "pptx" : chunkRow?.tags?.includes("pdf_extraction") ? "pdf" : "other");
    const title = chunkRow?.metadata?.title || chunkRow?.metadata?.original_filename || "?";
    console.log(`  [${src}] sim=${m.similarity.toFixed(3)} · ${title}`);
    console.log(`    → ${m.content.slice(0, 120).replace(/\n/g, " ")}…`);
  }
  const sources = new Set();
  for (const m of matches) {
    const { data: cr } = await sa.from("brand_asset_chunks").select("tags").eq("id", m.id).single();
    if (cr?.tags?.includes("imported_deck")) sources.add("imported_deck");
    if (cr?.tags?.includes("pdf_extraction")) sources.add("pdf_extraction");
  }
  console.log(`\nDistinct sources returned: ${[...sources].join(", ") || "(none)"}`);
  console.log(sources.has("imported_deck") && sources.has("pdf_extraction")
    ? "✅ UNIFIED: PDF + PPTX co-retrieved under the same division_id."
    : "⚠️ NOT UNIFIED — only one source represented.");
}
