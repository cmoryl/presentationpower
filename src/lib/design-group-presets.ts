// Reusable "look" presets per asset type (design group): remembers the layout
// you prefer for funnels, timelines, stat walls, etc. so the choice carries
// across decks. Per-device, localStorage-backed — same shape as
// src/lib/reinterpret-presets.ts so it can be promoted to Supabase later.

import { useCallback, useEffect, useState } from "react";
import { DESIGN_CATALOG } from "./reinterpret-design";

export const DESIGN_GROUP_PRESETS_KEY = "reinterpret.groupLooks.v1";

/** group name -> preferred variantId */
export type DesignGroupPresets = Record<string, string>;

export function groupOfVariant(variantId: string): string | null {
  return DESIGN_CATALOG.find((d) => d.variantId === variantId)?.group ?? null;
}

export function readGroupPresets(): DesignGroupPresets {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DESIGN_GROUP_PRESETS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    const out: DesignGroupPresets = {};
    for (const [group, variantId] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof variantId === "string" && DESIGN_CATALOG.some((d) => d.variantId === variantId)) {
        out[group] = variantId;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function writeGroupPresets(next: DesignGroupPresets) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DESIGN_GROUP_PRESETS_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  try {
    window.dispatchEvent(new CustomEvent("design-group-presets:changed"));
  } catch {
    /* ignore */
  }
}

export function useDesignGroupPresets() {
  const [presets, setPresets] = useState<DesignGroupPresets>({});

  useEffect(() => {
    setPresets(readGroupPresets());
    const sync = () => setPresets(readGroupPresets());
    window.addEventListener("design-group-presets:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("design-group-presets:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /** Remember this layout as the default look for its own design group. */
  const saveLook = useCallback((variantId: string) => {
    const group = groupOfVariant(variantId);
    if (!group) return null;
    const next = { ...readGroupPresets(), [group]: variantId };
    writeGroupPresets(next);
    setPresets(next);
    return group;
  }, []);

  const clearLook = useCallback((group: string) => {
    const next = { ...readGroupPresets() };
    delete next[group];
    writeGroupPresets(next);
    setPresets(next);
  }, []);

  /** Preferred variant for whatever group `variantId` belongs to, if any. */
  const lookFor = useCallback(
    (variantId: string): string | null => {
      const group = groupOfVariant(variantId);
      return group ? presets[group] ?? null : null;
    },
    [presets],
  );

  return { presets, saveLook, clearLook, lookFor } as const;
}
