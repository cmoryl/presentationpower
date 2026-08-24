// Admin broadcast: compose a custom alert and send it to everyone, a role, or
// a hand-picked set of members. Delivery reuses the notification fan-out, so
// each member's in-app / email preferences are respected automatically.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Search, Send } from "lucide-react";
import { listAlertRecipients, sendAdminAlert } from "@/lib/admin-alerts.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { AdminPageHeader, AdminLoading } from "@/components/admin/AdminPage";

export const Route = createFileRoute("/admin/alerts")({
  head: () => ({
    meta: [
      { title: "Send an alert · Admin · TransPerfect Element" },
      {
        name: "description",
        content:
          "Broadcast a custom announcement to every Element member, a single role, or a hand-picked list.",
      },
      { property: "og:title", content: "Send an alert · Admin · TransPerfect Element" },
      {
        property: "og:description",
        content: "Broadcast a custom announcement to Element members from the admin console.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsView,
});

type Audience = "all" | "role" | "selected";

const ROLES = ["admin", "editor", "brand_lead", "sales", "viewer", "content_owner"] as const;

function AlertsView() {
  const listFn = useServerFn(listAlertRecipients);
  const sendFn = useServerFn(sendAdminAlert);

  const q = useQuery({
    queryKey: ["admin", "alert-recipients"],
    queryFn: () => listFn({ data: {} }),
    retry: false,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [role, setRole] = useState<string>("admin");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const recipients = q.data?.recipients ?? [];
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return recipients;
    return recipients.filter(
      (r) =>
        (r.email ?? "").toLowerCase().includes(needle) ||
        (r.displayName ?? "").toLowerCase().includes(needle) ||
        r.roles.some((x) => x.toLowerCase().includes(needle)),
    );
  }, [recipients, search]);

  const roleCount = useMemo(
    () => recipients.filter((r) => r.roles.includes(role)).length,
    [recipients, role],
  );
  const targetCount =
    audience === "all" ? recipients.length : audience === "role" ? roleCount : selected.size;

  const send = useMutation({
    mutationFn: () =>
      sendFn({
        data: {
          title: title.trim(),
          body: body.trim() || undefined,
          link: link.trim() || undefined,
          audience,
          role: audience === "role" ? role : undefined,
          userIds: audience === "selected" ? Array.from(selected) : undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Alert sent to ${res.delivered} ${res.delivered === 1 ? "member" : "members"}`);
      setTitle("");
      setBody("");
      setLink("");
      setSelected(new Set());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  const canSend = title.trim().length >= 3 && targetCount > 0 && !send.isPending;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Governance"
        title="Send an alert"
        description="Write a custom announcement and push it to member inboxes. Each recipient's in-app and email preferences are respected."
      />

      {q.isLoading ? (
        <AdminLoading label="Loading members…" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ---- Compose ---- */}
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Megaphone size={16} className="text-[#003FC7]" />
              Message
            </div>

            <label className="mt-4 block text-xs font-medium text-black/60 dark:text-white/60">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Brand guidelines updated"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-foreground focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20 dark:border-white/15 dark:bg-white/[0.04]"
              />
            </label>

            <label className="mt-4 block text-xs font-medium text-black/60 dark:text-white/60">
              Message (optional)
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="The v3.0 palette now includes signed-off CMYK and Pantone builds — re-export any print piece still using the old values."
                className="mt-1 w-full resize-y rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm leading-relaxed text-foreground focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20 dark:border-white/15 dark:bg-white/[0.04]"
              />
              <span className="mt-1 block text-[11px] text-black/45 dark:text-white/45">
                {body.length}/2000
              </span>
            </label>

            <label className="mt-2 block text-xs font-medium text-black/60 dark:text-white/60">
              Link (optional, in-app path)
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/knowledge/brand-guides"
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 font-mono text-xs text-foreground focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20 dark:border-white/15 dark:bg-white/[0.04]"
              />
              <span className="mt-1 block text-[11px] text-black/45 dark:text-white/45">
                Must start with “/” — clicking the alert opens this page.
              </span>
            </label>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/10">
              <button
                type="button"
                disabled={!canSend}
                onClick={() => {
                  if (
                    window.confirm(
                      `Send “${title.trim()}” to ${targetCount} ${targetCount === 1 ? "member" : "members"}?`,
                    )
                  )
                    send.mutate();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-sm font-medium text-white hover:bg-[#0033a8] disabled:opacity-50"
              >
                <Send size={14} />
                {send.isPending ? "Sending…" : `Send to ${targetCount}`}
              </button>
              {title.trim().length > 0 && title.trim().length < 3 && (
                <span className="text-xs text-amber-700">Title needs at least 3 characters.</span>
              )}
            </div>
          </section>

          {/* ---- Audience ---- */}
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-sm font-semibold">Audience</div>
            <div className="mt-3 space-y-2">
              {(
                [
                  ["all", `Everyone (${recipients.length})`],
                  ["role", "By role"],
                  ["selected", "Pick members"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="audience"
                    className="size-4 accent-[#003FC7]"
                    checked={audience === value}
                    onChange={() => setAudience(value)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {audience === "role" && (
              <div className="mt-3">
                <select
                  aria-label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-white/[0.04]"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r} ({recipients.filter((x) => x.roles.includes(r)).length})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audience === "selected" && (
              <div className="mt-3">
                <div className="relative">
                  <Search
                    size={13}
                    className="pointer-events-none absolute left-2.5 top-2.5 text-foreground/40"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search members…"
                    aria-label="Search members"
                    className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 pl-7 text-xs dark:border-white/15 dark:bg-white/[0.04]"
                  />
                </div>
                <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-black/10 dark:border-white/10">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-black/50 dark:text-white/50">
                      No members match that search.
                    </div>
                  ) : (
                    filtered.map((r) => (
                      <label
                        key={r.userId}
                        className="flex cursor-pointer items-start gap-2 border-b border-black/[0.06] px-3 py-2 text-xs last:border-b-0 hover:bg-black/[0.03] dark:border-white/[0.06] dark:hover:bg-white/[0.04]"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 size-3.5 accent-[#003FC7]"
                          checked={selected.has(r.userId)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(r.userId)) next.delete(r.userId);
                              else next.add(r.userId);
                              return next;
                            })
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {r.displayName || r.email || r.userId.slice(0, 8)}
                          </span>
                          <span className="block truncate text-[11px] text-black/50 dark:text-white/50">
                            {r.email ?? "no email"}
                            {r.roles.length ? ` · ${r.roles.join(", ")}` : ""}
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-black/55 dark:text-white/55">
                  {selected.size} selected
                  {selected.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="rounded-full border border-black/15 px-2 py-0.5 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="mt-4 border-t border-black/10 pt-3 text-[11px] leading-relaxed text-black/55 dark:border-white/10 dark:text-white/55">
              Alerts appear in the notification bell immediately. Members who turned email
              notifications off only get the in-app copy.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
