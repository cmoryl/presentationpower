import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/")({
  component: OverviewView,
});

// TransPerfect brand tokens
const BRAND = {
  blue: "#003FC7",
  blue800: "#03002C",
  aqua: "#A1FBF9",
  lavender: "#C2A3FF",
  yellow: "#FFEB66",
  green: "#A6FA87",
  peach: "#FF9B70",
  pink: "#EC388A",
  red: "#E53D2E",
};

function OverviewView() {
  const fn = useServerFn(getAdminOverview);
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fn(), retry: false });

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;
  if (q.isLoading) return <LoadingSkeleton />;
  if (!q.data) return <div className="text-sm text-red-600">Failed to load.</div>;

  const t = q.data.totals;
  const aiMax = Math.max(1, ...q.data.aiPerDay.map((d) => d.count));
  const imgMax = Math.max(1, ...q.data.imageryPerDay.map((d) => d.count));

  const aiSuccess = t.aiCalls - t.aiErrors;
  const successRate = t.aiCalls ? ((aiSuccess / t.aiCalls) * 100) : 100;
  const errorRate = t.aiCalls ? ((t.aiErrors / t.aiCalls) * 100) : 0;
  const costPerCall = t.aiCalls ? t.aiCost / t.aiCalls : 0;
  const tokensPerCall = t.aiCalls ? Math.round(t.aiTokens / t.aiCalls) : 0;

  const heroStats = [
    { label: "AI CALLS", value: t.aiCalls.toLocaleString(), delta: `${successRate.toFixed(1)}% success`, color: BRAND.blue, trend: q.data.aiPerDay.slice(-14) },
    { label: "IMAGES", value: t.imagesGenerated.toLocaleString(), delta: `${t.imageEvents} total events`, color: BRAND.pink, trend: q.data.imageryPerDay.slice(-14) },
    { label: "DECKS", value: t.decks.toLocaleString(), delta: `${t.users} active users`, color: BRAND.lavender },
    { label: "KNOWLEDGE", value: (t.knowledgeEntries + (t.oracleKnowledge ?? 0)).toLocaleString(), delta: `${t.brandIntelligence ?? 0} brand intel`, color: BRAND.aqua },
  ];

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header className="flex items-end justify-between gap-6 border-b border-black/10 pb-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/40">Admin · Overview</div>
          <h1 className="mt-2 font-[Geist] text-4xl font-semibold tracking-tight text-[#03002C]">Operations Console</h1>
          <p className="mt-2 max-w-xl text-sm text-black/60">
            Real-time telemetry across AI orchestration, imagery pipelines, knowledgebase, and user activity — last 30 days.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-xs text-black/60 backdrop-blur">
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: BRAND.green }} />
          Live · 30-day window
        </div>
      </header>

      {/* HERO KPI ROW */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {heroStats.map((s) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: s.color }} />
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-black/40">{s.label}</div>
            <div className="mt-3 font-[Geist] text-5xl font-semibold tracking-tight text-[#03002C]">{s.value}</div>
            <div className="mt-2 text-xs text-black/50">{s.delta}</div>
            {s.trend && s.trend.length > 0 && (
              <div className="mt-4 flex h-10 items-end gap-0.5">
                {s.trend.map((d, i) => {
                  const max = Math.max(1, ...s.trend!.map((x) => x.count));
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm opacity-60 transition group-hover:opacity-100"
                      style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, background: s.color }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* AI PERFORMANCE INFOGRAPHIC */}
      <section className="rounded-3xl border border-black/10 bg-gradient-to-br from-white to-[#F2F2F2] p-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-black/40">Section 01</div>
            <h2 className="mt-1 font-[Geist] text-2xl font-semibold tracking-tight text-[#03002C]">AI Orchestration Health</h2>
          </div>
          <div className="text-xs text-black/50">{t.aiCalls.toLocaleString()} calls processed</div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Donut: success/error */}
          <div className="lg:col-span-4">
            <Donut
              segments={[
                { value: aiSuccess, color: BRAND.blue, label: "Success" },
                { value: t.aiErrors, color: BRAND.red, label: "Errors" },
              ]}
              centerLabel={`${successRate.toFixed(1)}%`}
              centerSub="success rate"
            />
            <div className="mt-4 space-y-2">
              <LegendRow color={BRAND.blue} label="Success" value={aiSuccess.toLocaleString()} pct={successRate} />
              <LegendRow color={BRAND.red} label="Errors" value={t.aiErrors.toLocaleString()} pct={errorRate} />
            </div>
          </div>

          {/* Metric tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            <MetricTile
              label="Total Cost"
              value={`${t.aiCost.toFixed(2)}`}
              unit="credits"
              accent={BRAND.blue}
              hint={`≈ ${costPerCall.toFixed(4)} / call`}
            />
            <MetricTile
              label="Tokens Processed"
              value={formatCompact(t.aiTokens)}
              unit="tokens"
              accent={BRAND.lavender}
              hint={`${tokensPerCall.toLocaleString()} avg / call`}
            />
            <MetricTile
              label="Avg Latency"
              value={t.aiAvgLatencyMs.toLocaleString()}
              unit="ms"
              accent={BRAND.aqua}
              hint={latencyLabel(t.aiAvgLatencyMs)}
            />
            <MetricTile
              label="Error Volume"
              value={t.aiErrors.toLocaleString()}
              unit={t.aiErrors === 1 ? "event" : "events"}
              accent={t.aiErrors === 0 ? BRAND.green : BRAND.red}
              hint={`${errorRate.toFixed(2)}% error rate`}
            />
          </div>
        </div>
      </section>

      {/* TIMESERIES */}
      <section className="grid gap-6 lg:grid-cols-2">
        <TimeseriesCard
          index="02"
          title="AI Calls · Daily"
          subtitle="30-day request volume"
          data={q.data.aiPerDay}
          max={aiMax}
          color={BRAND.blue}
        />
        <TimeseriesCard
          index="03"
          title="Imagery Events · Daily"
          subtitle="Generation + edit pipeline"
          data={q.data.imageryPerDay}
          max={imgMax}
          color={BRAND.pink}
        />
      </section>

      {/* KNOWLEDGE ECOSYSTEM */}
      <section className="rounded-3xl border border-black/10 bg-[#03002C] p-8 text-white">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Section 04</div>
            <h2 className="mt-1 font-[Geist] text-2xl font-semibold tracking-tight">Knowledge Ecosystem</h2>
            <p className="mt-1 text-sm text-white/60">Retrieval sources powering brief personalization and Oracle RAG.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KnowledgeCard
            label="Knowledge Entries"
            value={t.knowledgeEntries}
            total={t.knowledgeEntries + (t.oracleKnowledge ?? 0) + (t.brandIntelligence ?? 0)}
            color={BRAND.aqua}
            href="/admin/oracle"
          />
          <KnowledgeCard
            label="Oracle KB"
            value={t.oracleKnowledge ?? 0}
            total={t.knowledgeEntries + (t.oracleKnowledge ?? 0) + (t.brandIntelligence ?? 0)}
            color={BRAND.lavender}
            href="/admin/oracle"
          />
          <KnowledgeCard
            label="Brand Intelligence"
            value={t.brandIntelligence ?? 0}
            total={t.knowledgeEntries + (t.oracleKnowledge ?? 0) + (t.brandIntelligence ?? 0)}
            color={BRAND.yellow}
            href="/admin/brand-assets"
          />
        </div>
      </section>

      {/* EXPERIMENTS + QUICK NAV */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-black/10 bg-white p-6 lg:col-span-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/40">Section 05</div>
          <h3 className="mt-1 font-[Geist] text-xl font-semibold tracking-tight text-[#03002C]">A/B Experiments</h3>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-[Geist] text-6xl font-semibold tracking-tight" style={{ color: BRAND.blue }}>
              {t.runningExperiments}
            </span>
            <span className="text-sm text-black/50">/ {t.experiments} total</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${t.experiments ? (t.runningExperiments / t.experiments) * 100 : 0}%`,
                background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.lavender})`,
              }}
            />
          </div>
          <Link
            to="/admin/ab"
            className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-[#003FC7] hover:underline"
          >
            Manage experiments →
          </Link>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-6 lg:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/40">Section 06 · Quick Access</div>
          <h3 className="mt-1 font-[Geist] text-xl font-semibold tracking-tight text-[#03002C]">Console Modules</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              { href: "/admin/users", label: "Users & Roles", color: BRAND.blue },
              { href: "/admin/ai", label: "AI Analytics", color: BRAND.lavender },
              { href: "/admin/imagery", label: "Imagery", color: BRAND.pink },
              { href: "/admin/oracle", label: "Oracle KB", color: BRAND.aqua },
              { href: "/admin/brand-assets", label: "Brand Assets", color: BRAND.yellow },
              { href: "/admin/logohub", label: "LogoHub", color: BRAND.green },
              { href: "/admin/approvals", label: "Approvals", color: BRAND.peach },
              { href: "/admin/audit", label: "Audit Log", color: BRAND.red },
              { href: "/admin/icon-studio", label: "Icon Studio", color: BRAND.blue },
            ].map((m) => (
              <Link
                key={m.href}
                to={m.href}
                className="group flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
              >
                <span className="h-8 w-1 rounded-full" style={{ background: m.color }} />
                <span className="text-sm font-medium text-[#03002C]">{m.label}</span>
                <span className="ml-auto text-black/30 transition group-hover:text-[#003FC7]">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-3xl bg-black/5" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-black/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-3xl bg-black/5" />
    </div>
  );
}

function Donut({
  segments,
  centerLabel,
  centerSub,
}: {
  segments: Array<{ value: number; color: string; label: string }>;
  centerLabel: string;
  centerSub: string;
}) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0));
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#F2F2F2" strokeWidth="18" />
        {segments.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <circle
              key={i}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="18"
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-[Geist] text-3xl font-semibold tracking-tight text-[#03002C]">{centerLabel}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-widest text-black/50">{centerSub}</div>
      </div>
    </div>
  );
}

function LegendRow({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-black/70">{label}</span>
      <span className="ml-auto font-medium text-[#03002C]">{value}</span>
      <span className="w-12 text-right text-black/40">{pct.toFixed(1)}%</span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  unit,
  accent,
  hint,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
  hint: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-5">
      <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-full opacity-10" style={{ background: accent }} />
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-black/40">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-[Geist] text-3xl font-semibold tracking-tight text-[#03002C]">{value}</span>
        <span className="text-xs text-black/50">{unit}</span>
      </div>
      <div className="mt-1 text-[11px] text-black/50">{hint}</div>
    </div>
  );
}

function TimeseriesCard({
  index,
  title,
  subtitle,
  data,
  max,
  color,
}: {
  index: string;
  title: string;
  subtitle: string;
  data: Array<{ date: string; count: number }>;
  max: number;
  color: string;
}) {
  const total = data.reduce((a, d) => a + d.count, 0);
  const avg = data.length ? Math.round(total / data.length) : 0;
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-black/40">Section {index}</div>
          <h3 className="mt-1 font-[Geist] text-xl font-semibold tracking-tight text-[#03002C]">{title}</h3>
          <p className="text-xs text-black/50">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="font-[Geist] text-2xl font-semibold tracking-tight text-[#03002C]">{total.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-widest text-black/40">total · avg {avg}/day</div>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="py-10 text-center text-xs text-black/40">No data yet — events will appear here as the app runs.</div>
      ) : (
        <>
          <div className="flex h-40 items-end gap-1">
            {data.map((d) => (
              <div key={d.date} className="group relative flex-1" title={`${d.date}: ${d.count}`}>
                <div
                  className="w-full rounded-t transition-all group-hover:opacity-100"
                  style={{
                    height: `${Math.max(2, (d.count / max) * 100)}%`,
                    background: `linear-gradient(180deg, ${color}, ${color}90)`,
                    minHeight: 2,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[10px] uppercase tracking-widest text-black/40">
            <span>{data[0]?.date ?? ""}</span>
            <span>peak {max}</span>
            <span>{data[data.length - 1]?.date ?? ""}</span>
          </div>
        </>
      )}
    </div>
  );
}

function KnowledgeCard({
  label,
  value,
  total,
  color,
  href,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  href: string;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ color }}>{label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-[Geist] text-4xl font-semibold tracking-tight text-white">{value.toLocaleString()}</span>
        <span className="text-xs text-white/50">records</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
        <span>{pct.toFixed(1)}% of corpus</span>
        <span className="transition group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}

function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function latencyLabel(ms: number) {
  if (ms === 0) return "no samples";
  if (ms < 500) return "fast";
  if (ms < 1500) return "healthy";
  if (ms < 3000) return "elevated";
  return "slow";
}
