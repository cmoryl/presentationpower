// Named presets for the deck-wide reinterpretation controls (design style,
// typography rhythm, colour lock). Per-device, localStorage-backed — same
// shape as src/lib/favorites.ts so there is one place to promote to Supabase
// later if presets ever become per-user.

import { useCallback, useEffect, useState } from "react";
import type { ColorLock } from "./reinterpret-style";

export const REINTERPRET_PRESETS_KEY = "reinterpret.controlPresets.v1";

export type ReinterpretPreset = {
  id: string;
  name: string;
  styleId: string;
  rhythmId: string;
  lock: ColorLock;
};

function isPreset(v: unknown): v is ReinterpretPreset {
  const p = v as ReinterpretPreset | null;
  return (
    !!p &&
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    typeof p.styleId === "string" &&
    typeof p.rhythmId === "string" &&
    typeof p.lock === "object" &&
    p.lock !== null
  );
}

export function readPresets(): ReinterpretPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REINTERPRET_PRESETS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter(isPreset) : [];
  } catch {
    return [];
  }
}

export function writePresets(next: ReinterpretPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REINTERPRET_PRESETS_KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  try {
    window.dispatchEvent(new CustomEvent("reinterpret-presets:changed"));
  } catch {
    /* ignore */
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function useReinterpretPresets() {
  const [presets, setPresets] = useState<ReinterpretPreset[]>([]);

  useEffect(() => {
    setPresets(readPresets());
    const sync = () => setPresets(readPresets());
    window.addEventListener("reinterpret-presets:changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("reinterpret-presets:changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /** Save (or overwrite by matching name, case-insensitive) a preset. */
  const save = useCallback((name: string, value: Omit<ReinterpretPreset, "id" | "name">) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const current = readPresets();
    const existing = current.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    const preset: ReinterpretPreset = {
      id: existing?.id ?? newId(),
      name: trimmed,
      styleId: value.styleId,
      rhythmId: value.rhythmId,
      lock: { ...value.lock },
    };
    const next = existing
      ? current.map((p) => (p.id === existing.id ? preset : p))
      : [...current, preset];
    writePresets(next);
    setPresets(next);
    return preset;
  }, []);

  const remove = useCallback((id: string) => {
    const next = readPresets().filter((p) => p.id !== id);
    writePresets(next);
    setPresets(next);
  }, []);

  return { presets, save, remove } as const;
}
