// Master Analytics — command center for admins. Aggregates every signal
// the platform emits: unified usage_events, ai_events, imagery, share
// views, decks, briefs, print, and translations. Ships an AI-authored
// executive summary via the Lovable AI Gateway on demand.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState, Suspense } from "react";
import {
  BarChart3, Bot, Image as ImageIcon, FlaskConical, ArrowRight, Sparkles,
  TrendingUp, TrendingDown, Users, Layers, Download, Share2, FileText, Languages,
  Zap, AlertCircle, RefreshCw,
} from "lucide-react";
import { getMasterAnalytics } from "@/lib/analytics.functions";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Master analytics · Admin · TransPerfect Modular" },
      { name: "description", content: "Every signal, one place: usage, modules, divisions, power users, AI cost, funnel, and AI-authored insights." },
    ],
  }),
  component: MasterAnalyticsPage,
});

function MasterAnalyticsPage() {
  return (
    <div className="pb-16">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">Master analytics</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#03002C] dark:text-white">Analytics command center</h1>
          <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
            Every signal — usage, modules, divisions, power users, AI cost, funnel, and AI-authored insights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuickLink to="/analytics" icon={BarChart3} label="Deck engagement" />
          <QuickLink to="/admin/ai" icon={Bot} label="AI details" />
          <QuickLink to="/admin/imagery-analytics" icon={ImageIcon} label="Imagery" />
          <QuickLink to="/admin/ab" icon={FlaskConical} label="A/B" />
        </div>
      </div>
      <Suspense fallback={<LoadingBlock />}>
        <MasterAnalyticsView />
      </Suspense>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof BarChart3; label: string }) {
  return (
    <Link
      to={to as never}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-[#03002C] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#003FC7]/40 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:border-[#A1FBF9]/40"
    >
      <Icon size={13} />
      {label}
      <ArrowRight size={11} className="opacity-40" />
    </Link>
  );
}

function LoadingBlock() {
  return (
    <div className="grid animate-pulse grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-28 rounded-2xl border border-black/10 bg-white/40 dark:border-white/10 dark:bg-white/[0.04]" />
      ))}
    </div>
  );
}

function MasterAnalyticsView() {
  const [days, setDays] = useState(30);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [showAiSummary, setShowAiSummary] = useState(false);
  const fetchAnalytics = useServerFn(getMasterAnalytics);

  const { data, refetch, isFetching } = useSuspenseQuery({
    queryKey: ["master-analytics", days, divisionId],
    queryFn: () => fetchAnalytics({ data: { days, divisionId } }),
    staleTime: 60_000,
  });

  const aiSummaryQuery = useQuery({
    queryKey: ["master-analytics-ai-summary", days, divisionId, showAiSummary],
    queryFn: () => fetchAnalytics({ data: { days, divisionId, aiSummary: true } }),
    enabled: showAiSummary,
    staleTime: 5 * 60_000,
  });

  const divisions = useMemo(() => BRAND_MODES.map((b) => ({ id: b.id, label: b.name })), []);
  const summary = aiSummaryQuery.data?.aiSummary ?? null;

  return (
    <>
      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/70 p-3 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex items-center gap-1 rounded-full border border-black/10 p-1 text-xs dark:border-white/10">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1 transition ${
                days === d
                  ? "bg-[#03002C] text-white dark:bg-white dark:text-[#03002C]"
                  : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <select
          value={divisionId ?? ""}
          onChange={(e) => setDivisionId(e.target.value || null)}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        >
          <option value="">All divisions</option>
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 transition hover:bg-black/5 disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
        >
          <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} /> Refresh
        </button>
        <button
          onClick={() => {
            setShowAiSummary(true);
            if (!aiSummaryQuery.data) toast.loading("Oracle is composing insights…", { id: "ai-summary" });
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#003FC7] to-[#C2A3FF] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_4px_20px_-6px_rgba(0,63,199,0.55)] transition hover:brightness-110"
        >
          <Sparkles size={13} /> AI insights
        </button>
        <button
          onClick={() => downloadCsv(data)}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 transition hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
        >
          <Download size={12} /> CSV
        </button>
      </div>

      {/* AI executive summary */}
      {showAiSummary && (
        <div className="mb-6 rounded-2xl border border-[#003FC7]/30 bg-gradient-to-br from-[#003FC7]/10 via-white to-[#C2A3FF]/10 p-5 dark:from-[#003FC7]/20 dark:via-white/[0.04] dark:to-[#C2A3FF]/20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#003FC7] dark:text-[#A1FBF9]">
            <Sparkles size={13} /> Executive brief · last {days} days
          </div>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#03002C] dark:text-white">
            {aiSummaryQuery.isLoading || (!summary && aiSummaryQuery.isFetching) ? (
              <span className="opacity-60">Oracle is composing insights…</span>
            ) : summary ? (
              summary
            ) : (
              <span className="opacity-60">No summary available yet. Try refreshing after a few minutes of activity.</span>
            )}
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Total events" value={data.overview.totalEvents.toLocaleString()} delta={data.overview.deltaPct} icon={Zap} />
        <Kpi label="Active users" value={data.overview.activeUsers.toLocaleString()} sublabel={`${data.overview.activeSessions.toLocaleString()} sessions`} icon={Users} />
        <Kpi label="Decks created" value={data.overview.decksCreated.toLocaleString()} sublabel={`${data.overview.slidesAdded.toLocaleString()} slides added`} icon={Layers} />
        <Kpi label="Exports" value={data.overview.exports.toLocaleString()} sublabel={`${data.overview.shareViews.toLocaleString()} shared views`} icon={Download} />
        <Kpi label="AI calls" value={data.overview.aiCalls.toLocaleString()} sublabel={`${data.overview.aiCost.toFixed(2)} credits`} icon={Bot} />
        <Kpi label="AI error rate" value={`${data.overview.aiErrorRate.toFixed(1)}%`} sublabel={`avg ${data.overview.aiAvgLatencyMs} ms`} icon={AlertCircle} tone={data.overview.aiErrorRate > 5 ? "warn" : undefined} />
        <Kpi label="Imagery" value={data.overview.imageryGenerations.toLocaleString()} sublabel={`${data.overview.imageryUses.toLocaleString()} placed`} icon={ImageIcon} />
        <Kpi label="Translations" value={data.overview.translationsStarted.toLocaleString()} sublabel={`${data.overview.printAssetsCreated.toLocaleString()} print assets`} icon={Languages} />
      </div>

      {/* Trend chart */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TrendCard title="Daily activity" series={data.series.activity} days={data.series.days} accent="#003FC7" total={data.overview.totalEvents} />
        <TrendCard title="Daily active users" series={data.series.dau} days={data.series.days} accent="#A1FBF9" total={data.overview.activeUsers} />
        <TrendCard title="AI cost / day" series={data.series.aiCost} days={data.series.days} accent="#C2A3FF" total={data.overview.aiCost} formatValue={(v) => v.toFixed(1)} />
      </div>

      {/* Funnel */}
      <SectionTitle icon={Share2} title="Funnel · brief → deck → export → share" />
      <FunnelBar funnel={data.funnel} />

      {/* Top modules + Divisions */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Top modules (variants)" subtitle={`Ranked by adds + edits + renders`}>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/90 text-xs uppercase tracking-wider text-black/50 backdrop-blur dark:bg-[#03002C]/90 dark:text-white/50">
                <tr>
                  <th className="py-2 text-left font-medium">Variant</th>
                  <th className="py-2 text-right font-medium">Uses</th>
                  <th className="py-2 text-right font-medium">Adds</th>
                  <th className="py-2 text-right font-medium">Edits</th>
                  <th className="py-2 text-right font-medium">Exports</th>
                  <th className="py-2 text-left font-medium">Top division</th>
                </tr>
              </thead>
              <tbody>
                {data.topVariants.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-black/40 dark:text-white/40">No module usage yet in this window.</td></tr>
                ) : data.topVariants.map((v) => {
                  const variant = byId(MODULE_VARIANTS, v.variant_id);
                  return (
                    <tr key={v.variant_id} className="border-t border-black/5 dark:border-white/5">
                      <td className="py-1.5 pr-2">
                        <div className="font-medium text-[#03002C] dark:text-white">{variant?.name ?? v.variant_id}</div>
                        <div className="text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">{v.variant_id}</div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{v.uses}</td>
                      <td className="py-1.5 text-right tabular-nums text-black/60 dark:text-white/60">{v.adds}</td>
                      <td className="py-1.5 text-right tabular-nums text-black/60 dark:text-white/60">{v.edits}</td>
                      <td className="py-1.5 text-right tabular-nums text-black/60 dark:text-white/60">{v.exports}</td>
                      <td className="py-1.5 text-xs text-black/60 dark:text-white/60">{v.topDivision ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Division activity" subtitle="Events, decks, and AI usage per brand">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/90 text-xs uppercase tracking-wider text-black/50 backdrop-blur dark:bg-[#03002C]/90 dark:text-white/50">
                <tr>
                  <th className="py-2 text-left font-medium">Division</th>
                  <th className="py-2 text-right font-medium">Events</th>
                  <th className="py-2 text-right font-medium">Decks</th>
                  <th className="py-2 text-right font-medium">Users</th>
                  <th className="py-2 text-right font-medium">AI</th>
                  <th className="py-2 text-right font-medium">Exports</th>
                </tr>
              </thead>
              <tbody>
                {data.divisions.length === 0 ? (
                  <tr><td colSpan={6} className="py-6 text-center text-black/40 dark:text-white/40">No division activity yet in this window.</td></tr>
                ) : data.divisions.map((d) => {
                  const label = BRAND_MODES.find((b) => b.id === d.division_id)?.name ?? d.division_id;
                  return (
                    <tr key={d.division_id} className="border-t border-black/5 dark:border-white/5">
                      <td className="py-1.5 pr-2 font-medium text-[#03002C] dark:text-white">{label}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{d.events}</td>
                      <td className="py-1.5 text-right tabular-nums">{d.decks}</td>
                      <td className="py-1.5 text-right tabular-nums">{d.activeUsers}</td>
                      <td className="py-1.5 text-right tabular-nums">{d.aiCalls}</td>
                      <td className="py-1.5 text-right tabular-nums">{d.exports}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Power users + AI models */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Power users" subtitle="Weighted by decks + exports + AI + events">
          <div className="max-h-[380px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/90 text-xs uppercase tracking-wider text-black/50 backdrop-blur dark:bg-[#03002C]/90 dark:text-white/50">
                <tr>
                  <th className="py-2 text-left font-medium">User</th>
                  <th className="py-2 text-right font-medium">Events</th>
                  <th className="py-2 text-right font-medium">Decks</th>
                  <th className="py-2 text-right font-medium">AI</th>
                  <th className="py-2 text-right font-medium">Exports</th>
                </tr>
              </thead>
              <tbody>
                {data.powerUsers.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-black/40 dark:text-white/40">No user activity yet.</td></tr>
                ) : data.powerUsers.map((u) => (
                  <tr key={u.user_id} className="border-t border-black/5 dark:border-white/5">
                    <td className="py-1.5 pr-2 font-medium text-[#03002C] dark:text-white">{u.name}</td>
                    <td className="py-1.5 text-right tabular-nums">{u.events}</td>
                    <td className="py-1.5 text-right tabular-nums">{u.decks}</td>
                    <td className="py-1.5 text-right tabular-nums">{u.ai}</td>
                    <td className="py-1.5 text-right tabular-nums">{u.exports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="AI models" subtitle="Cost & reliability by model">
          <div className="max-h-[380px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white/90 text-xs uppercase tracking-wider text-black/50 backdrop-blur dark:bg-[#03002C]/90 dark:text-white/50">
                <tr>
                  <th className="py-2 text-left font-medium">Model</th>
                  <th className="py-2 text-right font-medium">Calls</th>
                  <th className="py-2 text-right font-medium">Errors</th>
                  <th className="py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.ai.byModel.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-black/40 dark:text-white/40">No AI activity yet.</td></tr>
                ) : data.ai.byModel.map((m) => (
                  <tr key={m.model} className="border-t border-black/5 dark:border-white/5">
                    <td className="py-1.5 pr-2 font-mono text-xs text-[#03002C] dark:text-white">{m.model}</td>
                    <td className="py-1.5 text-right tabular-nums">{m.calls}</td>
                    <td className="py-1.5 text-right tabular-nums text-[#E53D2E]">{m.errors}</td>
                    <td className="py-1.5 text-right tabular-nums">{m.cost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Top shared decks + module families + operations */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Top shared decks" subtitle="Real audience engagement">
          <ul className="space-y-2 text-sm">
            {data.topSharedDecks.length === 0 ? (
              <li className="py-4 text-center text-black/40 dark:text-white/40">No share activity.</li>
            ) : data.topSharedDecks.map((d) => (
              <li key={d.deck_id} className="flex items-center justify-between gap-3 border-b border-black/5 py-1.5 dark:border-white/5">
                <div className="min-w-0 flex-1 truncate font-medium text-[#03002C] dark:text-white">{d.title}</div>
                <div className="shrink-0 text-xs text-black/60 dark:text-white/60">
                  <span className="font-semibold text-[#003FC7] dark:text-[#A1FBF9]">{d.views}</span> views · {d.uniqueViewers} viewers · slide {d.maxSlide}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Module families" subtitle="What content shape wins">
          <ul className="space-y-1.5 text-sm">
            {data.topFamilies.length === 0 ? (
              <li className="py-4 text-center text-black/40 dark:text-white/40">No family data.</li>
            ) : data.topFamilies.map((f) => (
              <li key={f.family} className="flex items-center justify-between gap-2 border-b border-black/5 py-1 dark:border-white/5">
                <span className="text-[#03002C] dark:text-white">{f.family}</span>
                <span className="tabular-nums text-black/60 dark:text-white/60">{f.count}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="AI operations" subtitle="Where AI is being used">
          <ul className="space-y-1.5 text-sm">
            {data.ai.byOperation.length === 0 ? (
              <li className="py-4 text-center text-black/40 dark:text-white/40">No AI operations.</li>
            ) : data.ai.byOperation.map((o) => (
              <li key={o.operation} className="flex items-center justify-between gap-2 border-b border-black/5 py-1 dark:border-white/5">
                <span className="text-[#03002C] dark:text-white">{o.operation}</span>
                <span className="tabular-nums text-black/60 dark:text-white/60">{o.count}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Translation + Print snapshot */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Translation demand" subtitle="Target language mix">
          <div className="flex flex-wrap gap-2">
            {data.translation.topTargets.length === 0 ? (
              <span className="text-sm text-black/40 dark:text-white/40">No translations in window.</span>
            ) : data.translation.topTargets.map((t) => (
              <span key={t.lang} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs dark:border-white/10 dark:bg-white/[0.04]">
                <span className="font-semibold text-[#03002C] dark:text-white">{t.lang.toUpperCase()}</span>
                <span className="text-black/60 dark:text-white/60">{t.count}</span>
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Print asset mix" subtitle="Formats being produced">
          <div className="flex flex-wrap gap-2">
            {data.print.byKind.length === 0 ? (
              <span className="text-sm text-black/40 dark:text-white/40">No print activity.</span>
            ) : data.print.byKind.map((k) => (
              <span key={k.kind} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs dark:border-white/10 dark:bg-white/[0.04]">
                <FileText size={12} className="opacity-60" />
                <span className="font-semibold text-[#03002C] dark:text-white">{k.kind}</span>
                <span className="text-black/60 dark:text-white/60">{k.count}</span>
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function Kpi({
  label, value, sublabel, delta, icon: Icon, tone,
}: {
  label: string; value: string; sublabel?: string; delta?: number | null;
  icon: typeof BarChart3; tone?: "warn";
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className={`rounded-2xl border p-4 ${tone === "warn" ? "border-[#E53D2E]/40 bg-[#E53D2E]/5" : "border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]"}`}>
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">{label}</div>
        <Icon size={14} className="opacity-40" />
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[#03002C] dark:text-white">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${positive ? "bg-[#A6FA87]/25 text-[#046a2e] dark:bg-[#A6FA87]/15 dark:text-[#A6FA87]" : "bg-[#E53D2E]/15 text-[#E53D2E]"}`}>
            {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {positive ? "+" : ""}{delta}%
          </span>
        )}
        {sublabel && <span className="text-black/50 dark:text-white/50">{sublabel}</span>}
      </div>
    </div>
  );
}

function TrendCard({ title, series, days, accent, total, formatValue }: {
  title: string; series: number[]; days: string[]; accent: string; total: number;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...series);
  const w = 300, h = 60;
  const path = series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-xs uppercase tracking-wider text-black/50 dark:text-white/50">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[#03002C] dark:text-white">
        {formatValue ? formatValue(total) : total.toLocaleString()}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-16 w-full">
        <defs>
          <linearGradient id={`g-${accent.slice(1)}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={`url(#g-${accent.slice(1)})`} />
        <path d={path} fill="none" stroke={accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-black/40 dark:text-white/40">
        <span>{days[0]?.slice(5)}</span>
        <span>{days[days.length - 1]?.slice(5)}</span>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof BarChart3; title: string }) {
  return (
    <div className="mt-10 mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-black/50 dark:text-white/50">
      <Icon size={13} /> {title}
    </div>
  );
}

function FunnelBar({ funnel }: { funnel: { briefs: number; decksCreated: number; decksExported: number; shareViews: number; uniqueShareSessions: number } }) {
  const stages = [
    { label: "Briefs", value: funnel.briefs, color: "#003FC7" },
    { label: "Decks created", value: funnel.decksCreated, color: "#003FC7" },
    { label: "Exported", value: funnel.decksExported, color: "#C2A3FF" },
    { label: "Share views", value: funnel.shareViews, color: "#A1FBF9" },
    { label: "Unique viewers", value: funnel.uniqueShareSessions, color: "#A6FA87" },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev != null && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label} className="rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[10px] uppercase tracking-wider text-black/50 dark:text-white/50">{s.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-[#03002C] dark:text-white">{s.value.toLocaleString()}</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="h-full rounded-full transition-all" style={{ width: `${(s.value / max) * 100}%`, backgroundColor: s.color }} />
            </div>
            {conv != null && (
              <div className="mt-1 text-[10px] text-black/50 dark:text-white/50">{conv}% of previous</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: import("react").ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-3">
        <div className="text-sm font-semibold text-[#03002C] dark:text-white">{title}</div>
        {subtitle && <div className="text-xs text-black/50 dark:text-white/50">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ── CSV export ───────────────────────────────────────────────────────────
function downloadCsv(data: Awaited<ReturnType<typeof getMasterAnalytics>>) {
  const rows: string[] = [];
  rows.push("section,key,value");
  rows.push(`overview,totalEvents,${data.overview.totalEvents}`);
  rows.push(`overview,activeUsers,${data.overview.activeUsers}`);
  rows.push(`overview,decksCreated,${data.overview.decksCreated}`);
  rows.push(`overview,exports,${data.overview.exports}`);
  rows.push(`overview,aiCalls,${data.overview.aiCalls}`);
  rows.push(`overview,aiCost,${data.overview.aiCost}`);
  rows.push(`overview,aiErrorRatePct,${data.overview.aiErrorRate}`);
  rows.push("");
  rows.push("topVariants,variant_id,uses,adds,edits,exports,topDivision");
  for (const v of data.topVariants) rows.push(`topVariants,${v.variant_id},${v.uses},${v.adds},${v.edits},${v.exports},${v.topDivision ?? ""}`);
  rows.push("");
  rows.push("divisions,division_id,events,decks,activeUsers,aiCalls,exports");
  for (const d of data.divisions) rows.push(`divisions,${d.division_id},${d.events},${d.decks},${d.activeUsers},${d.aiCalls},${d.exports}`);
  rows.push("");
  rows.push("powerUsers,name,events,decks,ai,exports");
  for (const u of data.powerUsers) rows.push(`powerUsers,"${u.name.replace(/"/g, '""')}",${u.events},${u.decks},${u.ai},${u.exports}`);

  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `master-analytics-${data.window.days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
