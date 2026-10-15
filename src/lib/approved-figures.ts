// Approved figures — standard, sourced figures (e.g. "200+ languages") that
// may appear without a per-asset source. ONE matcher, used by the export
// compliance check, the download block, the live Checks tab and the deck
// generator's figure validator, so the editor and the export never disagree.
//
// A figure passes when an approved, unexpired entry for the asset's division
// (or for every division) has the same figure AND the claim's key noun appears
// within a few words of the figure ("200+ languages" passes, "200+
// integrations" does not). Short value fields ("90%") also read their sibling
// label ("Of the Fortune 500").

export type ApprovedFigure = {
  id?: string;
  figure: string;
  claim: string;
  division_id: string | null;
  valid_until: string | null;
  status: "draft" | "approved" | "retired" | string;
};

export type FigureMatchOptions = {
  approved?: readonly ApprovedFigure[];
  /** Brand mode / division of the asset; null/undefined = only all-division entries. */
  division?: string | null;
  /** Sibling text (e.g. the stat's label) used when the figure string is just the number. */
  context?: string;
  now?: Date;
};

const STOP = new Set(["of", "the", "a", "an", "and", "in", "to", "for", "our", "over", "more", "than"]);
const WINDOW_AFTER = 4;
const WINDOW_BEFORE = 3;

export const normFigure = (s: string) => s.toLowerCase().replace(/[\s,]/g, "").replace(/×/g, "x");
const stem = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "").replace(/(es|s)$/, "");

/** First meaningful word of the claim after the figure ("90% of the Fortune 500" → "fortune"). */
export function keyNoun(claim: string, figure: string): string {
  const raw = claim.toLowerCase();
  // Remove the figure text itself, then read words after it (else before).
  const figRe = new RegExp(figure.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/,/g, ",?"), "i");
  const m = raw.match(figRe);
  const after = m ? raw.slice((m.index ?? 0) + m[0].length) : raw;
  const before = m ? raw.slice(0, m.index ?? 0) : "";
  const pick = (s: string) => s.split(/\s+/).map(stem).find((w) => w.length > 1 && !STOP.has(w));
  return pick(after) ?? pick(before.split(/\s+/).reverse().join(" ")) ?? "";
}

export function isLive(f: ApprovedFigure, division: string | null | undefined, now = new Date()): boolean {
  if (f.status !== "approved") return false;
  if (f.division_id && f.division_id !== division) return false;
  if (f.valid_until) {
    const end = new Date(`${f.valid_until}T23:59:59Z`);
    if (end.getTime() < now.getTime()) return false;
  }
  return true;
}

function wordsNear(text: string, start: number, end: number): string[] {
  const after = text.slice(end).split(/\s+/).filter(Boolean).slice(0, WINDOW_AFTER);
  const before = text.slice(0, start).split(/\s+/).filter(Boolean).slice(-WINDOW_BEFORE);
  return [...before, ...after].map(stem);
}

/** True when the figure at text[index..] is covered by an approved entry. */
export function figureApproved(match: string, text: string, index: number, opts: FigureMatchOptions = {}): boolean {
  const list = opts.approved ?? getApprovedFigures();
  if (!list.length) return false;
  const fig = normFigure(match);
  const now = opts.now ?? new Date();
  const candidates = list.filter((f) => normFigure(f.figure) === fig && isLive(f, opts.division, now));
  if (!candidates.length) return false;
  const near = wordsNear(text, index, index + match.length);
  // A bare value ("90%", "200+") reads its sibling label instead.
  const bare = text.trim().length <= match.trim().length + 3;
  const ctx = bare && opts.context ? opts.context.split(/\s+/).map(stem) : [];
  return candidates.some((f) => {
    const noun = keyNoun(f.claim, f.figure);
    return !!noun && (near.includes(noun) || ctx.includes(noun));
  });
}

// ── Shared client cache (editor + export read the same list) ─────────────
let cache: ApprovedFigure[] = [];
let inflight: Promise<ApprovedFigure[]> | null = null;
const listeners = new Set<() => void>();

export function getApprovedFigures(): readonly ApprovedFigure[] {
  return cache;
}
export function setApprovedFigures(list: ApprovedFigure[]) {
  cache = list;
  listeners.forEach((l) => l());
}
export function subscribeApprovedFigures(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

type Sb = { from: (t: string) => any };

/** Load approved entries (RLS: any signed-in user). Safe to call repeatedly. */
export async function loadApprovedFigures(supabase: unknown, force = false): Promise<ApprovedFigure[]> {
  if (inflight && !force) return inflight;
  inflight = (async () => {
    try {
      const { data } = await (supabase as Sb)
        .from("approved_figures")
        .select("id,figure,claim,division_id,valid_until,status")
        .eq("status", "approved");
      const list = (data ?? []) as ApprovedFigure[];
      setApprovedFigures(list);
      return list;
    } catch {
      return cache;
    }
  })();
  return inflight;
}

/** Grounding text for the generator: one line per live approved claim. */
export function approvedGrounding(list: readonly ApprovedFigure[], division: string | null | undefined): string {
  return list.filter((f) => isLive(f, division)).map((f) => `Approved figure: ${f.claim}`).join("\n");
}
