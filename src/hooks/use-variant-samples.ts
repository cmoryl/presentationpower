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

export type SampleInk = {
  inkOverrides?: Record<string, string>;
  inkScopeOverrides?: Record<string, string>;
};

/** Split a stored sample payload into renderable copy + style overrides. */
export function splitSampleContent(content: Record<string, unknown>): {
  copy: Record<string, unknown>;
  ink: SampleInk;
} {
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (k === INK_KEY || k === INK_SCOPE_KEY) continue;
    copy[k] = v;
  }
  return {
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
  ) => Record<string, unknown>;
  /** Saved per-field / per-scope text colours for a variant, if any. */
  ink: (variantId: string, brandModeId: string) => SampleInk;
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
      apply: (variantId, brandModeId, seeded) => {
        const hit = get(variantId, brandModeId);
        if (!hit || Object.keys(hit.content).length === 0) return seeded;
        // Curated fields win; anything the admin didn't touch keeps its seed.
        return { ...seeded, ...splitSampleContent(hit.content).copy };
      },
      ink: (variantId, brandModeId) => {
        const hit = get(variantId, brandModeId);
        return hit ? splitSampleContent(hit.content).ink : {};
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
