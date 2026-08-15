// Client-side CRUD for the PowerPoint agent's conversation threads. RLS scopes
// every read/write to the signed-in user.
import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";

export type AgentThread = {
  id: string;
  title: string;
  deck_id: string | null;
  updated_at: string;
};

export async function listAgentThreads(): Promise<AgentThread[]> {
  const { data, error } = await supabase
    .from("agent_threads")
    .select("id, title, deck_id, updated_at")
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
    .insert({ owner_id: ownerId, title } as never)
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
    .select("id, title, deck_id, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!thread) throw new Error("Conversation not found");
  const { data: rows, error: mErr } = await supabase
    .from("agent_messages")
    .select("id, role, parts, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });
  if (mErr) throw new Error(mErr.message);
  const messages = (rows ?? []).map((row) => {
    const r = row as { id: string; role: string; parts: unknown };
    return {
      id: r.id,
      role: r.role === "assistant" ? "assistant" : "user",
      parts: Array.isArray(r.parts) ? r.parts : [],
    } as UIMessage;
  });
  return { thread: thread as AgentThread, messages };
}

/** Pull the deck id out of any tool output text the agent produced. */
export function findDeckIdInMessages(messages: UIMessage[]): string | null {
  const uuid = /"deck_id"\s*:\s*"([0-9a-f-]{36})"/i;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const parts = messages[i]?.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j -= 1) {
      const part = parts[j] as { output?: unknown; text?: unknown };
      for (const candidate of [part.output, part.text]) {
        if (typeof candidate !== "string") continue;
        const m = uuid.exec(candidate);
        if (m) return m[1] ?? null;
      }
    }
  }
  return null;
}
