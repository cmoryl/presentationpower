// Server-only helpers for print-library knowledge ingestion: chunking +
// embedding via the Lovable AI gateway (same model as the rest of the corpus).

import { EMBEDDING_MODEL } from "@/lib/knowledge-scope";

export function chunkPrintText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (clean.length <= size) return [clean];
  const chunks: string[] = [];
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

export async function embedPrintChunks(apiKey: string, inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const batchSize = 50;
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Embedding gateway ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    for (const d of json.data ?? []) out.push(d.embedding);
  }
  return out;
}
