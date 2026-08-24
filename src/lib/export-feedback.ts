import { toast } from "sonner";

/**
 * Shared acknowledgement contract for every export/download action in the app.
 *
 * A click must always produce a visible signal: a pending toast while work
 * runs, a success toast naming the file that landed, or an error toast with the
 * real reason. Silent handlers read as broken software even when they worked.
 */
export type ExportFeedbackLabels = {
  /** Shown while the work runs, e.g. "Building your PowerPoint…". */
  pending: string;
  /** Shown on success, e.g. "Deck.pptx downloaded". */
  success: string;
  /** Prefix for failures, e.g. "PowerPoint export failed". */
  failure: string;
  /** Optional extra line on the success toast. */
  successDescription?: string;
};

export function describeExportError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return "Unexpected error — try again, or reload the page if it repeats.";
}

/**
 * Runs `work` with a pending → success/error toast lifecycle and returns its
 * result. Errors are re-thrown after being surfaced so callers can still react.
 */
export async function runWithExportFeedback<T>(
  labels: ExportFeedbackLabels,
  work: () => Promise<T>,
): Promise<T> {
  const id = toast.loading(labels.pending);
  try {
    const result = await work();
    toast.success(labels.success, {
      id,
      description: labels.successDescription,
      duration: 6000,
    });
    return result;
  } catch (err) {
    toast.error(labels.failure, {
      id,
      description: describeExportError(err),
      duration: 12000,
    });
    throw err;
  }
}

/**
 * Explains why an action did nothing instead of failing silently — the most
 * common "the button is broken" report.
 */
export function notifyBlocked(reason: string, action?: { label: string; onClick: () => void }) {
  toast.error(reason, {
    duration: 10000,
    ...(action ? { action } : {}),
  });
}
