// Records every server-side call to the Lovable AI Gateway into `ai_events`,
// so the admin command center shows real usage. Installed once per worker by
// wrapping globalThis.fetch; the original call and response are untouched.
const GATEWAY = "https://ai.gateway.lovable.dev/";
let installed = false;

function operationFor(url: string): string {
  const path = url.slice(GATEWAY.length).replace(/^v1\//, "").split("?")[0];
  return path.replace(/\//g, "_") || "unknown";
}

function modelFor(body: unknown): string {
  if (typeof body !== "string") return "unknown";
  try {
    const m = (JSON.parse(body) as { model?: unknown }).model;
    return typeof m === "string" ? m : "unknown";
  } catch {
    return "unknown";
  }
}

async function record(row: Record<string, unknown>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as unknown as {
      from: (t: string) => { insert: (r: unknown) => Promise<unknown> };
    })
      .from("ai_events")
      .insert(row);
  } catch (e) {
    console.error("[ai-usage] could not record AI call", e);
  }
}

export function installAiUsageRecorder() {
  if (installed) return;
  installed = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!url.startsWith(GATEWAY)) return original(input, init);
    const started = Date.now();
    const operation = operationFor(url);
    const model = modelFor(init?.body);
    try {
      const res = await original(input, init);
      const latency = Date.now() - started;
      const ok = res.ok;
      const done = (async () => {
        let tokensIn = 0;
        let tokensOut = 0;
        let errorMessage: string | null = null;
        const type = res.headers.get("content-type") ?? "";
        if (type.includes("application/json")) {
          try {
            const j = (await res.clone().json()) as {
              usage?: Record<string, number>;
              error?: { message?: string };
            };
            const u = j.usage ?? {};
            tokensIn = u.prompt_tokens ?? u.input_tokens ?? 0;
            tokensOut = u.completion_tokens ?? u.output_tokens ?? 0;
            if (!ok) errorMessage = j.error?.message?.slice(0, 300) ?? `HTTP ${res.status}`;
          } catch {
            /* body not readable — counts still recorded */
          }
        } else if (!ok) errorMessage = `HTTP ${res.status}`;
        await record({
          surface: "server",
          model,
          operation,
          status: ok ? "success" : "error",
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          latency_ms: latency,
          error_message: errorMessage,
          meta: { http_status: res.status, recorder: "fetch" },
        });
      })();
      void done;
      return res;
    } catch (e) {
      void record({
        surface: "server",
        model,
        operation,
        status: "error",
        latency_ms: Date.now() - started,
        error_message: String((e as Error)?.message ?? e).slice(0, 300),
        meta: { recorder: "fetch" },
      });
      throw e;
    }
  }) as typeof fetch;
}
