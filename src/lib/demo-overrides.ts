// Client-side helpers for live demo overrides.
//
// A demo page asks for the saved override for the demo it renders (per
// division). When one exists, that payload *is* the demo — the authored build
// only acts as the fallback / reset target.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  clearDemoOverride,
  listDemoOverrides,
  saveDemoOverride,
  type DemoKind,
  type DemoOverrideRow,
} from "@/lib/demo-overrides.functions";

export type { DemoKind, DemoOverrideRow };

/** Marker written into an editable copy so the editor knows it edits a demo. */
export type LiveDemoLink = {
  kind: DemoKind;
  demoId: string;
  divisionKey: string;
  label?: string;
};

export function demoOverrideKey(kind: DemoKind, demoId: string) {
  return ["demo-overrides", kind, demoId] as const;
}

export function useDemoOverrides(kind: DemoKind, demoId: string) {
  const fetchFn = useServerFn(listDemoOverrides);
  return useQuery({
    queryKey: demoOverrideKey(kind, demoId),
    queryFn: () => fetchFn({ data: { demoKind: kind, demoId } }),
    staleTime: 30_000,
  });
}

/** The override for one demo + division, or undefined when none is published. */
export function useDemoOverride(kind: DemoKind, demoId: string, divisionKey: string) {
  const q = useDemoOverrides(kind, demoId);
  const row = (q.data ?? []).find((r) => r.divisionKey === divisionKey);
  return { ...q, override: row };
}

export function usePublishDemoOverride() {
  const saveFn = useServerFn(saveDemoOverride);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      demoKind: DemoKind;
      demoId: string;
      divisionKey: string;
      payload: Record<string, unknown>;
      label?: string;
    }) => saveFn({ data: input }),
    onSuccess: (_r, input) => {
      void qc.invalidateQueries({ queryKey: demoOverrideKey(input.demoKind, input.demoId) });
    },
  });
}

export function useResetDemoOverride() {
  const clearFn = useServerFn(clearDemoOverride);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { demoKind: DemoKind; demoId: string; divisionKey: string }) =>
      clearFn({ data: input }),
    onSuccess: (_r, input) => {
      void qc.invalidateQueries({ queryKey: demoOverrideKey(input.demoKind, input.demoId) });
    },
  });
}
