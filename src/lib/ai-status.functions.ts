import { createServerFn } from "@tanstack/react-start";
import { getActiveAiProvider, LOVABLE_GATEWAY_MODEL, ANTHROPIC_MODEL } from "@/lib/ai-core";

/**
 * Public status probe: which AI provider (if any) is serving requests?
 * Returns booleans + a human label — never the key itself.
 */
export const hasAiKey = createServerFn({ method: "GET" }).handler(async () => {
  const provider = getActiveAiProvider();
  const model =
    provider === "anthropic"
      ? ANTHROPIC_MODEL
      : provider === "lovable-gateway"
        ? LOVABLE_GATEWAY_MODEL
        : null;
  return {
    configured: provider !== "none",
    provider,
    model,
    label:
      provider === "anthropic"
        ? "Anthropic (direct)"
        : provider === "lovable-gateway"
          ? "Lovable AI Gateway"
          : "Not configured",
  };
});
