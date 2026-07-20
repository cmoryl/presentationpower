// One-shot server-side embedding runner. Mirrors embedPdfExtractions handler
// exactly (chunkText 1200/200, google/gemini-embedding-001, brand_assets
// companion row with metadata.pdf_extraction_id, brand_asset_chunks insert,
// pdf_extractions.chunk_count/embedded_at update). Idempotent.
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LK = process.env.LOVABLE_API_KEY;
if (!SUPA_URL || !SR || !LK) throw new Error("missing env");

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

const PDF_ENTITY_TO_DIVISION = {
  transperfect: "master",
  games: "gaming",
  legal: "legal",
  "life-sciences": "life-sciences",
  media: "media",
  dataforce: "dataforce",
  globallink: "globallink",
};

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
  const bs = 50;
  for (let i = 0; i < inputs.length; i += bs) {
    const batch = inputs.slice(i, i + bs);
    let attempt = 0;
    while (true) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${LK}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-embedding-001", input: batch }),
      });
      if (res.ok) {
        const j = await res.json();
        for (const d of j.data ?? []) out.push(d.embedding);
        break;
      }
      const body = await res.text().catch(() => "");
      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const wait = 2000 * Math.pow(2, attempt);
        console.log(`  ⏳ ${res.status} — backing off ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        attempt++;
        continue;
      }
      throw new Error(`embed ${res.status}: ${body.slice(0, 200)}`);
    }
  }
  return out;
}

// Fetch pending — process all 170
const { data: rows, error: qErr } = await sa
  .from("pdf_extractions")
  .select("id, entity_slug, entity_name, entity_type, title, source_url, extracted_text, char_count, chunk_count")
  .eq("status", "ok")
  .eq("chunk_count", 0)
  .order("char_count", { ascending: true });
if (qErr) throw qErr;

console.log(`Pending: ${rows.length} docs`);

let embedded = 0, skipped = 0, failed = 0, totalChunks = 0;
const failures = [];

for (const [idx, row] of rows.entries()) {
  const tag = `[${idx + 1}/${rows.length}] ${row.entity_slug} · ${row.title.slice(0, 60)}`;
  try {
    if (!row.extracted_text || row.extracted_text.trim().length < 60) {
      console.log(`${tag} — SKIP empty`);
      skipped++;
      continue;
    }
    const divisionId = PDF_ENTITY_TO_DIVISION[row.entity_slug] ?? null;

    const { data: existingAsset } = await sa
      .from("brand_assets")
      .select("id")
      .eq("metadata->>pdf_extraction_id", row.id)
      .maybeSingle();
    let assetId = existingAsset?.id ?? null;
    if (!assetId) {
      const { data: ins, error: insErr } = await sa
        .from("brand_assets")
        .insert({
          division_id: divisionId,
          entity_type: row.entity_type,
          kind: "pdf",
          title: row.title,
          description: row.entity_name ? `Source PDF · ${row.entity_name}` : null,
          url: row.source_url,
          source_filename: row.title,
          tags: [row.entity_slug, "pdf_extraction"],
          metadata: {
            source: "pdf_extraction",
            pdf_extraction_id: row.id,
            source_url: row.source_url,
            entity_slug: row.entity_slug,
          },
        })
        .select("id")
        .single();
      if (insErr || !ins) throw new Error(`asset insert: ${insErr?.message ?? "?"}`);
      assetId = ins.id;
    } else {
      await sa.from("brand_asset_chunks").delete().eq("asset_id", assetId);
    }

    const chunks = chunkText(row.extracted_text);
    if (chunks.length === 0) {
      console.log(`${tag} — SKIP no-chunks`);
      skipped++;
      continue;
    }
    const vectors = await embedBatch(chunks);
    const chunkRows = chunks.map((content, i) => ({
      asset_id: assetId,
      division_id: divisionId,
      chunk_index: i,
      content,
      embedding: `[${vectors[i].join(",")}]`,
      tags: [row.entity_slug, "pdf_extraction"],
      metadata: {
        source: "pdf_extraction",
        pdf_extraction_id: row.id,
        source_url: row.source_url,
        title: row.title,
      },
    }));
    for (let i = 0; i < chunkRows.length; i += 100) {
      const slice = chunkRows.slice(i, i + 100);
      const { error } = await sa.from("brand_asset_chunks").insert(slice);
      if (error) throw new Error(`chunk insert: ${error.message}`);
    }
    await sa
      .from("pdf_extractions")
      .update({ chunk_count: chunkRows.length, embedded_at: new Date().toISOString() })
      .eq("id", row.id);

    embedded++;
    totalChunks += chunkRows.length;
    console.log(`${tag} — OK ${chunkRows.length} chunks`);
  } catch (e) {
    failed++;
    failures.push({ id: row.id, entity: row.entity_slug, title: row.title, err: e.message });
    console.log(`${tag} — FAIL ${e.message.slice(0, 160)}`);
  }
}

console.log(`\n═══ DONE ═══`);
console.log(`Embedded: ${embedded} · Skipped: ${skipped} · Failed: ${failed} · Total chunks: ${totalChunks}`);
if (failures.length) {
  console.log(`\nFailures:`);
  for (const f of failures) console.log(`  - [${f.entity}] ${f.title}: ${f.err.slice(0, 200)}`);
}
