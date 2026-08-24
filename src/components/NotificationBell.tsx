// Header notification inbox: unread badge, recent alerts, channel switches.
//
// Renders nothing for signed-out visitors — there is no inbox to show.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  getNotificationPrefs,
  listNotifications,
  markNotificationsRead,
  updateNotificationPrefs,
  type NotificationRow,
} from "@/lib/notifications.functions";

const KIND_META: Record<string, { label: string; dot: string }> = {
  comment: { label: "Comment", dot: "bg-[#003FC7]" },
  approved: { label: "Approved", dot: "bg-[#A6FA87]" },
  changes_requested: { label: "Changes requested", dot: "bg-[#FF9B70]" },
  submitted: { label: "Sent for review", dot: "bg-[#C2A3FF]" },
};

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const userId = useSessionUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const fetchList = useServerFn(listNotifications);
  const fetchPrefs = useServerFn(getNotificationPrefs);
  const markRead = useServerFn(markNotificationsRead);
  const savePrefs = useServerFn(updateNotificationPrefs);

  const inbox = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchList({ data: { limit: 20 } }),
    enabled: Boolean(userId),
    // Light polling keeps the badge current without a realtime channel.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const prefs = useQuery({
    queryKey: ["notification-prefs", userId],
    queryFn: () => fetchPrefs({}),
    enabled: Boolean(userId) && showPrefs,
  });

  const markAll = useMutation({
    mutationFn: () => markRead({ data: { all: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const setPrefs = useMutation({
    mutationFn: (next: { inappEnabled: boolean; emailEnabled: boolean }) =>
      savePrefs({ data: next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification-prefs", userId] }),
  });

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = inbox.data?.unread ?? 0;
  const rows: NotificationRow[] = useMemo(() => inbox.data?.notifications ?? [], [inbox.data]);

  if (!userId) return null;

  const openItem = async (n: NotificationRow) => {
    setOpen(false);
    if (!n.read_at) {
      await markRead({ data: { ids: [n.id] } }).catch(() => undefined);
      void qc.invalidateQueries({ queryKey: ["notifications", userId] });
    }
    // Links are app-authored paths (e.g. /approvals?request=…), not typed routes.
    if (n.link) void navigate({ to: n.link as never });
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread ? `Notifications — ${unread} unread` : "Notifications"}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/[0.06] bg-white/60 text-[#03002C] transition hover:bg-white dark:!border-white/10 dark:!bg-white/[0.04] dark:!text-white"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
          <path
            strokeWidth="1.6"
            strokeLinecap="round"
            d="M6 9a6 6 0 1 1 12 0c0 3.2.7 4.9 1.5 5.9.4.5 0 1.1-.6 1.1H5.1c-.6 0-1-.6-.6-1.1C5.3 13.9 6 12.2 6 9Z"
          />
          <path strokeWidth="1.6" strokeLinecap="round" d="M9.5 19a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-[#EC388A] px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 w-[360px] max-w-[92vw] pt-2">
          <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/85 [backdrop-filter:blur(28px)_saturate(180%)] shadow-[0_20px_60px_-15px_rgba(11,42,74,0.35)] dark:!border-white/10 dark:!bg-[#0B0A2A]/90">
            <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] px-3 py-2 dark:!border-white/10">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                Notifications
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => markAll.mutate()}
                  disabled={!unread || markAll.isPending}
                  className="rounded-lg px-2 py-1 text-[12px] text-black/60 transition hover:bg-black/[0.04] disabled:opacity-40 dark:text-white/60 dark:hover:!bg-white/10"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrefs((v) => !v)}
                  aria-label="Notification settings"
                  className="rounded-lg px-2 py-1 text-[12px] text-black/60 transition hover:bg-black/[0.04] dark:text-white/60 dark:hover:!bg-white/10"
                >
                  Settings
                </button>
              </div>
            </div>

            {showPrefs && (
              <div className="border-b border-black/[0.06] px-3 py-2.5 dark:!border-white/10">
                {[
                  { key: "inappEnabled" as const, label: "In-app alerts" },
                  { key: "emailEnabled" as const, label: "Email alerts" },
                ].map((row) => {
                  const current = {
                    inappEnabled: prefs.data?.inappEnabled ?? true,
                    emailEnabled: prefs.data?.emailEnabled ?? true,
                  };
                  return (
                    <label
                      key={row.key}
                      className="flex min-h-9 items-center justify-between gap-3 text-[13px] text-black/75 dark:text-white/75"
                    >
                      {row.label}
                      <input
                        type="checkbox"
                        checked={current[row.key]}
                        onChange={(e) =>
                          setPrefs.mutate({ ...current, [row.key]: e.target.checked })
                        }
                        className="h-4 w-4 accent-[#003FC7]"
                      />
                    </label>
                  );
                })}
                <p className="mt-1 text-[11px] leading-snug text-black/45 dark:text-white/45">
                  Email alerts start sending once a sender domain is verified for this workspace.
                </p>
              </div>
            )}

            <div className="max-h-[60vh] overflow-y-auto">
              {inbox.isLoading && (
                <div className="px-3 py-6 text-center text-[13px] text-black/50 dark:text-white/50">
                  Loading…
                </div>
              )}
              {!inbox.isLoading && !rows.length && (
                <div className="px-4 py-7 text-center text-[13px] leading-relaxed text-black/55 dark:text-white/55">
                  No alerts yet. You&rsquo;ll hear from us when a deck of yours is commented on,
                  approved, or sent back for changes.
                </div>
              )}
              {rows.map((n) => {
                const meta = KIND_META[n.kind] ?? { label: n.kind, dot: "bg-black/30" };
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => void openItem(n)}
                    className={`flex w-full items-start gap-2.5 border-b border-black/[0.04] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-black/[0.03] dark:!border-white/[0.06] dark:hover:!bg-white/[0.05] ${
                      n.read_at ? "" : "bg-[#003FC7]/[0.04] dark:!bg-white/[0.04]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-[#03002C] dark:text-white">
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-black/40 dark:text-white/40">
                          {relative(n.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
                        {meta.label}
                      </span>
                      {n.body && (
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-black/60 dark:text-white/60">
                          {n.body}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
