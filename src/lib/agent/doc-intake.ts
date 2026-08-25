// Shared contract for documents users attach to an agent thread.
// Files are converted to plain text (client-side for text formats, server-side
// for Word/PDF) and then prepended to the next chat turn as reference context.

export type AgentDocument = {
  id: string;
  name: string;
  /** Extracted plain text (already truncated to PER_DOC_CHARS). */
  text: string;
  chars: number;
  /** True when the original was longer than what we kept. */
  truncated: boolean;
};

export const PER_DOC_CHARS = 24_000;
export const TOTAL_DOC_CHARS = 60_000;
export const MAX_DOCS = 5;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

const TEXT_EXT = [
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "html",
  "htm",
  "xml",
  "rtf",
  "vtt",
  "srt",
];
const DOC_EXT = ["docx", "pdf", "doc", "pptx", "xlsx"];

export function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function isPlainTextDoc(name: string, mime?: string): boolean {
  if (mime && /^text\//i.test(mime)) return true;
  return TEXT_EXT.includes(extOf(name));
}

export function isSupportedDoc(name: string, mime?: string): boolean {
  return isPlainTextDoc(name, mime) || DOC_EXT.includes(extOf(name));
}

export const DOC_ACCEPT =
  ".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.rtf,.vtt,.srt,.docx,.pdf,.pptx,.xlsx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function clampDocText(raw: string): { text: string; truncated: boolean } {
  const clean = raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  if (clean.length <= PER_DOC_CHARS) return { text: clean, truncated: false };
  return { text: clean.slice(0, PER_DOC_CHARS), truncated: true };
}

/**
 * Builds the reference block that travels with the user's message so the agent
 * can interpret the uploaded source material.
 */
export function buildDocumentContext(docs: AgentDocument[]): string {
  if (!docs.length) return "";
  let budget = TOTAL_DOC_CHARS;
  const blocks: string[] = [];
  for (const doc of docs) {
    if (budget <= 0) break;
    const slice = doc.text.slice(0, budget);
    budget -= slice.length;
    const note = doc.truncated || slice.length < doc.text.length ? " (excerpt)" : "";
    blocks.push(`--- DOCUMENT: ${doc.name}${note} ---\n${slice}`);
  }
  return [
    "REFERENCE DOCUMENTS the user attached. Use them as the source of truth for facts, names, numbers and scope. Do not invent details that contradict them.",
    ...blocks,
    "--- END DOCUMENTS ---",
  ].join("\n\n");
}

/** Combines the attached documents with the typed message. */
export function withDocumentContext(text: string, docs: AgentDocument[]): string {
  const ctx = buildDocumentContext(docs);
  return ctx ? `${ctx}\n\n${text}` : text;
}
