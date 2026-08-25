// -----------------------------------------------------------------------------
// Universal deck acknowledgements
//
// Every deck action — exporting, printing, sharing/publishing a link, and each
// structural slide edit — must produce a visible signal. Exports already run
// through `export-feedback`; this module is the same contract for the actions
// that used to succeed (or fail) in silence.
//
// Slide edits are announced as short, undoable confirmations rather than
// blocking toasts, so a fast editing session never turns into a toast storm:
// repeated edits of the same kind collapse onto one toast id.
// -----------------------------------------------------------------------------

import { toast } from "sonner";

export {
  describeExportError,
  notifyBlocked,
  runWithExportFeedback,
  type ExportFeedbackLabels,
} from "./export-feedback";

import { describeExportError } from "./export-feedback";

const canToast = () => typeof window !== "undefined";

/** Success acknowledgement for a completed deck action. */
export function notifyDeckSuccess(
  message: string,
  opts?: { description?: string; id?: string; duration?: number },
): void {
  if (!canToast()) return;
  toast.success(message, {
    ...(opts?.id ? { id: opts.id } : {}),
    description: opts?.description,
    duration: opts?.duration ?? 4000,
  });
}

/** Failure acknowledgement that always names a real reason. */
export function notifyDeckError(message: string, err?: unknown, id?: string): void {
  if (!canToast()) return;
  toast.error(message, {
    ...(id ? { id } : {}),
    description: err === undefined ? undefined : describeExportError(err),
    duration: 10000,
  });
}

/**
 * Structural slide edit confirmation, with one-click undo when the caller can
 * revert it. `kind` groups repeats (e.g. many reorders in a row) onto one toast.
 */
export function notifySlideEdit(
  message: string,
  opts?: { kind?: string; description?: string; undo?: () => void },
): void {
  if (!canToast()) return;
  toast.success(message, {
    id: `slide-edit-${opts?.kind ?? message}`,
    description: opts?.description,
    duration: 3200,
    ...(opts?.undo ? { action: { label: "Undo", onClick: opts.undo } } : {}),
  });
}

/**
 * Run an async deck action (share, publish, save, print prep) with a pending →
 * success/error toast lifecycle. Returns the result, or `null` when it failed,
 * so callers keep their own state handling.
 */
export async function runDeckAction<T>(
  labels: { pending: string; success: string; failure: string; successDescription?: string },
  work: () => Promise<T>,
): Promise<T | null> {
  if (!canToast()) {
    try {
      return await work();
    } catch {
      return null;
    }
  }
  const id = toast.loading(labels.pending);
  try {
    const out = await work();
    toast.success(labels.success, {
      id,
      description: labels.successDescription,
      duration: 5000,
    });
    return out;
  } catch (err) {
    toast.error(labels.failure, { id, description: describeExportError(err), duration: 10000 });
    return null;
  }
}

/**
 * Print / Save-as-PDF acknowledgement. `window.print()` itself is silent, so
 * wrap every caller: announce that the dialog is opening (and how to save a
 * PDF from it), then confirm when the print view closes. Also fires the print
 * so callers can replace a bare `window.print()` with this one call.
 */
export function notifyPrintToPdf(what = "document"): void {
  if (!canToast()) {
    if (typeof window !== "undefined") window.print();
    return;
  }
  // 1) Immediate "started" signal. A native print dialog blocks the main
  // thread the instant `window.print()` runs, so this toast must paint first —
  // we delay the print call long enough for at least one visible frame.
  toast.loading(`Preparing ${what} for PDF export…`, {
    id: "print-to-pdf",
    description: `The print dialog opens in a moment — choose “Save as PDF” as the destination.`,
  });
  let printed = false;
  const onAfterPrint = () => {
    printed = true;
    // Same toast id: the loading toast resolves into the completion state
    // whether the user saved or cancelled the dialog.
    toast.success("PDF export finished", {
      id: "print-to-pdf",
      description: `If you saved the PDF, it is in your downloads folder.`,
      duration: 5000,
    });
  };
  window.addEventListener("afterprint", onAfterPrint, { once: true });
  // Safety: if the dialog never opens (blocked), don't leak the listener —
  // resolve the pending toast so it never spins forever.
  setTimeout(() => {
    window.removeEventListener("afterprint", onAfterPrint);
    if (printed) return;
    toast.info("Print dialog didn't open", {
      id: "print-to-pdf",
      description: "Your browser may have blocked it — try again, or allow pop-ups for this site.",
      duration: 6000,
    });
  }, 60_000);
  setTimeout(() => window.print(), 650);
}
