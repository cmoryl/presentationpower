// Streaming endpoint shared by the Events Agent and the Social Agent. Same
// tool-loop shape as the print agent, but the tool set is scoped to the format
// catalog, the playbook library and the caller's own campaign_kits rows.
import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { kitAgentSystemPrompt } from "@/lib/kit-agent/prompt";
import { buildKitAgentToolSet } from "@/lib/kit-agent/tools";
import type { KitSurface } from "@/lib/kit-agent/threads";
import { repairDanglingToolParts } from "@/lib/agent/repair-tool-parts";

const MODEL = "google/gemini-3.6-flash";

type Body = { messages?: UIMessage[]; threadId?: string; surface?: string };

export const Route = createFileRoute("/api/kit-agent-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
        const publishableKey =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!supabaseUrl || !publishableKey)
          return new Response("Backend not configured", { status: 500 });
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        const body = (await request.json()) as Body;
        const messages = repairDanglingToolParts(Array.isArray(body.messages) ? body.messages : []);
        const threadId = typeof body.threadId === "string" ? body.threadId : "";
        const surface: KitSurface = body.surface === "event" ? "event" : "social";
        if (messages.length === 0) return new Response("Messages are required", { status: 400 });
        if (!threadId) return new Response("threadId is required", { status: 400 });

        const { data: thread, error: threadErr } = await supabase
          .from("agent_threads")
          .select("id")
          .eq("id", threadId)
          .maybeSingle();
        if (threadErr) return new Response(threadErr.message, { status: 500 });
        if (!thread) return new Response("Thread not found", { status: 404 });

        const last = messages[messages.length - 1];
        if (last?.role === "user") {
          const { error } = await supabase.from("agent_messages").insert({
            thread_id: threadId,
            owner_id: userId,
            client_message_id: last.id ?? null,
            role: "user",
            parts: last.parts as never,
          } as never);
          if (error) console.error("kit agent_messages insert (user) failed:", error.message);
        }

        const gateway = createOpenAICompatible({
          name: "lovable-gateway",
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

        const result = streamText({
          model: gateway(MODEL),
          system: kitAgentSystemPrompt(surface),
          messages: await convertToModelMessages(messages),
          tools: buildKitAgentToolSet({ supabase, userId, surface, threadId }),
          stopWhen: stepCountIs(40),
          abortSignal: request.signal,
          onError: ({ error }) => console.error("kit agent stream error:", error),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onError: (error) => {
            const raw = error instanceof Error ? error.message : String(error);
            if (/not enough credits|payment_required|402/i.test(raw))
              return "AI credits are exhausted for this workspace, so the kit could not be generated. Top up the workspace AI credits and send the brief again.";
            if (/rate.?limit|429/i.test(raw))
              return "The AI service is rate limited right now. Wait a moment and resend the brief.";
            return raw || "The agent hit an error.";
          },
          onFinish: async ({ responseMessage }) => {
            const { error } = await supabase.from("agent_messages").insert({
              thread_id: threadId,
              owner_id: userId,
              client_message_id: responseMessage.id ?? null,
              role: "assistant",
              parts: responseMessage.parts as never,
            } as never);
            if (error) console.error("kit agent_messages insert (assistant) failed:", error.message);
            await supabase
              .from("agent_threads")
              .update({ updated_at: new Date().toISOString() } as never)
              .eq("id", threadId);
          },
        });
      },
    },
  },
});
