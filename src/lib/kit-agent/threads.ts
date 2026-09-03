// Client-side CRUD for the events / social agent conversation threads.
//
// Threads live in the shared agent_threads table, separated by kind so the
// social workspace never shows event conversations (and vice versa).
import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";
import { repairDanglingToolParts } from "@/lib/agent/repair-tool-parts";

/** Which channel the conversation belongs to. Matches campaign_kits.surface. */
export type KitSurface = "social" | "event";

export type KitAgentThread = {
  id: string;
  title: string;
  kit_id: string | null;
  updated_at: string;
};

const SELECT = "id, title, kit_id, updated_at";

/** agent_threads.kind value for a channel. */
function kindOf(surface: KitSurface): string {
  return surface === "social" ? "social" : "event";
}

export async function listKitThreads(surface: KitSurface): Promise<KitAgentThread[]> {
  // Admins can read every thread by policy, so scope the rail to the caller.
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user.id;
  if (!ownerId) return [];
  const { data, error } = await supabase
    .from("agent_threads")
    .select(SELECT)
    .eq("owner_id", ownerId)
    .eq("kind", kindOf(surface))
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as KitAgentThread[];
}

export async function createKitThread(
  surface: KitSurface,
  title = surface === "social" ? "New social kit" : "New event kit",
): Promise<KitAgentThread> {
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user.id;
  if (!ownerId) throw new Error("You need to be signed in.");
  const { data, error } = await supabase
    .from("agent_threads")
    .insert({ owner_id: ownerId, title, kind: kindOf(surface) } as never)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as KitAgentThread;
}

export async function renameKitThread(id: string, title: string) {
  const { error } = await supabase
    .from("agent_threads")
    .update({ title } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteKitThread(id: string) {
  const { error } = await supabase.from("agent_threads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setKitThreadKit(id: string, kitId: string) {
  const { error } = await supabase
    .from("agent_threads")
    .update({ kit_id: kitId } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function loadKitThread(
  id: string,
): Promise<{ thread: KitAgentThread; messages: UIMessage[] }> {
  const { data: thread, error } = await supabase
    .from("agent_threads")
    .select(SELECT)
    .eq("id", id)
    .in("kind", ["social", "event"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!thread) throw new Error("That conversation no longer exists.");

  const { data: rows, error: msgErr } = await supabase
    .from("agent_messages")
    .select("id, role, parts, client_message_id")
    .eq("thread_id", id)
    .order("created_at", { ascending: true })
    .limit(400);
  if (msgErr) throw new Error(msgErr.message);

  // Prefer the client message id so a row keeps the same identity as the turn
  // that produced it — that makes local streamed messages and the stored
  // history line up instead of duplicating when another device syncs in.
  const seen = new Set<string>();
  const messages = repairDanglingToolParts(
    (rows ?? []).flatMap((row) => {
      const r = row as {
        id: string;
        role: string;
        parts: unknown;
        client_message_id: string | null;
      };
      const key = r.client_message_id ?? r.id;
      if (seen.has(key)) return [];
      seen.add(key);
      return [
        {
          id: key,
          role: r.role === "assistant" ? "assistant" : "user",
          parts: Array.isArray(r.parts) ? r.parts : [],
        } as UIMessage,
      ];
    }),
  );

  return { thread: thread as unknown as KitAgentThread, messages };
}

/** Pull the newest kit id out of any tool output the agent produced. */
export function findKitIdInMessages(messages: UIMessage[]): string | null {
  const re = /"(?:kit_id|kitId)"\s*:\s*"([0-9a-f-]{36})"/i;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const parts = messages[i]?.parts ?? [];
    for (let j = parts.length - 1; j >= 0; j -= 1) {
      const part = parts[j] as { output?: unknown; text?: unknown };
      for (const candidate of [part.output, part.text]) {
        const text =
          typeof candidate === "string"
            ? candidate
            : candidate && typeof candidate === "object"
              ? JSON.stringify(candidate)
              : "";
        const m = re.exec(text);
        if (m) return m[1] ?? null;
      }
    }
  }
  return null;
}
