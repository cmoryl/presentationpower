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
import { nanoid } from "nanoid";

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

export type SurfaceItem = CanvasItemBase & {
  type: "surface";
  fill: string;
  radius: number;
  opacity: number;
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
      const w = 960;
      const h = 540;
      return {
        id,
        z,
        type: "module",
        variantId: String(extra.variantId ?? ""),
        fit: "cover",
        x: clamp(at.x - w / 2, STAGE_W, w),
        y: clamp(at.y - h / 2, STAGE_H, h),
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
  createComposition: (name: string, brandId: string) => string;
  duplicateComposition: (id: string) => void;
  deleteComposition: (id: string) => void;
  setActive: (id: string) => void;
  patchComposition: (id: string, patch: Partial<Omit<CanvasComposition, "id" | "items">>) => void;
  addItem: (compId: string, item: CanvasItem) => void;
  patchItem: (compId: string, itemId: string, patch: Partial<CanvasItem>) => void;
  removeItem: (compId: string, itemId: string) => void;
  duplicateItem: (compId: string, itemId: string) => void;
  reorderItem: (compId: string, itemId: string, dir: "front" | "back" | "forward" | "backward") => void;
  setSelected: (ids: string[]) => void;
  clearItems: (compId: string) => void;
};

const touch = (c: CanvasComposition, items?: CanvasItem[]): CanvasComposition => ({
  ...c,
  ...(items ? { items } : {}),
  updatedAt: new Date().toISOString(),
});

export const useCanvasStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      compositions: [],
      activeId: null,
      selectedIds: [],
      createComposition: (name, brandId) => {
        const comp = blank(name, brandId);
        set((s) => ({
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
        set((s) => ({ compositions: [copy, ...s.compositions], activeId: copy.id }));
      },
      deleteComposition: (id) =>
        set((s) => {
          const rest = s.compositions.filter((c) => c.id !== id);
          return {
            compositions: rest,
            activeId: s.activeId === id ? (rest[0]?.id ?? null) : s.activeId,
            selectedIds: [],
          };
        }),
      setActive: (id) => set({ activeId: id, selectedIds: [] }),
      patchComposition: (id, patch) =>
        set((s) => ({
          compositions: s.compositions.map((c) => (c.id === id ? touch({ ...c, ...patch }) : c)),
        })),
      addItem: (compId, item) =>
        set((s) => ({
          compositions: s.compositions.map((c) =>
            c.id === compId ? touch(c, [...c.items, item]) : c,
          ),
          selectedIds: [item.id],
        })),
      patchItem: (compId, itemId, patch) =>
        set((s) => ({
          compositions: s.compositions.map((c) =>
            c.id === compId
              ? touch(
                  c,
                  c.items.map((i) => (i.id === itemId ? ({ ...i, ...patch } as CanvasItem) : i)),
                )
              : c,
          ),
        })),
      removeItem: (compId, itemId) =>
        set((s) => ({
          compositions: s.compositions.map((c) =>
            c.id === compId ? touch(c, c.items.filter((i) => i.id !== itemId)) : c,
          ),
          selectedIds: s.selectedIds.filter((x) => x !== itemId),
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
          compositions: s.compositions.map((c) =>
            c.id === compId ? touch(c, [...c.items, copy]) : c,
          ),
          selectedIds: [copy.id],
        }));
      },
      reorderItem: (compId, itemId, dir) =>
        set((s) => ({
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
          compositions: s.compositions.map((c) => (c.id === compId ? touch(c, []) : c)),
          selectedIds: [],
        })),
    }),
    { name: "tp-canvas-studio-v1" },
  ),
);

/** Snap a stage coordinate to the studio grid (40 stage units ≈ 2% width). */
export const GRID = 40;
export function snap(v: number, on: boolean): number {
  return on ? Math.round(v / GRID) * GRID : Math.round(v);
}
