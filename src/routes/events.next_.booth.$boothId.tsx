// /events/next/booth/$boothId — one booth workspace: kiosk editor on the left,
// the live BoothHub 3D booth on the right, plus the "Checked in 3D" sign-off.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Link2, Maximize2, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/AppShell";
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
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [view, setView] = useState<"editor" | "split" | "3d">("split");
  useEffect(() => { if (window.innerWidth < 1500) setView("editor"); }, []);

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

  const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString();
  };
  const seg = (on: boolean) => `px-3 py-1.5 text-[12px] font-medium ${on ? "bg-[#03002C] text-white" : "text-[#03002C] hover:bg-[#E0E8F5]"}`;
  const tool = "inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2 py-1 text-[11px] text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1FBF9]";
  const showEditor = view !== "3d";
  const show3d = view !== "editor";

  return (
    <AppShell>
      <div className="w-full px-3 pb-3 pt-4">
        <nav aria-label="Breadcrumb" className="text-[12px] text-[#03002C]/70">
          <Link to="/events/next/california" className="font-medium text-[#003FC7] hover:underline">San Francisco kiosks</Link>
          <span aria-hidden> / </span>{vendor}
        </nav>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-[#03002C]">{vendor}</h1>
          <span className="rounded-sm border border-[#03002C]/15 bg-[#F2F2F2] px-2 py-0.5 text-[11px] text-[#03002C]/80">
            {revision ? `Saved edits sent to 3D · ${ago(revision)}` : "3D is showing BoothHub's artwork — save the kiosk to send yours"}
          </span>
          <div role="group" aria-label="View" className="ml-auto inline-flex overflow-hidden rounded-md border border-[#03002C]/20">
            <button type="button" className={seg(view === "editor")} aria-pressed={view === "editor"} onClick={() => setView("editor")}>Editor</button>
            <button type="button" className={seg(view === "split")} aria-pressed={view === "split"} onClick={() => setView("split")}>Side by side</button>
            <button type="button" className={seg(view === "3d")} aria-pressed={view === "3d"} onClick={() => setView("3d")}>3D</button>
          </div>
          {isAdmin && booth?.id ? (
            <button type="button" onClick={togglePublished} className="rounded-md border border-[#03002C]/20 px-2 py-1.5 text-[11px] text-[#03002C] hover:bg-[#E0E8F5]">
              {booth.published3d ? "Mark 3D unpublished" : "Mark 3D published in BoothHub"}
            </button>
          ) : null}
        </div>
        <main className="relative left-1/2 mt-3 flex h-[calc(100vh-170px)] w-[calc(100vw-24px)] -translate-x-1/2 min-h-[640px] overflow-hidden rounded-md border border-[#03002C]/15 bg-[#0B0A2A] text-white">
          {showEditor ? (
            <section className="relative min-w-0 flex-1 overflow-hidden" aria-label="Kiosk editor">
              <KioskLayerEditor layout={layout} vendor={vendor} embedded />
            </section>
          ) : null}
          {show3d ? (
            <aside className={`flex min-w-0 flex-col border-l border-white/10 ${view === "3d" ? "flex-1" : "w-[360px] shrink-0"}`} aria-label="3D booth">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-2">
                <span className="text-[12px] font-semibold">3D booth</span>
                {booth?.published3d ? (
                  <span className="ml-auto flex gap-1.5">
                    <button type="button" className={tool} onClick={() => setFrameKey((k) => k + 1)}><RotateCcw className="h-3 w-3" aria-hidden />Reset view</button>
                    <button type="button" className={tool} onClick={() => frameRef.current?.requestFullscreen?.()}><Maximize2 className="h-3 w-3" aria-hidden />Fullscreen</button>
                    <button type="button" className={tool} onClick={() => navigator.clipboard.writeText(sfKiosk3dUrl(booth.slug)).then(() => toast.success("3D link copied"))}><Link2 className="h-3 w-3" aria-hidden />Share</button>
                  </span>
                ) : null}
              </div>
              {!booth ? (
                <p className="p-4 text-sm text-white/70">No matching BoothHub booth yet, so there's no 3D view for this kiosk.</p>
              ) : booth.published3d ? (
                <iframe ref={frameRef} key={frameKey} src={sfKiosk3dUrl(booth.slug, true)} title={`${vendor} booth in 3D`} allow="fullscreen" allowFullScreen className="min-h-0 flex-1 bg-white" />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/75">
                  <p>3D not published yet for this booth in BoothHub.</p>
                  {art?.length ? <div className="flex items-end gap-1">{(["left", "front", "right"] as const).map((f) => { const a = art.find((x) => x.face === f); return a ? <img key={f} src={a.url} alt={`${f} artwork proof`} className="h-64 w-auto" /> : null; })}</div> : null}
                </div>
              )}
              {booth?.id ? (
                <div className="space-y-2 border-t border-white/10 p-3 text-sm">
                  <label htmlFor="check-note" className="block text-[12px] font-semibold">Checked in 3D</label>
                  <textarea id="check-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional note (what you checked)" className="w-full rounded-md border border-white/20 bg-transparent p-2 text-[12px]" />
                  <button type="button" disabled={!revision || checkedThis} onClick={recordCheck} className="rounded-md bg-[#003FC7] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50">
                    {checkedThis ? "This artwork is checked in 3D" : "I've checked this artwork in 3D"}
                  </button>
                </div>
              ) : null}
            </aside>
          ) : null}
        </main>
      </div>
    </AppShell>
  );
}
