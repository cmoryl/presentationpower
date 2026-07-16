import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/")({
  component: OverviewView,
});

function OverviewView() {
  const fn = useServerFn(getAdminOverview);
  const q = useQuery({ queryKey: ["admin", "overview"], queryFn: () => fn(), retry: false });

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;
  if (q.isLoading) return <div className="text-sm text-black/50">Loading overview…</div>;
  if (!q.data) return <div className="text-sm text-red-600">Failed to load.</div>;

  const t = q.data.totals;
  const stats: Array<{ label: string; value: string | number; sub?: string }> = [
    { label: "AI calls (30d)", value: t.aiCalls, sub: `${t.aiErrors} errors` },
    { label: "AI cost (credits)", value: t.aiCost.toFixed(2) },
    { label: "AI tokens", value: t.aiTokens.toLocaleString() },
    { label: "Avg latency", value: `${t.aiAvgLatencyMs} ms` },
    { label: "Images generated", value: t.imagesGenerated, sub: `${t.imageEvents} total events` },
    { label: "Decks", value: t.decks },
    { label: "Users", value: t.users },
    { label: "Knowledge entries", value: t.knowledgeEntries },
    { label: "Oracle KB", value: (t as { oracleKnowledge?: number }).oracleKnowledge ?? 0, sub: `${(t as { brandIntelligence?: number }).brandIntelligence ?? 0} brand intel` },
    { label: "Experiments running", value: t.runningExperiments, sub: `${t.experiments} total` },
  ];

  const aiMax = Math.max(1, ...q.data.aiPerDay.map((d) => d.count));
  const imgMax = Math.max(1, ...q.data.imageryPerDay.map((d) => d.count));

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
            <div className="text-xs uppercase tracking-widest text-black/50">{s.label}</div>
            <div className="mt-1 text-3xl font-semibold">{s.value}</div>
            {s.sub && <div className="mt-1 text-xs text-black/50">{s.sub}</div>}
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Chart title="AI calls per day (30d)" data={q.data.aiPerDay} max={aiMax} color="#003FC7" />
        <Chart title="Imagery events per day (30d)" data={q.data.imageryPerDay} max={imgMax} color="#EC388A" />
      </section>
    </div>
  );
}

function Chart({ title, data, max, color }: { title: string; data: Array<{ date: string; count: number }>; max: number; color: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
      <div className="mb-3 text-sm font-medium">{title}</div>
      {data.length === 0 ? (
        <div className="py-8 text-center text-xs text-black/50">No data yet — events will appear here as the app runs.</div>
      ) : (
        <div className="flex h-32 items-end gap-1">
          {data.map((d) => (
            <div key={d.date} className="flex-1" title={`${d.date}: ${d.count}`}>
              <div className="w-full rounded-t" style={{ height: `${(d.count / max) * 100}%`, background: color, minHeight: 2 }} />
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex justify-between text-[10px] text-black/40">
        <span>{data[0]?.date ?? ""}</span>
        <span>{data[data.length - 1]?.date ?? ""}</span>
      </div>
    </div>
  );
}
