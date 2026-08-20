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
import { BriefOutputsBar } from "@/components/BriefOutputsBar";
import { useDeckStore } from "@/lib/deck-store";
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
  undoApplyHeroToAllPrintAssets,
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
  PrintHeroRule,
  PrintHeroTitleType,
  PrintMode,
  PrintPageSize,
} from "@/lib/print-assets.types";
import {
  emptyCaseStudy,
  emptySpotlight,
  emptyEBrochure,
  emptyAdaptorBrief,
  emptyMsaPartnership,
  emptySolutionProposal,
} from "@/lib/print-assets.types";
import type {
  PrintSection,
  PrintStatsSection,
  PrintStatsVariant,
  PrintHeroSection,
  PrintHeroMetaRow,
  PrintHeroModuleVariant,
  PrintQuoteSection,
  PrintQuoteVariant,
  PrintLogoGridSection,
  PrintLogoGridVariant,
  PrintExpertiseSection,
  PrintExpertiseVariant,
  PrintFeatureListSection,
  PrintFeatureVariant,
  PrintNarrativeSection,
  PrintNarrativeVariant,
  PrintTableSection,
  PrintTableVariant,
  PrintContactSection,
  PrintContactVariant,
} from "@/lib/print-assets.types";
import type {
  SpotlightContent,
  EBrochureContent,
  AdaptorBriefContent,
  MsaPartnershipContent,
  SolutionProposalContent,
} from "@/lib/print-assets.types";
import {
  PRINT_STATS_VARIANTS,
  PRINT_HERO_VARIANTS,
  PRINT_QUOTE_VARIANTS,
  PRINT_LOGO_VARIANTS,
  PRINT_EXPERTISE_VARIANTS,
  PRINT_FEATURE_VARIANTS,
  PRINT_NARRATIVE_VARIANTS,
  PRINT_TABLE_VARIANTS,
  PRINT_CONTACT_VARIANTS,
} from "@/components/print/sections/PrintSectionRenderer";
import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";
import {
  HeroRuleTypeControls,
  MastheadRuleTypeControls,
} from "@/components/print/sections/hero/HeroRuleTypeControls";
import {
  PrintSectionPicker,
  PRINT_SECTION_DND_MIME,
} from "@/components/print/sections/PrintSectionPicker";
import { PrintIconPicker } from "@/components/print/PrintIconPicker";
import { createPortal } from "react-dom";
import { PrintIconEditContext } from "@/components/print/PrintIconEdit";
import { PrintImageEditContext } from "@/components/print/PrintImageEdit";
import { PrintLogoListContext } from "@/components/print/PrintLogoList";
import { PrintDocModeProvider, resolvePrintIconStyle } from "@/components/print/print-doc-mode";
import { effectiveAssetIconTreatment, usePrintIconPrefs } from "@/lib/print-icon-prefs";
import { IconAccentContrastWarning } from "@/components/print/IconAccentContrastWarning";
import { iconPageBackground } from "@/lib/print-icon-contrast";
import { PrintIconSwapModal } from "@/components/print/PrintIconSwapModal";
import type { IconName } from "@/components/print/print-primitives";
import { DivisionImageryPicker } from "@/components/print/DivisionImageryPicker";
import { listDivisionImagery, type DivisionImageryEntry } from "@/lib/division-imagery.functions";
import { getDivisionImagery } from "@/assets/backdrops/divisions";

import { PageColorOverridePanel } from "@/components/print/PageColorOverridePanel";
import { ClientLogoPanel } from "@/components/print/ClientLogoPanel";
import { PrintClientLogoProvider } from "@/components/print/PrintChrome";
import { PrintPageProvider } from "@/components/print/print-page-context";
import {
  PRINT_MARGIN_PRESETS,
  PRINT_PAGE_SIZE_ORDER,
  pageAspectRatio,
  pageAuroraFrame,
  pagePreset,
  pageSideMarginIn,
  type PrintMarginPreset,
} from "@/lib/print-page-presets";
import { useResolvedClientLogo } from "@/hooks/use-client-logos";
import { ClientLogoHubPicker, ClientLogoHubTrigger } from "@/components/print/ClientLogoHubPicker";
import { HeroResizeHandle } from "@/components/print/HeroResizeHandle";
import { HeroPreviewPanel } from "@/components/print/HeroPreviewPanel";
import { withAutoHeroVariants } from "@/lib/hero-variants";
import { HeroCostDebugPanel } from "@/components/print/HeroCostDebugPanel";
import { HeroDiffTile } from "@/components/print/HeroDiffTile";
import type { BrandMode } from "@/lib/taxonomy";

import { LayoutHealthBanner } from "@/components/print/LayoutHealthBanner";
import { usePrintOverflow } from "@/hooks/use-print-overflow";
import {
  PrintContentFitFrame,
  type PrintFitOverride,
} from "@/components/print/PrintContentFitFrame";
import { PrintFitAuditPanel } from "@/components/print/PrintFitAuditPanel";
import type {
  PrintFitAuditInput,
  PrintFitFix,
  PrintFitMeasurement,
} from "@/lib/print-fit-audit";
import {
  NEUTRAL_FIT,
  PRINT_CONTENT_FIT_DEFAULTS,
  describeFit,
  isNeutralFit,
  resolveContentFit,
  type PrintFitKnobs,
} from "@/lib/print-content-fit";
import { PrintOverflowOverlay } from "@/components/print/PrintOverflowOverlay";
import { SwapVariantPreviewModal } from "@/components/print/SwapVariantPreviewModal";
import {
  analyzePrintAsset,
  canAddModule,
  weightForSection,
  effectiveModuleBudget,
} from "@/lib/print-capacity";
import { SpotlightLayout } from "@/components/print/SpotlightLayout";
import { EBrochureLayout } from "@/components/print/EBrochureLayout";
import { AdaptorBriefLayout } from "@/components/print/AdaptorBriefLayout";
import { MsaPartnershipLayout } from "@/components/print/MsaPartnershipLayout";
import { MultiProposalLayout, isMultiProposal } from "@/components/print/MultiProposalLayout";
import { SolutionProposalLayout } from "@/components/print/SolutionProposalLayout";
import { CaseStudyLayout } from "@/components/print/CaseStudyLayout";
import { ContentInspector } from "@/components/print/ContentInspector";
import { schemaFor } from "@/lib/print-content-schema";
import { CONTENT_SCHEMAS, unreachablePaths } from "@/lib/print-content-schema";

import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { SectionSelectOverlay } from "@/components/print/SectionSelectOverlay";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  Save,
  Trash2,
  Sparkles,
  FileDown,
  ChevronLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Images,
  GripVertical,
  Undo2,
  Redo2,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Upload,
  BookmarkPlus,
} from "lucide-react";
import { SavePageTemplateDialog } from "@/components/print/SavePageTemplateDialog";
import { captureTemplateContentShell, captureTemplateLayout } from "@/lib/print-page-templates";
import { toast } from "sonner";
import { validateDocument, errorSummary } from "@/lib/document-validation";
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

// Identity-stable defaults merge. The merged content object is the `dep` for
// the content-fit frame, the overflow hook and the section overlay, so it must
// keep the same identity while the stored row content is unchanged — otherwise
// those three restart on every render and the canvas visibly flickers.
const RAW_CONTENT_CACHE = new WeakMap<object, Map<string, Record<string, unknown>>>();
const RAW_CONTENT_EMPTY_ANCHOR: object = {};

function stableRawContent(
  kind: string,
  source: unknown,
  build: () => Record<string, unknown>,
): Record<string, unknown> {
  const anchor =
    typeof source === "object" && source !== null ? (source as object) : RAW_CONTENT_EMPTY_ANCHOR;
  let byKind = RAW_CONTENT_CACHE.get(anchor);
  if (!byKind) {
    byKind = new Map();
    RAW_CONTENT_CACHE.set(anchor, byKind);
  }
  const hit = byKind.get(kind);
  if (hit) return hit;
  const made = build();
  byKind.set(kind, made);
  return made;
}

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
  const [showErrors, setShowErrors] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [synthBusy, setSynthBusy] = useState(false);
  const [divisionStats, setDivisionStats] = useState<
    Array<{ label: string; value: string; unit: string | null }>
  >([]);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [spineOpen, setSpineOpen] = useState(false);
  const [divisionQuotes, setDivisionQuotes] = useState<
    Array<{ quote: string; author: string | null; role: string | null }>
  >([]);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { prefs: iconPrefs } = usePrintIconPrefs();
  // Measured (not predicted) page overflow — fires whenever content is really
  // clipped by the fixed-height page, e.g. after dragging the hero too tall.
  const overflow = usePrintOverflow(canvasRef, row?.content);
  // Content-fit knobs currently applied by PrintContentFitFrame (1/1 = none).
  const [fitKnobs, setFitKnobs] = useState<PrintFitKnobs>(NEUTRAL_FIT);
  // Latest measurement of the live page — feeds the audit + correction panel.
  const [fitMeasure, setFitMeasure] = useState<PrintFitMeasurement | null>(null);
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
  // Delete confirmation modal state.
  const [deleteOpen, setDeleteOpen] = useState(false);
  // "Save as page template" dialog — captures the section stack for reuse.
  const [pageTemplateOpen, setPageTemplateOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  // Canvas icon swap — slot key of the glyph the user clicked on the page.
  const [iconSlot, setIconSlot] = useState<{ slot: string; current: IconName | null } | null>(null);
  // Hero editor modal — opened from the canvas hero affordance.
  const [heroModalOpen, setHeroModalOpen] = useState(false);

  const [pendingSwap, setPendingSwap] = useState<{
    moduleIndex: number;
    from: PrintStatsVariant;
    to: PrintStatsVariant;
    frees: number;
  } | null>(null);
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
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redoRef.current();
      }
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
  }, [
    exportSize,
    customW,
    customH,
    bleedIn,
    cropMarks,
    exportMode,
    exportQuality,
    exportFormat,
    iccProfile,
  ]);

  useEffect(() => {
    if (!row?.brand_mode_id) return;
    fetchDivisionCtx({ data: { divisionId: row.brand_mode_id, knowledgeLimit: 12 } })
      .then((ctx) => {
        setDivisionStats(ctx.stats.map((s) => ({ label: s.label, value: s.value, unit: s.unit })));
        setDivisionQuotes(
          ctx.quotes.map((q) => ({ quote: q.quote, author: q.author, role: q.role })),
        );
      })
      .catch(() => {
        // Non-fatal — editor still works without division context.
      });
  }, [row?.brand_mode_id, fetchDivisionCtx]);

  const baseBrand = useMemo(
    () => brandModes.find((b) => b.id === row?.brand_mode_id) ?? brandModes[0],
    [brandModes, row?.brand_mode_id],
  );

  // Page-level accent/primary overrides. Applied by cloning the division brand
  // so every layout, chrome band and hero wash picks them up unchanged.
  const ctxAccent = (row?.context as PrintAssetContext | null)?.accentOverride;
  const ctxPrimary = (row?.context as PrintAssetContext | null)?.primaryOverride;
  const brand = useMemo(() => {
    if (!baseBrand) return baseBrand;
    if (!ctxAccent && !ctxPrimary) return baseBrand;
    return {
      ...baseBrand,
      tokens: {
        ...baseBrand.tokens,
        ...(ctxAccent ? { accent: ctxAccent } : {}),
        ...(ctxPrimary ? { primary: ctxPrimary } : {}),
      },
    };
  }, [baseBrand, ctxAccent, ctxPrimary]);

  // Client logo — resolved through the shared layer so the footer always gets
  // a fresh signed URL (and re-matches by client name if the id ever changes).
  const ctxForLogo = (row?.context as PrintAssetContext | null) ?? null;
  const resolvedClientLogo = useResolvedClientLogo(
    ctxForLogo?.clientLogoId || ctxForLogo?.clientLogoName || ctxForLogo?.clientLogoUrl
      ? {
          id: ctxForLogo?.clientLogoId ?? null,
          clientName: ctxForLogo?.clientLogoName ?? null,
          primaryUrl: ctxForLogo?.clientLogoUrl ?? null,
        }
      : null,
    (ctxForLogo?.editorMode ?? "light") === "dark" ? "dark" : "light",
  );
  const clientLogo = resolvedClientLogo.url
    ? { url: resolvedClientLogo.url, name: resolvedClientLogo.clientName }
    : null;

  const kindForAudit = (row?.kind ?? "case-study") as
    | "case-study"
    | "spotlight"
    | "ebrochure"
    | "adaptor-brief"
    | "msa-partnership"
    | "solution-proposal";
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!row) return;
    import("@/lib/print-content-schema").then(
      ({ schemaFor: sf, unreachablePaths, fullyPopulatedSample }) => {
        const dead = unreachablePaths(sf(kindForAudit), fullyPopulatedSample(kindForAudit));
        if (dead.length > 0) {
          console.warn(
            `[print-content-schema] Unreachable fields for kind="${kindForAudit}":`,
            dead,
          );
        }
      },
    );
  }, [kindForAudit, row]);

  if (loading)
    return (
      <AppShell>
        <div className="p-10 text-sm text-black/60">Loading…</div>
      </AppShell>
    );
  if (!row)
    return (
      <AppShell>
        <div className="p-10 text-sm text-red-600">Print asset not found.</div>
      </AppShell>
    );

  const kind = (row.kind ?? "case-study") as
    | "case-study"
    | "spotlight"
    | "ebrochure"
    | "adaptor-brief"
    | "msa-partnership"
    | "solution-proposal";
  // Stable identity matters: this object is the `dep` for the content-fit
  // frame, the overflow hook and the section overlay. A fresh object every
  // render restarted all three, which is what made the canvas flicker.
  const rawContent: Record<string, unknown> = stableRawContent(kind, row.content, () => {
    const c = (row.content as Record<string, unknown>) ?? {};
    if (kind === "spotlight")
      return { ...(emptySpotlight() as unknown as Record<string, unknown>), ...c };
    if (kind === "ebrochure")
      return { ...(emptyEBrochure() as unknown as Record<string, unknown>), ...c };
    if (kind === "adaptor-brief")
      return { ...(emptyAdaptorBrief() as unknown as Record<string, unknown>), ...c };
    if (kind === "msa-partnership")
      return { ...(emptyMsaPartnership() as unknown as Record<string, unknown>), ...c };
    if (kind === "solution-proposal")
      return { ...(emptySolutionProposal() as unknown as Record<string, unknown>), ...c };
    return { ...(emptyCaseStudy() as unknown as Record<string, unknown>), ...c };
  });
  const content: CaseStudyContent = rawContent as unknown as CaseStudyContent;
  const ctx: PrintAssetContext = (row.context as PrintAssetContext) ?? {};
  // Icon treatment: the asset's own stored settings when it has them, else the
  // shared print iconography preference (tuned in the module library). Both the
  // on-screen canvas and the PDF export read THIS value, so they cannot drift.
  const iconTreatment = effectiveAssetIconTreatment(ctx, iconPrefs);

  // Cross-links back to the deck (and other artifacts) the same brief produced.
  const siblingDeckId =
    ctx.siblingDeckId ??
    ((row as unknown as { source_deck_id?: string | null }).source_deck_id || null);
  const siblingDeck = siblingDeckId ? useDeckStore.getState().decks[siblingDeckId] : undefined;

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
  const isHex = (h: string) => /^#[0-9a-fA-F]{6}$/.test(h.trim());
  /** Per-field text colour override (path → hex). null clears. */
  function setInkColor(path: string, color: string | null) {
    const next = { ...(ctx.inkOverrides ?? {}) };
    if (!color || !isHex(color)) delete next[path];
    else next[path] = color.trim().toLowerCase();
    patchCtx({ inkOverrides: Object.keys(next).length ? next : undefined });
  }
  /** Section ("modules[2]") or all-text ("*") colour override. null clears. */
  function setInkScopeColor(scope: string, color: string | null) {
    const next = { ...(ctx.inkScopeOverrides ?? {}) };
    if (!color || !isHex(color)) delete next[scope];
    else next[scope] = color.trim().toLowerCase();
    patchCtx({ inkScopeOverrides: Object.keys(next).length ? next : undefined });
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
    setRow({
      ...row,
      content: prev.content as CaseStudyContent,
      context: prev.context as PrintAssetContext,
    });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }
  function redo() {
    if (!row || historyRef.current.redo.length === 0) return;
    const nxt = historyRef.current.redo.pop()!;
    historyRef.current.undo.push({ content: row.content, context: row.context });
    setRow({
      ...row,
      content: nxt.content as CaseStudyContent,
      context: nxt.context as PrintAssetContext,
    });
    setDirty(true);
    setHistoryTick((t) => t + 1);
  }
  undoRef.current = undo;
  redoRef.current = redo;

  // Generic path-based writer for click-in-preview live editing on the
  // non-case-study kinds. Path syntax matches @/lib/qa readPath:
  // "a.b", "a[0].b".
  function writePath(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
  ): Record<string, unknown> {
    const parts: (string | number)[] = path.split(".").flatMap((p) => {
      const m = /^([^\[]+)(\[(\d+)\])?$/.exec(p);
      if (!m) return [p];
      return m[3] !== undefined ? [m[1]!, Number(m[3])] : [m[1]!];
    });
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    type Container = Record<string | number, unknown>;
    let cur = clone as unknown as Container;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]!;
      const nextK = parts[i + 1]!;
      const child = cur[k];
      const nextChild = Array.isArray(child)
        ? [...child]
        : { ...((child as object | undefined) ?? (typeof nextK === "number" ? [] : {})) };
      cur[k] = nextChild;
      cur = nextChild as unknown as Container;
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

  // --- Replaceable pictures (logos, maps, headshots) ------------------------
  // Slot ids contain dots, so overrides are written as one flat map instead of
  // a nested path to keep `writePath` from creating accidental sub-objects.
  const imageOverrides = ((rawContent as { imageOverrides?: Record<string, string> })
    .imageOverrides ?? {}) as Record<string, string>;
  const [imageBusy, setImageBusy] = useState(false);

  function setImageOverride(slot: string, url: string | null) {
    const next = { ...imageOverrides };
    if (url) next[slot] = url;
    else delete next[slot];
    patchByPath("imageOverrides", next);
  }

  async function onDropImage(slot: string, file: File) {
    setImageBusy(true);
    try {
      const { signedUrl } = await uploadSlideMedia(file, file.name);
      setImageOverride(slot, signedUrl);
    } catch (err) {
      console.error("Image upload failed", err);
      toast.error("Could not upload that image");
    } finally {
      setImageBusy(false);
    }
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

  // Inline validation — recomputed on every keystroke so messages clear as
  // soon as the author fixes the field. Errors only render after a failed save
  // attempt or once a field has been blurred, so a fresh document isn't
  // covered in red before anyone types.
  const fieldErrors = validateDocument({
    title: row?.title ?? "",
    content: (row?.content ?? {}) as never,
  });
  function fieldError(key: string): string | null {
    if (!showErrors && !touched[key]) return null;
    return fieldErrors[key] ?? null;
  }
  function markTouched(key: string) {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }

  function updateStat(i: number, patch: Partial<CaseStudyStat>) {
    const next = [...content.stats];
    next[i] = { ...next[i], ...patch };
    patchContent({ stats: next });
  }

  async function handleSave() {
    if (!row) return;
    if (Object.keys(fieldErrors).length > 0) {
      setShowErrors(true);
      toast.error(errorSummary(fieldErrors) ?? "Fix the highlighted fields before saving.");
      return;
    }
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
    setDeleteOpen(true);
  }

  async function handleConfirmDelete() {
    if (!row || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await remove({ data: { assetId: row.id } });
      setDeleteOpen(false);
      navigate({ to: "/library/print" });
    } catch {
      toast.error("Could not delete the asset. Please try again.");
      setDeleteBusy(false);
    }
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
          divisionId: row.brand_mode_id ?? null,
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
      const pageNodes = Array.from(
        canvasRef.current.querySelectorAll<HTMLElement>("[data-print-page]"),
      );
      await exportPrintAssetAsPdf(pageNodes.length > 1 ? pageNodes : canvasRef.current, {
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

  // Multi-page proposals render every page stacked inside the canvas, so the
  // canvas cannot be pinned to a single page aspect ratio.
  const multiDoc =
    kind === "solution-proposal" && isMultiProposal(rawContent as Partial<SolutionProposalContent>);
  const pageSize: PrintPageSize = ctx.pageSize ?? "A4";
  const marginPreset: PrintMarginPreset = ctx.marginPreset ?? "standard";
  const pagePresetInfo = pagePreset(pageSize);
  const marginSideIn = pageSideMarginIn(pageSize, ctx.density ?? "standard", marginPreset);
  const density: PrintDensity = ctx.density ?? "standard";
  const editorMode: PrintMode = ctx.editorMode ?? "light";
  const showBleedGuides: boolean = !!ctx.showBleedGuides;
  const bleedFraction = Math.max(0, Math.min(0.06, bleedIn / pagePresetInfo.widthIn));
  const canvasAspect = pageAspectRatio(pageSize);
  // Aurora orb frame in the shared 1280×720 native space. Portrait / square
  // page sizes re-project the aurora composition onto a taller / square
  // frame so orbs bleed in from the correct edges (issue: with default
  // slice-preserved 16:9 aurora, a portrait page cropped out the horizontal
  // spread and looked flat). Landscape stays at native 1280×720.
  const auroraAspect: { w: number; h: number } | undefined = pageAuroraFrame(pageSize);

  const densityPad = density === "compact" ? "p-8" : density === "airy" ? "p-16" : "p-12";
  const densityGap = density === "compact" ? "gap-4" : density === "airy" ? "gap-10" : "gap-6";

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-2 py-6">
        {/* HEADER BAR */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              <span className="inline-flex items-center gap-1">
                <ChevronLeft size={14} /> Home
              </span>
            </Link>
            <div>
              <input
                value={row.title}
                aria-label="Document title"
                aria-invalid={Boolean(fieldError("title"))}
                aria-describedby={fieldError("title") ? "err-title" : undefined}
                onBlur={() => markTouched("title")}
                onChange={(e) => {
                  setRow({ ...row, title: e.target.value });
                  setDirty(true);
                }}
                className={`rounded-md border bg-transparent px-2 py-1 text-lg font-semibold text-[#03002C] focus:outline-none dark:text-white ${
                  fieldError("title")
                    ? "border-red-500 focus:border-red-600"
                    : "border-transparent hover:border-black/10 focus:border-[#003FC7] dark:hover:border-white/10"
                }`}
              />
              <FieldError id="err-title" message={fieldError("title")} />
            </div>
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
            <div
              className="mr-1 inline-flex items-center gap-0 rounded-full border border-black/10 bg-white p-0.5 dark:border-white/10 dark:bg-white/[0.03]"
              role="group"
              aria-label="Editor mode"
            >
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
              onClick={() => setPageTemplateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
            >
              <BookmarkPlus size={12} /> Save as page template
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
                  <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/60 dark:text-white/60">
                    PDF export
                  </div>

                  {/* Format — the top-level distinction. Digital vs Press must
                      be an explicit choice; a user should never accidentally
                      email a 100 MB press file or send a 150 DPI file to a
                      printer. */}
                  <div className="mb-3 rounded-xl border border-black/10 p-2 dark:border-white/10">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 dark:text-white/50">
                      Output for
                    </div>
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
                        <div className="mt-0.5 leading-snug text-[10px] opacity-75">
                          Screen / email · 150 DPI · small file
                        </div>
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
                        <div className="mt-0.5 leading-snug text-[10px] opacity-75">
                          Printer-ready · bleed · large file
                        </div>
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
                        <option value="HalfLetter">Half-sheet US (5.5 × 8.5 in)</option>
                        <option value="A5">Half-sheet A5 (148 × 210 mm)</option>
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
                              <option key={k} value={k}>
                                {X4_ICC_PROFILES[k].label}
                              </option>
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

        {siblingDeckId ? (
          <div className="mb-6">
            <BriefOutputsBar
              deckId={siblingDeckId}
              deckTitle={siblingDeck?.title ?? "Presentation"}
              masterSet={siblingDeck?.context?.masterSet}
              active={{ kind: "print", id: row.id }}
            />
          </div>
        ) : null}

        {/* LAYOUT */}
        <div
          className={`grid gap-6 ${
            spineOpen
              ? inspectorOpen
                ? "grid-cols-[220px_1fr_340px]"
                : "grid-cols-[220px_1fr_36px]"
              : inspectorOpen
                ? "grid-cols-[36px_1fr_340px]"
                : "grid-cols-[36px_1fr_36px]"
          }`}
        >
          {/* SPINE */}
          {spineOpen ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
                  Pages
                </div>
                <button
                  type="button"
                  data-testid="print-spine-collapse"
                  onClick={() => setSpineOpen(false)}
                  title="Collapse pages"
                  aria-label="Collapse pages"
                  aria-expanded={true}
                  className="rounded-md border border-black/10 bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-black/60 transition hover:bg-black/5 hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  ‹ Collapse
                </button>
              </div>
              {["Cover", "Challenge", "Solution", "Result", "Stats", "Quote", "CTA / Contact"].map(
                (p, i) => (
                  <div
                    key={p}
                    className="rounded-xl border border-black/10 bg-white p-3 text-xs text-[#03002C] dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
                  >
                    <div className="font-mono text-[10px] text-black/40 dark:text-white/40">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    {p}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="flex justify-start">
              <button
                type="button"
                data-testid="print-spine-expand"
                onClick={() => setSpineOpen(true)}
                title="Expand pages"
                aria-label="Expand pages"
                aria-expanded={false}
                className="sticky top-6 flex h-24 w-9 items-center justify-center rounded-r-xl border border-l-0 border-black/10 bg-white text-black/60 shadow-sm transition hover:bg-black/5 hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <span className="text-lg leading-none">›</span>
              </button>
            </div>
          )}

          {/* CANVAS + document inputs */}
          <div className="min-w-0 space-y-4">
            <div
              ref={canvasRef}
              className="relative overflow-hidden rounded-3xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-[#0B0A2A]"
              style={multiDoc ? undefined : { aspectRatio: canvasAspect }}
            >
              <PrintPageProvider size={pageSize} margin={marginPreset} density={density}>
                <PrintContentFitFrame
                  settings={ctx.contentFit}
                  dep={rawContent}
                  override={ctx.fitOverride}
                  onChange={(knobs) => setFitKnobs(knobs)}
                  onMeasure={setFitMeasure}
                >
                  <PrintDocModeProvider
                    icons={iconTreatment.icons}
                    iconStyle={iconTreatment.iconStyle}
                  >
                    <PrintIconEditContext.Provider
                      value={{
                        active: true,
                        overrides: ((rawContent as { iconOverrides?: Record<string, string> })
                          .iconOverrides ?? {}) as Record<string, string>,
                        onPick: (slot, current) => setIconSlot({ slot, current }),
                      }}
                    >
                      <PrintImageEditContext.Provider
                        value={{
                          active: true,
                          overrides: imageOverrides,
                          onDropFile: onDropImage,
                          onClear: (slot) => setImageOverride(slot, null),
                          busy: imageBusy,
                        }}
                      >
                      <PrintLogoListContext.Provider
                        value={{ active: true, onChange: (path, next) => patchByPath(path, next) }}
                      >
                      <LiveEditOverlay
                        enabled={true}
                        slideId={`asset-${row.id}-${kind}`}
                        content={rawContent}
                        editableFields={editableFieldPaths}
                        onChange={(path, value) => patchByPath(path, value)}
                        inkOverrides={ctx.inkOverrides}
                        inkScopeOverrides={ctx.inkScopeOverrides}
                        onSetInkColor={(cp, color) => setInkColor(cp, color)}
                        onClearInkColor={(cp) => setInkColor(cp, null)}
                        onSetInkScopeColor={(sc, color) => setInkScopeColor(sc, color)}
                        onClearInkScopeColor={(sc) => setInkScopeColor(sc, null)}
                      >
                        <PrintClientLogoProvider value={clientLogo}>
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
                          {brand && kind === "msa-partnership" && (
                            <MsaPartnershipLayout
                              content={rawContent as unknown as MsaPartnershipContent}
                              brand={brand}
                              mode={editorMode}
                              pageSize={pageSize}
                              density={density}
                              seed={`asset-${row.id}`}
                            />
                          )}
                          {brand &&
                            kind === "solution-proposal" &&
                            isMultiProposal(rawContent as Partial<SolutionProposalContent>) && (
                              <MultiProposalLayout
                                content={rawContent as unknown as SolutionProposalContent}
                                brand={brand}
                                mode={editorMode}
                                pageSize={pageSize}
                                density={density}
                                seed={`asset-${row.id}`}
                              />
                            )}
                          {brand &&
                            kind === "solution-proposal" &&
                            !isMultiProposal(rawContent as Partial<SolutionProposalContent>) && (
                            <SolutionProposalLayout
                              content={rawContent as unknown as SolutionProposalContent}
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
                        </PrintClientLogoProvider>
                        {ctx.printSafeArea && (
                          <div
                            data-export-ignore="true"
                            data-canvas-guide="safe-area"
                            className="pointer-events-none absolute inset-6 rounded-2xl border border-dashed border-black/25 dark:border-white/25"
                          />
                        )}
                        <HeroResizeHandle
                          canvasRef={canvasRef}
                          media={(rawContent as { heroMedia?: PrintHeroMedia }).heroMedia}
                          onChange={(next) => patchContent({ heroMedia: next } as never)}
                          kind={kind as never}
                          usedModuleUnits={(
                            (rawContent as { modules?: PrintSection[] }).modules ?? []
                          ).reduce((n, m) => n + weightForSection(m), 0)}
                          hasTitle={!!(rawContent as { title?: string }).title}
                          hasSummary={!!(rawContent as { summary?: string }).summary}
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
                              data-export-ignore="true"
                              data-testid="bleed-guide-outer"
                            />
                            {/* Trim edge — the finished cut line. */}
                            <div
                              className="pointer-events-none absolute inset-0 border border-dashed border-[#003FC7]/70"
                              data-export-ignore="true"
                              data-testid="bleed-guide-trim"
                            />
                          </>
                        )}
                      </LiveEditOverlay>
                      </PrintLogoListContext.Provider>
                      </PrintImageEditContext.Provider>
                      <PrintOverflowOverlay
                        state={overflow}
                        onFix={() => {
                          const cur = (rawContent as { heroMedia?: PrintHeroMedia }).heroMedia;
                          if (!cur?.imageUrl) {
                            toast.error(
                              "Content overflows the page — remove a module or shorten copy.",
                            );
                            return;
                          }
                          const prev = cur.heightPct ?? 46;
                          // Give back roughly the clipped height, plus a 2pt safety margin.
                          const next = Math.max(
                            22,
                            Math.round(prev - overflow.overflowFrac * 100 - 2),
                          );
                          if (next >= prev) {
                            toast.error(
                              "Hero is already at its minimum — remove a module or shorten copy.",
                            );
                            return;
                          }
                          patchContent({ heroMedia: { ...cur, heightPct: next } } as never);
                          toast.success(
                            `Hero reduced to ${next}% (was ${Math.round(prev)}%) to stop the page clipping`,
                          );
                        }}
                      />
                      <SectionSelectOverlay
                        canvasRef={canvasRef}
                        scanKey={rawContent}
                        onDelete={(key) => {
                          if (key.startsWith("module:")) {
                            const id = key.slice("module:".length);
                            const mods = (rawContent as { modules?: PrintSection[] }).modules ?? [];
                            const gone = mods.find((m) => m.id === id);
                            if (!gone) return;
                            patchContent({ modules: mods.filter((m) => m.id !== id) } as never);
                            toast.success(`${gone.kind} module removed`, {
                              action: {
                                label: "Undo",
                                onClick: () => patchContent({ modules: mods } as never),
                              },
                            });
                            return;
                          }
                          if (key === "features") patchContent({ features: [] } as never);
                          else if (key === "knowHow") patchContent({ knowHow: [] } as never);
                          else if (key === "quote") patchContent({ quote: undefined } as never);
                          else if (key === "cta") patchContent({ cta: undefined } as never);
                          else if (key === "hero") patchContent({ heroMedia: undefined } as never);
                          toast.success(`${key} section removed`);
                        }}
                        onReplace={(key) => {
                          if (key.startsWith("module:")) {
                            setPickerOpen(true);
                            return;
                          }
                          toast.info(`Edit "${key}" in the inspector panel →`);
                        }}
                      />

                      {/* Hero affordance — click straight into the hero editor from
                  the canvas instead of hunting for the sidebar panel. */}
                      <button
                        type="button"
                        data-testid="canvas-hero-edit"
                        data-export-ignore="true"
                        onClick={() => setHeroModalOpen(true)}
                        title="Edit hero image"
                        aria-label="Edit hero image"
                        className="absolute right-3 top-3 z-20 rounded-full border border-white/40 bg-black/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur transition hover:bg-black/70"
                      >
                        ✎ Hero
                      </button>
                    </PrintIconEditContext.Provider>
                  </PrintDocModeProvider>
                </PrintContentFitFrame>
              </PrintPageProvider>
              {!isNeutralFit(fitKnobs) && (
                <div
                  data-export-ignore="true"
                  data-testid="print-content-fit-badge"
                  className="pointer-events-none absolute left-3 top-3 z-30 rounded-full border border-white/40 bg-[#03002C]/80 px-3 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur"
                >
                  Content-fit: {describeFit(fitKnobs)}
                </div>
              )}
            </div>

            {/* DOCUMENT INPUTS — content entry lives under the document */}
            <div className="space-y-3">
              <Panel title="Stats" defaultOpen={false}>
                {(content.stats ?? []).map((s, i) => (
                  <div key={i} className="space-y-1">
                    <div className="grid grid-cols-[1fr_60px] gap-2">
                      <input
                        className={
                          fieldError(`stats.${i}.label`) ? inspectorInputInvalid : inspectorInput
                        }
                        value={s.label}
                        aria-label={`Stat ${i + 1} label`}
                        aria-invalid={Boolean(fieldError(`stats.${i}.label`))}
                        onBlur={() => markTouched(`stats.${i}.label`)}
                        onChange={(e) => updateStat(i, { label: e.target.value })}
                        placeholder="Label"
                      />
                      <input
                        className={
                          fieldError(`stats.${i}.value`) ? inspectorInputInvalid : inspectorInput
                        }
                        value={s.value}
                        aria-label={`Stat ${i + 1} value`}
                        aria-invalid={Boolean(fieldError(`stats.${i}.value`))}
                        onBlur={() => markTouched(`stats.${i}.value`)}
                        onChange={(e) => updateStat(i, { value: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <FieldError
                      id={`err-stats-${i}-label`}
                      message={fieldError(`stats.${i}.label`)}
                    />
                    <FieldError
                      id={`err-stats-${i}-value`}
                      message={fieldError(`stats.${i}.value`)}
                    />
                  </div>
                ))}
                {divisionStats.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
                      From division
                    </div>
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
                          <span className="font-semibold">
                            {s.value}
                            {s.unit ?? ""}
                          </span>{" "}
                          · {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Shared modules" defaultOpen={false}>
                {overflow.clipped && (
                  <div
                    data-testid="overflow-inspector-note"
                    className="mb-2 rounded-xl border border-red-400/60 bg-red-50 px-3 py-2 text-[11px] font-semibold leading-snug text-red-700 dark:bg-red-500/10 dark:text-red-300"
                    role="alert"
                  >
                    Page is clipping: {Math.round(overflow.overflowFrac * 100)}% (
                    {overflow.overflowPx}px) of content sits past the trim edge and will be cut from
                    the export. Shrink the hero, remove a module, or shorten copy.
                  </div>
                )}
                <LayoutHealthBanner
                  report={analyzePrintAsset(kind, content)}
                  onApplySuggestion={(s) => {
                    if (s.kind === "reduce-hero") {
                      const cur =
                        (rawContent as { heroMedia?: PrintHeroMedia }).heroMedia ??
                        ({} as PrintHeroMedia);
                      const prev = cur.heightPct ?? 46;
                      patchContent({
                        heroMedia: { ...cur, heightPct: s.targetHeightPct },
                      } as never);
                      toast.success(
                        `Hero reduced to ${s.targetHeightPct}% (was ${Math.round(prev)}%) — freed ${s.frees.toFixed(1)} units`,
                      );
                    } else if (s.kind === "swap-variant") {
                      const modules = content.modules ?? [];
                      const cur = modules[s.moduleIndex];
                      if (cur && cur.kind === "stats") {
                        setPendingSwap({
                          moduleIndex: s.moduleIndex,
                          from: cur.variantId,
                          to: s.to as PrintStatsVariant,
                          frees: s.frees,
                        });
                      }
                    }
                  }}
                />
                <ModulesPanel
                  kind="case-study"
                  modules={content.modules ?? []}
                  heroMedia={(rawContent as { heroMedia?: PrintHeroMedia }).heroMedia}
                  hasTitle={!!(rawContent as { title?: string }).title}
                  hasSummary={!!(rawContent as { summary?: string }).summary}
                  onAdd={() => setPickerOpen(true)}
                  onChange={(next) => patchContent({ modules: next })}
                  mode={editorMode}
                />

                {/* Schema-driven Content inspector — the guaranteed safety net. */}
                <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                  <ContentInspector
                    schema={schemaFor(kind)}
                    content={rawContent}
                    canvasEditablePaths={new Set(editableFieldPaths)}
                    onWritePath={(path: string, value: unknown) => patchByPath(path, value)}
                  />
                </div>
              </Panel>

              <Panel title="Quote" defaultOpen={false}>
                <textarea
                  rows={3}
                  className={fieldError("quote.text") ? inspectorInputInvalid : inspectorInput}
                  placeholder="Pull-quote text"
                  aria-label="Quote text"
                  aria-invalid={Boolean(fieldError("quote.text"))}
                  onBlur={() => markTouched("quote.text")}
                  value={content.quote?.text ?? ""}
                  onChange={(e) =>
                    patchContent({
                      quote: {
                        ...(content.quote ?? { author: "" }),
                        text: e.target.value,
                        author: content.quote?.author ?? "",
                      },
                    })
                  }
                />
                <FieldError id="err-quote-text" message={fieldError("quote.text")} />
                <input
                  className={fieldError("quote.author") ? inspectorInputInvalid : inspectorInput}
                  placeholder="Author"
                  aria-label="Quote author"
                  aria-invalid={Boolean(fieldError("quote.author"))}
                  onBlur={() => markTouched("quote.author")}
                  value={content.quote?.author ?? ""}
                  onChange={(e) =>
                    patchContent({
                      quote: {
                        ...(content.quote ?? { text: "" }),
                        author: e.target.value,
                        text: content.quote?.text ?? "",
                      },
                    })
                  }
                />
                <FieldError id="err-quote-author" message={fieldError("quote.author")} />
                <input
                  className={fieldError("quote.role") ? inspectorInputInvalid : inspectorInput}
                  placeholder="Role, Company"
                  aria-label="Quote author role"
                  onBlur={() => markTouched("quote.role")}
                  value={content.quote?.role ?? ""}
                  onChange={(e) =>
                    patchContent({
                      quote: {
                        ...(content.quote ?? { text: "", author: "" }),
                        role: e.target.value,
                        text: content.quote?.text ?? "",
                        author: content.quote?.author ?? "",
                      },
                    })
                  }
                />
                <FieldError id="err-quote-role" message={fieldError("quote.role")} />
                {divisionQuotes.length > 0 && (
                  <div className="pt-2">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
                      From division
                    </div>
                    <div className="mt-1 space-y-1">
                      {divisionQuotes.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            patchContent({
                              quote: { text: q.quote, author: q.author ?? "", role: q.role ?? "" },
                            })
                          }
                          className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-left text-[11px] hover:border-[#003FC7] dark:border-white/10 dark:bg-white/[0.03]"
                        >
                          “{q.quote.slice(0, 90)}
                          {q.quote.length > 90 ? "…" : ""}”
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Expert / contact" defaultOpen={false}>
                <input
                  className={fieldError("expert.name") ? inspectorInputInvalid : inspectorInput}
                  placeholder="Name"
                  aria-label="Contact name"
                  aria-invalid={Boolean(fieldError("expert.name"))}
                  onBlur={() => markTouched("expert.name")}
                  value={content.expert?.name ?? ""}
                  onChange={(e) =>
                    patchContent({ expert: { ...(content.expert ?? {}), name: e.target.value } })
                  }
                />
                <FieldError id="err-expert-name" message={fieldError("expert.name")} />
                <input
                  className={fieldError("expert.role") ? inspectorInputInvalid : inspectorInput}
                  placeholder="Role"
                  aria-label="Contact role"
                  onBlur={() => markTouched("expert.role")}
                  value={content.expert?.role ?? ""}
                  onChange={(e) =>
                    patchContent({
                      expert: {
                        ...(content.expert ?? { name: "" }),
                        role: e.target.value,
                        name: content.expert?.name ?? "",
                      },
                    })
                  }
                />
                <FieldError id="err-expert-role" message={fieldError("expert.role")} />
                <input
                  className={fieldError("expert.email") ? inspectorInputInvalid : inspectorInput}
                  placeholder="Email"
                  type="email"
                  inputMode="email"
                  aria-label="Contact email"
                  aria-invalid={Boolean(fieldError("expert.email"))}
                  onBlur={() => markTouched("expert.email")}
                  value={content.expert?.email ?? ""}
                  onChange={(e) =>
                    patchContent({
                      expert: {
                        ...(content.expert ?? { name: "" }),
                        email: e.target.value,
                        name: content.expert?.name ?? "",
                      },
                    })
                  }
                />
                <FieldError id="err-expert-email" message={fieldError("expert.email")} />
              </Panel>
            </div>
          </div>

          {/* INSPECTOR */}
          {!inspectorOpen ? (
            <div className="flex justify-end">
              <button
                type="button"
                data-testid="print-inspector-expand"
                onClick={() => setInspectorOpen(true)}
                title="Expand inspector"
                aria-label="Expand inspector"
                aria-expanded={false}
                className="sticky top-6 flex h-24 w-9 items-center justify-center rounded-l-xl border border-r-0 border-black/10 bg-white text-black/60 shadow-sm transition hover:bg-black/5 hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <span className="text-lg leading-none">‹</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  data-testid="print-inspector-collapse"
                  onClick={() => setInspectorOpen(false)}
                  title="Collapse inspector"
                  aria-label="Collapse inspector"
                  aria-expanded={true}
                  className="rounded-md border border-black/10 bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-black/60 transition hover:bg-black/5 hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  Collapse ›
                </button>
              </div>

              <Panel title="Layout">
                <Row label="Page size">
                  <select
                    aria-label="Page Size"
                    value={pageSize}
                    onChange={(e) => patchCtx({ pageSize: e.target.value as PrintPageSize })}
                    className={inspectorInput}
                  >
                    {PRINT_PAGE_SIZE_ORDER.map((key) => {
                      const preset = pagePreset(key);
                      return (
                        <option key={key} value={key}>
                          {preset.label} · {preset.dims}
                        </option>
                      );
                    })}
                  </select>
                </Row>
                <Row label="Margins">
                  <select
                    aria-label="Margin preset"
                    value={marginPreset}
                    onChange={(e) =>
                      patchCtx({ marginPreset: e.target.value as PrintMarginPreset })
                    }
                    className={inspectorInput}
                    title={PRINT_MARGIN_PRESETS[marginPreset].note}
                  >
                    {(
                      Object.keys(PRINT_MARGIN_PRESETS) as Array<keyof typeof PRINT_MARGIN_PRESETS>
                    ).map((key) => (
                      <option key={key} value={key}>
                        {PRINT_MARGIN_PRESETS[key].label}
                      </option>
                    ))}
                  </select>
                </Row>
                <div className="px-1 pb-1 text-[10px] leading-snug text-black/45 dark:text-white/45">
                  {pagePresetInfo.label} · {marginSideIn.toFixed(2)}in side margin ·{" "}
                  {pagePresetInfo.heroBandPct}% masthead band
                </div>
                <Row label="Density">
                  <select
                    aria-label="Density"
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

              <Panel title="Fit audit & corrections">
                {(() => {
                  const fit = resolveContentFit(ctx.contentFit);
                  const hero = (rawContent as { heroMedia?: PrintHeroMedia }).heroMedia;
                  const auditInput: PrintFitAuditInput = {
                    hasHero: Boolean(hero?.imageUrl),
                    heroHeightPct: hero?.heightPct ?? 46,
                    autoFitEnabled: fit.enabled,
                    minScale: fit.minScale,
                    minPad: fit.minPad,
                    pageSize,
                    moduleCount: ((rawContent as { modules?: PrintSection[] }).modules ?? []).length,
                  };
                  const applyFix = (fix: PrintFitFix) => {
                    if (fix.advisory) return;
                    const ctxPatch: Record<string, unknown> = {};
                    if (fix.enableAutoFit) {
                      ctxPatch["contentFit"] = {
                        ...fit,
                        enabled: true,
                        ...(fix.threshold !== undefined ? { threshold: fix.threshold } : {}),
                      };
                    }
                    if (fix.scale !== undefined || fix.pad !== undefined) {
                      ctxPatch["fitOverride"] = {
                        ...(ctx.fitOverride ?? {}),
                        ...(fix.scale !== undefined ? { scale: fix.scale } : {}),
                        ...(fix.pad !== undefined ? { pad: fix.pad } : {}),
                      };
                    }
                    if (fix.density) ctxPatch["density"] = fix.density;
                    if (Object.keys(ctxPatch).length) patchCtx(ctxPatch as Partial<typeof ctx>);
                    if (fix.heroHeightPct !== undefined && hero) {
                      patchContent({
                        heroMedia: { ...hero, heightPct: fix.heroHeightPct },
                      } as never);
                    }
                    toast.success(fix.label);
                  };
                  return (
                    <PrintFitAuditPanel
                      measurement={fitMeasure}
                      input={auditInput}
                      override={ctx.fitOverride}
                      onApply={applyFix}
                      onOverride={(patch) => {
                        if (patch === null) {
                          patchCtx({ fitOverride: undefined });
                          return;
                        }
                        const next: { scale?: number; pad?: number } = {
                          ...(ctx.fitOverride ?? {}),
                        };
                        if ("scale" in patch) {
                          if (patch.scale === undefined) delete next.scale;
                          else next.scale = patch.scale;
                        }
                        if ("pad" in patch) {
                          if (patch.pad === undefined) delete next.pad;
                          else next.pad = patch.pad;
                        }
                        patchCtx({
                          fitOverride:
                            next.scale === undefined && next.pad === undefined ? undefined : next,
                        });
                      }}
                    />
                  );
                })()}
              </Panel>

              <Panel title="Content fit">
                {(() => {
                  const fit = resolveContentFit(ctx.contentFit);
                  const patchFit = (patch: Record<string, unknown>) =>
                    patchCtx({ contentFit: { ...fit, ...patch } });
                  return (
                    <>
                      <p className="text-[11px] leading-[1.5] text-black/55 dark:text-white/55">
                        When content runs past the trim by more than the threshold, the page pulls
                        its side margins in first, then shrinks typography and iconography together
                        — down to the floors below.
                      </p>
                      <Row label="Auto-fit overflow">
                        <input
                          type="checkbox"
                          data-testid="toggle-content-fit"
                          checked={fit.enabled}
                          onChange={(e) => patchFit({ enabled: e.target.checked })}
                        />
                      </Row>
                      <Row label={`Threshold ${Math.round(fit.threshold * 100)}%`}>
                        <input
                          type="range"
                          aria-label="Content fit threshold"
                          min={2}
                          max={40}
                          step={1}
                          value={Math.round(fit.threshold * 100)}
                          onChange={(e) => patchFit({ threshold: Number(e.target.value) / 100 })}
                        />
                      </Row>
                      <Row label="Margin relief first">
                        <input
                          type="checkbox"
                          checked={fit.marginRelief}
                          onChange={(e) => patchFit({ marginRelief: e.target.checked })}
                        />
                      </Row>
                      <Row label={`Min side margin ${Math.round(fit.minPad * 100)}%`}>
                        <input
                          type="range"
                          aria-label="Minimum side margin"
                          min={40}
                          max={100}
                          step={2}
                          value={Math.round(fit.minPad * 100)}
                          onChange={(e) => patchFit({ minPad: Number(e.target.value) / 100 })}
                        />
                      </Row>
                      <Row label={`Min scale ${Math.round(fit.minScale * 100)}%`}>
                        <input
                          type="range"
                          aria-label="Minimum content scale"
                          min={60}
                          max={100}
                          step={1}
                          value={Math.round(fit.minScale * 100)}
                          onChange={(e) => patchFit({ minScale: Number(e.target.value) / 100 })}
                        />
                      </Row>
                      <Row label="Applied now">
                        <span className="text-[11px] font-medium text-black/60 dark:text-white/60">
                          {describeFit(fitKnobs)}
                        </span>
                      </Row>
                      {ctx.contentFit ? (
                        <button
                          type="button"
                          onClick={() => patchCtx({ contentFit: PRINT_CONTENT_FIT_DEFAULTS })}
                          className="text-[11px] font-medium text-[#003FC7] hover:underline"
                        >
                          Reset to defaults
                        </button>
                      ) : null}
                    </>
                  );
                })()}
              </Panel>

              <Panel title="Iconography">
                <Row label="Show icons">
                  <input
                    type="checkbox"
                    data-testid="toggle-print-icons"
                    checked={iconTreatment.icons}
                    onChange={(e) => patchCtx({ icons: e.target.checked })}
                  />
                </Row>
                <Row label={`Size ${iconTreatment.iconStyle.scale.toFixed(2)}x`}>
                  <input
                    type="range"
                    aria-label="Icon size"
                    min={0.6}
                    max={1.8}
                    step={0.05}
                    value={iconTreatment.iconStyle.scale}
                    onChange={(e) =>
                      patchCtx({
                        iconStyle: { ...iconTreatment.iconStyle, scale: Number(e.target.value) },
                      })
                    }
                    className="w-full"
                  />
                </Row>
                <Row label={`Stroke ${iconTreatment.iconStyle.stroke.toFixed(2)}x`}>
                  <input
                    type="range"
                    aria-label="Icon stroke weight"
                    min={0.6}
                    max={2}
                    step={0.05}
                    value={iconTreatment.iconStyle.stroke}
                    onChange={(e) =>
                      patchCtx({
                        iconStyle: { ...iconTreatment.iconStyle, stroke: Number(e.target.value) },
                      })
                    }
                    className="w-full"
                  />
                </Row>
                <Row label="Icon accent">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label="Icon accent color"
                      value={iconTreatment.iconStyle.accent ?? "#003FC7"}
                      onChange={(e) =>
                        patchCtx({
                          iconStyle: { ...iconTreatment.iconStyle, accent: e.target.value },
                        })
                      }
                      className="h-7 w-10 cursor-pointer rounded border border-black/10 bg-transparent dark:border-white/15"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const { accent: _a, ...rest } = iconTreatment.iconStyle;
                        patchCtx({ iconStyle: rest });
                      }}
                      className="rounded-md border border-black/10 px-2 py-1 text-[10px] uppercase tracking-widest text-black/60 transition hover:bg-black/5 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
                    >
                      Section accent
                    </button>
                  </div>
                </Row>
                <IconAccentContrastWarning
                  accent={iconTreatment.iconStyle.accent}
                  background={iconPageBackground(editorMode)}
                  stroke={iconTreatment.iconStyle.stroke}
                  onApplySuggestion={(hex) =>
                    patchCtx({ iconStyle: { ...iconTreatment.iconStyle, accent: hex } })
                  }
                />
              </Panel>

              {baseBrand && (
                <Panel title="Page color override">
                  <PageColorOverridePanel
                    accentOverride={ctx.accentOverride}
                    primaryOverride={ctx.primaryOverride}
                    brandAccent={baseBrand.tokens.accent || baseBrand.tokens.primary}
                    brandPrimary={baseBrand.tokens.primary}
                    onChange={(patch: { accentOverride?: string; primaryOverride?: string }) =>
                      patchCtx(patch)
                    }
                  />
                </Panel>
              )}

              <Panel title="Client logo">
                <ClientLogoPanel
                  selectedId={ctx.clientLogoId}
                  selectedName={ctx.clientLogoName}
                  mode={editorMode === "dark" ? "dark" : "light"}
                  onChange={(next) => patchCtx(next)}
                />
              </Panel>

              <HeroMediaPanel
                value={content.heroMedia}
                onChange={(next) => patchContent({ heroMedia: next })}
                divisionId={row?.brand_mode_id ?? null}
                brand={brand}
                kind={kind}
                assetId={row?.id ?? null}
                hasTitle={!!(content as { title?: string }).title?.trim()}
                hasSummary={!!(content as { summary?: string }).summary?.trim()}
                modules={(content as { modules?: PrintSection[] }).modules}
              />

              {/* Page masthead — the legacy full-page openers read the exact same
                  rule + title-type contract as the modular hero sections. */}
              <Panel title="Page masthead">
                <MastheadRuleTypeControls
                  rule={(content as { heroRule?: PrintHeroRule }).heroRule}
                  titleType={(content as { heroTitleType?: PrintHeroTitleType }).heroTitleType}
                  onChange={(next) =>
                    patchContent({
                      ...("rule" in next ? { heroRule: next.rule } : null),
                      ...("titleType" in next ? { heroTitleType: next.titleType } : null),
                    } as never)
                  }
                />
              </Panel>

              {/* Content input panels live under the document — see below. */}
            </div>
          )}
        </div>
      </div>
      <PrintIconSwapModal
        open={!!iconSlot}
        current={iconSlot?.current ?? null}
        onClose={() => setIconSlot(null)}
        onSelect={(name) => {
          if (!iconSlot) return;
          const cur = ((rawContent as { iconOverrides?: Record<string, string> }).iconOverrides ??
            {}) as Record<string, string>;
          patchContent({ iconOverrides: { ...cur, [iconSlot.slot]: name } } as never);
          toast.success(`Icon changed to "${name.replace(/-/g, " ")}"`);
        }}
        onReset={() => {
          if (!iconSlot) return;
          const cur = {
            ...(((rawContent as { iconOverrides?: Record<string, string> }).iconOverrides ??
              {}) as Record<string, string>),
          };
          delete cur[iconSlot.slot];
          patchContent({ iconOverrides: cur } as never);
          toast.success("Icon reset to template default");
        }}
      />
      {heroModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/55 p-4"
            role="presentation"
            onClick={() => setHeroModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Hero image"
              onClick={(e) => e.stopPropagation()}
              className="my-8 w-full max-w-xl rounded-2xl border border-black/10 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#0B0A2A]"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-[#03002C] dark:text-white">
                  Hero image
                </div>
                <button
                  type="button"
                  onClick={() => setHeroModalOpen(false)}
                  className="rounded-md px-2 py-1 text-xs text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <HeroMediaPanel
                value={content.heroMedia}
                onChange={(next) => patchContent({ heroMedia: next })}
                divisionId={row?.brand_mode_id ?? null}
                brand={brand}
                kind={kind}
                assetId={row?.id ?? null}
                hasTitle={!!(content as { title?: string }).title?.trim()}
                hasSummary={!!(content as { summary?: string }).summary?.trim()}
                modules={(content as { modules?: PrintSection[] }).modules}
              />
            </div>
          </div>,
          document.body,
        )}
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
      <SavePageTemplateDialog
        open={pageTemplateOpen}
        onClose={() => setPageTemplateOpen(false)}
        kind={kind}
        sections={(content as { modules?: PrintSection[] }).modules ?? []}
        layout={{
          ...captureTemplateLayout(ctx),
          contentShell: captureTemplateContentShell(content as unknown as Record<string, unknown>),
        }}
        defaultTitle={row.title || "Untitled page template"}
        sourceAssetId={row.id}
        sourceLibraryItemId={
          ((row.context as Record<string, unknown> | null)?.["libraryItemId"] as string | null) ??
          null
        }
        divisionId={row.brand_mode_id ?? null}
      />

      <SwapVariantPreviewModal
        open={!!pendingSwap}
        moduleIndex={pendingSwap?.moduleIndex ?? 0}
        fromVariant={pendingSwap?.from ?? "kpi-dashboard-portrait"}
        toVariant={pendingSwap?.to ?? "stat-callout-row-portrait"}
        frees={pendingSwap?.frees ?? 0}
        section={
          pendingSwap
            ? ((content.modules ?? [])[pendingSwap.moduleIndex] as PrintStatsSection | undefined)
            : undefined
        }
        mode={editorMode}
        onCancel={() => setPendingSwap(null)}
        onConfirm={() => {
          if (!pendingSwap) return;
          const modules = [...(content.modules ?? [])];
          const cur = modules[pendingSwap.moduleIndex];
          if (cur && cur.kind === "stats") {
            modules[pendingSwap.moduleIndex] = { ...cur, variantId: pendingSwap.to };
            patchContent({ modules });
            toast.success(
              `Swapped module ${pendingSwap.moduleIndex + 1} → ${pendingSwap.to} (freed ${pendingSwap.frees.toFixed(1)} units)`,
            );
          }
          setPendingSwap(null);
        }}
      />
      <ConfirmModal
        open={deleteOpen}
        title="Delete this print asset?"
        description={`"${row?.title ?? "Untitled"}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        busy={deleteBusy}
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </AppShell>
  );
}

function ModulesPanel({
  kind,
  modules,
  onAdd,
  onChange,
  mode,
  heroMedia,
  hasTitle,
  hasSummary,
}: {
  kind:
    | "case-study"
    | "spotlight"
    | "ebrochure"
    | "adaptor-brief"
    | "msa-partnership"
    | "solution-proposal";
  modules: PrintSection[];
  onAdd: () => void;
  onChange: (next: PrintSection[]) => void;
  mode: PrintMode;
  heroMedia?: PrintHeroMedia;
  hasTitle?: boolean;
  hasSummary?: boolean;
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
  function patchStatsItem(
    i: number,
    itemIdx: number,
    p: Partial<PrintStatsSection["items"][number]>,
  ) {
    const cur = modules[i];
    if (!cur || cur.kind !== "stats") return;
    const items = [...cur.items];
    items[itemIdx] = { ...items[itemIdx]!, ...p };
    patch(i, { items } as Partial<PrintStatsSection>);
  }

  // Weight the lightest known variant so a "no room" verdict really means no
  // room even for the smallest module. Hero-aware — the effective budget
  // shrinks as the hero band grows.
  const lightestWeight = 1.6;
  const gate = canAddModule(kind, modules, lightestWeight, {
    heroMedia,
    copy: { hasTitle: !!hasTitle, hasSummary: !!hasSummary },
  });

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
        <div className="pt-1 text-[11px] text-black/50 dark:text-white/50">
          No shared modules yet. Insert stats blocks to enrich the document.
        </div>
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
          (e.currentTarget as HTMLDivElement).classList.add(
            "border-[#003FC7]",
            "bg-[#003FC7]/5",
            "text-[#003FC7]",
          );
        }}
        onDragLeave={(e) => {
          (e.currentTarget as HTMLDivElement).classList.remove(
            "border-[#003FC7]",
            "bg-[#003FC7]/5",
            "text-[#003FC7]",
          );
        }}
        onDrop={(e) => {
          const inserted = readInsertPayload(e);
          (e.currentTarget as HTMLDivElement).classList.remove(
            "border-[#003FC7]",
            "bg-[#003FC7]/5",
            "text-[#003FC7]",
          );
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
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
            aria-expanded={open}
          >
            <GripVertical
              size={14}
              className="shrink-0 text-foreground/30 dark:text-primary-foreground/30"
              aria-hidden
            />
            {open ? (
              <ChevronDown
                size={14}
                className="shrink-0 text-foreground/50 dark:text-primary-foreground/50"
              />
            ) : (
              <ChevronRight
                size={14}
                className="shrink-0 text-foreground/50 dark:text-primary-foreground/50"
              />
            )}
            <span className="truncate text-[11px] font-semibold uppercase tracking-widest text-black/70 dark:text-white/70">
              {sectionKindLabel(m.kind)}
            </span>
            {!open && summary && (
              <span className="truncate text-[11px] text-black/45 dark:text-white/45">
                · {summary}
              </span>
            )}
          </button>
          <div className="flex items-center gap-0.5">
            <button
              className="rounded p-1 text-icon-muted hover:bg-black/5 dark:hover:bg-white/10"
              onClick={onMoveUp}
              aria-label="Move up"
            >
              <ArrowUp size={12} />
            </button>
            <button
              className="rounded p-1 text-icon-muted hover:bg-black/5 dark:hover:bg-white/10"
              onClick={onMoveDown}
              aria-label="Move down"
            >
              <ArrowDown size={12} />
            </button>
            <button
              className="rounded p-1 text-red-500 hover:bg-red-500/10"
              onClick={onRemove}
              aria-label="Delete"
            >
              <Trash2 size={12} />
            </button>
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
              {showPreview ? (
                <>
                  <EyeOff size={12} /> Hide preview
                </>
              ) : (
                <>
                  <Eye size={12} /> Show preview
                </>
              )}
            </button>
            {showPreview && (
              <div className="overflow-hidden rounded border border-black/10 dark:border-white/10">
                <div style={{ pointerEvents: "none" }}>
                  <PrintSectionPreviewFrame section={m} mode={editorMode} accent="#003FC7" />
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
  const anyS = s as unknown as {
    title?: string;
    eyebrow?: string;
    text?: string;
    items?: Array<unknown>;
  };
  if (anyS.title) return anyS.title;
  if (anyS.text) return String(anyS.text).slice(0, 40);
  if (anyS.eyebrow) return anyS.eyebrow;
  if (anyS.items?.length) return `${anyS.items.length} item${anyS.items.length === 1 ? "" : "s"}`;
  return "";
}

const inspectorInput =
  "w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs text-[#03002C] focus:border-[#003FC7] focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-white";

const inspectorInputInvalid =
  "w-full rounded-md border border-red-500 bg-white px-2 py-1.5 text-xs text-[#03002C] focus:border-red-600 focus:outline-none dark:border-red-400 dark:bg-white/[0.03] dark:text-white";

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

function LabeledField({
  label,
  children,
  hint,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[10px] text-black/40 dark:text-white/40">{hint}</span>}
    </label>
  );
}

("w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs text-[#03002C] focus:border-[#003FC7] focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-white");

function Panel({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/60 dark:text-white/60">
          {title}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-icon-subtle transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="space-y-2 px-4 pb-4">{children}</div>}
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

function Block({
  label,
  body,
  onChange,
}: {
  label: string;
  body: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
        {label}
      </div>
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

function parseHeroMediaJson(json: string | null): PrintHeroMedia | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as PrintHeroMedia;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function HeroMediaPanel({
  value,
  onChange,
  divisionId,
  brand,
  kind,
  assetId,
  hasTitle = false,
  hasSummary = false,
  modules,
}: {
  value: PrintHeroMedia | undefined;
  onChange: (next: PrintHeroMedia | undefined) => void;
  divisionId: string | null;
  brand: BrandMode | undefined;
  kind:
    | "case-study"
    | "spotlight"
    | "ebrochure"
    | "adaptor-brief"
    | "msa-partnership"
    | "solution-proposal";
  assetId: string | null;
  hasTitle?: boolean;
  hasSummary?: boolean;
  modules?: PrintSection[];
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
  const undoApply = useServerFn(undoApplyHeroToAllPrintAssets);
  const [applyingAll, setApplyingAll] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{
    toUpdate: Array<{ id: string; title: string; heroMediaJson: string | null }>;
    toSkip: Array<{
      id: string;
      title: string;
      reason: "customized";
      heroMediaJson: string | null;
    }>;
    scanned: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Last apply's undo snapshot — session-only, cleared on new apply or successful undo.
  const [lastUndo, setLastUndo] = useState<{
    snapshots: Array<{ id: string; heroMedia: unknown }>;
    appliedAt: number;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [applySummary, setApplySummary] = useState<
    | { status: "success"; updated: number; scanned: number; skipped: number }
    | { status: "error"; message: string; errors: string[]; skipped?: number }
    | { status: "undone"; restored: number }
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
    setLastUndo(null);
    setApplyingAll(true);
    try {
      const res = await applyAll({
        data: {
          kind,
          brandModeId: divisionId,
          heroMedia: media as unknown as Record<string, unknown>,
          excludeAssetId: assetId ?? undefined,
          onlyUncustomized: true,
        },
      });
      const skipped = res.skipped ?? 0;
      if (res.errors.length === 0) {
        setApplySummary({ status: "success", updated: res.updated, scanned: res.scanned, skipped });
      } else if (res.updated > 0) {
        setApplySummary({
          status: "error",
          message: `Applied to ${res.updated} of ${res.scanned} assets; ${res.errors.length} failed${skipped ? `, ${skipped} skipped (customized)` : ""}.`,
          errors: res.errors,
          skipped,
        });
      } else {
        setApplySummary({
          status: "error",
          message: `Could not apply to any asset: ${res.errors[0] ?? "unknown error"}`,
          errors: res.errors,
          skipped,
        });
      }
      // Stash the undo snapshot so the user can revert this apply.
      if (res.undoToken && res.updated > 0) {
        try {
          const parsed = JSON.parse(res.undoToken) as Array<{ id: string; heroMedia: unknown }>;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLastUndo({ snapshots: parsed, appliedAt: Date.now() });
          }
        } catch {
          // ignore — undo just won't be offered
        }
      }
      const skipMsg = skipped ? `, ${skipped} skipped` : "";
      toast.success(
        `Applied to ${res.updated} of ${res.scanned} ${kind.replace("-", " ")} asset${res.scanned === 1 ? "" : "s"}${skipMsg}.`,
      );
      setConfirmOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk apply failed.";
      setApplySummary({ status: "error", message, errors: [message] });
      toast.error(message);
    } finally {
      setApplyingAll(false);
    }
  }

  async function handleUndoApply() {
    if (!lastUndo || undoing) return;
    setUndoing(true);
    const tid = toast.loading("Reverting bulk apply…");
    try {
      const res = await undoApply({ data: { snapshots: lastUndo.snapshots } });
      if (res.errors.length === 0) {
        setApplySummary({ status: "undone", restored: res.restored });
        setLastUndo(null);
        toast.success(`Reverted ${res.restored} template${res.restored === 1 ? "" : "s"}.`, {
          id: tid,
        });
      } else if (res.restored > 0) {
        setApplySummary({
          status: "error",
          message: `Reverted ${res.restored} of ${res.scanned}; ${res.errors.length} failed.`,
          errors: res.errors,
        });
        toast.error(`Reverted ${res.restored} of ${res.scanned}; ${res.errors.length} failed.`, {
          id: tid,
        });
      } else {
        setApplySummary({
          status: "error",
          message: `Undo failed: ${res.errors[0] ?? "unknown error"}`,
          errors: res.errors,
        });
        toast.error("Undo failed.", { id: tid });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Undo failed.";
      toast.error(message, { id: tid });
    } finally {
      setUndoing(false);
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
        : {
            imageUrl: "",
            overlayOpacity: 0.55,
            washStrength: 1,
            scrim: "bottom",
            blendMode: "multiply",
            heightPct: 46,
          };
      toast.loading("Generating light + dark variants…", { id: tid });
      // Sample the new photo and attach a matched treatment for each page
      // mode, so the hero reads correctly on white and on near-black without
      // any manual tuning.
      const next = await withAutoHeroVariants({ ...base, imageUrl: signedUrl, autoScrim: true });
      onChange(next);
      toast.success("Hero image uploaded — light + dark variants generated.", { id: tid });
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
    if (!divisionId) {
      setCurated([]);
      return;
    }
    let cancelled = false;
    setCuratedLoading(true);
    list({ data: { divisionId, onlyApproved: true } })
      .then((rows) => {
        if (!cancelled) setCurated(rows.slice(0, 12));
      })
      .catch(() => {
        if (!cancelled) setCurated([]);
      })
      .finally(() => {
        if (!cancelled) setCuratedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [divisionId, list]);

  function patch(p: Partial<PrintHeroMedia>) {
    onChange({ ...media, ...p });
  }
  function selectFromCurated(entry: DivisionImageryEntry) {
    if (!entry.signedUrl) return;
    // Preserve current tuning if the user was mid-edit; otherwise seed sane defaults.
    const base: PrintHeroMedia = enabled
      ? media
      : {
          imageUrl: "",
          overlayOpacity: 0.55,
          washStrength: 1,
          scrim: "bottom",
          blendMode: "multiply",
          heightPct: 46,
        };
    const picked: PrintHeroMedia = { ...base, imageUrl: entry.signedUrl, autoScrim: true };
    onChange(picked);
    // Regenerate the light/dark pair for the newly picked photo.
    void withAutoHeroVariants(picked).then((withVariants) => onChange(withVariants));
  }

  return (
    <Panel title="Hero media">
      <Row label="Enabled">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            e.target.checked
              ? onChange({
                  imageUrl: media.imageUrl || "",
                  overlayOpacity: 0.55,
                  washStrength: 1,
                  scrim: "bottom",
                  blendMode: "multiply",
                  heightPct: 46,
                })
              : onChange(undefined)
          }
        />
      </Row>
      {/* Live hero preview — updates as heroMedia changes (image, focal,
          scrim, wash, aspect). Gives the picker an immediate WYSIWYG loop. */}
      <HeroPreviewPanel media={value} brand={brand} />
      <HeroCostDebugPanel
        kind={kind}
        media={value}
        hasTitle={hasTitle}
        hasSummary={hasSummary}
        modules={modules}
      />
      {/* One-click bulk-apply — writes the current hero to every sibling
          print asset of the same kind under this division. */}
      <div className="space-y-2 rounded-md border border-black/10 bg-black/[0.02] px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-black/60 dark:text-white/60">
            Apply to every <span className="font-semibold">{kind.replace("-", " ")}</span> in this
            division still using default hero settings
          </span>

          <button
            type="button"
            onClick={handleApplyToAll}
            disabled={!enabled || !divisionId || applyingAll}
            className="rounded border border-black/15 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.05] dark:text-white/80"
            title={
              !enabled
                ? "Select a hero image first"
                : !divisionId
                  ? "Select a division first"
                  : "Apply to all sibling templates"
            }
          >
            {applyingAll ? "Applying…" : "Apply to all"}
          </button>
        </div>

        {applyingAll && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[#003FC7]" />
            </div>
            <div className="text-[10px] text-black/50 dark:text-white/50">
              Applying hero to relevant templates…
            </div>
          </div>
        )}

        {applySummary && applySummary.status === "success" && (
          <div className="space-y-1.5 rounded-md bg-[#A6FA87]/20 px-2 py-1.5 text-[11px] text-[#0F5C1A] dark:bg-[#A6FA87]/15 dark:text-[#A6FA87]">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full bg-[#A6FA87]" />
              <span>
                Applied to <strong>{applySummary.updated}</strong> of{" "}
                <strong>{applySummary.scanned}</strong> {kind.replace("-", " ")} asset
                {applySummary.scanned === 1 ? "" : "s"}
                {applySummary.skipped > 0 ? (
                  <>
                    {" "}
                    · <strong>{applySummary.skipped}</strong> left untouched (customized focal /
                    scrim / wash)
                  </>
                ) : null}
                .
              </span>
            </div>
            {lastUndo && (
              <div className="flex items-center justify-between gap-2 pl-5">
                <span className="text-[10px] opacity-80">
                  Not what you expected? Restore the previous hero on {lastUndo.snapshots.length}{" "}
                  template
                  {lastUndo.snapshots.length === 1 ? "" : "s"}.
                </span>
                <button
                  type="button"
                  onClick={handleUndoApply}
                  disabled={undoing}
                  className="rounded border border-current/40 bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition hover:bg-white disabled:opacity-40 dark:bg-black/30 dark:hover:bg-black/50"
                >
                  {undoing ? "Reverting…" : "Undo"}
                </button>
              </div>
            )}
          </div>
        )}

        {applySummary && applySummary.status === "undone" && (
          <div className="flex items-start gap-2 rounded-md bg-black/[0.04] px-2 py-1.5 text-[11px] text-black/70 dark:bg-white/[0.06] dark:text-white/70">
            <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full bg-black/40 dark:bg-white/40" />
            <span>
              Reverted <strong>{applySummary.restored}</strong> template
              {applySummary.restored === 1 ? "" : "s"} to the previous hero.
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
        description={`Review which "${kind.replace("-", " ")}" templates in this division will be updated. Anything with custom focal, scrim, or wash tuning is left untouched.`}
        body={
          <div className="space-y-4 text-sm text-black">
            {previewLoading && <div className="text-black/60">Scanning sibling templates…</div>}
            {previewError && (
              <div className="rounded-md bg-[#E53D2E]/10 px-3 py-2 text-[#E53D2E]">
                {previewError}
              </div>
            )}
            {preview && !previewLoading && (
              <>
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-black/60">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#003FC7]" />
                    Will update · <strong className="text-black">{preview.toUpdate.length}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-black/30" />
                    Skip · <strong className="text-black">{preview.toSkip.length}</strong>
                  </span>
                  <span className="ml-auto text-black/40 normal-case tracking-normal">
                    {preview.scanned} total
                  </span>
                </div>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#003FC7]">
                    Will update ({preview.toUpdate.length})
                  </h3>
                  {preview.toUpdate.length === 0 ? (
                    <p className="mt-1 text-[12px] text-black/50">
                      Nothing to update — every sibling template already has custom tuning.
                    </p>
                  ) : (
                    <ul className="mt-1 max-h-72 space-y-2 overflow-y-auto rounded-md border border-black/10 bg-black/[0.02] p-2">
                      {preview.toUpdate.map((r) => {
                        const before = parseHeroMediaJson(r.heroMediaJson);
                        return (
                          <li
                            key={r.id}
                            className="flex items-center gap-3 rounded border border-transparent bg-white/60 p-1.5"
                          >
                            <HeroDiffTile before={before} after={media} status="update" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-medium text-black/85">
                                {r.title}
                              </div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-[#003FC7]">
                                Will update
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/50">
                    Skip ({preview.toSkip.length})
                  </h3>
                  {preview.toSkip.length === 0 ? (
                    <p className="mt-1 text-[12px] text-black/50">
                      No customized templates — nothing to skip.
                    </p>
                  ) : (
                    <ul className="mt-1 max-h-72 space-y-2 overflow-y-auto rounded-md border border-black/10 bg-black/[0.02] p-2">
                      {preview.toSkip.map((r) => {
                        const before = parseHeroMediaJson(r.heroMediaJson);
                        return (
                          <li
                            key={r.id}
                            className="flex items-center gap-3 rounded border border-transparent bg-white/60 p-1.5"
                          >
                            <HeroDiffTile before={before} after={media} status="skip" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-medium text-black/85">
                                {r.title}
                              </div>
                              <div className="text-[10px] uppercase tracking-[0.18em] text-black/50">
                                Kept · customized focal / scrim / wash
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        }
        confirmLabel={
          preview && preview.toUpdate.length > 0
            ? `Apply to ${preview.toUpdate.length}`
            : "Apply to all"
        }
        cancelLabel="Cancel"
        busy={applyingAll}
        disableConfirm={
          previewLoading || !!previewError || (preview !== null && preview.toUpdate.length === 0)
        }
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
              {divisionId
                ? "No approved imagery yet for this division."
                : "Select a division to see curated imagery."}
            </div>
          ) : (
            curated.map((entry) => {
              const url = entry.variantUrls?.thumb ?? entry.signedUrl ?? "";
              const active = enabled && entry.signedUrl === media.imageUrl;
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
                  style={
                    url
                      ? {
                          backgroundImage: `url(${url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {}
                  }
                >
                  {!url && (
                    <span className="absolute inset-0 grid place-items-center text-[9px] text-black/50 dark:text-white/40">
                      no preview
                    </span>
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
          <span className="text-[9px] normal-case tracking-normal text-black/40 dark:text-white/40">
            Bundled · ready to use
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {getDivisionImagery(divisionId ?? "bm-enterprise")
            .photos.slice(0, 8)
            .map((url, idx) => {
              const active = enabled && media.imageUrl === url;
              return (
                <button
                  key={`${url}-${idx}`}
                  type="button"
                  onClick={() => {
                    const base: PrintHeroMedia = enabled
                      ? media
                      : {
                          imageUrl: "",
                          overlayOpacity: 0.55,
                          washStrength: 1,
                          scrim: "bottom",
                          blendMode: "multiply",
                          heightPct: 46,
                        };
                    onChange({ ...base, imageUrl: url });
                  }}
                  className={`relative aspect-video overflow-hidden rounded border transition ${
                    active
                      ? "border-[#003FC7] ring-2 ring-[#003FC7]/40"
                      : "border-black/10 hover:border-black/30 dark:border-white/10 dark:hover:border-white/30"
                  }`}
                  title={`Starter hero ${idx + 1}`}
                  style={{
                    backgroundImage: `url(${url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              );
            })}
        </div>
      </div>
      {/* Upload / drop zone — persists into the private slide-media bucket. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
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
        {media.imageUrl ? (
          <button
            type="button"
            onClick={async () => {
              const tid = toast.loading("Regenerating light + dark variants…");
              const next = await withAutoHeroVariants({ ...media, autoScrim: true });
              onChange(next);
              toast.success("Light + dark variants regenerated.", { id: tid });
            }}
            className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:bg-white/[0.04] dark:text-white/70"
            title="Re-sample this photo and rebuild the matched light/dark treatments"
          >
            <Sparkles size={12} /> Redo variants
          </button>
        ) : null}
        <div className="mt-1 text-[10px] text-black/40 dark:text-white/40">
          or drop a PNG/JPG here · saved to your library · light + dark variants auto-generated
        </div>
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
          <Images size={12} />
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
          aria-label="Aspect"
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
      {/* Full-bleed raw photo: kills every tint layer so the image shows at 100%. */}
      <Row label="Raw photo (no wash)">
        <input
          type="checkbox"
          checked={media.rawImage === true}
          onChange={(e) => patch({ rawImage: e.target.checked })}
        />
      </Row>
      {media.rawImage && (
        <p className="text-[11px] leading-snug text-black/50 dark:text-white/50">
          Wash, veil and scrim are off — check hero copy contrast against the photo.
        </p>
      )}
      <div
        className={media.rawImage ? "pointer-events-none grid gap-2 opacity-40" : "grid gap-2"}
        aria-disabled={media.rawImage === true}
      >
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
      </div>

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
      <Slider
        label="Copy vertical offset"
        value={media.copyOffsetPct ?? 0}
        min={-50}
        max={50}
        step={1}
        onChange={(v) => patch({ copyOffsetPct: v })}
        display={
          (media.copyOffsetPct ?? 0) === 0
            ? "Centered"
            : `${(media.copyOffsetPct ?? 0) > 0 ? "+" : ""}${Math.round(media.copyOffsetPct ?? 0)}%`
        }
      />

      <Row label="Scrim">
        <select
          aria-label="Scrim"
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
          aria-label="Blend Mode"
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
    case "hero":
      return "Hero";
    case "stats":
      return "Stats";
    case "quote":
      return "Quote";
    case "logo-grid":
      return "Logo grid";
    case "expertise":
      return "Expertise";
    case "feature-list":
      return "Features";
    case "narrative":
      return "Narrative";
    case "table":
      return "Table";
    case "contact":
      return "Contact & CTA";
    default:
      return "Module";
  }
}

function SectionInlineEditor({
  section,
  onPatch,
}: {
  section: PrintSection;
  onPatch: (p: Partial<PrintSection>) => void;
}) {
  switch (section.kind) {
    case "hero":
      return (
        <HeroInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />
      );
    case "stats":
      return (
        <StatsInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />
      );
    case "quote":
      return (
        <QuoteInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />
      );
    case "logo-grid":
      return (
        <LogoGridInlineEditor
          section={section}
          onPatch={(p) => onPatch(p as Partial<PrintSection>)}
        />
      );
    case "expertise":
      return (
        <ExpertiseInlineEditor
          section={section}
          onPatch={(p) => onPatch(p as Partial<PrintSection>)}
        />
      );
    case "feature-list":
      return (
        <FeatureListInlineEditor
          section={section}
          onPatch={(p) => onPatch(p as Partial<PrintSection>)}
        />
      );
    case "narrative":
      return (
        <NarrativeInlineEditor
          section={section}
          onPatch={(p) => onPatch(p as Partial<PrintSection>)}
        />
      );
    case "table":
      return (
        <TableInlineEditor section={section} onPatch={(p) => onPatch(p as Partial<PrintSection>)} />
      );
    case "contact":
      return (
        <ContactInlineEditor
          section={section}
          onPatch={(p) => onPatch(p as Partial<PrintSection>)}
        />
      );
    default:
      return null;
  }
}

function StatsInlineEditor({
  section,
  onPatch,
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
        <select
          aria-label="Variant"
          className={inspectorInput}
          value={section.variantId}
          onChange={(e) => onPatch({ variantId: e.target.value as PrintStatsVariant })}
        >
          {PRINT_STATS_VARIANTS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </LabeledField>
      <div className="grid grid-cols-2 gap-2">
        <LabeledField label="Eyebrow">
          <input
            className={inspectorInput}
            placeholder="e.g. Impact at a glance"
            value={section.eyebrow ?? ""}
            onChange={(e) => onPatch({ eyebrow: e.target.value })}
          />
        </LabeledField>
        <LabeledField label="Title">
          <input
            className={inspectorInput}
            placeholder="e.g. By the numbers"
            value={section.title ?? ""}
            onChange={(e) => onPatch({ title: e.target.value })}
          />
        </LabeledField>
      </div>
      <div className="pt-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/55 dark:text-white/55">
            Stat items
          </span>
          <span className="text-[10px] text-black/40 dark:text-white/40">
            {section.items.length} · label / value / unit
          </span>
        </div>
        <ArrayEditor
          items={section.items}
          onChange={(items) => onPatch({ items })}
          add={() => ({ label: "", value: "", unit: "" }) as PrintStatsSection["items"][number]}
          row={(it, idx) => (
            <div className="space-y-1">
              <input
                className={inspectorInput}
                placeholder="Label (what it measures)"
                value={it.label}
                onChange={(e) => patchItem(idx, { label: e.target.value })}
              />
              <div className="grid grid-cols-[1fr_1fr] gap-1">
                <input
                  className={inspectorInput}
                  placeholder="Value (e.g. 48)"
                  value={it.value}
                  onChange={(e) => patchItem(idx, { value: e.target.value })}
                />
                <input
                  className={inspectorInput}
                  placeholder="Unit (e.g. hr, %, M)"
                  value={it.unit ?? ""}
                  onChange={(e) => patchItem(idx, { unit: e.target.value })}
                />
              </div>
            </div>
          )}
        />
      </div>
    </>
  );
}

function HeroInlineEditor({
  section,
  onPatch,
}: {
  section: PrintHeroSection;
  onPatch: (p: Partial<PrintHeroSection>) => void;
}) {
  const meta = section.meta ?? [];
  const stats = section.stats ?? [];
  const patchMeta = (i: number, p: Partial<PrintHeroMetaRow>) =>
    onPatch({ meta: meta.map((r, k) => (k === i ? { ...r, ...p } : r)) });
  const showPhoto =
    section.variantId === "hero-photo-band" || section.variantId === "hero-split-photo";
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintHeroModuleVariant })}
      >
        {PRINT_HERO_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-1">
        <input
          className={inspectorInput}
          placeholder="Eyebrow"
          value={section.eyebrow ?? ""}
          onChange={(e) => onPatch({ eyebrow: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="Kicker (client / product)"
          value={section.kicker ?? ""}
          onChange={(e) => onPatch({ kicker: e.target.value })}
        />
      </div>
      <textarea
        className={inspectorInput}
        placeholder="Hero title"
        rows={2}
        value={section.title}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <textarea
        className={inspectorInput}
        placeholder="Summary"
        rows={3}
        value={section.summary ?? ""}
        onChange={(e) => onPatch({ summary: e.target.value })}
      />
      {showPhoto && (
        <>
          <input
            className={inspectorInput}
            placeholder="Hero image URL"
            value={section.imageUrl ?? ""}
            onChange={(e) => onPatch({ imageUrl: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-1">
            <label className="text-[10px] text-black/55 dark:text-white/55">
              Focal X
              <input
                type="range"
                aria-label="Hero focal X"
                min={0}
                max={100}
                value={section.focalX ?? 50}
                onChange={(e) => onPatch({ focalX: Number(e.target.value) })}
                className="w-full accent-[#003FC7]"
              />
            </label>
            <label className="text-[10px] text-black/55 dark:text-white/55">
              Focal Y
              <input
                type="range"
                aria-label="Hero focal Y"
                min={0}
                max={100}
                value={section.focalY ?? 50}
                onChange={(e) => onPatch({ focalY: Number(e.target.value) })}
                className="w-full accent-[#003FC7]"
              />
            </label>
          </div>
        </>
      )}
      <div className="flex items-center gap-3 text-[10px] text-black/60 dark:text-white/60">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={section.align === "center"}
            onChange={(e) => onPatch({ align: e.target.checked ? "center" : "left" })}
          />
          Centered
        </label>
        {section.variantId === "hero-split-photo" && (
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={!!section.reverse}
              onChange={(e) => onPatch({ reverse: e.target.checked })}
            />
            Photo right
          </label>
        )}
      </div>
      {section.variantId === "hero-stat-lockup" ? (
        <>
          {stats.map((st, i) => (
            <div key={i} className="grid grid-cols-[1fr_54px_40px] gap-1">
              <input
                className={inspectorInput}
                placeholder="Stat label"
                value={st.label}
                onChange={(e) =>
                  onPatch({
                    stats: stats.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)),
                  })
                }
              />
              <input
                className={inspectorInput}
                placeholder="Value"
                value={st.value}
                onChange={(e) =>
                  onPatch({
                    stats: stats.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)),
                  })
                }
              />
              <input
                className={inspectorInput}
                placeholder="Unit"
                value={st.unit ?? ""}
                onChange={(e) =>
                  onPatch({
                    stats: stats.map((x, k) => (k === i ? { ...x, unit: e.target.value } : x)),
                  })
                }
              />
            </div>
          ))}
          {stats.length < 4 && (
            <button
              type="button"
              className="text-[11px] font-medium text-[#003FC7] hover:underline"
              onClick={() => onPatch({ stats: [...stats, { label: "New metric", value: "0" }] })}
            >
              + Add stat
            </button>
          )}
        </>
      ) : (
        <>
          {meta.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-1">
              <input
                className={inspectorInput}
                placeholder="Meta label"
                value={r.label}
                onChange={(e) => patchMeta(i, { label: e.target.value })}
              />
              <input
                className={inspectorInput}
                placeholder="Meta value"
                value={r.value ?? ""}
                onChange={(e) => patchMeta(i, { value: e.target.value })}
              />
            </div>
          ))}
          {meta.length < 4 && (
            <button
              type="button"
              className="text-[11px] font-medium text-[#003FC7] hover:underline"
              onClick={() => onPatch({ meta: [...meta, { label: "Label", value: "Value" }] })}
            >
              + Add meta row
            </button>
          )}
        </>
      )}
      <HeroRuleTypeControls section={section} onPatch={onPatch} />
    </>
  );
}

function QuoteInlineEditor({
  section,
  onPatch,
}: {
  section: PrintQuoteSection;
  onPatch: (p: Partial<PrintQuoteSection>) => void;
}) {
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintQuoteVariant })}
      >
        {PRINT_QUOTE_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        className={inspectorInput}
        placeholder="Eyebrow"
        value={section.eyebrow ?? ""}
        onChange={(e) => onPatch({ eyebrow: e.target.value })}
      />
      <textarea
        className={inspectorInput}
        placeholder="Quote text"
        rows={3}
        value={section.text}
        onChange={(e) => onPatch({ text: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-1">
        <input
          className={inspectorInput}
          placeholder="Author"
          value={section.author ?? ""}
          onChange={(e) => onPatch({ author: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="Role"
          value={section.role ?? ""}
          onChange={(e) => onPatch({ role: e.target.value })}
        />
      </div>
      <input
        className={inspectorInput}
        placeholder="Company"
        value={section.company ?? ""}
        onChange={(e) => onPatch({ company: e.target.value })}
      />
    </>
  );
}

function LogoGridInlineEditor({
  section,
  onPatch,
}: {
  section: PrintLogoGridSection;
  onPatch: (p: Partial<PrintLogoGridSection>) => void;
}) {
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintLogoGridVariant })}
      >
        {PRINT_LOGO_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        className={inspectorInput}
        placeholder="Eyebrow"
        value={section.eyebrow ?? ""}
        onChange={(e) => onPatch({ eyebrow: e.target.value })}
      />
      <input
        className={inspectorInput}
        placeholder="Title"
        value={section.title ?? ""}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <ArrayEditor
        items={section.items}
        onChange={(items) => onPatch({ items })}
        add={() => ({ name: "Client", url: "", path: "" })}
        row={(it, idx) => (
          <LogoGridItemRow
            item={it}
            onChange={(next) =>
              onPatch({
                items: section.items.map((x, k) => (k === idx ? { ...x, ...next } : x)),
              })
            }
          />
        )}
      />
    </>
  );
}

/**
 * One logo-grid row: free-text URL/path plus a Logo Hub picker so client marks
 * can be pulled from the shared repository instead of hand-pasted.
 */
function LogoGridItemRow({
  item,
  onChange,
}: {
  item: { name: string; url?: string; path?: string };
  onChange: (next: { name?: string; url?: string; path?: string }) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-1">
        <input
          className={inspectorInput}
          placeholder="Name"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="Logo URL or /path"
          value={item.url ?? item.path ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            const isPath = v.startsWith("/");
            onChange({ url: isPath ? undefined : v, path: isPath ? v : undefined });
          }}
        />
        <ClientLogoHubTrigger onClick={() => setPicking((v) => !v)} />
      </div>
      <ClientLogoHubPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(logo) => onChange({ name: logo.name, url: logo.url, path: undefined })}
      />
    </div>
  );
}

function ExpertiseInlineEditor({
  section,
  onPatch,
}: {
  section: PrintExpertiseSection;
  onPatch: (p: Partial<PrintExpertiseSection>) => void;
}) {
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintExpertiseVariant })}
      >
        {PRINT_EXPERTISE_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        className={inspectorInput}
        placeholder="Eyebrow"
        value={section.eyebrow ?? ""}
        onChange={(e) => onPatch({ eyebrow: e.target.value })}
      />
      <input
        className={inspectorInput}
        placeholder="Title"
        value={section.title ?? ""}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <ArrayEditor
        items={section.items}
        onChange={(items) => onPatch({ items })}
        add={() => ({ label: "", icon: "" })}
        row={(it, idx) => (
          <div className="grid grid-cols-[1fr_90px] gap-1">
            <input
              className={inspectorInput}
              placeholder="Label"
              value={it.label}
              onChange={(e) =>
                onPatch({
                  items: section.items.map((x, k) =>
                    k === idx ? { ...x, label: e.target.value } : x,
                  ),
                })
              }
            />
            <PrintIconPicker
              value={it.icon}
              onChange={(icon) =>
                onPatch({ items: section.items.map((x, k) => (k === idx ? { ...x, icon } : x)) })
              }
            />
          </div>
        )}
      />
    </>
  );
}

function FeatureListInlineEditor({
  section,
  onPatch,
}: {
  section: PrintFeatureListSection;
  onPatch: (p: Partial<PrintFeatureListSection>) => void;
}) {
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintFeatureVariant })}
      >
        {PRINT_FEATURE_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        className={inspectorInput}
        placeholder="Eyebrow"
        value={section.eyebrow ?? ""}
        onChange={(e) => onPatch({ eyebrow: e.target.value })}
      />
      <input
        className={inspectorInput}
        placeholder="Title"
        value={section.title ?? ""}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <ArrayEditor
        items={section.items}
        onChange={(items) => onPatch({ items })}
        add={() => ({ verb: "", body: "", icon: "" })}
        row={(it, idx) => (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_90px] gap-1">
              <input
                className={inspectorInput}
                placeholder="Verb"
                value={it.verb}
                onChange={(e) =>
                  onPatch({
                    items: section.items.map((x, k) =>
                      k === idx ? { ...x, verb: e.target.value } : x,
                    ),
                  })
                }
              />
              <PrintIconPicker
                value={it.icon}
                onChange={(icon) =>
                  onPatch({ items: section.items.map((x, k) => (k === idx ? { ...x, icon } : x)) })
                }
              />
            </div>
            <input
              className={inspectorInput}
              placeholder="Body"
              value={it.body ?? ""}
              onChange={(e) =>
                onPatch({
                  items: section.items.map((x, k) =>
                    k === idx ? { ...x, body: e.target.value } : x,
                  ),
                })
              }
            />
          </div>
        )}
      />
    </>
  );
}

function NarrativeInlineEditor({
  section,
  onPatch,
}: {
  section: PrintNarrativeSection;
  onPatch: (p: Partial<PrintNarrativeSection>) => void;
}) {
  const patchItem = (idx: number, p: Partial<PrintNarrativeSection["items"][number]>) =>
    onPatch({ items: section.items.map((x, k) => (k === idx ? { ...x, ...p } : x)) });
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintNarrativeVariant })}
      >
        {PRINT_NARRATIVE_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        className={inspectorInput}
        placeholder="Eyebrow"
        value={section.eyebrow ?? ""}
        onChange={(e) => onPatch({ eyebrow: e.target.value })}
      />
      <input
        className={inspectorInput}
        placeholder="Title"
        value={section.title ?? ""}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <ArrayEditor
        items={section.items}
        onChange={(items) => onPatch({ items })}
        add={() => ({ heading: "", body: "", bullets: [] })}
        row={(it, idx) => (
          <div className="space-y-1">
            <input
              className={inspectorInput}
              placeholder="Heading"
              value={it.heading}
              onChange={(e) => patchItem(idx, { heading: e.target.value })}
            />
            <textarea
              className={inspectorInput}
              rows={3}
              placeholder="Body"
              value={it.body ?? ""}
              onChange={(e) => patchItem(idx, { body: e.target.value })}
            />
            <input
              className={inspectorInput}
              placeholder="Bullets (comma separated)"
              value={(it.bullets ?? []).join(", ")}
              onChange={(e) =>
                patchItem(idx, {
                  bullets: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        )}
      />
    </>
  );
}

function TableInlineEditor({
  section,
  onPatch,
}: {
  section: PrintTableSection;
  onPatch: (p: Partial<PrintTableSection>) => void;
}) {
  const patchRow = (idx: number, p: Partial<PrintTableSection["rows"][number]>) =>
    onPatch({ rows: section.rows.map((x, k) => (k === idx ? { ...x, ...p } : x)) });
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintTableVariant })}
      >
        {PRINT_TABLE_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        className={inspectorInput}
        placeholder="Eyebrow"
        value={section.eyebrow ?? ""}
        onChange={(e) => onPatch({ eyebrow: e.target.value })}
      />
      <input
        className={inspectorInput}
        placeholder="Title"
        value={section.title ?? ""}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <ArrayEditor
        items={section.rows}
        onChange={(rows) => onPatch({ rows })}
        add={() => ({ label: "", value: "" })}
        row={(r, idx) => (
          <div className="grid grid-cols-[1fr_110px] gap-1">
            <input
              className={inspectorInput}
              placeholder="Label"
              value={r.label}
              onChange={(e) => patchRow(idx, { label: e.target.value })}
            />
            <input
              className={inspectorInput}
              placeholder="Value"
              value={r.value ?? ""}
              onChange={(e) => patchRow(idx, { value: e.target.value })}
            />
          </div>
        )}
      />
    </>
  );
}

function ContactInlineEditor({
  section,
  onPatch,
}: {
  section: PrintContactSection;
  onPatch: (p: Partial<PrintContactSection>) => void;
}) {
  const rows = section.rows ?? [];
  return (
    <>
      <select
        aria-label="Variant"
        className={inspectorInput}
        value={section.variantId}
        onChange={(e) => onPatch({ variantId: e.target.value as PrintContactVariant })}
      >
        {PRINT_CONTACT_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <input
        className={inspectorInput}
        placeholder="Eyebrow"
        value={section.eyebrow ?? ""}
        onChange={(e) => onPatch({ eyebrow: e.target.value })}
      />
      <input
        className={inspectorInput}
        placeholder="Title / headline"
        value={section.title ?? ""}
        onChange={(e) => onPatch({ title: e.target.value })}
      />
      <textarea
        className={inspectorInput}
        rows={2}
        placeholder="Supporting line"
        value={section.body ?? ""}
        onChange={(e) => onPatch({ body: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-1">
        <input
          className={inspectorInput}
          placeholder="Name"
          value={section.name ?? ""}
          onChange={(e) => onPatch({ name: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="Role"
          value={section.role ?? ""}
          onChange={(e) => onPatch({ role: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="Email"
          value={section.email ?? ""}
          onChange={(e) => onPatch({ email: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="Phone"
          value={section.phone ?? ""}
          onChange={(e) => onPatch({ phone: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="URL"
          value={section.url ?? ""}
          onChange={(e) => onPatch({ url: e.target.value })}
        />
        <input
          className={inspectorInput}
          placeholder="Button label"
          value={section.ctaLabel ?? ""}
          onChange={(e) => onPatch({ ctaLabel: e.target.value })}
        />
      </div>
      {section.variantId === "contact-global-panel" && (
        <ArrayEditor
          items={rows}
          onChange={(next) => onPatch({ rows: next })}
          add={() => ({ label: "", value: "" })}
          row={(r, idx) => (
            <div className="grid grid-cols-[1fr_120px] gap-1">
              <input
                className={inspectorInput}
                placeholder="Region"
                value={r.label}
                onChange={(e) =>
                  onPatch({
                    rows: rows.map((x, k) => (k === idx ? { ...x, label: e.target.value } : x)),
                  })
                }
              />
              <input
                className={inspectorInput}
                placeholder="Contact"
                value={r.value ?? ""}
                onChange={(e) =>
                  onPatch({
                    rows: rows.map((x, k) => (k === idx ? { ...x, value: e.target.value } : x)),
                  })
                }
              />
            </div>
          )}
        />
      )}
    </>
  );
}

function ArrayEditor<T>({
  items,
  onChange,
  add,
  row,
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
        <div
          key={idx}
          className="rounded border border-black/5 bg-black/[0.02] p-1.5 dark:border-white/10 dark:bg-white/5"
        >
          {row(it, idx)}
          <div className="mt-1 flex items-center justify-end gap-1">
            <button
              type="button"
              className="rounded p-0.5 text-icon-subtle hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => move(idx, -1)}
              aria-label="Move up"
            >
              <ArrowUp size={12} />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-icon-subtle hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => move(idx, 1)}
              aria-label="Move down"
            >
              <ArrowDown size={12} />
            </button>
            <button
              type="button"
              className="rounded p-0.5 text-red-500 hover:bg-red-500/10"
              onClick={() => remove(idx)}
              aria-label="Remove"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, add()])}
        className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-black/20 py-1 text-[10px] font-semibold uppercase tracking-widest text-black/60 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/20 dark:text-white/60"
      >
        <Plus size={12} /> Add item
      </button>
    </div>
  );
}
