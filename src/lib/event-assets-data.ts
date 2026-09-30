// Browser reads/writes for event agendas and room lists (RLS + publish trigger enforce who can publish).

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { cleanRooms, cleanSessions, type AssetRoom, type AssetSession } from "@/lib/event-assets";
import type { Json } from "@/integrations/supabase/types";

export type AgendaVersion = { id: string; version: number; status: "draft" | "published"; sessions: AssetSession[]; source_url: string | null; source_file: string | null; created_at: string; published_at: string | null };
export type RoomsVersion = { id: string; version: number; status: "draft" | "published"; rooms: AssetRoom[]; source_url: string | null; source_file: string | null; created_at: string; published_at: string | null };

export async function loadEventAssets(eventId: string) {
  const [ag, rm, fl, me] = await Promise.all([
    supabase.from("event_agendas").select("id,version,status,sessions,source_url,source_file,created_at,published_at").eq("event_id", eventId).order("version", { ascending: false }).limit(30),
    supabase.from("event_rooms").select("id,version,status,rooms,source_url,source_file,created_at,published_at").eq("event_id", eventId).order("version", { ascending: false }).limit(30),
    supabase.from("event_map_floors").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    supabase.auth.getUser(),
  ]);
  if (ag.error) throw new Error(ag.error.message);
  if (rm.error) throw new Error(rm.error.message);
  const uid = me.data.user?.id;
  const canPublish = uid ? !!(await supabase.rpc("can_publish_event_assets", { _user_id: uid })).data : false;
  const agendas: AgendaVersion[] = (ag.data ?? []).map((r) => ({ ...r, status: r.status as AgendaVersion["status"], sessions: cleanSessions(r.sessions) }));
  const rooms: RoomsVersion[] = (rm.data ?? []).map((r) => ({ ...r, status: r.status as RoomsVersion["status"], rooms: cleanRooms(r.rooms) }));
  return {
    agendas,
    rooms,
    floors: fl.count ?? 0,
    canPublish,
    signedIn: !!uid,
    publishedAgenda: agendas.find((a) => a.status === "published") ?? null,
    publishedRooms: rooms.find((r) => r.status === "published") ?? null,
  };
}

export const eventAssetsKey = (eventId: string) => ["event-assets", eventId];

export function useEventAssets(eventId: string) {
  return useQuery({ queryKey: eventAssetsKey(eventId), queryFn: () => loadEventAssets(eventId), retry: false });
}

export function useRefreshEventAssets(eventId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: eventAssetsKey(eventId) });
}

type Save = { eventId: string; status: "draft" | "published"; sourceUrl?: string | null; sourceFile?: string | null; draftId?: string | null; nextVersion: number };

export async function saveAgendaVersion(p: Save & { sessions: AssetSession[] }) {
  const row = { status: p.status, sessions: p.sessions as unknown as Json, source_url: p.sourceUrl ?? null, source_file: p.sourceFile ?? null };
  const r = p.draftId
    ? await supabase.from("event_agendas").update(row).eq("id", p.draftId).select("id").single()
    : await supabase.from("event_agendas").insert({ ...row, event_id: p.eventId, version: p.nextVersion }).select("id").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id;
}

export async function saveRoomsVersion(p: Save & { rooms: AssetRoom[] }) {
  const row = { status: p.status, rooms: p.rooms as unknown as Json, source_url: p.sourceUrl ?? null, source_file: p.sourceFile ?? null };
  const r = p.draftId
    ? await supabase.from("event_rooms").update(row).eq("id", p.draftId).select("id").single()
    : await supabase.from("event_rooms").insert({ ...row, event_id: p.eventId, version: p.nextVersion }).select("id").single();
  if (r.error) throw new Error(r.error.message);
  return r.data.id;
}
