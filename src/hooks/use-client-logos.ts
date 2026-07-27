// Shared client-logo access layer.
//
// Every surface that renders a client logo (decks, print assets, campaigns)
// goes through here so they all share ONE cached fetch, resolve FRESH signed
// URLs (the client-logos bucket is private and links expire after an hour),
// and can auto-populate from a client / prospect name.

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listClientLogos, type ClientLogoRow } from "@/lib/client-logos.functions";

export const CLIENT_LOGOS_QUERY_KEY = ["logohub", "all"] as const;

/** Shared, signed-out-safe list of active client logos. */
export function useClientLogos() {
  const listFn = useServerFn(listClientLogos);
  return useQuery({
    queryKey: CLIENT_LOGOS_QUERY_KEY,
    queryFn: () => listFn().catch(() => [] as ClientLogoRow[]),
    // Signed URLs live for an hour — refetch comfortably before they expire.
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  });
}

export function normalizeClientName(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|sa|plc|group|holdings)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Find the repository row for a stored logo id, falling back to a name match. */
export function findClientLogoRow(
  rows: ClientLogoRow[] | undefined,
  ref: { id?: string | null; clientName?: string | null } | null | undefined,
): ClientLogoRow | null {
  if (!rows?.length || !ref) return null;
  if (ref.id) {
    const byId = rows.find((r) => r.id === ref.id);
    if (byId) return byId;
  }
  const norm = normalizeClientName(ref.clientName);
  if (!norm) return null;
  return (
    rows.find((r) => normalizeClientName(r.client_name) === norm) ??
    rows.find((r) => normalizeClientName(r.slug) === norm) ??
    null
  );
}

/** Pick the variant that reads best against the surface background. */
export function clientLogoUrlForMode(
  row: ClientLogoRow | null | undefined,
  mode: "light" | "dark" = "light",
): string | null {
  if (!row) return null;
  return mode === "dark"
    ? row.darkUrl ?? row.primaryUrl ?? row.monoUrl ?? null
    : row.lightUrl ?? row.primaryUrl ?? row.monoUrl ?? null;
}

export type ClientLogoRef = {
  id?: string | null;
  clientName?: string | null;
  primaryUrl?: string | null;
  darkUrl?: string | null;
  lightUrl?: string | null;
  monoUrl?: string | null;
};

/**
 * Resolve a usable logo URL for a surface.
 *
 * Order: fresh signed URL from the live repository (by id, then by client
 * name so a logo added later "populates when needed") → the URL stored on the
 * asset as a last resort.
 */
export function useResolvedClientLogo(
  ref: ClientLogoRef | null | undefined,
  mode: "light" | "dark" = "light",
): { url: string | null; row: ClientLogoRow | null; clientName: string | null } {
  const { data } = useClientLogos();
  return useMemo(() => {
    const row = findClientLogoRow(data as ClientLogoRow[] | undefined, ref);
    const stored =
      (mode === "dark" ? ref?.darkUrl : ref?.lightUrl) ?? ref?.primaryUrl ?? ref?.monoUrl ?? null;
    return {
      url: clientLogoUrlForMode(row, mode) ?? stored ?? null,
      row,
      clientName: row?.client_name ?? ref?.clientName ?? null,
    };
  }, [data, ref?.id, ref?.clientName, ref?.primaryUrl, ref?.darkUrl, ref?.lightUrl, ref?.monoUrl, mode]);
}

/** Auto-match a repository logo from a free-text client / prospect name. */
export function useAutoClientLogo(clientName: string | null | undefined): ClientLogoRow | null {
  const { data } = useClientLogos();
  return useMemo(
    () => findClientLogoRow(data as ClientLogoRow[] | undefined, { clientName }),
    [data, clientName],
  );
}
