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
