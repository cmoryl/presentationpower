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
  applyHeroToAllPrintAssets,
  previewApplyHeroToAllPrintAssets,
} from "@/lib/print-assets.functions";

import { getDivisionContext } from "@/lib/division-knowledge.functions";
import type {
  CaseStudyContent,
  CaseStudyStat,
  PrintAssetContext,
  PrintAssetRow,
  PrintDensity,
  PrintExportPrefs,
  PrintHeroMedia,
  PrintMode,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { emptyCaseStudy, emptySpotlight, emptyEBrochure, emptyAdaptorBrief } from "@/lib/print-assets.types";
import type { PrintSection, PrintStatsSection, PrintStatsVariant, PrintQuoteSection, PrintQuoteVariant, PrintLogoGridSection, PrintLogoGridVariant, PrintExpertiseSection, PrintExpertiseVariant, PrintFeatureListSection, PrintFeatureVariant } from "@/lib/print-assets.types";
import type { SpotlightContent, EBrochureContent, AdaptorBriefContent } from "@/lib/print-assets.types";
import {
  PRINT_STATS_VARIANTS,
  PRINT_QUOTE_VARIANTS,
  PRINT_LOGO_VARIANTS,
  PRINT_EXPERTISE_VARIANTS,
  PRINT_FEATURE_VARIANTS,
  PrintSectionRenderer,
} from "@/components/print/sections/PrintSectionRenderer";
import { PrintSectionPicker, PRINT_SECTION_DND_MIME } from "@/components/print/sections/PrintSectionPicker";
import { DivisionImageryPicker } from "@/components/print/DivisionImageryPicker";
import { listDivisionImagery, type DivisionImageryEntry } from "@/lib/division-imagery.functions";
import { getDivisionImagery } from "@/assets/backdrops/divisions";

import { HeroResizeHandle } from "@/components/print/HeroResizeHandle";
import { HeroPreviewPanel } from "@/components/print/HeroPreviewPanel";
import type { BrandMode } from "@/lib/taxonomy";

import { LayoutHealthBanner } from "@/components/print/LayoutHealthBanner";
import { analyzePrintAsset, canAddModule } from "@/lib/print-capacity";
import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { EBrochureLayout } from "@/components/print/EBrochureLayout";
import { AdaptorBriefLayout } from "@/components/print/AdaptorBriefLayout";
import { CaseStudyLayout } from "@/components/print/CaseStudyLayout";
import { ContentInspector } from "@/components/print/ContentInspector";
import { schemaFor } from "@/lib/print-content-schema";
import { CONTENT_SCHEMAS, unreachablePaths } from "@/lib/print-content-schema";

import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { SectionSelectOverlay } from "@/components/print/SectionSelectOverlay";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Save, Trash2, Sparkles, FileDown, ChevronLeft, Plus, ArrowUp, ArrowDown, Images, GripVertical, Undo2, Redo2, Sun, Moon, ChevronDown, ChevronRight, Eye, EyeOff, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadSlideMedia } from "@/lib/slide-media";

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
  // Export panel state — hydrated from ctx.exportPrefs on load, then mirrored
  // back to ctx on every change via updateExportPref so a user's preset
  // survives reload and can be duplicated with the asset.
  const [exportSize, setExportSize] = useState<PrintPageSizeKey>("A4");
  const [customW, setCustomW] = useState(8.5);
  const [customH, setCustomH] = useState(11);
  const [bleedIn, setBleedIn] = useState(0.125);
  const [cropMarks, setCropMarks] = useState(true);
  const [exportMode, setExportMode] = useState<PrintMode>("light");
  const [exportQuality, setExportQuality] = useState<PrintExportQuality>("300dpi");
  const [exportFormat, setExportFormat] = useState<PrintExportFormat>("digital");
  const [iccProfile, setIccProfile] = useState<IccProfileKey>("GRACoL2013_CRPC6");
  const [pickerOpen, setPickerOpen] = useState(false);
  const exportHydratedRef = useRef(false);

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
        // Hydrate export panel state from persisted prefs — WYSIWYG defaults.
        const prefs = (r.context as PrintAssetContext | null)?.exportPrefs;
        if (prefs) {
          if (prefs.size) setExportSize(prefs.size as PrintPageSizeKey);
          if (typeof prefs.customW === "number") setCustomW(prefs.customW);
          if (typeof prefs.customH === "number") setCustomH(prefs.customH);
          if (typeof prefs.bleedIn === "number") setBleedIn(prefs.bleedIn);
          if (typeof prefs.cropMarks === "boolean") setCropMarks(prefs.cropMarks);
          if (prefs.mode) setExportMode(prefs.mode);
          if (prefs.quality) setExportQuality(prefs.quality as PrintExportQuality);
          if (prefs.format) setExportFormat(prefs.format as PrintExportFormat);
          if (prefs.iccProfile) setIccProfile(prefs.iccProfile as IccProfileKey);
        } else {
          // No stored prefs → default export mode to whatever the editor is in
          // so the first export is WYSIWYG rather than a surprise.
          const editorMode = (r.context as PrintAssetContext | null)?.editorMode;
          if (editorMode) setExportMode(editorMode);
        }
        exportHydratedRef.current = true;
      })
      .catch(() => setLoading(false));
  }, [assetId, load]);

  // Debounced autosave. Persists title, content (modules included), and
  // context whenever the editor becomes dirty so an accidental refresh or
  // tab close doesn't lose reorders/inserts.
  const rowRef = useRef<PrintAssetRow | null>(null);
  rowRef.current = row;
  const savingRef = useRef(false);
  useEffect(() => {
    if (!dirty || !row) return;
    const t = window.setTimeout(async () => {
      const current = rowRef.current;
      if (!current || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      try {
        const updated = await save({
          data: {
            assetId: current.id,
            title: current.title,
            content: current.content as unknown as Record<string, unknown>,
            context: current.context as unknown as Record<string, unknown>,
          },
        });
        // Preserve any keystrokes that landed while the request was in
        // flight — only clear dirty when nothing changed under us.
        if (rowRef.current === current) {
          setRow(updated);
          setDirty(false);
        }
      } catch {
        // Leave dirty=true so the next tick retries.
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [dirty, row, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Mirror export panel state into ctx.exportPrefs so the user's preset
  // survives reload — no more re-tuning bleed/quality/ICC on every export.
  // Skipped until initial hydration completes to avoid overwriting stored
  // prefs with the useState defaults on first render.
  useEffect(() => {
    if (!exportHydratedRef.current) return;
    const r = rowRef.current;
    if (!r) return;
    const next: PrintExportPrefs = {
      size: exportSize,
      customW,
      customH,
      bleedIn,
      cropMarks,
      mode: exportMode,
      quality: exportQuality,
      format: exportFormat,
      iccProfile,
    };
    const ctxNow = (r.context as PrintAssetContext | null) ?? {};
    const prev = ctxNow.exportPrefs;
    if (
      prev &&
      prev.size === next.size &&
      prev.customW === next.customW &&
      prev.customH === next.customH &&
      prev.bleedIn === next.bleedIn &&
      prev.cropMarks === next.cropMarks &&
      prev.mode === next.mode &&
      prev.quality === next.quality &&
      prev.format === next.format &&
      prev.iccProfile === next.iccProfile
    ) {
      return;
    }
    setRow({ ...r, context: { ...ctxNow, exportPrefs: next } as PrintAssetContext });
    setDirty(true);
    // Intentionally do NOT push history for export-panel churn.
  }, [exportSize, customW, customH, bleedIn, cropMarks, exportMode, exportQuality, exportFormat, iccProfile]);



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

  const kindForAudit = (row?.kind ?? "case-study") as "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!row) return;
    import("@/lib/print-content-schema").then(({ schemaFor: sf, unreachablePaths, fullyPopulatedSample }) => {
      const dead = unreachablePaths(sf(kindForAudit), fullyPopulatedSample(kindForAudit));
      if (dead.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`[print-content-schema] Unreachable fields for kind="${kindForAudit}":`, dead);
      }
    });
  }, [kindForAudit, row]);

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

  // Dev-time schema audit moved above early returns to preserve hook order.


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
  const editorMode: PrintMode = ctx.editorMode ?? "light";
  const showBleedGuides: boolean = !!ctx.showBleedGuides;
  const bleedFraction = Math.max(0, Math.min(0.06, bleedIn / (pageSize === "A4" ? 8.27 : pageSize === "Letter" ? 8.5 : 8.5)));
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

            {/* Editor mode toggle. Persisted to ctx so it survives reload,
                and defaults the export panel so downloads are WYSIWYG. */}
            <div className="mr-1 inline-flex items-center gap-0 rounded-full border border-black/10 bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.03]" role="group" aria-label="Editor mode">
              <button
                type="button"
                data-testid="editor-mode-light"
                aria-pressed={editorMode === "light"}
                onClick={() => {
                  patchCtx({ editorMode: "light" });
                  if (exportHydratedRef.current) setExportMode("light");
                }}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  editorMode === "light"
                    ? "bg-[#03002C] text-white dark:bg-white dark:text-[#03002C]"
                    : "text-[#03002C] hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                }`}
              >
                <Sun size={12} /> Light
              </button>
              <button
                type="button"
                data-testid="editor-mode-dark"
                aria-pressed={editorMode === "dark"}
                onClick={() => {
                  patchCtx({ editorMode: "dark" });
                  if (exportHydratedRef.current) setExportMode("dark");
                }}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  editorMode === "dark"
                    ? "bg-[#03002C] text-white dark:bg-white dark:text-[#03002C]"
                    : "text-[#03002C] hover:bg-black/5 dark:text-white dark:hover:bg-white/5"
                }`}
              >
                <Moon size={12} /> Dark
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
            <LiveEditOverlay
              enabled={true}
              slideId={`asset-${row.id}-${kind}`}
              content={rawContent}
              editableFields={editableFieldPaths}
              onChange={(path, value) => patchByPath(path, value)}
            >
              {brand && kind === "case-study" && (
                <CaseStudyLayout
                  content={rawContent as unknown as CaseStudyContent}
                  brand={brand}
                  mode={editorMode}
                  pageSize={pageSize}
                  density={density}
                  seed={`asset-${row.id}`}
                />
              )}
              {brand && kind === "spotlight" && (
                <SpotlightLayout
                  content={rawContent as unknown as SpotlightContent}
                  brand={brand}
                  mode={editorMode}
                  pageSize={pageSize}
                  density={density}
                  seed={`asset-${row.id}`}
                />
              )}
              {brand && kind === "ebrochure" && (
                <EBrochureLayout
                  content={rawContent as unknown as EBrochureContent}
                  brand={brand}
                  mode={editorMode}
                  pageSize={pageSize}
                  density={density}
                  seed={`asset-${row.id}`}
                />
              )}
              {brand && kind === "adaptor-brief" && (
                <AdaptorBriefLayout
                  content={rawContent as unknown as AdaptorBriefContent}
                  brand={brand}
                  mode={editorMode}
                  pageSize={pageSize}
                  density={density}
                  seed={`asset-${row.id}`}
                />
              )}
              {ctx.printSafeArea && (
                <div className="pointer-events-none absolute inset-6 rounded-2xl border border-dashed border-black/25 dark:border-white/25" />
              )}
              <HeroResizeHandle
                canvasRef={canvasRef}
                media={(rawContent as { heroMedia?: PrintHeroMedia }).heroMedia}
                onChange={(next) => patchContent({ heroMedia: next } as never)}
              />

              {showBleedGuides && (
                <>
                  {/* Bleed edge (outer) — where the printed art bleeds off. */}
                  <div
                    className="pointer-events-none absolute rounded-none border border-dashed border-[#E53D2E]/70"
                    style={{
                      top: `${-bleedFraction * 100}%`,
                      left: `${-bleedFraction * 100}%`,
                      right: `${-bleedFraction * 100}%`,
                      bottom: `${-bleedFraction * 100}%`,
                    }}
                    data-testid="bleed-guide-outer"
                  />
                  {/* Trim edge — the finished cut line. */}
                  <div
                    className="pointer-events-none absolute inset-0 border border-dashed border-[#003FC7]/70"
                    data-testid="bleed-guide-trim"
                  />
                </>
              )}
            </LiveEditOverlay>
            <SectionSelectOverlay
              canvasRef={canvasRef}
              scanKey={rawContent}
              onDelete={(key) => {
                if (key === "features") patchContent({ features: [] } as never);
                else if (key === "knowHow") patchContent({ knowHow: [] } as never);
                else if (key === "quote") patchContent({ quote: undefined } as never);
                else if (key === "cta") patchContent({ cta: undefined } as never);
                else if (key === "hero") patchContent({ heroMedia: undefined } as never);
                toast.success(`${key} section removed`);
              }}
              onReplace={(key) => {
                toast.info(`Edit "${key}" in the inspector panel →`);
              }}
            />

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
              <Row label="Bleed + trim guides">
                <input
                  type="checkbox"
                  data-testid="toggle-bleed-guides"
                  checked={showBleedGuides}
                  onChange={(e) => patchCtx({ showBleedGuides: e.target.checked })}
                />
              </Row>
            </Panel>

            <HeroMediaPanel
              value={content.heroMedia}
              onChange={(next) => patchContent({ heroMedia: next })}
              divisionId={row?.brand_mode_id ?? null}
              brand={brand}
              kind={kind}
              assetId={row?.id ?? null}
            />


            





            <Panel title="Stats">
              {(content.stats ?? []).map((s, i) => (
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
                mode={editorMode}
              />

              {/* Schema-driven Content inspector — the guaranteed safety net.
                  Every content field in the active kind is reachable here,
                  including fields already bound to the canvas overlay. */}
              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                <ContentInspector
                  schema={schemaFor(kind)}
                  content={rawContent}
                  canvasEditablePaths={new Set(editableFieldPaths)}
                  onWritePath={(path: string, value: unknown) => patchByPath(path, value)}
                />
              </div>
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
          // Keep drawer open so the user can insert multiple modules.
        }}
        brand={brand}
        mode={editorMode}
      />
    </AppShell>
  );
}

function ModulesPanel({
  kind, modules, onAdd, onChange, mode,
}: {
  kind: "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  modules: PrintSection[];
  onAdd: () => void;
  onChange: (next: PrintSection[]) => void;
  mode: PrintMode;
}) {
  const editorMode = mode;
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

  // Insertion index (0..modules.length) where a dragged item would land, plus
  // the source of the drag so we can style the indicator differently for
  // reorder vs. new-module inserts.
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [dropKind, setDropKind] = useState<"insert" | "reorder" | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Parse a dragged section payload from the drawer. Returns null for
  // reorder drags (which carry a numeric text/plain index instead).
  function readInsertPayload(e: React.DragEvent): PrintSection | null {
    const raw = e.dataTransfer.getData(PRINT_SECTION_DND_MIME);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PrintSection;
      if (!parsed || typeof parsed !== "object" || !("kind" in parsed)) return null;
      // Re-issue an id so pasting the same drawer card twice yields unique keys.
      return { ...parsed, id: `sec-${Math.random().toString(36).slice(2, 10)}` } as PrintSection;
    } catch {
      return null;
    }
  }
  function insertAt(index: number, section: PrintSection) {
    const clamped = Math.max(0, Math.min(index, modules.length));
    const next = [...modules];
    next.splice(clamped, 0, section);
    onChange(next);
  }

  // Renders a bright horizontal bar that tells the user exactly where the
  // dragged module will land. Shown between items and at the ends.
  function DropIndicator({ active }: { active: boolean }) {
    return (
      <div
        aria-hidden
        className={
          "pointer-events-none relative my-0.5 h-0 transition-all duration-100 " +
          (active ? "h-[10px] opacity-100" : "opacity-0")
        }
      >
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2">
          <div className="relative h-[3px] rounded-full bg-[#003FC7] shadow-[0_0_0_3px_rgba(0,63,199,0.18)]">
            <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#003FC7]" />
            <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#003FC7]" />
          </div>
        </div>
      </div>
    );
  }

  function computeInsertIndex(e: React.DragEvent, i: number): number {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    return e.clientY < midY ? i : i + 1;
  }

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
      <div
        className="space-y-1"
        onDragLeave={(e) => {
          // Clear the indicator only when leaving the whole list wrapper,
          // not when moving between child items.
          const related = e.relatedTarget as Node | null;
          if (!related || !(e.currentTarget as HTMLDivElement).contains(related)) {
            setDropIdx(null);
            setDropKind(null);
          }
        }}
      >
        {modules.map((m, i) => (
          <ModuleCard
            key={m.id}
            index={i}
            section={m}
            editorMode={editorMode}
            draggingIdx={draggingIdx}
            dropIdx={dropIdx}
            DropIndicator={DropIndicator}
            onDragStart={(e) => {
              const src = e.target as HTMLElement | null;
              if (!src?.closest("[data-drag-handle]")) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
              setDraggingIdx(i);
            }}
            onDragEnd={() => {
              setDropIdx(null);
              setDropKind(null);
              setDraggingIdx(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              const isInsert = e.dataTransfer.types.includes(PRINT_SECTION_DND_MIME);
              e.dataTransfer.dropEffect = isInsert ? "copy" : "move";
              setDropKind(isInsert ? "insert" : "reorder");
              setDropIdx(computeInsertIndex(e, i));
            }}
            onDrop={(e) => {
              e.preventDefault();
              const targetIdx = computeInsertIndex(e, i);
              setDropIdx(null);
              setDropKind(null);
              setDraggingIdx(null);
              const inserted = readInsertPayload(e);
              if (inserted) {
                if (!gate.ok) return;
                insertAt(targetIdx, inserted);
                return;
              }
              const from = Number(e.dataTransfer.getData("text/plain"));
              if (Number.isNaN(from)) return;
              const to = from < targetIdx ? targetIdx - 1 : targetIdx;
              if (to === from) return;
              const next = [...modules];
              const [moved] = next.splice(from, 1);
              if (!moved) return;
              next.splice(to, 0, moved);
              onChange(next);
            }}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onRemove={() => remove(i)}
            onPatch={(p) => patch(i, p)}
          />
        ))}
        {/* Tail indicator — shown when a drag lands after the last item. */}
        <DropIndicator active={dropIdx === modules.length && modules.length > 0} />
      </div>

      {/* Trailing drop zone — accepts new-module inserts from the drawer. */}
      <div
        data-testid="modules-drop-zone"
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(PRINT_SECTION_DND_MIME)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropKind("insert");
          setDropIdx(modules.length);
          (e.currentTarget as HTMLDivElement).classList.add("border-[#003FC7]", "bg-[#003FC7]/5", "text-[#003FC7]");
        }}
        onDragLeave={(e) => {
          (e.currentTarget as HTMLDivElement).classList.remove("border-[#003FC7]", "bg-[#003FC7]/5", "text-[#003FC7]");
        }}
        onDrop={(e) => {
          const inserted = readInsertPayload(e);
          (e.currentTarget as HTMLDivElement).classList.remove("border-[#003FC7]", "bg-[#003FC7]/5", "text-[#003FC7]");
          setDropIdx(null);
          setDropKind(null);
          if (!inserted) return;
          e.preventDefault();
          if (!gate.ok) return;
          insertAt(modules.length, inserted);
        }}
        className="mt-3 flex items-center justify-center rounded-md border border-dashed border-black/15 px-2 py-3 text-[11px] uppercase tracking-widest text-black/40 transition dark:border-white/15 dark:text-white/40"
      >
        {dropKind === "insert" ? "Release to drop at end" : "Drop module here"}
      </div>
    </>
  );
}

function ModuleCard({
  index,
  section,
  editorMode,
  draggingIdx,
  dropIdx,
  DropIndicator,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  onRemove,
  onPatch,
}: {
  index: number;
  section: PrintSection;
  editorMode: PrintMode;
  draggingIdx: number | null;
  dropIdx: number | null;
  DropIndicator: (props: { active: boolean }) => React.ReactElement;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onPatch: (p: Partial<PrintSection>) => void;
}) {
  const [open, setOpen] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const i = index;
  const m = section;
  const summary = getSectionSummary(m);
  return (
    <div>
      <DropIndicator active={dropIdx === i} />
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={
          "rounded-lg border bg-white/60 p-2 transition dark:bg-white/[0.02] " +
          (draggingIdx === i
            ? "border-[#003FC7]/60 bg-[#003FC7]/[0.04] opacity-50 shadow-sm"
            : "border-black/10 dark:border-white/10")
        }
      >
        <div
          data-drag-handle
          className="flex cursor-grab items-center justify-between gap-2 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            aria-expanded={open}
          >
            <GripVertical size={14} className="shrink-0 text-black/30 dark:text-white/30" aria-hidden />
            {open ? <ChevronDown size={14} className="shrink-0 text-black/50 dark:text-white/50" /> : <ChevronRight size={14} className="shrink-0 text-black/50 dark:text-white/50" />}
            <span className="truncate text-[11px] font-semibold uppercase tracking-widest text-black/70 dark:text-white/70">
              {sectionKindLabel(m.kind)}
            </span>
            {!open && summary && (
              <span className="truncate text-[11px] text-black/45 dark:text-white/45">· {summary}</span>
            )}
          </button>
          <div className="flex items-center gap-0.5">
            <button className="rounded p-1 text-black/50 hover:bg-black/5 dark:text-white/50" onClick={onMoveUp} aria-label="Move up"><ArrowUp size={13} /></button>
            <button className="rounded p-1 text-black/50 hover:bg-black/5 dark:text-white/50" onClick={onMoveDown} aria-label="Move down"><ArrowDown size={13} /></button>
            <button className="rounded p-1 text-red-500 hover:bg-red-500/10" onClick={onRemove} aria-label="Delete"><Trash2 size={13} /></button>
          </div>
        </div>

        {open && (
          <div className="mt-2 space-y-2">
            <SectionInlineEditor section={m} onPatch={onPatch} />
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-black/15 py-1 text-[10px] font-semibold uppercase tracking-widest text-black/50 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:text-white/50"
              title="Preview appears on the canvas — toggle a compact preview here"
            >
              {showPreview ? <><EyeOff size={11} /> Hide preview</> : <><Eye size={11} /> Show preview</>}
            </button>
            {showPreview && (
              <div className="overflow-hidden rounded border border-black/10 dark:border-white/10">
                <div
                  className="origin-top-left"
                  style={{ transform: "scale(0.42)", width: "238%", pointerEvents: "none" }}
                >
                  <PrintSectionRenderer section={m} mode={editorMode} accent="#003FC7" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getSectionSummary(s: PrintSection): string {
  const anyS = s as unknown as { title?: string; eyebrow?: string; text?: string; items?: Array<unknown> };
  if (anyS.title) return anyS.title;
  if (anyS.text) return String(anyS.text).slice(0, 40);
  if (anyS.eyebrow) return anyS.eyebrow;
  if (anyS.items?.length) return `${anyS.items.length} item${anyS.items.length === 1 ? "" : "s"}`;
  return "";
}


const inspectorInput =
  "w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs text-[#03002C] focus:border-[#003FC7] focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-white";

function LabeledField({ label, children, hint }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-black/40 dark:text-white/40">{hint}</span>}
    </label>
  );
}

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
  brand,
  kind,
  assetId,
}: {
  value: PrintHeroMedia | undefined;
  onChange: (next: PrintHeroMedia | undefined) => void;
  divisionId: string | null;
  brand: BrandMode | undefined;
  kind: "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  assetId: string | null;
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const applyAll = useServerFn(applyHeroToAllPrintAssets);
  const previewApply = useServerFn(previewApplyHeroToAllPrintAssets);
  const [applyingAll, setApplyingAll] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<
    | { toUpdate: Array<{ id: string; title: string }>; toSkip: Array<{ id: string; title: string; reason: "customized" }>; scanned: number }
    | null
  >(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applySummary, setApplySummary] = useState<
    | { status: "success"; updated: number; scanned: number; skipped: number }
    | { status: "error"; message: string; errors: string[]; skipped?: number }
    | null
  >(null);

  async function handleApplyToAll() {
    if (!enabled || !divisionId) return;
    setApplySummary(null);
    setPreview(null);
    setPreviewError(null);
    setConfirmOpen(true);
    setPreviewLoading(true);
    try {
      const res = await previewApply({
        data: {
          kind,
          brandModeId: divisionId,
          excludeAssetId: assetId ?? undefined,
          onlyUncustomized: true,
        },
      });
      setPreview(res);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Could not load preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirmApply() {
    if (!enabled || !divisionId) return;
    setApplySummary(null);
    setApplyingAll(true);
    try {
      const res = await applyAll({
        data: {
          kind,
          brandModeId: divisionId,
          heroMedia: media as unknown as Record<string, unknown>,
          excludeAssetId: assetId ?? undefined,
          // Skip templates the user has already customized
          // (focal / scrim / wash overrides).
          onlyUncustomized: true,
        },
      });
      const skipped = res.skipped ?? 0;
      if (res.errors.length === 0) {
        setApplySummary({ status: "success", updated: res.updated, scanned: res.scanned, skipped });
      } else if (res.updated > 0) {
        setApplySummary({ status: "error", message: `Applied to ${res.updated} of ${res.scanned} assets; ${res.errors.length} failed${skipped ? `, ${skipped} skipped (customized)` : ""}.`, errors: res.errors, skipped });
      } else {
        setApplySummary({ status: "error", message: `Could not apply to any asset: ${res.errors[0] ?? "unknown error"}`, errors: res.errors, skipped });
      }
      const skipMsg = skipped ? `, ${skipped} skipped` : "";
      toast.success(`Applied to ${res.updated} of ${res.scanned} ${kind.replace("-", " ")} asset${res.scanned === 1 ? "" : "s"}${skipMsg}.`);
      setConfirmOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk apply failed.";
      setApplySummary({ status: "error", message, errors: [message] });
      toast.error(message);
    } finally {
      setApplyingAll(false);
    }
  }



  async function handleFileUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image is larger than 20 MB. Try compressing it first.");
      return;
    }
    const tid = toast.loading(`Uploading ${file.name}…`);
    setUploading(true);
    try {
      const { signedUrl } = await uploadSlideMedia(file, file.name);
      const base: PrintHeroMedia = enabled
        ? media
        : { imageUrl: "", overlayOpacity: 0.55, washStrength: 1, scrim: "bottom", blendMode: "multiply", heightPct: 46 };
      onChange({ ...base, imageUrl: signedUrl });
      toast.success("Hero image uploaded.", { id: tid });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      toast.error(msg, { id: tid });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
      {/* Live hero preview — updates as heroMedia changes (image, focal,
          scrim, wash, aspect). Gives the picker an immediate WYSIWYG loop. */}
      <HeroPreviewPanel media={value} brand={brand} />
      {/* One-click bulk-apply — writes the current hero to every sibling
          print asset of the same kind under this division. */}
      <div className="space-y-2 rounded-md border border-black/10 bg-black/[0.02] px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/60 dark:text-white/60">
            Apply to every <span className="font-semibold">{kind.replace("-", " ")}</span> in this division still using default hero settings
          </span>

          <button
            type="button"
            onClick={handleApplyToAll}
            disabled={!enabled || !divisionId || applyingAll}
            className="rounded border border-black/15 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.05] dark:text-white/80"
            title={!enabled ? "Select a hero image first" : !divisionId ? "Select a division first" : "Apply to all sibling templates"}
          >
            {applyingAll ? "Applying…" : "Apply to all"}
          </button>
        </div>

        {applyingAll && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[#003FC7]" />
            </div>
            <div className="text-[10px] text-black/50 dark:text-white/50">Applying hero to relevant templates…</div>
          </div>
        )}

        {applySummary && applySummary.status === "success" && (
          <div className="flex items-start gap-2 rounded-md bg-[#A6FA87]/20 px-2 py-1.5 text-[11px] text-[#0F5C1A] dark:bg-[#A6FA87]/15 dark:text-[#A6FA87]">
            <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full bg-[#A6FA87]" />
            <span>
              Applied to <strong>{applySummary.updated}</strong> of{" "}
              <strong>{applySummary.scanned}</strong> {kind.replace("-", " ")} asset
              {applySummary.scanned === 1 ? "" : "s"}
              {applySummary.skipped > 0 ? (
                <> · <strong>{applySummary.skipped}</strong> left untouched (customized focal / scrim / wash)</>
              ) : null}
              .
            </span>
          </div>
        )}


        {applySummary && applySummary.status === "error" && (
          <div className="space-y-1 rounded-md bg-[#E53D2E]/10 px-2 py-1.5 text-[11px] text-[#E53D2E] dark:bg-[#E53D2E]/15 dark:text-[#FF9B70]">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full bg-[#E53D2E]" />
              <span className="font-medium">{applySummary.message}</span>
            </div>
            {applySummary.errors.length > 1 && (
              <ul className="ml-5 list-disc text-[10px] opacity-90">
                {applySummary.errors.slice(0, 3).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {applySummary.errors.length > 3 && (
                  <li>…and {applySummary.errors.length - 3} more</li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Apply hero to all templates?"
        description={`Applies the current hero to every "${kind.replace("-", " ")}" print asset in this division that still uses the default focal, scrim, and wash settings. Templates with custom tuning are left untouched.`}

        confirmLabel="Apply to all"
        cancelLabel="Cancel"
        busy={applyingAll}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmApply}
      />

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
      {/* Starter examples — always available bundled photography from the
          division backdrop pool, so hero pickers have ready-to-use imagery
          even before anyone uploads to the shared library. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
          <span>Starter examples{divisionId ? "" : " · enterprise pool"}</span>
          <span className="text-[9px] normal-case tracking-normal text-black/40 dark:text-white/40">Bundled · ready to use</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {getDivisionImagery(divisionId ?? "bm-enterprise").photos.slice(0, 8).map((url, idx) => {
            const active = enabled && media.imageUrl === url;
            return (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => {
                  const base: PrintHeroMedia = enabled
                    ? media
                    : { imageUrl: "", overlayOpacity: 0.55, washStrength: 1, scrim: "bottom", blendMode: "multiply", heightPct: 46 };
                  onChange({ ...base, imageUrl: url });
                }}
                className={`relative aspect-video overflow-hidden rounded border transition ${
                  active
                    ? "border-[#003FC7] ring-2 ring-[#003FC7]/40"
                    : "border-black/10 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
                }`}
                title={`Starter hero ${idx + 1}`}
                style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            );
          })}
        </div>
      </div>
      {/* Upload / drop zone — persists into the private slide-media bucket. */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFileUpload(f);
        }}
        className="rounded-lg border border-dashed border-black/15 bg-black/[0.02] p-2 text-center dark:border-white/15 dark:bg-white/[0.02]"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFileUpload(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/70"
        >
          <Upload size={12} /> {uploading ? "Uploading…" : "Upload image"}
        </button>
        <div className="mt-1 text-[10px] text-black/40 dark:text-white/40">or drop a PNG/JPG here · saved to your library</div>
      </div>

      <div className="flex gap-2">
        <input
          className={`${inspectorInput} flex-1`}
          placeholder="Or paste image URL (https://…)"
          value={media.imageUrl}
          onChange={(e) => patch({ imageUrl: e.target.value })}
        />
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={!divisionId}
          className="inline-flex items-center gap-1 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-[10px] uppercase tracking-[0.22em] text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.05] dark:text-white/80"
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

// ---------------------------------------------------------------------------
// Shared-module inline editors. One per PrintSection kind. Kept next to
// ModulesPanel so the drawer + inline editing stay in sync as new variants
// are added.
// ---------------------------------------------------------------------------

function sectionKindLabel(kind: PrintSection["kind"]): string {
  switch (kind) {
    case "stats": return "Stats";
    case "quote": return "Quote";
    case "logo-grid": return "Logo grid";
    case "expertise": return "Expertise";
    case "feature-list": return "Features";
    default: return "Module";
  }
}

function SectionInlineEditor({
  section, onPatch,
}: {
  section: PrintSection;
  onPatch: (p: Partial<PrintSection>) => void;
}) {
  switch (section.kind) {
    case "stats":
      return <StatsInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />;
    case "quote":
      return <QuoteInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />;
    case "logo-grid":
      return <LogoGridInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />;
    case "expertise":
      return <ExpertiseInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />;
    case "feature-list":
      return <FeatureListInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />;
    default:
      return null;
  }
}

function StatsInlineEditor({
  section, onPatch,
}: {
  section: PrintStatsSection;
  onPatch: (p: Partial<PrintStatsSection>) => void;
}) {
  const patchItem = (idx: number, p: Partial<PrintStatsSection["items"][number]>) => {
    const items = section.items.map((it, k) => (k === idx ? { ...it, ...p } : it));
    onPatch({ items });
  };
  return (
    <>
      <LabeledField label="Layout style">
        <select className={inspectorInput} value={section.variantId} onChange={(e) => onPatch({ variantId: e.target.value as PrintStatsVariant })}>
          {PRINT_STATS_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </LabeledField>
      <div className="grid grid-cols-2 gap-2">
        <LabeledField label="Eyebrow">
          <input className={inspectorInput} placeholder="e.g. Impact at a glance" value={section.eyebrow ?? ""} onChange={(e) => onPatch({ eyebrow: e.target.value })} />
        </LabeledField>
        <LabeledField label="Title">
          <input className={inspectorInput} placeholder="e.g. By the numbers" value={section.title ?? ""} onChange={(e) => onPatch({ title: e.target.value })} />
        </LabeledField>
      </div>
      <div className="pt-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">Stat items</span>
          <span className="text-[10px] text-black/40 dark:text-white/40">{section.items.length} · label / value / unit</span>
        </div>
        <ArrayEditor
          items={section.items}
          onChange={(items) => onPatch({ items })}
          add={() => ({ label: "", value: "", unit: "" }) as PrintStatsSection["items"][number]}
          row={(it, idx) => (
            <div className="space-y-1">
              <input className={inspectorInput} placeholder="Label (what it measures)" value={it.label} onChange={(e) => patchItem(idx, { label: e.target.value })} />
              <div className="grid grid-cols-[1fr_1fr] gap-1">
                <input className={inspectorInput} placeholder="Value (e.g. 48)" value={it.value} onChange={(e) => patchItem(idx, { value: e.target.value })} />
                <input className={inspectorInput} placeholder="Unit (e.g. hr, %, M)" value={it.unit ?? ""} onChange={(e) => patchItem(idx, { unit: e.target.value })} />
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}

function QuoteInlineEditor({
  section, onPatch,
}: {
  section: PrintQuoteSection;
  onPatch: (p: Partial<PrintQuoteSection>) => void;
}) {
  return (
    <>
      <select className={inspectorInput} value={section.variantId} onChange={(e) => onPatch({ variantId: e.target.value as PrintQuoteVariant })}>
        {PRINT_QUOTE_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <input className={inspectorInput} placeholder="Eyebrow" value={section.eyebrow ?? ""} onChange={(e) => onPatch({ eyebrow: e.target.value })} />
      <textarea className={inspectorInput} placeholder="Quote text" rows={3} value={section.text} onChange={(e) => onPatch({ text: e.target.value })} />
      <div className="grid grid-cols-2 gap-1">
        <input className={inspectorInput} placeholder="Author" value={section.author ?? ""} onChange={(e) => onPatch({ author: e.target.value })} />
        <input className={inspectorInput} placeholder="Role" value={section.role ?? ""} onChange={(e) => onPatch({ role: e.target.value })} />
      </div>
      <input className={inspectorInput} placeholder="Company" value={section.company ?? ""} onChange={(e) => onPatch({ company: e.target.value })} />
    </>
  );
}

function LogoGridInlineEditor({
  section, onPatch,
}: {
  section: PrintLogoGridSection;
  onPatch: (p: Partial<PrintLogoGridSection>) => void;
}) {
  return (
    <>
      <select className={inspectorInput} value={section.variantId} onChange={(e) => onPatch({ variantId: e.target.value as PrintLogoGridVariant })}>
        {PRINT_LOGO_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <input className={inspectorInput} placeholder="Eyebrow" value={section.eyebrow ?? ""} onChange={(e) => onPatch({ eyebrow: e.target.value })} />
      <input className={inspectorInput} placeholder="Title" value={section.title ?? ""} onChange={(e) => onPatch({ title: e.target.value })} />
      <ArrayEditor
        items={section.items}
        onChange={(items) => onPatch({ items })}
        add={() => ({ name: "Client", url: "", path: "" })}
        row={(it, idx) => (
          <div className="grid grid-cols-[1fr_1fr] gap-1">
            <input className={inspectorInput} placeholder="Name" value={it.name} onChange={(e) => onPatch({ items: section.items.map((x, k) => k === idx ? { ...x, name: e.target.value } : x) })} />
            <input className={inspectorInput} placeholder="Logo URL or /path" value={it.url ?? it.path ?? ""} onChange={(e) => {
              const v = e.target.value;
              const isPath = v.startsWith("/");
              onPatch({ items: section.items.map((x, k) => k === idx ? { ...x, url: isPath ? undefined : v, path: isPath ? v : undefined } : x) });
            }} />
          </div>
        )}
      />
    </>
  );
}

function ExpertiseInlineEditor({
  section, onPatch,
}: {
  section: PrintExpertiseSection;
  onPatch: (p: Partial<PrintExpertiseSection>) => void;
}) {
  return (
    <>
      <select className={inspectorInput} value={section.variantId} onChange={(e) => onPatch({ variantId: e.target.value as PrintExpertiseVariant })}>
        {PRINT_EXPERTISE_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <input className={inspectorInput} placeholder="Eyebrow" value={section.eyebrow ?? ""} onChange={(e) => onPatch({ eyebrow: e.target.value })} />
      <input className={inspectorInput} placeholder="Title" value={section.title ?? ""} onChange={(e) => onPatch({ title: e.target.value })} />
      <ArrayEditor
        items={section.items}
        onChange={(items) => onPatch({ items })}
        add={() => ({ label: "", icon: "" })}
        row={(it, idx) => (
          <div className="grid grid-cols-[1fr_90px] gap-1">
            <input className={inspectorInput} placeholder="Label" value={it.label} onChange={(e) => onPatch({ items: section.items.map((x, k) => k === idx ? { ...x, label: e.target.value } : x) })} />
            <input className={inspectorInput} placeholder="Icon" value={it.icon ?? ""} onChange={(e) => onPatch({ items: section.items.map((x, k) => k === idx ? { ...x, icon: e.target.value } : x) })} />
          </div>
        )}
      />
    </>
  );
}

function FeatureListInlineEditor({
  section, onPatch,
}: {
  section: PrintFeatureListSection;
  onPatch: (p: Partial<PrintFeatureListSection>) => void;
}) {
  return (
    <>
      <select className={inspectorInput} value={section.variantId} onChange={(e) => onPatch({ variantId: e.target.value as PrintFeatureVariant })}>
        {PRINT_FEATURE_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
      </select>
      <input className={inspectorInput} placeholder="Eyebrow" value={section.eyebrow ?? ""} onChange={(e) => onPatch({ eyebrow: e.target.value })} />
      <input className={inspectorInput} placeholder="Title" value={section.title ?? ""} onChange={(e) => onPatch({ title: e.target.value })} />
      <ArrayEditor
        items={section.items}
        onChange={(items) => onPatch({ items })}
        add={() => ({ verb: "", body: "", icon: "" })}
        row={(it, idx) => (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_90px] gap-1">
              <input className={inspectorInput} placeholder="Verb" value={it.verb} onChange={(e) => onPatch({ items: section.items.map((x, k) => k === idx ? { ...x, verb: e.target.value } : x) })} />
              <input className={inspectorInput} placeholder="Icon" value={it.icon ?? ""} onChange={(e) => onPatch({ items: section.items.map((x, k) => k === idx ? { ...x, icon: e.target.value } : x) })} />
            </div>
            <input className={inspectorInput} placeholder="Body" value={it.body ?? ""} onChange={(e) => onPatch({ items: section.items.map((x, k) => k === idx ? { ...x, body: e.target.value } : x) })} />
          </div>
        )}
      />
    </>
  );
}

function ArrayEditor<T>({
  items, onChange, add, row,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  add: () => T;
  row: (it: T, idx: number) => React.ReactNode;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, k) => k !== i));
  return (
    <div className="space-y-1">
      {items.map((it, idx) => (
        <div key={idx} className="rounded border border-black/5 bg-black/[0.02] p-1.5 dark:border-white/10 dark:bg-white/5">
          {row(it, idx)}
          <div className="mt-1 flex items-center justify-end gap-1">
            <button type="button" className="rounded p-0.5 text-black/40 hover:bg-black/5" onClick={() => move(idx, -1)} aria-label="Move up"><ArrowUp size={12} /></button>
            <button type="button" className="rounded p-0.5 text-black/40 hover:bg-black/5" onClick={() => move(idx, 1)} aria-label="Move down"><ArrowDown size={12} /></button>
            <button type="button" className="rounded p-0.5 text-red-500 hover:bg-red-500/10" onClick={() => remove(idx)} aria-label="Remove"><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, add()])} className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-black/20 py-1 text-[10px] font-semibold uppercase tracking-widest text-black/60 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/20 dark:text-white/60">
        <Plus size={12} /> Add item
      </button>
    </div>
  );
}
