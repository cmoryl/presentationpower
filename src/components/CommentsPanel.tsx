import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Send, Trash2, Check, RotateCcw, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";
import {
  listDeckComments,
  postDeckComment,
  updateDeckComment,
  deleteDeckComment,
} from "@/lib/deck-collab.functions";

type Comment = {
  id: string;
  deck_id: string;
  author_id: string;
  parent_id: string | null;
  slide_index: number | null;
  body: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
};

function relativeTime(iso: string) {
  const t = new Date(iso).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function CommentsPanel({
  localDeckId,
  slideIndex,
  onCountChange,
}: {
  localDeckId: string;
  slideIndex: number | null;
  onCountChange?: (unresolvedBySlide: Map<number | "deck", number>) => void;
}) {
  const list = useServerFn(listDeckComments);
  const post = useServerFn(postDeckComment);
  const update = useServerFn(updateDeckComment);
  const del = useServerFn(deleteDeckComment);

  const [userId, setUserId] = useState<string | null>(null);
  const [cloudId, setCloudId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [scope, setScope] = useState<"slide" | "deck">(slideIndex == null ? "deck" : "slide");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) setCloudId(deckCloudId(uid, localDeckId));
    });
  }, [localDeckId]);

  useEffect(() => {
    setScope(slideIndex == null ? "deck" : "slide");
  }, [slideIndex]);

  const refresh = useCallback(async () => {
    if (!cloudId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await list({ data: { deckId: cloudId } });
      setComments(res.comments as Comment[]);
      setAuthors(res.authors);
      if (onCountChange) {
        const m = new Map<number | "deck", number>();
        for (const c of res.comments as Comment[]) {
          if (c.resolved || c.parent_id) continue;
          const key: number | "deck" = c.slide_index == null ? "deck" : c.slide_index;
          m.set(key, (m.get(key) ?? 0) + 1);
        }
        onCountChange(m);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cloudId, list, onCountChange]);

  useEffect(() => {
    if (!cloudId) return;
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const iv = window.setInterval(refresh, 20000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(iv);
    };
  }, [cloudId, refresh]);

  if (!userId) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
        Sign in to view and post comments.
      </div>
    );
  }
  if (!cloudId) return null;

  const visibleScopeIdx = scope === "slide" ? slideIndex : null;
  const threads = comments
    .filter((c) => !c.parent_id)
    .filter((c) => (scope === "deck" ? c.slide_index == null : c.slide_index === visibleScopeIdx))
    .filter((c) => (showResolved ? true : !c.resolved));
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const arr = repliesByParent.get(c.parent_id) ?? [];
      arr.push(c);
      repliesByParent.set(c.parent_id, arr);
    }
  }

  async function submitTop() {
    if (!body.trim() || busy || !cloudId) return;
    setBusy(true);
    try {
      await post({
        data: {
          deckId: cloudId,
          body: body.trim(),
          slideIndex: scope === "slide" ? slideIndex : null,
        },
      });
      setBody("");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReply(parentId: string, parentSlideIdx: number | null) {
    if (!replyBody.trim() || busy || !cloudId) return;
    setBusy(true);
    try {
      await post({
        data: {
          deckId: cloudId,
          body: replyBody.trim(),
          slideIndex: parentSlideIdx,
          parentId,
        },
      });
      setReplyBody("");
      setReplyTo(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolved(c: Comment) {
    setBusy(true);
    try {
      await update({ data: { id: c.id, resolved: !c.resolved } });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Comment) {
    if (!confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      await del({ data: { id: c.id } });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2 text-sm font-medium text-black dark:text-white">
          <MessageSquare size={14} /> Comments
          {loading && <Loader2 size={12} className="animate-spin text-foreground/40" />}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setScope("slide")}
            disabled={slideIndex == null}
            className={`rounded-full px-2.5 py-1 transition ${
              scope === "slide"
                ? "bg-[#003FC7] text-white"
                : "border border-black/15 bg-white/70 text-black/70 hover:border-black/30 disabled:opacity-40 dark:border-white/15 dark:bg-white/5 dark:text-white/70"
            }`}
          >
            Slide {slideIndex != null ? String(slideIndex + 1).padStart(2, "0") : ""}
          </button>
          <button
            onClick={() => setScope("deck")}
            className={`rounded-full px-2.5 py-1 transition ${
              scope === "deck"
                ? "bg-[#003FC7] text-white"
                : "border border-black/15 bg-white/70 text-black/70 hover:border-black/30 dark:border-white/15 dark:bg-white/5 dark:text-white/70"
            }`}
          >
            Deck
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto px-4 py-3">
        {error && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}
        {threads.length === 0 && !loading && (
          <div className="py-6 text-center text-xs text-black/50 dark:text-white/50">
            No {showResolved ? "" : "open "}comments {scope === "slide" ? "on this slide" : "on the deck"}.
          </div>
        )}
        <div className="space-y-3">
          {threads.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            const canEdit = c.author_id === userId;
            return (
              <div
                key={c.id}
                className={`rounded-xl border p-3 text-sm ${
                  c.resolved
                    ? "border-black/5 bg-black/[0.02] opacity-70 dark:border-white/5 dark:bg-white/[0.02]"
                    : "border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-xs font-medium text-black/80 dark:text-white/80">
                    {authors[c.author_id] ?? "Member"}
                    <span className="ml-2 font-normal text-black/40 dark:text-white/40">
                      {relativeTime(c.created_at)}
                    </span>
                    {c.slide_index != null && scope === "deck" && (
                      <span className="ml-2 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-black/60 dark:bg-white/10 dark:text-white/60">
                        Slide {String(c.slide_index + 1).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleResolved(c)}
                      disabled={busy}
                      title={c.resolved ? "Unresolve" : "Resolve"}
                      className="rounded p-1 text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                    >
                      {c.resolved ? <RotateCcw size={12} /> : <Check size={12} />}
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => remove(c)}
                        disabled={busy}
                        title="Delete"
                        className="rounded p-1 text-icon-muted hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-black dark:text-white/90">{c.body}</div>

                {replies.length > 0 && (
                  <div className="mt-2 space-y-2 border-l-2 border-black/10 pl-3 dark:border-white/10">
                    {replies.map((r) => (
                      <div key={r.id} className="text-xs">
                        <div className="flex items-center justify-between">
                          <div className="text-black/70 dark:text-white/70">
                            <span className="font-medium">{authors[r.author_id] ?? "Member"}</span>
                            <span className="ml-2 text-black/40 dark:text-white/40">{relativeTime(r.created_at)}</span>
                          </div>
                          {r.author_id === userId && (
                            <button
                              onClick={() => remove(r)}
                              className="rounded p-0.5 text-icon-subtle hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <div className="mt-0.5 whitespace-pre-wrap text-black/90 dark:text-white/85">{r.body}</div>
                      </div>
                    ))}
                  </div>
                )}

                {replyTo === c.id ? (
                  <div className="mt-2 flex items-start gap-2">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="Reply…"
                      className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-black outline-none focus:border-[#003FC7] dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => submitReply(c.id, c.slide_index)}
                        disabled={busy || !replyBody.trim()}
                        className="rounded-lg bg-[#003FC7] px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        <Send size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setReplyTo(null);
                          setReplyBody("");
                        }}
                        className="rounded-lg border border-black/10 px-2 py-1 text-xs text-black/70 dark:border-white/10 dark:text-white/70"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyTo(c.id)}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-black/50 hover:text-[#003FC7] dark:text-white/50"
                  >
                    <ChevronRight size={12} /> Reply
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setShowResolved((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
        >
          <ChevronDown size={12} className={showResolved ? "rotate-180" : ""} />
          {showResolved ? "Hide" : "Show"} resolved
        </button>
      </div>

      <div className="border-t border-black/10 p-3 dark:border-white/10">
        <div className="flex items-start gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder={
              scope === "slide" && slideIndex != null
                ? `Comment on slide ${String(slideIndex + 1).padStart(2, "0")}…`
                : "Add a deck-level comment…"
            }
            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-[#003FC7] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            onClick={submitTop}
            disabled={busy || !body.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#003FC7] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
