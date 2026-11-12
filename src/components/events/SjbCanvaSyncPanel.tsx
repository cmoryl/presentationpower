// Admin-only "Sync from Canva": first reads edit times (free), then exports only
// the designs changed since their last saved picture, after the admin confirms.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/design-system/element";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { checkCanvaUpdates, syncCanvaDesigns } from "@/lib/canva-sync.functions";
import { CANVA_SYNC_QUERY } from "@/lib/use-canva-sync";

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export interface SjbCanvaSyncPanelProps { designIds: string[]; label: string }

export function SjbCanvaSyncPanel({ designIds, label }: SjbCanvaSyncPanelProps) {
  const isAdmin = useIsAdmin();
  const check = useServerFn(checkCanvaUpdates);
  const sync = useServerFn(syncCanvaDesigns);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [changed, setChanged] = useState<string[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  if (!isAdmin) return null;

  const runCheck = async () => {
    setBusy("Checking Canva…"); setChanged(null); setErrors([]); setDone(null);
    const found: string[] = []; const errs: string[] = [];
    try {
      for (const [i, part] of chunk(designIds, 30).entries()) {
        setBusy(`Checking Canva… ${Math.min((i + 1) * 30, designIds.length)} of ${designIds.length}`);
        for (const r of await check({ data: { ids: part } })) { if (r.changed) found.push(r.id); if (r.error) errs.push(`${r.id}: ${r.error}`); }
      }
    } catch (e) { errs.push((e as Error).message); }
    setChanged(found); setErrors(errs); setBusy(null);
  };

  const runSync = async () => {
    if (!changed?.length) return;
    const errs: string[] = []; let ok = 0;
    try {
      for (const [i, part] of chunk(changed, 5).entries()) {
        setBusy(`Updating pictures… ${Math.min((i + 1) * 5, changed.length)} of ${changed.length}`);
        for (const r of await sync({ data: { ids: part } })) r.ok ? ok++ : errs.push(`${r.id}: ${r.error}`);
      }
    } catch (e) { errs.push((e as Error).message); }
    await qc.invalidateQueries({ queryKey: CANVA_SYNC_QUERY });
    setBusy(null); setChanged(null); setErrors(errs);
    setDone(`${ok} picture${ok === 1 ? "" : "s"} updated from Canva, hidden AI labels removed.`);
  };

  return (
    <section aria-label="Sync from Canva" className="mt-6 rounded-md border border-border bg-muted/40 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" onClick={runCheck} disabled={!!busy}><RefreshCw size={14} aria-hidden /> Check Canva for updates</Button>
        <span className="text-muted-foreground">{busy ?? `${designIds.length} ${label} designs. Checking is free; only changed designs are downloaded.`}</span>
      </div>
      {changed && (changed.length === 0
        ? <p className="mt-3">Everything matches Canva — nothing to download.</p>
        : <div className="mt-3 flex flex-wrap items-center gap-3">
            <p>{changed.length} design{changed.length === 1 ? "" : "s"} changed in Canva; {designIds.length - changed.length} unchanged.</p>
            <Button size="sm" onClick={runSync} disabled={!!busy}>Update {changed.length} picture{changed.length === 1 ? "" : "s"}</Button>
          </div>)}
      {done && <p role="status" className="mt-3">{done}</p>}
      {errors.length > 0 && <ul className="mt-3 list-disc pl-5 text-destructive">{errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}{errors.length > 8 && <li>…and {errors.length - 8} more</li>}</ul>}
    </section>
  );
}
