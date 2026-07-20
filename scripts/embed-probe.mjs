import { createClient } from "@supabase/supabase-js";
const sa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  global: { fetch: (i, init) => { const h = new Headers(init?.headers); h.set("apikey", process.env.SUPABASE_SERVICE_ROLE_KEY); if (h.get("Authorization")===`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) h.delete("Authorization"); return fetch(i,{...init,headers:h}); } },
});

async function embed(q) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-embedding-001", input: q }),
  });
  const j = await r.json();
  return j.data[0].embedding;
}

async function probe(query, division) {
  const v = await embed(query);
  const { data, error } = await sa.rpc("match_brand_chunks", {
    query_embedding: `[${v.join(",")}]`,
    filter_division: division,
    match_threshold: 0.3,
    match_count: 5,
  });
  console.log(`\n▸ "${query}" [division=${division}]`);
  if (error) { console.log("ERR", error.message); return; }
  for (const row of data ?? []) {
    console.log(`  sim=${row.similarity.toFixed(3)}  ${(row.content ?? "").slice(0, 140).replace(/\s+/g," ")}…`);
  }
}

await probe("clinical trial localization", "life-sciences");
await probe("pharmacovigilance automation", "life-sciences");
await probe("Forrester total economic impact GlobalLink", "globallink");
