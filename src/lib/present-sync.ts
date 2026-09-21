// ---------------------------------------------------------------------------
// Dual-screen presenter sync.
//
// Two browser windows on the same deck stay on the same slide: the presenter
// console (current slide, next slide, speaker notes, elapsed timer) and the
// audience display (a clean, borderless slide and nothing else).
//
// The transport is BroadcastChannel — same-origin, no server round trip, so the
// two views move together on the same machine across two screens. It is
// browser-only: every entry point guards for that, so SSR imports are safe.
// ---------------------------------------------------------------------------
import { useEffect, useRef } from "react";

export type PresentRole = "solo" | "console" | "audience";

export type PresentMessage =
  | { type: "state"; index: number; total: number; startedAt: number | null; from: string }
  | { type: "hello"; from: string }
  | { type: "bye"; from: string };

export function presentChannelName(deckId: string): string {
  return `element-present-${deckId}`;
}

export function isPresentRole(value: unknown): value is PresentRole {
  return value === "solo" || value === "console" || value === "audience";
}

/** Parsed ?view= value; anything unrecognised presents normally. */
export function presentRoleFromSearch(value: unknown): PresentRole {
  return isPresentRole(value) ? value : "solo";
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type SyncOptions = {
  deckId: string;
  role: PresentRole;
  index: number;
  total: number;
  startedAt: number | null;
  onIndex: (index: number) => void;
  onStartedAt?: (startedAt: number) => void;
};

/**
 * Keep this window's slide index in step with the other views of the same deck.
 * Every view both sends and accepts state, so advancing from either screen
 * moves both. Echoes are ignored by sender id and by value.
 */
export function usePresentSync({
  deckId,
  role,
  index,
  total,
  startedAt,
  onIndex,
  onStartedAt,
}: SyncOptions) {
  const idRef = useRef<string>("");
  const chanRef = useRef<BroadcastChannel | null>(null);
  const appliedRef = useRef(index);
  const stateRef = useRef({ index, total, startedAt });
  stateRef.current = { index, total, startedAt };

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    if (!idRef.current) idRef.current = Math.random().toString(36).slice(2);
    const me = idRef.current;
    const chan = new BroadcastChannel(presentChannelName(deckId));
    chanRef.current = chan;

    chan.onmessage = (ev: MessageEvent<PresentMessage>) => {
      const msg = ev.data;
      if (!msg || msg.from === me) return;
      if (msg.type === "hello") {
        // A view just opened: tell it where we are.
        const s = stateRef.current;
        chan.postMessage({ type: "state", index: s.index, total: s.total, startedAt: s.startedAt, from: me });
        return;
      }
      if (msg.type === "state") {
        if (msg.startedAt != null && onStartedAt) onStartedAt(msg.startedAt);
        if (Number.isInteger(msg.index) && msg.index !== stateRef.current.index) {
          appliedRef.current = msg.index;
          onIndex(msg.index);
        }
      }
    };

    chan.postMessage({ type: "hello", from: me } satisfies PresentMessage);

    return () => {
      chan.postMessage({ type: "bye", from: me } satisfies PresentMessage);
      chan.close();
      chanRef.current = null;
    };
    // role is part of the identity of this view; a change re-announces it.
  }, [deckId, role, onIndex, onStartedAt]);

  // Broadcast our own moves (but not the ones we just accepted).
  useEffect(() => {
    const chan = chanRef.current;
    if (!chan) return;
    if (appliedRef.current === index) return;
    appliedRef.current = index;
    chan.postMessage({
      type: "state",
      index,
      total,
      startedAt,
      from: idRef.current,
    } satisfies PresentMessage);
  }, [index, total, startedAt]);
}

/** Open a second window for the given role, sized for a second screen. */
export function openPresentWindow(deckId: string, role: Exclude<PresentRole, "solo">) {
  if (typeof window === "undefined") return null;
  const url = `/decks/${encodeURIComponent(deckId)}/present?view=${role}`;
  return window.open(url, `element-present-${role}-${deckId}`, "noopener,width=1440,height=900");
}
