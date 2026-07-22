// Surface store — parallel to deck-store. Handles Brochure / OnePager / Social /
// Email. Uses zustand for consistency with deck-store.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ModuleInstance,
  SurfaceKind,
  SurfaceFormat,
} from "./module-instance";

export type Surface = {
  id: string;
  kind: SurfaceKind;
  format: SurfaceFormat;
  title: string;
  brandModeId?: string | null;
  archetypeId?: string | null;
  subCompany?: string | null;
  clientLogoUrl?: string | null;
  context: Record<string, unknown>;
  modules: ModuleInstance[];
  meta: {
    subject?: string;
    preheader?: string;
    cta?: { label: string; href?: string };
    tagline?: string;
    [key: string]: unknown;
  };
  isTemplate?: boolean;
  cloudId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewSurfaceInput = {
  kind: SurfaceKind;
  format: SurfaceFormat;
  title?: string;
  brandModeId?: string | null;
  subCompany?: string | null;
  clientLogoUrl?: string | null;
  modules?: ModuleInstance[];
};

type SurfaceState = {
  surfaces: Record<string, Surface>;
  activeId: string | null;
  createSurface: (input: NewSurfaceInput) => Surface;
  setActive: (id: string | null) => void;
  updateSurface: (id: string, patch: Partial<Surface>) => void;
  deleteSurface: (id: string) => void;
  // Modules
  addModule: (surfaceId: string, module: ModuleInstance, index?: number) => void;
  removeModule: (surfaceId: string, moduleId: string) => void;
  updateModule: (surfaceId: string, moduleId: string, patch: Partial<ModuleInstance>) => void;
  reorderModules: (surfaceId: string, fromIdx: number, toIdx: number) => void;
  duplicateModule: (surfaceId: string, moduleId: string) => void;
  // Bulk
  replaceModules: (surfaceId: string, modules: ModuleInstance[]) => void;
  // Cloud sync stub
  attachCloudId: (surfaceId: string, cloudId: string) => void;
  loadFromCloud: (row: Surface) => void;
};

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function defaultTitle(kind: SurfaceKind, format: SurfaceFormat): string {
  const kindLabels: Record<SurfaceKind, string> = {
    deck: "Deck",
    brochure: "Brochure",
    onepager: "One-pager",
    social: "Social post",
    email: "Email",
  };
  return `Untitled ${kindLabels[kind]} · ${format}`;
}

export const useSurfaceStore = create<SurfaceState>()(
  persist(
    (set) => ({
      surfaces: {},
      activeId: null,
      createSurface: (input) => {
        const now = new Date().toISOString();
        const surface: Surface = {
          id: uid("surf"),
          kind: input.kind,
          format: input.format,
          title: input.title ?? defaultTitle(input.kind, input.format),
          brandModeId: input.brandModeId ?? null,
          subCompany: input.subCompany ?? null,
          clientLogoUrl: input.clientLogoUrl ?? null,
          context: {},
          modules: input.modules ?? [],
          meta: {},
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          surfaces: { ...s.surfaces, [surface.id]: surface },
          activeId: surface.id,
        }));
        return surface;
      },
      setActive: (id) => set({ activeId: id }),
      updateSurface: (id, patch) =>
        set((s) => {
          const target = s.surfaces[id];
          if (!target) return s;
          return {
            surfaces: {
              ...s.surfaces,
              [id]: { ...target, ...patch, updatedAt: new Date().toISOString() },
            },
          };
        }),
      deleteSurface: (id) =>
        set((s) => {
          const next = { ...s.surfaces };
          delete next[id];
          return { surfaces: next, activeId: s.activeId === id ? null : s.activeId };
        }),
      addModule: (surfaceId, module, index) =>
        set((s) => {
          const surface = s.surfaces[surfaceId];
          if (!surface) return s;
          const modules = [...surface.modules];
          if (typeof index === "number") modules.splice(index, 0, module);
          else modules.push(module);
          return {
            surfaces: {
              ...s.surfaces,
              [surfaceId]: { ...surface, modules, updatedAt: new Date().toISOString() },
            },
          };
        }),
      removeModule: (surfaceId, moduleId) =>
        set((s) => {
          const surface = s.surfaces[surfaceId];
          if (!surface) return s;
          return {
            surfaces: {
              ...s.surfaces,
              [surfaceId]: {
                ...surface,
                modules: surface.modules.filter((m) => m.id !== moduleId),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),
      updateModule: (surfaceId, moduleId, patch) =>
        set((s) => {
          const surface = s.surfaces[surfaceId];
          if (!surface) return s;
          return {
            surfaces: {
              ...s.surfaces,
              [surfaceId]: {
                ...surface,
                modules: surface.modules.map((m) => (m.id === moduleId ? { ...m, ...patch } : m)),
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),
      reorderModules: (surfaceId, fromIdx, toIdx) =>
        set((s) => {
          const surface = s.surfaces[surfaceId];
          if (!surface) return s;
          const modules = [...surface.modules];
          const [moved] = modules.splice(fromIdx, 1);
          if (!moved) return s;
          modules.splice(toIdx, 0, moved);
          return {
            surfaces: {
              ...s.surfaces,
              [surfaceId]: { ...surface, modules, updatedAt: new Date().toISOString() },
            },
          };
        }),
      duplicateModule: (surfaceId, moduleId) =>
        set((s) => {
          const surface = s.surfaces[surfaceId];
          if (!surface) return s;
          const idx = surface.modules.findIndex((m) => m.id === moduleId);
          if (idx < 0) return s;
          const source = surface.modules[idx];
          const clone: ModuleInstance = {
            ...source,
            id: uid("mi"),
            content: JSON.parse(JSON.stringify(source.content)),
          };
          const modules = [...surface.modules];
          modules.splice(idx + 1, 0, clone);
          return {
            surfaces: {
              ...s.surfaces,
              [surfaceId]: { ...surface, modules, updatedAt: new Date().toISOString() },
            },
          };
        }),
      replaceModules: (surfaceId, modules) =>
        set((s) => {
          const surface = s.surfaces[surfaceId];
          if (!surface) return s;
          return {
            surfaces: {
              ...s.surfaces,
              [surfaceId]: { ...surface, modules, updatedAt: new Date().toISOString() },
            },
          };
        }),
      attachCloudId: (surfaceId, cloudId) =>
        set((s) => {
          const surface = s.surfaces[surfaceId];
          if (!surface) return s;
          return {
            surfaces: { ...s.surfaces, [surfaceId]: { ...surface, cloudId } },
          };
        }),
      loadFromCloud: (row) =>
        set((s) => ({ surfaces: { ...s.surfaces, [row.id]: row } })),
    }),
    {
      name: "tp-surface-store-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
