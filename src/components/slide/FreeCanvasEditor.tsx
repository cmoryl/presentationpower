import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanvasBlock, CanvasBlockKind } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";
import {
  boundsOf,
  buildSnapTargets,
  clampToStage,
  rectsIntersect,
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
  adoptTargetAt,
  blockFromElement,
} from "@/lib/canvas-adopt";
import { useHideAdoptedSources } from "./AdoptedSourceHider";
import {
  blockFontSize,
  CanvasBlockContent,
  canvasBlockFrameStyle,
  sortBlocks,
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
  children: React.ReactNode;
}) {
  const textTool = tool === "text";
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [snapOn, setSnapOn] = useState(true);
  /**
   * "Pick from module" mode: the next click adopts whatever the module painted
   * under the cursor into a real, movable canvas block (see lib/canvas-adopt).
   */
  const [pickMode, setPickMode] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);
  /** Only flips at gesture start/end — pointer-moves never re-render. */
  const [dragging, setDragging] = useState<DragState["mode"] | null>(null);

  // Switching to the text tool must not leave a live pick / selection armed.
  useEffect(() => {
    if (!textTool) return;
    setPickMode(false);
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

  const list = useMemo(() => (blocks ? sortBlocks(blocks) : []), [blocks]);
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

  /** Give a section back to the module: drop the block, un-hide the original. */
  const releaseSelection = () => {
    if (!selectedBlocks.some((b) => b.sourceSelector)) return;
    commit(
      list.filter((b) => !(selectedSet.has(b.id) && b.sourceSelector)),
      "Release to module",
    );
    setSelected([]);
  };

  const duplicateSelection = () => {
    if (!selectedBlocks.length) return;
    const copies = selectedBlocks.map((b, i) => ({
      ...b,
      id: `blk-${Math.random().toString(36).slice(2, 9)}`,
      x: b.x + 40,
      y: b.y + 40,
      groupId: b.groupId ? `${b.groupId}-copy` : undefined,
      z: list.length + i,
    }));
    commit([...list, ...copies], `Duplicate ${copies.length} object(s)`);
    setSelected(copies.map((c) => c.id));
  };

  const deleteSelection = () => {
    if (!selected.length) return;
    commit(list.filter((b) => !selected.includes(b.id)), `Delete ${selected.length} object(s)`);
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
        gx.style.background = x.kind === "object" ? "#EC388A" : accent;
      }
    }
    if (gy) {
      gy.style.display = y ? "" : "none";
      if (y) {
        gy.style.top = `${(y.at / STAGE_H) * 100}%`;
        gy.style.background = y.kind === "object" ? "#EC388A" : accent;
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
      targets: buildSnapTargets(others(moving)),
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
      targets: buildSnapTargets(others(new Set(startBoxes.keys()))),
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
        if (pickMode) {
          e.preventDefault();
          adoptAt(e.clientX, e.clientY);
          return;
        }
        const origin = stageFromClient(e.clientX, e.clientY);
        dragRef.current = { mode: "marquee", origin, current: { ...origin } };
        setDragging("marquee");
      }}

      onPointerMove={(e) => {
        if (textTool) return;
        if (pickMode && !dragRef.current) {
          const root = wrapRef.current;
          paintPick(root ? adoptTargetAt(root, e.clientX, e.clientY) : null);
          return;
        }
        onPointerMove(e);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {children}

      <div
        className={`absolute inset-0 z-40 ${textTool ? "pointer-events-none" : ""}`}
        {...{ [CANVAS_UI_ATTR]: "" }}
      >
        {list.map((b) => {
          const isSelected = selectedSet.has(b.id);
          const isHover = hoverId === b.id && !isSelected;
          const editing = editingId === b.id;
          const isText = isTextKind(b.kind);
          return (
            <div
              key={b.id}
              ref={(el) => {
                if (el) blockRefs.current.set(b.id, el);
                else blockRefs.current.delete(b.id);
              }}
              style={{
                ...canvasBlockFrameStyle(b),

                outline: editing
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
          outline: `2px solid ${accent}`,
          outlineOffset: 1,
          background: "rgba(236,56,138,0.10)",
        }}
      />

      {/* insert toolbar */}
      <div
        {...{ [CANVAS_UI_ATTR]: "" }}
        className="pointer-events-auto absolute left-3 top-3 z-50 flex flex-wrap items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onToolChange && (
          <>
            {(
              [
                ["text", "✎ text"],
                ["objects", "◇ objects"],
              ] as const
            ).map(([t, label]) => (
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
                className={`rounded-full px-2 ${tool === t ? "bg-white text-black" : "hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-white/20" />
          </>
        )}
        {textTool ? (
          <span className="px-1 font-medium normal-case tracking-normal opacity-70">
            Click any highlighted text to edit · Enter saves · Esc cancels
          </span>
        ) : (
        <>
        {(["heading", "body", "caption", "shape"] as CanvasBlockKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => addBlock(k)}
            className="rounded-full px-2 hover:bg-white/10"
          >
            + {k}
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full px-2 hover:bg-white/10"
        >
          + image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPickImage(e.target.files?.[0])}
        />
        <span className="mx-1 h-4 w-px bg-white/20" />
        <button
          type="button"
          aria-pressed={pickMode}
          onClick={() => setPickMode((v) => !v)}
          title="Pick a section or asset the module drew and make it movable"
          className={`rounded-full px-2 ${pickMode ? "bg-[#EC388A] text-white" : "hover:bg-white/10"}`}
        >
          {pickMode ? "● picking" : "✥ pick from module"}
        </button>
        <span className="mx-1 h-4 w-px bg-white/20" />
        <button
          type="button"
          aria-pressed={snapOn}
          onClick={() => setSnapOn((v) => !v)}
          className={`rounded-full px-2 hover:bg-white/10 ${snapOn ? "bg-white/20" : ""}`}
          title="Toggle snapping (hold Alt to bypass)"
        >
          snap
        </button>
        {onSaveAsModule && (
          <button
            type="button"
            onClick={onSaveAsModule}
            className="rounded-full bg-white/15 px-2 hover:bg-white/25"
          >
            save as my module
          </button>
        )}
        </>
        )}
      </div>

      {/* object toolbar */}
      {selectedBlocks.length > 0 && !textTool && (
        <div
          className="pointer-events-auto absolute bottom-3 left-1/2 z-50 flex max-w-[92%] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl bg-black/85 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white shadow-lg"
          role="toolbar"
          aria-label="Canvas object controls"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="px-1 opacity-60">{selectedBlocks.length} selected</span>
          <Sep />
          <span className="px-1 opacity-60">Align</span>
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
            <Btn
              key={edge}
              label={label}
              title={`Align ${edge}`}
              disabled={selectedBlocks.length < 2}
              onClick={() => alignSelection(edge)}
            />
          ))}
          <Sep />
          <span className="px-1 opacity-60">Slide</span>
          <Btn label="↔" title="Center on slide horizontally" onClick={() => centerOnStage("x")} />
          <Btn label="↕" title="Center on slide vertically" onClick={() => centerOnStage("y")} />
          <Sep />
          <span className="px-1 opacity-60">Distribute</span>
          <Btn
            label="H"
            title="Distribute horizontal spacing"
            disabled={selectedBlocks.length < 3}
            onClick={() => distributeSpacing("x")}
          />
          <Btn
            label="V"
            title="Distribute vertical spacing"
            disabled={selectedBlocks.length < 3}
            onClick={() => distributeSpacing("y")}
          />
          <Sep />
          <span className="px-1 opacity-60">Layer</span>
          <Btn label="⤒" title="Bring to front" onClick={() => reorder("front")} />
          <Btn label="↑" title="Bring forward" onClick={() => reorder("forward")} />
          <Btn label="↓" title="Send backward" onClick={() => reorder("backward")} />
          <Btn label="⤓" title="Send to back" onClick={() => reorder("back")} />
          <Sep />
          <Btn
            label="Group"
            title="Group selection (⌘G)"
            disabled={selectedBlocks.length < 2}
            onClick={groupSelection}
          />
          <Btn
            label="Ungroup"
            title="Ungroup selection (⇧⌘G)"
            disabled={!selectedBlocks.some((b) => b.groupId)}
            onClick={ungroupSelection}
          />
          <Sep />
          <Btn label="Duplicate" title="Duplicate (⌘D)" onClick={duplicateSelection} />
          <Btn
            label={selectedBlocks.every((b) => b.locked) ? "Unlock" : "Lock"}
            title="Lock position"
            onClick={() => {
              const lock = !selectedBlocks.every((b) => b.locked);
              applySelectionUpdate(() => ({ locked: lock }), lock ? "Lock objects" : "Unlock objects");
            }}
          />
          <Btn
            label="Release"
            title="Give this section back to the module (undo adopt)"
            disabled={!selectedBlocks.some((b) => b.sourceSelector)}
            onClick={releaseSelection}
          />
          <Btn label="Delete" title="Delete (⌫)" onClick={deleteSelection} />
          <Btn label="✕" title="Clear selection" onClick={() => setSelected([])} />
        </div>
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

function Sep() {
  return <span className="mx-1 h-4 w-px bg-white/20" />;
}

function Btn({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded px-1.5 hover:bg-white/10 disabled:opacity-30"
    >
      {label}
    </button>
  );
}
