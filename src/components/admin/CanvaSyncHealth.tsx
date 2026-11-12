// Health of the shared Canva connection and the daily picture sync (admin only).
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/design-system/element";
import { getCanvaSyncHealth, runCanvaBackgroundSync } from "@/lib/canva-sync.functions";
import { explainSyncError } from "@/lib/canva-sync-messages";

const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "never");

export function CanvaSyncHealth() {
  const healthFn = useServerFn(getCanvaSyncHealth);
  const runFn = useServerFn(runCanvaBackgroundSync);
  const qc = useQueryClient();
  const h = useQuery({ queryKey: ["canva-sync-health"], queryFn: () => healthFn() });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (h.isLoading) return <p className="text-sm">Checking sync health…</p>;
  if (h.error) return <p className="text-sm text-destructive">{explainSyncError((h.error as Error).message).what}</p>;
  const d = h.data!;
  const last = d.runs[0];
  return (
    <section aria-labelledby="sync-health" className="space-y-3 border-t pt-6">
      <h2 id="sync-health" className="text-lg font-semibold">Bowl calendar picture sync</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Connected as</dt><dd>{d.connectedBy ?? (d.connected ? "unknown account" : "not connected")}</dd>
        <dt className="text-muted-foreground">Sign-in last renewed</dt><dd>{when(d.tokenRefreshedAt)} (renews itself automatically)</dd>
        <dt className="text-muted-foreground">Designs watched</dt><dd>{d.total}{d.neverChecked ? ` · ${d.neverChecked} not checked yet` : ""}</dd>
        <dt className="text-muted-foreground">Waiting to update</dt><dd>{d.pending}</dd>
        <dt className="text-muted-foreground">With problems</dt><dd>{d.withErrors}</dd>
        <dt className="text-muted-foreground">Last checked</dt><dd>{when(d.lastChecked)}</dd>
      </dl>
      <p className="text-sm text-muted-foreground">Every day the site checks up to 120 designs and updates up to 25 changed pictures, so large edit days catch up over several days by themselves.</p>
      {last && (
        <p role="status" className="rounded-md border p-3 text-sm">
          Last run ({last.trigger === "daily" ? "automatic" : "manual"}, {when(last.started_at)}): checked {last.checked}, updated {last.synced}, {last.failed} failed, {last.remaining} still waiting.
          {last.stopped_reason ? ` ${explainSyncError(last.stopped_reason).what}` : ""}
        </p>
      )}
      {!d.connected && <p className="text-sm text-destructive">Sync is paused until the shared Canva account is connected above.</p>}
      <Button disabled={busy || !d.connected} onClick={async () => {
        setBusy(true); setErr(null);
        try { await runFn(); } catch (e) { setErr((e as Error).message); }
        setBusy(false); qc.invalidateQueries({ queryKey: ["canva-sync-health"] }); qc.invalidateQueries({ queryKey: ["canva-asset-sync"] });
      }}>{busy ? "Running… (can take a few minutes)" : "Run today's sync now"}</Button>
      {err && <p className="text-sm text-destructive">{explainSyncError(err).what} {explainSyncError(err).next}</p>}
    </section>
  );
}
