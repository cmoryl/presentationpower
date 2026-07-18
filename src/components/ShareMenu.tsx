import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Share2, Play, Printer, FileDown, ChevronDown, Link2, Copy, Check, Loader2 } from "lucide-react";
import { useDeckStore, type Deck, type Brief } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";
import { saveDeckToCloud } from "@/lib/cloud-decks.functions";
import {
  enableDeckSharing,
  disableDeckSharing,
  getDeckShareStatus,
  getShareAnalytics,
} from "@/lib/deck-sharing.functions";

export function ShareMenu({ deckId }: { deckId: string }) {
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const save = useServerFn(saveDeckToCloud);
  const getStatus = useServerFn(getDeckShareStatus);
  const enableFn = useServerFn(enableDeckSharing);
  const disableFn = useServerFn(disableDeckSharing);
  const getAnalytics = useServerFn(getShareAnalytics);

  type Analytics = { totalViews: number; uniqueSessions: number; lastViewedAt: string | null; avgMaxSlide: number };
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
      setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(!!s);
      setUserId(s?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const cloudDeckId = userId && deck ? deckCloudId(userId, deck.id) : null;

  // On menu open, fetch current share status (best-effort).
  useEffect(() => {
    if (!open || !cloudDeckId) return;
    let cancelled = false;
    getStatus({ data: { deckId: cloudDeckId } })
      .then((r) => !cancelled && setShareToken(r.token))
      .catch(() => !cancelled && setShareToken(null));
    return () => {
      cancelled = true;
    };
  }, [open, cloudDeckId, getStatus]);

  if (!deck) return null;
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0];
  const stamp = (kind: "pptx" | "pdf" | "present") =>
    setDeckContext(deckId, { lastExportedAt: new Date().toISOString(), lastExportKind: kind });

  const onPresent = () => {
    stamp("present");
    setOpen(false);
    navigate({ to: "/decks/$deckId/present", params: { deckId } });
  };
  const onPrint = () => {
    stamp("pdf");
    setOpen(false);
    window.open(`/decks/${deckId}/print`, "_blank", "noopener,noreferrer");
  };
  const onPptx = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exportDeckToPptx(deck, brand, { strategy: deck.context?.strategy ?? null });
      stamp("pptx");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const shareUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`
    : null;

  async function ensureCloudSaved(): Promise<string> {
    if (!deck || !brief || !cloudDeckId) throw new Error("Missing deck/brief context");
    // Persist client logo URL into context so the shared payload can render it.
    const clientLogoUrl = deck.clientLogo?.primaryUrl ?? null;
    const nextContext = { ...(deck.context ?? {}), ...(clientLogoUrl ? { clientLogoUrl } : {}) };
    const deckToSave: Deck = { ...deck, context: nextContext };
    await save({ data: { deck: deckToSave, brief: brief as Brief } });
    return cloudDeckId;
  }

  async function onEnableShare() {
    if (!signedIn) {
      navigate({ to: "/auth" });
      return;
    }
    setShareBusy(true);
    setShareErr(null);
    try {
      const id = await ensureCloudSaved();
      const res = await enableFn({ data: { deckId: id } });
      setShareToken(res.token);
    } catch (e) {
      setShareErr(e instanceof Error ? e.message : "Could not enable sharing");
    } finally {
      setShareBusy(false);
    }
  }

  async function onDisableShare() {
    if (!cloudDeckId) return;
    setShareBusy(true);
    setShareErr(null);
    try {
      await disableFn({ data: { deckId: cloudDeckId } });
      setShareToken(null);
    } catch (e) {
      setShareErr(e instanceof Error ? e.message : "Could not disable sharing");
    } finally {
      setShareBusy(false);
    }
  }

  async function onCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // no-op
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 py-2 text-sm font-medium text-black backdrop-blur hover:border-black/30 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/30"
      >
        <Share2 size={14} />
        Share
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#07061F]/95">
          <div className="border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
            <div className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Share &amp; export</div>
            <div className="mt-0.5 truncate text-sm font-medium text-black dark:text-white">{deck.title}</div>
          </div>

          {/* Share link section */}
          <div className="border-b border-black/[0.06] px-4 py-3 dark:border-white/10">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-black/50 dark:text-white/50">
              <Link2 size={12} /> Share link
            </div>
            {!signedIn ? (
              <button
                type="button"
                onClick={() => navigate({ to: "/auth" })}
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-left text-xs text-black hover:border-black/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              >
                Sign in to create a shareable view-only link.
              </button>
            ) : shareToken && shareUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.05]">
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 truncate bg-transparent text-[11px] text-black/80 outline-none dark:text-white/80"
                  />
                  <button
                    type="button"
                    onClick={onCopyLink}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#003FC7] px-2 py-1 text-[10px] font-medium text-white hover:opacity-90"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-black/50 dark:text-white/50">
                  <span>Anyone with the link can view.</span>
                  <button
                    type="button"
                    onClick={onDisableShare}
                    disabled={shareBusy}
                    className="text-black/70 underline underline-offset-2 hover:text-black disabled:opacity-50 dark:text-white/70 dark:hover:text-white"
                  >
                    {shareBusy ? "Working…" : "Disable"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onEnableShare}
                disabled={shareBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#003FC7] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {shareBusy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                {shareBusy ? "Preparing…" : "Create view-only link"}
              </button>
            )}
            {shareErr && <div className="mt-2 text-[10px] text-red-500">{shareErr}</div>}
          </div>

          <ShareItem
            icon={<Play size={16} />}
            title="Present"
            hint="Fullscreen, keyboard nav"
            onClick={onPresent}
          />
          <ShareItem
            icon={<Printer size={16} />}
            title="Export PDF"
            hint="Print → Save as PDF"
            onClick={onPrint}
          />
          <ShareItem
            icon={<FileDown size={16} />}
            title={busy ? "Preparing…" : "Export PowerPoint"}
            hint="Native .pptx with brand logo"
            onClick={onPptx}
            disabled={busy}
          />
          <div className="border-t border-black/[0.06] px-4 py-2 text-[10px] text-black/50 dark:border-white/10 dark:text-white/50">
            <Link to="/decks/$deckId/export" params={{ deckId }} className="hover:text-black dark:hover:text-white">
              Advanced export &amp; QA →
            </Link>
            {deck.context?.lastExportedAt && (
              <div className="mt-1">
                Last {deck.context.lastExportKind ?? "export"}:{" "}
                {new Date(deck.context.lastExportedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ShareItem({
  icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-black/[0.03] disabled:opacity-50 dark:hover:bg-white/[0.05]"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-black dark:text-white">{title}</span>
        <span className="block text-[11px] text-black/50 dark:text-white/50">{hint}</span>
      </span>
    </button>
  );
}
