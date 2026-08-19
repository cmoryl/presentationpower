import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CanvasBlock, CanvasBlockKind } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";
import {
  boundsOf,
  buildSnapTargets,
  clampToStage,
  rectsIntersect,
  GRID,
  snapMove,
  snapResize,
  STAGE_H,
  STAGE_W,
  type Box,
  type Guide,
  type ResizeHandle,
  type SnapTargets,
} from "@/lib/canvas-snap";
import {
  CANVAS_UI_ATTR,
  adoptAllFromModule,
  adoptTargetAt,
  blocksFromCard,
  cardTargetAt,
  moduleSnapBoxes,
  blockFromElement,
} from "@/lib/canvas-adopt";
import { cardPresetBlocks } from "@/lib/canvas-card";
import type { UploadedAsset } from "@/lib/asset-upload";
import { useToolbarScale } from "@/hooks/use-toolbar-scale";
import { useHideAdoptedSources } from "./AdoptedSourceHider";
import { CanvasAssetPanel } from "./CanvasAssetPanel";
import { CanvasInsertLibrary, type InsertPayload } from "./CanvasInsertLibrary";
import { CanvasLayersPanel } from "./CanvasLayersPanel";
import { useCanvasEmphasis } from "@/lib/canvas-emphasis";
import {
  blockFontSize,
  CanvasBlockContent,
  canvasBlockFrameStyle,
  sortBlocksForEdit,
} from "./CanvasBlockView";

/**
 * FreeCanvasEditor — direct-manipulation editing over a rendered module.
 *
 * Interactions: drag/move (single + multi), marquee selection, shift/cmd-click
 * additive select, 8-handle resize (scales a multi-selection proportionally),
 * group/ungroup, layering, duplicate, delete, arrow-key nudging, alignment and
 * distribution, and snapping to the slide edges, centers, margins, sibling
 * objects and a fallback grid with live alignment guides.
 *
 * All geometry is in stage units (0–1920 × 0–1080); persistence is a single
 * onChange(blocks) call so the deck store owns undo/redo.
 *
 * Performance: gestures are rAF-coalesced and painted straight to the DOM, snap
 * targets are built once per gesture, and the store is written once on release,
 * so slides with many blocks stay interactive.
 */

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

type DragState = { mode: "move" | "resize" | "marquee" };

/** Mutable, ref-held state for one in-flight gesture. */
type LiveDrag =
  | {
      mode: "move";
      startPointer: { x: number; y: number };
      startBoxes: Map<string, Box>;
      startBounds: Box;
      targets: SnapTargets;
      live: Map<string, Box>;
      liveSizes: Map<string, number>;
    }
  | {
      mode: "resize";
      handle: ResizeHandle;
      startPointer: { x: number; y: number };
      startBounds: Box;
      startBoxes: Map<string, Box>;
      targets: SnapTargets;
      live: Map<string, Box>;
      liveSizes: Map<string, number>;
    }
  | { mode: "marquee"; origin: { x: number; y: number }; current: { x: number; y: number } };

function marqueeRect(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

function isTextKind(kind: CanvasBlockKind): boolean {
  return kind === "heading" || kind === "body" || kind === "caption";
}

/** Guide colour by origin: stage/margin = accent, canvas objects = pink, module geometry = aqua. */
function guideColor(kind: Guide["kind"], accent: string): string {
  if (kind === "object") return "#EC388A";
  if (kind === "module") return "#A1FBF9";
  return accent;
}


export function FreeCanvasEditor({
  brand,
  blocks,
  onChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onSaveAsModule,
  tool = "objects",
  onToolChange,
  toolbarMount,
  toolbarVariant = "overlay",
  layersMount,
  children,
}: {
  brand: BrandMode;
  blocks: readonly CanvasBlock[] | undefined;
  /**
   * Persist the block list. `meta` names the action for the undo tooltip and
   * controls coalescing: `coalesceKey: null` forces a discrete restore point
   * (pick, move, resize, release each undo on their own), while a shared key
   * groups a burst of nudges or keystrokes into one step.
   */
  onChange: (
    next: CanvasBlock[],
    meta?: { label?: string; coalesceKey?: string | null },
  ) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  /** Names of the next undo/redo steps, shown in the toolbar tooltips. */
  undoLabel?: string | null;
  redoLabel?: string | null;
  onSaveAsModule?: () => void;
  /**
   * Which half of the unified editor is active.
   * "text"    — the module's own copy is being edited (LiveEditOverlay, which
   *             this component wraps): the canvas layer goes click-through so
   *             text edits land on the render, while blocks stay visible.
   * "objects" — canvas objects: drag, resize, adopt, group, layer.
   * One surface, one toolbar, two tools — no more mutually exclusive modes.
   */
  tool?: "text" | "objects";
  onToolChange?: (tool: "text" | "objects") => void;
  /**
   * Where the studio toolbar lives. Passing a host element moves it out of the
   * slide (so it never covers the artwork): the editor docks it in the
   * inspector column, and the enlarged stage docks it in a sticky top bar.
   * Null / undefined falls back to the historical on-slide overlay.
   */
  toolbarMount?: HTMLElement | null;
  toolbarVariant?: "overlay" | "docked" | "sticky";
  /**
   * Where the Layers (selection pane) lives. Passing a host element moves it
   * into the shared editor rail — the same place the Open Canvas Studio keeps
   * its Layers tab — instead of floating over the artwork.
   */
  layersMount?: HTMLElement | null;
  children: React.ReactNode;
}) {
  const textTool = tool === "text";
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Emphasis driven from the right-rail Slide layers panel.
  const { selectedId: emphSelectedId, hoverId: emphHoverId } = useCanvasEmphasis();
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [snapOn, setSnapOn] = useState(true);
  /** Visible 20-unit grid — off by default so the slide reads clean. */
  const [gridOn, setGridOn] = useState(false);
  /** Selection-pane style layers list (reorder / lock / hide / group). */
  const [layersOn, setLayersOn] = useState(false);
  /** Browsable shape inventory + icon set (Figma/Canva-style insert library). */
  const [libraryOn, setLibraryOn] = useState(false);
  /** Upload panel for bring-your-own photos / icons / SVGs (place or replace). */
  const [assetsOn, setAssetsOn] = useState(false);
  // Readability: per-user toolbar zoom (see use-toolbar-scale).
  const toolbarScale = useToolbarScale();
  /**
   * Dock the toolbar into the host element when one exists (inspector column /
   * sticky bar above the enlarged stage) so it never sits on the artwork.
   * Without a host we keep the on-slide overlay so other callers still work.
   */
  const docked = !!toolbarMount;
  const dockToolbar = (node: React.ReactNode) =>
    toolbarMount ? createPortal(node, toolbarMount) : node;
  /** Same contract for the layers pane so both rails read identically. */
  const layersDocked = !!layersMount;
  const dockLayers = (node: React.ReactNode) =>
    layersMount ? createPortal(node, layersMount) : node;

  /**
   * "Pick from module" mode: the next click adopts whatever the module painted
   * under the cursor into a real, movable canvas block (see lib/canvas-adopt).
   */
  const [pickMode, setPickMode] = useState<"off" | "adopt" | "card" | "remove">("off");
  const pickRef = useRef<HTMLDivElement>(null);
  /** Only flips at gesture start/end — pointer-moves never re-render. */
  const [dragging, setDragging] = useState<DragState["mode"] | null>(null);

  // Switching to the text tool must not leave a live pick / selection armed.
  useEffect(() => {
    if (!textTool) return;
    setPickMode("off");
    setSelected([]);
    setEditingId(null);
  }, [textTool]);

  // Live gesture state lives in refs and is painted straight to the DOM so a
  // deck with hundreds of blocks never re-renders React mid-drag.
  const dragRef = useRef<LiveDrag | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number; alt: boolean } | null>(null);
  const blockRefs = useRef(new Map<string, HTMLDivElement>());
  const selFrameRef = useRef<HTMLDivElement>(null);
  const guideXRef = useRef<HTMLDivElement>(null);
  const guideYRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => (blocks ? sortBlocksForEdit(blocks) : []), [blocks]);
  /** Module sections the user deleted on this slide (hidden, not painted). */
  const removedCount = useMemo(
    () => (blocks ?? []).filter((b) => b.suppressed).length,
    [blocks],
  );
  useHideAdoptedSources(wrapRef, blocks);
  const ink = brand.tokens.ink ?? brand.tokens.primary;
  const accent = brand.tokens.accent;

  const index = useMemo(() => new Map(list.map((b) => [b.id, b] as const)), [list]);
  const byId = useCallback((id: string) => index.get(id), [index]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedBlocks = useMemo(
    () => list.filter((b) => selectedSet.has(b.id)),
    [list, selectedSet],
  );
  const selectionBounds = selectedBlocks.length ? boundsOf(selectedBlocks) : null;


  const stageFromClient = useCallback((clientX: number, clientY: number) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * STAGE_W,
      y: ((clientY - r.top) / r.height) * STAGE_H,
    };
  }, []);

  /**
   * Every mutation flows through here, and every caller names itself, so the
   * deck history reads as a list of real actions ("Pick from module", "Resize
   * objects") instead of an anonymous run of "Canvas edit" steps. Discrete by
   * default — pass a `coalesceKey` only for genuinely repeated micro-edits.
   */
  const commit = useCallback(
    (next: CanvasBlock[], label: string, coalesceKey: string | null = null) => {
      onChange(
        next.map((b, i) => ({ ...b, z: b.z ?? i })),
        { label, coalesceKey },
      );
    },
    [onChange],
  );

  const patchMany = useCallback(
    (updates: Map<string, Partial<CanvasBlock>>, label: string, coalesceKey?: string | null) => {
      commit(
        list.map((b) => (updates.has(b.id) ? { ...b, ...updates.get(b.id)! } : b)),
        label,
        coalesceKey ?? null,
      );
    },
    [commit, list],
  );

  const applySelectionUpdate = useCallback(
    (
      updater: (b: CanvasBlock) => Partial<CanvasBlock>,
      label: string,
      coalesceKey?: string | null,
    ) => {
      commit(
        list.map((b) => (selected.includes(b.id) ? { ...b, ...updater(b) } : b)),
        label,
        coalesceKey ?? null,
      );
    },
    [commit, list, selected],
  );


  /** Selecting one member of a group selects the whole group. */
  const expandGroups = useCallback(
    (ids: readonly string[]) => {
      const groups = new Set(
        ids.map((id) => byId(id)?.groupId).filter((g): g is string => Boolean(g)),
      );
      const out = new Set(ids);
      if (groups.size) {
        for (const b of list) if (b.groupId && groups.has(b.groupId)) out.add(b.id);
      }
      return [...out];
    },
    [byId, list],
  );

  const select = useCallback(
    (ids: readonly string[], additive: boolean) => {
      const expanded = expandGroups(ids);
      setSelected((prev) => {
        if (!additive) return expanded;
        const set = new Set(prev);
        const allIn = expanded.every((id) => set.has(id));
        for (const id of expanded) {
          if (allIn) set.delete(id);
          else set.add(id);
        }
        return [...set];
      });
    },
    [expandGroups],
  );

  // ---- add / duplicate / delete ------------------------------------------

  const addBlock = (kind: CanvasBlockKind, extra: Partial<CanvasBlock> = {}) => {
    const id = `blk-${Math.random().toString(36).slice(2, 9)}`;
    const defaults: Record<CanvasBlockKind, Partial<CanvasBlock>> = {
      heading: { text: "New headline", w: 1100, h: 200, x: 160, y: 200 },
      body: { text: "Body copy — double-click to edit.", w: 900, h: 140, x: 160, y: 500 },
      caption: { text: "Caption", w: 600, h: 60, x: 160, y: 900 },
      shape: { text: "", w: 640, h: 360, x: 640, y: 360, radius: 32 },
      image: { text: "", w: 720, h: 405, x: 600, y: 340, fit: "cover", radius: 24 },
    };
    const block = {
      id,
      kind,
      x: 200,
      y: 200,
      w: 900,
      h: 140,
      text: "",
      ...defaults[kind],
      ...extra,
      z: list.length,
    } as CanvasBlock;
    commit([...list, block], `Add ${kind}`);
    setSelected([id]);
    if (kind === "heading" || kind === "body" || kind === "caption") setEditingId(id);
  };


  /**
   * Drop a library shape or icon onto the stage. Both arrive as vector artwork,
   * sized from their natural aspect and centred so the object lands in view,
   * then stay ordinary canvas objects (movable, resizable, layerable, exported
   * as artwork rather than a flattened bitmap).
   */
  const insertFromLibrary = ({ src, alt, aspect }: InsertPayload) => {
    const w = Math.round(aspect >= 1 ? Math.min(680, 340 * aspect) : 340);
    const h = Math.round(w / (aspect || 1));
    addBlock("image", {
      src,
      alt,
      w,
      h,
      x: Math.round((STAGE_W - w) / 2),
      y: Math.round((STAGE_H - h) / 2),
      // Vector art must never be cropped or stretched by the frame.
      fit: "contain",
      radius: 0,
    });
  };

  // ---- bring-your-own assets (upload panel) ------------------------------

  /** Image objects in the current selection — the targets a swap can act on. */
  const replaceTargets = useMemo(
    () => list.filter((b) => selected.includes(b.id) && b.kind === "image" && !b.locked),
    [list, selected],
  );

  /** Place an uploaded asset as a new object, sized from its natural aspect. */
  const placeAsset = (asset: UploadedAsset) =>
    insertFromLibrary({ src: asset.src, alt: asset.alt, aspect: asset.aspect });

  /**
   * Swap the artwork inside the selected image objects. The frame, crop mode,
   * corner radius, z-order and grouping are all preserved — only the source and
   * alt text change — so a curated layout survives an imagery change. Vectors
   * additionally switch to `contain`, since a logo or pictogram must never be
   * cropped by the frame it lands in.
   */
  const replaceAssetInSelection = (asset: UploadedAsset) => {
    if (replaceTargets.length === 0) return;
    const next = new Map<string, Partial<CanvasBlock>>();
    for (const b of replaceTargets) {
      next.set(b.id, {
        src: asset.src,
        alt: asset.alt,
        ...(asset.kind === "vector" ? { fit: "contain" as const } : {}),
      });
    }
    patchMany(next, "Replace artwork");
  };


  // ---- adopt an existing module section ----------------------------------

  /** Paint the pick-mode hover outline straight to the DOM (no re-render). */
  const paintPick = useCallback((el: Element | null) => {
    const node = pickRef.current;
    const root = wrapRef.current;
    if (!node || !root) return;
    if (!el) {
      node.style.display = "none";
      return;
    }
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    node.style.display = "";
    node.style.left = `${((r.left - rr.left) / rr.width) * 100}%`;
    node.style.top = `${((r.top - rr.top) / rr.height) * 100}%`;
    node.style.width = `${(r.width / rr.width) * 100}%`;
    node.style.height = `${(r.height / rr.height) * 100}%`;
  }, []);

  /**
   * Convert the module element under the pointer into a canvas block. The block
   * lands exactly over the original, which is then hidden, so the section looks
   * unchanged until the user moves it.
   */
  const adoptAt = (clientX: number, clientY: number) => {
    const root = wrapRef.current;
    if (!root) return;
    const target = adoptTargetAt(root, clientX, clientY);
    if (!target) return;
    const block = blockFromElement(target, root, () => `blk-${Math.random().toString(36).slice(2, 9)}`);
    if (!block) return;
    // Already adopted? Select the existing block instead of stacking a copy.
    const existing = list.find((b) => b.sourceSelector && b.sourceSelector === block.sourceSelector);
    if (existing) {
      setSelected([existing.id]);
      return;
    }
    commit([...list, { ...block, z: list.length }], "Pick from module");
    setSelected([block.id]);
    paintPick(null);
  };

  /**
   * Grab the WHOLE box under the pointer (plate + icon + title + copy) as one
   * grouped set of objects. This is what "let me move / duplicate that bento
   * box" needs: a single selectable thing rather than five separate leaves.
   * Returns true when a card was found, so callers can fall back to leaf pick.
   */
  const adoptCardAt = (clientX: number, clientY: number): boolean => {
    const root = wrapRef.current;
    if (!root) return false;
    const card = cardTargetAt(root, clientX, clientY);
    if (!card) return false;
    const made = blocksFromCard(card, root, () => `blk-${Math.random().toString(36).slice(2, 9)}`);
    if (!made.length) return false;
    // Already adopted? Select what's there instead of stacking a second copy.
    const plateSel = made[0]?.sourceSelector;
    const existing = plateSel ? list.filter((b) => b.sourceSelector === plateSel) : [];
    if (existing.length) {
      const gid = existing[0].groupId;
      setSelected(gid ? list.filter((b) => b.groupId === gid).map((b) => b.id) : [existing[0].id]);
      return true;
    }
    commit(
      [...list, ...made.map((b, i) => ({ ...b, z: list.length + i }))],
      "Pick box from module",
    );
    setSelected(made.map((b) => b.id));
    paintPick(null);
    return true;
  };

  /**
   * Load EVERY layer the module (or deck slide) already painted as editable
   * objects in one step: cards become grouped tiles, headlines/captions/pictures
   * become their own blocks, all sitting exactly where they were drawn. This is
   * what makes an existing slide feel opened rather than empty.
   */
  const adoptAllSections = useCallback((): number => {
    const root = wrapRef.current;
    if (!root) return 0;
    const current = blocks ?? [];
    const made = adoptAllFromModule(
      root,
      () => `blk-${Math.random().toString(36).slice(2, 9)}`,
      current.map((b) => b.sourceSelector).filter((s): s is string => !!s),
    );
    if (!made.length) return 0;
    onChange(
      [...current, ...made.map((b, i) => ({ ...b, z: current.length + i }))],
      { label: "Load module layers" },
    );
    return made.length;
  }, [blocks, onChange]);

  /**
   * First time the objects tool is opened on a slide with no objects yet, adopt
   * what is already there so the Layers pane lists the real slide instead of
   * "no objects yet". Runs once per mount, after the render has settled.
   */
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (textTool || autoLoadedRef.current) return;
    if ((blocks ?? []).length > 0) {
      autoLoadedRef.current = true;
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled || autoLoadedRef.current) return;
      const root = wrapRef.current;
      if (!root || root.getBoundingClientRect().height < 40) return;
      autoLoadedRef.current = true;
      adoptAllSections();
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [textTool, blocks, adoptAllSections]);

  /**
   * Insert a complete card — plate, icon badge, index, title, body — grouped,
   * so "add another box like the ones we have" is one click instead of five
   * hand-placed rectangles. It lands beside the last card when one is selected.
   */
  const addCard = () => {
    const b = selectionBounds;
    const w = b && b.w > 200 ? b.w : 560;
    const h = b && b.h > 160 ? b.h : 420;
    const x = b ? Math.min(STAGE_W - w - 40, b.x + b.w + 40) : 160;
    const y = b ? b.y : 420;
    const made = cardPresetBlocks({
      x: Math.max(40, Math.round(x)),
      y: Math.max(40, Math.round(y)),
      w: Math.round(w),
      h: Math.round(h),
      accent,
      index: 1 + list.filter((k) => k.kind === "shape").length,
      idFactory: () => `blk-${Math.random().toString(36).slice(2, 9)}`,
    });
    commit([...list, ...made.map((k, i) => ({ ...k, z: list.length + i }))], "Add card");
    setSelected(made.map((k) => k.id));
  };

  /**
   * Delete a module-drawn section outright: adopt it (so we own its DOM path),
   * then mark that block suppressed. Nothing paints, and the original stays
   * hidden, so the area is really gone from THIS deck's slide. The shared
   * module template is untouched; "Restore removed" brings it back.
   */
  const removeSectionAt = (clientX: number, clientY: number) => {
    const root = wrapRef.current;
    if (!root) return;
    const target = adoptTargetAt(root, clientX, clientY);
    if (!target) return;
    const block = blockFromElement(target, root, () => `blk-${Math.random().toString(36).slice(2, 9)}`);
    if (!block) return;
    const existing = (blocks ?? []).find(
      (b) => b.sourceSelector && b.sourceSelector === block.sourceSelector,
    );
    const next = existing
      ? (blocks ?? []).map((b) => (b.id === existing.id ? { ...b, suppressed: true } : b))
      : [...(blocks ?? []), { ...block, z: list.length, suppressed: true }];
    commit(next, "Delete module section");
    setSelected([]);
    paintPick(null);
  };

  /** Bring every deleted module section back. */
  const restoreRemoved = () => {
    if (!removedCount) return;
    commit(
      (blocks ?? []).filter((b) => !b.suppressed),
      `Restore ${removedCount} removed section(s)`,
    );
  };

  /** Give a section back to the module: drop the block, un-hide the original. */
  const releaseSelection = () => {
    if (!selectedBlocks.some((b) => b.sourceSelector)) return;
    commit(
      (blocks ?? []).filter((b) => !(selectedSet.has(b.id) && b.sourceSelector)),
      "Release to module",
    );
    setSelected([]);
  };

  const duplicateSelection = () => {
    if (!selectedBlocks.length) return;
    // One fresh group id per source group, so duplicating a whole box keeps it
    // together — and repeated duplicates never collide on the same id.
    const remap = new Map<string, string>();
    const copies = selectedBlocks.map((b, i) => {
      if (b.groupId && !remap.has(b.groupId))
        remap.set(b.groupId, `grp-${Math.random().toString(36).slice(2, 8)}`);
      return {
        ...b,
        id: `blk-${Math.random().toString(36).slice(2, 9)}`,
        x: b.x + 40,
        y: b.y + 40,
        groupId: b.groupId ? remap.get(b.groupId) : undefined,
        // A copy is a brand-new object: it must not claim the module element
        // its original adopted, or deleting it would blank the source too.
        sourceSelector: undefined,
        z: list.length + i,
      };
    });
    commit([...list, ...copies], `Duplicate ${copies.length} object(s)`);
    setSelected(copies.map((c) => c.id));
  };

  const deleteSelection = () => {
    if (!selected.length) return;
    // Adopted blocks are module geometry: deleting one must delete the SECTION
    // (keep the block as a suppressed marker so the original stays hidden),
    // not hand it back to the module.
    const next = (blocks ?? []).flatMap((b) => {
      if (!selected.includes(b.id)) return [b];
      return b.sourceSelector ? [{ ...b, suppressed: true }] : [];
    });
    commit(next, `Delete ${selected.length} object(s)`);
    setSelected([]);
    setEditingId(null);
  };

  const groupSelection = () => {
    if (selectedBlocks.length < 2) return;
    const gid = `grp-${Math.random().toString(36).slice(2, 8)}`;
    applySelectionUpdate(() => ({ groupId: gid }), "Group objects");
  };

  const ungroupSelection = () => {
    if (!selectedBlocks.length) return;
    applySelectionUpdate(() => ({ groupId: undefined }), "Ungroup objects");
  };

  const reorder = (dir: "front" | "back" | "forward" | "backward") => {
    if (!selected.length) return;
    const ordered = [...list];
    const picked = ordered.filter((b) => selected.includes(b.id));
    const rest = ordered.filter((b) => !selected.includes(b.id));
    let next: CanvasBlock[];
    if (dir === "front") next = [...rest, ...picked];
    else if (dir === "back") next = [...picked, ...rest];
    else {
      next = [...ordered];
      const step = dir === "forward" ? 1 : -1;
      const indices = picked
        .map((b) => next.findIndex((n) => n.id === b.id))
        .sort((a, b) => (step > 0 ? b - a : a - b));
      for (const i of indices) {
        const j = i + step;
        if (j < 0 || j >= next.length) continue;
        [next[i], next[j]] = [next[j]!, next[i]!];
      }
    }
    commit(
      next.map((b, i) => ({ ...b, z: i })),
      dir === "front"
        ? "Bring to front"
        : dir === "back"
          ? "Send to back"
          : dir === "forward"
            ? "Bring forward"
            : "Send backward",
    );
  };

  // ---- layers panel operations -------------------------------------------

  /**
   * Drag-reorder from the layers panel: move `ids` so they sit directly below
   * `beforeId` in paint order (`null` → top of the stack). Group members travel
   * with their group so a grouped set never gets split by a reorder.
   */
  const moveBefore = useCallback(
    (ids: readonly string[], beforeId: string | null) => {
      const moving = new Set(expandGroups(ids));
      if (!moving.size) return;
      const picked = list.filter((b) => moving.has(b.id));
      const rest = list.filter((b) => !moving.has(b.id));
      const at = beforeId ? rest.findIndex((b) => b.id === beforeId) : rest.length;
      const idx = at < 0 ? rest.length : at;
      const next = [...rest.slice(0, idx), ...picked, ...rest.slice(idx)];
      commit(
        next.map((b, i) => ({ ...b, z: i })),
        "Reorder layers",
      );
    },
    [commit, expandGroups, list],
  );

  const setHidden = useCallback(
    (ids: readonly string[], hidden: boolean) => {
      const targets = new Set(expandGroups(ids));
      patchMany(
        new Map([...targets].map((id) => [id, { hidden: hidden || undefined }] as const)),
        hidden ? "Hide objects" : "Show objects",
      );
    },
    [expandGroups, patchMany],
  );

  const setLocked = useCallback(
    (ids: readonly string[], locked: boolean) => {
      const targets = new Set(expandGroups(ids));
      patchMany(
        new Map([...targets].map((id) => [id, { locked: locked || undefined }] as const)),
        locked ? "Lock objects" : "Unlock objects",
      );
    },
    [expandGroups, patchMany],
  );



  /** Layers panel: keep a block on screen but drop it from the PPTX export. */
  const setExportExcluded = useCallback(
    (ids: readonly string[], excluded: boolean) => {
      const targets = new Set(expandGroups(ids));
      patchMany(
        new Map(
          [...targets].map((id) => [id, { exportExcluded: excluded || undefined }] as const),
        ),
        excluded ? "Exclude from export" : "Include in export",
      );
    },
    [expandGroups, patchMany],
  );

  /**
   * Scope the export to the selection: every block outside it is flagged
   * export-excluded (grouped members follow their group). `false` clears scope.
   */
  const setExportSelectionOnly = useCallback(
    (only: boolean) => {
      if (!only) {
        patchMany(
          new Map(list.map((b) => [b.id, { exportExcluded: undefined }] as const)),
          "Export all layers",
        );
        return;
      }
      const keep = new Set(expandGroups(selected));
      if (keep.size === 0) return;
      patchMany(
        new Map(
          list.map(
            (b) => [b.id, { exportExcluded: keep.has(b.id) ? undefined : true }] as const,
          ),
        ),
        "Export selection only",
      );
    },
    [expandGroups, list, patchMany, selected],
  );

  // ---- pointer interactions ----------------------------------------------
  //
  // Perf model: a gesture stores its start geometry + precomputed snap targets
  // once, then every pointer-move is coalesced into one requestAnimationFrame
  // that writes styles directly to the block elements. React state (and the
  // deck store, which owns undo/redo + persistence) is touched exactly once,
  // on pointer-up. That keeps dragging, marquee-selecting and resizing at
  // frame rate no matter how many blocks the slide carries.

  const others = useCallback(
    (excluding: ReadonlySet<string>): Box[] => {
      const out: Box[] = [];
      for (const b of list) if (!excluding.has(b.id)) out.push({ x: b.x, y: b.y, w: b.w, h: b.h });
      return out;
    },
    [list],
  );

  /**
   * Geometry the module painted, measured fresh at pointer-down: an adopted
   * heading should line up with the tiles and photos it was lifted out of, not
   * only with other canvas objects. Measured once per gesture (DOM reads are
   * expensive) and reused for every pointer-move.
   */
  const moduleBoxes = useCallback((): Box[] => {
    const root = wrapRef.current;
    if (!root) return [];
    try {
      return moduleSnapBoxes(root);
    } catch {
      return [];
    }
  }, []);

  const paintBox = useCallback((id: string, box: Box, fontPx?: number) => {
    const el = blockRefs.current.get(id);
    if (!el) return;
    el.style.left = `${(box.x / STAGE_W) * 100}%`;
    el.style.top = `${(box.y / STAGE_H) * 100}%`;
    el.style.width = `${(box.w / STAGE_W) * 100}%`;
    el.style.height = `${(box.h / STAGE_H) * 100}%`;
    if (fontPx != null) el.style.setProperty("--cb-fs", `${fontPx}px`);
  }, []);

  const paintFrame = useCallback((box: Box | null) => {
    const el = selFrameRef.current;
    if (!el) return;
    if (!box) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.style.left = `${(box.x / STAGE_W) * 100}%`;
    el.style.top = `${(box.y / STAGE_H) * 100}%`;
    el.style.width = `${(box.w / STAGE_W) * 100}%`;
    el.style.height = `${(box.h / STAGE_H) * 100}%`;
  }, []);

  const paintGuides = useCallback((guides: readonly Guide[]) => {
    const gx = guideXRef.current;
    const gy = guideYRef.current;
    const x = guides.find((g) => g.axis === "x");
    const y = guides.find((g) => g.axis === "y");
    if (gx) {
      gx.style.display = x ? "" : "none";
      if (x) {
        gx.style.left = `${(x.at / STAGE_W) * 100}%`;
        gx.style.background = guideColor(x.kind, accent);
        gx.style.opacity = x.kind === "module" ? "0.9" : "1";
      }
    }
    if (gy) {
      gy.style.display = y ? "" : "none";
      if (y) {
        gy.style.top = `${(y.at / STAGE_H) * 100}%`;
        gy.style.background = guideColor(y.kind, accent);
        gy.style.opacity = y.kind === "module" ? "0.9" : "1";
      }
    }
  }, [accent]);

  const paintMarquee = useCallback((box: Box | null) => {
    const el = marqueeRef.current;
    if (!el) return;
    if (!box) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.style.left = `${(box.x / STAGE_W) * 100}%`;
    el.style.top = `${(box.y / STAGE_H) * 100}%`;
    el.style.width = `${(box.w / STAGE_W) * 100}%`;
    el.style.height = `${(box.h / STAGE_H) * 100}%`;
  }, []);

  const beginMove = (e: React.PointerEvent, block: CanvasBlock) => {
    if (block.locked || editingId === block.id) return;
    e.stopPropagation();
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    let ids = selected;
    if (additive) {
      select([block.id], true);
      ids = expandGroups([...selected, block.id]);
    } else if (!selected.includes(block.id)) {
      ids = expandGroups([block.id]);
      setSelected(ids);
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startBoxes = new Map<string, Box>();
    for (const id of ids) {
      const b = byId(id);
      if (b && !b.locked) startBoxes.set(id, { x: b.x, y: b.y, w: b.w, h: b.h });
    }
    if (!startBoxes.size) return;
    const moving = new Set(startBoxes.keys());
    dragRef.current = {
      mode: "move",
      startPointer: stageFromClient(e.clientX, e.clientY),
      startBoxes,
      startBounds: boundsOf([...startBoxes.values()]),
      targets: buildSnapTargets(others(moving), moduleBoxes()),
      live: new Map(startBoxes),
      liveSizes: new Map(),
    };
    setDragging("move");
  };

  const beginResize = (e: React.PointerEvent, handle: ResizeHandle) => {
    if (!selectionBounds) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const startBoxes = new Map<string, Box>();
    for (const b of selectedBlocks) startBoxes.set(b.id, { x: b.x, y: b.y, w: b.w, h: b.h });
    dragRef.current = {
      mode: "resize",
      handle,
      startPointer: stageFromClient(e.clientX, e.clientY),
      startBounds: selectionBounds,
      startBoxes,
      targets: buildSnapTargets(others(new Set(startBoxes.keys())), moduleBoxes()),
      live: new Map(startBoxes),
      liveSizes: new Map(),
    };
    setDragging("resize");
  };

  /** Runs at most once per animation frame with the newest pointer sample. */
  const applyPending = useCallback(() => {
    frameRef.current = null;
    const drag = dragRef.current;
    const p = pendingRef.current;
    if (!drag || !p) return;

    if (drag.mode === "marquee") {
      drag.current = { x: p.x, y: p.y };
      paintMarquee(marqueeRect(drag.origin, drag.current));
      return;
    }

    const enabled = snapOn && !p.alt;

    if (drag.mode === "move") {
      const rawBounds: Box = {
        ...drag.startBounds,
        x: drag.startBounds.x + (p.x - drag.startPointer.x),
        y: drag.startBounds.y + (p.y - drag.startPointer.y),
      };
      const snapped = snapMove(rawBounds, [], { enabled, targets: drag.targets });
      const finalBounds = clampToStage(snapped.box);
      const dx = finalBounds.x - drag.startBounds.x;
      const dy = finalBounds.y - drag.startBounds.y;
      for (const [id, b] of drag.startBoxes) {
        const next = { ...b, x: Math.round(b.x + dx), y: Math.round(b.y + dy) };
        drag.live.set(id, next);
        paintBox(id, next);
      }
      paintFrame(boundsOf([...drag.live.values()]));
      paintGuides(snapped.guides);
      return;
    }

    const res = snapResize(
      drag.startBounds,
      drag.handle,
      p.x - drag.startPointer.x,
      p.y - drag.startPointer.y,
      [],
      { enabled, targets: drag.targets },
    );
    const sx = drag.startBounds.w === 0 ? 1 : res.box.w / drag.startBounds.w;
    const sy = drag.startBounds.h === 0 ? 1 : res.box.h / drag.startBounds.h;
    for (const [id, b] of drag.startBoxes) {
      const block = byId(id);
      const next: Box = {
        x: Math.round(res.box.x + (b.x - drag.startBounds.x) * sx),
        y: Math.round(res.box.y + (b.y - drag.startBounds.y) * sy),
        w: Math.max(40, Math.round(b.w * sx)),
        h: Math.max(24, Math.round(b.h * sy)),
      };
      drag.live.set(id, next);
      let fontPx: number | undefined;
      if (block && isTextKind(block.kind)) {
        // Text scales with its frame so resizing feels like PowerPoint.
        fontPx = Math.max(12, Math.round((block.size ?? fontFor(block.kind)) * ((sx + sy) / 2)));
        drag.liveSizes.set(id, fontPx);
      }
      paintBox(id, next, fontPx);
    }
    paintFrame(res.box);
    paintGuides(res.guides);
  }, [byId, paintBox, paintFrame, paintGuides, paintMarquee, snapOn]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const p = stageFromClient(e.clientX, e.clientY);
    pendingRef.current = { x: p.x, y: p.y, alt: e.altKey };
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(applyPending);
  };

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    pendingRef.current = null;
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    paintGuides([]);
    paintMarquee(null);
    setDragging(null);
    if (!drag) return;

    if (drag.mode === "marquee") {
      const box = marqueeRect(drag.origin, drag.current);
      if (box.w > 8 || box.h > 8) {
        const hits = list.filter((b) => rectsIntersect(box, b)).map((b) => b.id);
        setSelected(expandGroups(hits));
      } else {
        setSelected([]);
      }
      return;
    }

    // One commit per gesture → one undo entry, one persist, one re-render.
    let changed = false;
    const next = list.map((b) => {
      const live = drag.live.get(b.id);
      if (!live) return b;
      const size = drag.liveSizes.get(b.id);
      if (
        live.x === b.x &&
        live.y === b.y &&
        live.w === b.w &&
        live.h === b.h &&
        (size == null || size === b.size)
      )
        return b;
      changed = true;
      return { ...b, ...live, ...(size != null ? { size } : {}) };
    });
    if (changed)
      commit(next, drag.mode === "resize" ? "Resize objects" : "Move objects");
  };

  // After any re-render (commit, selection change, undo) re-sync the imperative
  // layer to the authoritative props — React does not know about the styles the
  // last gesture wrote, so they must be overwritten rather than removed.
  useEffect(() => {
    if (dragRef.current) return;
    for (const b of list) paintBox(b.id, b, blockFontSize(b));
    paintFrame(selectionBounds);
  });




  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );



  // ---- keyboard ----------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId || textTool) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) onRedo?.();
        else onUndo?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) ungroupSelection();
        else groupSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(list.map((b) => b.id));
        return;
      }
      if (e.key === "Escape") {
        setSelected([]);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected.length) {
        e.preventDefault();
        deleteSelection();
        return;
      }
      const step = e.shiftKey ? 20 : 2;
      const nudge: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const d = nudge[e.key];
      if (d && selected.length) {
        e.preventDefault();
        // Arrow-key nudges within a beat collapse into one restore point.
        applySelectionUpdate(
          (b) => ({ x: b.x + d[0], y: b.y + d[1] }),
          "Nudge objects",
          `nudge:${selected.join(",")}`,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- align / distribute ------------------------------------------------

  const alignSelection = (edge: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    if (selectedBlocks.length < 2) return;
    const b = boundsOf(selectedBlocks);
    const label = `Align ${edge}`;
    if (edge === "left") applySelectionUpdate(() => ({ x: b.x }), label);
    else if (edge === "right") applySelectionUpdate((k) => ({ x: b.x + b.w - k.w }), label);
    else if (edge === "hcenter")
      applySelectionUpdate((k) => ({ x: b.x + b.w / 2 - k.w / 2 }), label);
    else if (edge === "top") applySelectionUpdate(() => ({ y: b.y }), label);
    else if (edge === "bottom") applySelectionUpdate((k) => ({ y: b.y + b.h - k.h }), label);
    else applySelectionUpdate((k) => ({ y: b.y + b.h / 2 - k.h / 2 }), label);
  };

  const distributeSpacing = (axis: "x" | "y") => {
    if (selectedBlocks.length < 3) return;
    const size = axis === "x" ? "w" : "h";
    const sorted = [...selectedBlocks].sort((a, b) => a[axis] - b[axis]);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const span = last[axis] + last[size] - first[axis];
    const gap = (span - sorted.reduce((s, b) => s + b[size], 0)) / (sorted.length - 1);
    let cursor = first[axis];
    const next = new Map<string, Partial<CanvasBlock>>();
    sorted.forEach((b, i) => {
      next.set(b.id, { [axis]: Math.round(i === sorted.length - 1 ? last[axis] : cursor) });
      cursor += b[size] + gap;
    });
    patchMany(next, axis === "x" ? "Distribute horizontally" : "Distribute vertically");
  };

  const centerOnStage = (axis: "x" | "y" | "both") => {
    if (!selectionBounds) return;
    const b = selectionBounds;
    const dx = STAGE_W / 2 - (b.x + b.w / 2);
    const dy = STAGE_H / 2 - (b.y + b.h / 2);
    applySelectionUpdate(
      (k) => ({
        ...(axis === "x" || axis === "both" ? { x: Math.round(k.x + dx) } : {}),
        ...(axis === "y" || axis === "both" ? { y: Math.round(k.y + dy) } : {}),
      }),
      "Center on slide",
    );
  };

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addBlock("image", { src: String(reader.result), alt: file.name });
    reader.readAsDataURL(file);
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      data-dragging={dragging ?? undefined}

      onPointerDown={(e) => {
        if (e.button !== 0) return;
        if (textTool) return; // let the click reach the module text underneath
        setEditingId(null);
        if (pickMode !== "off") {
          e.preventDefault();
          if (pickMode === "remove") removeSectionAt(e.clientX, e.clientY);
          else if (pickMode === "card") {
            if (!adoptCardAt(e.clientX, e.clientY)) adoptAt(e.clientX, e.clientY);
          } else adoptAt(e.clientX, e.clientY);
          return;
        }
        const origin = stageFromClient(e.clientX, e.clientY);
        dragRef.current = { mode: "marquee", origin, current: { ...origin } };
        setDragging("marquee");
      }}

      onPointerMove={(e) => {
        if (textTool) return;
        if (pickMode !== "off" && !dragRef.current) {
          const root = wrapRef.current;
          paintPick(
            root
              ? pickMode === "card"
                ? (cardTargetAt(root, e.clientX, e.clientY) ??
                  adoptTargetAt(root, e.clientX, e.clientY))
                : adoptTargetAt(root, e.clientX, e.clientY)
              : null,
          );
          return;
        }
        onPointerMove(e);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}

      // Double-click straight onto module content grabs it without arming a
      // mode first: whole box when there is one, otherwise the single element.
      onDoubleClick={(e) => {
        if (textTool || pickMode !== "off") return;
        const root = wrapRef.current;
        if (!root) return;
        const onBlock = (e.target as HTMLElement | null)?.closest("[data-canvas-block]");
        if (onBlock) return;
        if (!adoptCardAt(e.clientX, e.clientY)) adoptAt(e.clientX, e.clientY);
      }}
    >
      {children}

      <div
        className={`absolute inset-0 z-40 ${textTool ? "pointer-events-none" : ""}`}
        {...{ [CANVAS_UI_ATTR]: "" }}
      >
        {list.map((b) => {
          const isSelected = selectedSet.has(b.id);
          const isHover = hoverId === b.id && !isSelected;
          const emphasized = b.id === emphSelectedId || b.id === emphHoverId;
          const editing = editingId === b.id;
          const isText = isTextKind(b.kind);
          return (
            <div
              key={b.id}
              data-canvas-block={b.id}
              ref={(el) => {
                if (el) blockRefs.current.set(b.id, el);
                else blockRefs.current.delete(b.id);
              }}
              style={{
                ...canvasBlockFrameStyle(b),
                // Hidden layers stay on the stage as ghosts so they can be
                // grabbed again, but never ship (sortBlocks drops them).
                opacity: b.hidden ? 0.25 : (b.opacity ?? 1),


                boxShadow: emphasized
                  ? `0 0 0 10px ${b.id === emphSelectedId ? "rgba(0,63,199,0.16)" : "rgba(236,56,138,0.14)"}`
                  : undefined,
                outline: emphasized
                  ? `4px solid ${b.id === emphSelectedId ? "#003FC7" : "#EC388A"}`
                  : editing
                  ? `2px dashed ${accent}`
                  : isSelected
                    ? `2px solid ${accent}`
                    : isHover
                      ? "1px solid rgba(0,63,199,0.55)"
                      : "1px dashed rgba(0,0,0,0.12)",
                outlineOffset: 2,
                cursor: b.locked ? "not-allowed" : editing ? "text" : "move",
                userSelect: editing ? "text" : "none",
                touchAction: "none",
              }}
              // Hover is a render; never do it mid-gesture.
              onPointerEnter={() => {
                if (!dragRef.current) setHoverId(b.id);
              }}
              onPointerLeave={() => {
                if (!dragRef.current) setHoverId((h) => (h === b.id ? null : h));
              }}

              onPointerDown={(e) => beginMove(e, b)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (isText) setEditingId(b.id);
              }}
            >
              {editing && isText ? (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  autoFocus
                  style={{
                    ...canvasBlockFrameStyle(b),
                    position: "absolute",
                    inset: 0,
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    outline: "none",
                    color: b.color ?? ink,
                    fontSize: b.size ?? fontFor(b.kind),
                    fontWeight: b.weight ?? (b.kind === "heading" ? 700 : 500),
                    textAlign: b.align ?? "left",
                    whiteSpace: "pre-wrap",
                  }}
                  onBlur={(e) => {
                    commit(
                      list.map((x) =>
                        x.id === b.id ? { ...x, text: (e.currentTarget.textContent ?? "").trim() } : x,
                      ),
                      "Edit object text",
                      `text:${b.id}`,
                    );
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                >
                  {b.text}
                </div>
              ) : (
                <CanvasBlockContent block={b} ink={ink} />
              )}
            </div>
          );
        })}
      </div>

      {/* selection frame + resize handles */}
      {selectionBounds && !editingId && !textTool && (
        <div
          ref={selFrameRef}
          {...{ [CANVAS_UI_ATTR]: "" }}
          className="pointer-events-none absolute z-45"

          style={{
            left: `${(selectionBounds.x / STAGE_W) * 100}%`,
            top: `${(selectionBounds.y / STAGE_H) * 100}%`,
            width: `${(selectionBounds.w / STAGE_W) * 100}%`,
            height: `${(selectionBounds.h / STAGE_H) * 100}%`,
            border: `1.5px solid ${accent}`,
          }}
        >
          {HANDLES.map((h) => (
            <button
              key={h}
              type="button"
              aria-label={`Resize ${h}`}
              onPointerDown={(e) => beginResize(e, h)}
              className="pointer-events-auto absolute h-3.5 w-3.5 rounded-sm border border-white bg-[color:var(--h)] shadow"
              style={{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...( { "--h": accent } as any),
                ...handleOffset(h),
                cursor: `${h}-resize`,
                touchAction: "none",
              }}
            />
          ))}
        </div>
      )}

      {libraryOn && !textTool && (
        <div
          {...{ [CANVAS_UI_ATTR]: "" }}
          className={`absolute top-3 z-50 max-h-[calc(100%-1.5rem)] ${layersOn && !layersDocked ? "right-[19.5rem]" : "right-3"}`}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <CanvasInsertLibrary
            accent={accent}
            onInsert={insertFromLibrary}
            onClose={() => setLibraryOn(false)}
          />
        </div>
      )}

      {/*
        Assets. Uploads live beside the insert library (and clear of the layers
        pane) so a curator can pick an object on the stage and swap its artwork
        without losing sight of the selection.
      */}
      {assetsOn && !textTool && (
        <div
          {...{ [CANVAS_UI_ATTR]: "" }}
          className={`absolute top-3 z-50 max-h-[calc(100%-1.5rem)] ${
            layersOn && !layersDocked
              ? libraryOn
                ? "right-[41rem]"
                : "right-[19.5rem]"
              : libraryOn
                ? "right-[21.5rem]"
                : "right-3"
          }`}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <CanvasAssetPanel
            accent={accent}
            replaceCount={replaceTargets.length}
            onPlace={placeAsset}
            onReplace={replaceAssetInSelection}
            onClose={() => setAssetsOn(false)}
          />
        </div>
      )}



      {/*
        Layers (Selection Pane). Mounted here, inside the stage, floating on the
        right so it never steals stage width; it is UI chrome, so it carries the
        canvas-UI attribute and keeps clicks away from the pick/marquee handlers.
      */}
      {layersOn && !textTool && dockLayers(
        <div
          {...{ [CANVAS_UI_ATTR]: "" }}
          className={
            layersDocked
              ? "flex h-full w-full"
              : "absolute bottom-3 right-3 top-3 z-50 flex w-64"
          }
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <CanvasLayersPanel
            size={layersDocked ? "studio" : "compact"}
            blocks={list}
            selected={selected}
            accent={accent}
            onSelect={(ids, additive) =>
              setSelected((prev) => {
                const add = expandGroups(ids);
                if (!additive) return add;
                const set = new Set(prev);
                const allIn = add.every((id) => set.has(id));
                for (const id of add) (allIn ? set.delete(id) : set.add(id));
                return [...set];
              })
            }
            onSetHidden={setHidden}
            onSetLocked={setLocked}
            onSetExportExcluded={setExportExcluded}
            onExportSelectionOnly={setExportSelectionOnly}
            onMoveBefore={moveBefore}
            onGroup={groupSelection}
            onUngroup={ungroupSelection}
            onClose={() => setLayersOn(false)}
          />
        </div>
      )}



      {/* snap grid — purely visual, matches the GRID fallback in canvas-snap */}
      {gridOn && (
        <div
          {...{ [CANVAS_UI_ATTR]: "" }}
          className="pointer-events-none absolute inset-0 z-30"
          style={{
            // Fine 20-unit lines stay whisper-light so artwork still reads;
            // every 5th line is darker to give the eye a ruler.
            backgroundImage: [
              "linear-gradient(to right, rgba(3,0,44,0.16) 1px, transparent 1px)",
              "linear-gradient(to bottom, rgba(3,0,44,0.16) 1px, transparent 1px)",
              "linear-gradient(to right, rgba(3,0,44,0.06) 1px, transparent 1px)",
              "linear-gradient(to bottom, rgba(3,0,44,0.06) 1px, transparent 1px)",
            ].join(","),
            backgroundSize: [
              `${((GRID * 5) / STAGE_W) * 100}% 100%`,
              `100% ${((GRID * 5) / STAGE_H) * 100}%`,
              `${(GRID / STAGE_W) * 100}% 100%`,
              `100% ${(GRID / STAGE_H) * 100}%`,
            ].join(","),
          }}
        />
      )}

      {/* alignment guides + marquee — persistent nodes, painted imperatively */}
      <div
        ref={guideXRef}
        className="pointer-events-none absolute bottom-0 top-0 z-50 w-px"
        style={{ display: "none", background: accent }}
      />
      <div
        ref={guideYRef}
        className="pointer-events-none absolute left-0 right-0 z-50 h-px"
        style={{ display: "none", background: accent }}
      />
      <div
        ref={marqueeRef}
        className="pointer-events-none absolute z-50 border border-dashed"
        style={{ display: "none", borderColor: accent, background: "rgba(0,63,199,0.08)" }}
      />


      {/* pick-mode hover outline */}
      <div
        ref={pickRef}
        {...{ [CANVAS_UI_ATTR]: "" }}
        className="pointer-events-none absolute z-50 rounded-md"
        style={{
          display: "none",
          // Red while removing so a destructive click never looks like a pick.
          outline: `2px solid ${pickMode === "remove" ? "#E53D2E" : accent}`,
          outlineOffset: 1,
          background: pickMode === "remove" ? "rgba(229,61,46,0.16)" : "rgba(236,56,138,0.10)",
        }}
      />

      {/* ---------------------------------------------------------------
          ONE studio toolbar. Row 1 = always-on tools grouped by job,
          Row 2 = contextual selection controls (used to be a second
          floating bar at the bottom of the slide).
          --------------------------------------------------------------- */}
      {dockToolbar(
      <div
        {...{ [CANVAS_UI_ATTR]: "" }}
        data-studio-toolbar={docked ? toolbarVariant : "overlay"}
        role="toolbar"
        aria-label="Slide studio tools"
        className={
          docked
            ? `pointer-events-auto flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-2.5 text-[14px] font-medium normal-case leading-none tracking-normal text-foreground shadow-sm ${
                toolbarVariant === "sticky" ? "sticky top-0 z-[60]" : ""
              }`
            : "pointer-events-auto absolute left-3 top-3 z-50 flex max-w-[calc(100%-1.5rem)] flex-col gap-2 rounded-2xl bg-card/95 p-2.5 text-[14px] font-medium normal-case leading-none tracking-normal text-foreground ring-1 ring-border shadow-md backdrop-blur-md"
        }
        style={{
          // Scaling the shell (not just the font) grows labels, glyphs, padding
          // and hit areas together. Origin keeps it pinned to its corner.
          transform: toolbarScale.scale === 1 ? undefined : `scale(${toolbarScale.scale})`,
          transformOrigin: "top left",
          // The un-scaled box would otherwise clip the grown toolbar's wrapping.
          maxWidth: docked
            ? `calc(100% / ${toolbarScale.scale})`
            : `calc((100% - 1.5rem) / ${toolbarScale.scale})`,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ---------- row 1: tools ---------- */}
        <div className="flex flex-wrap items-center gap-2">
          {onToolChange && (
            <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
              {(
                [
                  ["text", "✎", "Text"],
                  ["objects", "◇", "Objects"],
                ] as const
              ).map(([t, glyph, label]) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tool === t}
                  onClick={() => onToolChange(t)}
                  title={
                    t === "text"
                      ? "Edit the module's own copy in place"
                      : "Move, resize and add objects on the slide"
                  }
                  className={`flex min-h-8 items-center gap-1.5 rounded-lg px-3 transition-colors ${tool === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
                >
                  <span aria-hidden>{glyph}</span>
                  {label}
                </button>
              ))}
            </div>
          )}

          {textTool ? (
            <span className="px-1 text-muted-foreground">
              Click any highlighted text to edit · Enter saves · Esc cancels
            </span>
          ) : (
            <>
              <ToolGroup label="Insert">
                {(["heading", "body", "caption", "shape"] as CanvasBlockKind[]).map((k) => (
                  <TBtn key={k} label={k} onClick={() => addBlock(k)} title={`Add ${k}`} />
                ))}
                <TBtn
                  label={libraryOn ? "● shapes + icons" : "◇ shapes + icons"}
                  pressed={libraryOn}
                  title="Browse the shape inventory and icon set, then click to place one on the slide"
                  onClick={() => setLibraryOn((v) => !v)}
                />
                <TBtn
                  label={
                    assetsOn
                      ? "● assets"
                      : replaceTargets.length > 0
                        ? `⇄ replace asset (${replaceTargets.length})`
                        : "⬆ assets"
                  }
                  pressed={assetsOn}
                  title="Upload your own photos, icons and SVGs — place them, or swap the artwork inside a selected object"
                  onClick={() => setAssetsOn((v) => !v)}
                />
                <TBtn
                  label="card box"
                  onClick={addCard}
                  title="Add a complete card — plate, icon badge, number, title and copy — as one grouped box"
                />
                <TBtn label="image" onClick={() => fileRef.current?.click()} title="Add image" />
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
              </ToolGroup>

              <ToolGroup label="Module">
                <TBtn
                  label="≡ load layers"
                  title="Load every section this slide already has as editable layers (cards grouped, text and images separate)"
                  onClick={() => {
                    setLayersOn(true);
                    adoptAllSections();
                  }}
                />

                <TBtn
                  label={pickMode === "adopt" ? "● picking" : "✥ pick section"}
                  title="Pick a section or asset the module drew and make it movable"
                  pressed={pickMode === "adopt"}
                  activeColor="#EC388A"
                  onClick={() => setPickMode((v) => (v === "adopt" ? "off" : "adopt"))}
                />
                <TBtn
                  label={pickMode === "card" ? "● picking box" : "▣ pick box"}
                  title="Click any card the module drew to make the whole box (plate, icon, title, copy) movable and duplicable"
                  pressed={pickMode === "card"}
                  activeColor="#A6FA87"
                  onClick={() => setPickMode((v) => (v === "card" ? "off" : "card"))}
                />
                <TBtn
                  label={pickMode === "remove" ? "● removing" : "⌫ delete section"}
                  title="Click a module section to delete it from this slide (your copy only — the shared module is unchanged)"
                  pressed={pickMode === "remove"}
                  activeColor="#E53D2E"
                  onClick={() => setPickMode((v) => (v === "remove" ? "off" : "remove"))}
                />
                {removedCount > 0 && (
                  <TBtn
                    label={`↺ restore (${removedCount})`}
                    title="Bring back every module section deleted on this slide"
                    onClick={restoreRemoved}
                  />
                )}
              </ToolGroup>

              {(onUndo || onRedo) && (
                <ToolGroup label="History">
                  {onUndo && (
                    <TBtn
                      label="↶ undo"
                      title={undoLabel ? `Undo ${undoLabel} (⌘Z)` : "Undo (⌘Z)"}
                      ariaLabel={undoLabel ? `Undo ${undoLabel}` : "Undo"}
                      disabled={canUndo === false}
                      onClick={onUndo}
                    />
                  )}
                  {onRedo && (
                    <TBtn
                      label="↷ redo"
                      title={redoLabel ? `Redo ${redoLabel} (⇧⌘Z)` : "Redo (⇧⌘Z)"}
                      ariaLabel={redoLabel ? `Redo ${redoLabel}` : "Redo"}
                      disabled={canRedo === false}
                      onClick={onRedo}
                    />
                  )}
                </ToolGroup>
              )}

              <ToolGroup label="View">
                <TBtn
                  label="snap"
                  title="Toggle snapping (hold Alt to bypass)"
                  pressed={snapOn}
                  onClick={() => setSnapOn((v) => !v)}
                />
                <TBtn
                  label="grid"
                  title="Show the 20-unit snap grid"
                  pressed={gridOn}
                  onClick={() => setGridOn((v) => !v)}
                />
                <TBtn
                  label="☰ layers"
                  title="Layers: reorder, lock, hide and group objects and adopted module sections"
                  pressed={layersOn}
                  onClick={() => setLayersOn((v) => !v)}
                />
                <TBtn
                  label={`A⁺ ${toolbarScale.label}`}
                  title="Toolbar size — cycle 100% / 115% / 130% / 150% for easier reading (saved for you)"
                  ariaLabel={`Toolbar size ${toolbarScale.label}. Click to increase.`}
                  onClick={toolbarScale.cycle}
                />
              </ToolGroup>

              {onSaveAsModule && (
                <button
                  type="button"
                  onClick={onSaveAsModule}
                  className="ml-auto flex min-h-8 items-center rounded-xl bg-primary px-3.5 font-semibold text-primary-foreground transition-colors hover:opacity-90"
                >
                  ⤓ Save to My Files
                </button>
              )}
            </>
          )}
        </div>

        {/* ---------- row 2: contextual selection controls ---------- */}
        {selectedBlocks.length > 0 && !textTool && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/60 p-2"
            role="group"
            aria-label="Canvas object controls"
          >
            <span
              className="flex min-h-7 items-center rounded-lg px-2.5 text-[13px] font-semibold text-[#03002C]"
              style={{ background: accent }}
            >
              {selectedBlocks.length} selected
            </span>

            <ToolGroup label="Align">
              {(
                [
                  ["left", "L"],
                  ["hcenter", "C"],
                  ["right", "R"],
                  ["top", "T"],
                  ["vcenter", "M"],
                  ["bottom", "B"],
                ] as const
              ).map(([edge, label]) => (
                <TBtn
                  key={edge}
                  label={label}
                  title={`Align ${edge}`}
                  disabled={selectedBlocks.length < 2}
                  onClick={() => alignSelection(edge)}
                />
              ))}
            </ToolGroup>

            <ToolGroup label="Center on slide">
              <TBtn label="↔" title="Center on slide horizontally" onClick={() => centerOnStage("x")} />
              <TBtn label="↕" title="Center on slide vertically" onClick={() => centerOnStage("y")} />
            </ToolGroup>

            <ToolGroup label="Distribute">
              <TBtn
                label="H"
                title="Distribute horizontal spacing"
                disabled={selectedBlocks.length < 3}
                onClick={() => distributeSpacing("x")}
              />
              <TBtn
                label="V"
                title="Distribute vertical spacing"
                disabled={selectedBlocks.length < 3}
                onClick={() => distributeSpacing("y")}
              />
            </ToolGroup>

            <ToolGroup label="Layer">
              <TBtn label="⤒" title="Bring to front" onClick={() => reorder("front")} />
              <TBtn label="↑" title="Bring forward" onClick={() => reorder("forward")} />
              <TBtn label="↓" title="Send backward" onClick={() => reorder("backward")} />
              <TBtn label="⤓" title="Send to back" onClick={() => reorder("back")} />
            </ToolGroup>

            <ToolGroup label="Arrange">
              <TBtn
                label="group"
                title="Group selection (⌘G)"
                disabled={selectedBlocks.length < 2}
                onClick={groupSelection}
              />
              <TBtn
                label="ungroup"
                title="Ungroup selection (⇧⌘G)"
                disabled={!selectedBlocks.some((b) => b.groupId)}
                onClick={ungroupSelection}
              />
              <TBtn label="duplicate" title="Duplicate (⌘D)" onClick={duplicateSelection} />
              <TBtn
                label={selectedBlocks.every((b) => b.locked) ? "unlock" : "lock"}
                title="Lock position"
                onClick={() => {
                  const lock = !selectedBlocks.every((b) => b.locked);
                  applySelectionUpdate(
                    () => ({ locked: lock }),
                    lock ? "Lock objects" : "Unlock objects",
                  );
                }}
              />
              <TBtn
                label="release"
                title="Give this section back to the module (undo adopt)"
                disabled={!selectedBlocks.some((b) => b.sourceSelector)}
                onClick={releaseSelection}
              />
              <TBtn label="delete" title="Delete (⌫)" danger onClick={deleteSelection} />
            </ToolGroup>

            <TBtn
              label="✕ clear"
              title="Clear selection"
              onClick={() => setSelected([])}
            />
          </div>
        )}
      </div>,
      )}

    </div>
  );
}

function fontFor(kind: CanvasBlockKind): number {
  return kind === "heading" ? 96 : kind === "body" ? 40 : 26;
}

function handleOffset(h: ResizeHandle): React.CSSProperties {
  const mid = "calc(50% - 7px)";
  const neg = -7;
  switch (h) {
    case "nw":
      return { left: neg, top: neg };
    case "n":
      return { left: mid, top: neg };
    case "ne":
      return { right: neg, top: neg };
    case "e":
      return { right: neg, top: mid };
    case "se":
      return { right: neg, bottom: neg };
    case "s":
      return { left: mid, bottom: neg };
    case "sw":
      return { left: neg, bottom: neg };
    default:
      return { left: neg, top: mid };
  }
}

/**
 * Labelled cluster of related tools. The tiny caption is what makes the single
 * unified toolbar scannable instead of a wall of glyphs.
 */
function ToolGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-muted px-2 py-1">
      <span className="select-none pr-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

/** Toolbar button — readable label, 32px hit area, on/off + danger states. */
function TBtn({
  label,
  title,
  onClick,
  disabled,
  pressed,
  danger,
  activeColor,
  ariaLabel,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  danger?: boolean;
  activeColor?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel ?? title}
      aria-pressed={pressed === undefined ? undefined : pressed}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-[13px] transition-colors disabled:opacity-30 ${
        pressed
          ? activeColor
            ? "text-foreground"
            : "bg-primary text-primary-foreground"
          : danger
            ? "text-foreground hover:bg-[#E53D2E] hover:text-white"
            : "text-foreground hover:bg-background"
      }`}
      style={pressed && activeColor ? { background: activeColor, color: "#03002C" } : undefined}
    >
      {label}
    </button>
  );
}

