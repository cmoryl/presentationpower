// A streamed turn can end (abort, network drop, credit/rate-limit error, or a
// tool that never resolved) while an assistant message still holds a tool call
// with no output. Those dangling parts are persisted verbatim, and on the very
// next turn the AI SDK refuses the history with
// "Tool result is missing for tool call <id>".
//
// Repairing them is safe and non-destructive: the call itself is kept so the
// transcript still shows what the agent tried, and it is closed out as an
// errored tool result so the model can retry it instead of the whole
// conversation becoming unusable.
import type { UIMessage } from "ai";

type LooseToolPart = {
  type: string;
  state?: string;
  toolCallId?: string;
  output?: unknown;
  errorText?: string;
};

const DANGLING_MESSAGE = "Tool result is missing — the previous run ended before this tool finished. Retry it if it is still needed.";

function isToolPart(part: unknown): part is LooseToolPart {
  if (!part || typeof part !== "object") return false;
  const type = (part as { type?: unknown }).type;
  return typeof type === "string" && (type.startsWith("tool-") || type === "dynamic-tool");
}

/**
 * Close out every tool part that has no output or error, so a persisted
 * transcript always converts cleanly to model messages.
 */
export function repairDanglingToolParts<T extends UIMessage>(messages: T[]): T[] {
  let changed = false;
  const next = messages.map((message) => {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    let touched = false;
    const repaired = parts.map((part) => {
      if (!isToolPart(part)) return part;
      if (part.state === "output-available" || part.state === "output-error") return part;
      touched = true;
      return {
        ...part,
        state: "output-error",
        errorText: part.errorText || DANGLING_MESSAGE,
      };
    });
    if (!touched) return message;
    changed = true;
    return { ...message, parts: repaired } as T;
  });
  return changed ? next : messages;
}
