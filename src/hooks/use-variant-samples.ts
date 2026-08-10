import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ALL_BRANDS,
  amIModuleAdmin,
  deleteVariantSample,
  listVariantSamples,
  saveVariantSample,
  type SampleContent,
  type VariantSample,
} from "@/lib/variant-samples.functions";

const SAMPLES_KEY = ["module-variant-samples"] as const;

/** Reserved keys inside a saved sample payload: per-field / per-scope text
 *  colours picked in the slide studio. They are never rendered as copy, so
 *  `apply()` strips them and exposes them through `ink()` instead. */
export const INK_KEY = "__ink";
export const INK_SCOPE_KEY = "__inkScope";
/** Per-mode bucket: edits an admin marked as light-only / dark-only. */
export const MODES_KEY = "__modes";

export type SampleInk = {
  inkOverrides?: Record<string, string>;
  inkScopeOverrides?: Record<string, string>;
};

export type SlideModeId = "light" | "dark";

/** Copy patches + ink that apply only in one appearance mode. */
export type SampleModeLayer = {
  copy?: Record<string, unknown>;
  ink?: Record<string, string>;
  inkScope?: Record<string, string>;
};

export type SampleModes = Partial<Record<SlideModeId, SampleModeLayer>>;

/** Assign `value` at a dotted/bracket path inside a cloned object. */
function assignPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const parts = path
    .split(".")
    .flatMap((seg) => {
      const m = /^([^[]+)((\[\d+\])+)?$/.exec(seg);
      if (!m) return [seg] as (string | number)[];
      const out: (string | number)[] = [m[1] as string];
      for (const idx of m[2]?.match(/\d+/g) ?? []) out.push(Number(idx));
      return out;
    });
  const clone = structuredClone(obj);
  let cur: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = (cur as Record<string | number, unknown>)[parts[i] as string | number];
    if (cur == null) return clone;
  }
  (cur as Record<string | number, unknown>)[parts[parts.length - 1] as string | number] = value;
  return clone;
}

/** Overlay a mode layer's copy patches on top of resolved copy. */
export function applyModeCopy(
  copy: Record<string, unknown>,
  layer: SampleModeLayer | undefined,
): Record<string, unknown> {
  if (!layer?.copy || Object.keys(layer.copy).length === 0) return copy;
  let out = copy;
  for (const [path, value] of Object.entries(layer.copy)) out = assignPath(out, path, value);
  return out;
}

/** Merge base ink with a mode layer's ink (mode wins). */
export function mergeModeInk(base: SampleInk, layer: SampleModeLayer | undefined): SampleInk {
  if (!layer?.ink && !layer?.inkScope) return base;
  return {
    inkOverrides: { ...(base.inkOverrides ?? {}), ...(layer.ink ?? {}) },
    inkScopeOverrides: { ...(base.inkScopeOverrides ?? {}), ...(layer.inkScope ?? {}) },
  };
}

/** Split a stored sample payload into renderable copy + style overrides. */
export function splitSampleContent(content: Record<string, unknown>): {
  copy: Record<string, unknown>;
  ink: SampleInk;
  modes: SampleModes;
} {
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (k === INK_KEY || k === INK_SCOPE_KEY || k === MODES_KEY) continue;
    copy[k] = v;
  }
  return {
    modes: (content[MODES_KEY] as SampleModes | undefined) ?? {},
    copy,
    ink: {
      inkOverrides: (content[INK_KEY] as Record<string, string> | undefined) ?? undefined,
      inkScopeOverrides:
        (content[INK_SCOPE_KEY] as Record<string, string> | undefined) ?? undefined,
    },
  };
}

export type SampleLookup = {
  /** Curated override for a variant, brand-specific first then global. */
  get: (variantId: string, brandModeId: string) => VariantSample | undefined;
  /** Seeded content with the curated override applied when one exists. */
  apply: (
    variantId: string,
    brandModeId: string,
    seeded: Record<string, unknown>,
    /** When given, light-only / dark-only edits are layered in too. */
    mode?: SlideModeId,
  ) => Record<string, unknown>;
  /** Saved per-field / per-scope text colours for a variant, if any. */
  ink: (variantId: string, brandModeId: string, mode?: SlideModeId) => SampleInk;
  loading: boolean;
};

/** All curated variant samples (public read, cached once per session). */
export function useVariantSamples(): SampleLookup {
  const { data, isLoading } = useQuery({
    queryKey: SAMPLES_KEY,
    queryFn: () => listVariantSamples(),
    staleTime: 60_000,
  });

  return useMemo(() => {
    const byKey = new Map<string, VariantSample>();
    for (const s of data ?? []) byKey.set(`${s.variantId}|${s.brandModeId}`, s);
    const get = (variantId: string, brandModeId: string) =>
      byKey.get(`${variantId}|${brandModeId}`) ?? byKey.get(`${variantId}|${ALL_BRANDS}`);
    return {
      get,
      apply: (variantId, brandModeId, seeded, mode) => {
        const hit = get(variantId, brandModeId);
        if (!hit || Object.keys(hit.content).length === 0) return seeded;
        const { copy, modes } = splitSampleContent(hit.content);
        // Curated fields win; anything the admin didn't touch keeps its seed.
        const merged = { ...seeded, ...copy };
        return mode ? applyModeCopy(merged, modes[mode]) : merged;
      },
      ink: (variantId, brandModeId, mode) => {
        const hit = get(variantId, brandModeId);
        if (!hit) return {};
        const { ink, modes } = splitSampleContent(hit.content);
        return mode ? mergeModeInk(ink, modes[mode]) : ink;
      },
      loading: isLoading,
    };
  }, [data, isLoading]);
}

/** True when the signed-in user holds the admin role. */
export function useIsModuleAdmin(): boolean {
  const { data } = useQuery({
    queryKey: ["module-variant-admin"],
    queryFn: async () => {
      try {
        return await amIModuleAdmin();
      } catch {
        return false;
      }
    },
    staleTime: 5 * 60_000,
  });
  return data === true;
}

/** Save / reset mutations for a single variant sample. */
export function useVariantSampleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: SAMPLES_KEY });

  const save = useMutation({
    mutationFn: (vars: { variantId: string; brandModeId?: string; content: SampleContent }) =>
      saveVariantSample({ data: vars }),
    onSuccess: invalidate,
  });

  const reset = useMutation({
    mutationFn: (vars: { variantId: string; brandModeId?: string }) =>
      deleteVariantSample({ data: vars }),
    onSuccess: invalidate,
  });

  return { save, reset };
}

export { ALL_BRANDS };
