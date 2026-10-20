// Server-side reading of artwork files uploaded to the cross-format adapter.
// Office files are unzipped and stripped of OOXML markup; PDFs and
// PDF-compatible Illustrator files go through Lovable AI for text extraction.
// A second AI pass structures the extracted text into the adapter's neutral
// payload — using only words that appear in the file, never invented copy.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { extractOfficeText } from "@/lib/agent/doc-intake.server";
import { AI_MODELS } from "@/lib/ai-models";

const Input = z.object({
  filename: z.string().min(1).max(300),
  mime: z.string().max(200).optional(),
  /** Raw base64 (no data: prefix). */
  base64: z.string().min(4).max(28_000_000),
});

const Structured = z.object({
  eyebrow: z.string().optional(),
  headline: z.string(),
  body: z.string().optional(),
  points: z.array(z.string()).max(10).optional(),
  stat: z.object({ value: z.string(), label: z.string() }).optional(),
  cta: z.string().optional(),
  footnote: z.string().optional(),
});

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function extractViaAi(apiKey: string, base64: string, filename: string, mime: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODELS.quick,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL readable text from this artwork document in reading order. Keep the largest or most prominent line first, then supporting lines, then small print (sources, URLs, legal lines). Do not summarize. Do not add commentary. Output the extracted text only.",
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
      throw new Error("File reading is unavailable right now (AI credits or policy limit).");
    }
    throw new Error(`Could not read that file (${res.status}). ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

/** Structure extracted text into the adapter payload via strict JSON. */
async function structureViaAi(apiKey: string, text: string): Promise<z.infer<typeof Structured>> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: AI_MODELS.quick,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "adapt_content",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["headline", "eyebrow", "body", "points", "stat", "cta", "footnote"],
            properties: {
              eyebrow: { type: "string", description: "Short overline/kicker, or empty" },
              headline: { type: "string", description: "The single most prominent line" },
              body: { type: "string", description: "The main supporting paragraph, or empty" },
              points: { type: "array", items: { type: "string" }, description: "Up to 8 supporting lines or bullets" },
              stat: {
                type: "object",
                additionalProperties: false,
                required: ["value", "label"],
                properties: {
                  value: { type: "string", description: "A figure exactly as printed, e.g. '38%'" },
                  label: { type: "string", description: "What the figure means" },
                },
                description: "The most prominent number, if one is printed",
              },
              cta: { type: "string", description: "Call to action or URL, or empty" },
              footnote: { type: "string", description: "Source / legal small print, or empty" },
            },
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `Structure this extracted artwork text into JSON fields for a content adapter. Use ONLY words and figures that appear in the text — never invent, complete or correct anything. If a field has no source text, use an empty string or empty array; omit stat entirely when no number is printed.\n\n--- EXTRACTED TEXT ---\n${text.slice(0, 24_000)}\n--- END ---`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 402 || res.status === 403) {
      throw new Error("File reading is unavailable right now (AI credits or policy limit).");
    }
    throw new Error(`Could not structure that file (${res.status}). ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const parsed = Structured.safeParse(JSON.parse(raw));
  if (!parsed.success || !parsed.data.headline.trim()) {
    throw new Error("No readable headline found in that file.");
  }
  const d = parsed.data;
  return {
    ...d,
    eyebrow: d.eyebrow?.trim() || undefined,
    body: d.body?.trim() || undefined,
    points: d.points?.map((p) => p.trim()).filter(Boolean),
    stat: d.stat?.value.trim() ? d.stat : undefined,
    cta: d.cta?.trim() || undefined,
    footnote: d.footnote?.trim() || undefined,
  };
}

/** Reads an uploaded .ai / .pdf / .pptx / .docx / .xlsx into the adapter payload. */
export const structureConvertUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const ext = extOf(data.filename);
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));

    let text = "";
    if (ext === "docx" || ext === "pptx" || ext === "xlsx") {
      text = await extractOfficeText(bytes, ext);
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!text.trim()) {
      if (!apiKey) throw new Error("File reading is not configured on this workspace.");
      const mime =
        data.mime && data.mime !== "application/octet-stream"
          ? data.mime
          : "application/pdf";
      text = await extractViaAi(apiKey, data.base64, data.filename, mime);
    }
    if (!text.trim()) {
      throw new Error(
        ext === "ai"
          ? "No readable text found. Re-save the Illustrator file with “Create PDF Compatible File” ticked and try again."
          : "No readable text found in that file.",
      );
    }

    if (!apiKey) throw new Error("File reading is not configured on this workspace.");
    const content = await structureViaAi(apiKey, text);
    return { content };
  });
