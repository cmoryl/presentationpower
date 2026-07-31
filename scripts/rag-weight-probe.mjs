// Before/after probe for source-type weighting in match_brand_chunks.
// Usage: bun scripts/rag-weight-probe.mjs
import { createClient } from "@supabase/supabase-js";

const sa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: {
    fetch: (i, init) => {
      const h = new Headers(init?.headers);
      h.set("apikey", process.env.SUPABASE_SERVICE_ROLE_KEY);
      if (h.get("Authorization") === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`)
        h.delete("Authorization");
      return fetch(i, { ...init, headers: h });
    },
  },
});

async function embed(q) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "google/gemini-embedding-001", input: q }),
  });
  const j = await r.json();
  return j.data[0].embedding;
}

const CASES = [
  { query: "DataForce data collection and annotation services", division: "bm-product" },
  { query: "life sciences clinical trial translation and regulatory submissions", division: "bm-tp-lifesci" },
];

async function probe(query, division, weights) {
  const v = await embed(query);
  const args = {
    query_embedding: `[${v.join(",")}]`,
    filter_division: division,
    match_count: 8,
  };
  if (weights) args.filter_source_weights = weights;
  const { data, error } = await sa.rpc("match_brand_chunks", args);
  if (error) {
    console.log("  ERR", error.message);
    return;
  }
  const rows = data ?? [];
  const counts = {};
  for (const r of rows) counts[r.source_type ?? "?"] = (counts[r.source_type ?? "?"] ?? 0) + 1;
  console.log(`  composition: ${JSON.stringify(counts)}`);
  rows.forEach((r, i) => {
    const w = r.weighted_similarity != null ? ` w=${Number(r.weighted_similarity).toFixed(3)}` : "";
    console.log(
      `   ${i + 1}. [${r.source_type}] sim=${Number(r.similarity).toFixed(3)}${w} ${(r.content ?? "").slice(0, 90).replace(/\s+/g, " ")}…`,
    );
  });
}

function quotaFor(k) { return k <= 2 ? 0 : Math.min(3, Math.max(1, Math.round(k * 0.25))); }

async function match(vec, division, sourceTypes, k) {
  const args = { query_embedding: `[${vec.join(",")}]`, filter_division: division, match_count: k };
  if (sourceTypes) args.filter_source_types = sourceTypes;
  const { data, error } = await sa.rpc("match_brand_chunks", args);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((r) => Number(r.similarity) >= 0.22);
}

function show(label, rows) {
  const counts = {};
  for (const r of rows) counts[r.source_type ?? "?"] = (counts[r.source_type ?? "?"] ?? 0) + 1;
  console.log(` ${label} composition: ${JSON.stringify(counts)}`);
  rows.forEach((r, i) =>
    console.log(
      `   ${i + 1}. [${r.source_type}] sim=${Number(r.similarity).toFixed(3)} ${(r.content ?? "").slice(0, 80).replace(/\s+/g, " ")}…`,
    ),
  );
}

const K = 8;
for (const c of CASES) {
  console.log(`\n=== "${c.query}" [division=${c.division}] ===`);
  const v = await embed(c.query);
  const before = await match(v, c.division, null, K);
  show("BEFORE", before);

  // quota default (as wired in knowledge-grounding.server.ts)
  const quota = quotaFor(K);
  let after = before;
  if (before.length && quota > 0 && !before.some((r) => r.source_type === "pptx")) {
    const deck = await match(v, c.division, ["pptx"], K);
    const have = 0;
    const additions = deck.slice(0, quota - have);
    const kept = before.slice(0, K);
    let room = additions.length;
    for (let i = kept.length - 1; i >= 0 && room > 0; i--) {
      if (kept[i].source_type === "pptx") continue;
      kept.splice(i, 1);
      room--;
    }
    after = [...kept, ...additions].slice(0, K);
  }
  show("AFTER ", after);
}
