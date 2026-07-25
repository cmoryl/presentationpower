import { AdminLoading } from "@/components/admin/AdminPage";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listAbExperiments, createAbExperiment, setAbExperimentStatus, deleteAbExperiment,
} from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/ab")({
  component: AbView,
});

type StatKey = "cta_click" | "dwell" | "conversion" | "view";
type StatusKey = "draft" | "running" | "paused" | "ended";

function AbView() {
  const listFn = useServerFn(listAbExperiments);
  const createFn = useServerFn(createAbExperiment);
  const statusFn = useServerFn(setAbExperimentStatus);
  const delFn = useServerFn(deleteAbExperiment);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "ab"], queryFn: () => listFn(), retry: false });

  type CreateInput = {
    name: string; description?: string | null; hypothesis?: string | null;
    primaryMetric: StatKey; brandId?: string | null;
    variants: Array<{ name: string; palette: Record<string, string>; isControl: boolean; weight: number }>;
  };
  const createM = useMutation({
    mutationFn: (input: CreateInput) => createFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ab"] }),
  });

  const statusM = useMutation({
    mutationFn: (input: { id: string; status: StatusKey }) => statusFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ab"] }),
  });
  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "ab"] }),
  });

  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [metric, setMetric] = useState<StatKey>("cta_click");
  const [brandId, setBrandId] = useState("");
  const [variants, setVariants] = useState([
    { name: "Control", palette: { primary: "#003FC7", accent: "#A1FBF9", ink: "#03002C", surface: "#F5F1EA" }, isControl: true, weight: 50 },
    { name: "Variant B", palette: { primary: "#EC388A", accent: "#FFEB66", ink: "#03002C", surface: "#F5F1EA" }, isControl: false, weight: 50 },
  ]);

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-black/10 bg-white/70 p-6 backdrop-blur">
        <h2 className="text-lg font-semibold">New deck palette experiment</h2>
        <p className="mt-1 text-sm text-black/60">Test color palette variants on rendered decks. Track views, dwell, CTA clicks and conversions.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input placeholder="Experiment name" value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
          <input placeholder="Brand id (optional)" value={brandId} onChange={(e) => setBrandId(e.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm" />
          <textarea placeholder="Hypothesis" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm md:col-span-2" rows={2} />
          <select value={metric} onChange={(e) => setMetric(e.target.value as StatKey)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
            <option value="cta_click">Primary metric: CTA clicks</option>
            <option value="dwell">Primary metric: Dwell time</option>
            <option value="conversion">Primary metric: Conversions</option>
            <option value="view">Primary metric: Views</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {variants.map((v, i) => (
            <div key={i} className="rounded-xl border border-black/10 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input value={v.name} onChange={(e) => update(i, { name: e.target.value })}
                  className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs" />
                <label className="text-xs text-black/50">Weight
                  <input type="number" min={1} max={100} value={v.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })}
                    className="ml-1 w-16 rounded-lg border border-black/15 bg-white px-2 py-1 text-xs" />
                </label>
                <label className="text-xs text-black/50">
                  <input type="checkbox" checked={v.isControl} onChange={(e) => update(i, { isControl: e.target.checked })} className="mr-1" />
                  Control
                </label>
                {variants.length > 2 && (
                  <button onClick={() => setVariants(variants.filter((_, j) => j !== i))}
                    className="ml-auto rounded border border-red-200 px-2 py-1 text-xs text-red-700">Remove</button>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {(["primary", "accent", "ink", "surface"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-black/50">{k}</span>
                    <input type="color" value={v.palette[k]} onChange={(e) => update(i, { palette: { ...v.palette, [k]: e.target.value } })}
                      className="h-8 w-10 cursor-pointer rounded border border-black/15" />
                    <span className="font-mono">{v.palette[k]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {variants.length < 6 && (
            <button onClick={() => setVariants([...variants, { name: `Variant ${String.fromCharCode(65 + variants.length)}`, palette: { primary: "#003FC7", accent: "#A1FBF9", ink: "#03002C", surface: "#F5F1EA" }, isControl: false, weight: 50 }])}
              className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs">+ Add variant</button>
          )}
        </div>

        <button
          type="button"
          disabled={!name || createM.isPending}
          onClick={() => createM.mutate({
            name, description: null, hypothesis: hypothesis || null,
            primaryMetric: metric, brandId: brandId || null, variants,
          })}
          className="mt-4 rounded-lg bg-[#03002C] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {createM.isPending ? "Creating…" : "Create experiment"}
        </button>
        {createM.error && <div className="mt-2 text-sm text-red-600">{(createM.error as Error).message}</div>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Experiments</h2>
        {q.isLoading && <AdminLoading />}
        <div className="space-y-3">
          {q.data?.map((e: any) => {
            const totalConv = (e.variants as any[]).reduce((a, v) => a + v.conversions, 0);
            const winner = totalConv > 0 ? (e.variants as any[]).reduce((a: any, b: any) => (b.conversions > a.conversions ? b : a)) : null;
            return (
              <div key={e.id} className="rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-black/50">
                      {e.brand_id ?? "all brands"} · primary: {e.primary_metric} · created {new Date(e.created_at).toLocaleDateString()}
                    </div>
                    {e.hypothesis && <div className="mt-1 text-xs text-black/60 italic">{e.hypothesis}</div>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${e.status === "running" ? "bg-emerald-100 text-emerald-800" : e.status === "paused" ? "bg-amber-100 text-amber-800" : e.status === "ended" ? "bg-black/10 text-black/60" : "bg-blue-100 text-blue-800"}`}>{e.status}</span>
                    {(["draft", "running", "paused", "ended"] as const).map((st) => (
                      <button key={st} onClick={() => statusM.mutate({ id: e.id, status: st })}
                        className="rounded border border-black/15 bg-white px-2 py-1 text-[10px] uppercase tracking-widest hover:bg-black/5">{st}</button>
                    ))}
                    <button onClick={() => { if (confirm(`Delete "${e.name}"?`)) delM.mutate(e.id); }}
                      className="rounded border border-red-200 px-2 py-1 text-[10px] uppercase tracking-widest text-red-700 hover:bg-red-50">delete</button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {(e.variants as any[]).map((v) => {
                    const ctr = v.views > 0 ? (v.ctaClicks / v.views) * 100 : 0;
                    const isWinner = winner && winner.variantId === v.variantId;
                    return (
                      <div key={v.variantId} className={`rounded-xl border p-3 ${isWinner ? "border-emerald-400 bg-emerald-50/50" : "border-black/10 bg-white"}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium">
                            {v.name} {v.isControl && <span className="text-black/40">(control)</span>}
                          </div>
                          {isWinner && <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] uppercase text-white">Leader</span>}
                        </div>
                        <div className="mt-2 flex gap-1">
                          {["primary", "accent", "ink", "surface"].map((k) => (
                            <div key={k} className="h-6 w-6 rounded border border-black/10" title={`${k}: ${v.palette[k]}`} style={{ background: v.palette[k] }} />
                          ))}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-1 text-[11px]">
                          <div><span className="text-black/50">Views</span> <b>{v.views}</b></div>
                          <div><span className="text-black/50">CTA</span> <b>{v.ctaClicks}</b></div>
                          <div><span className="text-black/50">Dwell</span> <b>{v.dwellAvg}ms</b></div>
                          <div><span className="text-black/50">Conv</span> <b>{v.conversions}</b></div>
                          <div className="col-span-2"><span className="text-black/50">CTR</span> <b>{ctr.toFixed(1)}%</b></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {q.data && q.data.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-sm text-black/60">
              No experiments yet — create one above to start testing palette variants on decks.
            </div>
          )}
        </div>
      </section>
    </div>
  );

  function update(i: number, patch: Partial<(typeof variants)[number]>) {
    setVariants(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }
}
