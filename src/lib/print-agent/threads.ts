// Client-side CRUD for the print agent's conversation threads. Threads live in
// the shared agent_threads table, separated by kind = 'print' so the print
// workspace never shows presentation conversations (and vice versa).
import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";
import { repairDanglingToolParts } from "@/lib/agent/repair-tool-parts";

export type PrintAgentThread = {
  id: string;
  title: string;
  print_asset_id: string | null;
  updated_at: string;
};

const SELECT = "id, title, print_asset_id, updated_at";

export async function listPrintThreads(): Promise<PrintAgentThread[]> {
  const { data, error } = await supabase
    .from("agent_threads")
    .select(SELECT)
    .eq("kind", "print")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PrintAgentThread[];
}

export async function createPrintThread(title = "New print piece"): Promise<PrintAgentThread> {
  const { data: session } = await supabase.auth.getSession();
  const ownerId = session.session?.user.id;
  if (!ownerId) throw new Error("You need to be signed in.");
  const { data, error } = await supabase
    .from("agent_threads")
    .insert({ owner_id: ownerId, title, kind: "print" } as never)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as PrintAgentThread;
}

export async function renamePrintThread(id: string, title: string) {
  const { error } = await supabase
    .from("agent_threads")
    .update({ title } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePrintThread(id: string) {
  const { error } = await supabase.from("agent_threads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setPrintThreadAsset(id: string, assetId: string) {
  const { error } = await supabase
    .from("agent_threads")
    .update({ print_asset_id: assetId } as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function loadPrintThread(
  id: string,
): Promise<{ thread: PrintAgentThread; messages: UIMessage[] }> {
  const { data: thread, error } = await supabase
    .from("agent_threads")
    .select(SELECT)
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
  return { thread: thread as unknown as PrintAgentThread, messages };
}

/** Pull the newest print asset id out of any tool output the agent produced. */
export function findPrintAssetIdInMessages(messages: UIMessage[]): string | null {
  const re = /"(?:print_asset_id|assetId)"\s*:\s*"([0-9a-f-]{36})"/i;
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
