import { describe, it, expect, vi } from "vitest";

const inserted: unknown[] = [];
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert: async (r: unknown) => void inserted.push(r) }) },
}));

describe("AI usage recorder", () => {
  it("records gateway calls with model, operation, tokens and status", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ usage: { prompt_tokens: 12, completion_tokens: 3 } }), {
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const { installAiUsageRecorder } = await import("../ai-usage-recorder.server");
    installAiUsageRecorder();
    await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      body: JSON.stringify({ model: "openai/gpt-image-2" }),
    });
    await fetch("https://example.com/x");
    await new Promise((r) => setTimeout(r, 20));
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      model: "openai/gpt-image-2",
      operation: "images_generations",
      status: "success",
      tokens_in: 12,
      tokens_out: 3,
    });
  });
});
