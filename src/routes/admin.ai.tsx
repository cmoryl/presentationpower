import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getAiAnalytics } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/ai")({
  component: AiView,
});

function AiView() {
  const fn = useServerFn(getAiAnalytics);
  const [days, setDays] = useState(30);
  const [brand, setBrand] = useState("");
  const q = useQuery({
    queryKey: ["admin", "ai", days, brand],
    queryFn: () => fn({ data: { days, brandId: brand || undefined } }),
    retry: false,
  });

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs uppercase tracking-widest text-black/50">Window</label>
        {[7, 14, 30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`rounded-full border px-3 py-1 text-xs ${days === d ? "border-[#03002C] bg-[#03002C] text-white" : "border-black/20 bg-white"}`}>
            {d}d
          </button>
        ))}
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Filter brand id…"
          className="ml-2 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs" />
      </div>

      {q.isLoading && <div className="text-sm text-black/50">Loading…</div>}
      {q.data && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Calls" value={q.data.totals.calls} />
            <Stat label="Cost (credits)" value={q.data.totals.cost.toFixed(2)} />
            <Stat label="Models used" value={q.data.byModel.length} />
            <Stat label="Brands" value={q.data.byBrand.length} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Table title="Top models" cols={["Model", "Calls", "Errors", "Tokens", "Cost"]}
              rows={q.data.byModel.map((r) => [r.model, r.calls, r.errors, r.tokens.toLocaleString(), r.cost.toFixed(4)])} />
            <Table title="By brand" cols={["Brand", "Calls", "Cost"]}
              rows={q.data.byBrand.map((r) => [r.brand, r.calls, r.cost.toFixed(4)])} />
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Recent calls</h2>
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
              <table className="w-full text-xs">
                <thead className="bg-black/5 text-left uppercase tracking-widest text-black/50">
                  <tr><th className="p-2">When</th><th className="p-2">Model</th><th className="p-2">Op</th><th className="p-2">Brand</th><th className="p-2">Status</th><th className="p-2 text-right">Tokens</th><th className="p-2 text-right">Latency</th><th className="p-2 text-right">Cost</th><th className="p-2">Prompt</th></tr>
                </thead>
                <tbody>
                  {q.data.recent.map((r) => (
                    <tr key={r.id} className="border-t border-black/5">
                      <td className="p-2 text-black/60">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-2 font-mono">{r.model}</td>
                      <td className="p-2">{r.operation}</td>
                      <td className="p-2">{r.brand_id ?? "—"}</td>
                      <td className="p-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.status === "success" ? "bg-emerald-100 text-emerald-800" : r.status === "error" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{r.status}</span>
                      </td>
                      <td className="p-2 text-right">{(r.tokens_in + r.tokens_out).toLocaleString()}</td>
                      <td className="p-2 text-right">{r.latency_ms}ms</td>
                      <td className="p-2 text-right">{Number(r.cost_credits).toFixed(4)}</td>
                      <td className="max-w-[240px] truncate p-2 text-black/60" title={r.prompt_summary ?? ""}>{r.prompt_summary ?? "—"}</td>
                    </tr>
                  ))}
                  {q.data.recent.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-black/50">No AI events yet in this window. Events log automatically as the app calls the AI gateway.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-widest text-black/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
function Table({ title, cols, rows }: { title: string; cols: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
      <div className="mb-3 text-sm font-medium">{title}</div>
      {rows.length === 0 ? <div className="py-6 text-center text-xs text-black/40">No data</div> : (
        <table className="w-full text-xs">
          <thead><tr>{cols.map((c) => <th key={c} className="pb-2 text-left uppercase tracking-widest text-black/50">{c}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => (
            <tr key={i} className="border-t border-black/5"><td className="py-1.5 font-mono">{row[0]}</td>{row.slice(1).map((c, j) => <td key={j} className="py-1.5">{c}</td>)}</tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
