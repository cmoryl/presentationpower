// Admin-only "Sync from Canva": first reads edit times (free), then exports only
// the designs changed since their last saved picture, then verifies each one is live.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/design-system/element";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { checkCanvaUpdates, syncCanvaDesigns } from "@/lib/canva-sync.functions";
import { CANVA_SYNC_QUERY } from "@/lib/use-canva-sync";
import { explainSyncError } from "@/lib/canva-sync-messages";
import { SJB_CALENDAR_PREVIEWS, sjbCalendarDesignLabel } from "@/lib/sjb-social-calendar";

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "unknown");
const kb = (n: number | null) => (n == null ? "—" : `${Math.round(n / 1024)} KB`);
const liveUrl = (id: string, v: string) => `/api/public/canva-sync/${id}?v=${encodeURIComponent(v)}`;

type Problem = { id: string | null; raw: string };
type Updated = { id: string; before: string | null; after: string; bytes: number; previousBytes: number | null; canvaUpdatedAt: string | null; syncedAt: string; checks: string[]; failed: string[] };

export interface SjbCanvaSyncPanelProps { designIds: string[]; label: string }

export function SjbCanvaSyncPanel({ designIds, label }: SjbCanvaSyncPanelProps) {
  const isAdmin = useIsAdmin();
  const check = useServerFn(checkCanvaUpdates);
  const sync = useServerFn(syncCanvaDesigns);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [changed, setChanged] = useState<{ id: string; at: string | null }[] | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [updated, setUpdated] = useState<Updated[]>([]);
  const [final, setFinal] = useState<string | null>(null);
  if (!isAdmin) return null;

  const runCheck = async () => {
    setBusy("Checking Canva…"); setChanged(null); setProblems([]); setUpdated([]); setFinal(null);
    const found: { id: string; at: string | null }[] = []; const errs: Problem[] = [];
    try {
      for (const [i, part] of chunk(designIds, 30).entries()) {
        setBusy(`Checking Canva… ${Math.min((i + 1) * 30, designIds.length)} of ${designIds.length}`);
        for (const r of await check({ data: { ids: part } })) { if (r.changed) found.push({ id: r.id, at: r.canvaUpdatedAt }); if (r.error) errs.push({ id: r.id, raw: r.error }); }
      }
    } catch (e) { errs.push({ id: null, raw: (e as Error).message }); setProblems(errs); setChanged(null); setBusy(null); return; }
    setChanged(found); setProblems(errs); setBusy(null);
  };

  const runSync = async () => {
    if (!changed?.length) return;
    const errs: Problem[] = []; const done: Updated[] = [];
    const prevLive = qc.getQueryData<Record<string, string>>(CANVA_SYNC_QUERY) ?? {};
    try {
      for (const [i, part] of chunk(changed.map((c) => c.id), 5).entries()) {
        setBusy(`Updating pictures… ${Math.min((i + 1) * 5, changed.length)} of ${changed.length}`);
        for (const r of await sync({ data: { ids: part } })) {
          if (!r.ok) { errs.push({ id: r.id, raw: r.error }); continue; }
          const before = r.previousSyncedAt ? liveUrl(r.id, r.previousSyncedAt) : prevLive[r.id] ? liveUrl(r.id, prevLive[r.id]!) : SJB_CALENDAR_PREVIEWS[r.id] ?? null;
          done.push({ id: r.id, before, after: liveUrl(r.id, r.syncedAt), bytes: r.bytes, previousBytes: r.previousBytes, canvaUpdatedAt: r.canvaUpdatedAt, syncedAt: r.syncedAt, checks: [...r.verified], failed: [] });
        }
      }
    } catch (e) { errs.push({ id: null, raw: (e as Error).message }); }

    // Verification 1: the live link serves the new picture.
    setBusy("Verifying the new pictures are live…");
    for (const u of done) {
      try {
        const res = await fetch(u.after, { cache: "no-store" });
        const ok = res.ok && (res.headers.get("content-type") ?? "").includes("image/jpeg") && (await res.arrayBuffer()).byteLength === u.bytes;
        (ok ? u.checks : u.failed).push(ok ? "Live on the calendar" : "Live link did not return the new picture");
      } catch { u.failed.push("Live link could not be reached"); }
    }
    // Verification 2: Canva confirms nothing updated is still behind.
    setBusy("Re-checking Canva…");
    const stillBehind = new Set<string>();
    try {
      for (const part of chunk(done.map((d) => d.id), 30)) for (const r of await check({ data: { ids: part } })) if (r.changed) stillBehind.add(r.id);
    } catch (e) { errs.push({ id: null, raw: (e as Error).message }); }
    for (const u of done) (stillBehind.has(u.id) ? u.failed : u.checks).push(stillBehind.has(u.id) ? "Canva was edited again during the update" : "Matches the latest Canva version");

    await qc.invalidateQueries({ queryKey: CANVA_SYNC_QUERY });
    const verified = done.filter((d) => d.failed.length === 0).length;
    setUpdated(done); setProblems(errs); setChanged(null); setBusy(null);
    setFinal(errs.length === 0 && verified === done.length
      ? `All up to date: ${verified} picture${verified === 1 ? "" : "s"} updated and verified.`
      : `${verified} of ${changed.length} picture${changed.length === 1 ? "" : "s"} updated and verified; ${changed.length - verified} need attention (listed below). Their old pictures stay live.`);
  };

  return (
    <section aria-label="Sync from Canva" className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={runCheck} disabled={!!busy}><RefreshCw size={14} aria-hidden /> Check Canva for updates</Button>
        <span className="text-muted-foreground" aria-live="polite">{busy ?? `${designIds.length} ${label} designs. Checking is free; only changed designs are downloaded.`}</span>
      </div>

      {changed && (changed.length === 0
        ? <p className="mt-3">{problems.length > 0 ? `Nothing to download, but ${problems.length} design${problems.length === 1 ? "" : "s"} could not be checked (listed below).` : "Everything matches Canva — nothing to download."}</p>
        : <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p>{changed.length} design{changed.length === 1 ? "" : "s"} changed in Canva; {designIds.length - changed.length - problems.length} unchanged{problems.length > 0 ? `; ${problems.length} could not be checked (listed below)` : ""}.</p>
              <Button size="sm" onClick={runSync} disabled={!!busy}>Update {changed.length} picture{changed.length === 1 ? "" : "s"}</Button>
            </div>
            <ul className="max-h-48 overflow-auto list-disc pl-5">
              {changed.map((c) => <li key={c.id}>{sjbCalendarDesignLabel(c.id)} — edited in Canva {when(c.at)}</li>)}
            </ul>
          </div>)}

      {final && <p role="status" className="mt-3 font-medium">{final}</p>}

      {updated.length > 0 && (
        <ul className="mt-3 space-y-3">
          {updated.map((u) => (
            <li key={u.id} className="rounded-md border border-border bg-background p-3">
              <p className="font-medium">{sjbCalendarDesignLabel(u.id)}</p>
              <p className="text-muted-foreground">Edited in Canva {when(u.canvaUpdatedAt)} · updated here {when(u.syncedAt)} · {kb(u.previousBytes)} → {kb(u.bytes)}</p>
              <div className="mt-2 flex gap-3">
                <figure className="w-28"><figcaption className="text-xs text-muted-foreground">Before</figcaption>{u.before ? <img src={u.before} alt={`Before: ${sjbCalendarDesignLabel(u.id)}`} className="mt-1 w-full rounded border border-border" /> : <div className="mt-1 text-xs">No earlier picture</div>}</figure>
                <figure className="w-28"><figcaption className="text-xs text-muted-foreground">After</figcaption><img src={u.after} alt={`After: ${sjbCalendarDesignLabel(u.id)}`} className="mt-1 w-full rounded border border-border" /></figure>
                <ul className="flex-1 space-y-1">
                  {u.checks.map((c) => <li key={c} className="flex items-center gap-1"><CheckCircle2 size={14} aria-hidden className="text-primary" /> {c}</li>)}
                  {u.failed.map((c) => <li key={c} className="flex items-center gap-1 text-destructive"><XCircle size={14} aria-hidden /> {c}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}

      {problems.length > 0 && (
        <div className="mt-3">
          <p className="font-medium text-destructive">{problems.length} problem{problems.length === 1 ? "" : "s"}:</p>
          <ul className="mt-1 max-h-72 space-y-2 overflow-auto">
            {problems.map((p, i) => { const x = explainSyncError(p.raw); return (
              <li key={i} className="rounded-md border border-destructive/40 bg-background p-2">
                <p className="font-medium">{p.id ? sjbCalendarDesignLabel(p.id) : "Whole check"}</p>
                <p>{x.what} <span className="font-medium">Next step:</span> {x.next}</p>
                <details className="text-xs text-muted-foreground"><summary>Technical detail</summary>{p.raw}</details>
              </li>); })}
          </ul>
        </div>
      )}
    </section>
  );
}
