// Load-failure notice — the inline answer to "is this empty, or did it fail?".
//
// Screens that read data with TanStack Query used to fall through to `[]` when
// a request failed, so a network fault rendered as "you have nothing saved".
// This states the failure and offers a retry, in place, without discarding the
// rest of the page.

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/components/ConnectionBanner";

export function LoadFailureNotice({
  what,
  onRetry,
  retrying = false,
  className = "",
}: {
  /** Plain-language name of the thing that didn't load, e.g. "your saved decks". */
  what: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const online = useOnlineStatus();
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 print:hidden ${className}`}
    >
      <p className="inline-flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="h-4 w-4" aria-hidden />
        {what} couldn't be loaded
      </p>
      <p className="mt-1 text-xs text-amber-900/80">
        {online
          ? "This is a loading problem, not an empty account — nothing has been lost."
          : "You appear to be offline. Nothing has been lost; reconnect and try again."}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#03002C] px-4 text-sm font-semibold text-primary-foreground hover:bg-primary disabled:opacity-60 dark:bg-primary dark:text-primary-foreground"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
          {retrying ? "Trying again…" : "Try again"}
        </button>
      )}
    </div>
  );
}
