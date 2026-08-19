/**
 * Debugging Workflow recorder.
 *
 * Browser-only. Records the steps a user takes (navigation, clicks, toggles,
 * typed input, keyboard escapes, app state changes) plus friction signals
 * (rage clicks, dead clicks, hesitation, backtracking, errors, failed/slow
 * requests). Sessions persist to localStorage so the report survives reloads
 * and route changes.
 */

import type { UxSession, UxStep, UxStepKind } from "./types";

const LS_SESSIONS = "tp.uxdebug.sessions.v1";
const LS_ACTIVE = "tp.uxdebug.active.v1";
const LS_ENABLED = "tp.uxdebug.enabled.v1";
const MAX_SESSIONS = 12;
const MAX_STEPS = 1200;

/** ms of inactivity that counts as hesitation. */
const HESITATION_MS = 12000;
/** rage click window / radius. */
const RAGE_MS = 1200;
const RAGE_RADIUS = 44;
/** how long we wait for a DOM reaction before calling a click "dead". */
const DEAD_CLICK_MS = 700;
/** request duration considered slow. */
const SLOW_REQUEST_MS = 3000;

type Listener = (session: UxSession | null) => void;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function truncate(v: string, n = 140): string {
  return v.length > n ? `${v.slice(0, n - 1)}…` : v;
}

function labelFor(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return truncate(aria, 60);
  const title = el.getAttribute("title");
  if (title) return truncate(title, 60);
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (text) return truncate(text, 60);
  const ph = el.getAttribute("placeholder");
  if (ph) return truncate(ph, 60);
  const name = el.getAttribute("name") ?? el.getAttribute("id");
  if (name) return truncate(name, 60);
  return el.tagName.toLowerCase();
}

function signature(el: Element): string {
  const parts: string[] = [el.tagName.toLowerCase()];
  const role = el.getAttribute("role");
  if (role) parts.push(`[role=${role}]`);
  const testId = el.getAttribute("data-ux-id") ?? el.getAttribute("data-testid");
  if (testId) parts.push(`#${testId}`);
  else parts.push(`:${labelFor(el)}`);
  return parts.join("");
}

const INTERACTIVE = "button,a,input,select,textarea,summary,[role=button],[role=tab],[role=switch],[role=menuitem],[role=option],[contenteditable=true],label";

function interactiveAncestor(node: EventTarget | null): Element | null {
  let el = node instanceof Element ? node : null;
  while (el) {
    if (el.matches(INTERACTIVE)) return el;
    el = el.parentElement;
  }
  return null;
}

function toggleKind(el: Element): UxStepKind | null {
  const role = el.getAttribute("role");
  if (role === "switch" || role === "tab" || role === "checkbox") return "toggle";
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return "toggle";
  if (el.hasAttribute("aria-pressed") || el.hasAttribute("aria-checked")) return "toggle";
  if (el.hasAttribute("aria-expanded")) return "toggle";
  return null;
}

class UxRecorder {
  private session: UxSession | null = null;
  private listeners = new Set<Listener>();
  private teardown: Array<() => void> = [];
  private mutations = 0;
  private observer: MutationObserver | null = null;
  private recentClicks: Array<{ x: number; y: number; t: number }> = [];
  private routeHistory: Array<{ route: string; t: number }> = [];
  private hesitationTimer: ReturnType<typeof setTimeout> | null = null;
  private lastStepAt = 0;

  // ---------------------------------------------------------------- lifecycle

  isEnabled(): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LS_ENABLED) === "1";
  }

  setEnabled(on: boolean): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_ENABLED, on ? "1" : "0");
    if (!on) this.stop();
    this.emit();
  }

  current(): UxSession | null {
    if (this.session) return this.session;
    if (typeof window === "undefined") return null;
    const restored = safeParse<UxSession | null>(window.localStorage.getItem(LS_ACTIVE), null);
    if (restored && !restored.endedAt) {
      this.session = restored;
      this.attach();
      return restored;
    }
    return null;
  }

  start(label?: string): UxSession {
    this.stop(true);
    const now = Date.now();
    this.session = {
      id: uid(),
      label: label?.trim() || `Session ${new Date(now).toLocaleTimeString()}`,
      startedAt: now,
      userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
      viewport: {
        w: typeof window === "undefined" ? 0 : window.innerWidth,
        h: typeof window === "undefined" ? 0 : window.innerHeight,
      },
      steps: [],
    };
    this.lastStepAt = now;
    this.routeHistory = [];
    this.push("session-start", this.session.label, { detail: "Recording started" });
    this.attach();
    return this.session;
  }

  /** Stops recording and files the session in history. Returns its id. */
  stop(silent = false): string | null {
    const s = this.session;
    this.detach();
    if (!s) {
      if (!silent) this.emit();
      return null;
    }
    s.endedAt = Date.now();
    this.session = null;
    if (typeof window !== "undefined") {
      const all = this.sessions().filter((x) => x.id !== s.id);
      const next = [s, ...all].slice(0, MAX_SESSIONS);
      window.localStorage.setItem(LS_SESSIONS, JSON.stringify(next));
      window.localStorage.removeItem(LS_ACTIVE);
    }
    if (!silent) this.emit();
    return s.id;
  }

  sessions(): UxSession[] {
    if (typeof window === "undefined") return [];
    return safeParse<UxSession[]>(window.localStorage.getItem(LS_SESSIONS), []);
  }

  removeSession(id: string): void {
    if (typeof window === "undefined") return;
    const next = this.sessions().filter((s) => s.id !== id);
    window.localStorage.setItem(LS_SESSIONS, JSON.stringify(next));
    this.emit();
  }

  clearSessions(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS_SESSIONS);
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ------------------------------------------------------------------ capture

  push(kind: UxStepKind, label: string, opts?: { detail?: string; target?: string }): void {
    const s = this.session;
    if (!s) return;
    const t = Date.now();
    const step: UxStep = {
      id: uid(),
      t,
      kind,
      label,
      route: typeof window === "undefined" ? "" : window.location.pathname,
      gapMs: Math.max(0, t - this.lastStepAt),
      ...(opts?.detail ? { detail: truncate(opts.detail, 220) } : {}),
      ...(opts?.target ? { target: opts.target } : {}),
    };
    this.lastStepAt = t;
    s.steps.push(step);
    if (s.steps.length > MAX_STEPS) s.steps.splice(0, s.steps.length - MAX_STEPS);
    this.persistActive();
    this.armHesitation();
    this.emit();
  }

  /** App-level hook: record a toggle / preview / mode state change. */
  recordState(name: string, value: unknown): void {
    if (!this.session) return;
    this.push("state", name, { detail: String(value), target: `state:${name}` });
  }

  /** App-level hook: annotate the timeline (tester note or milestone). */
  note(text: string): void {
    if (!this.session) return;
    this.push("note", truncate(text, 80), { detail: text });
  }

  /** Router hook: record navigation + detect backtracking. */
  recordNav(route: string): void {
    if (!this.session) return;
    const last = this.routeHistory[this.routeHistory.length - 1];
    if (last?.route === route) return;
    const now = Date.now();
    const revisit = this.routeHistory
      .slice(-4, -1)
      .find((r) => r.route === route && now - r.t < 25000);
    this.routeHistory.push({ route, t: now });
    if (this.routeHistory.length > 20) this.routeHistory.shift();
    this.push("nav", route, { target: `route:${route}` });
    if (revisit) {
      this.push("backtrack", route, {
        detail: `Returned to ${route} after ${Math.round((now - revisit.t) / 1000)}s — likely wrong turn`,
        target: `route:${route}`,
      });
    }
  }

  // ------------------------------------------------------------------ private

  private emit(): void {
    for (const fn of this.listeners) fn(this.session);
  }

  private persistActive(): void {
    if (typeof window === "undefined" || !this.session) return;
    try {
      window.localStorage.setItem(LS_ACTIVE, JSON.stringify(this.session));
    } catch {
      /* quota — keep recording in memory */
    }
  }

  private armHesitation(): void {
    if (this.hesitationTimer) clearTimeout(this.hesitationTimer);
    this.hesitationTimer = setTimeout(() => {
      if (!this.session) return;
      if (typeof document !== "undefined" && document.hidden) return;
      const prev = this.session.steps[this.session.steps.length - 1];
      this.push("hesitation", prev ? `Stalled after "${prev.label}"` : "Stalled", {
        detail: `No interaction for ${Math.round(HESITATION_MS / 1000)}s`,
        target: prev?.target ?? "unknown",
      });
    }, HESITATION_MS);
  }

  private attach(): void {
    if (typeof window === "undefined" || this.teardown.length) return;

    // DOM reaction counter, used for dead-click detection.
    this.observer = new MutationObserver((records) => {
      this.mutations += records.length;
    });
    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: false,
    });

    const onClick = (ev: MouseEvent) => {
      const el = interactiveAncestor(ev.target);
      const raw = ev.target instanceof Element ? ev.target : null;
      const subject = el ?? raw;
      if (!subject) return;
      const label = labelFor(subject);
      const target = signature(subject);
      const kind = el ? (toggleKind(el) ?? "click") : "click";
      const detail = el
        ? kind === "toggle"
          ? `now ${el.getAttribute("aria-pressed") ?? el.getAttribute("aria-checked") ?? el.getAttribute("aria-expanded") ?? "changed"}`
          : undefined
        : "clicked non-interactive element";
      this.push(kind, label, { ...(detail ? { detail } : {}), target });

      // rage clicks
      const now = Date.now();
      this.recentClicks = this.recentClicks.filter((c) => now - c.t < RAGE_MS);
      this.recentClicks.push({ x: ev.clientX, y: ev.clientY, t: now });
      const near = this.recentClicks.filter(
        (c) => Math.hypot(c.x - ev.clientX, c.y - ev.clientY) < RAGE_RADIUS,
      );
      if (near.length >= 3) {
        this.recentClicks = [];
        this.push("rage-click", label, {
          detail: `${near.length} rapid clicks in the same spot`,
          target,
        });
      }

      // dead clicks
      if (!el) {
        const before = this.mutations;
        const route = window.location.pathname;
        setTimeout(() => {
          if (!this.session) return;
          const changed = this.mutations - before > 3 || window.location.pathname !== route;
          if (!changed) {
            this.push("dead-click", label, {
              detail: "Click produced no visible response",
              target,
            });
          }
        }, DEAD_CLICK_MS);
      }
    };

    const onChange = (ev: Event) => {
      const el = ev.target instanceof Element ? ev.target : null;
      if (!el) return;
      if (el instanceof HTMLSelectElement) {
        this.push("toggle", labelFor(el), { detail: el.value, target: signature(el) });
        return;
      }
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        this.push("toggle", labelFor(el), {
          detail: el.checked ? "on" : "off",
          target: signature(el),
        });
      }
    };

    let inputTimer: ReturnType<typeof setTimeout> | null = null;
    const onInput = (ev: Event) => {
      const el = ev.target;
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
      if (el instanceof HTMLInputElement && ["checkbox", "radio"].includes(el.type)) return;
      const sig = signature(el);
      const name = labelFor(el);
      if (inputTimer) clearTimeout(inputTimer);
      inputTimer = setTimeout(() => {
        this.push("input", name, { detail: `${el.value.length} chars`, target: sig });
      }, 900);
    };

    const onKey = (ev: KeyboardEvent) => {
      if (!["Escape", "Enter", "Tab"].includes(ev.key) && !(ev.metaKey || ev.ctrlKey)) return;
      const combo = `${ev.metaKey ? "⌘" : ""}${ev.ctrlKey ? "Ctrl+" : ""}${ev.shiftKey ? "⇧" : ""}${ev.key}`;
      this.push("key", combo, { target: `key:${ev.key}` });
    };

    const onError = (ev: ErrorEvent) => {
      this.push("error", ev.message || "Runtime error", {
        detail: `${ev.filename ?? ""}:${ev.lineno ?? 0}`,
        target: "runtime",
      });
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      this.push("error", msg || "Unhandled rejection", { target: "runtime" });
    };

    // fetch instrumentation
    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = async (input, init) => {
      const started = Date.now();
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      try {
        const res = await originalFetch(input, init);
        const ms = Date.now() - started;
        if (!res.ok) {
          this.push("net-error", `${res.status} ${new URL(url, window.location.origin).pathname}`, {
            detail: `Request failed after ${ms}ms`,
            target: `net:${new URL(url, window.location.origin).pathname}`,
          });
        } else if (ms > SLOW_REQUEST_MS) {
          this.push("net-slow", new URL(url, window.location.origin).pathname, {
            detail: `${ms}ms with no visible progress guarantee`,
            target: `net:${new URL(url, window.location.origin).pathname}`,
          });
        }
        return res;
      } catch (err) {
        this.push("net-error", new URL(url, window.location.origin).pathname, {
          detail: err instanceof Error ? err.message : "Network failure",
          target: `net:${new URL(url, window.location.origin).pathname}`,
        });
        throw err;
      }
    };
    window.fetch = patchedFetch;

    document.addEventListener("click", onClick, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    this.teardown = [
      () => document.removeEventListener("click", onClick, true),
      () => document.removeEventListener("change", onChange, true),
      () => document.removeEventListener("input", onInput, true),
      () => document.removeEventListener("keydown", onKey, true),
      () => window.removeEventListener("error", onError),
      () => window.removeEventListener("unhandledrejection", onRejection),
      () => {
        if (window.fetch === patchedFetch) window.fetch = originalFetch;
      },
      () => {
        if (inputTimer) clearTimeout(inputTimer);
      },
    ];
    this.armHesitation();
  }

  private detach(): void {
    for (const fn of this.teardown) fn();
    this.teardown = [];
    this.observer?.disconnect();
    this.observer = null;
    if (this.hesitationTimer) clearTimeout(this.hesitationTimer);
    this.hesitationTimer = null;
    this.recentClicks = [];
  }
}

export const uxRecorder = new UxRecorder();

/** Convenience hooks for app code (safe no-ops when not recording). */
export function uxRecordState(name: string, value: unknown): void {
  uxRecorder.recordState(name, value);
}
export function uxNote(text: string): void {
  uxRecorder.note(text);
}
