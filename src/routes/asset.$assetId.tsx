import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  exportPrintAssetAsPdf,
  type PrintPageSizeKey,
  type PrintExportQuality,
  type PrintExportFormat,
} from "@/lib/print-asset-export";
import { X4_ICC_PROFILES, type IccProfileKey } from "@/lib/pdf-x4";
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
  PrintHeroMedia,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { emptyCaseStudy, emptySpotlight, emptyEBrochure, emptyAdaptorBrief } from "@/lib/print-assets.types";
import type { PrintSection, PrintStatsSection, PrintStatsVariant } from "@/lib/print-assets.types";
import type { SpotlightContent, EBrochureContent, AdaptorBriefContent } from "@/lib/print-assets.types";
import { PRINT_STATS_VARIANTS, PrintSectionRenderer } from "@/components/print/sections/PrintSectionRenderer";
import { PrintSectionPicker } from "@/components/print/sections/PrintSectionPicker";
import { DivisionImageryPicker } from "@/components/print/DivisionImageryPicker";
import { HeroPreviewPanel } from "@/components/print/HeroPreviewPanel";
import { LayoutHealthBanner } from "@/components/print/LayoutHealthBanner";
import { analyzePrintAsset, canAddModule } from "@/lib/print-capacity";
import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { EBrochureLayout } from "@/components/print/EBrochureLayout";
import { AdaptorBriefLayout } from "@/components/print/AdaptorBriefLayout";
import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { Save, Trash2, Sparkles, FileDown, ChevronLeft, Plus, ArrowUp, ArrowDown, Images, GripVertical, Undo2, Redo2 } from "lucide-react";

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
  const [exportFormat, setExportFormat] = useState<PrintExportFormat>("digital");
  const [iccProfile, setIccProfile] = useState<IccProfileKey>("GRACoL2013_CRPC6");
  const [pickerOpen, setPickerOpen] = useState(false);

  // Undo/redo history for content + context snapshots.
  const historyRef = useRef<{
    undo: Array<{ content: unknown; context: unknown }>;
    redo: Array<{ content: unknown; context: unknown }>;
  }>({ undo: [], redo: [] });
  const [, setHistoryTick] = useState(0);
  const canUndo = historyRef.current.undo.length > 0;
  const canRedo = historyRef.current.redo.length > 0;
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redoRef.current(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);





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

  const kind = (row.kind ?? "case-study") as "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  const rawContent: Record<string, unknown> = (() => {
    const c = (row.content as Record<string, unknown>) ?? {};
    if (kind === "spotlight") return { ...(emptySpotlight() as unknown as Record<string, unknown>), ...c };
    if (kind === "ebrochure") return { ...(emptyEBrochure() as unknown as Record<string, unknown>), ...c };
    if (kind === "adaptor-brief") return { ...(emptyAdaptorBrief() as unknown as Record<string, unknown>), ...c };
    return { ...(emptyCaseStudy() as unknown as Record<string, unknown>), ...c };
  })();
  const content: CaseStudyContent = rawContent as unknown as CaseStudyContent;
  const ctx: PrintAssetContext = (row.context as PrintAssetContext) ?? {};

  function pushHistory() {
    if (!row) return;
    historyRef.current.undo.push({ content: row.content, context: row.context });
    if (historyRef.current.undo.length > 100) historyRef.current.undo.shift();
    historyRef.current.redo = [];
  }
  function patchContent(patch: Partial<CaseStudyContent>) {
    if (!row) return;
    pushHistory();
    setRow({ ...row, content: { ...content, ...patch } as unknown as CaseStudyContent });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }
  function patchCtx(patch: Partial<PrintAssetContext>) {
    if (!row) return;
    pushHistory();
    setRow({ ...row, context: { ...ctx, ...patch } as unknown as PrintAssetContext });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }
  function undo() {
    if (!row || historyRef.current.undo.length === 0) return;
    const prev = historyRef.current.undo.pop()!;
    historyRef.current.redo.push({ content: row.content, context: row.context });
    setRow({ ...row, content: prev.content as CaseStudyContent, context: prev.context as PrintAssetContext });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }
  function redo() {
    if (!row || historyRef.current.redo.length === 0) return;
    const nxt = historyRef.current.redo.pop()!;
    historyRef.current.undo.push({ content: row.content, context: row.context });
    setRow({ ...row, content: nxt.content as CaseStudyContent, context: nxt.context as PrintAssetContext });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }
  undoRef.current = undo;
  redoRef.current = redo;

  // Generic path-based writer for click-in-preview live editing on the
  // non-case-study kinds. Path syntax matches @/lib/qa readPath:
  // "a.b", "a[0].b".
  function writePath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
    const parts: (string | number)[] = path.split(".").flatMap((p) => {
      const m = /^([^\[]+)(\[(\d+)\])?$/.exec(p);
      if (!m) return [p];
      return m[3] !== undefined ? [m[1]!, Number(m[3])] : [m[1]!];
    });
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    let cur: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]!;
      const nextK = parts[i + 1]!;
      const child = cur[k];
      const nextChild = Array.isArray(child) ? [...child] : { ...(child ?? (typeof nextK === "number" ? [] : {})) };
      cur[k] = nextChild;
      cur = nextChild;
    }
    cur[parts[parts.length - 1]!] = value;
    return clone as Record<string, unknown>;
  }

  function patchByPath(path: string, value: unknown) {
    if (!row) return;
    pushHistory();
    const nextContent = writePath(rawContent, path, value);
    setRow({ ...row, content: nextContent as unknown as CaseStudyContent });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }

  // Collect all non-empty string paths in the content object so LiveEditOverlay
  // can bind DOM text nodes back to structured content.
  function collectStringPaths(v: unknown, prefix = ""): string[] {
    if (typeof v === "string") return v.trim() ? [prefix] : [];
    if (Array.isArray(v)) {
      const out: string[] = [];
      v.forEach((item, i) => out.push(...collectStringPaths(item, `${prefix}[${i}]`)));
      return out;
    }
    if (v && typeof v === "object") {
      const out: string[] = [];
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const p = prefix ? `${prefix}.${k}` : k;
        out.push(...collectStringPaths(val, p));
      }
      return out;
    }
    return [];
  }
  const editableFieldPaths = collectStringPaths(rawContent);

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
      const suffix =
        exportFormat === "digital"
          ? "digital"
          : exportFormat === "press-x4"
            ? `pressX4-${exportQuality}`
            : `press-${exportQuality}`;
      await exportPrintAssetAsPdf(canvasRef.current, {
        pageSize: exportSize,
        custom: exportSize === "Custom" ? { widthIn: customW, heightIn: customH } : undefined,
        bleedIn,
        cropMarks,
        mode: exportMode,
        quality: exportQuality,
        format: exportFormat,
        iccProfile: exportFormat === "press-x4" ? iccProfile : undefined,
        filename: `${safeTitle}-${exportSize.toLowerCase()}-${suffix}.pdf`,
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
            <div className="mr-1 flex items-center gap-0.5 rounded-full border border-black/10 bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                title="Undo (⌘/Ctrl+Z)"
                aria-label="Undo"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[#03002C] hover:bg-black/5 disabled:opacity-30 dark:text-white dark:hover:bg-white/5"
              >
                <Undo2 size={12} /> Undo
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                title="Redo (⌘/Ctrl+Shift+Z)"
                aria-label="Redo"
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[#03002C] hover:bg-black/5 disabled:opacity-30 dark:text-white dark:hover:bg-white/5"
              >
                <Redo2 size={12} /> Redo
              </button>
            </div>

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
                <div className="absolute right-0 top-10 z-50 w-[22rem] rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-xl dark:border-white/10 dark:bg-[#0B0A2A]">
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/60 dark:text-white/60">PDF export</div>

                  {/* Format — the top-level distinction. Digital vs Press must
                      be an explicit choice; a user should never accidentally
                      email a 100 MB press file or send a 150 DPI file to a
                      printer. */}
                  <div className="mb-3 rounded-xl border border-black/10 p-2 dark:border-white/10">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 dark:text-white/50">Output for</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setExportFormat("digital")}
                        className={`rounded-lg border px-2 py-2 text-left text-[11px] transition ${
                          exportFormat === "digital"
                            ? "border-[#003FC7] bg-[#003FC7]/5 text-[#03002C] dark:border-[#A1FBF9] dark:bg-[#A1FBF9]/10 dark:text-white"
                            : "border-black/10 text-black/60 hover:border-black/30 dark:border-white/10 dark:text-white/60"
                        }`}
                      >
                        <div className="font-semibold">Digital PDF</div>
                        <div className="mt-0.5 leading-snug text-[10px] opacity-75">Screen / email · 150 DPI · small file</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportFormat("press-x4")}
                        className={`rounded-lg border px-2 py-2 text-left text-[11px] transition ${
                          exportFormat === "press-x4"
                            ? "border-[#003FC7] bg-[#003FC7]/5 text-[#03002C] dark:border-[#A1FBF9] dark:bg-[#A1FBF9]/10 dark:text-white"
                            : "border-black/10 text-black/60 hover:border-black/30 dark:border-white/10 dark:text-white/60"
                        }`}
                      >
                        <div className="font-semibold">Press PDF · X-4</div>
                        <div className="mt-0.5 leading-snug text-[10px] opacity-75">Printer-ready · bleed · large file</div>
                      </button>
                    </div>
                  </div>

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

                    {/* Press-only options. Digital enforces no-bleed / no-marks
                        / 150 DPI / no ICC by construction. */}
                    {exportFormat === "press-x4" && (
                      <>
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
                          <span className="text-black/60 dark:text-white/60">Quality</span>
                          <select
                            value={exportQuality}
                            onChange={(e) => setExportQuality(e.target.value as PrintExportQuality)}
                            className={inspectorInput}
                          >
                            <option value="300dpi">300 DPI · print standard</option>
                            <option value="600dpi">600 DPI · premium</option>
                          </select>
                        </label>
                        <label className="flex items-center justify-between gap-3">
                          <span className="text-black/60 dark:text-white/60">ICC profile</span>
                          <select
                            value={iccProfile}
                            onChange={(e) => setIccProfile(e.target.value as IccProfileKey)}
                            className={inspectorInput}
                          >
                            {(Object.keys(X4_ICC_PROFILES) as IccProfileKey[]).map((k) => (
                              <option key={k} value={k}>{X4_ICC_PROFILES[k].label}</option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
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
            {kind === "case-study" ? (
              <>
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
              </>
            ) : (
              <LiveEditOverlay
                enabled={true}
                slideId={`asset-${row.id}-${kind}`}
                content={rawContent}
                editableFields={editableFieldPaths}
                onChange={(path, value) => patchByPath(path, value)}
              >
                {brand && kind === "spotlight" && (
                  <SpotlightLayout
                    content={rawContent as unknown as SpotlightContent}
                    brand={brand}
                    mode="light"
                    pageSize={pageSize}
                    density={density}
                    seed={`asset-${row.id}`}
                  />
                )}
                {brand && kind === "ebrochure" && (
                  <EBrochureLayout
                    content={rawContent as unknown as EBrochureContent}
                    brand={brand}
                    mode="light"
                    pageSize={pageSize}
                    density={density}
                    seed={`asset-${row.id}`}
                  />
                )}
                {brand && kind === "adaptor-brief" && (
                  <AdaptorBriefLayout
                    content={rawContent as unknown as AdaptorBriefContent}
                    brand={brand}
                    mode="light"
                    pageSize={pageSize}
                    density={density}
                    seed={`asset-${row.id}`}
                  />
                )}
              </LiveEditOverlay>
            )}
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

            <HeroMediaPanel
              value={content.heroMedia}
              onChange={(next) => patchContent({ heroMedia: next })}
              divisionId={row?.brand_mode_id ?? null}
            />

            <HeroPreviewPanel media={content.heroMedia} brand={brand} />





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

            <Panel title="Shared modules">
              <LayoutHealthBanner report={analyzePrintAsset("case-study", content)} />
              <ModulesPanel
                kind="case-study"
                modules={content.modules ?? []}
                onAdd={() => setPickerOpen(true)}
                onChange={(next) => patchContent({ modules: next })}
              />
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
      <PrintSectionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onInsert={(section) => {
          const next = [...(content.modules ?? []), section];
          patchContent({ modules: next });
        }}
        brand={brand}
        mode="light"
      />
    </AppShell>
  );
}

function ModulesPanel({
  kind, modules, onAdd, onChange,
}: {
  kind: "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  modules: PrintSection[];
  onAdd: () => void;
  onChange: (next: PrintSection[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    const next = [...modules];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  }
  function remove(i: number) {
    onChange(modules.filter((_, k) => k !== i));
  }
  function patch(i: number, p: Partial<PrintSection>) {
    const cur = modules[i];
    if (!cur) return;
    const next = [...modules];
    next[i] = { ...cur, ...p } as PrintSection;
    onChange(next);
  }
  function patchStatsItem(i: number, itemIdx: number, p: Partial<PrintStatsSection["items"][number]>) {
    const cur = modules[i];
    if (!cur || cur.kind !== "stats") return;
    const items = [...cur.items];
    items[itemIdx] = { ...items[itemIdx]!, ...p };
    patch(i, { items } as Partial<PrintStatsSection>);
  }

  // Weight the lightest known variant so a "no room" verdict really means no
  // room even for the smallest module.
  const lightestWeight = 1.6;
  const gate = canAddModule(kind, modules, lightestWeight);

  return (
    <>
      <button
        type="button"
        onClick={onAdd}
        disabled={!gate.ok}
        data-testid="add-module-btn"
        title={gate.ok ? "Insert a shared module" : gate.reason}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-black/25 bg-transparent px-2 py-2 text-[11px] font-semibold uppercase tracking-widest text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-black/25 disabled:hover:text-black/70 dark:border-white/25 dark:text-white/70"
      >
        <Plus size={14} /> {gate.ok ? "Add module" : "Page full"}
      </button>
      {!gate.ok && (
        <div className="pt-1 text-[11px] leading-snug text-red-600 dark:text-red-300">
          {gate.reason}
        </div>
      )}
      {gate.ok && modules.length === 0 && (
        <div className="pt-1 text-[11px] text-black/50 dark:text-white/50">No shared modules yet. Insert stats blocks to enrich the document.</div>
      )}
      <div className="space-y-3">
        {modules.map((m, i) => (
          <div
            key={m.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              (e.currentTarget as HTMLDivElement).classList.add("ring-2", "ring-[#003FC7]");
            }}
            onDragLeave={(e) => {
              (e.currentTarget as HTMLDivElement).classList.remove("ring-2", "ring-[#003FC7]");
            }}
            onDrop={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLDivElement).classList.remove("ring-2", "ring-[#003FC7]");
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isNaN(from) || from === i) return;
              const next = [...modules];
              const [moved] = next.splice(from, 1);
              if (!moved) return;
              next.splice(i, 0, moved);
              onChange(next);
            }}
            className="rounded-md border border-black/10 p-2 transition dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-black/70 dark:text-white/70">
                <GripVertical size={14} className="cursor-grab text-black/40 dark:text-white/40" aria-hidden />
                {m.kind === "stats" ? "Stats" : "Module"}
              </div>
              <div className="flex items-center gap-1">
                <button className="rounded p-1 text-black/50 hover:bg-black/5" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={14} /></button>
                <button className="rounded p-1 text-black/50 hover:bg-black/5" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={14} /></button>
                <button className="rounded p-1 text-red-500 hover:bg-red-500/10" onClick={() => remove(i)} aria-label="Delete"><Trash2 size={14} /></button>
              </div>
            </div>

            {m.kind === "stats" && (
              <div className="mt-2 space-y-2">
                <select
                  className={inspectorInput}
                  value={m.variantId}
                  onChange={(e) => patch(i, { variantId: e.target.value as PrintStatsVariant } as Partial<PrintStatsSection>)}
                >
                  {PRINT_STATS_VARIANTS.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
                <input
                  className={inspectorInput}
                  placeholder="Eyebrow"
                  value={m.eyebrow ?? ""}
                  onChange={(e) => patch(i, { eyebrow: e.target.value } as Partial<PrintStatsSection>)}
                />
                <input
                  className={inspectorInput}
                  placeholder="Title"
                  value={m.title ?? ""}
                  onChange={(e) => patch(i, { title: e.target.value } as Partial<PrintStatsSection>)}
                />
                <div className="space-y-1">
                  {m.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_60px_50px] gap-1">
                      <input className={inspectorInput} placeholder="Label" value={it.label} onChange={(e) => patchStatsItem(i, idx, { label: e.target.value })} />
                      <input className={inspectorInput} placeholder="Value" value={it.value} onChange={(e) => patchStatsItem(i, idx, { value: e.target.value })} />
                      <input className={inspectorInput} placeholder="Unit" value={it.unit ?? ""} onChange={(e) => patchStatsItem(i, idx, { unit: e.target.value })} />
                    </div>
                  ))}
                </div>
                <div className="pt-1">
                  <PrintSectionRenderer section={m} mode="light" accent="#003FC7" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </>
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

function HeroMediaPanel({
  value,
  onChange,
  divisionId,
}: {
  value: PrintHeroMedia | undefined;
  onChange: (next: PrintHeroMedia | undefined) => void;
  divisionId: string | null;
}) {
  const enabled = !!value?.imageUrl;
  const media: PrintHeroMedia = value ?? { imageUrl: "" };
  const overlayOpacity = media.overlayOpacity ?? 0.55;
  const washStrength = media.washStrength ?? 1;
  const heightPct = media.heightPct ?? 46;
  const focalX = media.focalX ?? 50;
  const focalY = media.focalY ?? 40;
  const aspect = media.aspect ?? "fill";
  const [pickerOpen, setPickerOpen] = useState(false);

  // Inline curated strip — first N approved images for this division.
  const list = useServerFn(listDivisionImagery);
  const [curated, setCurated] = useState<DivisionImageryEntry[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(false);
  useEffect(() => {
    if (!divisionId) { setCurated([]); return; }
    let cancelled = false;
    setCuratedLoading(true);
    list({ data: { divisionId, onlyApproved: true } })
      .then((rows) => { if (!cancelled) setCurated(rows.slice(0, 12)); })
      .catch(() => { if (!cancelled) setCurated([]); })
      .finally(() => { if (!cancelled) setCuratedLoading(false); });
    return () => { cancelled = true; };
  }, [divisionId, list]);

  function patch(p: Partial<PrintHeroMedia>) {
    onChange({ ...media, ...p });
  }
  function selectFromCurated(entry: DivisionImageryEntry) {
    if (!entry.signedUrl) return;
    // Preserve current tuning if the user was mid-edit; otherwise seed sane defaults.
    const base: PrintHeroMedia = enabled
      ? media
      : { imageUrl: "", overlayOpacity: 0.55, washStrength: 1, scrim: "bottom", blendMode: "multiply", heightPct: 46 };
    onChange({ ...base, imageUrl: entry.signedUrl });
  }

  return (
    <Panel title="Hero media">
      <Row label="Enabled">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            e.target.checked
              ? onChange({ imageUrl: media.imageUrl || "", overlayOpacity: 0.55, washStrength: 1, scrim: "bottom", blendMode: "multiply", heightPct: 46 })
              : onChange(undefined)
          }
        />
      </Row>
      {/* Curated pool strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
          <span>Curated pool{divisionId ? "" : " · pick a division"}</span>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            disabled={!enabled}
            className="rounded border border-black/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em] text-black/60 transition hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-white/60 dark:hover:bg-white/[0.05]"
            title="Clear hero media — pages will render the deterministic division fallback"
          >
            Reset to default
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {curatedLoading && curated.length === 0 ? (
            <div className="col-span-4 flex items-center justify-center rounded border border-dashed border-black/10 py-3 text-[10px] text-black/50 dark:border-white/10 dark:text-white/40">
              Loading curated imagery…
            </div>
          ) : curated.length === 0 ? (
            <div className="col-span-4 rounded border border-dashed border-black/10 px-2 py-3 text-center text-[10px] text-black/50 dark:border-white/10 dark:text-white/40">
              {divisionId ? "No approved imagery yet for this division." : "Select a division to see curated imagery."}
            </div>
          ) : (
            curated.map((entry) => {
              const url = entry.variantUrls?.thumb ?? entry.signedUrl ?? "";
              const active = enabled && (entry.signedUrl === media.imageUrl);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectFromCurated(entry)}
                  className={`relative aspect-video overflow-hidden rounded border transition ${
                    active
                      ? "border-[#003FC7] ring-2 ring-[#003FC7]/40"
                      : "border-black/10 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
                  }`}
                  title={entry.filename || "Curated hero"}
                  style={url ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
                >
                  {!url && (
                    <span className="absolute inset-0 grid place-items-center text-[9px] text-black/50 dark:text-white/40">no preview</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className={`${inspectorInput} flex-1`}
          placeholder="Image URL (https://…)"
          value={media.imageUrl}
          onChange={(e) => patch({ imageUrl: e.target.value })}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={!divisionId}
          className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.05] px-2 py-1.5 text-[10px] uppercase tracking-[0.22em] text-white/80 transition hover:border-white/30 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
          title={divisionId ? "Browse full division imagery library" : "Select a division first"}
        >
          <Images className="h-3 w-3" />
          Library
        </button>
      </div>
      <DivisionImageryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        divisionId={divisionId}
        onPick={(entry) => {
          if (!entry.signedUrl) return;
          onChange({
            ...media,
            imageUrl: entry.signedUrl,
          });
        }}
      />

      <Row label="Aspect">
        <select
          className={inspectorInput}
          value={aspect}
          onChange={(e) => patch({ aspect: e.target.value as PrintHeroMedia["aspect"] })}
        >
          <option value="fill">Fill (band height)</option>
          <option value="21:9">21:9 Cinemascope</option>
          <option value="16:9">16:9 Widescreen</option>
          <option value="3:2">3:2 Photo</option>
          <option value="4:3">4:3 Classic</option>
          <option value="1:1">1:1 Square</option>
        </select>
      </Row>
      <Slider
        label="Focus X"
        value={focalX}
        min={0}
        max={100}
        step={1}
        onChange={(v) => patch({ focalX: v, focalPoint: undefined })}
        display={`${Math.round(focalX)}%`}
      />
      <Slider
        label="Focus Y"
        value={focalY}
        min={0}
        max={100}
        step={1}
        onChange={(v) => patch({ focalY: v, focalPoint: undefined })}
        display={`${Math.round(focalY)}%`}
      />
      {/* Interactive focal picker: click the preview to set X/Y */}
      {media.imageUrl && (
        <button
          type="button"
          onClick={(e) => {
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            // no-op — actual clicks are handled by the inner div below
            void rect;
          }}
          className="relative block h-24 w-full overflow-hidden rounded-md border border-black/10 dark:border-white/10"
          style={{
            backgroundImage: `url(${media.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: `${focalX}% ${focalY}%`,
          }}
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            patch({ focalX: Math.round(x), focalY: Math.round(y), focalPoint: undefined });
          }}
          aria-label="Set focal point"
        >
          <span
            className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${focalX}%`, top: `${focalY}%`, background: "#003FC7" }}
          />
        </button>
      )}
      <div className="grid grid-cols-[80px_1fr] items-center gap-2">
        <span className="text-[11px] text-black/60 dark:text-white/60">Wash color</span>
        <input
          type="color"
          className="h-7 w-full rounded-md border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]"
          value={media.overlayColor ?? "#003FC7"}
          onChange={(e) => patch({ overlayColor: e.target.value })}
        />
      </div>
      <Slider
        label="Overlay opacity"
        value={overlayOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => patch({ overlayOpacity: v })}
        display={`${Math.round(overlayOpacity * 100)}%`}
      />
      <Slider
        label="Wash strength"
        value={washStrength}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => patch({ washStrength: v })}
        display={`${Math.round(washStrength * 100)}%`}
      />
      <Slider
        label="Scrim opacity"
        value={media.scrimOpacity ?? washStrength}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => patch({ scrimOpacity: v })}
        display={`${Math.round((media.scrimOpacity ?? washStrength) * 100)}%`}
      />
      {aspect === "fill" && (
        <Slider
          label="Band height"
          value={heightPct}
          min={20}
          max={80}
          step={1}
          onChange={(v) => patch({ heightPct: v })}
          display={`${Math.round(heightPct)}%`}
        />
      )}
      <Row label="Scrim">
        <select
          className={inspectorInput}
          value={media.scrim ?? "bottom"}
          onChange={(e) => patch({ scrim: e.target.value as PrintHeroMedia["scrim"] })}
        >
          <option value="none">None</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="both">Both</option>
          <option value="radial">Radial</option>
        </select>
      </Row>
      <Row label="Auto scrim">
        <input
          type="checkbox"
          checked={media.autoScrim ?? false}
          onChange={(e) => patch({ autoScrim: e.target.checked })}
        />
      </Row>
      {media.autoScrim && (
        <Slider
          label="Auto threshold"
          value={media.autoScrimThreshold ?? 0.6}
          min={0.3}
          max={0.9}
          step={0.05}
          onChange={(v) => patch({ autoScrimThreshold: v })}
          display={`${Math.round((media.autoScrimThreshold ?? 0.6) * 100)}%`}
        />
      )}
      <Row label="Blend mode">
        <select
          className={inspectorInput}
          value={media.blendMode ?? "multiply"}
          onChange={(e) => patch({ blendMode: e.target.value as PrintHeroMedia["blendMode"] })}
        >
          <option value="normal">Normal</option>
          <option value="multiply">Multiply</option>
          <option value="overlay">Overlay</option>
          <option value="soft-light">Soft light</option>
          <option value="screen">Screen</option>
        </select>
      </Row>
    </Panel>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-black/60 dark:text-white/60">
        <span>{label}</span>
        <span className="tabular-nums text-black/80 dark:text-white/80">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[#003FC7]"
      />
    </div>
  );
}
