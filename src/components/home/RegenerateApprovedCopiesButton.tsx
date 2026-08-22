import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { regenerateApprovedDemoCopies } from "@/lib/showcase-regenerate";

/**
 * Bulk refresh: replaces every saved demo deck copy (any division) with the
 * latest approved build, so a whole demo set updates in one click.
 */
export function RegenerateApprovedCopiesButton({
  className,
  label = "Regenerate approved copies",
}: {
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  function run() {
    setBusy(true);
    try {
      const { refreshed } = regenerateApprovedDemoCopies();
      if (refreshed.length === 0) {
        toast.info("No saved demo copies found to refresh.");
      } else {
        toast.success(
          `Refreshed ${refreshed.length} demo cop${refreshed.length === 1 ? "y" : "ies"} to the latest approved build.`,
        );
      }
    } catch (err) {
      toast.error(`Could not refresh demo copies: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      title="Replace every saved demo copy with the latest approved build"
      className={
        className ??
        "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-black/15 px-4 text-sm font-medium text-black/70 transition hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"
      }
    >
      <RefreshCw size={15} className={busy ? "animate-spin" : undefined} />
      {busy ? "Refreshing…" : label}
    </button>
  );
}
