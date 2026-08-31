// Client-side CRUD for the PowerPoint agent's conversation threads. RLS scopes
// every read/write to the signed-in user.
import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";
import { repairDanglingToolParts } from "@/lib/agent/repair-tool-parts";

export type AgentThread = {
  id: string;
  title: string;
  deck_id: string | null;
  updated_at: string;
};

// Presentation threads predate the `kind` column, so they may be stored as
// kind = 'presentation' OR kind = null — treat both as presentation, and never
// return print/social/event rows here.
const PRESENTATION_KIND_FILTER = "kind.is.null,kind.eq.presentation";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPersistableDeckId(deckId: string): boolean {
  return UUID_RE.test(deckId);
}

export async function listAgentThreads(): Promise<AgentThread[]> {
  // Admins can read every thread by policy (support/moderation), so the owner
  // filter is explicit here — the conversations rail is always the caller's own.
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user.id;
  if (!ownerId) return [];
  const { data, error } = await supabase
    .from("agent_threads")
    .select("id, title, deck_id, updated_at")
    .eq("owner_id", ownerId)
    .or(PRESENTATION_KIND_FILTER)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as AgentThread[];
}


export async function createAgentThread(title = "New presentation"): Promise<AgentThread> {
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user.id;
  if (!ownerId) throw new Error("You need to be signed in.");
  const { data, error } = await supabase
    .from("agent_threads")
    .insert({ owner_id: ownerId, title, kind: "presentation" } as never)
    .select("id, title, deck_id, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data as AgentThread;
}

export async function renameAgentThread(id: string, title: string) {
  const { error } = await supabase
    .from("agent_threads")
    .update({ title } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAgentThread(id: string) {
  const { error } = await supabase.from("agent_threads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setAgentThreadDeck(id: string, deckId: string) {
  // Cloud thread.deck_id is a UUID column. Demo/local decks use short nanoids
  // and are restored from persisted chat tool output + local deck storage.
  if (!isPersistableDeckId(deckId)) return;
  const { error } = await supabase
    .from("agent_threads")
    .update({ deck_id: deckId } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function loadAgentThread(
  id: string,
): Promise<{ thread: AgentThread; messages: UIMessage[] }> {
  const { data: thread, error } = await supabase
    .from("agent_threads")
    .select("id, title, deck_id, updated_at, kind")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!thread) throw new Error("Conversation not found");
  // Direct-link guard: a print/social/event thread id pasted into the
  // presentation agent must not load that conversation here.
  const kind = (thread as { kind?: string | null }).kind;
  if (kind && kind !== "presentation") throw new Error("Conversation not found");
  const { data: rows, error: mErr } = await supabase
    .from("agent_messages")
    .select("id, role, parts, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });
  if (mErr) throw new Error(mErr.message);
  const messages = repairDanglingToolParts(
    (rows ?? []).map((row) => {
      const r = row as { id: string; role: string; parts: unknown };
      return {
        id: r.id,
        role: r.role === "assistant" ? "assistant" : "user",
        parts: Array.isArray(r.parts) ? r.parts : [],
      } as UIMessage;
    }),
  );
  return { thread: thread as AgentThread, messages };
}

/**
 * Append locally-produced messages (e.g. the demo fast-path build) to a
 * thread, mirroring the shape the /api/agent-chat route persists. Sequenced
 * so created_at ordering matches the conversation order.
 */
export async function appendAgentMessages(threadId: string, messages: UIMessage[]) {
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user.id;
  if (!ownerId) return;
  for (const m of messages) {
    const { error } = await supabase.from("agent_messages").insert({
      thread_id: threadId,
      owner_id: ownerId,
      client_message_id: m.id ?? null,
      role: m.role === "assistant" ? "assistant" : "user",
      parts: m.parts as never,
    } as never);
    if (error) console.error("agent_messages insert failed:", error.message);
  }
  await supabase
    .from("agent_threads")
    .update({ updated_at: new Date().toISOString() } as never)
    .eq("id", threadId);
}

/** Pull the deck id out of any tool output text the agent produced. */
export function findDeckIdInMessages(messages: UIMessage[]): string | null {
  const deckIdPattern = /"deck_id"\s*:\s*"([A-Za-z0-9_-]{6,64})"/;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const parts = messages[i]?.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j -= 1) {
      const part = parts[j] as { output?: unknown; text?: unknown };
      for (const candidate of [part.output, part.text]) {
        if (typeof candidate !== "string") continue;
        const m = deckIdPattern.exec(candidate);
        if (m) return m[1] ?? null;
      }
    }
  }
  return null;
}
