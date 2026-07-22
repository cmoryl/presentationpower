import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Deck-scoped AI chat proxy.
// Accepts { messages, deckContext } and streams SSE-style completion
// from the Lovable AI Gateway. External API surface: our own app only.

const Message = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(4000),
});

const Body = z.object({
  messages: z.array(Message).min(1).max(30),
  mode: z.enum(["assist", "guide"]).optional().default("assist"),
  deckContext: z.object({
    title: z.string(),
    prospect: z.string().optional(),
    industry: z.string().optional(),
    audience: z.string().optional(),
    archetype: z.string().optional(),
    slides: z
      .array(
        z.object({
          position: z.number(),
          section: z.string(),
          variant: z.string(),
          title: z.string().optional(),
        }),
      )
      .max(40),
  }),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("AI not configured", { status: 500 });

        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch (e) {
          return new Response(`Invalid body: ${(e as Error).message}`, { status: 400 });
        }

        const ctx = parsed.deckContext;
        const outlineLines = ctx.slides
          .map((s) => `  ${String(s.position + 1).padStart(2, "0")}. [${s.section}] ${s.variant}${s.title ? ` — "${s.title}"` : ""}`)
          .join("\n");

        const system = parsed.mode === "guide"
          ? [
              "You are a PowerPoint editing coach inside a TransPerfect deck builder.",
              "Your job: GUIDE the user through editing their deck between this app and PowerPoint. You do NOT make edits yourself — you tell the user exactly where to click, what to change, and in what order.",
              "Style: numbered steps, one action per step, ≤15 words per step. Executive plain English. No hype.",
              "Always ground guidance in this app's actual capabilities:",
              "  • Import .pptx via /decks/import (100MB cap; extracts imagery + layout).",
              "  • Edit any slide inline on the deck preview (click text to live-edit).",
              "  • Use the Copilot (assist mode) to batch-rewrite slides via natural language.",
              "  • Swap layouts via the layout picker on each slide.",
              "  • Export back to .pptx from the Export menu (per-slide fidelity; native charts).",
              "  • Translate via the Translate drawer (GlobalLink).",
              "When the user asks 'how do I…', respond with: (1) the exact path in THIS app, then (2) what to verify in PowerPoint after export.",
              "If a step needs PowerPoint (e.g. fixing a master slide, embedding video), say so plainly and give the exact PowerPoint menu path.",
              "End every response with a single 'Next:' suggestion.",
              "",
              "Deck context:",
              `  Title: ${ctx.title}`,
              ctx.prospect ? `  Prospect: ${ctx.prospect}` : "",
              ctx.industry ? `  Industry: ${ctx.industry}` : "",
              ctx.audience ? `  Audience: ${ctx.audience}` : "",
              ctx.archetype ? `  Archetype: ${ctx.archetype}` : "",
              "",
              "Slide outline:",
              outlineLines,
            ].filter(Boolean).join("\n")
          : [
              "You are a TransPerfect deck assistant. You help the user reason about the deck they are editing.",
              "You do NOT edit slides directly — you suggest what to change, and the user applies it.",
              "Be concise. Use plain executive English. No hype words.",
              "",
              "Deck context:",
              `  Title: ${ctx.title}`,
              ctx.prospect ? `  Prospect: ${ctx.prospect}` : "",
              ctx.industry ? `  Industry: ${ctx.industry}` : "",
              ctx.audience ? `  Audience: ${ctx.audience}` : "",
              ctx.archetype ? `  Archetype: ${ctx.archetype}` : "",
              "",
              "Slide outline:",
              outlineLines,
            ].filter(Boolean).join("\n");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [
              { role: "system", content: system },
              ...parsed.messages,
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          return new Response(`AI gateway ${upstream.status}: ${t.slice(0, 200)}`, { status: 502 });
        }

        // Transform OpenAI-style SSE into plain text-delta stream.
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const reader = upstream.body!.getReader();
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const j = JSON.parse(payload) as {
                      choices?: Array<{ delta?: { content?: string } }>;
                    };
                    const delta = j.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(delta));
                  } catch {
                    // skip malformed line
                  }
                }
              }
            } catch (err) {
              controller.error(err);
              return;
            }
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
