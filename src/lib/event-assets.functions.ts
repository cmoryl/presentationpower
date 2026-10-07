import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AI_MODELS } from "@/lib/ai-models";

const input = z.object({
  kind: z.enum(["agenda", "rooms"]),
  url: z.string().url().max(2000).optional(),
  file: z.object({ name: z.string().max(200), mime: z.string().max(120), base64: z.string().max(14_000_000) }).optional(),
  text: z.string().max(400_000).optional(),
}).refine((d) => !!(d.url || d.file || d.text), "Add a link or a file.");

/**
 * Read sessions (or rooms) out of a web page or an uploaded file. Returns the
 * rows plus the source text used, so the page can flag anything not in it.
 */
export const extractEventAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Reading files is unavailable right now.");

    let sourceText = data.text ?? "";
    if (data.url) {
      const u = new URL(data.url);
      if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) throw new Error("That link can't be read.");
      const res = await fetch(u.toString(), { headers: { "User-Agent": "Mozilla/5.0 TransPerfectElement/1.0", Accept: "text/html,*/*" } });
      if (!res.ok) throw new Error(`The page answered ${res.status}. Try downloading it and uploading the file instead.`);
      const html = await res.text();
      sourceText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'").replace(/&#8211;|&ndash;/g, "–").replace(/&quot;/g, '"')
        .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 200_000);
      const times = (sourceText.match(/\b\d{1,2}[:.]\d{2}\b/g) ?? []).length;
      if (sourceText.length < 40 || (data.kind === "agenda" && times < 3))
        throw new Error("That page loads its sessions after it opens, so they can't be read from the link. Open the page, use Print → Save as PDF, and upload the PDF instead.");
    }

    const want = data.kind === "agenda"
      ? `Return JSON {"sessions":[{"day","start","end","title","speakers","room","division","kind"}]}. day = the day heading exactly as written (e.g. "Tuesday, October 27, 2026"). start/end = times as written (e.g. "1:50 PM"; end "" if not given). speakers = "Name, Organisation; Name, Organisation" as written, no job titles. kind = "break" for registration, breaks, lunch, networking or receptions, otherwise "session". room and division only if the source states them for that session.`
      : `Return JSON {"rooms":[{"name","level","capacity"}]}. One entry per room or space named in the source. level/capacity only if stated.`;
    const system = `You extract event data for print signage. Copy text exactly as it appears. Never invent, infer or complete a value: if the source does not state a field, return "". Keep source order. Include every item, not a sample. ${want}`;

    const content: unknown[] = [{ type: "text", text: sourceText ? `SOURCE:\n${sourceText}` : "Extract from the attached file." }];
    if (data.file) content.push({ type: "file", file: { filename: data.file.name, file_data: `data:${data.file.mime};base64,${data.file.base64}` } });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODELS.quick,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("extractEventAssets", res.status, body.slice(0, 400));
      if (res.status === 429) throw new Error("Too many requests right now — try again in a minute.");
      if (res.status === 402) throw new Error("AI credits have run out for this workspace.");
      throw new Error(`Couldn't read that source (${res.status}).`);
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw.replace(/^```json\s*|```$/g, "")); } catch { throw new Error("The reader returned something unreadable. Try again or use a different file."); }

      const fileText = async (apiKey: string, f: { name: string; mime: string; base64: string }): Promise<string> => {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODELS.lite,
        messages: [{ role: "user", content: [
          { type: "text", text: "Output all readable text of this document verbatim, in reading order. No commentary." },
          { type: "file", file: { filename: f.name, file_data: `data:${f.mime};base64,${f.base64}` } },
        ] }],
      }),
    });
    if (!res.ok) return "";
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? "";
  };

    // For files, ask once more for the plain text so the page can check titles against it.
    let checkText = sourceText;
    if (!checkText && data.file) checkText = await fileText(apiKey, data.file).catch(() => "");
    return { rows: (data.kind === "agenda" ? parsed.sessions : parsed.rooms) ?? [], sourceText: checkText.slice(0, 200_000) };
  });
