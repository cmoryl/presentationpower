import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  exportPrintAssetAsPdf,
  type PrintPageSizeKey,
  type PrintExportQuality,
} from "@/lib/print-asset-export";
import { useServerFn } from "@tanstack/react-start";

import { AppShell } from "@/components/AppShell";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { BrandLockup } from "@/components/BrandLockup";
import { AuroraLayer } from "@/components/slide/flagship";
import {
  loadPrintAsset,
  updatePrintAsset,
  deletePrintAsset,
  synthesizeCaseStudy,
} from "@/lib/print-assets.functions";
import { getDivisionContext } from "@/lib/division-knowledge.functions";
import type {
  CaseStudyContent,
  CaseStudyStat,
  PrintAssetContext,
  PrintAssetRow,
  PrintDensity,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { emptyCaseStudy } from "@/lib/print-assets.types";
import { Save, Trash2, Sparkles, FileDown, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/asset/$assetId")({
  head: ({ params }) => ({
    meta: [
      { title: `Print asset · ${params.assetId.slice(0, 6)}` },
      { name: "description", content: "Edit and export your print-ready case study." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: AssetEditor,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Editor failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function AssetEditor() {
  const { assetId } = Route.useParams();
  const navigate = useNavigate();
  const { brandModes } = useTaxonomy();
  const load = useServerFn(loadPrintAsset);
  const save = useServerFn(updatePrintAsset);
  const remove = useServerFn(deletePrintAsset);
  const synth = useServerFn(synthesizeCaseStudy);
  const fetchDivisionCtx = useServerFn(getDivisionContext);

  const [row, setRow] = useState<PrintAssetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [synthBusy, setSynthBusy] = useState(false);
  const [divisionStats, setDivisionStats] = useState<Array<{ label: string; value: string; unit: string | null }>>([]);
  const [divisionQuotes, setDivisionQuotes] = useState<Array<{ quote: string; author: string | null; role: string | null }>>([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportSize, setExportSize] = useState<PrintPageSizeKey>("A4");
  const [customW, setCustomW] = useState(8.5);
  const [customH, setCustomH] = useState(11);
  const [bleedIn, setBleedIn] = useState(0.125);
  const [cropMarks, setCropMarks] = useState(true);
  const [exportMode, setExportMode] = useState<"light" | "dark">("light");
  const [exportQuality, setExportQuality] = useState<PrintExportQuality>("300dpi");


  useEffect(() => {
    load({ data: { assetId } })
      .then((r) => {
        setRow(r);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assetId, load]);

  useEffect(() => {
    if (!row?.brand_mode_id) return;
    fetchDivisionCtx({ data: { divisionId: row.brand_mode_id, knowledgeLimit: 12 } })
      .then((ctx) => {
        setDivisionStats(ctx.stats.map((s) => ({ label: s.label, value: s.value, unit: s.unit })));
        setDivisionQuotes(ctx.quotes.map((q) => ({ quote: q.quote, author: q.author, role: q.role })));
      })
      .catch(() => {
        // Non-fatal — editor still works without division context.
      });
  }, [row?.brand_mode_id, fetchDivisionCtx]);

  const brand = useMemo(
    () => brandModes.find((b) => b.id === row?.brand_mode_id) ?? brandModes[0],
    [brandModes, row?.brand_mode_id],
  );

  if (loading) return <AppShell><div className="p-10 text-sm text-black/60">Loading…</div></AppShell>;
  if (!row) return <AppShell><div className="p-10 text-sm text-red-600">Print asset not found.</div></AppShell>;

  const content: CaseStudyContent = { ...emptyCaseStudy(), ...(row.content as CaseStudyContent) };
  const ctx: PrintAssetContext = (row.context as PrintAssetContext) ?? {};

  function patchContent(patch: Partial<CaseStudyContent>) {
    if (!row) return;
    setRow({ ...row, content: { ...content, ...patch } as unknown as CaseStudyContent });
    setDirty(true);
  }
  function patchCtx(patch: Partial<PrintAssetContext>) {
    if (!row) return;
    setRow({ ...row, context: { ...ctx, ...patch } as unknown as PrintAssetContext });
    setDirty(true);
  }
  function updateStat(i: number, patch: Partial<CaseStudyStat>) {
    const next = [...content.stats];
    next[i] = { ...next[i], ...patch };
    patchContent({ stats: next });
  }

  async function handleSave() {
    if (!row) return;
    setSaving(true);
    try {
      const updated = await save({
        data: {
          assetId: row.id,
          title: row.title,
          content: row.content as unknown as Record<string, unknown>,
          context: row.context as unknown as Record<string, unknown>,
        },
      });
      setRow(updated);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!row) return;
    if (!confirm("Delete this print asset? This cannot be undone.")) return;
    await remove({ data: { assetId: row.id } });
    navigate({ to: "/" });
  }

  async function handleSynthesize() {
    if (!row) return;
    setSynthBusy(true);
    try {
      const ctxRes = row.brand_mode_id
        ? await fetchDivisionCtx({ data: { divisionId: row.brand_mode_id, knowledgeLimit: 8 } })
        : null;
      const snippets = (ctxRes?.knowledge ?? []).map((k) => `${k.title}: ${k.body.slice(0, 400)}`);
      const res = await synth({
        data: {
          assetId: row.id,
          brief: {
            prospect: content.client,
            industry: content.industry,
            audience: content.audience,
            summary: content.summary,
          },
          knowledgeSnippets: snippets,
        },
      });
      patchContent({
        challenge: res.challenge ?? content.challenge,
        solution: res.solution ?? content.solution,
        result: res.result ?? content.result,
      });
    } finally {
      setSynthBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!canvasRef.current) return;
    setExportBusy(true);
    try {
      const safeTitle = (row?.title ?? "print-asset").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
      await exportPrintAssetAsPdf(canvasRef.current, {
        pageSize: exportSize,
        custom: exportSize === "Custom" ? { widthIn: customW, heightIn: customH } : undefined,
        bleedIn,
        cropMarks,
        mode: exportMode,
        quality: exportQuality,
        filename: `${safeTitle}-${exportSize.toLowerCase()}-${exportQuality}.pdf`,
        onQualityClamp: (info) => {
          alert(
            `Requested ${info.requestedDpi} DPI exceeded the browser canvas ceiling ` +
              `(${info.reason}). Exporting at ~${info.effectiveDpi} DPI instead.`,
          );
        },
      });
      setExportOpen(false);

    } catch (e) {
      alert(`Export failed: ${(e as Error).message}`);
    } finally {
      setExportBusy(false);
    }
  }

  const pageSize: PrintPageSize = ctx.pageSize ?? "A4";
  const density: PrintDensity = ctx.density ?? "standard";
  const canvasAspect =
    pageSize === "A4" ? "1 / 1.414"
    : pageSize === "Letter" ? "8.5 / 11"
    : "1 / 1";
  // Aurora orb frame in the shared 1280×720 native space. Portrait / square
  // page sizes re-project the aurora composition onto a taller / square
  // frame so orbs bleed in from the correct edges (issue: with default
  // slice-preserved 16:9 aurora, a portrait page cropped out the horizontal
  // spread and looked flat). Landscape stays at native 1280×720.
  const auroraAspect: { w: number; h: number } | undefined =
    pageSize === "A4"
      ? { w: Math.round((1280 * 8.2677) / 11.6929), h: 1280 }
      : pageSize === "Letter"
        ? { w: Math.round((1280 * 8.5) / 11), h: 1280 }
        : pageSize === "Square"
          ? { w: 1280, h: 1280 }
          : undefined;

  const densityPad = density === "compact" ? "p-8" : density === "airy" ? "p-16" : "p-12";
  const densityGap = density === "compact" ? "gap-4" : density === "airy" ? "gap-10" : "gap-6";


  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-2 py-6">
        {/* HEADER BAR */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
              <span className="inline-flex items-center gap-1"><ChevronLeft size={14} /> Home</span>
            </Link>
            <input
              value={row.title}
              onChange={(e) => { setRow({ ...row, title: e.target.value }); setDirty(true); }}
              className="rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-[#03002C] hover:border-black/10 focus:border-[#003FC7] focus:outline-none dark:text-white dark:hover:border-white/10"
            />
            <span className="rounded-full bg-[#A1FBF9]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#03002C] dark:text-[#A1FBF9]">
              {row.kind}
            </span>
            {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSynthesize}
              disabled={synthBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
            >
              <Sparkles size={12} /> {synthBusy ? "Drafting…" : "Draft from division knowledge"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#03002C] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-[#03002C]"
            >
              <Save size={12} /> {saving ? "Saving…" : "Save"}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/70 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70"
              >
                <FileDown size={12} /> Export PDF
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-xl dark:border-white/10 dark:bg-[#0B0A2A]">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/60 dark:text-white/60">PDF export</div>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-black/60 dark:text-white/60">Page size</span>
                      <select
                        value={exportSize}
                        onChange={(e) => setExportSize(e.target.value as PrintPageSizeKey)}
                        className={inspectorInput}
                      >
                        <option value="A4">A4 (210 × 297 mm)</option>
                        <option value="Letter">US Letter (8.5 × 11 in)</option>
                        <option value="Square">Square (8.5 × 8.5 in)</option>
                        <option value="Custom">Custom…</option>
                      </select>
                    </label>
                    {exportSize === "Custom" && (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-black/50 dark:text-white/50">Width (in)</span>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="60"
                            value={customW}
                            onChange={(e) => setCustomW(parseFloat(e.target.value) || 0)}
                            className={inspectorInput}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-black/50 dark:text-white/50">Height (in)</span>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="60"
                            value={customH}
                            onChange={(e) => setCustomH(parseFloat(e.target.value) || 0)}
                            className={inspectorInput}
                          />
                        </label>
                      </div>
                    )}
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-black/60 dark:text-white/60">Bleed</span>
                      <select
                        value={bleedIn}
                        onChange={(e) => setBleedIn(parseFloat(e.target.value))}
                        className={inspectorInput}
                      >
                        <option value={0}>None</option>
                        <option value={0.125}>0.125 in (3 mm)</option>
                        <option value={0.25}>0.25 in (6 mm)</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-black/60 dark:text-white/60">Crop marks</span>
                      <input
                        type="checkbox"
                        checked={cropMarks}
                        onChange={(e) => setCropMarks(e.target.checked)}
                        disabled={bleedIn === 0}
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-black/60 dark:text-white/60">Mode</span>
                      <select
                        value={exportMode}
                        onChange={(e) => setExportMode(e.target.value as "light" | "dark")}
                        className={inspectorInput}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-black/60 dark:text-white/60">Quality</span>
                      <select
                        value={exportQuality}
                        onChange={(e) => setExportQuality(e.target.value as PrintExportQuality)}
                        className={inspectorInput}
                      >
                        <option value="300dpi">300 DPI · print standard</option>
                        <option value="600dpi">600 DPI · archival</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setExportOpen(false)}
                      className="rounded-full px-3 py-1 text-[11px] text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={exportBusy}
                      className="rounded-full bg-[#03002C] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-[#03002C]"
                    >
                      {exportBusy ? "Rendering…" : "Download PDF"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:border-red-400 dark:border-red-500/30 dark:bg-white/[0.03]"
              aria-label="Delete asset"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="grid grid-cols-[220px_1fr_340px] gap-6">
          {/* SPINE */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">Pages</div>
            {["Cover", "Challenge", "Solution", "Result", "Stats", "Quote", "CTA / Contact"].map((p, i) => (
              <div
                key={p}
                className="rounded-xl border border-black/10 bg-white p-3 text-xs text-[#03002C] dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
              >
                <div className="font-mono text-[10px] text-black/40 dark:text-white/40">{String(i + 1).padStart(2, "0")}</div>
                {p}
              </div>
            ))}
          </div>

          {/* CANVAS */}
          <div
            ref={canvasRef}
            className="relative overflow-hidden rounded-3xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-[#0B0A2A]"
            style={{ aspectRatio: canvasAspect }}
          >
            {brand && <AuroraLayer seed={`asset-${row.id}`} brand={brand} intensity={0.9} aspect={auroraAspect} />}
            <div className={`relative flex h-full flex-col justify-between ${densityPad} text-[#03002C] dark:text-white`}>
              {/* TOP */}
              <div className="flex items-start justify-between">
                {brand && <BrandLockup brand={brand} color="currentColor" size="sm" />}
                <div className="text-right text-[10px] uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
                  {content.eyebrow ?? "Case study"} · {pageSize}
                </div>
              </div>
              {/* CENTER */}
              <div className={`flex flex-col ${densityGap}`}>
                <input
                  value={content.client}
                  onChange={(e) => patchContent({ client: e.target.value })}
                  placeholder="Client name"
                  className="w-full bg-transparent text-4xl font-semibold leading-tight tracking-tight focus:outline-none"
                />
                <div className="max-w-2xl">
                  <textarea
                    value={content.summary ?? ""}
                    onChange={(e) => patchContent({ summary: e.target.value })}
                    rows={2}
                    placeholder="One-line engagement summary"
                    className="w-full resize-none bg-transparent text-lg leading-snug text-black/70 focus:outline-none dark:text-white/70"
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {content.stats.slice(0, 3).map((s, i) => (
                    <div key={i} className="rounded-xl bg-white/60 p-3 backdrop-blur dark:bg-white/[0.06]">
                      <div className="text-3xl font-semibold tracking-tight">
                        {s.value}
                        {s.unit && <span className="ml-0.5 text-lg text-black/60 dark:text-white/60">{s.unit}</span>}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-wider text-black/60 dark:text-white/60">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* BOTTOM */}
              <div className="grid grid-cols-3 gap-4 text-xs">
                <Block label={content.challenge.heading} body={content.challenge.body} onChange={(b) => patchContent({ challenge: { ...content.challenge, body: b } })} />
                <Block label={content.solution.heading} body={content.solution.body} onChange={(b) => patchContent({ solution: { ...content.solution, body: b } })} />
                <Block label={content.result.heading} body={content.result.body} onChange={(b) => patchContent({ result: { ...content.result, body: b } })} />
              </div>
              {ctx.printSafeArea && (
                <div className="pointer-events-none absolute inset-6 rounded-2xl border border-dashed border-black/25 dark:border-white/25" />
              )}
            </div>
          </div>

          {/* INSPECTOR */}
          <div className="space-y-4">
            <Panel title="Layout">
              <Row label="Page size">
                <select
                  value={pageSize}
                  onChange={(e) => patchCtx({ pageSize: e.target.value as PrintPageSize })}
                  className={inspectorInput}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">US Letter</option>
                  <option value="Square">Square</option>
                </select>
              </Row>
              <Row label="Density">
                <select
                  value={density}
                  onChange={(e) => patchCtx({ density: e.target.value as PrintDensity })}
                  className={inspectorInput}
                >
                  <option value="compact">Compact</option>
                  <option value="standard">Standard</option>
                  <option value="airy">Airy</option>
                </select>
              </Row>
              <Row label="Print-safe area">
                <input
                  type="checkbox"
                  checked={!!ctx.printSafeArea}
                  onChange={(e) => patchCtx({ printSafeArea: e.target.checked })}
                />
              </Row>
            </Panel>

            <Panel title="Stats">
              {content.stats.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px] gap-2">
                  <input className={inspectorInput} value={s.label} onChange={(e) => updateStat(i, { label: e.target.value })} placeholder="Label" />
                  <input className={inspectorInput} value={s.value} onChange={(e) => updateStat(i, { value: e.target.value })} placeholder="0" />
                </div>
              ))}
              {divisionStats.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-black/50 dark:text-white/50">From division</div>
                  <div className="mt-1 space-y-1">
                    {divisionStats.slice(0, 5).map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const next = [...content.stats];
                          const idx = next.findIndex((x) => !x.label || !x.value);
                          const target = idx >= 0 ? idx : 0;
                          next[target] = { label: s.label, value: s.value, unit: s.unit ?? "" };
                          patchContent({ stats: next });
                        }}
                        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-left text-[11px] hover:border-[#003FC7] dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        <span className="font-semibold">{s.value}{s.unit ?? ""}</span> · {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Quote">
              <textarea
                rows={3}
                className={inspectorInput}
                placeholder="Pull-quote text"
                value={content.quote?.text ?? ""}
                onChange={(e) => patchContent({ quote: { ...(content.quote ?? { author: "" }), text: e.target.value, author: content.quote?.author ?? "" } })}
              />
              <input
                className={inspectorInput}
                placeholder="Author"
                value={content.quote?.author ?? ""}
                onChange={(e) => patchContent({ quote: { ...(content.quote ?? { text: "" }), author: e.target.value, text: content.quote?.text ?? "" } })}
              />
              <input
                className={inspectorInput}
                placeholder="Role, Company"
                value={content.quote?.role ?? ""}
                onChange={(e) => patchContent({ quote: { ...(content.quote ?? { text: "", author: "" }), role: e.target.value, text: content.quote?.text ?? "", author: content.quote?.author ?? "" } })}
              />
              {divisionQuotes.length > 0 && (
                <div className="pt-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-black/50 dark:text-white/50">From division</div>
                  <div className="mt-1 space-y-1">
                    {divisionQuotes.slice(0, 3).map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => patchContent({ quote: { text: q.quote, author: q.author ?? "", role: q.role ?? "" } })}
                        className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-left text-[11px] hover:border-[#003FC7] dark:border-white/10 dark:bg-white/[0.03]"
                      >
                        “{q.quote.slice(0, 90)}{q.quote.length > 90 ? "…" : ""}”
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="Expert / contact">
              <input className={inspectorInput} placeholder="Name" value={content.expert?.name ?? ""} onChange={(e) => patchContent({ expert: { ...(content.expert ?? {}), name: e.target.value } })} />
              <input className={inspectorInput} placeholder="Role" value={content.expert?.role ?? ""} onChange={(e) => patchContent({ expert: { ...(content.expert ?? { name: "" }), role: e.target.value, name: content.expert?.name ?? "" } })} />
              <input className={inspectorInput} placeholder="Email" value={content.expert?.email ?? ""} onChange={(e) => patchContent({ expert: { ...(content.expert ?? { name: "" }), email: e.target.value, name: content.expert?.name ?? "" } })} />
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const inspectorInput =
  "w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs text-[#03002C] focus:border-[#003FC7] focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-white";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/60 dark:text-white/60">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-black/60 dark:text-white/60">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Block({ label, body, onChange }: { label: string; body: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">{label}</div>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Add the story here…"
        className="mt-1 w-full resize-none rounded-md bg-transparent text-[13px] leading-snug focus:outline-none"
      />
    </div>
  );
}
