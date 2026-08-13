import { StatStylePicker } from "@/components/slide/StatStylePicker";
import {
  parseStatLayout,
  resolveStatLayout,
  statLayoutForVariant,
  statShapePreset,
  type StatLayout,
} from "@/lib/stat-layouts";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, useCallback, useId } from "react";
import { toast } from "sonner";
import { SlideRefitButton, useSlideRefit } from "@/components/SlideRefitButton";
import { DEFAULT_SLIDE_SKIN, SLIDE_SKIN_OPTIONS } from "@/lib/slide-skin";
import { FunnelStylePanel } from "@/components/slide/FunnelStylePanel";
import { SlideRefinePrompt } from "@/components/slide/SlideRefinePrompt";

import { useImageDrop } from "@/hooks/use-image-drop";
import { useSessionUser } from "@/hooks/use-session-user";
import { useAiSlidePopulate } from "@/hooks/use-ai-slide-populate";
import { UploadProgress } from "@/components/slide/UploadProgress";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { BriefOutputsBar } from "@/components/BriefOutputsBar";
import { CopilotPanel } from "@/components/CopilotPanel";
import { IconPicker } from "@/components/IconPicker";
import { SaveToCloudButton, AutosaveIndicator } from "@/components/CloudDeckControls";
import { ShareMenu } from "@/components/ShareMenu";
import { VersionHistoryButton } from "@/components/VersionHistoryDrawer";
import { DuplicateDeckButton, TemplateToggleButton } from "@/components/DeckActions";
import { TranslateButton } from "@/components/TranslateDrawer";
import { LanguageSwitcher, type LocaleOverlay } from "@/components/LanguageSwitcher";
import { listSlideTranslationStatus } from "@/lib/translation.functions";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";
import { RebrandMenu } from "@/components/RebrandMenu";
import { BrandReviewPanel } from "@/components/BrandReviewPanel";
import { ArtDirectorPanel } from "@/components/ArtDirectorPanel";
import { CommentsPanel } from "@/components/CommentsPanel";
import { ReviewStatusControl } from "@/components/ReviewStatusControl";
import { ChevronDown, MessageSquare, RectangleHorizontal, Rows2 } from "lucide-react";
import { UndoRedoControls } from "@/components/UndoRedoControls";
import { BulkSlideActions } from "@/components/BulkSlideActions";
import { SwapLayoutButton } from "@/components/SwapLayoutPicker";
import {
  useDeckStore,
  DEFAULT_SLIDE_TRANSITION,
  resolveSlideTransition,
  type DeckClientLogo,
  type DeckSlide,
  type SlideTransition,
  type SlideSwapSource,
  type TransitionType,
} from "@/lib/deck-store";
import { SlideSwapLogPanel } from "@/components/SlideSwapLogPanel";
import { TextFormatInspector } from "@/components/TextFormatInspector";

import { useAuditActor } from "@/hooks/use-audit-actor";
import { useDeckHydrated, DeckHydratingFallback } from "@/hooks/use-deck-hydrated";
import { useUnsavedDeckGuard } from "@/hooks/use-unsaved-deck-guard";
import { VIDEO_SLIDE_EXAMPLES } from "@/lib/video-slide-examples";
import { listClientLogos, type ClientLogoRow } from "@/lib/client-logos.functions";
import { useClientLogos, useResolvedClientLogo } from "@/hooks/use-client-logos";

import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { PinEditorPanel } from "@/components/slide/PinEditorPanel";
import { WorldStatsMetricsPanel } from "@/components/slide/WorldStatsMetricsPanel";

import { CanvasBlockLayer } from "@/components/slide/CanvasBlockLayer";
import { FreeCanvasEditor } from "@/components/slide/FreeCanvasEditor";
import { SaveModuleDialog } from "@/components/SaveModuleDialog";
import { BackgroundImageryPanel } from "@/components/slide/BackgroundImageryPanel";
import { PptxPreviewModal } from "@/components/slide/PptxPreviewModal";
import { SlideImageryPanel } from "@/components/slide/SlideImageryPanel";
import { SlideVideoPanel } from "@/components/slide/SlideVideoPanel";
import { SlideMediaPanel } from "@/components/slide/SlideMediaPanel";
import { variantSupportsImagery, variantSupportsVideo } from "@/lib/variant-media";
import {
  SlideMediaRefreshProvider,
  SlideThumbnailContext,
  SlideVideoPreviewContext,
} from "@/lib/slide-media-refresh";
import { AddSlideGallery } from "@/components/slide/AddSlideGallery";
import { resolveDivisionBrief } from "@/lib/library-preview";
import { runQa, blockingIssues, warningIssues, expandPath, readPath } from "@/lib/qa";

import {
  BRAND_MODES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  LAYOUT_FRAMEWORKS,
  byId,
  variantsForSection,
  relatedVariants,
} from "@/lib/taxonomy";
import { resolveBrandMode } from "@/lib/brand-profiles";

export const Route = createFileRoute("/decks/$deckId/")({
  head: ({ params }) => ({
    meta: [{ title: `Deck ${params.deckId} · TransPerfect Modular` }],
  }),
  component: DeckEditorGate,
});

function DeckEditorGate() {
  const { deckId } = Route.useParams();
  const hydrated = useDeckHydrated();
  const hasDeck = useDeckStore((s) => Boolean(s.decks[deckId]));
  if (!hydrated) return <DeckHydratingFallback label="Loading deck…" />;
  if (!hasDeck) throw notFound();
  return <DeckEditor />;
}

function DeckEditor() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const updateField = useDeckStore((s) => s.updateSlideField);
  const swapVariant = useDeckStore((s) => s.swapVariant);
  const clearSlideSwapLog = useDeckStore((s) => s.clearSlideSwapLog);
  // Register the signed-in user so swap audit entries record who made them.
  useAuditActor();
  const moveSlide = useDeckStore((s) => s.moveSlide);
  const removeSlide = useDeckStore((s) => s.removeSlide);
  const reorderSlides = useDeckStore((s) => s.reorderSlides);
  const moveSlidesToIndex = useDeckStore((s) => s.moveSlidesToIndex);

  // Warn before leaving the editor with unsaved changes (incl. slide reorder).
  const hasUnsavedChanges = useUnsavedDeckGuard(deckId);

  // Drag-and-drop reordering of the overview thumbnail strip.
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  // Ids being dragged — one slide, or the whole multi-selection as a block.
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const insertExampleSlide = useDeckStore((s) => s.insertExampleSlide);
  const duplicateSlide = useDeckStore((s) => s.duplicateSlide);
  const setSlidesHidden = useDeckStore((s) => s.setSlidesHidden);
  const revertAiChange = useDeckStore((s) => s.revertAiChange);
  const updateSlideNotes = useDeckStore((s) => s.updateSlideNotes);
  const setSlideLogo = useDeckStore((s) => s.setSlideLogo);
  const setDeckClientLogo = useDeckStore((s) => s.setDeckClientLogo);
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  const applySlideBackground = useDeckStore((s) => s.applySlideBackground);
  const setSlideMode = useDeckStore((s) => s.setSlideMode);
  const setDeckSkin = useDeckStore((s) => s.setDeckSkin);
  const setSlideInkOverride = useDeckStore((s) => s.setSlideInkOverride);
  const setSlideInkScopeColor = useDeckStore((s) => s.setSlideInkScopeColor);
  const clearSlideInkOverrides = useDeckStore((s) => s.clearSlideInkOverrides);
  const setSlideTransition = useDeckStore((s) => s.setSlideTransition);
  const setDeckDefaultTransition = useDeckStore((s) => s.setDeckDefaultTransition);
  const { refit: refitSlide } = useSlideRefit(deckId);
  // A manual layout swap only carries over keys the two modules share, so offer
  // an AI re-fit that re-authors the slide's own copy *and* its speaker notes
  // into the new field structure.
  const swapVariantWithRefit = useCallback(
    (slideId: string, variantId: string, source: SlideSwapSource = "inspector") => {
      const before = useDeckStore.getState().decks[deckId]?.slides.find((sl) => sl.id === slideId)
        ?.content;
      swapVariant(deckId, slideId, variantId, source);
      toast("Layout swapped", {
        description: "Let AI re-fit the copy and speaker notes into the new layout?",
        action: {
          label: "Refit with AI",
          onClick: () => void refitSlide(slideId, before),
        },
        cancel: {
          label: "Undo",
          onClick: () => {
            useDeckStore.getState().undo();
          },
        },
      });
    },
    [deckId, refitSlide, swapVariant],
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  /**
   * Unified slide editor ("Studio"). Live text editing and the free canvas used
   * to be mutually exclusive toggles, which meant leaving one mode to do the
   * other on the same slide. They are now one surface with two tools:
   *   text    → click the module's own copy and retype it in place
   *   objects → drag / resize / adopt / layer canvas blocks
   * Canvas blocks stay visible (and adopted sections stay hidden) in both.
   */
  const [studio, setStudio] = useState(false);
  const [studioTool, setStudioTool] = useState<"text" | "objects">("text");
  const liveEdit = studio && studioTool === "text";
  const updateCanvasBlocks = useDeckStore((s) => s.updateSlideCanvasBlocks);
  const undoDeck = useDeckStore((s) => s.undo);
  const redoDeck = useDeckStore((s) => s.redo);
  // Live history state so the canvas toolbar can label + disable its buttons.
  const pastLen = useDeckStore((s) => (s._past ?? []).length);
  const futureLen = useDeckStore((s) => (s._future ?? []).length);
  const docUndoLabel = useDeckStore((s) => (s._past ?? [])[(s._past ?? []).length - 1]?.label ?? null);
  const docRedoLabel = useDeckStore(
    (s) => (s._future ?? [])[(s._future ?? []).length - 1]?.label ?? null,
  );
  /**
   * View-level steps (enlarge / collapse the editing stage) join the same undo
   * chain as document edits. They carry the document history depth at which they
   * happened, so a view step is only undone while it is still the most recent
   * action — once the user edits blocks, undo goes to the document first.
   */
  type ViewStep = { label: string; depth: number; undo: () => void; redo: () => void };
  const viewPast = useRef<ViewStep[]>([]);
  const viewFuture = useRef<ViewStep[]>([]);
  const [viewVersion, setViewVersion] = useState(0);
  const docDepth = () => (useDeckStore.getState()._past ?? []).length;
  const pushViewStep = useCallback((label: string, undo: () => void, redo: () => void) => {
    viewPast.current = [...viewPast.current.slice(-20), { label, depth: docDepth(), undo, redo }];
    viewFuture.current = [];
    setViewVersion((v) => v + 1);
  }, []);
  const topViewUndo = viewPast.current[viewPast.current.length - 1];
  const topViewRedo = viewFuture.current[viewFuture.current.length - 1];
  const viewUndoActive = Boolean(topViewUndo && topViewUndo.depth === pastLen);
  const handleUndo = useCallback(() => {
    const top = viewPast.current[viewPast.current.length - 1];
    if (top && top.depth === docDepth()) {
      viewPast.current = viewPast.current.slice(0, -1);
      viewFuture.current = [...viewFuture.current, top];
      top.undo();
      setViewVersion((v) => v + 1);
      return;
    }
    undoDeck();
  }, [undoDeck]);
  const handleRedo = useCallback(() => {
    // Document redos always come first: they were undone most recently.
    if ((useDeckStore.getState()._future ?? []).length) {
      redoDeck();
      return;
    }
    const top = viewFuture.current[viewFuture.current.length - 1];
    if (!top) return;
    viewFuture.current = viewFuture.current.slice(0, -1);
    viewPast.current = [...viewPast.current, { ...top, depth: docDepth() }];
    top.redo();
    setViewVersion((v) => v + 1);
  }, [redoDeck]);
  /** Enlarge / collapse through the undo chain rather than as a raw setState. */
  const setZoomedTracked = useCallback(
    (next: boolean) => {
      if (next === zoomed) return;
      setZoomed(next);
      pushViewStep(
        next ? "Enlarge to edit" : "Exit full size",
        () => setZoomed(!next),
        () => setZoomed(next),
      );
    },
    [pushViewStep, zoomed],
  );
  const canUndoAll = pastLen > 0 || viewUndoActive;
  const canRedoAll = futureLen > 0 || Boolean(topViewRedo);
  const undoLabelAll = viewUndoActive ? (topViewUndo?.label ?? null) : docUndoLabel;
  const redoLabelAll = futureLen > 0 ? docRedoLabel : (topViewRedo?.label ?? null);
  void viewVersion;
  const [saveModuleOpen, setSaveModuleOpen] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [flashIndices, setFlashIndices] = useState<number[]>([]);
  const [pptxPreviewOpen, setPptxPreviewOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  // Multi-select in the slide rail (PowerPoint-style: click a checkbox to
  // toggle, shift-click a thumbnail to extend the range).
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  const [lastPickedIdx, setLastPickedIdx] = useState<number | null>(null);
  const bulkBarRef = useRef<HTMLDivElement | null>(null);
  const hadSelectionRef = useRef(false);
  // Focus management: when a multi-selection first appears, move focus to the
  // bulk actions toolbar so keyboard/screen-reader users land on the actions
  // they just unlocked. Escape clears the selection and returns focus to the
  // last touched thumbnail.
  useEffect(() => {
    const has = selectedSlideIds.length > 0;
    if (has && !hadSelectionRef.current) bulkBarRef.current?.focus();
    hadSelectionRef.current = has;
  }, [selectedSlideIds.length]);
  /** Move DOM focus onto a thumbnail (the rail's single roving tab stop). */
  const focusThumb = useCallback((idx: number) => {
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-slide-thumb="${idx}"] [data-thumb-open]`)
        ?.focus();
    });
  }, []);
  const clearSelection = useCallback(
    (restoreFocus = false) => {
      const idx = lastPickedIdx;
      setSelectedSlideIds([]);
      setLastPickedIdx(null);
      if (restoreFocus) focusThumb(idx ?? activeIdx);
    },
    [lastPickedIdx, focusThumb, activeIdx],
  );


  // AI autofill for newly inserted slides — swaps placeholder copy for
  // real division-specific content right after insert.
  const sessionUserId = useSessionUser();
  const [autofillNewSlides, setAutofillNewSlides] = useState(true);
  const aiPopulate = useAiSlidePopulate(deckId, autofillNewSlides && !!sessionUserId);


  // Drag & drop imagery straight onto the slide stage. The dropped file is
  // uploaded, applied to the active slide, and (opt-in) filed into the
  // deck's division imagery library. A ref keeps the target current without
  // moving hooks below the early returns.
  const dropTargetRef = useRef<{ slideId: string | null; supportsImagery: boolean }>({
    slideId: null,
    supportsImagery: false,
  });
  const stageDrop = useImageDrop({
    divisionId: deck?.brandModeId,
    onApply: ({ url, path }) => {
      const target = dropTargetRef.current;
      if (!target.slideId || !target.supportsImagery) {
        toast.error("This module has no image slot — pick an image-forward layout first.");
        return;
      }
      updateField(deckId, target.slideId, "mediaUrl", url);
      updateField(deckId, target.slideId, "mediaPath", path ?? undefined);
    },
  });

  const [commentCounts, setCommentCounts] = useState<Map<number | "deck", number>>(new Map());
  const totalOpen = useMemo(
    () => Array.from(commentCounts.values()).reduce((a, b) => a + b, 0),
    [commentCounts],
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<LocaleOverlay | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);
  const cloudDeckId = userId ? deckCloudId(userId, deckId) : null;
  // Apply translation overlay by slide position without mutating the deck store.
  const applyOverlay = <T extends { position: number; content: Record<string, unknown> }>(
    slide: T,
  ): T => {
    if (!overlay) return slide;
    const t = overlay.byPosition.get(slide.position);
    return t ? { ...slide, content: t } : slide;
  };

  // Per-slide translation status badges — indexed by slide index (deck order).
  const listSlideStatus = useServerFn(listSlideTranslationStatus);
  const slideStatusQuery = useQuery({
    queryKey: ["slide-translation-status", cloudDeckId],
    queryFn: () =>
      cloudDeckId ? listSlideStatus({ data: { deckId: cloudDeckId } }) : Promise.resolve([]),
    enabled: !!cloudDeckId,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
  const slideLangMap = useMemo(() => {
    const m = new Map<number, { ready: string[]; pending: string[] }>();
    for (const r of slideStatusQuery.data ?? []) {
      const entry = m.get(r.position) ?? { ready: [], pending: [] };
      if (r.status === "ready") entry.ready.push(r.target_lang);
      else entry.pending.push(r.target_lang);
      m.set(r.position, entry);
    }
    return m;
  }, [slideStatusQuery.data]);

  // ── Client logo ───────────────────────────────────────────────────────
  // Signed logo URLs expire after an hour, so never trust the copy persisted
  // on the deck: re-resolve it against the live repository every render, and
  // auto-populate from the brief's prospect name when nothing is set yet.
  const activeMode =
    deck?.slides[Math.min(activeIdx, Math.max(0, (deck?.slides.length ?? 1) - 1))]?.mode ?? "light";
  const resolvedClientLogo = useResolvedClientLogo(
    deck?.clientLogo
      ? { ...deck.clientLogo }
      : { clientName: brief?.prospect ?? deck?.title ?? null },
    activeMode === "dark" ? "dark" : "light",
  );
  const autoLogoRow = resolvedClientLogo.row;
  useEffect(() => {
    if (!deck || deck.clientLogo || !autoLogoRow) return;
    setDeckClientLogo(deck.id, {
      id: autoLogoRow.id,
      clientName: autoLogoRow.client_name,
      primaryUrl: autoLogoRow.primaryUrl,
      darkUrl: autoLogoRow.darkUrl,
      lightUrl: autoLogoRow.lightUrl,
      monoUrl: autoLogoRow.monoUrl,
    });
  }, [deck?.id, deck?.clientLogo, autoLogoRow, setDeckClientLogo]);

  if (!deck) throw notFound();
  const brand = resolveBrandMode(deck.brandModeId, deck.subCompany);
  const clamped = Math.min(activeIdx, deck.slides.length - 1);
  const active = deck.slides[clamped];
  const sf = active ? byId(SECTION_FRAMEWORKS, active.sectionId) : undefined;
  const mv = active ? byId(MODULE_VARIANTS, active.variantId) : undefined;
  const lf = active ? byId(LAYOUT_FRAMEWORKS, active.layoutId) : undefined;
  dropTargetRef.current = {
    slideId: active?.id ?? null,
    supportsImagery: variantSupportsImagery(active?.variantId),
  };

  const qa = useMemo(() => runQa(deck.slides, deck.brandModeId), [deck.slides, deck.brandModeId]);
  const clientLogoUrl = resolvedClientLogo.url;
  const logoOrientation = deck.context?.logoOrientation ?? "horizontal";

  return (
    <AppShell>
      <SlideMediaRefreshProvider slides={deck.slides}>
        <header className="flex flex-col gap-5">
          <EditorPageHeader
            backTo="/"
            title={deck.title}
            meta={
              <>
                <span>{deck.slides.length} slides</span>
                <MetaDot />
                <span>{brand.name}</span>
                {qa.length > 0 && (
                  <>
                    <MetaDot />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                      {qa.length} QA {qa.length === 1 ? "issue" : "issues"}
                    </span>
                  </>
                )}
              </>
            }
            status={
              <div className="flex items-center gap-3 text-[11px] text-black/50">
                <AutosaveIndicator deckId={deckId} />
                <ReviewStatusControl localDeckId={deckId} />
              </div>
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <AuthoringNav deckId={deckId} active="edit" />
            <BriefOutputsBar
              deckId={deckId}
              deckTitle={deck.title}
              masterSet={deck.context?.masterSet}
              active={{ kind: "deck" }}
            />
          </div>

          <EditorToolbar
            slideLabel={active ? `Slide ${String(clamped + 1).padStart(2, "0")}` : undefined}
            deckRow={
              <>
            <EditorMenu label="History">
              <UndoRedoControls />
            </EditorMenu>

            <EditorMenu label="Deck" badge={totalOpen > 0 ? String(totalOpen) : undefined}>

              <EditorMenuRow
                label="Comments"
                hint={totalOpen > 0 ? `${totalOpen} open` : "No open comments"}
              >
                <button
                  type="button"
                  onClick={() => setCommentsOpen((v) => !v)}
                  aria-label="Comments"
                  className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                    commentsOpen
                      ? "bg-primary text-primary-foreground"
                      : "text-black/60 hover:bg-black/[0.04] hover:text-primary"
                  }`}
                >
                  <MessageSquare size={16} />
                  {totalOpen > 0 && (
                    <span
                      className={`absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold ${commentsOpen ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}
                    >
                      {totalOpen}
                    </span>
                  )}
                </button>
              </EditorMenuRow>
              <EditorMenuRow label="Duplicate deck" hint="Create an editable copy">
                <DuplicateDeckButton deckId={deckId} />
              </EditorMenuRow>
              <EditorMenuRow label="Rebrand" hint="Switch division or sub-brand">
                <RebrandMenu deckId={deckId} />
              </EditorMenuRow>
              <EditorMenuRow
                label="Logo orientation"
                hint={logoOrientation === "stacked" ? "Stacked" : "Horizontal"}
              >
                <button
                  type="button"
                  onClick={() =>
                    setDeckContext(deckId, {
                      logoOrientation: logoOrientation === "horizontal" ? "stacked" : "horizontal",
                    })
                  }
                  aria-label="Toggle logo orientation"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.04] hover:text-primary"
                >
                  {logoOrientation === "stacked" ? (
                    <Rows2 size={16} />
                  ) : (
                    <RectangleHorizontal size={16} />
                  )}
                </button>
              </EditorMenuRow>
              <EditorMenuRow label="Mark as template" hint="Reuse this deck as a starting point">
                <TemplateToggleButton deckId={deckId} />
              </EditorMenuRow>
            </EditorMenu>

            <EditorMenu
              label="Look & feel"
              hint={
                (deck.context?.skin ?? DEFAULT_SLIDE_SKIN) === "enterprise-white"
                  ? "Enterprise White"
                  : "Flagship 2026"
              }
            >
              <div
                role="group"
                aria-label="Deck look and feel"
                className="inline-flex items-center rounded-full bg-black/[0.04] p-0.5 text-[11px] font-medium"
              >
                {SLIDE_SKIN_OPTIONS.map((opt) => {
                  const activeSkin = (deck.context?.skin ?? DEFAULT_SLIDE_SKIN) === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      title={opt.description}
                      aria-pressed={activeSkin}
                      onClick={() => {
                        setDeckSkin(deck.id, opt.id);
                        toast.success(`${opt.label} applied to all ${deck.slides.length} slides`);
                      }}
                      className={`rounded-full px-3 py-1 transition ${
                        activeSkin
                          ? "bg-white text-[#03002C] shadow-sm"
                          : "text-black/50 hover:text-black"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </EditorMenu>
              </>
            }
            deckRowEnd={
              <EditorMenu label="Distribute" hint={hasUnsavedChanges ? "Unsaved" : undefined}>
                {hasUnsavedChanges && (
                  <div className="mb-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                    Unsaved changes — save to cloud before leaving.
                  </div>
                )}
                <EditorMenuRow label="Save to cloud" hint="Store this version in the workspace">
                  <SaveToCloudButton deckId={deckId} />
                </EditorMenuRow>
                <EditorMenuRow label="Version history" hint="Browse and restore earlier saves">
                  <VersionHistoryButton deckId={deckId} />
                </EditorMenuRow>
                <EditorMenuRow label="Translate" hint="Generate localized copy">
                  <TranslateButton deckId={deckId} />
                </EditorMenuRow>
                <EditorMenuRow label="Language" hint="Preview the deck in another language">
                  <LanguageSwitcher cloudDeckId={cloudDeckId} onChange={setOverlay} />
                </EditorMenuRow>
                <EditorMenuRow label="Share" hint="Public link, export, hand-off">
                  <ShareMenu deckId={deckId} />
                </EditorMenuRow>
              </EditorMenu>
            }
            slideRow={
              active ? (
              <>


                <EditorMenu
                  label="Appearance"
                  hint={(active.mode ?? "light") === "dark" ? "Dark" : "Light"}
                >
                  <div
                    role="group"
                    aria-label="Slide appearance mode"
                    className="inline-flex items-center rounded-full bg-black/[0.04] p-0.5 text-[11px] font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => setSlideMode(deck.id, active.id, "light")}
                      aria-pressed={(active.mode ?? "light") === "light"}
                      className={`rounded-full px-3 py-1 transition ${
                        (active.mode ?? "light") === "light"
                          ? "bg-white text-[#03002C] shadow-sm"
                          : "text-black/50 hover:text-black"
                      }`}
                    >
                      ☀ Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlideMode(deck.id, active.id, "dark")}
                      aria-pressed={(active.mode ?? "light") === "dark"}
                      className={`rounded-full px-3 py-1 transition ${
                        (active.mode ?? "light") === "dark"
                          ? "bg-[#03002C] text-white shadow-sm"
                          : "text-black/50 hover:text-black"
                      }`}
                    >
                      ☾ Dark
                    </button>
                  </div>
                </EditorMenu>

                <EditorMenu
                  label="Motion"
                  hint={active.transition?.type ?? deck.context?.defaultTransition?.type ?? "fade"}
                >
                  <TransitionPicker
                    slide={active}
                    deckDefault={deck.context?.defaultTransition}
                    onSlideChange={(t) => setSlideTransition(deck.id, active.id, t)}
                    onDeckDefaultChange={(t) => setDeckDefaultTransition(deck.id, t)}
                  />
                </EditorMenu>

                <EditorMenu
                  label="Stats"
                  hint={statShapePreset(
                    resolveStatLayout(
                      active.variantId,
                      active.content as Record<string, unknown>,
                    ).shape,
                  ).label}
                >
                  <StatStylePicker
                    moduleLayout={statLayoutForVariant(active.variantId)}
                    value={
                      (parseStatLayout(
                        (active.content as Record<string, unknown>)?.statLayout,
                      ) ?? null) as Partial<StatLayout> | null
                    }
                    onChange={(patch) =>
                      updateField(deck.id, active.id, "statLayout", {
                        ...(parseStatLayout(
                          (active.content as Record<string, unknown>)?.statLayout,
                        ) ?? {}),
                        ...patch,
                      })
                    }
                    onReset={() => updateField(deck.id, active.id, "statLayout", undefined)}
                  />
                </EditorMenu>

                {Object.keys(active.inkOverrides ?? {}).length +
                  Object.keys(active.inkScopeOverrides ?? {}).length >
                  0 && (
                  <EditorMenu
                    label="Overrides"
                    badge={String(
                      Object.keys(active.inkOverrides ?? {}).length +
                        Object.keys(active.inkScopeOverrides ?? {}).length,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => clearSlideInkOverrides(deck.id, active.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium text-black/70 transition hover:border-red-500 hover:text-red-600"
                      title={`Clear ${Object.keys(active.inkOverrides ?? {}).length + Object.keys(active.inkScopeOverrides ?? {}).length} text color override(s) on this slide`}
                    >
                      ⟲ Reset colors
                    </button>
                  </EditorMenu>
                )}

                </>
              ) : undefined
            }
            slideRowEnd={
              active ? (
                <>

                  <button
                    type="button"
                    onClick={() => setStudio((v) => !v)}
                    aria-pressed={studio}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                      studio
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-black/10 bg-white text-black/70 hover:border-primary hover:text-primary"
                    }`}
                    title="Edit this slide directly: retype module copy and move objects on one canvas"
                  >
                    {studio ? "● Editing" : "✎ Edit slide"}
                  </button>
                  {studio && (
                    <div
                      className="inline-flex items-center rounded-full border border-black/10 bg-white p-0.5 text-[11px]"
                      role="group"
                      aria-label="Editing tool"
                    >
                      {(
                        [
                          ["text", "✎ Text"],
                          ["objects", "◇ Objects"],
                        ] as const
                      ).map(([t, label]) => (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={studioTool === t}
                          onClick={() => setStudioTool(t)}
                          className={`rounded-full px-2.5 py-1 font-medium transition ${
                            studioTool === t
                              ? "bg-[#03002C] text-white"
                              : "text-black/60 hover:text-black"
                          }`}
                          title={
                            t === "text"
                              ? "Click any text on the slide to retype it"
                              : "Move, resize, add and adopt objects"
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                  <Tip label="Enlarge preview">
                    <button
                      type="button"
                      onClick={() => setZoomedTracked(true)}
                      aria-label="Enlarge slide preview"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black/60 transition hover:border-primary hover:text-primary"
                    >
                      ⤢
                    </button>
                  </Tip>
                </>
              ) : undefined
            }
          />

        </header>

        <div
          className={`mt-8 grid gap-6 ${inspectorOpen ? "grid-cols-[260px_1fr_360px]" : "grid-cols-[260px_1fr_36px]"}`}
        >
          {/* Overview grid */}
          <div
            className="space-y-3"
            role="group"
            aria-label="Slide list and selection"
            aria-describedby="slide-rail-help"
            onKeyDown={(e) => {
              if (e.key === "Escape" && selectedSlideIds.length > 0) {
                e.preventDefault();
                clearSelection(true);
              }
            }}
          >
            <BulkSlideActions
              ref={bulkBarRef}
              deckId={deck.id}
              selectedIds={selectedSlideIds}
              onClear={() => clearSelection(true)}
            />
            <p id="slide-rail-help" className="sr-only">
              Slide list. One slide is in the tab order at a time: press Tab to
              reach the current slide, then Up and Down arrow keys, Home or End to
              move between slides. Press Enter or Space to open a slide. Use the
              select checkbox, or Shift plus click to extend the selection from the
              last selected slide, and Command or Control plus click to add a
              single slide. Press Escape to clear the selection and return to the
              current slide. Slides can be dragged to reorder; dragging any
              selected slide moves the whole selection as a block.
            </p>
            {/* Roving tab stop: only the current slide is tabbable, so Tab walks
                bulk bar → current slide → rest of the page without stepping
                through every thumbnail, and arrow keys never skip a slide. */}
            <div
              role="group"
              aria-label={`Slides (${deck.slides.length})`}
              className="space-y-3"

              onKeyDown={(e) => {
                const last = deck.slides.length - 1;
                const next =
                  e.key === "ArrowDown"
                    ? Math.min(last, clamped + 1)
                    : e.key === "ArrowUp"
                      ? Math.max(0, clamped - 1)
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? last
                          : null;
                if (next === null) return;
                e.preventDefault();
                setActiveIdx(next);
                focusThumb(next);
              }}
            >

            {deck.slides.map((slide, i) => {
              const variant = byId(MODULE_VARIANTS, slide.variantId);
              const hasIssue = qa.some((q) => q.slideId === slide.id);
              const isPicked = selectedSlideIds.includes(slide.id);
              const togglePick = (extend: boolean) => {
                setSelectedSlideIds((prev) => {
                  if (extend && lastPickedIdx !== null) {
                    const [a, b] = [Math.min(lastPickedIdx, i), Math.max(lastPickedIdx, i)];
                    const range = deck.slides.slice(a, b + 1).map((sl) => sl.id);
                    return Array.from(new Set([...prev, ...range]));
                  }
                  return prev.includes(slide.id)
                    ? prev.filter((id) => id !== slide.id)
                    : [...prev, slide.id];
                });
                setLastPickedIdx(i);
              };
              return (
                <div
                  key={slide.id}
                  data-slide-thumb={i}
                  draggable
                  onDragStart={(e) => {
                    // Dragging a selected slide moves the whole multi-selection
                    // as one block; dragging an unselected slide moves just it.
                    const group = isPicked ? selectedSlideIds : [slide.id];
                    setDragIds(group);
                    setDragIdx(i);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", group.join(","));
                  }}
                  onDragOver={(e) => {
                    if (dragIdx === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    // Drop above or below this thumbnail depending on which
                    // half the pointer is over.
                    const rect = e.currentTarget.getBoundingClientRect();
                    const after = e.clientY > rect.top + rect.height / 2;
                    const target = after ? i + 1 : i;
                    if (dragOverIdx !== target) setDragOverIdx(target);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const ids =
                      dragIds.length > 0
                        ? dragIds
                        : e.dataTransfer.getData("text/plain").split(",").filter(Boolean);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const target = e.clientY > rect.top + rect.height / 2 ? i + 1 : i;
                    setDragIdx(null);
                    setDragIds([]);
                    setDragOverIdx(null);
                    if (ids.length === 0) return;
                    moveSlidesToIndex(deck.id, ids, target);
                    const firstId = ids[0];
                    requestAnimationFrame(() => {
                      const next = useDeckStore
                        .getState()
                        .decks[deck.id]?.slides.findIndex((sl) => sl.id === firstId);
                      if (next !== undefined && next >= 0) setActiveIdx(next);
                    });
                  }}
                  onDragEnd={() => {
                    setDragIdx(null);
                    setDragIds([]);
                    setDragOverIdx(null);
                  }}
                  className={`group relative cursor-grab active:cursor-grabbing ${
                    dragIds.includes(slide.id) ? "opacity-40" : ""
                  } ${
                    dragIdx !== null && dragOverIdx === i
                      ? "before:absolute before:-top-1.5 before:left-0 before:right-0 before:h-1 before:rounded-full before:bg-[#003FC7]"
                      : ""
                  } ${
                    dragIdx !== null && dragOverIdx === i + 1
                      ? "after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-1 after:rounded-full after:bg-[#003FC7]"
                      : ""
                  }`}
                >
                  <label
                    className={`absolute left-1.5 top-1.5 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border bg-white/95 shadow-sm transition ${
                      isPicked
                        ? "border-[#003FC7] opacity-100"
                        : "border-black/20 opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                    }`}
                    title="Select slide (shift-click a thumbnail to extend)"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isPicked}
                      tabIndex={i === clamped ? 0 : -1}
                      aria-label={`Select slide ${i + 1} of ${deck.slides.length}${
                        byId(SECTION_FRAMEWORKS, slide.sectionId)?.name
                          ? `, ${byId(SECTION_FRAMEWORKS, slide.sectionId)?.name}`
                          : ""
                      }`}
                      aria-describedby="slide-rail-help"
                      onKeyDown={(e) => {
                        // Shift+Space extends the range from the keyboard, the
                        // same way Shift+click does with a mouse.
                        if (e.key === " " && e.shiftKey) {
                          e.preventDefault();
                          togglePick(true);
                        }
                      }}
                      onChange={(e) => togglePick((e.nativeEvent as MouseEvent).shiftKey === true)}
                      className="h-3 w-3 accent-[#003FC7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]/60"
                    />
                  </label>
                  <button
                    type="button"
                    data-thumb-open
                    tabIndex={i === clamped ? 0 : -1}
                    aria-current={i === clamped ? "true" : undefined}
                    aria-pressed={isPicked}
                    aria-label={`Slide ${i + 1} of ${deck.slides.length}${
                      byId(SECTION_FRAMEWORKS, slide.sectionId)?.name
                        ? `: ${byId(SECTION_FRAMEWORKS, slide.sectionId)?.name}`
                        : ""
                    }${slide.hidden ? " (hidden)" : ""}${isPicked ? " — selected" : ""}`}
                    aria-describedby="slide-rail-help"

                    onClick={(e) => {
                      if (e.shiftKey || e.metaKey || e.ctrlKey) {
                        togglePick(e.shiftKey);
                        return;
                      }
                      setActiveIdx(i);
                    }}
                    className={`block w-full overflow-hidden rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] focus-visible:ring-offset-2 ${
                      i === clamped
                        ? "border-[#0B2A4A] ring-2 ring-[#0B2A4A]/20"
                        : "border-black/10 hover:border-black/30"
                    } ${isPicked ? "ring-2 ring-[#003FC7]/40" : ""} ${slide.hidden ? "opacity-55" : ""} ${flashIndices.includes(i) ? "ring-4 ring-[#A1FBF9] animate-pulse" : ""}`}
                  >
                    <div className="aspect-[16/9] bg-white">
                      <SlideThumbnailContext.Provider value={true}>
                        <ScaledSlide>
                          {variant && (
                            <VariantRenderer
                              slide={applyOverlay(slide)}
                              variant={variant}
                              brand={brand}
                              pageNumber={i + 1}
                              clientName={brief?.prospect}
                              clientLogoUrl={clientLogoUrl}
                              subCompany={deck?.subCompany}
                              logoOrientation={logoOrientation}
                              mode={slide.mode ?? "light"}
                            />
                          )}
                        </ScaledSlide>
                      </SlideThumbnailContext.Provider>
                    </div>
                    <div className="border-t border-black/10 bg-white px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {String(i + 1).padStart(2, "0")} ·{" "}
                          {byId(SECTION_FRAMEWORKS, slide.sectionId)?.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {(commentCounts.get(i) ?? 0) > 0 && (
                            <span
                              title={`${commentCounts.get(i)} open comment${commentCounts.get(i) === 1 ? "" : "s"}`}
                              className="inline-flex items-center gap-0.5 rounded-full bg-[#003FC7]/10 px-1.5 text-[10px] font-medium text-[#003FC7]"
                            >
                              💬{commentCounts.get(i)}
                            </span>
                          )}
                          {slide.notes && slide.notes.trim() && (
                            <span title="Has speaker notes" className="text-[#0B2A4A]">
                              ✎
                            </span>
                          )}
                          {hasIssue && <span className="text-amber-600">●</span>}
                        </span>
                      </div>

                      <div className="text-black/50">{variant?.name}</div>
                      {(() => {
                        const st = slideLangMap.get(i);
                        if (!st || (st.ready.length === 0 && st.pending.length === 0)) return null;
                        return (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {st.ready.map((l) => (
                              <span
                                key={`r-${l}`}
                                title={`${l.toUpperCase()} · cached`}
                                className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-emerald-700"
                              >
                                {l}
                              </span>
                            ))}
                            {st.pending.map((l) => (
                              <span
                                key={`p-${l}`}
                                title={`${l.toUpperCase()} · pending`}
                                className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-amber-700"
                              >
                                {l}…
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </button>
                  {slide.hidden && (
                    <span
                      title="Hidden slide — skipped when presenting and on export"
                      className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white"
                    >
                      Hidden
                    </span>
                  )}
                  <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <IconBtn
                      title="Move up"
                      tabIndex={i === clamped ? 0 : -1}
                      onClick={() => moveSlide(deck.id, slide.id, -1)}
                    >
                      ▲
                    </IconBtn>
                    <IconBtn
                      title="Move down"
                      tabIndex={i === clamped ? 0 : -1}
                      onClick={() => moveSlide(deck.id, slide.id, 1)}
                    >
                      ▼
                    </IconBtn>
                    <IconBtn
                      title={slide.hidden ? "Unhide slide" : "Hide slide (skip when presenting)"}
                      tabIndex={i === clamped ? 0 : -1}
                      onClick={() => setSlidesHidden(deck.id, [slide.id], !slide.hidden)}
                    >
                      {slide.hidden ? "◌" : "◉"}
                    </IconBtn>
                    <IconBtn
                      title="Duplicate"
                      tabIndex={i === clamped ? 0 : -1}
                      onClick={() => duplicateSlide(deck.id, slide.id)}
                    >
                      ⎘
                    </IconBtn>
                    <IconBtn
                      title="Remove"
                      tabIndex={i === clamped ? 0 : -1}
                      onClick={() => {
                        if (confirm("Remove this slide?")) removeSlide(deck.id, slide.id);
                      }}
                    >
                      ✕
                    </IconBtn>
                  </div>
                </div>
              );
            })}
            </div>



            <AddSlideGallery
              brand={brand}
              brief={brief ?? resolveDivisionBrief(brand)}
              onInsert={(variantId, content) => {
                const res = insertExampleSlide(
                  deck.id,
                  variantId,
                  content as Record<string, unknown>,
                  active?.id,
                );
                if (res) {
                  setActiveIdx(clamped + 1);
                  void aiPopulate.populate(res.slideId);
                }
              }}
            />

            <label className="mt-2 flex items-start gap-2 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-[11px] text-black/60">
              <input
                type="checkbox"
                checked={autofillNewSlides}
                onChange={(e) => setAutofillNewSlides(e.target.checked)}
                disabled={!sessionUserId}
                className="mt-0.5"
              />
              <span>
                <span className="font-semibold text-black/75">AI autofill new slides</span>
                <br />
                {sessionUserId
                  ? `Replaces placeholder copy with ${brand.name} specifics on insert.`
                  : "Sign in to auto-populate new slides."}
              </span>
            </label>

            <VideoExamplesPicker
              brand={brand}
              onInsert={(variantId, content) => {
                const res = insertExampleSlide(deck.id, variantId, content, active?.id);
                if (res) {
                  setActiveIdx(clamped + 1);
                  void aiPopulate.populate(res.slideId);
                }
              }}
            />

          </div>

          {/* Stage — drop images from your computer straight onto the slide */}
          <div
            {...stageDrop.dropProps}
            className="relative min-w-0"
            data-testid="slide-stage-dropzone"
            aria-busy={stageDrop.busy}
          >
            {(stageDrop.isOver || stageDrop.busy) && (
              <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#003FC7] bg-[#003FC7]/10 text-center backdrop-blur-[1px]">
                <div className="rounded-full bg-[#003FC7] px-4 py-2 text-[11px] uppercase tracking-widest text-white">
                  {stageDrop.busy ? "Uploading…" : "Drop image onto this slide"}
                </div>
                {stageDrop.busy && (
                  <div className="mt-3 w-[min(320px,80%)]">
                    <UploadProgress progress={stageDrop.progress} busy tone="onBrand" />
                  </div>
                )}
                {stageDrop.addToLibrary && deck.brandModeId && (
                  <div className="mt-2 text-[11px] text-[#03002C]">
                    Also saving to the {brand.name} imagery library
                  </div>
                )}
              </div>
            )}

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-black/55">
              <span>
                {variantSupportsImagery(active?.variantId)
                  ? "Drag an image from your computer onto the slide to use it."
                  : "This module has no image slot — switch to an image-forward layout to drop imagery."}
              </span>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={stageDrop.addToLibrary}
                  onChange={(e) => stageDrop.setAddToLibrary(e.target.checked)}
                />
                Add drops to {brand.name} library
              </label>
            </div>
            {stageDrop.error && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {stageDrop.error}
              </div>
            )}

            {studio ? (
              <div
                className={`relative block w-full overflow-hidden rounded-2xl border text-left shadow-lg ring-1 ${
                  studioTool === "objects"
                    ? "border-fuchsia-500/40 ring-fuchsia-500/20"
                    : "border-[#003FC7]/40 ring-[#003FC7]/20"
                }`}
              >
                {active && mv && (
                  <SlideVideoPreviewContext.Provider value={setVideoPreviewUrl}>
                    <FreeCanvasEditor
                      brand={brand}
                      blocks={active.canvasBlocks}
                      tool={studioTool}
                      onToolChange={setStudioTool}
                      onChange={(next, meta) =>
                        updateCanvasBlocks(deck.id, active.id, next, meta)
                      }
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      canUndo={canUndoAll}
                      canRedo={canRedoAll}
                      undoLabel={undoLabelAll}
                      redoLabel={redoLabelAll}
                      onSaveAsModule={() => setSaveModuleOpen(true)}
                    >
                      <LiveEditOverlay
                        enabled={liveEdit}
                        slideId={active.id}
                        content={active.content as Record<string, unknown>}
                        editableFields={mv.editableFields}
                        inkOverrides={active.inkOverrides}
                        inkScopeOverrides={active.inkScopeOverrides}
                        onChange={(cp, value) => updateField(deck.id, active.id, cp, value)}
                        onSetInkColor={(cp, color) =>
                          setSlideInkOverride(deck.id, active.id, cp, color)
                        }
                        onClearInkColor={(cp) => setSlideInkOverride(deck.id, active.id, cp, null)}
                        onSetInkScopeColor={(sc, color) =>
                          setSlideInkScopeColor(deck.id, active.id, sc, color)
                        }
                        onClearInkScopeColor={(sc) =>
                          setSlideInkScopeColor(deck.id, active.id, sc, null)
                        }
                      >
                        <ScaledSlide>
                          <VariantRenderer
                            slide={applyOverlay(active)}
                            variant={mv}
                            brand={brand}
                            pageNumber={clamped + 1}
                            clientName={brief?.prospect}
                            clientLogoUrl={clientLogoUrl}
                            subCompany={deck?.subCompany}
                            logoOrientation={logoOrientation}
                            mode={active.mode ?? "light"}
                          />
                        </ScaledSlide>
                      </LiveEditOverlay>
                    </FreeCanvasEditor>
                  </SlideVideoPreviewContext.Provider>
                )}
                {/* Editing wants room: jump straight to the big stage. */}
                <button
                  type="button"
                  onClick={() => setZoomedTracked(true)}
                  title="Edit this slide full size"
                  className="absolute bottom-3 right-3 z-30 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow hover:bg-black"
                >
                  ⤢ Enlarge to edit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setZoomedTracked(true)}
                title="Click to view larger"
                aria-label="View slide larger"
                className="group relative block w-full overflow-hidden rounded-2xl border border-black/10 text-left shadow-lg transition hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B2A4A]"
              >
                {active && mv && (
                  <SlideVideoPreviewContext.Provider value={setVideoPreviewUrl}>
                    <LiveEditOverlay
                      enabled={false}
                      slideId={active.id}
                      content={active.content as Record<string, unknown>}
                      editableFields={mv.editableFields}
                      inkOverrides={active.inkOverrides}
                      inkScopeOverrides={active.inkScopeOverrides}
                      onChange={() => {}}
                    >
                      <ScaledSlide>
                        <VariantRenderer
                          slide={applyOverlay(active)}
                          variant={mv}
                          brand={brand}
                          pageNumber={clamped + 1}
                          clientName={brief?.prospect}
                          clientLogoUrl={clientLogoUrl}
                          subCompany={deck?.subCompany}
                          logoOrientation={logoOrientation}
                          mode={active.mode ?? "light"}
                        />
                        <CanvasBlockLayer blocks={active.canvasBlocks} brand={brand} />
                      </ScaledSlide>
                    </LiveEditOverlay>
                  </SlideVideoPreviewContext.Provider>
                )}
                <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100">
                  ⤢ Enlarge
                </span>
              </button>
            )}
            {studio && (
              <p className="mt-2 text-[11px] text-black/50">
                {studioTool === "text" ? (
                  <>
                    Click any highlighted text on the slide to edit it.{" "}
                    <kbd className="rounded border border-black/15 bg-white px-1 text-[10px]">
                      Enter
                    </kbd>{" "}
                    saves ·{" "}
                    <kbd className="rounded border border-black/15 bg-white px-1 text-[10px]">
                      Esc
                    </kbd>{" "}
                    cancels. Fields that appear more than once, or are locked by the module, still
                    edit through the panel below. Switch to <strong>◇ Objects</strong> to move things
                    around.
                  </>
                ) : (
                  <>
                    Drag any block to reposition, double-click to edit its text, and use the toolbar
                    on the slide to add Heading / Body / Caption / image blocks. Turn on{" "}
                    <strong>✥ pick from module</strong> and click an existing headline, tile or photo
                    to make that section movable (Release gives it back). Blocks render everywhere —
                    preview, present, share and export.
                  </>
                )}
              </p>
            )}

            {/* Locations pin editor — only for MV-LOC-* variants */}
            {active && mv && mv.id.startsWith("MV-LOC-") && (
              <div className="mt-6 space-y-6">
                <PinEditorPanel
                  brandId={brand.id}
                  items={(active.content as Record<string, unknown>).items}
                  onChange={(items) => updateField(deck.id, active.id, "items", items)}
                />
                {mv.id === "MV-LOC-WORLD-STATS" && (
                  <WorldStatsMetricsPanel
                    brandId={brand.id}
                    items={(active.content as Record<string, unknown>).items}
                    metrics={(active.content as Record<string, unknown>).metrics}
                    activeMetricId={(active.content as Record<string, unknown>).activeMetricId}
                    regionFilter={(active.content as Record<string, unknown>).regionFilter}
                    excludeRoles={(active.content as Record<string, unknown>).excludeRoles}
                    topN={(active.content as Record<string, unknown>).topN}
                    scaleMode={(active.content as Record<string, unknown>).scaleMode}
                    onChange={(patch: {
                      items?: unknown;
                      metrics?: unknown;
                      activeMetricId?: unknown;
                      regionFilter?: unknown;
                      excludeRoles?: unknown;
                      topN?: unknown;
                      scaleMode?: unknown;
                    }) => {
                      if (patch.items !== undefined)
                        updateField(deck.id, active.id, "items", patch.items);
                      if (patch.metrics !== undefined)
                        updateField(deck.id, active.id, "metrics", patch.metrics);
                      if (patch.activeMetricId !== undefined)
                        updateField(deck.id, active.id, "activeMetricId", patch.activeMetricId);
                      if (patch.regionFilter !== undefined)
                        updateField(deck.id, active.id, "regionFilter", patch.regionFilter);
                      if (patch.excludeRoles !== undefined)
                        updateField(deck.id, active.id, "excludeRoles", patch.excludeRoles);
                      if (patch.topN !== undefined)
                        updateField(deck.id, active.id, "topN", patch.topN);
                      if (patch.scaleMode !== undefined)
                        updateField(deck.id, active.id, "scaleMode", patch.scaleMode);
                    }}
                  />
                )}
              </div>
            )}

            {/* Editable fields */}
            {active && mv && (
              <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
                <div className="text-xs uppercase tracking-widest text-black/50">
                  Editable fields
                </div>
                <div className="mt-4 space-y-4">
                  {mv.editableFields.map((path) => (
                    <FieldEditor
                      key={path}
                      path={path}
                      content={active.content}
                      onChange={(concretePath, value) =>
                        updateField(deck.id, active.id, concretePath, value)
                      }
                    />
                  ))}
                </div>
                {mv.lockedFields.length > 0 && (
                  <div className="mt-6 border-t border-black/10 pt-4 text-xs text-black/50">
                    <span className="font-medium text-black/70">Locked by the module:</span>{" "}
                    {mv.lockedFields.join(" · ")}
                  </div>
                )}
              </div>
            )}

            {active && (
              <SpeakerNotesPanel
                key={active.id}
                value={active.notes ?? ""}
                onChange={(v) => updateSlideNotes(deck.id, active.id, v)}
              />
            )}

            {/* Unified media & background panel — Image / Video / Background tabs */}
            {active && (
              <SlideMediaPanel
                key={`media-${active.id}`}
                imagery={
                  variantSupportsImagery(active.variantId)
                    ? {
                        available: true,
                        render: () => (
                          <SlideImageryPanel
                            mediaUrl={
                              (active.content as Record<string, unknown>).mediaUrl as
                                | string
                                | undefined
                            }
                            mediaSeed={
                              (active.content as Record<string, unknown>).mediaSeed as
                                | string
                                | undefined
                            }
                            divisionId={deck.brandModeId}
                            onChange={(next, nextPath) => {
                              updateField(deck.id, active.id, "mediaUrl", next ?? undefined);
                              if (nextPath !== undefined) {
                                updateField(deck.id, active.id, "mediaPath", nextPath ?? undefined);
                              }
                            }}
                          />
                        ),
                      }
                    : undefined
                }
                video={
                  variantSupportsVideo(active.variantId)
                    ? {
                        available: true,
                        render: () => (
                          <SlideVideoPanel
                            videoUrl={
                              (active.content as Record<string, unknown>).videoUrl as
                                | string
                                | undefined
                            }
                            posterUrl={
                              (active.content as Record<string, unknown>).videoPosterUrl as
                                | string
                                | undefined
                            }
                            autoplay={
                              ((active.content as Record<string, unknown>).videoAutoplay as
                                | boolean
                                | undefined) ?? true
                            }
                            loop={
                              ((active.content as Record<string, unknown>).videoLoop as
                                | boolean
                                | undefined) ?? true
                            }
                            muted={
                              ((active.content as Record<string, unknown>).videoMuted as
                                | boolean
                                | undefined) ?? true
                            }
                            controls={
                              ((active.content as Record<string, unknown>).videoControls as
                                | boolean
                                | undefined) ?? false
                            }
                            onChange={(next) => {
                              if (next.videoUrl !== undefined) {
                                updateField(
                                  deck.id,
                                  active.id,
                                  "videoUrl",
                                  next.videoUrl ?? undefined,
                                );
                              }
                              if (next.videoPath !== undefined) {
                                updateField(
                                  deck.id,
                                  active.id,
                                  "videoPath",
                                  next.videoPath ?? undefined,
                                );
                              }
                              if (next.videoPosterUrl !== undefined) {
                                updateField(
                                  deck.id,
                                  active.id,
                                  "videoPosterUrl",
                                  next.videoPosterUrl ?? undefined,
                                );
                              }
                              if (next.videoPosterPath !== undefined) {
                                updateField(
                                  deck.id,
                                  active.id,
                                  "videoPosterPath",
                                  next.videoPosterPath ?? undefined,
                                );
                              }
                              if (next.videoAutoplay !== undefined) {
                                updateField(
                                  deck.id,
                                  active.id,
                                  "videoAutoplay",
                                  next.videoAutoplay,
                                );
                              }
                              if (next.videoLoop !== undefined) {
                                updateField(deck.id, active.id, "videoLoop", next.videoLoop);
                              }
                              if (next.videoMuted !== undefined) {
                                updateField(deck.id, active.id, "videoMuted", next.videoMuted);
                              }
                              if (next.videoControls !== undefined) {
                                updateField(
                                  deck.id,
                                  active.id,
                                  "videoControls",
                                  next.videoControls,
                                );
                              }
                            }}
                          />
                        ),
                      }
                    : undefined
                }
                background={{
                  render: () => (
                    <BackgroundImageryPanel
                      value={(active.content as Record<string, unknown>).background}
                      onChange={(next) => updateField(deck.id, active.id, "background", next)}
                      activeSlideId={active.id}
                      divisionId={deck.brandModeId}
                      slides={deck.slides.map((sl) => {
                        const section = byId(SECTION_FRAMEWORKS, sl.sectionId);
                        const c = sl.content as Record<string, unknown>;
                        const title =
                          (typeof c.title === "string" && c.title) ||
                          (typeof c.headline === "string" && (c.headline as string)) ||
                          (typeof c.kicker === "string" && (c.kicker as string)) ||
                          section?.name ||
                          "Slide";
                        return {
                          id: sl.id,
                          position: sl.position,
                          sectionId: sl.sectionId,
                          sectionName: section?.name ?? sl.sectionId,
                          title: title as string,
                        };
                      })}
                      onApplyToSlides={(ids, next) => applySlideBackground(deck.id, ids, next)}
                    />
                  ),
                }}
              />
            )}

            {active && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-black/15 bg-black/[0.02] px-5 py-4">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-black/50">
                    PowerPoint fidelity
                  </div>
                  <div className="mt-0.5 text-sm text-black/70">
                    Verify scrim opacity, crop/fit, and overlays before export.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPptxPreviewOpen(true)}
                  className="rounded-full bg-[#003FC7] px-4 py-2 text-[11px] uppercase tracking-widest text-white hover:bg-[#03002C]"
                >
                  Preview in PowerPoint
                </button>
              </div>
            )}

            {active && (
              <PptxPreviewModal
                deck={deck}
                slide={active}
                brand={brand}
                open={pptxPreviewOpen}
                onClose={() => setPptxPreviewOpen(false)}
                onApplyBackground={(next) => applySlideBackground(deck.id, [active.id], next)}
              />
            )}

            {/* AI change log */}

            {active && active.changes.filter((c) => c.accepted).length > 0 && (
              <div className="mt-6 rounded-2xl border border-emerald-300/40 bg-emerald-50/40 p-6">
                <div className="text-xs uppercase tracking-widest text-emerald-900/70">
                  AI changes on this slide
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  {active.changes
                    .filter((c) => c.accepted)
                    .map((c) => (
                      <li
                        key={c.field}
                        className="rounded-lg border border-emerald-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-mono text-xs text-black/60">{c.field}</div>
                          <button
                            onClick={() => revertAiChange(deck.id, active.id, c.field)}
                            className="rounded-full border border-black/15 px-2.5 py-0.5 text-xs hover:bg-black/5"
                          >
                            Revert
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-black/50">
                              Before
                            </div>
                            <div className="mt-0.5 whitespace-pre-wrap text-xs text-black/60">
                              {typeof c.before === "string" ? c.before : JSON.stringify(c.before)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-widest text-emerald-800/70">
                              After (AI)
                            </div>
                            <div className="mt-0.5 whitespace-pre-wrap text-xs">
                              {typeof c.after === "string" ? c.after : JSON.stringify(c.after)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* Inspector */}
          {!inspectorOpen ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                title="Expand inspector"
                aria-label="Expand inspector"
                className="sticky top-6 flex h-24 w-9 items-center justify-center rounded-l-xl border border-r-0 border-black/10 bg-white text-black/60 shadow-sm transition hover:bg-black/5 hover:text-black"
              >
                <span className="text-lg leading-none">‹</span>
              </button>
            </div>
          ) : (
            <aside className="space-y-4 relative">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  title="Collapse inspector"
                  aria-label="Collapse inspector"
                  className="rounded-md border border-black/10 bg-white px-2 py-1 text-[10px] uppercase tracking-widest text-black/60 hover:bg-black/5 hover:text-black"
                >
                  Collapse ›
                </button>
              </div>

              {qa.length > 0 && (
                <Panel
                  label="QA gates"
                  collapsible
                  defaultOpen={blockingIssues(qa).length > 0}
                  badge={
                    <span className="flex gap-2 text-[10px] uppercase tracking-widest">
                      {blockingIssues(qa).length > 0 && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-red-800">
                          {blockingIssues(qa).length} block
                        </span>
                      )}
                      {warningIssues(qa).length > 0 && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-800">
                          {warningIssues(qa).length} warn
                        </span>
                      )}
                    </span>
                  }
                >
                  <div className="mb-2 flex gap-3 text-[10px] uppercase tracking-widest">
                    <span className="text-red-700">{blockingIssues(qa).length} blocking</span>
                    <span className="text-amber-700">{warningIssues(qa).length} warnings</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {qa.map((issue, k) => {
                      const idx = deck.slides.findIndex((sl) => sl.id === issue.slideId);
                      const isBlock = issue.severity === "block";
                      return (
                        <li
                          key={k}
                          className={`rounded-lg px-3 py-2 ${isBlock ? "bg-red-50" : "bg-amber-50"}`}
                        >
                          <button
                            onClick={() => setActiveIdx(idx)}
                            className={`text-xs font-medium uppercase tracking-widest hover:underline ${isBlock ? "text-red-900" : "text-amber-900"}`}
                          >
                            {isBlock ? "Block" : "Warn"} · Slide {idx + 1}
                          </button>
                          <div
                            className={`mt-0.5 ${isBlock ? "text-red-900/80" : "text-amber-900/80"}`}
                          >
                            {issue.message}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}

              {sf && (
                <Panel label="Section framework">
                  <div className="font-mono text-xs text-black/50">{sf.id}</div>
                  <div className="mt-1 font-medium">{sf.name}</div>
                  <div className="mt-2 text-sm text-black/60">{sf.purpose}</div>
                </Panel>
              )}
              {mv && (
                <Panel label="Module variant">
                  <div className="font-mono text-xs text-black/50">{mv.id}</div>
                  <div className="mt-1 font-medium">{mv.name}</div>
                  <div className="mt-2 text-sm text-black/60">{mv.description}</div>
                  {active && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs uppercase tracking-widest text-black/50">
                        Swap layout
                      </div>
                      <SwapLayoutButton
                        slide={active}
                        brand={brand}
                        onSwap={(vid) => swapVariantWithRefit(active.id, vid)}
                        clientLogoUrl={clientLogoUrl}
                        clientName={brief?.prospect}
                        subCompany={deck?.subCompany}
                      />
                      <details className="text-[11px] text-black/50">
                        <summary className="cursor-pointer hover:text-black/70">
                          Quick select…
                        </summary>
                        <select
                          aria-label="Option"
                          className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                          value={mv.id}
                          onChange={(e) => swapVariantWithRefit(active.id, e.target.value, "quick-select")}
                        >
                          <optgroup label="This section">
                            {variantsForSection(active.sectionId).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup
                            label={`All other modules (${
                              MODULE_VARIANTS.length - variantsForSection(active.sectionId).length
                            })`}
                          >
                            {MODULE_VARIANTS.filter(
                              (v) =>
                                !variantsForSection(active.sectionId).some((sv) => sv.id === v.id),
                            ).map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </details>
                      <SlideRefitButton deckId={deck.id} slide={active} />
                      <p className="text-[11px] leading-snug text-black/45">
                        Re-authors this slide&rsquo;s existing copy and speaker notes into the
                        current layout&rsquo;s fields. Never invents new facts.
                      </p>
                    </div>
                  )}
                </Panel>
              )}
              {active && mv && (
                <Panel label="Text formatting (PPTX)" collapsible defaultOpen={false}>
                  <TextFormatInspector
                    slide={applyOverlay(active)}
                    variant={mv}
                    brand={brand}
                    mode={active.mode ?? "light"}
                    pageNumber={clamped + 1}
                    signature={`${active.id}:${mv.id}:${active.mode ?? "light"}`}
                    deckId={deck.id}
                    slideId={active.id}
                    formats={active.textFormats ?? null}
                  />
                </Panel>
              )}
              {active && (
                <Panel label="Swap history">
                  <SlideSwapLogPanel
                    slide={active}
                    onClear={() => clearSlideSwapLog(deck.id, active.id)}
                  />
                </Panel>
              )}

              {mv && active && (
                <IconsPanel
                  slide={active}
                  onChange={(path, value) => updateField(deck.id, active.id, path, value)}
                />
              )}
              {mv && active && (
                <Panel label="Related modules">
                  <div className="mb-2 text-xs text-black/50">
                    Same family — ranked by shared layouts, section fit, and fallback links.
                  </div>
                  <ul className="space-y-1.5">
                    {relatedVariants(mv.id, active.sectionId, 5).map((rv) => (
                      <li key={rv.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{rv.name}</span>
                        <button
                          type="button"
                          onClick={() => swapVariantWithRefit(active.id, rv.id, "related")}
                          className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-black/40 hover:text-black"
                          title={`Swap to ${rv.id}`}
                        >
                          Swap
                        </button>
                      </li>
                    ))}
                    {relatedVariants(mv.id, active.sectionId, 1).length === 0 && (
                      <li className="text-sm text-black/50">No sibling variants in this family.</li>
                    )}
                  </ul>
                </Panel>
              )}

              {lf && (
                <Panel label="Layout framework">
                  <div className="font-mono text-xs text-black/50">{lf.id}</div>
                  <div className="mt-1 font-medium">{lf.name}</div>
                  <div className="mt-2 text-sm text-black/60">{lf.description}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {lf.zones.map((z) => (
                      <span key={z} className="rounded-full bg-black/5 px-2 py-0.5 text-xs">
                        {z}
                      </span>
                    ))}
                  </div>
                </Panel>
              )}
              {brief && (
                <Panel label="Brief">
                  <div className="text-sm">{brief.prospect}</div>
                  <div className="mt-1 text-xs text-black/50">
                    {brief.industry} · {brief.audience}
                  </div>
                </Panel>
              )}
              {active &&
                mv &&
                [
                  "MV-PROOF-LOGOS",
                  "MV-CASE-LOGO-GRID",
                  "MV-LOGO-WALL",
                  "MV-CLIENT-MATRIX",
                  "MV-CLIENT-DETAIL-3",
                  "MV-CLIENT-COMPARE",
                ].includes(mv.id) && (
                  <LogoGridItemsPanel
                    items={
                      Array.isArray((active.content as Record<string, unknown>).items)
                        ? ((active.content as Record<string, unknown>).items as Array<
                            Record<string, unknown>
                          >)
                        : []
                    }
                    onChange={(items) => updateField(deck.id, active.id, "items", items)}
                    nameField={
                      mv.id === "MV-PROOF-LOGOS" || mv.id === "MV-LOGO-WALL" ? "name" : "client"
                    }
                  />
                )}
              {active &&
                mv &&
                [
                  "MV-PROOF-STATS-2",
                  "MV-PROOF-STATS-3",
                  "MV-PROOF-STATS-4",
                  "MV-CTX-STAT-GRID",
                  "MV-INS-OPPORTUNITY-SIZE",
                ].includes(mv.id) && (
                  <Panel label="Stats alignment">
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-black/70">Alignment</span>
                      <select
                        value={
                          ((active.content as Record<string, unknown>).align as string) === "center"
                            ? "center"
                            : "left"
                        }
                        onChange={(e) => updateField(deck.id, active.id, "align", e.target.value)}
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      >
                        <option value="left">Left aligned (default)</option>
                        <option value="center">Center aligned</option>
                      </select>
                    </label>
                    <p className="mt-2 text-[11px] text-black/50">
                      Centers the title, icon, figure and label in each stat column.
                    </p>
                  </Panel>
                )}

              {active && mv && mv.id === "MV-FUNNEL" && (
                <Panel label="Funnel styling">
                  <FunnelStylePanel
                    brand={brand}
                    value={(active.content as Record<string, unknown>).funnelStyle}
                    onChange={(next) => updateField(deck.id, active.id, "funnelStyle", next)}
                  />
                </Panel>
              )}

              {active && (
                <Panel label="Fine-tune with the agent">
                  <SlideRefinePrompt
                    deckId={deck.id}
                    slide={{
                      id: active.id,
                      variantId: active.variantId,
                      content: active.content as Record<string, unknown>,
                    }}
                    sectionName={mv?.name}
                    divisionId={deck.brandModeId ?? null}
                    context={{
                      prospect: brief?.prospect,
                      industry: brief?.industry,
                      audience: brief?.audience,
                      meetingObjective: brief?.meetingObjective,
                      brandName: brand?.name,
                      assetRequest: deck.context?.assetRequest?.text,
                    }}
                  />
                </Panel>
              )}



              {active && (
                <details className="group rounded-2xl border border-black/10 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs uppercase tracking-widest text-[#003FC7] hover:bg-black/[0.02]">
                    <span>Logo on this slide</span>
                    <span className="text-black/40 transition group-open:rotate-180">▾</span>
                  </summary>
                  <div className="border-t border-black/10 px-4 py-4">
                    <div className="flex items-baseline justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setSlideLogo(deck.id, active.id, {
                            position: "auto",
                            orientation: "auto",
                          })
                        }
                        className="text-[11px] uppercase tracking-widest text-black/40 hover:text-black"
                      >
                        Reset
                      </button>
                    </div>
                    <div className="mt-2 space-y-3">
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-black/70">Orientation</span>
                        <select
                          value={active.logoOrientation ?? "auto"}
                          onChange={(e) =>
                            setSlideLogo(deck.id, active.id, {
                              orientation: e.target.value as
                                | "auto"
                                | "horizontal"
                                | "stacked"
                                | "mark-only",
                            })
                          }
                          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                        >
                          <option value="auto">Auto (deck default · {logoOrientation})</option>
                          <option value="horizontal">Horizontal (side-by-side)</option>
                          <option value="stacked">Stacked</option>
                          <option value="mark-only">Mark only (monogram)</option>
                        </select>
                      </label>
                      <label className="block text-xs">
                        <span className="mb-1 block font-medium text-black/70">Position</span>
                        <select
                          value={active.logoPosition ?? "auto"}
                          onChange={(e) =>
                            setSlideLogo(deck.id, active.id, { position: e.target.value as never })
                          }
                          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                        >
                          <option value="auto">Auto (layout default)</option>
                          <option value="top-left">Top left · half size</option>
                          <option value="top-center">Top center · half size</option>
                          <option value="top-right">Top right</option>
                          <option value="bottom-left">Bottom left · half size</option>
                          <option value="bottom-center">Bottom center · half size</option>
                          <option value="bottom-right">Bottom right</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </label>
                    </div>
                    <p className="mt-3 text-[11px] text-black/50">
                      Always rendered as the top-most visual layer. Half-size positions keep the
                      mark quiet; mark-only shows only the monogram.
                    </p>
                  </div>
                </details>
              )}
              <ClientLogoPanel
                current={deck.clientLogo ?? null}
                onChange={(logo) => setDeckClientLogo(deck.id, logo)}
              />
            </aside>
          )}
        </div>
        <CopilotPanel deckId={deckId} onHighlight={setFlashIndices} />
        {zoomed && active && mv && (
          <SlideLightbox
            onClose={() => setZoomedTracked(false)}
            label={`Slide ${clamped + 1} of ${deck.slides.length}${studio ? (liveEdit ? " · Editing text" : " · Editing objects") : ""}`}
            onPrev={clamped > 0 ? () => setActiveIdx(clamped - 1) : undefined}
            onNext={clamped < deck.slides.length - 1 ? () => setActiveIdx(clamped + 1) : undefined}
            suppressEscape={studio}
            liveEdit={studio}
            onToggleLiveEdit={() => setStudio((v) => !v)}

          >
            <SlideVideoPreviewContext.Provider value={setVideoPreviewUrl}>
              <FreeCanvasEditor
                brand={brand}
                blocks={active.canvasBlocks}
                tool={studio ? studioTool : "objects"}
                onToolChange={(t) => {
                  setStudio(true);
                  setStudioTool(t);
                }}
                onChange={(next, meta) => updateCanvasBlocks(deck.id, active.id, next, meta)}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndoAll}
                canRedo={canRedoAll}
                undoLabel={undoLabelAll}
                redoLabel={redoLabelAll}
                onSaveAsModule={() => setSaveModuleOpen(true)}
              >
                <LiveEditOverlay
                  enabled={liveEdit}
                  slideId={active.id}
                  content={active.content as Record<string, unknown>}
                  editableFields={mv.editableFields}
                  inkOverrides={active.inkOverrides}
                  inkScopeOverrides={active.inkScopeOverrides}
                  onChange={(cp, value) => updateField(deck.id, active.id, cp, value)}
                  onSetInkColor={(cp, color) => setSlideInkOverride(deck.id, active.id, cp, color)}
                  onClearInkColor={(cp) => setSlideInkOverride(deck.id, active.id, cp, null)}
                  onSetInkScopeColor={(sc, color) =>
                    setSlideInkScopeColor(deck.id, active.id, sc, color)
                  }
                  onClearInkScopeColor={(sc) => setSlideInkScopeColor(deck.id, active.id, sc, null)}
                >
                  <VariantRenderer
                    slide={applyOverlay(active)}
                    variant={mv}
                    brand={brand}
                    pageNumber={clamped + 1}
                    clientName={brief?.prospect}
                    clientLogoUrl={clientLogoUrl}
                    subCompany={deck?.subCompany}
                    logoOrientation={logoOrientation}
                    mode={active.mode ?? "light"}
                  />
                </LiveEditOverlay>
              </FreeCanvasEditor>
            </SlideVideoPreviewContext.Provider>
          </SlideLightbox>
        )}

        {active && mv && (
          <SaveModuleDialog
            open={saveModuleOpen}
            onClose={() => setSaveModuleOpen(false)}
            variantId={active.variantId}
            variantName={mv.name}
            content={active.content as Record<string, unknown>}
            brandMode={deck.brandModeId ?? null}
            subCompany={deck.subCompany ?? null}
            canvasBlocks={
              (active.canvasBlocks ?? []) as unknown as readonly Record<string, unknown>[]
            }
          />
        )}

        <BrandReviewPanel
          deckId={deckId}
          onNavigateToSlide={(i) => setActiveIdx(Math.max(0, Math.min(deck.slides.length - 1, i)))}
        />
        <ArtDirectorPanel
          deckId={deckId}
          onNavigateToSlide={(i) => setActiveIdx(Math.max(0, Math.min(deck.slides.length - 1, i)))}
          onSwapVariant={(i, vid) => {
            const target = deck.slides[i];
            if (target) swapVariant(deck.id, target.id, vid, "gallery");
          }}
        />

        {commentsOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => setCommentsOpen(false)}
              aria-hidden="true"
            />
            <aside
              role="dialog"
              aria-label="Deck comments"
              className="fixed right-4 top-20 z-50 w-[400px] max-w-[calc(100vw-2rem)]"
            >
              <CommentsPanel
                localDeckId={deckId}
                slideIndex={clamped}
                onCountChange={setCommentCounts}
              />
            </aside>
          </>
        )}
        {videoPreviewUrl && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-6"
            onClick={() => setVideoPreviewUrl(null)}
          >
            <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <video
                src={videoPreviewUrl}
                controls
                autoPlay
                className="w-full rounded-lg bg-black"
              />
              <button
                type="button"
                onClick={() => setVideoPreviewUrl(null)}
                className="absolute -top-10 right-0 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Close ✕
              </button>
            </div>
          </div>
        )}
      </SlideMediaRefreshProvider>
    </AppShell>
  );
}

function IconsPanel({
  slide,
  onChange,
}: {
  slide: { content: Record<string, unknown> };
  onChange: (path: string, value: unknown) => void;
}) {
  const items = Array.isArray(slide.content.items)
    ? (slide.content.items as Array<Record<string, unknown>>)
    : [];
  // Only expose picker when items have a label/title (icons live next to labels).
  const slots = items
    .map((it, i) => {
      const label =
        (typeof it.label === "string" && it.label) ||
        (typeof it.title === "string" && it.title) ||
        "";
      const currentIcon = typeof it.icon === "string" ? it.icon : "";
      return { i, label, currentIcon };
    })
    .filter((s) => s.label);
  if (slots.length === 0) return null;
  return (
    <Panel label="Icons">
      <div className="mb-3 text-xs text-black/50">
        Pick a specific icon for each row, or leave on Auto to match by label.
      </div>
      <ul className="space-y-2">
        {slots.map((slot) => (
          <li key={slot.i} className="flex items-center gap-3">
            <div className="w-5 shrink-0 text-right font-mono text-[10px] text-black/40">
              {String(slot.i + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1 truncate text-sm text-black/80" title={slot.label}>
              {slot.label}
            </div>
            <IconPicker
              value={slot.currentIcon || null}
              autoLabel={slot.label}
              onChange={(name) => onChange(`items[${slot.i}].icon`, name ?? "")}
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SlideLightbox({
  children,
  onClose,
  label,
  onPrev,
  onNext,
  suppressEscape,
  liveEdit,
  onToggleLiveEdit,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  suppressEscape?: boolean;
  liveEdit?: boolean;
  onToggleLiveEdit?: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const editing =
        !!t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA");
      if (e.key === "Escape" && !suppressEscape && !editing) onClose();
      else if (e.key === "ArrowLeft" && onPrev && !editing) onPrev();
      else if (e.key === "ArrowRight" && onNext && !editing) onNext();
    };
    window.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext, suppressEscape]);

  // Portal to <body>: the editor's <main> creates a stacking context, so an
  // in-tree overlay renders *below* the sticky app nav no matter its z-index.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Slide preview"
    >
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <div className="text-xs uppercase tracking-[0.3em] text-white/70">{label}</div>
        <div className="flex items-center gap-2">
          {onToggleLiveEdit && (
            <button
              type="button"
              aria-pressed={!!liveEdit}
              onClick={(e) => {
                e.stopPropagation();
                onToggleLiveEdit();
              }}
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition ${
                liveEdit
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white/80 hover:border-white/60 hover:text-white"
              }`}
            >
              {liveEdit ? "● Live edit on" : "✎ Live edit"}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:border-white/60 hover:text-white"
          >
            Close · Esc
          </button>
        </div>

      </div>
      <div className="flex flex-1 items-center justify-center px-6 pb-6">
        <div
          className="relative w-full max-w-[min(1600px,95vw)]"
          style={{ aspectRatio: "16 / 9" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl bg-white shadow-2xl">
            <ScaledSlide>{children}</ScaledSlide>
          </div>
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-lg text-white hover:bg-black/80"
            >
              ‹
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-lg text-white hover:bg-black/80"
            >
              ›
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function IconBtn({
  children,
  title,
  onClick,
  tabIndex,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  /** Roving tab stop: only the current slide's row controls are tabbable. */
  tabIndex?: number;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      tabIndex={tabIndex}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] leading-none text-black/70 shadow ring-1 ring-black/10 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
    >
      {children}
    </button>
  );
}


function VideoExamplesPicker({
  brand,
  onInsert,
}: {
  brand: ReturnType<typeof resolveBrandMode>;
  onInsert: (variantId: string, content: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-dashed border-[#0B2A4A]/30 bg-[#0B2A4A]/[0.03] p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left text-xs font-medium uppercase tracking-widest text-[#0B2A4A]/80 hover:text-[#0B2A4A]"
      >
        <span>▶ Video examples</span>
        <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 text-[10px]">
          {VIDEO_SLIDE_EXAMPLES.length}
        </span>
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 gap-3">
          {VIDEO_SLIDE_EXAMPLES.map((ex) => {
            const mv = byId(MODULE_VARIANTS, ex.variantId);
            if (!mv) return null;
            const previewSlide: DeckSlide = {
              id: `preview-${ex.key}`,
              position: 0,
              sectionId: "SEC-01",
              variantId: ex.variantId,
              layoutId: mv.permittedLayoutIds[0],
              content: ex.content,
              changes: [],
            };
            return (
              <button
                key={ex.key}
                type="button"
                onClick={() => onInsert(ex.variantId, ex.content)}
                className="group overflow-hidden rounded-lg border border-black/10 bg-white text-left transition hover:border-[#0B2A4A]/40 hover:shadow"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[#03002C]">
                  <SlideThumbnailContext.Provider value={true}>
                    <ScaledSlide>
                      <VariantRenderer
                        slide={previewSlide}
                        variant={mv}
                        brand={brand}
                        pageNumber={1}
                      />
                    </ScaledSlide>
                  </SlideThumbnailContext.Provider>
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white">
                    ▶ Video
                  </span>
                </div>
                <div className="px-2.5 py-2">
                  <div className="truncate text-[11px] font-semibold text-black/80">{ex.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[10px] text-black/50">{ex.blurb}</div>
                  <div className="mt-1 font-mono text-[9px] text-black/35">{ex.variantId}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Panel({
  label,
  children,
  collapsible = false,
  defaultOpen = true,
  badge,
}: {
  label: string;
  children: React.ReactNode;
  /** Inspector panels that can grow unbounded (QA gates) can be folded away. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const body = <div className="mt-3">{children}</div>;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-xs uppercase tracking-widest text-black/50">{label}</span>
          <span className="flex items-center gap-2">
            {badge}
            <span className="text-[10px] uppercase tracking-widest text-black/40">
              {open ? "Hide" : "Show"}
            </span>
            <ChevronDown
              className={`size-3.5 text-black/40 transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </span>
        </button>
      ) : (
        <div className="text-xs uppercase tracking-widest text-black/50">{label}</div>
      )}
      {(!collapsible || open) && body}
    </div>
  );
}

// Expand editable field patterns like "items[].title" against the current content.

function FieldEditor({
  path,
  content,
  onChange,
}: {
  path: string;
  content: Record<string, unknown>;
  onChange: (concretePath: string, value: unknown) => void;
}) {
  const concretePaths = expandPath(path, content);
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-widest text-black/50">{path}</div>
      <div className="space-y-2">
        {concretePaths.map((cp) => {
          const value = String(readPath(content, cp) ?? "");
          const long = value.length > 80;
          return long ? (
            <textarea
              key={cp}
              aria-label={`${path} — ${cp}`}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              rows={3}
              value={value}
              onChange={(e) => onChange(cp, e.target.value)}
            />
          ) : (
            <input
              key={cp}
              aria-label={`${path} — ${cp}`}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              value={value}
              onChange={(e) => onChange(cp, e.target.value)}
            />
          );
        })}
      </div>
    </div>
  );
}

function ClientLogoPanel({
  current,
  onChange,
}: {
  current: DeckClientLogo | null;
  onChange: (logo: DeckClientLogo | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const query = useClientLogos();

  const filtered = useMemo(() => {
    const rows = (query.data ?? []) as ClientLogoRow[];
    const s = q.trim().toLowerCase();
    if (!s) return rows.slice(0, 60);
    return rows
      .filter(
        (r) =>
          r.client_name.toLowerCase().includes(s) ||
          r.slug.toLowerCase().includes(s) ||
          (r.industry ?? "").toLowerCase().includes(s) ||
          (r.tags ?? []).some((t) => t.toLowerCase().includes(s)),
      )
      .slice(0, 60);
  }, [query.data, q]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="text-[10px] uppercase tracking-widest text-black/50">Client logo</div>
      <div className="mt-3">
        {current ? (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-16 items-center justify-center rounded-md bg-[#F5F7FB]">
              {current.primaryUrl ? (
                <img
                  src={current.primaryUrl}
                  alt={`${current.clientName} logo`}
                  className="max-h-10 max-w-[90%] object-contain"
                />
              ) : (
                <span className="text-[10px] text-black/40">no preview</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{current.clientName}</div>
              <div className="text-[11px] text-black/50">
                Locks into every slide's brand lockup.
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-black/60">
            No client logo attached. Pick one from LogoHub to co-brand every slide.
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:border-[#003FC7]/40 hover:text-[#003FC7]"
          >
            {current ? "Change" : "Attach from LogoHub"}
          </button>
          {current && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              Remove
            </button>
          )}
          <Link
            to="/admin/logohub"
            className="rounded-full border border-black/10 px-3 py-1 text-xs text-black/60 hover:border-black/30"
          >
            Manage LogoHub →
          </Link>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-black/10 px-5 py-3">
              <div className="text-sm font-semibold">Attach a client logo</div>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search LogoHub…"
                className="ml-3 flex-1 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/10 px-3 py-1 text-xs hover:border-black/30"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              {query.isLoading && <div className="text-sm text-black/50">Loading LogoHub…</div>}
              {query.error && (
                <div className="text-sm text-red-700">
                  Couldn't load LogoHub: {(query.error as Error).message}
                </div>
              )}
              {!query.isLoading && filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/50">
                  No matches. Add logos in Admin → LogoHub first.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {filtered.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      onChange({
                        id: r.id,
                        clientName: r.client_name,
                        primaryUrl: r.primaryUrl,
                        darkUrl: r.darkUrl,
                        lightUrl: r.lightUrl,
                        monoUrl: r.monoUrl,
                      });
                      setOpen(false);
                    }}
                    className="group rounded-xl border border-black/10 bg-white p-3 text-left transition hover:border-[#003FC7]/40 hover:shadow"
                  >
                    <div className="flex h-20 items-center justify-center rounded-lg bg-[#F5F7FB]">
                      {r.primaryUrl ? (
                        <img
                          src={r.primaryUrl}
                          alt={`${r.client_name} logo`}
                          className="max-h-16 max-w-[85%] object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-black/40">preview unavailable</span>
                      )}
                    </div>
                    <div className="mt-2 truncate text-xs font-semibold">{r.client_name}</div>
                    <div className="truncate text-[10px] text-black/50">{r.industry ?? "—"}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type LogoItem = Record<string, unknown>;

function LogoGridItemsPanel({
  items,
  onChange,
  nameField = "name",
}: {
  items: LogoItem[];
  onChange: (items: LogoItem[]) => void;
  nameField?: "name" | "client";
}) {
  const [pickIdx, setPickIdx] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const query = useClientLogos();

  const filtered = useMemo(() => {
    const rows = (query.data ?? []) as ClientLogoRow[];
    const s = q.trim().toLowerCase();
    if (!s) return rows.slice(0, 60);
    return rows
      .filter(
        (r) =>
          r.client_name.toLowerCase().includes(s) ||
          r.slug.toLowerCase().includes(s) ||
          (r.industry ?? "").toLowerCase().includes(s) ||
          (r.tags ?? []).some((t) => t.toLowerCase().includes(s)),
      )
      .slice(0, 60);
  }, [query.data, q]);

  const update = (i: number, patch: Partial<Record<string, unknown>>) => {
    const next = items.map((it, k) => (k === i ? { ...it, ...patch } : it));
    onChange(next);
  };
  const addItem = () => onChange([...items, { [nameField]: "New client" }]);
  const removeItem = (i: number) => onChange(items.filter((_, k) => k !== i));

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-black/50">Logo grid items</div>
        <button
          type="button"
          onClick={addItem}
          className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest hover:border-[#003FC7]/40 hover:text-[#003FC7]"
        >
          + Add
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 && (
          <div className="text-sm text-black/50">
            No items yet. Add clients and pick their logos from LogoHub.
          </div>
        )}
        {items.map((it, i) => {
          const name =
            typeof it.name === "string"
              ? it.name
              : typeof it.client === "string"
                ? (it.client as string)
                : "";
          const logoUrl = typeof it.logoUrl === "string" ? it.logoUrl : "";
          const variants = (
            it.logoVariants && typeof it.logoVariants === "object" ? it.logoVariants : {}
          ) as Record<string, string | null | undefined>;
          const variantPaths = (
            it.logoPaths && typeof it.logoPaths === "object" ? it.logoPaths : {}
          ) as Record<string, string | null | undefined>;
          const activeVariant = typeof it.logoVariant === "string" ? it.logoVariant : "primary";
          const VARIANTS: Array<{ key: string; label: string }> = [
            { key: "primary", label: "P" },
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
            { key: "mono", label: "Mono" },
          ];
          return (
            <div key={i} className="rounded-xl border border-black/10 p-2">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-14 items-center justify-center rounded-md"
                  style={{ backgroundColor: activeVariant === "dark" ? "#03002C" : "#F5F7FB" }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="max-h-8 max-w-[90%] object-contain" />
                  ) : (
                    <span className="text-[10px] text-black/40">—</span>
                  )}
                </div>
                <input
                  value={name}
                  onChange={(e) => update(i, { [nameField]: e.target.value })}
                  placeholder="Client name"
                  className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPickIdx(i);
                    setQ("");
                  }}
                  className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest hover:border-[#003FC7]/40 hover:text-[#003FC7]"
                >
                  {logoUrl ? "Change" : "Pick"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      update(i, {
                        logoUrl: "",
                        logoVariant: "primary",
                        logoVariants: {},
                        logoPath: "",
                        logoPaths: {},
                      })
                    }
                    className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-black/60 hover:border-black/30"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-50"
                  title="Remove item"
                >
                  ×
                </button>
              </div>
              {logoUrl && (
                <div className="mt-2 flex items-center gap-1 pl-16">
                  <span className="mr-1 text-[10px] uppercase tracking-widest text-black/40">
                    Variant
                  </span>
                  {VARIANTS.map((v) => {
                    const url = variants[v.key];
                    const has = typeof url === "string" && url.length > 0;
                    const isActive = v.key === activeVariant;
                    return (
                      <button
                        key={v.key}
                        type="button"
                        disabled={!has}
                        onClick={() =>
                          update(i, {
                            logoVariant: v.key,
                            logoUrl: url,
                            logoPath: variantPaths[v.key] ?? "",
                          })
                        }
                        className={
                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest transition " +
                          (isActive
                            ? "border-[#003FC7] bg-[#003FC7] text-white"
                            : has
                              ? "border-black/15 text-black/70 hover:border-[#003FC7]/40 hover:text-[#003FC7]"
                              : "cursor-not-allowed border-black/5 text-black/25")
                        }
                        title={has ? `Use ${v.label} variant` : `No ${v.label} variant uploaded`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pickIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPickIdx(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-black/10 px-5 py-3">
              <div className="text-sm font-semibold">Pick a logo from LogoHub</div>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search LogoHub…"
                className="ml-3 flex-1 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => setPickIdx(null)}
                className="rounded-full border border-black/10 px-3 py-1 text-xs hover:border-black/30"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              {query.isLoading && <div className="text-sm text-black/50">Loading LogoHub…</div>}
              {query.error && (
                <div className="text-sm text-red-700">
                  Couldn't load LogoHub: {(query.error as Error).message}
                </div>
              )}
              {!query.isLoading && filtered.length === 0 && (
                <div className="rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/50">
                  No matches. Add logos in Admin → LogoHub first.
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {filtered.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      const logoVariants = {
                        primary: r.primaryUrl ?? null,
                        light: r.lightUrl ?? null,
                        dark: r.darkUrl ?? null,
                        mono: r.monoUrl ?? null,
                      };
                      const logoPaths = {
                        primary: r.primary_path ?? null,
                        light: r.light_path ?? null,
                        dark: r.dark_path ?? null,
                        mono: r.mono_path ?? null,
                      };
                      // Only fill the name field if empty — preserve any existing
                      // client name the author has already customized.
                      const existing = items[pickIdx] ?? {};
                      const currentName =
                        typeof existing[nameField] === "string"
                          ? (existing[nameField] as string)
                          : "";
                      const patch: Record<string, unknown> = {
                        logoUrl: r.primaryUrl,
                        logoVariant: "primary",
                        logoVariants,
                        logoPath: r.primary_path ?? "",
                        logoPaths,
                      };
                      if (!currentName.trim()) patch[nameField] = r.client_name;
                      update(pickIdx, patch);
                      setPickIdx(null);
                    }}
                    className="group rounded-xl border border-black/10 bg-white p-3 text-left transition hover:border-[#003FC7]/40 hover:shadow"
                  >
                    <div className="flex h-20 items-center justify-center rounded-lg bg-[#F5F7FB]">
                      {r.primaryUrl ? (
                        <img
                          src={r.primaryUrl}
                          alt={`${r.client_name} logo`}
                          className="max-h-16 max-w-[85%] object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-black/40">preview unavailable</span>
                      )}
                    </div>
                    <div className="mt-2 truncate text-xs font-semibold">{r.client_name}</div>
                    <div className="truncate text-[10px] text-black/50">{r.industry ?? "—"}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpeakerNotesPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(() => value.trim().length > 0);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 400);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);
  const chars = draft.length;
  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-black/70">
          <span className="text-[#0B2A4A]">✎</span> Speaker notes
          {chars > 0 && (
            <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 text-[10px] text-[#0B2A4A]">
              {chars}
            </span>
          )}
        </span>
        <span className="text-xs text-black/40">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="border-t border-black/10 px-6 py-4">
          <textarea
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm leading-relaxed"
            rows={6}
            placeholder="Private notes for the presenter. Shown in presenter mode and exported as PPTX notes — never visible on the slide."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="mt-2 text-[11px] text-black/40">
            Autosaves · Private to your team · Excluded from share links
          </div>
        </div>
      )}
    </div>
  );
}

const TRANSITION_TYPES: { value: TransitionType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "cut", label: "Cut" },
  { value: "fade", label: "Fade" },
  { value: "push-left", label: "Push ←" },
  { value: "push-right", label: "Push →" },
  { value: "zoom", label: "Zoom" },
];

const SPEED_PRESETS: { key: "fast" | "med" | "slow"; label: string; durationMs: number }[] = [
  { key: "fast", label: "Fast", durationMs: 250 },
  { key: "med", label: "Med", durationMs: 400 },
  { key: "slow", label: "Slow", durationMs: 600 },
];

function speedKey(ms?: number): "fast" | "med" | "slow" {
  if (ms == null) return "med";
  if (ms <= 300) return "fast";
  if (ms >= 550) return "slow";
  return "med";
}

function TransitionPicker({
  slide,
  deckDefault,
  onSlideChange,
  onDeckDefaultChange,
}: {
  slide: DeckSlide;
  deckDefault: SlideTransition | undefined;
  onSlideChange: (t: SlideTransition | null) => void;
  onDeckDefaultChange: (t: SlideTransition | null) => void;
}) {
  const resolved = resolveSlideTransition(slide, { defaultTransition: deckDefault });
  const usingSlideOverride = Boolean(slide.transition);
  const base: SlideTransition = usingSlideOverride
    ? (slide.transition as SlideTransition)
    : (deckDefault ?? DEFAULT_SLIDE_TRANSITION);
  const speed = speedKey(base.durationMs);

  function updateSlide(patch: Partial<SlideTransition>) {
    onSlideChange({ ...base, ...patch });
  }

  function updateDeck(patch: Partial<SlideTransition>) {
    const next: SlideTransition = { ...(deckDefault ?? DEFAULT_SLIDE_TRANSITION), ...patch };
    onDeckDefaultChange(next);
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-2 py-1 text-[11px] font-medium uppercase tracking-widest text-black/70"
      title="Slide transition (played on-screen only in Pass 1)"
      data-testid="transition-picker"
    >
      <span className="pl-1 text-black/40">Transition</span>
      <select
        aria-label="Transition type"
        value={resolved.type}
        onChange={(e) => updateSlide({ type: e.target.value as TransitionType })}
        className="rounded-full bg-transparent px-1 py-0.5 text-[11px] font-medium uppercase tracking-widest text-black focus:outline-none"
      >
        {TRANSITION_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <span className="text-black/25">·</span>
      <select
        aria-label="Transition speed"
        value={speed}
        onChange={(e) => {
          const preset = SPEED_PRESETS.find((p) => p.key === e.target.value);
          if (preset) updateSlide({ durationMs: preset.durationMs });
        }}
        className="rounded-full bg-transparent px-1 py-0.5 text-[11px] font-medium uppercase tracking-widest text-black focus:outline-none"
      >
        {SPEED_PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          updateDeck({ type: resolved.type, durationMs: resolved.durationMs });
          onSlideChange(null);
        }}
        className="rounded-full border border-black/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-black/50 hover:border-[#003FC7] hover:text-[#003FC7]"
        title="Make this the deck-wide default"
      >
        Set default
      </button>
      {usingSlideOverride && (
        <button
          type="button"
          onClick={() => onSlideChange(null)}
          className="text-[9px] uppercase tracking-widest text-black/40 hover:text-red-600"
          title="Clear this slide's override (fall back to deck default)"
        >
          Reset
        </button>
      )}
    </div>
  );
}

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35">
        {label}
      </span>
      <div className="flex items-center gap-0.5">{children}</div>
    </div>
  );
}

function ToolbarDivider() {
  return <span className="mt-5 h-6 w-px bg-black/[0.08]" aria-hidden />;
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent-foreground px-2 py-1 text-[10px] font-medium tracking-wide text-primary-foreground opacity-0 shadow-lg transition-all duration-150 group-hover:opacity-100 group-focus-within:opacity-100 group-hover:translate-y-0 -translate-y-0.5"
      >
        {label}
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-accent-foreground"
        />
      </span>
    </span>
  );
}

/**
 * A labeled row inside an AccordionGroup popover. Icon-only controls with
 * hover tooltips are unreadable in a dropdown, so the menu always shows the
 * action name next to the control.
 */
function MenuRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-black/[0.04]">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">{children}</span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12px] font-medium text-black/80">{label}</span>
        {hint && <span className="block truncate text-[10px] text-black/45">{hint}</span>}
      </span>
    </div>
  );
}


function AccordionGroup({
  label,
  hint,
  badge,
  children,
}: {
  label: string;
  hint?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<"left" | "right">("left");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const getFocusable = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("data-focus-skip"));
  }, []);

  // Focus first element on open + edge-detect anchor to keep panel on-screen.
  // Edge case: if the panel has zero focusable descendants we must NOT trap
  // the user inside an unreachable region. Focus the panel container itself
  // (tabindex=-1 gives it a programmatic focus target) so screen readers
  // announce the group and Escape/Tab still return control to the trigger.
  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const vw = window.innerWidth;
      setAnchor(rect.left + rect.width / 2 > vw / 2 ? "right" : "left");
    }
    const els = getFocusable();
    if (els.length > 0) {
      els[0]?.focus();
    } else {
      panelRef.current?.focus();
    }
  }, [open, getFocusable]);

  // Click outside + Escape
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Focus trap via Tab cycling.
  // Edge case: with zero focusables there is nothing to cycle to, so Tab
  // closes the popover and returns focus to the trigger (forward Tab) or
  // lets the browser move focus to the previous element (Shift+Tab). This
  // avoids swallowing keystrokes in an empty panel.
  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const els = getFocusable();
    if (els.length === 0) {
      setOpen(false);
      if (!e.shiftKey) {
        e.preventDefault();
        triggerRef.current?.focus();
      }
      return;
    }
    const first = els[0];
    const last = els[els.length - 1];
    const activeEl = document.activeElement as HTMLElement | null;
    // If focus is on the panel itself (empty-panel fallback state that just
    // gained a focusable via async render), send Tab to the first element.
    if (activeEl === panelRef.current) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && activeEl === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div ref={rootRef} className="group/acc relative" data-open={open ? "true" : "false"}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`flex cursor-pointer list-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
          open
            ? "border-primary bg-primary text-primary-foreground"
            : "border-black/[0.06] bg-white text-black/55 hover:border-primary/40 hover:text-primary"
        }`}
      >
        <span>{label}</span>
        {hint && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal ${open ? "bg-primary-foreground/15 text-primary-foreground/85" : "bg-black/[0.05] text-black/55"}`}
          >
            {hint}
          </span>
        )}
        {badge && (
          <span
            className={`inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${open ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}
          >
            {badge}
          </span>
        )}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`h-2.5 w-2.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4.5 L6 7.5 L9 4.5" />
        </svg>
      </button>
      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="group"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          className={`absolute top-[calc(100%+6px)] z-[60] flex w-max min-w-[220px] max-w-[min(340px,calc(100vw-2rem))] flex-col gap-0.5 rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-[0_12px_30px_-12px_rgba(3,0,44,0.25)] outline-none ${anchor === "right" ? "right-0 left-auto" : "left-0 right-auto"}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
