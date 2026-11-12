// Public block under the Bowl calendar: when the pictures shown here last changed,
// plus a "Check Canva for updates" button every visitor can press — signed in or not.
// Dates and counts only: never design names, owners or raw Canva failures.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/design-system/element";
import { checkCanvaUpdatesPublic, getCanvaSyncStamp } from "@/lib/canva-sync.functions";
import {
  describeCheckResult,
  describePictureStamp,
  explainSyncError,
  type CanvaPictureStamp,
} from "@/lib/canva-sync-messages";

export function SjbPictureStamp({ stamp: initial }: { stamp: CanvaPictureStamp | null }) {
  const [stamp, setStamp] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const check = useServerFn(checkCanvaUpdatesPublic);
  const refresh = useServerFn(getCanvaSyncStamp);

  const run = async () => {
    setBusy(true);
    setNote("Checking Canva… this can take a minute.");
    try {
      const r = await check();
      setNote(describeCheckResult(r));
      if (r.ok) setStamp(await refresh());
    } catch (e) {
      setNote(explainSyncError(String(e)).what);
    } finally {
      setBusy(false);
    }
  };

  const line = describePictureStamp(stamp ?? { picturesUpdated: null, source: null, lastCheckedAt: null });

  return (
    <div className="mt-3">
      {line && <p aria-live="polite" className="text-xs text-muted-foreground">{line}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={run} disabled={busy}>
          {busy ? "Checking Canva…" : "Check Canva for updates"}
        </Button>
        {note && (
          <span aria-live="polite" className="text-xs text-muted-foreground">{note}</span>
        )}
      </div>
    </div>
  );
}
