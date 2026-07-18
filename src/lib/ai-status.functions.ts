import { createServerFn } from "@tanstack/react-start";

/**
 * Public status probe: does the server have an ANTHROPIC_API_KEY configured?
 * Returns only a boolean — never the key itself.
 */
export const hasAiKey = createServerFn({ method: "GET" }).handler(async () => {
  return { configured: !!process.env.ANTHROPIC_API_KEY };
});
