// Toast screen-reader announcement layer.
//
// Sonner's <Toaster /> renders each toast inside a hidden
// [role="status"][aria-live="polite"] region, which is fine for
// confirmations but wrong for errors/warnings — SR users should hear
// error copy immediately (assertive), not queue behind other polite
// updates. Sonner does not expose per-toast politeness, so instead of
// rewriting every `toast.error(...)` call site we:
//
//   1. Mount ONE dedicated `[role="alert"][aria-live="assertive"]`
//      region in the app shell (see mountToastA11y).
//   2. Monkey-patch `toast.error` and `toast.warning` at boot so their
//      message text is also written into that assertive region. Sonner
//      still shows the visible toast; SRs additionally get an immediate
//      assertive announcement.
//
// Success/info/loading/default toasts continue to flow through sonner's
// polite region unchanged.

import { toast } from "sonner";

const ASSERTIVE_ID = "tp-toast-assertive-live";

function extractText(message: unknown): string {
  if (message == null) return "";
  if (typeof message === "string") return message;
  if (typeof message === "number" || typeof message === "boolean") return String(message);
  // React nodes / objects — best-effort: fall back to a generic label.
  // Sonner will still show the rich content visually.
  return "Notification";
}

function announceAssertive(text: string) {
  if (typeof document === "undefined" || !text) return;
  const el = document.getElementById(ASSERTIVE_ID);
  if (!el) return;
  // Clear then set on next tick so SRs re-announce identical messages.
  el.textContent = "";
  window.setTimeout(() => {
    el.textContent = text;
  }, 30);
}

let patched = false;
export function installToastA11y() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const originalError = toast.error.bind(toast);
  const originalWarning = toast.warning?.bind(toast);
  // Reassignment of methods on the sonner `toast` object is supported —
  // it is a plain object, not a frozen module namespace.
  (toast as { error: typeof toast.error }).error = ((message: Parameters<typeof toast.error>[0], data?: Parameters<typeof toast.error>[1]) => {
    announceAssertive(extractText(message));
    return originalError(message, data);
  }) as typeof toast.error;
  if (originalWarning) {
    (toast as { warning: typeof toast.warning }).warning = ((message: Parameters<typeof toast.warning>[0], data?: Parameters<typeof toast.warning>[1]) => {
      announceAssertive(extractText(message));
      return originalWarning(message, data);
    }) as typeof toast.warning;
  }
}

/** Mount the assertive live region once — call from the app shell. */
export function ToastAssertiveLiveRegion() {
  return (
    <div
      id={ASSERTIVE_ID}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      // Visually hidden but exposed to assistive tech.
      style={{
        position: "fixed",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    />
  );
}
