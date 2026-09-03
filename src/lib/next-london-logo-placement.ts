// TransPerfect NEXT 2026 — London signage LOGO PLACEMENT overrides.
//
// The branding planner produces a deterministic lockup box for every panel.
// A location designer can nudge that lockup on any individual panel: the
// override is stored per panel id as fractions of the TRIM box (so it survives
// a trim/bleed change) plus a scale multiplier. Overrides are read by
// `londonBrandingPlan`, which means the on-screen preview, the `.svg` master
// and the `.ai` master all move together.

import { useSyncExternalStore } from "react";

import {
  NEXT_LOGO_COLOURWAYS,
  type NextLogoColourway,
} from "@/lib/next-logo-vectors";

export type LondonLogoPlacement = {
  /** Horizontal nudge, as a fraction of the trim width. */
  dx: number;
  /** Vertical nudge, as a fraction of the trim height. */
  dy: number;
  /** Size multiplier on the planned lockup width. */
  scale: number;
  /** Which approved colourway of the lockup to place on this panel. */
  colourway: NextLogoColourway;
  /**
   * Headline copy override. `null` keeps the copy the branding note implies,
   * `""` removes the headline from the panel entirely.
   */
  text: string | null;
  /** Size multiplier on the planned headline cap height. */
  textScale: number;
  /** Headline horizontal nudge, as a fraction of the trim width. */
  textDx: number;
  /** Headline vertical nudge, as a fraction of the trim height. */
  textDy: number;
  /**
   * Headline direction. `null` follows the panel shape — pillars and other
   * tall, narrow sheets set their copy running DOWN the panel.
   */
  textVertical: boolean | null;
  /** QR payload. `null`/empty means the panel carries no code. */
  qr: string | null;
  /** Size multiplier on the planned QR block. */
  qrScale: number;
  /** QR horizontal nudge, as a fraction of the trim width. */
  qrDx: number;
  /** QR vertical nudge, as a fraction of the trim height. */
  qrDy: number;
  /** Caption printed under the code; `""` prints no caption. */
  qrCaption: string;
};

export const DEFAULT_LOGO_PLACEMENT: LondonLogoPlacement = {
  dx: 0,
  dy: 0,
  scale: 1,
  // All-white knockout is the approved default for scenic signage.
  colourway: "white",
  text: null,
  textScale: 1,
  textDx: 0,
  textDy: 0,
  textVertical: null,
  qr: null,
  qrScale: 1,
  qrDx: 0,
  qrDy: 0,
  qrCaption: "SCAN FOR THE AGENDA",
};


export type LondonLogoPlacementMap = Record<string, LondonLogoPlacement>;

const EMPTY_PLACEMENTS: LondonLogoPlacementMap = {};

const STORAGE_KEY = "tp-next-london-logo-placement-v1";
const CHANNEL = "tp-next-london-logo-placement";

let placements: LondonLogoPlacementMap = {};
let hydrated = false;
const listeners = new Set<() => void>();

/** Headline cap-height multiplier bounds, shared with the editor UI. */
export const LONDON_TEXT_SCALE = { min: 0.3, max: 3, step: 0.01 } as const;

/** Longest headline the signage set accepts on one line. */
export const LONDON_TEXT_MAX_CHARS = 64;

function clampPlacement(p: Partial<LondonLogoPlacement>): LondonLogoPlacement {
  const clamp = (n: unknown, lo: number, hi: number, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
  return {
    dx: clamp(p.dx, -0.5, 0.5, 0),
    dy: clamp(p.dy, -0.5, 0.5, 0),
    scale: clamp(p.scale, 0.2, 2.5, 1),
    colourway: NEXT_LOGO_COLOURWAYS.includes(p.colourway as NextLogoColourway)
      ? (p.colourway as NextLogoColourway)
      : "white",
    text: typeof p.text === "string" ? p.text.slice(0, LONDON_TEXT_MAX_CHARS) : null,
    textScale: clamp(p.textScale, LONDON_TEXT_SCALE.min, LONDON_TEXT_SCALE.max, 1),
    textDx: clamp(p.textDx, -0.5, 0.5, 0),
    textDy: clamp(p.textDy, -0.5, 0.5, 0),
  };
}


function hydrate(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as LondonLogoPlacementMap;
    if (parsed && typeof parsed === "object") {
      placements = Object.fromEntries(
        Object.entries(parsed).map(([id, value]) => [id, clampPlacement(value ?? {})]),
      );
    }
  } catch {
    placements = {};
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
  } catch {
    /* storage full or blocked — in-memory placement still applies */
  }
  try {
    new BroadcastChannel(CHANNEL).postMessage({ placements });
  } catch {
    /* no BroadcastChannel — same-tab listeners still fire */
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

/** Every saved override, keyed by panel id. */
export function londonLogoPlacements(): LondonLogoPlacementMap {
  hydrate();
  return placements;
}

/** The override for one panel, or the neutral default. */
export function londonLogoPlacement(panelId: string): LondonLogoPlacement {
  return londonLogoPlacements()[panelId] ?? DEFAULT_LOGO_PLACEMENT;
}

/** Move/resize one panel's lockup. Partial patches merge over the current value. */
export function setLondonLogoPlacement(
  panelId: string,
  patch: Partial<LondonLogoPlacement>,
): LondonLogoPlacement {
  const next = clampPlacement({ ...londonLogoPlacement(panelId), ...patch });
  placements = { ...londonLogoPlacements(), [panelId]: next };
  persist();
  emit();
  return next;
}

/** Drop the override so the panel returns to the planned placement. */
export function resetLondonLogoPlacement(panelId: string): void {
  const current = londonLogoPlacements();
  if (!(panelId in current)) return;
  const next = { ...current };
  delete next[panelId];
  placements = next;
  persist();
  emit();
}

/** Drop every override across the pack. */
export function resetAllLondonLogoPlacements(): void {
  placements = {};
  persist();
  emit();
}

/** Copy one panel's override onto other panels — used by "apply to floor". */
export function copyLondonLogoPlacement(fromId: string, toIds: string[]): void {
  const source = londonLogoPlacement(fromId);
  const next = { ...londonLogoPlacements() };
  for (const id of toIds) next[id] = { ...source };
  placements = next;
  persist();
  emit();
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const incoming = (event.data as { placements?: LondonLogoPlacementMap } | null)?.placements;
      if (!incoming) return;
      placements = Object.fromEntries(
        Object.entries(incoming).map(([id, value]) => [id, clampPlacement(value ?? {})]),
      );
      emit();
    };
  } catch {
    channel = null;
  }
  return () => {
    listeners.delete(listener);
    channel?.close();
  };
}

/** React binding: re-renders whenever any placement changes, in any tab. */
export function useLondonLogoPlacements(): LondonLogoPlacementMap {
  return useSyncExternalStore(
    subscribe,
    () => londonLogoPlacements(),
    () => EMPTY_PLACEMENTS,
  );
}
