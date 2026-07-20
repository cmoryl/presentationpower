import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, Clock, AlertCircle, FileEdit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";
import { getDeckReviewStatus, setDeckReviewStatus } from "@/lib/deck-collab.functions";

export type ReviewStatus = "draft" | "in_review" | "approved" | "changes_requested";

const STATUS_META: Record<
  ReviewStatus,
  { label: string; classes: string; Icon: typeof CheckCircle2 }
> = {
  draft: {
    label: "Draft",
    classes: "border-black/15 bg-white/70 text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/70",
    Icon: FileEdit,
  },
  in_review: {
    label: "In review",
    classes: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200",
    Icon: Clock,
  },
  approved: {
    label: "Approved",
    classes: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200",
    Icon: CheckCircle2,
  },
  changes_requested: {
    label: "Changes requested",
    classes: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200",
    Icon: AlertCircle,
  },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const meta = STATUS_META[status];
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.classes}`}
    >
      <Icon size={11} /> {meta.label}
    </span>
  );
}

export function ReviewStatusControl({ localDeckId }: { localDeckId: string }) {
  const getStatus = useServerFn(getDeckReviewStatus);
  const setStatus = useServerFn(setDeckReviewStatus);

  const [userId, setUserId] = useState<string | null>(null);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const [status, setStatusLocal] = useState<ReviewStatus>("draft");
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [found, setFound] = useState(false);
  const [note, setNote] = useState("");
  const [noteFor, setNoteFor] = useState<null | "approved" | "changes_requested">(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) setCloudId(deckCloudId(uid, localDeckId));
    });
  }, [localDeckId]);

  const load = useCallback(async () => {
    if (!cloudId) return;
    try {
      const res = await getStatus({ data: { deckId: cloudId } });
      if (res.found) {
        setFound(true);
        setStatusLocal((res.deck.review_status as ReviewStatus) ?? "draft");
        setIsOwner(res.isOwner);
        setIsAdmin(res.isAdmin);
      } else {
        setFound(false);
      }
    } catch {
      setFound(false);
    }
  }, [cloudId, getStatus]);

  useEffect(() => {
    if (cloudId) void load();
  }, [cloudId, load]);

  async function apply(next: ReviewStatus, withNote?: string) {
    if (!cloudId) return;
    setBusy(true);
    try {
      await setStatus({ data: { deckId: cloudId, status: next, note: withNote } });
      setStatusLocal(next);
      setNote("");
      setNoteFor(null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!userId) return null;
  if (!found) {
    // Not saved to cloud yet — show a subtle badge only
    return <ReviewStatusBadge status="draft" />;
  }

  return (
    <div className="flex items-center gap-2">
      <ReviewStatusBadge status={status} />
      {noteFor ? (
        <div className="flex items-center gap-1">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
            placeholder={noteFor === "approved" ? "Optional approval note…" : "What needs to change?"}
            className="w-56 rounded-full border border-black/15 bg-white px-3 py-1 text-xs text-black outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/5 dark:text-white"
          />
          <button
            onClick={() => apply(noteFor, note.trim() || undefined)}
            disabled={busy}
            className="rounded-full bg-[#003FC7] px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : "Send"}
          </button>
          <button
            onClick={() => {
              setNoteFor(null);
              setNote("");
            }}
            className="rounded-full border border-black/15 px-2 py-1 text-xs text-black/60 dark:border-white/15 dark:text-white/60"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          {(status === "draft" || status === "changes_requested") && (isOwner || isAdmin) && (
            <button
              onClick={() => apply("in_review")}
              disabled={busy}
              className="rounded-full border border-black/15 bg-white/70 px-2.5 py-1 text-xs font-medium text-black hover:border-black/30 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:border-white/30"
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : "Submit for review"}
            </button>
          )}
          {status === "in_review" && isAdmin && (
            <>
              <button
                onClick={() => setNoteFor("approved")}
                disabled={busy}
                className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => setNoteFor("changes_requested")}
                disabled={busy}
                className="rounded-full bg-rose-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Request changes
              </button>
            </>
          )}
          {status === "approved" && (isOwner || isAdmin) && (
            <button
              onClick={() => apply("draft")}
              disabled={busy}
              className="rounded-full border border-black/15 px-2.5 py-1 text-xs text-black/60 hover:border-black/30 disabled:opacity-50 dark:border-white/15 dark:text-white/60 dark:hover:border-white/30"
            >
              Reopen
            </button>
          )}
        </>
      )}
    </div>
  );
}
