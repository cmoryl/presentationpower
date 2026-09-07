// 3D viewer window for a London asset, served by BoothHUB.
//
// A full-screen dialog holding BoothHUB's read-only stand walkthrough in an
// iframe. The URL carries the public/embed flags, so the viewer loads without a
// BoothHUB sign-in and without its app chrome. Escape closes; the header keeps
// a link out to the full BoothHUB page for anyone who wants the editor.

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, PencilRuler, X } from "lucide-react";

import {
  BOOTHHUB_DIVISION_LABEL,
  boothHub3dEmbedUrl,
  boothHub3dPageUrl,
  boothHubBuilderUrl,
  boothHubShareSetupUrl,
  parseBoothHubShareToken,
  type BoothHub3dPlacement,
  type BoothHubDivisionId,
} from "@/lib/boothhub-3d";

/** Where a division's pasted share link is remembered between sessions. */
const shareKey = (division: string) => `boothhub:share:${division}`;



export interface BoothHub3DViewerProps {
  /** Asset name shown in the header. */
  title: string;
  /** Venue room, shown beside the title. */
  room?: string | null;
  division: BoothHubDivisionId;
  /**
   * Live placement of the asset on the plan. Editing a pin or a scenic build
   * changes this, which re-loads the walkthrough so the 3D view always shows
   * the current position, facing and size.
   */
  placement?: BoothHub3dPlacement | null;
  onClose: () => void;
}

export function BoothHub3DViewer({
  title,
  room,
  division,
  placement,
  onClose,
}: BoothHub3DViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [synced, setSynced] = useState(false);
  // The saved BoothHUB build to show. Their viewer only has a stand when a
  // build exists for this division under this plan name, so let people point at
  // one instead of silently landing on "Booth unavailable".
  const [planDraft, setPlanDraft] = useState("");
  const [plan, setPlan] = useState("");
  // A BoothHUB share link opens the same build with no BoothHUB sign-in at all,
  // so anyone here can view it. Remembered per division once pasted.
  const [shareDraft, setShareDraft] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(shareKey(division));
      const token = parseBoothHubShareToken(saved);
      setShareDraft(saved ?? "");
      setShareToken(token);
    } catch {
      /* storage unavailable — the plan-name route still works */
    }
  }, [division]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Keyed on the placement's values, not its object identity: the plan builds a
  // fresh record on every render, which would otherwise reload the build endlessly.
  const placeKey = JSON.stringify(placement ?? null);
  const embedUrl = useMemo(
    () =>
      boothHub3dEmbedUrl({
        division,
        label: title,
        room,
        placement,
        variant: plan || null,
        shareToken,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [division, title, room, placeKey, plan, shareToken],
  );



  // Every plan edit produces a new URL. Reload the build on it and flash a
  // short "updated" note so the change is visible, not silent.
  const firstUrl = useRef(embedUrl);
  useEffect(() => {
    if (embedUrl === firstUrl.current) return;
    firstUrl.current = embedUrl;
    setLoaded(false);
    setSynced(true);
    const t = window.setTimeout(() => setSynced(false), 2600);
    return () => window.clearTimeout(t);
  }, [embedUrl]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} in 3D`}
      className="fixed inset-0 z-[60] flex flex-col bg-[#03002C]/80 p-3 backdrop-blur-sm sm:p-5"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#F7F9FC] shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-[#03002C]">{title} — 3D view</h2>
            <p className="mt-0.5 text-[11.5px] text-[#03002C]/60">
              {room ? `${room} · ` : ""}
              {BOOTHHUB_DIVISION_LABEL[division]} stand build. Drag to orbit, scroll to zoom. Press
              Escape to close.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={boothHub3dPageUrl({ division, placement, variant: plan || null, shareToken })}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#003FC7]/35 bg-white px-4 py-2 text-[13px] font-semibold text-[#003FC7] hover:bg-[#E0E8F5]"
            >
              <ExternalLink className="h-4 w-4" /> Open in BoothHUB
            </a>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-4 py-2 text-[13px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 bg-[#03002C]">
          {!loaded ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-white/80">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the 3D build…
            </div>
          ) : null}
          {synced ? (
            <p className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-[#003FC7] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-lg">
              Updated from your plan edit
            </p>
          ) : null}
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={`${title} 3D viewer`}
            onLoad={() => setLoaded(true)}
            allow="fullscreen; xr-spatial-tracking"
            className="h-full w-full border-0"
          />
        </div>
        <footer className="flex flex-wrap items-end gap-3 border-t border-black/10 bg-white px-4 py-3">
          <p className="min-w-[220px] flex-1 text-[11.5px] leading-[1.45] text-[#03002C]/65">
            {shareToken ? (
              <>
                Showing this stand through a BoothHUB share link, so it opens for anyone here
                without a BoothHUB sign-in.
              </>
            ) : (
              <>
                Seeing “Booth unavailable”? Without a BoothHUB sign-in this window can only show a
                stand that has been shared. Paste the {BOOTHHUB_DIVISION_LABEL[division]} share link
                from BoothHUB below — it is remembered, so everyone here sees the build from then on.
              </>
            )}
          </p>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const token = parseBoothHubShareToken(shareDraft);
              setLoaded(false);
              setShareToken(token);
              try {
                if (token) window.localStorage.setItem(shareKey(division), shareDraft.trim());
                else window.localStorage.removeItem(shareKey(division));
              } catch {
                /* storage unavailable */
              }
            }}
          >
            <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-[#03002C]">
              Share link
              <input
                value={shareDraft}
                onChange={(e) => setShareDraft(e.target.value)}
                placeholder="boothhub.lovable.app/booth-review/…"
                className="w-64 rounded-full border border-[#03002C]/20 bg-white px-3 py-1.5 text-[12.5px] font-normal text-[#03002C] outline-none focus:border-[#003FC7] focus:ring-2 focus:ring-[#003FC7]/25"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-[#03002C]">
              Plan name
              <input
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                placeholder="default"
                className="w-32 rounded-full border border-[#03002C]/20 bg-white px-3 py-1.5 text-[12.5px] font-normal text-[#03002C] outline-none focus:border-[#003FC7] focus:ring-2 focus:ring-[#003FC7]/25"
              />
            </label>
            <button
              type="submit"
              onClick={() => setPlan(planDraft.trim())}
              className="rounded-full bg-[#003FC7] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#03002C]"
            >
              Show
            </button>
          </form>
          <a
            href={boothHubShareSetupUrl(division)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#003FC7]/35 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#003FC7] hover:bg-[#E0E8F5]"
          >
            Get a share link
          </a>

          <a
            href={boothHubBuilderUrl(division)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
          >
            <PencilRuler className="h-4 w-4" /> Build this stand
          </a>
        </footer>

      </div>
    </div>
  );
}
