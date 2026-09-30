// Browser reads/writes for sign templates, venue sign spots and event sign sets.
// Row-level rules and the template trigger enforce who can add, build and approve.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { KioskEdits } from "@/lib/next-california-kiosk-live";
import type { SignKind, SignSpot, SignStatus, SignTemplate } from "@/lib/sign-set";

export type SignTemplateRow = SignTemplate & { source_label: string | null; review_note: string | null; created_by: string; created_at: string };
export type SignSpotRow = SignSpot & { venue_id: string; photo_path: string | null; note: string | null; position: number };
export type EventSignRow = { id: string; event_id: string; spot_id: string; template_id: string; fields: Record<string, string>; status: SignStatus; updated_at: string };

const must = <T,>(r: { data: T; error: { message: string } | null }): NonNullable<T> => {
  if (r.error) throw new Error(r.error.message);
  if (r.data == null) throw new Error("Nothing came back from the database.");
  return r.data as NonNullable<T>;
};

export async function listSignTemplates(): Promise<SignTemplateRow[]> {
  const rows = must(await supabase.from("sign_templates").select("id,name,kind,layout_id,source_label,w_in,h_in,edits,fields,status,review_note,created_by,created_at").order("created_at", { ascending: false }).limit(500));
  return rows.map((r) => ({ ...r, kind: r.kind as SignKind, status: r.status as SignTemplate["status"], w_in: Number(r.w_in), h_in: Number(r.h_in), edits: (r.edits ?? {}) as KioskEdits, fields: (r.fields ?? {}) as SignTemplate["fields"] }));
}

export async function saveSignTemplate(p: { name: string; kind: SignKind; layoutId: string; sourceLabel: string; wIn: number; hIn: number; edits: KioskEdits; fields: SignTemplate["fields"] }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sign in to save templates.");
  return must(await supabase.from("sign_templates").insert({
    name: p.name, kind: p.kind, layout_id: p.layoutId, source_label: p.sourceLabel, w_in: p.wIn, h_in: p.hIn,
    edits: p.edits as unknown as Json, fields: p.fields as unknown as Json, created_by: u.user.id, status: "draft",
  }).select("id").single()).id;
}

export async function decideSignTemplate(id: string, status: "approved" | "rejected", note?: string) {
  must(await supabase.from("sign_templates").update({ status, review_note: note ?? null }).eq("id", id).select("id").single());
}

export async function listVenueSpots(venueId: string): Promise<SignSpotRow[]> {
  const rows = must(await supabase.from("venue_sign_spots").select("id,venue_id,label,kind,floor_key,room,w_in,h_in,sides,photo_path,note,position").eq("venue_id", venueId).order("position").order("label"));
  return rows.map((r) => ({ ...r, kind: r.kind as SignKind, w_in: r.w_in == null ? null : Number(r.w_in), h_in: r.h_in == null ? null : Number(r.h_in) }));
}

export type SpotInput = { id?: string; venueId: string; label: string; kind: SignKind; floorKey: string | null; room: string | null; wIn: number | null; hIn: number | null; sides: number; note: string | null; position: number; photoPath?: string | null };
export async function saveVenueSpot(p: SpotInput) {
  const row = { venue_id: p.venueId, label: p.label, kind: p.kind, floor_key: p.floorKey, room: p.room, w_in: p.wIn, h_in: p.hIn, sides: p.sides, note: p.note, position: p.position, ...(p.photoPath !== undefined ? { photo_path: p.photoPath } : {}) };
  const r = p.id
    ? await supabase.from("venue_sign_spots").update(row).eq("id", p.id).select("id").single()
    : await supabase.from("venue_sign_spots").insert(row).select("id").single();
  return must(r).id;
}

export async function deleteVenueSpot(id: string) {
  const { error } = await supabase.from("venue_sign_spots").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function uploadSpotPhoto(venueId: string, spotId: string, file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("That photo is over 10 MB.");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${venueId}/${spotId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("venue-sign-photos").upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}

export async function spotPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("venue-sign-photos").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export async function loadSignSet(eventId: string) {
  const [set, signs] = await Promise.all([
    supabase.from("event_sign_sets").select("event_id,choices,copied_from").eq("event_id", eventId).maybeSingle(),
    supabase.from("event_signs").select("id,event_id,spot_id,template_id,fields,status,updated_at").eq("event_id", eventId),
  ]);
  if (set.error) throw new Error(set.error.message);
  return {
    choices: ((set.data?.choices ?? {}) as Partial<Record<SignKind, string>>),
    copiedFrom: set.data?.copied_from ?? null,
    signs: must(signs).map((s) => ({ ...s, status: s.status as SignStatus, fields: (s.fields ?? {}) as Record<string, string> })) as EventSignRow[],
  };
}

export async function listSignSetEvents(): Promise<{ event_id: string; choices: Partial<Record<SignKind, string>> }[]> {
  const rows = must(await supabase.from("event_sign_sets").select("event_id,choices").limit(200));
  return rows.map((r) => ({ event_id: r.event_id, choices: (r.choices ?? {}) as Partial<Record<SignKind, string>> }));
}

export async function saveSignSetChoices(eventId: string, choices: Partial<Record<SignKind, string>>, copiedFrom?: string | null) {
  must(await supabase.from("event_sign_sets").upsert({ event_id: eventId, choices: choices as unknown as Json, ...(copiedFrom !== undefined ? { copied_from: copiedFrom } : {}) }).select("event_id").single());
}

/** Upsert one built sign and write its filled edits where the editor reads them. */
export async function saveEventSign(p: { eventId: string; spotId: string; templateId: string; fields: Record<string, string>; status: SignStatus; edits: KioskEdits; overwriteEdits: boolean }) {
  const row = must(await supabase.from("event_signs").upsert(
    { event_id: p.eventId, spot_id: p.spotId, template_id: p.templateId, fields: p.fields as unknown as Json, status: p.status },
    { onConflict: "event_id,spot_id" },
  ).select("id").single());
  const key = `signset:${row.id}`;
  if (!p.overwriteEdits) {
    const have = await supabase.from("kiosk_layer_edits").select("booth_id").eq("booth_id", key).maybeSingle();
    if (have.data) return row.id;
  }
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("kiosk_layer_edits").upsert({ booth_id: key, edits: p.edits as unknown as Json, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return row.id;
}

export async function loadSignEdits(key: string): Promise<KioskEdits> {
  const { data, error } = await supabase.from("kiosk_layer_edits").select("edits").eq("booth_id", key).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.edits ?? {}) as KioskEdits;
}

export async function loadEventSign(id: string) {
  const r = await supabase.from("event_signs").select("id,event_id,spot_id,template_id,status").eq("id", id).maybeSingle();
  if (r.error) throw new Error(r.error.message);
  const s = r.data;
  if (!s) return null;
  const [t, sp] = await Promise.all([
    supabase.from("sign_templates").select("id,name,layout_id").eq("id", s.template_id).maybeSingle(),
    supabase.from("venue_sign_spots").select("id,label").eq("id", s.spot_id).maybeSingle(),
  ]);
  return { sign: s, template: t.data, spot: sp.data };
}

export async function canEditSigns(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase.rpc("can_edit_signs", { _user_id: u.user.id });
  return data === true;
}

export async function canApproveTemplates(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const [a, b] = await Promise.all([
    supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: u.user.id, _role: "brand_lead" }),
  ]);
  return a.data === true || b.data === true;
}
