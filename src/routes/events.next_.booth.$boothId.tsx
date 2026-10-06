// /events/next/booth/$boothId — one booth workspace: kiosk editor on the left,
// the live BoothHub 3D booth on the right, plus the "Checked in 3D" sign-off.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KioskLayerEditor } from "@/components/events/KioskLayerEditor";
import { CALIFORNIA_KIOSKS, californiaKioskSourceBoothId } from "@/lib/next-california-kiosks";
import { kioskLiveLayout } from "@/lib/next-california-kiosk-live";
import { boothForSource, useBoothArt, useEventBooths } from "@/lib/event-booths";
import { sfKiosk3dUrl } from "@/lib/sf-kiosk-3d";
import { useRequireSignIn } from "@/hooks/use-require-sign-in";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/events/next_/booth/$boothId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Booth workspace · NEXT San Francisco · TransPerfect Element" },
      { name: "description", content: "Edit a NEXT partner kiosk and see it on the 3D booth side by side, then sign it off in 3D." },
      { property: "og:title", content: "Booth workspace · NEXT San Francisco" },
      { property: "og:description", content: "Kiosk editor and live 3D booth in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BoothWorkspace,
});

function BoothWorkspace() {
  const auth = useRequireSignIn();
  const { boothId } = Route.useParams();
  const source = californiaKioskSourceBoothId(boothId);
  const layout = kioskLiveLayout(source);
  const vendor = CALIFORNIA_KIOSKS.find((k) => k.id === boothId)?.vendor ?? "Partner";
  const { data: booths } = useEventBooths();
  const booth = boothForSource(booths, source);
  const { data: art } = useBoothArt(booth?.id);
  const qc = useQueryClient();
  const [frameKey, setFrameKey] = useState(0);
  const [note, setNote] = useState("");
  const isAdmin = useIsAdmin();

  useEffect(() => {
    const ok = () => { qc.invalidateQueries({ queryKey: ["booth-art"] }); setFrameKey((k) => k + 1); toast.success("Sent to the 3D booth"); };
    const bad = (e: Event) => toast.error(`Not sent to 3D: ${(e as CustomEvent).detail}`);
    window.addEventListener("booth-art-published", ok);
    window.addEventListener("booth-art-failed", bad);
    return () => { window.removeEventListener("booth-art-published", ok); window.removeEventListener("booth-art-failed", bad); };
  }, [qc]);

  const revision = art?.reduce<string | null>((m, a) => (!m || a.revision > m ? a.revision : m), null) ?? null;
  const { data: checks } = useQuery({
    queryKey: ["booth-3d-checks", booth?.id],
    enabled: !!booth?.id,
    queryFn: async () => (await supabase.from("booth_3d_checks").select("id, revision, note, checked_at").eq("booth_id", booth!.id!).order("checked_at", { ascending: false }).limit(5)).data ?? [],
  });
  const checkedThis = !!revision && (checks ?? []).some((c) => c.revision === revision);

  if (auth !== "signed-in") return <main className="grid min-h-screen place-items-center bg-[#0B0A2A] text-white">Checking sign-in…</main>;
  if (!layout) return <main className="grid min-h-screen place-items-center bg-[#0B0A2A] p-8 text-white">This kiosk has no layered editor. <Link to="/events/next/california" className="ml-2 text-[#A1FBF9] underline">Back</Link></main>;

  const recordCheck = async () => {
    if (!booth?.id || !revision) return;
    const { data: u } = await supabase.auth.getUser();
    const src = `${booth.id}/front.png`;
    const snap = `${booth.id}/checks/${Date.now()}-front.png`;
    const cp = await supabase.storage.from("booth-proofs").copy(src, snap);
    const { error } = await supabase.from("booth_3d_checks").insert({ booth_id: booth.id, revision, note: note || null, snapshot_path: cp.error ? null : snap, checked_by: u.user!.id });
    if (error) return toast.error(`Not recorded: ${error.message}`);
    setNote(""); qc.invalidateQueries({ queryKey: ["booth-3d-checks"] }); toast.success("Checked in 3D");
  };
  const togglePublished = async () => {
    if (!booth?.id) return;
    const { error } = await supabase.from("event_booths").update({ published_3d: !booth.published3d }).eq("id", booth.id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["event-booths"] });
  };

  return (
    <main className="flex h-screen flex-col bg-[#0B0A2A] text-white lg:flex-row">
      <section className="relative min-h-[70vh] flex-1 overflow-hidden" aria-label="Kiosk editor">
        <KioskLayerEditor layout={layout} vendor={vendor} embedded />
      </section>
      <aside className="flex w-full flex-col border-l border-white/10 lg:w-[34%] lg:shrink-0" aria-label="3D booth">
        <header className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3 text-sm">
          <h1 className="font-semibold">{vendor} · 3D</h1>
          <span className="rounded-sm border border-white/20 px-1.5 py-0.5 text-[11px]">
            {revision ? `Artwork sent ${new Date(revision).toLocaleString()}` : "No artwork sent yet — save the kiosk"}
          </span>
          {isAdmin && booth?.id ? (
            <button type="button" onClick={togglePublished} className="ml-auto rounded-md border border-white/25 px-2 py-1 text-[11px] hover:bg-white/10">
              {booth.published3d ? "Mark 3D unpublished" : "Mark 3D published in BoothHub"}
            </button>
          ) : null}
        </header>
        {!booth ? (
          <p className="p-4 text-sm text-white/70">No matching BoothHub booth yet, so there's no 3D view for this kiosk.</p>
        ) : booth.published3d ? (
          <iframe key={frameKey} src={sfKiosk3dUrl(booth.slug, true)} title={`${vendor} booth in 3D`} allow="fullscreen" allowFullScreen className="min-h-[50vh] flex-1 bg-white" />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/75">
            <p>3D not published yet for this booth in BoothHub.</p>
            {art?.length ? <div className="flex items-end gap-1">{(["left", "front", "right"] as const).map((f) => { const a = art.find((x) => x.face === f); return a ? <img key={f} src={a.url} alt={`${f} artwork proof`} className={f === "front" ? "h-64" : "h-64 w-auto"} /> : null; })}</div> : null}
          </div>
        )}
        {booth?.id ? (
          <div className="space-y-2 border-t border-white/10 p-3 text-sm">
            <label htmlFor="check-note" className="block text-[12px] font-semibold">Checked in 3D</label>
            <textarea id="check-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional note (what you checked)" className="w-full rounded-md border border-white/20 bg-transparent p-2 text-[12px]" />
            <button type="button" disabled={!revision || checkedThis} onClick={recordCheck} className="rounded-md bg-[#003FC7] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50">
              {checkedThis ? "This artwork is checked in 3D" : "I've checked this artwork in 3D"}
            </button>
            <p className="text-[11px] text-white/60">The saved snapshot is the artwork proof sent to 3D; the 3D view itself can't be captured from another site.</p>
          </div>
        ) : null}
      </aside>
    </main>
  );
}
