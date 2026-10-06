// Approvals → Booths in 3D: each booth's latest artwork sent to 3D and whether
// a reviewer has checked that exact artwork on the 3D booth.

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SF_EVENT } from "@/lib/event-booths";

type Row = { id: string; name: string; source: string; revision: string | null; checkedAt: string | null; note: string | null; snap: string | null };

export function Booth3dCheckQueue() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["booth-3d-queue"],
    queryFn: async (): Promise<Row[]> => {
      const [{ data: booths, error: e1 }, { data: art }, { data: checks }] = await Promise.all([
        supabase.from("event_booths").select("id, name, source_booth_id").eq("event", SF_EVENT).order("sort_order"),
        supabase.from("booth_art").select("booth_id, revision").eq("face", "front"),
        supabase.from("booth_3d_checks").select("booth_id, revision, note, snapshot_path, checked_at").order("checked_at", { ascending: false }),
      ]);
      if (e1) throw e1;
      const rows: Row[] = [];
      for (const b of booths ?? []) {
        const rev = art?.find((a) => a.booth_id === b.id)?.revision ?? null;
        const c = checks?.find((x) => x.booth_id === b.id && x.revision === rev) ?? null;
        let snap: string | null = null;
        if (c?.snapshot_path) snap = (await supabase.storage.from("booth-proofs").createSignedUrl(c.snapshot_path, 3600)).data?.signedUrl ?? null;
        rows.push({ id: b.id, name: b.name, source: b.source_booth_id, revision: rev, checkedAt: c?.checked_at ?? null, note: c?.note ?? null, snap });
      }
      return rows;
    },
  });
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading booths…</p>;
  if (error) return <p className="text-sm text-destructive">Couldn't load booths: {(error as Error).message}</p>;
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {(data ?? []).map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-4 p-4">
          {r.snap ? <img src={r.snap} alt={`${r.name} checked artwork`} className="h-16 w-auto rounded-sm border border-border" /> : <div className="h-16 w-8 rounded-sm bg-muted" aria-hidden />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              {!r.revision ? "No artwork sent to 3D yet" : r.checkedAt ? `Checked in 3D ${new Date(r.checkedAt).toLocaleString()}${r.note ? ` — ${r.note}` : ""}` : "Waiting for a 3D check"}
            </p>
          </div>
          <Link to="/events/next/booth/$boothId" params={{ boothId: `${r.source}-california` }} className="text-sm font-medium text-primary hover:underline">
            Open booth workspace
          </Link>
        </li>
      ))}
    </ul>
  );
}
