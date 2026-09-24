/**
 * The city being planned, carried between the four "Plan a new city" steps.
 * Kept in this browser (survives closing it) — the saved venue record stays the source
 * of truth; this just stops people typing the same city and venue three times.
 */
export type CityPlanDraft = { city: string; venue: string; dates: string };

const KEY = "next-city-plan-draft";

export function readCityPlanDraft(): CityPlanDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<CityPlanDraft>;
    const out = { city: d.city?.trim() ?? "", venue: d.venue?.trim() ?? "", dates: d.dates?.trim() ?? "" };
    return out.city || out.venue ? out : null;
  } catch {
    return null;
  }
}

export function writeCityPlanDraft(next: Partial<CityPlanDraft>) {
  if (typeof window === "undefined") return;
  try {
    const cur = readCityPlanDraft() ?? { city: "", venue: "", dates: "" };
    window.localStorage.setItem(KEY, JSON.stringify({ ...cur, ...next }));
  } catch {
    /* storage unavailable — steps simply start empty */
  }
}
