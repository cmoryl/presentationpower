// Server-side text extraction for documents attached to an agent thread.
// Word (.docx) / PowerPoint / Excel are unzipped and stripped of OOXML markup;
// PDFs (and legacy .doc) go through Lovable AI for text extraction.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { extractOfficeText } from "@/lib/agent/doc-intake.server";

const Input = z.object({
  filename: z.string().min(1).max(300),
  mime: z.string().max(200).optional(),
  /** Raw base64 (no data: prefix). */
  base64: z.string().min(4),
});

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function extractViaAi(
  apiKey: string,
  base64: string,
  filename: string,
  mime: string,
): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL readable text from this document as lightweight Markdown. Keep the structure: headings become # / ## lines (matching their level), bulleted or numbered items become - list items indented by nesting level, and tables become Markdown pipe tables with a header separator row. Keep the original reading order, preserve paragraph breaks with blank lines, and label slides as '## Slide N: title' when the file is a presentation. Do not summarize. Do not add commentary. Output the extracted content only.",
            },
            { type: "file", file: { filename, file_data: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 402 || res.status === 403) {
      throw new Error("Document reading is unavailable right now (AI credits or policy limit).");
    }
    throw new Error(`Could not read that document (${res.status}). ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

/** Extracts plain text from an uploaded Word/PDF/Office document. */
export const extractAgentDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const ext = extOf(data.filename);
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    if (ext === "docx" || ext === "pptx" || ext === "xlsx") {
      const text = await extractOfficeText(bytes, ext);
      if (text.trim()) return { text };
      // Fall through to AI when the zip yielded nothing useful.
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Document reading is not configured on this workspace.");
    const mime =
      data.mime && data.mime !== "application/octet-stream"
        ? data.mime
        : ext === "pdf"
          ? "application/pdf"
          : "application/octet-stream";
    const text = await extractViaAi(apiKey, data.base64, data.filename, mime);
    if (!text.trim()) throw new Error("No readable text found in that document.");
    return { text };
  });
