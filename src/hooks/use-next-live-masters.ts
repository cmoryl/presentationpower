// Live saved NEXT masters (pillars + agendas) for the hub preview cards.
//
// The hub cards render the *saved* studio files when they exist, so an update
// made in the pillar or agenda editor shows up on the large-format preview
// cards straight away. Saves invalidate the shared query keys in the same
// React Query cache, and a BroadcastChannel ping covers other tabs, so the
// cards refresh without a page reload.

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useSignedIn } from "@/components/CloudDeckControls";
import { listAgendaFiles } from "@/lib/next-agenda.functions";
import { listPillarFiles } from "@/lib/event-pillar.functions";
import { normalizeAgendaConfig, type AgendaConfig } from "@/lib/next-agenda";
import type { PillarConfig, PillarKindId } from "@/lib/next-pillar-masters";

export const PILLAR_FILES_KEY = ["event-pillar-files"] as const;
export const AGENDA_FILES_KEY = ["next-agenda-files"] as const;
export const NEXT_MASTERS_CHANNEL = "next-live-masters";

export type PillarFileRecord = {
  id: string;
  name: string;
  division_id: string | null;
  config: PillarConfig;
  updated_at: string;
};

export type AgendaFileRecord = {
  id: string;
  name: string;
  division_id: string | null;
  config: AgendaConfig;
  updated_at: string;
};

/** Tell every open hub/editor tab that a saved master changed. */
export function announceNextMasterSaved(kind: "pillar" | "agenda") {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(NEXT_MASTERS_CHANNEL);
    channel.postMessage({ kind });
    channel.close();
  } catch {
    /* channel unavailable — same-tab invalidation still applies */
  }
}

/** Refetch saved masters when another tab saves one. */
function useSavedMasterSync() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(NEXT_MASTERS_CHANNEL);
    } catch {
      return;
    }
    channel.onmessage = (event: MessageEvent<{ kind?: string }>) => {
      const key = event.data?.kind === "agenda" ? AGENDA_FILES_KEY : PILLAR_FILES_KEY;
      void qc.invalidateQueries({ queryKey: [...key] });
    };
    return () => channel.close();
  }, [qc]);
}

export function useSavedPillarFiles() {
  const signedIn = useSignedIn();
  const list = useServerFn(listPillarFiles);
  useSavedMasterSync();
  return useQuery({
    queryKey: [...PILLAR_FILES_KEY],
    queryFn: async () => (await list()) as unknown as PillarFileRecord[],
    enabled: signedIn === true,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useSavedAgendaFiles() {
  const signedIn = useSignedIn();
  const list = useServerFn(listAgendaFiles);
  useSavedMasterSync();
  return useQuery({
    queryKey: [...AGENDA_FILES_KEY],
    queryFn: async () => (await list()) as unknown as AgendaFileRecord[],
    enabled: signedIn === true,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

/** Newest saved pillar file matching a division + kind + face, if any. */
export function pickPillarFile(
  rows: PillarFileRecord[] | undefined,
  divisionId: string,
  kind: PillarKindId,
  face: "light" | "dark",
): PillarFileRecord | undefined {
  if (!rows?.length) return undefined;
  const matches = rows.filter((row) => {
    const config = row.config as PillarConfig | null;
    if (!config) return false;
    return (
      (config.divisionId ?? row.division_id) === divisionId &&
      config.kind === kind &&
      (config.face ?? "dark") === face
    );
  });
  return matches.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
}

/** Newest saved agenda file for a division, if any. */
export function pickAgendaFile(
  rows: AgendaFileRecord[] | undefined,
  divisionId: string,
): AgendaFileRecord | undefined {
  if (!rows?.length) return undefined;
  const matches = rows.filter((row) => {
    const config = row.config as AgendaConfig | null;
    return (config?.divisionId ?? row.division_id) === divisionId;
  });
  const best = matches.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
  if (!best) return undefined;
  return { ...best, config: normalizeAgendaConfig(best.config) };
}
