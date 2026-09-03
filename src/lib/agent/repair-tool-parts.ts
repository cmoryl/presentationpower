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

const DANGLING_MESSAGE =
  "Tool result is missing — the previous run ended before this tool finished. Retry it if it is still needed.";

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

const KNOWN_NON_TOOL_PREFIX = new Set(["tool-invocation"]);

/**
 * A persisted transcript can hold tool calls whose names are not in the
 * currently declared tool set (renamed tools, or a staged/simulated build).
 * Providers reject the whole request when a history function call names a tool
 * they were not given, so those parts are rewritten as plain text notes: the
 * turn still reads correctly and the request stays valid.
 */
export function dropUnknownToolParts<T extends UIMessage>(
  messages: T[],
  knownTools: string[],
): T[] {
  const known = new Set(knownTools);
  let changed = false;
  const next = messages.map((message) => {
    const parts = Array.isArray(message.parts) ? message.parts : [];
    let touched = false;
    const rewritten = parts.flatMap((part): unknown[] => {
      if (!isToolPart(part)) return [part];
      const type = (part as LooseToolPart).type;
      if (type === "dynamic-tool" || KNOWN_NON_TOOL_PREFIX.has(type)) return [part];
      const name = type.replace(/^tool-/, "");
      if (known.has(name)) return [part];
      touched = true;
      return [{ type: "text", text: `(step: ${name})` }];
    });
    if (!touched) return message;
    changed = true;
    return { ...message, parts: rewritten } as unknown as T;
  });
  return changed ? next : messages;
}

// Gemini rejects a transcript in which a tool-result turn is followed straight
// by a user turn ("Requests ending with a model turn are not supported"), which
// happens whenever the assistant's summary text was recorded before its tool
// calls. Re-seat that trailing model turn: keep the tool results, then emit an
// assistant text turn before the next user message.
export function bridgeToolResultTurns<T extends { role: string; content?: unknown }>(
  messages: T[],
): T[] {
  const out: T[] = [];
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i]!;
    out.push(message);
    if (message.role !== "tool") continue;
    const next = messages[i + 1];
    if (!next || next.role !== "user") continue;
    out.push({
      role: "assistant",
      content: [{ type: "text", text: "(previous step completed)" }],
    } as unknown as T);
  }
  return out;
}
