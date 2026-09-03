// Viz Lab — the data-visualisation control room.
//
// Two jobs. (1) Correctness sweep: audit every supported chart kind on every
// surface (deck / press / social) in both light and dark, before and after the
// deterministic repair pass, so a regression in the chart engine is visible as
// a number rather than a bug report. (2) AI pass: paste real numbers and get a
// brand-governed spec back — the model picks the chart and writes the takeaway,
// the platform owns colour, type, alt text and export policy.

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Activity, Sparkles, ShieldCheck, AlertTriangle, Wand2, Presentation } from "lucide-react";
import { toast } from "sonner";

import { sweepVizModules, groupSweepByCode } from "@/lib/infographics/audit-sweep";
import type { VizSurface } from "@/lib/infographics/audit";
import { interpretVizData } from "@/lib/viz-ai.functions";
import { exportSpecsToPptx } from "@/lib/infographics/spec-to-pptx";
import type { InterpretVizResult } from "@/lib/viz-ai.schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/viz-lab")({
  head: () => ({
    meta: [
      { title: "Viz Lab · Data visualisation QA · TransPerfect Element" },
      {
        name: "description",
        content:
          "Audit every chart kind across deck, press and social surfaces, and turn raw numbers into a brand-governed visualisation with AI.",
      },
      { property: "og:title", content: "Viz Lab · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Chart correctness sweep plus an AI pass that reads raw data and returns an approved, accessible visualisation spec.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VizLabPage,
});

const SURFACES: VizSurface[] = ["presentation", "print", "social"];

function VizLabPage() {
  const sweep = useMemo(() => sweepVizModules(), []);
  const groups = useMemo(() => groupSweepByCode(sweep), [sweep]);
  const [surface, setSurface] = useState<VizSurface>("presentation");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [raw, setRaw] = useState("");
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InterpretVizResult | null>(null);
  const interpret = useServerFn(interpretVizData);
  const [exporting, setExporting] = useState(false);

  // The drafted spec is the single source of truth across surfaces: the same
  // rows/encoding drive the press sheet, the social frame and this .pptx.
  async function exportPptx() {
    if (!result?.spec) return;
    setExporting(true);
    const toastId = toast.loading("Building the PowerPoint slide from this spec…");
    try {
      await exportSpecsToPptx([{ spec: result.spec, insight: result.insight, mode }], {
        title: result.spec.title || "Campaign data view",
      });
      toast.success("PPTX exported from the same chart spec.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PPTX export failed.", { id: toastId });
    } finally {
      setExporting(false);
    }
  }

  const rows = useMemo(
    () => sweep.rows.filter((r) => r.surface === surface && r.mode === mode),
    [sweep, surface, mode],
  );

  async function runInterpret() {
    if (raw.trim().length < 3) {
      toast.error("Paste some numbers first — a table, CSV, or a couple of sentences.");
      return;
    }
    setBusy(true);
    const toastId = toast.loading("Reading the data and choosing a chart…");
    try {
      const res = await interpret({
        data: { data: raw, intent: intent || undefined, surface, mode },
      });
      setResult(res);
      if (res.ok) toast.success("Visualisation drafted and audited.", { id: toastId });
      else toast.error(res.error ?? "Could not interpret that data.", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Interpretation failed.", { id: toastId });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-16">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
          Viz Lab
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#03002C] dark:text-white">
          Data visualisation QA
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
          Every chart kind, audited on the surface it lands on. Charts are repaired automatically at
          render time — this is the receipt.
        </p>
      </div>

      {/* ------------------------------------------------------------- sweep */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#03002C] dark:text-white">
            <ShieldCheck className="h-4 w-4" /> Correctness sweep
          </h2>
          <div className="flex flex-wrap gap-4 text-xs text-black/60 dark:text-white/60">
            <span>{sweep.totals.combinations} combinations</span>
            <span>
              Blockers {sweep.totals.blockersBefore} → {sweep.totals.blockersAfter}
            </span>
            <span>
              Warnings {sweep.totals.warningsBefore} → {sweep.totals.warningsAfter}
            </span>
            <span>
              Score {sweep.totals.avgScoreBefore} → {sweep.totals.avgScoreAfter}
            </span>
            <span>{sweep.totals.autoFixed} auto-repairs</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SURFACES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={surface === s ? "default" : "outline"}
              onClick={() => setSurface(s)}
            >
              {s}
            </Button>
          ))}
          <span className="mx-2 h-8 w-px bg-black/10 dark:bg-white/10" />
          {(["light", "dark"] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "outline"}
              onClick={() => setMode(m)}
            >
              {m}
            </Button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-black/50 dark:text-white/50">
              <tr>
                <th className="py-2 pr-4 font-medium">Chart</th>
                <th className="py-2 pr-4 font-medium">Score</th>
                <th className="py-2 pr-4 font-medium">Blockers</th>
                <th className="py-2 pr-4 font-medium">Warnings</th>
                <th className="py-2 pr-4 font-medium">Residual findings</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.kind}-${r.surface}-${r.mode}`}
                  className="border-t border-black/5 dark:border-white/10"
                >
                  <td className="py-2 pr-4 font-medium text-[#03002C] dark:text-white">{r.kind}</td>
                  <td className="py-2 pr-4">
                    <span className="text-black/50 dark:text-white/50">{r.before.score}</span> →{" "}
                    <span
                      className={
                        r.after.score >= 90
                          ? "text-emerald-600"
                          : "text-amber-600 dark:text-amber-400"
                      }
                    >
                      {r.after.score}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{r.after.blockers}</td>
                  <td className="py-2 pr-4">{r.after.warnings}</td>
                  <td className="py-2 pr-4 text-black/60 dark:text-white/60">
                    {r.after.findings.length === 0
                      ? "Clean"
                      : r.after.findings.map((f) => f.code).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {groups.length > 0 ? (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <div
                key={g.code}
                className="rounded-xl border border-black/10 p-3 text-xs dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[#03002C] dark:text-white">{g.code}</span>
                  <Badge variant={g.severity === "blocker" ? "destructive" : "secondary"}>
                    {g.severity} ×{g.count}
                  </Badge>
                </div>
                <p className="mt-1 text-black/60 dark:text-white/60">{g.message}</p>
                <p className="mt-1 text-black/50 dark:text-white/50">{g.fix}</p>
                <p className="mt-1 text-black/45 dark:text-white/45">
                  {g.surfaces.join(" · ")} · {g.kinds.slice(0, 6).join(", ")}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* ---------------------------------------------------------- AI pass */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#03002C] dark:text-white">
          <Sparkles className="h-4 w-4" /> AI data pass
        </h2>
        <p className="mt-1 text-xs text-black/60 dark:text-white/60">
          Paste numbers as CSV, a pasted table, or plain sentences. The model chooses the chart and
          writes the takeaway; the platform owns colour, type, alt text and export policy.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              placeholder={"Region,Revenue\nEMEA,4.2\nNAMER,6.8\nAPAC,2.9"}
              className="font-mono text-xs"
            />
            <Input
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="What must this chart prove? (optional)"
            />
            <Button onClick={runInterpret} disabled={busy}>
              <Wand2 className="mr-2 h-4 w-4" />
              {busy ? "Working…" : `Draft for ${surface} · ${mode}`}
            </Button>
          </div>

          <div className="rounded-xl border border-black/10 p-4 text-xs dark:border-white/10">
            {!result ? (
              <p className="text-black/50 dark:text-white/50">
                <Activity className="mr-1 inline h-3.5 w-3.5" />
                The drafted spec, its audit and the applied repairs appear here.
              </p>
            ) : result.ok && result.spec ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{result.spec.kind}</Badge>
                  {result.audit ? (
                    <Badge variant={result.audit.publishable ? "secondary" : "destructive"}>
                      score {result.audit.score}
                    </Badge>
                  ) : null}
                  {(result.modules ?? []).slice(0, 3).map((m) => (
                    <Badge key={m} variant="outline">
                      {m}
                    </Badge>
                  ))}
                </div>
                {result.insight ? (
                  <p className="font-medium text-[#03002C] dark:text-white">{result.insight}</p>
                ) : null}
                {(result.caveats ?? []).length > 0 ? (
                  <ul className="list-disc pl-4 text-black/60 dark:text-white/60">
                    {result.caveats!.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : null}
                {(result.repairs ?? []).length > 0 ? (
                  <p className="text-black/50 dark:text-white/50">
                    Repairs: {result.repairs!.join(" · ")}
                  </p>
                ) : null}
                {(result.audit?.findings ?? []).length > 0 ? (
                  <ul className="space-y-1">
                    {result.audit!.findings.map((f) => (
                      <li key={`${f.code}-${f.message}`} className="flex gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span>
                          <span className="font-medium">{f.code}</span> — {f.message}{" "}
                          <span className="text-black/50 dark:text-white/50">{f.fix}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {(result.alternates ?? []).length > 0 ? (
                  <p className="text-black/50 dark:text-white/50">
                    Also consider:{" "}
                    {result.alternates!.map((a) => `${a.kind} (${a.why})`).join(" · ")}
                  </p>
                ) : null}
                <Button size="sm" variant="outline" onClick={exportPptx} disabled={exporting}>
                  <Presentation className="mr-2 h-3.5 w-3.5" />
                  {exporting ? "Exporting…" : "Export this spec as PPTX"}
                </Button>
                <pre className="max-h-64 overflow-auto rounded-lg bg-black/5 p-3 text-[10px] dark:bg-white/10">
                  {JSON.stringify(
                    { encoding: result.spec.encoding, rows: result.spec.data.rows.slice(0, 12) },
                    null,
                    2,
                  )}
                </pre>
              </div>
            ) : (
              <p className="text-rose-600 dark:text-rose-400">{result.error ?? "Failed."}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
