// After a kiosk is saved, render its front and both side strips to PNG proofs
// and store them as the booth's latest 3D artwork (browser only). These are
// proofs for the 3D view, never print masters.

import { supabase } from "@/integrations/supabase/client";
import { kioskEditKey, kioskFaceLayout, kioskFaceW, kioskFaceH, KIOSK_RETURN_W, KIOSK_H, buildKioskReturnSvg, type LiveLayout, type KioskEdits } from "@/lib/next-california-kiosk-live";
import { pressFrontSvg, proofPng } from "@/lib/next-california-kiosk-live-export";
import { notifyBoothHub } from "@/lib/booth-notify.functions";

async function loadEdits(key: string): Promise<KioskEdits> {
  const { data } = await supabase.from("kiosk_layer_edits").select("edits").eq("booth_id", key).maybeSingle();
  return (data?.edits as KioskEdits) ?? {};
}

/** Returns the revision stamp written, or null when the booth isn't in the registry. */
export async function publishBoothArt(front: LiveLayout, userId: string | null): Promise<string | null> {
  const { data: booth } = await supabase.from("event_booths").select("id").eq("source_booth_id", front.id).maybeSingle();
  if (!booth) return null;
  const frontEdits = await loadEdits(kioskEditKey(front));
  const blobs: Record<"front" | "left" | "right", Blob> = {
    front: await proofPng(await pressFrontSvg(front, frontEdits), 900, kioskFaceW(front), kioskFaceH(front)),
  } as never;
  for (const side of ["left", "right"] as const) {
    const FL = kioskFaceLayout(front, side);
    blobs[side] = FL
      ? await proofPng(await pressFrontSvg(FL, await loadEdits(kioskEditKey(FL))), 160, kioskFaceW(FL), kioskFaceH(FL))
      : await proofPng(buildKioskReturnSvg(front, frontEdits), 160, KIOSK_RETURN_W, KIOSK_H);
  }
  const revision = new Date().toISOString();
  for (const [face, blob] of Object.entries(blobs)) {
    const path = `${booth.id}/${face}.png`;
    const up = await supabase.storage.from("booth-proofs").upload(path, blob, { upsert: true, contentType: "image/png" });
    if (up.error) throw new Error(`3D artwork not sent: ${up.error.message}`);
    const { error } = await supabase.from("booth_art").upsert({ booth_id: booth.id, face, path, revision, updated_by: userId });
    if (error) throw new Error(`3D artwork not sent: ${error.message}`);
  }
  window.dispatchEvent(new CustomEvent("booth-art-published", { detail: front.id }));
  // Tell BoothHUB (server-side; the key stays private). A failure is surfaced, not hidden.
  notifyBoothHub({ data: { boothId: booth.id, revision } }).catch((e) =>
    window.dispatchEvent(new CustomEvent("booth-art-failed", { detail: `BoothHUB wasn't notified: ${e instanceof Error ? e.message : e}` })),
  );
  return revision;
}

/** Which 3D sign (event_booths source id) and face a saved sign face feeds; null = no 3D model. */
export function signArtTarget(layoutId: string): { source: string; face: "front" | "left" | "right" } | null {
  if (layoutId.includes("~")) return null; // re-sized copies are not the 3D sign
  const d = layoutId.match(/^divsign-transperfect-demobooth-(front|left|right)$/);
  if (d) return { source: "demo-booth", face: d[1] as "front" | "left" | "right" };
  const s = layoutId.match(/^sfsurround-(all|three)$/);
  if (s) return { source: `sf-surround-${s[1]}`, face: "front" };
  const f = layoutId.match(/^divsign-(finance-pillar-(?:welcome|profile))$/);
  if (f) return { source: f[1]!, face: "front" };
  return null;
}

/** After a sign face is saved, send its PNG proof to the matching 3D sign (Element is the source of truth). */
export async function publishSignArt(L: LiveLayout, userId: string | null): Promise<string | null> {
  const t = signArtTarget(L.id);
  if (!t) return null;
  const { data: booth } = await supabase.from("event_booths").select("id").eq("source_booth_id", t.source).maybeSingle();
  if (!booth) return null;
  const blob = await proofPng(await pressFrontSvg(L, await loadEdits(kioskEditKey(L))), t.face === "front" ? 900 : 160, kioskFaceW(L), kioskFaceH(L));
  const revision = new Date().toISOString();
  const path = `${booth.id}/${t.face}.png`;
  const up = await supabase.storage.from("booth-proofs").upload(path, blob, { upsert: true, contentType: "image/png" });
  if (up.error) throw new Error(`3D artwork not sent: ${up.error.message}`);
  const { error } = await supabase.from("booth_art").upsert({ booth_id: booth.id, face: t.face, path, revision, updated_by: userId });
  if (error) throw new Error(`3D artwork not sent: ${error.message}`);
  window.dispatchEvent(new CustomEvent("booth-art-published", { detail: L.id }));
  notifyBoothHub({ data: { boothId: booth.id, revision } }).catch((e) =>
    window.dispatchEvent(new CustomEvent("booth-art-failed", { detail: `BoothHUB wasn't notified: ${e instanceof Error ? e.message : e}` })),
  );
  return revision;
}
