// Full-screen slide studio for library module samples.
//
// Gives master admins the same editing surface the deck editor has:
// click-to-edit copy on the rendered slide (LiveEditOverlay), per-field and
// per-scope text colours, light/dark mode, background imagery toggle, a field
// inspector with per-field revert, structure editing (add / remove cells,
// including imagery cells) and save / reset of the curated sample.
//
// Two scoping axes:
//   • brand scope — save for every brand mode, or one division only
//   • appearance scope — an edit can be shared, or light-only / dark-only
//     (stored in the reserved `__modes` bucket of the sample payload)

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { PackShell, useLibraryPack, usePackBrand } from "@/components/slide/PackShell";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { IconPicker } from "@/components/IconPicker";
import { uploadSlideMedia } from "@/lib/slide-media";
import { SlideMediaPicker } from "@/components/library/SlideMediaPicker";
import { SlideIconPicker } from "@/components/library/SlideIconPicker";
import { SlideLogoPicker } from "@/components/library/SlideLogoPicker";
import { CropFrameOverlay, type CropRect } from "@/components/library/CropFrameOverlay";

import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";

import {
  ALL_BRANDS,
  INK_KEY,
  INK_SCOPE_KEY,
  MODES_KEY,
  applyModeCopy,
  diffSampleContent,
  mergeModeInk,
  splitSampleContent,
  useVariantSampleHistory,
  useVariantSampleMutations,
  type SampleModeLayer,
  type SampleModes,
  type SlideModeId,
} from "@/hooks/use-variant-samples";
import {
  collectStringPaths,
  fieldLabel,
  readPath,
  setPath,
} from "@/components/library/VariantSampleEditor";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import { useStudioAutosave } from "@/hooks/use-studio-autosave";
import { useUndoHistory } from "@/hooks/use-undo-history";
import { BulkStylePanel } from "@/components/library/BulkStylePanel";
import { SaveModuleDialog } from "@/components/SaveModuleDialog";

type SlideMode = SlideModeId;

/** Cell kinds a bento-style module understands. `media` renders imagery. */
const CELL_KINDS = ["feature", "body", "stat", "media"] as const;

/** Sentinel index for the slide's own hero photo (slide-level `mediaUrl`),
 *  used by modules that render imagery without an `items[]` cell. */
const SLIDE_MEDIA = -1;


/** Icon container sizes a curator can pick per cell (iconography tokens). */
const ICON_SIZE_CHOICES = ["xs", "sm", "md", "lg", "xl", "display"] as const;

function blankItem(kind: string): Record<string, unknown> {
  if (kind === "media") return { kind: "media", title: "New imagery", mediaSeed: `media-${Date.now()}`, mediaUrl: "" };
  if (kind === "stat") return { kind: "stat", value: "0", unit: "%", label: "New metric" };
  return { kind, icon: "Layers3", title: "New cell", body: "Supporting detail for this cell." };
}

/* ── Logo cells ───────────────────────────────────────────────────────────
 * Logo-wall / logo-grid modules render client marks from repeating entries
 * that may sit directly in `items` or nested under a group's `logos` array
 * (MV-PROOF-LOGOS-CATEGORIZED). Flatten them in render order so a curator can
 * swap any mark — and so a click on a rendered mark maps back to its cell.
 * ---------------------------------------------------------------------- */

const LOGO_URL_KEYS = ["logoUrl", "logo", "primaryUrl", "logoUrlDark", "logoWhite", "logoPath"] as const;

export type LogoCell = {
  /** Dotted/bracketed path into the copy object, e.g. `items[2]`. */
  path: string;
  name: string;
  /** Light mark URL, when set. */
  url: string;
  darkUrl: string;
  logoPath: string;
  /** True when the slide actually renders an <img> for this cell. */
  rendered: boolean;
};

function collectLogoCells(copy: Record<string, unknown>, logoModule: boolean): LogoCell[] {
  const out: LogoCell[] = [];
  const walk = (list: unknown, prefix: string) => {
    if (!Array.isArray(list)) return;
    list.forEach((raw, i) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      const path = `${prefix}[${i}]`;
      if (Array.isArray(it.logos)) {
        walk(it.logos, `${path}.logos`);
        return;
      }
      const hasLogoKey = LOGO_URL_KEYS.some((k) => typeof it[k] === "string" && String(it[k]).trim());
      if (!hasLogoKey && !logoModule) return;
      const url = String(it.logoUrl ?? it.logo ?? it.primaryUrl ?? "").trim();
      const darkUrl = String(it.logoUrlDark ?? it.logoWhite ?? "").trim();
      const logoPath = String(it.logoPath ?? "").trim();
      out.push({
        path,
        name: String(it.name ?? it.client ?? "").trim(),
        url,
        darkUrl,
        logoPath,
        rendered: Boolean(url || darkUrl || logoPath),
      });
    });
  };
  walk(copy.items, "items");
  walk(copy.logos, "logos");
  return out;
}



export function VariantSampleStudio({
  variant,
  brand,
  brandName,
  sectionId,
  seeded,
  draft,
  onDraftChange,
  hasSavedSample,
  onClose,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  brandName: string;
  sectionId: string;
  /** Generated content with no curated override applied (copy only). */
  seeded: Record<string, unknown>;
  /** Current draft = seeded + saved sample + local edits (may carry reserved keys). */
  draft: Record<string, unknown>;
  onDraftChange: (next: Record<string, unknown> | null) => void;
  hasSavedSample: boolean;
  onClose: () => void;
}) {
  const { save, reset } = useVariantSampleMutations();
  const [liveEdit, setLiveEdit] = useState(true);
  const [mode, setMode] = useState<SlideMode>("light");
  // Alternate-look selection from the library. A pack owns its mode, so the
  // studio previews (and therefore edits) land on that pack's mode layer.
  const pack = useLibraryPack();
  const packBrand = usePackBrand(brand);
  useEffect(() => {
    if (pack) setMode(pack.mode as SlideMode);
  }, [pack]);
  const [showImagery, setShowImagery] = useState(true);
  const [scopeToBrand, setScopeToBrand] = useState(false);
  const [modeOnly, setModeOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<"copy" | "structure" | "bulk" | "history">("copy");
  const [newKind, setNewKind] = useState<string>("body");
  /** Cell selected by clicking its photo / icon on the rendered slide. */
  const [sel, setSel] = useState<{ index: number; kind: "media" | "icon" } | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  /** Index of the imagery cell whose picker modal is open. */
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  /** Index of the cell whose visual icon gallery is open. */
  const [iconPickerFor, setIconPickerFor] = useState<number | null>(null);
  /** Copy path of the logo cell whose logo-hub gallery is open. */
  const [logoPickerFor, setLogoPickerFor] = useState<string | null>(null);

  /** Index of the imagery cell currently being dragged over. */
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  /** Screen-space box of the selected photo, for the drag-to-crop frame. */
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  // Refresh protection: mirror the unsaved draft locally and offer it back.
  const autosaveScope = `${variant.id}:${brand.id}`;
  const autosave = useStudioAutosave(autosaveScope, draft, dirty);
  // Save reads the draft through a ref: a live-edit field that only commits on
  // blur updates state in the same tick as the Save click, so the click-time
  // closure would otherwise publish stale copy.
  const draftRef = useRef(draft);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    draftRef.current = draft;
    dirtyRef.current = dirty;
  }, [draft, dirty]);
  // Linear undo/redo over draft snapshots (every edit funnels through commit).
  const history = useUndoHistory<Record<string, unknown>>({ limit: 60 });




  const { copy: baseCopy, ink: baseInk, modes } = useMemo(
    () => splitSampleContent(draft),
    [draft],
  );
  const layer: SampleModeLayer | undefined = modes[mode];
  /** What the slide actually shows in the mode being previewed. */
  const copy = useMemo(() => applyModeCopy(baseCopy, layer), [baseCopy, layer]);
  const ink = useMemo(() => mergeModeInk(baseInk, layer), [baseInk, layer]);
  const fields = useMemo(() => collectStringPaths(copy), [copy]);
  const items = Array.isArray(copy.items) ? (copy.items as Record<string, unknown>[]) : null;
  const isLogoModule = /LOGO/i.test(variant.id);
  const logoCells = useMemo(() => collectLogoCells(copy, isLogoModule), [copy, isLogoModule]);
  const capacity = variant.capacity?.items;
  const busy = save.isPending || reset.isPending;
  /** Confirmation state: when the last publish landed, for the "Saved" badge. */
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Browser-level guard: never let unsaved studio edits leave silently.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!justSaved) return;
    const t = window.setTimeout(() => setJustSaved(false), 4000);
    return () => window.clearTimeout(t);
  }, [justSaved]);



  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A picker modal owns Escape while it is open — closing the whole
      // studio out from under it would drop the edit in progress.
      if (pickerFor !== null || iconPickerFor !== null || logoPickerFor !== null) return;
      // While live editing, Escape should only blur the focused field.
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable) {
        el.blur();
        return;
      }
      requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });


  // ⌘S / Ctrl+S publishes the draft.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable) el.blur();
      if (!busy) void handleSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });


  // ⌘Z / Ctrl+Z undo, ⇧⌘Z or Ctrl+Y redo — works while live editing too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      e.preventDefault();
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable) el.blur();
      if (key === "y" || e.shiftKey) doRedo();
      else doUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Click a photo, an icon or a client logo on the slide ──────────────
  // Photos render through MediaTile (`data-media-tile`), icons through
  // IconBadge (`data-icon-well`) and client marks through ClientLogoImg
  // (`data-logo-tile`); none carries editable text, so a capture-phase
  // handler here never steals a LiveEditOverlay text click.
  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const renderedLogos = logoCells.filter((cell) => cell.rendered);
    const mediaIdx = (items ?? []).flatMap((it, i) => (String(it.kind) === "media" ? [i] : []));
    const iconIdx = (items ?? []).flatMap((it, i) => (String(it.kind) === "media" ? [] : [i]));
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-crop-overlay]")) return;
      const logo = t.closest("[data-logo-tile]");
      const tile = logo ? null : t.closest("[data-media-tile]");
      const well = logo || tile ? null : t.closest("[data-icon-well]");
      if (!logo && !tile && !well) return;
      e.preventDefault();
      e.stopPropagation();
      if (logo) {
        const order = Array.from(root.querySelectorAll("[data-logo-tile]"));
        const cell = renderedLogos[order.indexOf(logo)];
        if (!cell) return;
        setTab("structure");
        setLogoPickerFor(cell.path);
        return;
      }
      const hit = (tile ?? well) as Element;
      const selector = tile ? "[data-media-tile]" : "[data-icon-well]";
      const order = Array.from(root.querySelectorAll(selector));
      const mapped = (tile ? mediaIdx : iconIdx)[order.indexOf(hit)];
      // Hero-style modules render their photo from slide-level copy
      // (`mediaUrl`) rather than an `items[]` cell — address those with the
      // SLIDE_MEDIA sentinel so click-to-replace and crop still work.
      const index = mapped ?? (tile ? SLIDE_MEDIA : undefined);
      if (index === undefined) return;
      setSel({ index, kind: tile ? "media" : "icon" });
      setTab("structure");
      // Clicking a photo opens the image picker; an icon opens the gallery.
      if (tile) setPickerFor(index);
      else setIconPickerFor(index);
    };
    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [items, logoCells]);

  // ── Double-click any photo on the slide → open the image picker ────────
  // Single click already selects + opens, but double-click is the muscle
  // memory people bring from design tools, and it also catches photos that
  // render as a bare <img> outside a MediaTile wrapper.
  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const mediaIdx = (items ?? []).flatMap((it, i) => (String(it.kind) === "media" ? [i] : []));
    const onDouble = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("[data-crop-overlay]")) return;
      if (t.closest("[data-logo-tile]") || t.closest("[data-icon-well]")) return;
      const tile = t.closest("[data-media-tile]");
      const img = tile ? null : (t.closest("img") ?? (t.tagName === "IMG" ? t : null));
      if (!tile && !img) return;
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable) el.blur();
      e.preventDefault();
      e.stopPropagation();
      let index: number | undefined;
      if (tile) {
        const order = Array.from(root.querySelectorAll("[data-media-tile]"));
        index = mediaIdx[order.indexOf(tile)];
      } else {
        // Bare photo: map to the nearest media cell, else the first one.
        const tiles = Array.from(root.querySelectorAll("[data-media-tile]"));
        const owner = tiles.find((n) => n.contains(img as Node));
        index = owner ? mediaIdx[tiles.indexOf(owner)] : mediaIdx[0];
      }
      if (index === undefined) index = SLIDE_MEDIA;
      setSel({ index, kind: "media" });
      setTab("structure");
      setPickerFor(index);
    };
    root.addEventListener("dblclick", onDouble, true);
    return () => root.removeEventListener("dblclick", onDouble, true);
  }, [items]);

  // ── Measure the selected photo so the crop frame can sit on top of it ──
  // Recomputed on selection, content change and stage resize; the rect is in
  // the stage container's coordinate space (which is `relative`).
  useEffect(() => {
    const root = stageRef.current;
    if (!root || !sel || sel.kind !== "media") {
      setCropRect(null);
      return;
    }
    const mediaIdx = (items ?? []).flatMap((it, i) => (String(it.kind) === "media" ? [i] : []));
    const measure = () => {
      const tiles = Array.from(root.querySelectorAll("[data-media-tile]"));
      const tile =
        sel.index === SLIDE_MEDIA ? tiles[0] : tiles[mediaIdx.indexOf(sel.index)];
      if (!tile) {
        setCropRect(null);
        return;
      }
      const a = tile.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      setCropRect({
        left: a.left - b.left,
        top: a.top - b.top,
        width: a.width,
        height: a.height,
      });
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
    };
  }, [items, sel]);

  const cropItem =
    sel && sel.kind === "media"
      ? sel.index === SLIDE_MEDIA
        ? copy
        : items
          ? (items[sel.index] as Record<string, unknown>)
          : null
      : null;



  // Bring the selected cell's editor into view after a stage click.

  useEffect(() => {
    if (!sel || sel.index === SLIDE_MEDIA) return;
    cardRefs.current[sel.index]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);


  /** Every draft mutation funnels through here, so undo covers all of them. */
  const commit = (
    next: Record<string, unknown>,
    label = "Edit",
    coalesceKey?: string,
  ) => {
    history.push(structuredClone(draft ?? {}), label, coalesceKey);
    onDraftChange(next);
    setDirty(true);
  };

  const applyHistory = (entry: { value: Record<string, unknown>; label: string } | null, verb: string) => {
    if (!entry) return;
    onDraftChange(structuredClone(entry.value));
    setDirty(true);
    toast.message(`${verb} · ${entry.label}`);
  };

  const doUndo = () => applyHistory(history.undo(structuredClone(draft ?? {})), "Undone");
  const doRedo = () => applyHistory(history.redo(structuredClone(draft ?? {})), "Redone");

  const writeModes = (next: SampleModes, label = "Appearance override", coalesceKey?: string) =>
    commit({ ...draft, [MODES_KEY]: next }, label, coalesceKey);

  const patchLayer = (
    updates: Partial<SampleModeLayer>,
    label = "Appearance override",
    coalesceKey?: string,
  ) => writeModes({ ...modes, [mode]: { ...(layer ?? {}), ...updates } }, label, coalesceKey);

  /** Set a copy field, honouring the appearance scope toggle. */
  const setField = (path: string, value: unknown) => {
    const label = `Text · ${fieldLabel(path)}`;
    if (modeOnly) {
      patchLayer(
        { copy: { ...(layer?.copy ?? {}), [path]: value } },
        label,
        `${mode}:copy:${path}`,
      );
      return;
    }
    commit({ ...draft, ...setPath(baseCopy, path, value) }, label, `copy:${path}`);
  };

  /** Drop a light-only / dark-only override so the shared value shows again. */
  const clearModeField = (path: string) => {
    const nextCopy = { ...(layer?.copy ?? {}) };
    delete nextCopy[path];
    patchLayer({ copy: nextCopy }, `Clear ${mode} override · ${fieldLabel(path)}`);
  };

  const setInk = (path: string, color: string | null) => {
    const label = `Colour · ${fieldLabel(path)}`;
    if (modeOnly) {
      const map = { ...(layer?.ink ?? {}) };
      if (color) map[path] = color;
      else delete map[path];
      patchLayer({ ink: map }, label, `${mode}:ink:${path}`);
      return;
    }
    const map = { ...(baseInk.inkOverrides ?? {}) };
    if (color) map[path] = color;
    else delete map[path];
    commit({ ...draft, [INK_KEY]: map }, label, `ink:${path}`);
  };

  const setInkScope = (scope: string, color: string | null) => {
    const label = `Colour · ${scope}`;
    if (modeOnly) {
      const map = { ...(layer?.inkScope ?? {}) };
      if (color) map[scope] = color;
      else delete map[scope];
      patchLayer({ inkScope: map }, label, `${mode}:inkScope:${scope}`);
      return;
    }
    const map = { ...(baseInk.inkScopeOverrides ?? {}) };
    if (color) map[scope] = color;
    else delete map[scope];
    commit({ ...draft, [INK_SCOPE_KEY]: map }, label, `inkScope:${scope}`);
  };

  /** Structure edits always write the shared item list — a mode may restyle
   *  copy, but both modes render the same set of cells. */
  const writeItems = (
    next: Record<string, unknown>[],
    label = "Sections",
    coalesceKey?: string,
  ) => commit({ ...draft, ...setPath(baseCopy, "items", next) }, label, coalesceKey);

  /** The shared (mode-agnostic) cell list. `items` is the mode-resolved view
   *  used for rendering; writes must go through this one so a light-only or
   *  dark-only text override never leaks into the shared payload. */
  const baseItems = Array.isArray(baseCopy.items)
    ? (baseCopy.items as Record<string, unknown>[])
    : null;
  /** Cells to write against — falls back to the rendered list if shapes drift. */
  const writableItems = () =>
    baseItems && items && baseItems.length === items.length ? baseItems : items;


  const addItem = (kind: string) => {
    if (!items) return;
    if (capacity?.max && items.length >= capacity.max) {
      toast.warning(`${variant.name} renders at most ${capacity.max} cells`, {
        description: "Extra cells are stored but may not appear on the slide.",
      });
    }
    writeItems([...(writableItems() ?? []), blankItem(kind)], `Add ${kind} cell`);
  };

  const removeItem = (index: number) => {
    if (!items) return;
    if (capacity?.min && items.length <= capacity.min) {
      toast.warning(`${variant.name} expects at least ${capacity.min} cells`, {
        description: "Removing more may leave gaps in the layout.",
      });
    }
    writeItems((writableItems() ?? []).filter((_, i) => i !== index), "Remove cell");
  };

  const moveItem = (index: number, delta: number) => {
    if (!items) return;
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...(writableItems() ?? [])];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row as Record<string, unknown>);
    writeItems(next, "Reorder cells");
  };

  const setItemField = (index: number, key: string, value: unknown) => {
    if (index === SLIDE_MEDIA) {
      patchItem(SLIDE_MEDIA, { [key]: value });
      return;
    }
    const rows = writableItems();
    if (!rows) return;
    writeItems(rows.map((it, i) => (i === index ? { ...it, [key]: value } : it)));
  };

  /** `coalesceKey` collapses rapid patches (crop dragging) into one undo step. */
  const patchItem = (
    index: number,
    patch: Record<string, unknown>,
    coalesceKey?: string,
  ) => {
    // SLIDE_MEDIA addresses the slide's own hero photo, which lives on the
    // top-level copy object instead of an `items[]` cell.
    if (index === SLIDE_MEDIA) {
      let next = baseCopy;
      for (const [k, v] of Object.entries(patch)) next = { ...next, ...setPath(next, k, v) };
      commit({ ...draft, ...next }, coalesceKey ? "Crop" : "Image", coalesceKey);
      return;
    }
    const rows = writableItems();
    if (!rows) return;
    writeItems(
      rows.map((it, i) => (i === index ? { ...it, ...patch } : it)),
      coalesceKey ? "Crop" : "Sections",
      coalesceKey,
    );
  };

  /** Merge a patch into a logo cell addressed by copy path (`items[2]`,
   *  `items[0].logos[1]`, …) so nested logo-wall groups work too. */
  const patchLogoCell = (path: string, patch: Record<string, unknown>, label = "Logo") => {
    const current = (readPath(copy, path) ?? {}) as Record<string, unknown>;
    commit({ ...draft, ...setPath(baseCopy, path, { ...current, ...patch }) }, label);
  };


  /** Replace a cell's photo with an uploaded file. Stores both the signed URL
   *  and the storage path so the image is re-signed after the URL's TTL. */
  async function replaceImage(index: number, file: File) {
    setUploading(index);
    try {
      const up = await uploadSlideMedia(file, file.name);
      patchItem(index, { mediaUrl: up.signedUrl, mediaPath: up.path });
      toast.success("Image replaced", { description: file.name });
    } catch (err) {
      toast.error("Could not upload image", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(null);
    }
  }


  const previewSlide: DeckSlide = {
    id: `${variant.id}:studio`,
    position: 0,
    sectionId,
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0] as string,
    content: copy,
    changes: [],
  } as DeckSlide;

  const backdrop = useMemo(
    () =>
      pack
        ? null
        : mode === "dark" || showImagery
          ? backdropForVariant(variant, brand.id, mode)
          : null,
    [variant, brand.id, mode, showImagery, pack],
  );

  /** Push any in-progress on-slide edit into state before publishing. Live
   *  edits commit on blur, so without this a user who types on the slide and
   *  clicks Save straight away would save the previous copy. */
  async function flushLiveEdits() {
    const el = document.activeElement as HTMLElement | null;
    if (el?.isContentEditable) {
      el.blur();
      // Let the blur commit land in React state (and reach draftRef).
      await new Promise((r) => window.setTimeout(r, 60));
    }
  }

  async function handleSave() {
    await flushLiveEdits();
    if (!dirtyRef.current) {
      toast.info("Nothing to save", {
        description: "Edit the copy, imagery, or colours first — then save.",
      });
      return;
    }
    try {
      await save.mutateAsync({
        variantId: variant.id,
        brandModeId: scopeToBrand ? brand.id : ALL_BRANDS,
        content: draftRef.current,
      });
      setDirty(false);
      setSavedAt(Date.now());
      setJustSaved(true);
      autosave.clear();
      toast.success("Sample slide saved", {
        description: scopeToBrand ? `Applies to ${brandName} only` : "Applies to every brand mode",
      });
    } catch (err) {
      toast.error("Could not save sample", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  /** Save-then-close, so a curator can never lose edits by hitting ✕. */
  async function handleSaveAndClose() {
    await flushLiveEdits();
    try {
      await save.mutateAsync({
        variantId: variant.id,
        brandModeId: scopeToBrand ? brand.id : ALL_BRANDS,
        content: draftRef.current,
      });
      setDirty(false);
      autosave.clear();
      toast.success("Saved — closing studio");
      onClose();
    } catch (err) {
      toast.error("Could not save sample", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  /** Closing with unsaved edits asks first (draft is also mirrored locally). */
  function requestClose() {
    if (!dirty) {
      onClose();
      return;
    }
    const ok = window.confirm(
      "You have unsaved changes to this slide.\n\nOK = save and close · Cancel = keep editing.",
    );
    if (ok) void handleSaveAndClose();
  }


  async function handleReset() {
    try {
      await reset.mutateAsync({
        variantId: variant.id,
        brandModeId: scopeToBrand ? brand.id : ALL_BRANDS,
      });
      onDraftChange(null);
      setDirty(false);
      autosave.clear();
      history.clear();
      toast.success("Reverted to generated sample");
    } catch (err) {
      toast.error("Could not reset sample", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[11px] font-medium transition ${
      active
        ? "border-white/80 bg-white text-[#03002C]"
        : "border-white/25 bg-white/5 text-white/70 hover:border-white/50 hover:text-white"
    }`;

  const modeLayerCount =
    Object.keys(layer?.copy ?? {}).length +
    Object.keys(layer?.ink ?? {}).length +
    Object.keys(layer?.inkScope ?? {}).length;

  const studio = (
    <div
      role="dialog"
      aria-label={`Slide studio · ${variant.name}`}
      className="fixed inset-0 z-[200] flex flex-col bg-[#03002C]/96 backdrop-blur-xl"
    >
      {/* Always-visible exit, even if the toolbar wraps on small screens */}
      <button
        type="button"
        onClick={requestClose}
        aria-label="Exit slide studio and return to the library"
        className="fixed right-4 top-4 z-[210] rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#03002C] shadow-lg hover:bg-[#E0E8F5]"
      >
        ✕ Exit to library
      </button>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3 pr-40">
        <div className="mr-auto min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
            Slide studio · {variant.id}
          </div>
          <div className="truncate text-sm font-semibold text-white">{variant.name}</div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                save.isPending
                  ? "animate-pulse bg-[#FFEB66]"
                  : dirty
                    ? "bg-[#FF9B70]"
                    : "bg-[#A6FA87]"
              }`}
            />
            <span role="status" aria-live="polite" className="text-white/45">
              {save.isPending
                ? "Saving…"
                : dirty
                  ? autosave.lastSavedAt
                    ? `Unsaved · draft kept locally ${new Date(autosave.lastSavedAt).toLocaleTimeString()}`
                    : "Unsaved changes — press ⌘S to save"
                  : savedAt
                    ? `Saved ${new Date(savedAt).toLocaleTimeString()} · safe to leave`
                    : "All changes published"}
            </span>
          </div>

        </div>


        <div className="flex overflow-hidden rounded-full border border-white/25">
          <button
            type="button"
            onClick={doUndo}
            disabled={!history.canUndo}
            title={history.undoLabel ? `Undo: ${history.undoLabel} (⌘Z)` : "Nothing to undo"}
            className="px-3 py-1 text-[11px] text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            ↶ Undo{history.depth > 0 ? ` ${history.depth}` : ""}
          </button>
          <span className="w-px bg-white/15" aria-hidden="true" />
          <button
            type="button"
            onClick={doRedo}
            disabled={!history.canRedo}
            title={history.redoLabel ? `Redo: ${history.redoLabel} (⇧⌘Z)` : "Nothing to redo"}
            className="px-3 py-1 text-[11px] text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            ↷ Redo
          </button>
        </div>
        <button type="button" onClick={() => setLiveEdit((v) => !v)} className={pill(liveEdit)}>
          ✎ Live edit {liveEdit ? "on" : "off"}
        </button>
        <div className="flex overflow-hidden rounded-full border border-white/25">
          <button
            type="button"
            onClick={() => setMode("light")}
            aria-pressed={mode === "light"}
            className={`px-3 py-1 text-[11px] ${mode === "light" ? "bg-white text-[#03002C]" : "text-white/65"}`}
          >
            ☀ Light
          </button>
          <button
            type="button"
            onClick={() => setMode("dark")}
            aria-pressed={mode === "dark"}
            className={`px-3 py-1 text-[11px] ${mode === "dark" ? "bg-white text-[#03002C]" : "text-white/65"}`}
          >
            ☾ Dark
          </button>
        </div>
        <button
          type="button"
          onClick={() => setModeOnly((v) => !v)}
          aria-pressed={modeOnly}
          className={pill(modeOnly)}
          title="New edits apply only to the mode you are previewing"
        >
          {modeOnly ? `◐ ${mode}-only edits` : "◐ Shared edits"}
        </button>
        <button
          type="button"
          onClick={() => setShowImagery((v) => !v)}
          aria-pressed={showImagery}
          className={pill(showImagery)}
        >
          ▤ Imagery
        </button>
        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          title="Save sample (⌘S)"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-100 ${
            !dirty && justSaved ? "bg-[#0F8A4A]" : "bg-[#003FC7] disabled:opacity-40"
          }`}
        >
          {save.isPending ? "Saving…" : !dirty && justSaved ? "✓ Saved" : "Save sample"}
        </button>
        <button
          type="button"
          onClick={async () => {
            await flushLiveEdits();
            setSaveToFiles(true);
          }}
          title="Save this slide to My Files as your own module"
          className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white/85 hover:border-white/60 hover:text-white"
        >
          ⤓ Save to My Files
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={busy || (!hasSavedSample && !dirty)}
          className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white/75 hover:border-red-400/70 hover:text-red-300 disabled:opacity-40"
        >
          {reset.isPending ? "Resetting…" : "Reset"}
        </button>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close slide studio"
          className="rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/75 hover:border-white/60 hover:text-white"
        >
          ✕ Close

        </button>
      </div>

      {/* Recovered autosave: the user chooses, we never swap silently. */}
      {autosave.pending && !dirty && (
        <div className="flex flex-wrap items-center gap-3 border-b border-[#FFEB66]/25 bg-[#FFEB66]/10 px-5 py-2.5 text-[11px] text-[#FFEB66]">
          <span>
            Unsaved draft recovered from{" "}
            {new Date(autosave.pending.savedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </span>
          <button
            type="button"
            onClick={() => {
              const recovered = autosave.pending?.content;
              if (!recovered) return;
              commit(structuredClone(recovered));
              autosave.dismiss();
              toast.success("Draft restored", {
                description: "Review the slide, then Save sample to publish it.",
              });
            }}
            className="rounded-full bg-[#FFEB66] px-3 py-1 font-semibold text-[#03002C]"
          >
            ↺ Restore draft
          </button>
          <button
            type="button"
            onClick={autosave.clear}
            className="rounded-full border border-[#FFEB66]/40 px-3 py-1 font-medium hover:bg-[#FFEB66]/15"
          >
            Discard
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 lg:flex-row">

        {/* Stage */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            ref={stageRef}
            className={`relative w-full max-w-[1400px] overflow-hidden rounded-xl border shadow-2xl ${
              mode === "dark" ? "border-white/15 bg-[#03002C]" : "border-black/10 bg-white"
            }`}
          
            style={pack ? { background: pack.tokens.surface } : undefined}
          >
            {/* Hover affordance: photos and icons are click-to-edit targets. */}
            <style>{`
              [data-media-tile], [data-icon-well] { cursor: pointer; }
              [data-media-tile]:hover, [data-icon-well]:hover {
                outline: 2px dashed rgba(161,251,249,0.95);
                outline-offset: -2px;
              }
            `}</style>

            <LiveEditOverlay
              enabled={liveEdit}
              slideId={`${previewSlide.id}:${mode}`}
              content={copy}
              editableFields={variant.editableFields}
              inkOverrides={ink.inkOverrides}
              inkScopeOverrides={ink.inkScopeOverrides}
              onChange={(cp, value) => setField(cp, value)}
              onSetInkColor={(cp, color) => setInk(cp, color)}
              onClearInkColor={(cp) => setInk(cp, null)}
              onSetInkScopeColor={(sc, color) => setInkScope(sc, color)}
              onClearInkScopeColor={(sc) => setInkScope(sc, null)}
            >
              <ScaledSlide className={mode === "dark" ? "bg-[#03002C]" : "bg-white"}>
                <SlideBackdropContext.Provider value={backdrop}>
                  <PackShell>
                    <VariantRenderer
                      slide={previewSlide}
                      variant={variant}
                      brand={packBrand}
                      pageNumber={1}
                      mode={mode}
                    />
                  </PackShell>
                </SlideBackdropContext.Provider>
              </ScaledSlide>
            </LiveEditOverlay>

            {/* Drag-to-crop frame over the selected photo */}
            {cropRect && cropItem ? (
              <div data-crop-overlay="" className="pointer-events-none absolute inset-0">
                <CropFrameOverlay
                  rect={cropRect}
                  focus={String(cropItem.mediaFocus ?? "") || undefined}
                  zoom={Number(cropItem.mediaZoom) || 1}
                  onChange={(next) => sel && patchItem(sel.index, next, `crop:${sel.index}`)}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Inspector */}
        <aside className="min-h-0 w-full shrink-0 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] p-4 lg:w-[360px]">
          <div className="flex gap-1 rounded-full border border-white/15 bg-[#03002C]/50 p-1 text-[11px]">
            {(["copy", "structure", "bulk", "history"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-pressed={tab === t}
                className={`flex-1 rounded-full px-3 py-1 capitalize transition ${
                  tab === t ? "bg-white font-semibold text-[#03002C]" : "text-white/65 hover:text-white"
                }`}
              >
                {t === "copy"
                  ? "Copy"
                  : t === "structure"
                    ? "Sections"
                    : t === "bulk"
                      ? "Bulk"
                      : "History"}
              </button>
            ))}
          </div>


          <div className="mt-3 rounded-lg border border-white/10 bg-[#03002C]/40 p-3 text-[11px] text-white/60">
            <div className="font-semibold uppercase tracking-widest text-white/45">Save scope</div>
            <label className="mt-2 flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={scopeToBrand}
                onChange={(e) => setScopeToBrand(e.target.checked)}
              />
              <span className="font-semibold text-white">{brandName}</span> only
            </label>
            <label className="mt-1.5 flex items-center gap-2 text-white/70">
              <input
                type="checkbox"
                checked={modeOnly}
                onChange={(e) => setModeOnly(e.target.checked)}
              />
              New copy / colour edits apply to <span className="font-semibold text-white">{mode}</span>{" "}
              mode only
            </label>
            {modeLayerCount > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-[#A1FBF9]/15 px-2 py-0.5 text-[10px] text-[#A1FBF9]">
                  {modeLayerCount} {mode}-only override{modeLayerCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => writeModes({ ...modes, [mode]: {} })}
                  className="text-[10px] underline decoration-dotted hover:text-white"
                >
                  clear all
                </button>
              </div>
            )}
          </div>

          {tab === "bulk" ? (
            <BulkStylePanel
              variant={variant}
              brand={brand}
              brandName={brandName}
              sectionId={sectionId}
              draft={draft ?? {}}
              scopeToBrand={scopeToBrand}
            />
          ) : tab === "history" ? (
            <SampleHistoryPanel
              variantId={variant.id}
              brandModeId={scopeToBrand ? brand.id : ALL_BRANDS}
              current={draft ?? {}}
              onRestore={(content) => {
                commit(structuredClone(content));
                setTab("copy");
                toast.success("Snapshot loaded", {
                  description: "Review the slide, then Save sample to publish it.",
                });
              }}
            />
          ) : tab === "copy" ? (
            <>
              <p className="mt-3 text-[11px] text-white/50">
                {liveEdit
                  ? "Click any text on the slide to edit in place, or type here."
                  : "Live edit is off — type here to change copy."}
              </p>
              <div className="mt-3 space-y-2">
                {fields.length === 0 && (
                  <p className="text-[11px] text-white/45">
                    This module has no editable text fields.
                  </p>
                )}
                {fields.map((path) => {
                  const value = String(readPath(copy, path) ?? "");
                  const seedValue = String(readPath(seeded, path) ?? "");
                  const changed = value !== seedValue;
                  const isModeOverride = layer?.copy && path in layer.copy;
                  const color = ink.inkOverrides?.[path];
                  return (
                    <div key={path}>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
                        <span className="truncate">{fieldLabel(path)}</span>
                        {isModeOverride && (
                          <span className="rounded-full bg-[#A1FBF9]/15 px-1.5 text-[9px] normal-case tracking-normal text-[#A1FBF9]">
                            {mode}
                          </span>
                        )}
                        {color && (
                          <span
                            aria-label={`Colour ${color}`}
                            className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/40"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        <span className="ml-auto flex items-center gap-1">
                          {isModeOverride && (
                            <button
                              type="button"
                              onClick={() => clearModeField(path)}
                              className="rounded-full border border-white/20 px-1.5 text-[9px] text-white/60 hover:border-white/50 hover:text-white"
                              title={`Drop the ${mode}-only value and use the shared one`}
                            >
                              unlink
                            </button>
                          )}
                          {changed && !isModeOverride && (
                            <button
                              type="button"
                              onClick={() => setField(path, seedValue)}
                              className="rounded-full border border-white/20 px-1.5 text-[9px] text-white/60 hover:border-white/50 hover:text-white"
                              title="Revert this field to the generated copy"
                            >
                              revert
                            </button>
                          )}
                        </span>
                      </div>
                      <textarea
                        value={value}
                        rows={value.length > 70 ? 3 : 1}
                        onChange={(e) => setField(path, e.target.value)}
                        className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-[#03002C]/60 px-2.5 py-1.5 text-sm text-white focus:border-[#A1FBF9] focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {logoCells.length > 0 && (
                <div className="mt-3 rounded-lg border border-white/12 bg-[#03002C]/45 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest text-white/45">
                      Client logos
                    </span>
                    <span className="ml-auto text-[10px] text-white/35">
                      {logoCells.length} mark{logoCells.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">
                    Click any mark on the slide, or a tile below, to swap it from the logo hub.
                  </p>
                  <ul className="mt-2 grid grid-cols-3 gap-1.5">
                    {logoCells.map((cell) => {
                      const preview = mode === "dark" ? cell.darkUrl || cell.url : cell.url || cell.darkUrl;
                      return (
                        <li key={cell.path}>
                          <button
                            type="button"
                            onClick={() => setLogoPickerFor(cell.path)}
                            title={cell.name || cell.path}
                            className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-white/12 bg-white/[0.05] p-1.5 transition hover:border-[#A1FBF9]/70 hover:bg-white/[0.1]"
                          >
                            <span className="flex h-10 w-full items-center justify-center rounded bg-white/90 p-1">
                              {preview ? (
                                <img
                                  src={preview}
                                  alt={cell.name ? `${cell.name} logo` : "Client logo"}
                                  loading="lazy"
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <span className="text-[9px] uppercase tracking-widest text-[#03002C]/50">
                                  empty
                                </span>
                              )}
                            </span>
                            <span className="w-full truncate text-center text-[10px] text-white/60">
                              {cell.name || "Unnamed"}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {!items ? (
                <p className="mt-3 text-[11px] text-white/45">
                  This module has no repeating cells to add or remove.
                </p>
              ) : (
                <>
                  <p className="mt-3 text-[11px] text-white/50">
                    Click a photo, an icon or a logo on the slide to jump to its cell, then
                    replace, swap or resize it. {capacity?.max ? `${variant.name} renders ${capacity.min ?? 1}–${capacity.max} cells.` : ""}
                  </p>

                  {/* Global type scale — one setting per role so numerals, titles
                      and sub-text stay identical at any step count. */}
                  {variant.id === "MV-PROC-STEP-CHAIN" && (
                    <div className="mt-3 rounded-lg border border-white/12 bg-[#03002C]/45 p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase tracking-widest text-white/40">
                          Global type scale
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setField("stepNumeralPct", 100);
                            setField("stepTitlePct", 100);
                            setField("stepBodyPct", 100);
                          }}
                          className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] text-white/60 hover:text-white"
                        >
                          reset
                        </button>
                      </div>
                      {(
                        [
                          ["stepNumeralPct", "Numerals / icons"],
                          ["stepTitlePct", "Titles"],
                          ["stepBodyPct", "Sub-text"],
                        ] as const
                      ).map(([path, label]) => {
                        const value = Number((copy as Record<string, unknown>)[path]) || 100;
                        return (
                          <label key={path} className="mt-2 flex items-center gap-2">
                            <span className="w-24 text-[10px] uppercase tracking-widest text-white/40">
                              {label}
                            </span>
                            <input
                              type="range"
                              min={50}
                              max={200}
                              step={5}
                              value={value}
                              onChange={(e) => setField(path, Number(e.target.value))}
                              className="h-1 flex-1 accent-[#A1FBF9]"
                            />
                            <span className="w-10 text-right text-[10px] tabular-nums text-white/60">
                              {value}%
                            </span>
                          </label>
                        );
                      })}
                      <p className="mt-2 text-[10px] leading-snug text-white/40">
                        Applies to every step, so 3-step and 9-step chains read at the same
                        size. Text still shrinks on narrow canvases to avoid overlap.
                      </p>
                    </div>
                  )}



                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={newKind}
                      onChange={(e) => setNewKind(e.target.value)}
                      aria-label="New cell type"
                      className="flex-1 rounded-lg border border-white/15 bg-[#03002C]/60 px-2 py-1.5 text-xs text-white"
                    >
                      {CELL_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k === "media" ? "Imagery cell" : `${k} cell`}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addItem(newKind)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#03002C]"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {items.map((it, i) => {
                      const kind = String(it.kind ?? "body");
                      const isMedia = kind === "media";
                      const selected = sel?.index === i;
                      return (
                        <div
                          key={i}
                          ref={(el) => {
                            cardRefs.current[i] = el;
                          }}
                          className={`rounded-lg border bg-[#03002C]/45 p-2.5 transition ${
                            selected
                              ? "border-[#A1FBF9]/70 ring-1 ring-[#A1FBF9]/40"
                              : "border-white/12"
                          }`}
                        >

                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-white/40">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <select
                              value={CELL_KINDS.includes(kind as never) ? kind : "body"}
                              onChange={(e) => setItemField(i, "kind", e.target.value)}
                              aria-label={`Cell ${i + 1} type`}
                              className="rounded border border-white/15 bg-[#03002C] px-1.5 py-0.5 text-[11px] text-white"
                            >
                              {CELL_KINDS.map((k) => (
                                <option key={k} value={k}>
                                  {k === "media" ? "imagery" : k}
                                </option>
                              ))}
                            </select>
                            <span className="ml-auto flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveItem(i, -1)}
                                aria-label={`Move cell ${i + 1} up`}
                                className="rounded border border-white/15 px-1 text-[10px] text-white/60 hover:text-white"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(i, 1)}
                                aria-label={`Move cell ${i + 1} down`}
                                className="rounded border border-white/15 px-1 text-[10px] text-white/60 hover:text-white"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(i)}
                                aria-label={`Remove cell ${i + 1}`}
                                className="rounded border border-white/15 px-1.5 text-[10px] text-white/60 hover:border-red-400/70 hover:text-red-300"
                              >
                                ✕
                              </button>
                            </span>
                          </div>

                          <input
                            value={String(it.title ?? "")}
                            onChange={(e) => setItemField(i, "title", e.target.value)}
                            placeholder={isMedia ? "Imagery caption" : "Cell title"}
                            className="mt-2 w-full rounded border border-white/15 bg-[#03002C]/70 px-2 py-1 text-xs text-white focus:border-[#A1FBF9] focus:outline-none"
                          />

                          {isMedia ? (
                            <>
                              {/* Thumbnail: click to pick, or drop a file on it. */}
                              <button
                                type="button"
                                onClick={() => setPickerFor(i)}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  setDropTarget(i);
                                }}
                                onDragLeave={() => setDropTarget((v) => (v === i ? null : v))}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDropTarget(null);
                                  const file = e.dataTransfer.files?.[0];
                                  if (file) void replaceImage(i, file);
                                }}
                                aria-label={`Choose image for cell ${i + 1}`}
                                className={`mt-1.5 flex w-full items-center gap-2 overflow-hidden rounded-lg border px-2 py-2 text-left transition ${
                                  dropTarget === i
                                    ? "border-[#A1FBF9] bg-[#A1FBF9]/10"
                                    : "border-white/15 bg-[#03002C]/70 hover:border-[#A1FBF9]/70"
                                }`}
                              >
                                {it.mediaUrl ? (
                                  <img
                                    src={String(it.mediaUrl)}
                                    alt=""
                                    className="h-12 w-16 shrink-0 rounded object-cover"
                                  />
                                ) : (
                                  <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded border border-dashed border-white/20 text-[10px] text-white/40">
                                    curated
                                  </span>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[11px] font-semibold text-white">
                                    {uploading === i
                                      ? "Uploading…"
                                      : it.mediaUrl
                                        ? "Replace image"
                                        : "Select image"}
                                  </span>
                                  <span className="block truncate text-[10px] text-white/45">
                                    {dropTarget === i
                                      ? "Drop to upload"
                                      : "Click here or double-click the photo on the slide"}
                                  </span>
                                </span>
                              </button>
                              {Boolean(it.mediaUrl || it.mediaPath) && (
                                <button
                                  type="button"
                                  onClick={() => patchItem(i, { mediaUrl: "", mediaPath: "" })}
                                  title="Drop the uploaded image and use curated photography"
                                  className="mt-1.5 rounded border border-white/20 px-2 py-1 text-[10px] text-white/70 hover:border-red-400/70 hover:text-red-300"
                                >
                                  clear image
                                </button>
                              )}

                              <div className="mt-1.5 flex items-center gap-1.5">
                                <input
                                  value={String(it.mediaSeed ?? "")}
                                  onChange={(e) => setItemField(i, "mediaSeed", e.target.value)}
                                  placeholder="Imagery seed"
                                  className="flex-1 rounded border border-white/15 bg-[#03002C]/70 px-2 py-1 text-xs text-white focus:border-[#A1FBF9] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setItemField(i, "mediaSeed", `media-${Math.random().toString(36).slice(2, 8)}`)
                                  }
                                  title="Shuffle the curated photo for this cell"
                                  className="rounded border border-white/20 px-2 py-1 text-[10px] text-white/70 hover:text-white"
                                >
                                  ⟳ Shuffle
                                </button>
                              </div>
                              {/* Enlarge / crop in on the photo inside its cell. */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
                                  <span>Image size</span>
                                  <span className="tabular-nums text-white/60">
                                    {(Number(it.mediaZoom) || 1).toFixed(2)}×
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <input
                                    type="range"
                                    min={1}
                                    max={2.5}
                                    step={0.05}
                                    value={Number(it.mediaZoom) || 1}
                                    aria-label={`Cell ${i + 1} image size`}
                                    onChange={(e) => setItemField(i, "mediaZoom", Number(e.target.value))}
                                    className="flex-1 accent-[#A1FBF9]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setItemField(i, "mediaZoom", 1)}
                                    className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] text-white/60 hover:text-white"
                                  >
                                    reset
                                  </button>
                                </div>
                              </div>

                              {/* Fit: crop to fill, or show the whole frame. */}
                              <div className="mt-2">
                                <div className="text-[10px] uppercase tracking-widest text-white/40">
                                  Fit
                                </div>
                                <div className="mt-1 flex overflow-hidden rounded-full border border-white/20">
                                  {(
                                    [
                                      ["cover", "Crop to fill"],
                                      ["contain", "Show whole image"],
                                    ] as const
                                  ).map(([value, label]) => {
                                    const active = (String(it.mediaFit ?? "cover") || "cover") === value;
                                    return (
                                      <button
                                        key={value}
                                        type="button"
                                        title={label}
                                        aria-pressed={active}
                                        onClick={() => setItemField(i, "mediaFit", value)}
                                        className={`flex-1 px-2 py-1 text-[10px] ${
                                          active ? "bg-white text-[#03002C]" : "text-white/65 hover:text-white"
                                        }`}
                                      >
                                        {value === "cover" ? "▣ Cover" : "▢ Contain"}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Focal point: which part of the photo survives the crop. */}
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-white/40">
                                  <span>Crop focus</span>
                                  <button
                                    type="button"
                                    onClick={() => patchItem(i, { mediaFocus: "", mediaZoom: 1, mediaFit: "cover" })}
                                    className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-white/60 hover:text-white"
                                  >
                                    reset crop
                                  </button>
                                </div>
                                <div
                                  role="group"
                                  aria-label={`Cell ${i + 1} crop focus`}
                                  className="mt-1 grid w-fit grid-cols-3 gap-0.5 rounded-lg border border-white/15 bg-[#03002C]/70 p-0.5"
                                >
                                  {(
                                    [
                                      ["0% 0%", "Top left"],
                                      ["50% 0%", "Top"],
                                      ["100% 0%", "Top right"],
                                      ["0% 50%", "Left"],
                                      ["50% 50%", "Center"],
                                      ["100% 50%", "Right"],
                                      ["0% 100%", "Bottom left"],
                                      ["50% 100%", "Bottom"],
                                      ["100% 100%", "Bottom right"],
                                    ] as const
                                  ).map(([value, label]) => {
                                    const current = String(it.mediaFocus ?? "") || "50% 50%";
                                    const active = current === value;
                                    return (
                                      <button
                                        key={value}
                                        type="button"
                                        title={label}
                                        aria-label={label}
                                        aria-pressed={active}
                                        onClick={() => setItemField(i, "mediaFocus", value)}
                                        className={`h-5 w-6 rounded ${
                                          active
                                            ? "bg-[#A1FBF9] ring-1 ring-[#A1FBF9]"
                                            : "bg-white/10 hover:bg-white/25"
                                        }`}
                                      />
                                    );
                                  })}
                                </div>
                              </div>

                            </>

                          ) : kind === "stat" ? (
                            <div className="mt-1.5 flex gap-1.5">
                              <input
                                value={String(it.value ?? "")}
                                onChange={(e) => setItemField(i, "value", e.target.value)}
                                placeholder="Value"
                                className="w-20 rounded border border-white/15 bg-[#03002C]/70 px-2 py-1 text-xs text-white"
                              />
                              <input
                                value={String(it.unit ?? "")}
                                onChange={(e) => setItemField(i, "unit", e.target.value)}
                                placeholder="Unit"
                                className="w-16 rounded border border-white/15 bg-[#03002C]/70 px-2 py-1 text-xs text-white"
                              />
                              <input
                                value={String(it.label ?? "")}
                                onChange={(e) => setItemField(i, "label", e.target.value)}
                                placeholder="Label"
                                className="flex-1 rounded border border-white/15 bg-[#03002C]/70 px-2 py-1 text-xs text-white"
                              />
                            </div>
                          ) : (
                            <textarea
                              value={String(it.body ?? "")}
                              rows={2}
                              onChange={(e) => setItemField(i, "body", e.target.value)}
                              placeholder="Cell body"
                              className="mt-1.5 w-full resize-y rounded border border-white/15 bg-[#03002C]/70 px-2 py-1 text-xs text-white focus:border-[#A1FBF9] focus:outline-none"
                            />
                          )}

                          {/* Icon swap + size for any non-imagery cell. */}
                          {!isMedia && (
                            <div className="mt-2 rounded border border-white/10 bg-[#03002C]/50 p-2">
                              <div className="text-[10px] uppercase tracking-widest text-white/40">
                                Icon
                              </div>
                              <div className="mt-1 flex items-center gap-1.5">
                                <IconPicker
                                  value={String(it.icon ?? "") || null}
                                  onChange={(name) => setItemField(i, "icon", name ?? "")}
                                  autoLabel="No icon"
                                />
                                <button
                                  type="button"
                                  onClick={() => setIconPickerFor(i)}
                                  className="flex-1 rounded border border-[#A1FBF9]/40 bg-[#A1FBF9]/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#A1FBF9] hover:bg-[#A1FBF9]/20"
                                >
                                  ▦ Browse icons
                                </button>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                <span className="mr-1 text-[10px] uppercase tracking-widest text-white/40">
                                  Size
                                </span>
                                {ICON_SIZE_CHOICES.map((size) => {
                                  const active = String(it.iconSize ?? "md") === size;
                                  return (
                                    <button
                                      key={size}
                                      type="button"
                                      onClick={() => setItemField(i, "iconSize", size)}
                                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                                        active
                                          ? "border-[#A1FBF9]/70 bg-[#A1FBF9]/15 text-[#A1FBF9]"
                                          : "border-white/15 text-white/60 hover:text-white"
                                      }`}
                                    >
                                      {size}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Alignment + fine offset inside the tile's glyph
                                  well. Tile styling is untouched. */}
                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                <span className="mr-1 text-[10px] uppercase tracking-widest text-white/40">
                                  Align
                                </span>
                                {(["top", "center", "bottom"] as const).map((pos) => {
                                  const active = String(it.iconAlign ?? "center") === pos;
                                  return (
                                    <button
                                      key={pos}
                                      type="button"
                                      onClick={() => setItemField(i, "iconAlign", pos)}
                                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                                        active
                                          ? "border-[#A1FBF9]/70 bg-[#A1FBF9]/15 text-[#A1FBF9]"
                                          : "border-white/15 text-white/60 hover:text-white"
                                      }`}
                                    >
                                      {pos}
                                    </button>
                                  );
                                })}
                              </div>

                              <label className="mt-2 flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-white/40">
                                  Offset
                                </span>
                                <input
                                  type="range"
                                  min={-40}
                                  max={40}
                                  step={1}
                                  value={Number(it.iconOffsetPct ?? 0) || 0}
                                  onChange={(e) =>
                                    setItemField(i, "iconOffsetPct", Number(e.target.value))
                                  }
                                  className="h-1 flex-1 accent-[#A1FBF9]"
                                />
                                <span className="w-9 text-right text-[10px] tabular-nums text-white/60">
                                  {Number(it.iconOffsetPct ?? 0) || 0}%
                                </span>
                              </label>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </aside>
      </div>

      {pickerFor !== null && (pickerFor === SLIDE_MEDIA || items?.[pickerFor]) && (
        <SlideMediaPicker
          title={
            pickerFor === SLIDE_MEDIA
              ? "Slide image"
              : `Image for cell ${pickerFor + 1}`
          }
          currentUrl={
            String(
              (pickerFor === SLIDE_MEDIA ? copy.mediaUrl : items?.[pickerFor]?.mediaUrl) ?? "",
            ) || undefined
          }
          onClose={() => setPickerFor(null)}
          onPick={(picked) =>
            patchItem(pickerFor, { mediaUrl: picked.url, mediaPath: picked.path ?? "" })
          }
        />
      )}

      {iconPickerFor !== null && items?.[iconPickerFor] && (
        <SlideIconPicker
          title={`Icon for cell ${iconPickerFor + 1}`}
          value={String(items[iconPickerFor]?.icon ?? "") || null}
          size={String(items[iconPickerFor]?.iconSize ?? "md")}
          onClose={() => setIconPickerFor(null)}
          onPick={(name) => setItemField(iconPickerFor, "icon", name ?? "")}
          onSize={(token) => setItemField(iconPickerFor, "iconSize", token)}
        />
      )}

      {logoPickerFor !== null && (() => {
        const cell = logoCells.find((c) => c.path === logoPickerFor);
        const preview = cell ? (mode === "dark" ? cell.darkUrl || cell.url : cell.url || cell.darkUrl) : "";
        return (
          <SlideLogoPicker
            title={cell?.name ? `Logo · ${cell.name}` : "Choose logo"}
            currentName={cell?.name}
            currentUrl={preview || undefined}
            onClose={() => setLogoPickerFor(null)}
            onPick={(picked) =>
              patchLogoCell(
                logoPickerFor,
                {
                  logoUrl: picked.logoUrl,
                  logoUrlDark: picked.logoUrlDark,
                  logoPath: picked.logoPath,
                  ...(picked.name ? { name: picked.name } : {}),
                },
                `Logo · ${picked.name || "swap"}`,
              )
            }
            onClear={() =>
              patchLogoCell(
                logoPickerFor,
                { logoUrl: "", logoUrlDark: "", logoPath: "" },
                "Logo · clear",
              )
            }
          />
        );
      })()}

    </div>
  );

  if (typeof document === "undefined") return studio;
  return createPortal(studio, document.body);
}


/* ── Version history ──────────────────────────────────────────────────────
 * Every successful save writes a restore point. This panel lists them
 * newest-first, shows a field-level diff against the live draft, and can
 * load an older snapshot back into the editor (the curator still has to
 * press Save to publish it, so a restore is never silent).
 * ---------------------------------------------------------------------- */

function SampleHistoryPanel({
  variantId,
  brandModeId,
  current,
  onRestore,
}: {
  variantId: string;
  brandModeId: string;
  current: Record<string, unknown>;
  onRestore: (content: Record<string, unknown>) => void;
}) {
  const { versions, loading, remove } = useVariantSampleHistory(variantId, brandModeId);
  const [openId, setOpenId] = useState<string | null>(null);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <>
      <p className="mt-3 text-[11px] text-white/50">
        Restore points for{" "}
        <span className="text-white/80">
          {brandModeId === ALL_BRANDS ? "every brand mode" : brandModeId}
        </span>
        . The newest 30 saves are kept.
      </p>

      {loading && <p className="mt-3 text-[11px] text-white/45">Loading history…</p>}
      {!loading && versions.length === 0 && (
        <p className="mt-3 rounded-lg border border-white/10 bg-[#03002C]/40 p-3 text-[11px] text-white/45">
          No saved versions yet — the next save becomes your first restore point.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {versions.map((v, i) => {
          const rows = diffSampleContent(v.content as Record<string, unknown>, current);
          const open = openId === v.id;
          return (
            <div key={v.id} className="rounded-lg border border-white/12 bg-[#03002C]/45 p-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-white/40">
                  v{versions.length - i}
                </span>
                <span className="text-[11px] text-white/80">{fmt(v.createdAt)}</span>
                {i === 0 && (
                  <span className="rounded-full bg-[#A6FA87]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-[#A6FA87]">
                    latest
                  </span>
                )}
                <span className="ml-auto text-[10px] text-white/45">
                  {rows.length === 0 ? "same as draft" : `${rows.length} diff${rows.length === 1 ? "" : "s"}`}
                </span>
              </div>
              {v.label && <div className="mt-1 text-[11px] text-white/55">{v.label}</div>}

              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : v.id)}
                  disabled={rows.length === 0}
                  className="rounded border border-white/20 px-2 py-1 text-[10px] text-white/70 hover:text-white disabled:opacity-40"
                >
                  {open ? "Hide diff" : "Diff vs draft"}
                </button>
                <button
                  type="button"
                  onClick={() => onRestore(v.content as Record<string, unknown>)}
                  className="rounded border border-[#A1FBF9]/40 bg-[#A1FBF9]/10 px-2 py-1 text-[10px] font-semibold text-[#A1FBF9] hover:bg-[#A1FBF9]/20"
                >
                  ↺ Restore
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(v.id)}
                  aria-label={`Delete restore point from ${fmt(v.createdAt)}`}
                  className="ml-auto rounded border border-white/15 px-1.5 py-1 text-[10px] text-white/50 hover:border-red-400/70 hover:text-red-300"
                >
                  ✕
                </button>
              </div>

              {open && (
                <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                  {rows.slice(0, 40).map((r) => (
                    <div key={r.path} className="text-[10px] leading-snug">
                      <div className="font-mono text-white/40">{r.path}</div>
                      {r.kind !== "added" && (
                        <div className="text-[#FF9B70] line-through decoration-[#FF9B70]/50">
                          {r.before || "—"}
                        </div>
                      )}
                      {r.kind !== "removed" && (
                        <div className="text-[#A6FA87]">{r.after || "—"}</div>
                      )}
                    </div>
                  ))}
                  {rows.length > 40 && (
                    <p className="text-[10px] text-white/40">+{rows.length - 40} more changes</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
