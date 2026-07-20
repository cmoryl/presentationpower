import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getImageryAnalytics } from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/imagery-analytics")({
  component: ImageryView,
});

function ImageryView() {
  const fn = useServerFn(getImageryAnalytics);
  const [days, setDays] = useState(30);
  const [brand, setBrand] = useState("");
  const q = useQuery({
    queryKey: ["admin", "imagery", days, brand],
    queryFn: () => fn({ data: { days, brandId: brand || undefined } }),
    retry: false,
  });
  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 14, 30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`rounded-full border px-3 py-1 text-xs ${days === d ? "border-[#03002C] bg-[#03002C] text-white" : "border-black/20 bg-white"}`}>{d}d</button>
        ))}
        <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Filter brand id…"
          className="ml-2 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs" />
      </div>

      {q.isLoading && <div className="text-sm text-black/50">Loading…</div>}
      {q.data && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Events" value={q.data.totals.events} />
            <Stat label="Generated" value={q.data.totals.generations} />
            <Stat label="Used in decks" value={q.data.totals.uses} />
            <Stat label="Memory-assisted" value={q.data.totals.memoryHits} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
              <div className="mb-3 text-sm font-medium">Usage by brand</div>
              {q.data.byBrand.length === 0 ? <div className="py-6 text-center text-xs text-black/40">No data</div> : (
                <table className="w-full text-xs">
                  <thead><tr className="text-left uppercase tracking-widest text-black/50"><th className="pb-2">Brand</th><th>Total</th><th>Generated</th><th>Used</th></tr></thead>
                  <tbody>{q.data.byBrand.map((b) => (
                    <tr key={b.brand} className="border-t border-black/5"><td className="py-1.5 font-mono">{b.brand}</td><td>{b.total}</td><td>{b.generate}</td><td>{b.use}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
              <div className="mb-3 text-sm font-medium">Top prompts</div>
              {q.data.topPrompts.length === 0 ? <div className="py-6 text-center text-xs text-black/40">No prompt data</div> : (
                <ul className="space-y-1.5 text-xs">
                  {q.data.topPrompts.map((p) => (
                    <li key={p.prompt} className="flex items-baseline justify-between gap-3 border-b border-black/5 pb-1.5">
                      <span className="truncate text-black/70" title={p.prompt}>{p.prompt}</span>
                      <span className="tabular-nums text-black/50">{p.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Most-touched images</h2>
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
              <table className="w-full text-xs">
                <thead className="bg-black/5 text-left uppercase tracking-widest text-black/50">
                  <tr><th className="p-2">Image</th><th className="p-2">Events</th><th className="p-2">Last</th><th className="p-2">Prompt</th></tr>
                </thead>
                <tbody>{q.data.byImage.map((i) => (
                  <tr key={i.image_id} className="border-t border-black/5">
                    <td className="p-2 font-mono">{i.image_id}</td>
                    <td className="p-2">{i.total}</td>
                    <td className="p-2 text-black/60">{new Date(i.last).toLocaleString()}</td>
                    <td className="max-w-[420px] truncate p-2 text-black/60" title={i.prompt ?? ""}>{i.prompt ?? "—"}</td>
                  </tr>
                ))}
                {q.data.byImage.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-black/50">No imagery events yet. The imagery library will log generate/view/use events automatically.</td></tr>
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
