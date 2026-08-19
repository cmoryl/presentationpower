import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Eye, Users, Share2, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useSignedIn } from "@/components/CloudDeckControls";
import { getLibraryAnalytics, type DeckAnalyticsSummary } from "@/lib/deck-analytics.functions";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · TransPerfect Element" },
      {
        name: "description",
        content:
          "Library-wide deck engagement analytics: views, unique viewers, and top-performing decks.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const signedIn = useSignedIn();
  const fetchAnalytics = useServerFn(getLibraryAnalytics);
  const [data, setData] = useState<DeckAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAnalytics()
      .then((r) => setData(r))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [signedIn, fetchAnalytics]);

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#03002C] via-[#0B2A4A] to-[#003FC7] p-10 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#A1FBF9]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#C2A3FF]/20 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-[0.35em] text-[#A1FBF9]">Analytics</div>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Which decks earn attention.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            Library-wide engagement across every shareable deck you've published. Track views,
            unique viewers, and the last 30 days of momentum.
          </p>
        </div>
      </section>

      {!signedIn ? (
        <EmptyState
          title="Sign in to see analytics"
          body="Shareable links, view counts, and engagement trends unlock once you're signed in."
          cta={
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Sign in <ArrowRight size={14} />
            </Link>
          }
        />
      ) : loading ? (
        <div className="mt-8 rounded-2xl border border-black/10 bg-white/60 p-10 text-center text-sm text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
          Loading analytics…
        </div>
      ) : err ? (
        <div className="mt-8 rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-6 text-sm text-red-600 dark:text-red-300">
          {err}
        </div>
      ) : !data || data.totalDecks === 0 ? (
        <EmptyState
          title="No decks yet"
          body="Assemble your first deck to start tracking engagement."
          cta={
            <Link
              to="/brief/new"
              className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Sparkles size={14} /> Start a brief
            </Link>
          }
        />
      ) : data.totalViews === 0 ? (
        <EmptyState
          title="No views recorded yet"
          body={`You have ${data.totalDecks} deck${data.totalDecks === 1 ? "" : "s"}${data.sharedDecks > 0 ? ` and ${data.sharedDecks} shareable link${data.sharedDecks === 1 ? "" : "s"}` : ""}. Share a deck to start collecting analytics.`}
          cta={
            data.sharedDecks === 0 ? (
              <div className="text-xs text-black/50 dark:text-white/50">
                Enable sharing from any deck's Share menu.
              </div>
            ) : null
          }
        />
      ) : (
        <>
          {/* KPI STRIP */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={<Eye size={16} />}
              label="Total views"
              value={data.totalViews.toLocaleString()}
            />
            <Kpi
              icon={<Users size={16} />}
              label="Unique viewers"
              value={data.uniqueViewers.toLocaleString()}
            />
            <Kpi
              icon={<Share2 size={16} />}
              label="Shared decks"
              value={`${data.sharedDecks} / ${data.totalDecks}`}
            />
            <Kpi
              icon={<TrendingUp size={16} />}
              label="Views · 30 days"
              value={data.trend.reduce((n, d) => n + d.views, 0).toLocaleString()}
            />
          </div>

          {/* TREND */}
          <section className="mt-8 rounded-2xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-[#003FC7] dark:text-[#A1FBF9]" />
              <div className="text-[10px] uppercase tracking-widest text-black/60 dark:text-white/60">
                Views · Last 30 days
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "currentColor", fillOpacity: 0.5, fontSize: 10 }}
                    tickFormatter={(d: string) => d.slice(5)}
                    axisLine={false}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "currentColor", fillOpacity: 0.5, fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(7,6,31,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#003FC7"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#A1FBF9" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* TOP DECKS */}
          <section className="mt-8 rounded-2xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[#003FC7] dark:text-[#A1FBF9]" />
                <div className="text-[10px] uppercase tracking-widest text-black/60 dark:text-white/60">
                  Top decks
                </div>
              </div>
              <div className="text-[10px] text-black/40 dark:text-white/40">Sorted by views</div>
            </div>
            <div className="overflow-hidden rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/[0.03] text-[10px] uppercase tracking-widest text-black/50 dark:bg-white/[0.04] dark:text-white/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Deck</th>
                    <th className="px-4 py-3 font-medium">Views</th>
                    <th className="px-4 py-3 font-medium">Viewers</th>
                    <th className="px-4 py-3 font-medium">Last viewed</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.topDecks.map((d) => (
                    <tr
                      key={d.deckId}
                      className="border-t border-black/[0.05] transition hover:bg-black/[0.02] dark:border-white/[0.05] dark:hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <div className="truncate font-medium text-black dark:text-white">
                          {d.title || "Untitled deck"}
                        </div>
                        {d.shareToken && (
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#003FC7] dark:text-[#A1FBF9]">
                            <Share2 size={12} /> Shared
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-black dark:text-white">
                        {d.views}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-black/70 dark:text-white/70">
                        {d.uniqueViewers}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-black/60 dark:text-white/60">
                        {d.lastViewedAt ? relTime(d.lastViewedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.shareToken ? (
                          <Link
                            to="/share/$token"
                            params={{ token: d.shareToken }}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-[10px] font-medium text-black/70 hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/30"
                          >
                            View <ArrowRight size={12} />
                          </Link>
                        ) : (
                          <span className="text-[10px] text-black/30 dark:text-white/30">
                            Not shared
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-black/60 dark:text-white/60">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">
          {icon}
        </span>
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold tabular-nums text-black dark:text-white">
        {value}
      </div>
    </div>
  );
}

function EmptyState({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-white/50 p-12 text-center dark:border-white/15 dark:bg-white/[0.03]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#003FC7]/10 text-[#003FC7] dark:bg-[#A1FBF9]/10 dark:text-[#A1FBF9]">
        <BarChart3 size={20} />
      </div>
      <div className="mt-4 text-lg font-semibold text-black dark:text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-sm text-black/60 dark:text-white/60">{body}</p>
      {cta && <div className="mt-5 flex justify-center">{cta}</div>}
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
