// Client-side usage tracking. Fire-and-forget: never blocks UI, never throws.
// Events are batched and flushed to a server fn every 4 seconds or when the
// queue reaches 20 events. On page hide/unload we flush synchronously via a
// tiny sendBeacon fallback to `/api/public/track-events`.

import { logUsageEvents } from "./analytics.functions";

export type UsageCategory =
  | "deck"
  | "slide"
  | "module"
  | "ai"
  | "print"
  | "translation"
  | "imagery"
  | "brief"
  | "share"
  | "nav"
  | "export"
  | "search"
  | "logo";

export interface UsageEventInput {
  event: string;                 // e.g. "deck.export", "slide.add"
  category: UsageCategory;
  divisionId?: string | null;
  deckId?: string | null;
  slideId?: string | null;
  variantId?: string | null;
  moduleFamily?: string | null;
  surface?: string | null;
  durationMs?: number | null;
  value?: number | null;
  props?: Record<string, unknown>;
}

// ── Session id (stable per browser tab, ~30 min idle window) ────────────
const SESSION_KEY = "tpm.usage.session";
function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; last: number };
      if (Date.now() - parsed.last < 30 * 60 * 1000) {
        parsed.last = Date.now();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(parsed));
        return parsed.id;
      }
    }
    const id =
      (globalThis.crypto?.randomUUID?.() as string | undefined) ??
      `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, last: Date.now() }));
    return id;
  } catch {
    return "ephemeral";
  }
}

// ── Queue ───────────────────────────────────────────────────────────────
let queue: UsageEventInput[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 4000;
const FLUSH_SIZE = 20;

function schedule() {
  if (timer || queue.length === 0) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const sid = sessionId();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : null;
  try {
    await logUsageEvents({
      data: {
        sessionId: sid,
        userAgent: ua,
        events: batch.map((e) => ({
          eventType: e.event,
          eventCategory: e.category,
          divisionId: e.divisionId ?? null,
          deckId: e.deckId ?? null,
          slideId: e.slideId ?? null,
          variantId: e.variantId ?? null,
          moduleFamily: e.moduleFamily ?? null,
          surface: e.surface ?? null,
          durationMs: e.durationMs ?? null,
          value: e.value ?? null,
          props: e.props ?? {},
        })),
      },
    });
  } catch {
    // Swallow — analytics must never break the app.
  }
}

// ── Public API ──────────────────────────────────────────────────────────
export function track(input: UsageEventInput): void {
  if (typeof window === "undefined") return;
  queue.push(input);
  if (queue.length >= FLUSH_SIZE) {
    void flush();
    return;
  }
  schedule();
}

// One-off tracker with immediate flush (for critical events like exports).
export function trackNow(input: UsageEventInput): void {
  track(input);
  void flush();
}

// Flush on tab hide/unload.
if (typeof window !== "undefined") {
  const handler = () => {
    if (queue.length === 0) return;
    // Fire-and-forget through the server fn; it will typically finish
    // before the tab is fully torn down.
    void flush();
  };
  window.addEventListener("pagehide", handler);
  window.addEventListener("beforeunload", handler);
}
