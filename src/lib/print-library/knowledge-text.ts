/**
 * Print library → knowledge text.
 *
 * The curated print seeds (Legal e-brochures, Legal + Media case studies) live
 * in code, so their copy never reached the RAG corpus. This module flattens
 * every curated catalog entry into a plain-text document that can be chunked,
 * embedded and stored in `brand_asset_chunks` alongside PDF/PPTX knowledge, so
 * deck + print generation stays current with the newest imported collateral.
 */

import { PRINT_LIBRARY_ITEMS, type PrintLibraryItem } from "@/lib/print-library/catalog";

export type PrintKnowledgeDoc = {
  /** Stable catalog id — used as the brand asset provenance key. */
  id: string;
  title: string;
  divisionId: string | null;
  kind: string;
  collection: string;
  tags: string[];
  sourceFile: string;
  text: string;
  /** Cheap change signal so re-syncs skip untouched seeds. */
  hash: string;
};

const SKIP_KEYS = new Set([
  "imageUrl",
  "assetUrl",
  "url",
  "href",
  "logoUrl",
  "focalX",
  "focalY",
  "id",
  "slug",
  "variant",
  "layout",
  "tone",
  "color",
  "colour",
  "accent",
]);

/** Depth-first walk that keeps human-readable strings in document order. */
function collectStrings(node: unknown, out: string[], depth = 0): void {
  if (depth > 8 || node == null) return;
  if (typeof node === "string") {
    const t = node.trim();
    if (t.length > 1 && !/^(https?:|data:|#[0-9a-f]{3,8}$)/i.test(t)) out.push(t);
    return;
  }
  if (typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) collectStrings(v, out, depth + 1);
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (SKIP_KEYS.has(k)) continue;
      collectStrings(v, out, depth + 1);
    }
  }
}

function hashOf(s: string): string {
  // FNV-1a — enough to detect edited seeds.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function printItemToKnowledgeDoc(item: PrintLibraryItem): PrintKnowledgeDoc | null {
  if (item.source !== "curated" || !item.content) return null;
  const body: string[] = [];
  collectStrings(item.content, body);
  const stats = (item.stats ?? []).map(
    (s) => `${s.label}: ${s.value}${s.unit ? ` ${s.unit}` : ""}`,
  );
  const lines = [
    `# ${item.title}`,
    `Print type: ${item.kind}`,
    `Collection: ${item.collection ?? "General"}`,
    item.tags?.length ? `Tags: ${item.tags.join(", ")}` : "",
    item.blurb ? `\n${item.blurb}` : "",
    stats.length ? `\nKey numbers:\n${stats.map((s) => `- ${s}`).join("\n")}` : "",
    "",
    dedupe(body).join("\n\n"),
  ].filter(Boolean);
  const text = lines.join("\n").trim();
  if (text.length < 120) return null;
  return {
    id: item.id,
    title: item.title,
    divisionId: item.divisionId,
    kind: item.kind,
    collection: item.collection ?? "General",
    tags: ["print-library", item.kind, ...(item.tags ?? [])],
    sourceFile: item.sourceFile ?? `${item.id}.print`,
    text,
    hash: hashOf(text),
  };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/** Every curated print asset as a knowledge document. */
export function printKnowledgeDocs(): PrintKnowledgeDoc[] {
  return PRINT_LIBRARY_ITEMS.map(printItemToKnowledgeDoc).filter(
    (d): d is PrintKnowledgeDoc => d !== null,
  );
}
