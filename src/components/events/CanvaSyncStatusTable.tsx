// Admin list: every watched design's last Canva edit vs the picture the site shows.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/design-system/element";
import { listCanvaSyncStatus } from "@/lib/canva-sync.functions";
import { canvaSyncLabel } from "@/lib/canva-sync-targets";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
const STATUS = { "needs-update": "Needs update", "up-to-date": "Up to date", unchecked: "Not checked yet" } as const;
type Filter = "needs-update" | "all" | "unchecked";

/** One glanceable light: green = every watched design matches Canva, amber = some
 *  need updating, gray = not everything has been checked yet, red = status unknown. */
export function CanvaSyncLight() {
  const list = useServerFn(listCanvaSyncStatus);
  const q = useQuery({ queryKey: ["canva-asset-sync", "status"], queryFn: () => list() });
  const rows = q.data ?? [];
  const needs = rows.filter((r) => r.status === "needs-update").length;
  const unchecked = rows.filter((r) => r.status === "unchecked").length;
  const light = q.isLoading
    ? { dot: "bg-zinc-400 animate-pulse", text: "Reading design status…" }
    : q.error
      ? { dot: "bg-red-500", text: "Status unavailable — couldn't load the design list." }
      : rows.length === 0
        ? { dot: "bg-zinc-400", text: "No designs are being watched yet." }
        : needs > 0
          ? { dot: "bg-amber-400", text: `${needs} design${needs === 1 ? "" : "s"} need updating from Canva.` }
          : unchecked > 0
            ? { dot: "bg-zinc-400", text: `${unchecked} design${unchecked === 1 ? "" : "s"} not checked yet — press "Check Canva for updates".` }
            : { dot: "bg-emerald-500", text: "Everything is up to date with Canva." };
  return (
    <span role="status" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
      <span aria-hidden className={`inline-block h-2.5 w-2.5 rounded-full ${light.dot}`} />
      {light.text}
    </span>
  );
}

export function CanvaSyncStatusTable() {
  const list = useServerFn(listCanvaSyncStatus);
  const [filter, setFilter] = useState<Filter>("needs-update");
  const q = useQuery({ queryKey: ["canva-asset-sync", "status"], queryFn: () => list() });
  const rows = (q.data ?? []).filter((r) => filter === "all" || r.status === filter)
    .sort((a, b) => (b.canvaEditedAt ?? "").localeCompare(a.canvaEditedAt ?? ""));
  const count = (s: string) => (q.data ?? []).filter((r) => r.status === s).length;
  return (
    <details className="mt-4">
      <summary className="cursor-pointer font-medium">Design dates: Canva edit vs site picture</summary>
      {q.isLoading ? <p className="mt-2 text-muted-foreground">Loading…</p> : q.error ? <p className="mt-2 text-destructive">Couldn't load the list: {(q.error as Error).message}</p> : <>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Show">
          {([["needs-update", `Needs update (${count("needs-update")})`], ["unchecked", `Not checked (${count("unchecked")})`], ["all", `All (${q.data?.length ?? 0})`]] as const).map(([v, l]) =>
            <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l}</Button>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Canva dates come from the latest check; press "Check Canva for updates" to refresh them.</p>
        <div className="mt-2 max-h-[480px] overflow-auto rounded border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted"><tr><th className="p-2">Design</th><th className="p-2">Last edited in Canva</th><th className="p-2">Saved on site</th><th className="p-2">Status</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-border">
              <td className="p-2"><a className="underline" href={`https://www.canva.com/design/${r.id}/edit`} target="_blank" rel="noreferrer">{canvaSyncLabel(r.id)}</a></td>
              <td className="p-2 whitespace-nowrap">{when(r.canvaEditedAt)}</td>
              <td className="p-2 whitespace-nowrap">{when(r.siteSavedAt)}{r.savedBy === "original" ? " (original)" : ""}</td>
              <td className="p-2">{STATUS[r.status]}{r.error ? <span className="block text-destructive">Last problem: {r.error.slice(0, 120)}</span> : null}</td>
            </tr>)}
            {rows.length === 0 && <tr><td colSpan={4} className="p-3 text-muted-foreground">Nothing in this list.</td></tr>}</tbody>
          </table>
        </div>
      </>}
    </details>
  );
}
