// Explicit "clear this override" markers.
//
// A save is published by merging THIS browser's edits over what is already
// published, so opening the kit in a browser that never made an edit can no
// longer wipe a published lockup placement, board size, wall recipe or placed
// artwork. That merge needs one exception: pressing "Reset" must genuinely
// unpublish an override rather than have it resurrected from the revision. Each
// reset records a marker here; each setter clears it again.

export type LondonOverrideKind = "placement" | "boardSize" | "stepRepeat" | "placedArt";

export type LondonOverrideClears = Record<string, true>;

const STORAGE_KEY = "tp-next-london-override-clears-v1";

let clears: LondonOverrideClears = {};
let hydrated = false;

const key = (kind: LondonOverrideKind, panelId: string) => `${kind}:${panelId}`;

function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as LondonOverrideClears;
    if (parsed && typeof parsed === "object") clears = parsed;
  } catch {
    clears = {};
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clears));
  } catch {
    /* storage blocked — in-memory markers still apply this session */
  }
}

/** Every clear marker held in this browser. */
export function londonOverrideClears(): LondonOverrideClears {
  hydrate();
  return clears;
}

/** True when this browser has explicitly reset that override. */
export function londonOverrideCleared(kind: LondonOverrideKind, panelId: string): boolean {
  return londonOverrideClears()[key(kind, panelId)] === true;
}

/** Record a reset, so the next publish drops the published value. */
export function markLondonOverrideCleared(kind: LondonOverrideKind, panelId: string): void {
  hydrate();
  clears = { ...clears, [key(kind, panelId)]: true };
  persist();
}

/** Forget a reset, because the override has been set again. */
export function clearLondonOverrideCleared(kind: LondonOverrideKind, panelId: string): void {
  hydrate();
  if (!(key(kind, panelId) in clears)) return;
  const next = { ...clears };
  delete next[key(kind, panelId)];
  clears = next;
  persist();
}

/**
 * Published overrides with this browser's edits layered on top.
 *
 * Local entries win, published entries survive when this browser holds none,
 * and an explicitly reset panel is dropped from the result.
 */
export function mergeLondonOverrideMap<T>(
  kind: LondonOverrideKind,
  published: Record<string, T> | null | undefined,
  local: Record<string, T> | null | undefined,
): Record<string, T> {
  const out: Record<string, T> = { ...(published ?? {}) };
  for (const [id, value] of Object.entries(local ?? {})) out[id] = value;
  for (const id of Object.keys(out)) {
    if (londonOverrideCleared(kind, id) && !(local ?? {})[id]) delete out[id];
  }
  return out;
}
