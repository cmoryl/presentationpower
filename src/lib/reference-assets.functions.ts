// Reference assets for an asset request.
//
// Users can attach brand examples (images / PDFs) alongside a "need one
// specific asset" request. This module runs a vision pass over those files and
// returns a short, structured guidance block that is injected into the
// generation pipeline as a knowledge snippet.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_SETUP_MESSAGE,
  LOVABLE_GATEWAY_MODEL,
  getActiveAiProvider,
} from "@/lib/ai-core";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const MAX_TOTAL_BYTES = 18 * 1024 * 1024;
const ACCEPTED_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

const FileInput = z.object({
  name: z.string(),
  mimeType: z.string(),
  /** data URL: data:<mime>;base64,<payload> */
  dataUrl: z.string(),
});

const Input = z.object({
  request: z.string().default(""),
  brandName: z.string().nullable().default(null),
  files: z.array(FileInput).max(6).default([]),
});

export type ReferenceFileInput = z.infer<typeof FileInput>;

export type ReferenceAnalysis =
  | { ok: true; guidance: string; fileNames: string[] }
  | { ok: false; error: string };

const SYSTEM = `You are a brand design analyst for TransPerfect.
The user attached reference assets (brand examples, competitor work, or prior
collateral) for an asset they want produced. Study them and return concise
production guidance that a copy + layout generator can follow.

Return PLAIN TEXT with these labelled lines (no markdown headings, no preamble):
VISUAL: dominant layout structure, imagery treatment, density, grid feel.
COLOR: observed palette and how it should map to brand tokens.
TYPE: type hierarchy, weight/case conventions, heading length feel.
TONE: voice of the copy — register, sentence length, vocabulary.
STRUCTURE: the section order / modules the new asset should mirror.
AVOID: anything in the references that must NOT be copied (client marks, dated styling, off-brand elements).

Be specific and observational. Max 180 words total. Never invent facts about
companies; describe only what is visible.`;

function stripDataUrl(dataUrl: string): { mime: string; base64: string; size: number } | null {
  const m = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!m) return null;
  const base64 = m[2];
  const size = Math.round((base64.length * 3) / 4);
  return { mime: m[1], base64, size };
}

async function countPdfPages(base64: string): Promise<number | null> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const bytes = Buffer.from(base64, "base64");
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export const analyzeReferenceAssets = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ReferenceAnalysis> => {
    if (!data.files.length) return { ok: false, error: "No reference assets attached." };

    const provider = getActiveAiProvider();
    if (provider === "none") return { ok: false, error: ANTHROPIC_SETUP_MESSAGE };

    // ---- Validate each file, skipping unsupported / oversized / too-long PDFs. ----
    const validationErrors: string[] = [];
    const validated: { file: ReferenceFileInput; parts: { mime: string; base64: string }; size: number }[] = [];
    let totalBytes = 0;

    for (const file of data.files) {
      const parts = stripDataUrl(file.dataUrl);
      if (!parts) {
        validationErrors.push(`${file.name}: could not decode the uploaded file.`);
        continue;
      }
      if (!ACCEPTED_MIMES.includes(parts.mime)) {
        validationErrors.push(`${file.name}: unsupported format (${parts.mime}). PNG, JPG, WEBP, GIF or PDF only.`);
        continue;
      }
      if (parts.size > MAX_FILE_BYTES) {
        validationErrors.push(`${file.name}: exceeds ${formatBytes(MAX_FILE_BYTES)}.`);
        continue;
      }
      if (parts.mime === "application/pdf") {
        const pages = await countPdfPages(parts.base64);
        if (pages !== null && pages > MAX_PDF_PAGES) {
          validationErrors.push(`${file.name}: ${pages} pages — limit is ${MAX_PDF_PAGES}.`);
          continue;
        }
        if (pages === null) {
          validationErrors.push(`${file.name}: could not read page count; try re-exporting the PDF.`);
          continue;
        }
      }
      totalBytes += parts.size;
      validated.push({ file, parts, size: parts.size });
    }

    if (!validated.length) {
      const error =
        validationErrors.length === 1
          ? validationErrors[0]
          : `None of the ${data.files.length} attached files could be used.\n${validationErrors.join("\n")}`;
      return { ok: false, error };
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      return {
        ok: false,
        error: `Reference files are too large combined (${formatBytes(totalBytes)}). Keep the total under ${formatBytes(MAX_TOTAL_BYTES)}.`,
      };
    }

    const acceptedNames = validated.map((v) => v.file.name);

    const intro = [
      data.brandName ? `Division: ${data.brandName}.` : null,
      data.request.trim() ? `Asset requested: ${data.request.trim()}.` : null,
      `Reference files: ${acceptedNames.join(", ")}.`,
      validationErrors.length
        ? `Note: ${validationErrors.length} file${validationErrors.length > 1 ? "s" : ""} could not be used.`
        : null,
      "Analyse the attached references and produce the guidance block.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (provider === "anthropic") {
        const content: unknown[] = [{ type: "text", text: intro }];
        for (const { file, parts } of validated) {
          if (parts.mime === "application/pdf") {
            content.push({
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: parts.base64 },
            });
          } else {
            content.push({
              type: "image",
              source: { type: "base64", media_type: parts.mime, data: parts.base64 },
            });
          }
          void file;
        }
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 1024,
            temperature: 0.2,
            system: SYSTEM,
            messages: [{ role: "user", content }],
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          return { ok: false, error: `Reference analysis failed (${res.status}) ${body.slice(0, 200)}` };
        }
        const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
        const text = (json.content ?? [])
          .map((c) => (c.type === "text" ? (c.text ?? "") : ""))
          .join("")
          .trim();
        return text
          ? { ok: true, guidance: text, fileNames: acceptedNames }
          : { ok: false, error: "Reference analysis returned nothing." };
      }

      // Lovable AI Gateway (OpenAI-compatible multimodal blocks)
      const content: unknown[] = [{ type: "text", text: intro }];
      for (const { file, parts } of validated) {
        if (parts.mime === "application/pdf") {
          content.push({
            type: "file",
            file: { filename: file.name, file_data: file.dataUrl },
          });
        } else {
          content.push({ type: "image_url", image_url: { url: file.dataUrl } });
        }
      }
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LOVABLE_API_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: LOVABLE_GATEWAY_MODEL,
          max_tokens: 1024,
          temperature: 0.2,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content },
          ],
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (res.status === 429)
          return { ok: false, error: "AI rate limit hit — try the references again in a moment." };
        if (res.status === 402)
          return { ok: false, error: "AI credits exhausted — add credits to analyse references." };
        return { ok: false, error: `Reference analysis failed (${res.status}) ${body.slice(0, 200)}` };
      }
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = (json.choices?.[0]?.message?.content ?? "").trim();
      return text
        ? { ok: true, guidance: text, fileNames: acceptedNames }
        : { ok: false, error: "Reference analysis returned nothing." };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  });
