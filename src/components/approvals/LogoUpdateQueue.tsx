import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decideLogoUpdate, listLogoUpdateChecks, runLogoScrubNow } from "@/lib/logo-scrub.functions";

export function LogoUpdateQueue() {
  const listFn = useServerFn(listLogoUpdateChecks);
  const runFn = useServerFn(runLogoScrubNow);
  const decideFn = useServerFn(decideLogoUpdate);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["logo-update-checks"], queryFn: () => listFn() });
  const run = useMutation({
    mutationFn: () => runFn(),
    onSuccess: (r) => { toast.success(`Checked ${r.checked} websites · ${r.flagged} changed · ${r.unreadable} couldn't be read`); qc.invalidateQueries({ queryKey: ["logo-update-checks"] }); },
    onError: (e) => toast.error(String((e as Error).message)),
  });
  const decide = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => decideFn({ data: v }),
    onSuccess: (_r, v) => { toast.success(v.approve ? "Logo replaced in LogoHub" : "Dismissed"); qc.invalidateQueries({ queryKey: ["logo-update-checks"] }); },
    onError: (e) => toast.error(String((e as Error).message)),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Every client website is checked about once a month (a small batch each day). Changed logos wait here; nothing is replaced until you approve.
        </p>
        <Button variant="outline" size="sm" onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "Checking…" : "Check next 15 now"}
        </Button>
      </div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : q.error ? (
        <p className="text-sm text-destructive">{String((q.error as Error).message)}</p>
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">No logo changes waiting for review.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {q.data.map((c) => (
            <li key={c.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{c.client_name}</h3>
                <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-xs underline">{c.website}</a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Before (website)", c.previous_logo_url], ["Now on website", c.found_logo_url]].map(([label, url]) => (
                  <figure key={label} className="space-y-1">
                    <div className="flex h-24 items-center justify-center rounded border bg-[repeating-conic-gradient(#0000000d_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2">
                      {url ? <img src={url} alt={`${c.client_name} ${label}`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => decide.mutate({ id: c.id, approve: true })} disabled={decide.isPending}>Replace logo</Button>
                <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: c.id, approve: false })} disabled={decide.isPending}>Dismiss</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
