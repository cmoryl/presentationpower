// Sign template review — draft templates saved from the sign editors. Only
// admins and brand leads can approve (the database trigger enforces it).

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { KioskLiveThumb } from "@/components/events/KioskLayerEditor";
import { liveLayoutById } from "@/lib/next-california-kiosk-live";
import { canApproveTemplates, decideSignTemplate, listSignTemplates, type SignTemplateRow } from "@/lib/sign-set-data";
import { FIELD_LABEL, SIGN_KIND_LABEL } from "@/lib/sign-set";

const STATE: Record<SignTemplateRow["status"], string> = { draft: "Waiting for review", approved: "Approved", rejected: "Changes requested" };

export function SignTemplateQueue() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sign-templates"], queryFn: listSignTemplates });
  const [canDecide, setCanDecide] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { void canApproveTemplates().then(setCanDecide); }, []);
  const rows = q.data ?? [];
  const order = { draft: 0, rejected: 1, approved: 2 } as const;

  async function decide(t: SignTemplateRow, status: "approved" | "rejected") {
    const note = status === "rejected" ? prompt("What needs changing?") ?? undefined : undefined;
    if (status === "rejected" && note === undefined) return;
    setBusy(t.id);
    try { await decideSignTemplate(t.id, status, note); await qc.invalidateQueries({ queryKey: ["sign-templates"] }); toast.success(status === "approved" ? "Template approved" : "Changes requested"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "That didn't save."); }
    finally { setBusy(null); }
  }

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading templates…</p>;
  if (q.error) return <p className="text-sm text-destructive">Couldn't load templates: {(q.error as Error).message}</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No sign templates yet. Use “Save as template” in a sign or kiosk editor.</p>;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {[...rows].sort((a, b) => order[a.status] - order[b.status]).map((t) => {
        const L = liveLayoutById(t.layout_id);
        const linked = Object.values(t.fields).filter(Boolean);
        return (
          <li key={t.id} className="flex gap-4 rounded-lg border border-border bg-card p-4">
            {L ? <KioskLiveThumb layout={L} height={120} /> : null}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.name}</p>
              <p className="text-[13px] text-muted-foreground">{SIGN_KIND_LABEL[t.kind]} · {t.w_in} × {t.h_in} in · from {t.source_label ?? t.layout_id}</p>
              <p className="mt-1 text-[13px]">{linked.length ? `Fills: ${[...new Set(linked)].map((k) => FIELD_LABEL[k!]).join(", ")}` : "No lines filled from the event"}</p>
              <p className="mt-1 text-[13px] font-semibold">{STATE[t.status]}{t.review_note ? ` — ${t.review_note}` : ""}</p>
              {canDecide && t.status !== "approved" ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy === t.id} onClick={() => decide(t, "approved")} className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">Approve</button>
                  {t.status === "draft" ? <button type="button" disabled={busy === t.id} onClick={() => decide(t, "rejected")} className="rounded-md border border-border px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50">Request changes</button> : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
