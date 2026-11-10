import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { NEXT_EXAMPLE_AREAS } from "@/lib/next-visual-examples";

type Row = { id: string; event_id: string; thumb_path: string | null; path: string; sign_kind: string | null; room: string | null; guide_status: string | null; marketing_ok: boolean };

/** NEXT guide photo shortlist: approve for the guide, and clear rights for marketing. Both are needed to go public. */
export function GuidePhotoQueue() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["guide-photo-queue"], queryFn: async () => {
    const { data, error } = await supabase.from("event_photos").select("id,event_id,thumb_path,path,sign_kind,room,guide_status,marketing_ok").not("guide_status", "is", null).order("sign_kind");
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    const paths = rows.map((r) => r.thumb_path ?? r.path);
    const urls: Record<string, string> = {};
    if (paths.length) { const { data: s } = await supabase.storage.from("event-photos").createSignedUrls(paths, 3600); for (const x of s ?? []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; }
    return rows.map((r) => ({ ...r, url: urls[r.thumb_path ?? r.path] }));
  } });
  const update = useMutation({
    mutationFn: async (v: { id: string; patch: Partial<Pick<Row, "guide_status" | "marketing_ok">> }) => { const { error } = await supabase.from("event_photos").update(v.patch).eq("id", v.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["guide-photo-queue"] }); qc.invalidateQueries({ queryKey: ["next-guide-photos"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const rows = q.data ?? [];
  const live = rows.filter((r) => r.guide_status === "approved" && r.marketing_ok).length;
  if (q.isLoading) return <p role="status" className="text-sm text-muted-foreground">Loading shortlist…</p>;
  if (q.isError) return <p role="alert" className="text-sm text-destructive">The shortlist could not load.</p>;
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{rows.length} shortlisted · {live} public in the NEXT guide. A photo appears publicly only when it is approved for the guide <strong>and</strong> cleared for marketing (you confirm the photo rights).</p>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {rows.map((r) => { const isLive = r.guide_status === "approved" && r.marketing_ok; return <figure key={r.id} className="min-w-0 border border-border">
        {r.url ? <img src={r.url} alt={NEXT_EXAMPLE_AREAS[r.sign_kind ?? ""] ?? "Event photo"} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] bg-muted" />}
        <figcaption className="space-y-2 p-2 text-xs">
          <p className="font-medium">{NEXT_EXAMPLE_AREAS[r.sign_kind ?? ""] ?? "Other"}{r.room ? ` · ${r.room}` : ""}</p>
          <p className={isLive ? "text-foreground" : "text-muted-foreground"}>{isLive ? "Public in guide" : r.guide_status === "approved" ? "Approved · rights not cleared" : r.marketing_ok ? "Rights cleared · not approved" : "Proposed"}</p>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant={r.guide_status === "approved" ? "outline" : "default"} disabled={update.isPending} onClick={() => update.mutate({ id: r.id, patch: { guide_status: r.guide_status === "approved" ? "proposed" : "approved" } })}>{r.guide_status === "approved" ? "Unapprove" : "Approve"}</Button>
            <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, patch: { marketing_ok: !r.marketing_ok } })}>{r.marketing_ok ? "Revoke rights" : "Rights cleared"}</Button>
            <Button size="sm" variant="ghost" disabled={update.isPending} onClick={() => update.mutate({ id: r.id, patch: { guide_status: null } })}>Remove</Button>
          </div>
        </figcaption>
      </figure>; })}
    </div>
  </div>;
}
