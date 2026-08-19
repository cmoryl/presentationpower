// Open Canvas Studio — free-form slide composition for admins.
//
// A composition is a 1920×1080 stage holding independent items: whole preset
// module variants (rendered live through VariantRenderer), text fields, stat
// blocks, imagery, and plain surfaces. Items can be mixed freely on one slide,
// which is what separates this from the module-per-slide deck editor.
//
// Persisted locally (per browser) so an admin can iterate without touching a
// deck. Compositions can be pushed into a deck from the studio UI.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CanvasFillSpec } from "./canvas-fill";
import { nanoid } from "nanoid";
import { retintItemsForMode } from "./canvas-mode-ink";

export type StageBox = { x: number; y: number; w: number; h: number };

export type CanvasItemBase = StageBox & {
  id: string;
  z: number;
  locked?: boolean;
  /** Hidden layers stay in the composition but are not rendered on the stage. */
  hidden?: boolean;
  /** Optional layer name shown in the layers panel. */
  name?: string;
};

export type ModuleItem = CanvasItemBase & {
  type: "module";
  variantId: string;
  /** How the 1920×1080 module render is mapped into the item box. */
  fit: "cover" | "contain";
  mode?: "light" | "dark";
  /** Nudge the module render inside the box (stage units). */
  offsetX?: number;
  offsetY?: number;
};

export type TextItem = CanvasItemBase & {
  type: "text";
  text: string;
  size: number;
  weight: 400 | 500 | 600 | 700;
  align: "left" | "center" | "right";
  color?: string;
  tracking?: number;
  uppercase?: boolean;
};

export type ImageItem = CanvasItemBase & {
  type: "image";
  url: string;
  fit: "cover" | "contain";
  radius: number;
  alt?: string;
};

export type StatItem = CanvasItemBase & {
  type: "stat";
  value: string;
  label: string;
  accent?: string;
  surface: "plate" | "bare";
};

export type SurfaceItem = CanvasItemBase &
  CanvasFillSpec & {
    type: "surface";
    fill: string;
    radius: number;
    opacity: number;
    /** Optional 1px outline, kept when a module plate painted a border. */
    stroke?: string;
  };


export type CanvasItem = ModuleItem | TextItem | ImageItem | StatItem | SurfaceItem;
export type CanvasItemType = CanvasItem["type"];

export type CanvasComposition = {
  id: string;
  name: string;
  mode: "light" | "dark";
  brandId: string;
  background?: string;
  items: CanvasItem[];
  updatedAt: string;
  /** saved_modules row id once the composition has been saved to My Files. */
  savedFileId?: string | null;
  savedAt?: string | null;
};

export const STAGE_W = 1920;
export const STAGE_H = 1080;

function topZ(items: readonly CanvasItem[]): number {
  return items.reduce((m, i) => Math.max(m, i.z), 0) + 1;
}

export function makeItem(
  type: CanvasItemType,
  at: { x: number; y: number },
  extra: Partial<CanvasItem> & { variantId?: string; url?: string } = {},
  items: readonly CanvasItem[] = [],
): CanvasItem {
  const id = `ci-${nanoid(8)}`;
  const z = topZ(items);
  const clamp = (v: number, max: number, size: number) =>
    Math.max(0, Math.min(max - size, Math.round(v)));
  switch (type) {
    case "module": {
      // A module is authored at slide size, so it lands at slide size: the whole
      // 1920×1080 stage, aligned to the corner. Dropping one used to give a
      // half-scale box that every user then had to stretch back out by hand.
      const w = STAGE_W;
      const h = STAGE_H;
      return {
        id,
        z,
        type: "module",
        variantId: String(extra.variantId ?? ""),
        fit: "cover",
        x: 0,
        y: 0,
        w,
        h,
        ...(extra as object),
      } as ModuleItem;
    }
    case "text":
      return {
        id,
        z,
        type: "text",
        text: "New text field",
        size: 48,
        weight: 600,
        align: "left",
        x: clamp(at.x - 300, STAGE_W, 600),
        y: clamp(at.y - 40, STAGE_H, 80),
        w: 600,
        h: 90,
        ...(extra as object),
      } as TextItem;
    case "image":
      return {
        id,
        z,
        type: "image",
        url: String(extra.url ?? ""),
        fit: "cover",
        radius: 28,
        x: clamp(at.x - 320, STAGE_W, 640),
        y: clamp(at.y - 180, STAGE_H, 360),
        w: 640,
        h: 360,
        ...(extra as object),
      } as ImageItem;
    case "stat":
      return {
        id,
        z,
        type: "stat",
        value: "92%",
        label: "Describe the metric",
        surface: "plate",
        x: clamp(at.x - 210, STAGE_W, 420),
        y: clamp(at.y - 130, STAGE_H, 260),
        w: 420,
        h: 260,
        ...(extra as object),
      } as StatItem;
    default:
      return {
        id,
        z,
        type: "surface",
        fill: "#E0E8F5",
        radius: 32,
        opacity: 1,
        x: clamp(at.x - 300, STAGE_W, 600),
        y: clamp(at.y - 180, STAGE_H, 360),
        w: 600,
        h: 360,
        ...(extra as object),
      } as SurfaceItem;
  }
}

function blank(name: string, brandId: string): CanvasComposition {
  return {
    id: `cc-${nanoid(8)}`,
    name,
    mode: "light",
    brandId,
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

type StudioState = {
  compositions: CanvasComposition[];
  activeId: string | null;
  selectedIds: string[];
  /** Undo/redo rings of whole-composition-list snapshots (session only). */
  past: CanvasComposition[][];
  future: CanvasComposition[][];
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  createComposition: (name: string, brandId: string) => string;
  duplicateComposition: (id: string) => void;
  deleteComposition: (id: string) => void;
  setActive: (id: string) => void;
  patchComposition: (id: string, patch: Partial<Omit<CanvasComposition, "id" | "items">>) => void;
  addItem: (compId: string, item: CanvasItem) => void;
  patchItem: (compId: string, itemId: string, patch: Partial<CanvasItem>) => void;
  /** Nudge/drag many items at once and record ONE history step. */
  patchItems: (compId: string, patches: Record<string, Partial<CanvasItem>>) => void;
  removeItem: (compId: string, itemId: string) => void;
  removeItems: (compId: string, itemIds: readonly string[]) => void;
  duplicateItem: (compId: string, itemId: string) => void;
  reorderItem: (compId: string, itemId: string, dir: "front" | "back" | "forward" | "backward") => void;
  setSelected: (ids: string[]) => void;
  clearItems: (compId: string) => void;
  /** Coalesce the next N mutations into the previous history step (drag streams). */
  beginBatch: () => void;
  endBatch: () => void;
};

const touch = (c: CanvasComposition, items?: CanvasItem[]): CanvasComposition => ({
  ...c,
  ...(items ? { items } : {}),
  updatedAt: new Date().toISOString(),
});

const HISTORY_LIMIT = 60;

/** While > 0, mutations do NOT open a new undo step — a live drag is one edit. */
let batchDepth = 0;

export const useCanvasStudio = create<StudioState>()(
  persist(
    (set, get) => {
      /** History fields to merge into any mutating `set`. */
      const step = (s: StudioState) =>
        batchDepth > 0
          ? {}
          : {
              past: [...s.past, s.compositions].slice(-HISTORY_LIMIT),
              future: [] as CanvasComposition[][],
            };

      return {
        compositions: [],
        activeId: null,
        selectedIds: [],
        past: [],
        future: [],
        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,
        beginBatch: () => {
          if (batchDepth === 0) {
            const s = get();
            set({
              past: [...s.past, s.compositions].slice(-HISTORY_LIMIT),
              future: [],
            });
          }
          batchDepth += 1;
        },
        endBatch: () => {
          batchDepth = Math.max(0, batchDepth - 1);
        },
        undo: () =>
          set((s) => {
            const prev = s.past[s.past.length - 1];
            if (!prev) return {};
            return {
              compositions: prev,
              past: s.past.slice(0, -1),
              future: [...s.future, s.compositions].slice(-HISTORY_LIMIT),
              selectedIds: [],
            };
          }),
        redo: () =>
          set((s) => {
            const next = s.future[s.future.length - 1];
            if (!next) return {};
            return {
              compositions: next,
              future: s.future.slice(0, -1),
              past: [...s.past, s.compositions].slice(-HISTORY_LIMIT),
              selectedIds: [],
            };
          }),
        createComposition: (name, brandId) => {
          const comp = blank(name, brandId);
          set((s) => ({
            ...step(s),
            compositions: [comp, ...s.compositions],
            activeId: comp.id,
            selectedIds: [],
          }));
          return comp.id;
        },
        duplicateComposition: (id) => {
          const src = get().compositions.find((c) => c.id === id);
          if (!src) return;
          const copy: CanvasComposition = {
            ...src,
            id: `cc-${nanoid(8)}`,
            name: `${src.name} copy`,
            items: src.items.map((i) => ({ ...i, id: `ci-${nanoid(8)}` })),
            updatedAt: new Date().toISOString(),
          };
          set((s) => ({
            ...step(s),
            compositions: [copy, ...s.compositions],
            activeId: copy.id,
          }));
        },
        deleteComposition: (id) =>
          set((s) => {
            const rest = s.compositions.filter((c) => c.id !== id);
            return {
              ...step(s),
              compositions: rest,
              activeId: s.activeId === id ? (rest[0]?.id ?? null) : s.activeId,
              selectedIds: [],
            };
          }),
        setActive: (id) => set({ activeId: id, selectedIds: [] }),
        patchComposition: (id, patch) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) => {
              if (c.id !== id) return c;
              // Appearance flip: baked-in neutral ink (adopted/exploded module
              // copy and plates) is re-inked for the new mode, so dark never
              // leaves near-black text on a near-black stage.
              if (patch.mode && patch.mode !== c.mode) {
                const { items } = retintItemsForMode(c.items, c.mode, patch.mode);
                return touch({ ...c, ...patch }, items);
              }
              return touch({ ...c, ...patch });
            }),
          })),
        addItem: (compId, item) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) =>
              c.id === compId ? touch(c, [...c.items, item]) : c,
            ),
            selectedIds: [item.id],
          })),
        patchItem: (compId, itemId, patch) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) =>
              c.id === compId
                ? touch(
                    c,
                    c.items.map((i) => (i.id === itemId ? ({ ...i, ...patch } as CanvasItem) : i)),
                  )
                : c,
            ),
          })),
        patchItems: (compId, patches) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) =>
              c.id === compId
                ? touch(
                    c,
                    c.items.map((i) =>
                      patches[i.id] ? ({ ...i, ...patches[i.id] } as CanvasItem) : i,
                    ),
                  )
                : c,
            ),
          })),
        removeItem: (compId, itemId) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) =>
              c.id === compId ? touch(c, c.items.filter((i) => i.id !== itemId)) : c,
            ),
            selectedIds: s.selectedIds.filter((x) => x !== itemId),
          })),
        removeItems: (compId, itemIds) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) =>
              c.id === compId ? touch(c, c.items.filter((i) => !itemIds.includes(i.id))) : c,
            ),
            selectedIds: s.selectedIds.filter((x) => !itemIds.includes(x)),
          })),
        duplicateItem: (compId, itemId) => {
          const comp = get().compositions.find((c) => c.id === compId);
          const src = comp?.items.find((i) => i.id === itemId);
          if (!comp || !src) return;
          const copy = {
            ...src,
            id: `ci-${nanoid(8)}`,
            x: Math.min(STAGE_W - src.w, src.x + 40),
            y: Math.min(STAGE_H - src.h, src.y + 40),
            z: topZ(comp.items),
          } as CanvasItem;
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) =>
              c.id === compId ? touch(c, [...c.items, copy]) : c,
            ),
            selectedIds: [copy.id],
          }));
        },
        reorderItem: (compId, itemId, dir) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) => {
              if (c.id !== compId) return c;
              const sorted = [...c.items].sort((a, b) => a.z - b.z);
              const idx = sorted.findIndex((i) => i.id === itemId);
              if (idx < 0) return c;
              const target =
                dir === "front"
                  ? sorted.length - 1
                  : dir === "back"
                    ? 0
                    : dir === "forward"
                      ? Math.min(sorted.length - 1, idx + 1)
                      : Math.max(0, idx - 1);
              const [moved] = sorted.splice(idx, 1);
              sorted.splice(target, 0, moved!);
              return touch(
                c,
                sorted.map((i, n) => ({ ...i, z: n + 1 })),
              );
            }),
          })),
        setSelected: (ids) => set({ selectedIds: ids }),
        clearItems: (compId) =>
          set((s) => ({
            ...step(s),
            compositions: s.compositions.map((c) => (c.id === compId ? touch(c, []) : c)),
            selectedIds: [],
          })),
      };
    },
    {
      name: "tp-canvas-studio-v1",
      // History is session state — never rehydrate a stale undo ring.
      partialize: (s) => ({ compositions: s.compositions, activeId: s.activeId }),
    },
  ),
);


/** Snap a stage coordinate to the studio grid (40 stage units ≈ 2% width). */
export const GRID = 40;
export function snap(v: number, on: boolean): number {
  return on ? Math.round(v / GRID) * GRID : Math.round(v);
}
