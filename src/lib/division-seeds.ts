// DIVISION SEED OVERRIDES
// ---------------------------------------------------------------------------
// Division branding for proposals (lockups, accent + deep ink, gradient fields)
// and the "Why <division>" page copy used to live only in code. This module
// reads the `division_seeds` table so an admin can change those values from the
// console without a code change.
//
// Overrides are sparse: any blank field falls through to the code-authored
// default, so a partial row is safe.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DivisionWhyCard = { title: string; body: string; icon?: string };

export type DivisionSeed = {
  divisionId: string;
  displayName?: string | null;
  accent?: string | null;
  deep?: string | null;
  logoDark?: string | null;
  logoWhite?: string | null;
  brightField?: string | null;
  deepField?: string | null;
  whyTitle?: string | null;
  whyEyebrow?: string | null;
  whyLines?: string[] | null;
  whyCards?: DivisionWhyCard[] | null;
  updatedAt?: string | null;
};

export type DivisionSeedMap = Record<string, DivisionSeed>;

type Row = {
  division_id: string;
  display_name: string | null;
  accent: string | null;
  deep: string | null;
  logo_dark: string | null;
  logo_white: string | null;
  bright_field: string | null;
  deep_field: string | null;
  why_title: string | null;
  why_eyebrow: string | null;
  why_lines: string[] | null;
  why_cards: unknown;
  updated_at: string | null;
};

function toSeed(row: Row): DivisionSeed {
  const cards = Array.isArray(row.why_cards) ? (row.why_cards as DivisionWhyCard[]) : null;
  return {
    divisionId: row.division_id,
    displayName: row.display_name,
    accent: row.accent,
    deep: row.deep,
    logoDark: row.logo_dark,
    logoWhite: row.logo_white,
    brightField: row.bright_field,
    deepField: row.deep_field,
    whyTitle: row.why_title,
    whyEyebrow: row.why_eyebrow,
    whyLines: row.why_lines,
    whyCards: cards,
    updatedAt: row.updated_at,
  };
}

function toRow(seed: DivisionSeed) {
  return {
    division_id: seed.divisionId,
    display_name: blankToNull(seed.displayName),
    accent: blankToNull(seed.accent),
    deep: blankToNull(seed.deep),
    logo_dark: blankToNull(seed.logoDark),
    logo_white: blankToNull(seed.logoWhite),
    bright_field: blankToNull(seed.brightField),
    deep_field: blankToNull(seed.deepField),
    why_title: blankToNull(seed.whyTitle),
    why_eyebrow: blankToNull(seed.whyEyebrow),
    why_lines: seed.whyLines?.length ? seed.whyLines : null,
    why_cards: seed.whyCards?.length ? seed.whyCards : null,
  };
}

function blankToNull(v?: string | null): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

export const divisionSeedsQueryKey = ["division-seeds"] as const;

export async function fetchDivisionSeeds(): Promise<DivisionSeedMap> {
  const { data, error } = await supabase.from("division_seeds").select("*");
  if (error) throw error;
  const map: DivisionSeedMap = {};
  for (const row of (data ?? []) as Row[]) map[row.division_id] = toSeed(row);
  return map;
}

/** Read-only access to every override. Safe to call anywhere in the browser. */
export function useDivisionSeeds() {
  return useQuery({
    queryKey: divisionSeedsQueryKey,
    queryFn: fetchDivisionSeeds,
    staleTime: 60_000,
  });
}

export function useDivisionSeed(divisionId?: string | null): DivisionSeed | undefined {
  const { data } = useDivisionSeeds();
  return divisionId ? data?.[divisionId] : undefined;
}

export async function saveDivisionSeed(seed: DivisionSeed): Promise<void> {
  const { error } = await supabase
    .from("division_seeds")
    .upsert(toRow(seed), { onConflict: "division_id" });
  if (error) throw error;
}

export async function deleteDivisionSeed(divisionId: string): Promise<void> {
  const { error } = await supabase.from("division_seeds").delete().eq("division_id", divisionId);
  if (error) throw error;
}
