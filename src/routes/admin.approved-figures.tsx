// /admin/approved-figures — brand leads list, add, edit, approve and retire
// the standard sourced figures that may pass the figure checks. The database
// trigger stamps the approver, refuses approval without a source and refuses
// anyone who is not an admin or brand lead.

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button, Input, Textarea } from "@/design-system/element";
import { BRAND_MODES } from "@/lib/taxonomy";
import { loadApprovedFigures, figureApproved, type ApprovedFigure } from "@/lib/approved-figures";
import { loadStoredAssets } from "@/lib/stored-assets-scan";
import { lintContent } from "@/lib/compliance-check";

const search = z.object({ figure: z.string().optional(), claim: z.string().optional() });

export const Route = createFileRoute("/admin/approved-figures")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Approved figures · Admin · TransPerfect Element" },
      { name: "description", content: "Standard TransPerfect figures with an approved source, used by every figure check and the deck generator." },
      { property: "og:title", content: "Approved figures · Admin · TransPerfect Element" },
      { property: "og:description", content: "Sourced, brand-lead approved figures that pass the export checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Gate,
});

type Row = ApprovedFigure & {
  id: string;
  source_title: string | null;
  source_url: string | null;
  source_file: string | null;
  approved_at: string | null;
  note: string | null;
};

function Gate() {
  const [state, setState] = useState<"loading" | "ok" | "no">("loading");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setState("no");
      const [a, b] = await Promise.all([
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: data.user.id, _role: "brand_lead" }),
      ]);
      setState(a.data || b.data ? "ok" : "no");
    })();
  }, []);
  if (state === "loading") return null;
  if (state === "no") return <main className="mx-auto max-w-3xl px-6 py-10 text-[14px]">Approved figures are managed by brand leads and admins.</main>;
  return <ApprovedFigures />;
}

const EMPTY = { id: "", figure: "", claim: "", source_title: "", source_url: "", source_file: "", division_id: "", valid_until: "", note: "" };

function ApprovedFigures() {
  const qc = useQueryClient();
  const params = Route.useSearch();
  const list = useQuery({
    queryKey: ["approved-figures-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("approved_figures").select("*").order("status").order("figure");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const usage = useQuery({
    queryKey: ["approved-figures-usage", list.data?.length],
    enabled: !!list.data,
    staleTime: 60_000,
    queryFn: async () => {
      const assets = await loadStoredAssets(supabase);
      const counts: Record<string, { decks: number; prints: number }> = {};
      for (const f of list.data ?? []) {
        // Count where this entry would cover a figure, as if approved.
        const probe = [{ ...f, status: "approved", valid_until: null }];
        const c = { decks: 0, prints: 0 };
        for (const a of assets) {
          if (a.surface === "Social kit") continue;
          if (f.division_id && f.division_id !== a.division) continue;
          const hits = lintContent(a.content, [], "", { approved: [], division: a.division }).filter((h) => h.kind === "needs-source");
          const after = lintContent(a.content, [], "", { approved: probe, division: a.division }).filter((h) => h.kind === "needs-source");
          if (after.length < hits.length) a.surface === "Deck" ? c.decks++ : c.prints++;
        }
        counts[f.id] = c;
      }
      return counts;
    },
  });
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (params.figure) setForm({ ...EMPTY, figure: params.figure, claim: params.claim ?? params.figure });
  }, [params.figure, params.claim]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["approved-figures-admin"] });
    void loadApprovedFigures(supabase, true);
  };

  async function save(status?: Row["status"]) {
    if (!form.figure.trim() || !form.claim.trim()) return toast.error("Add the figure and the full claim.");
    setSaving(true);
    const row = {
      figure: form.figure.trim(),
      claim: form.claim.trim(),
      source_title: form.source_title.trim() || null,
      source_url: form.source_url.trim() || null,
      source_file: form.source_file.trim() || null,
      division_id: form.division_id || null,
      valid_until: form.valid_until || null,
      note: form.note.trim() || null,
      ...(status ? { status } : {}),
    };
    const res = form.id
      ? await supabase.from("approved_figures").update(row).eq("id", form.id)
      : await supabase.from("approved_figures").insert(row);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(status === "approved" ? "Figure approved." : "Saved.");
    setForm({ ...EMPTY });
    refresh();
  }

  async function setStatus(r: Row, status: Row["status"]) {
    const { error } = await supabase.from("approved_figures").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved." : status === "retired" ? "Retired." : "Moved back to draft.");
    refresh();
  }

  const ids = { figure: useId(), claim: useId(), st: useId(), su: useId(), sf: useId(), div: useId(), until: useId(), note: useId() };
  const divisions = useMemo(() => BRAND_MODES.map((b) => ({ id: b.id, name: b.name })), []);
  const valid = (r: Row) => figureApproved(r.figure, r.claim, r.claim.indexOf(r.figure), { approved: [r], division: r.division_id });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-foreground">
      <h1 className="text-2xl font-semibold">Approved figures</h1>
      <p className="mt-1 max-w-3xl text-[14px] text-muted-foreground">
        Standard figures with a source. An approved, unexpired figure passes the export block, the live Checks tab and the deck generator — only when the
        claim's key word sits next to it ("200+ languages" passes, "200+ integrations" does not). Drafts and retired figures stay blocked.
      </p>

      <section aria-labelledby="form-h" className="mt-6 rounded-md border border-border p-4">
        <h2 id="form-h" className="text-[15px] font-semibold">{form.id ? "Edit figure" : "Add a figure"}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label htmlFor={ids.figure} className="text-[12px] font-medium">Figure<Input id={ids.figure} value={form.figure} onChange={(e) => setForm({ ...form, figure: e.target.value })} placeholder="200+" /></label>
          <label htmlFor={ids.claim} className="text-[12px] font-medium md:col-span-2">Full claim<Input id={ids.claim} value={form.claim} onChange={(e) => setForm({ ...form, claim: e.target.value })} placeholder="200+ languages" /></label>
          <label htmlFor={ids.st} className="text-[12px] font-medium">Source title<Input id={ids.st} value={form.source_title} onChange={(e) => setForm({ ...form, source_title: e.target.value })} /></label>
          <label htmlFor={ids.su} className="text-[12px] font-medium">Source link<Input id={ids.su} type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://" /></label>
          <label htmlFor={ids.sf} className="text-[12px] font-medium">or source file<Input id={ids.sf} value={form.source_file} onChange={(e) => setForm({ ...form, source_file: e.target.value })} placeholder="File name or storage path" /></label>
          <label htmlFor={ids.div} className="text-[12px] font-medium">Division
            <select id={ids.div} value={form.division_id} onChange={(e) => setForm({ ...form, division_id: e.target.value })} className="mt-0 block h-9 w-full rounded-md border border-input bg-background px-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Every division</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label htmlFor={ids.until} className="text-[12px] font-medium">Valid until (optional)<Input id={ids.until} type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></label>
          <label htmlFor={ids.note} className="text-[12px] font-medium">Note<Textarea id={ids.note} rows={1} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={saving} onClick={() => save()}>Save as {form.id ? "is" : "draft"}</Button>
          <Button size="sm" disabled={saving} onClick={() => save("approved")}>Save and approve</Button>
          {form.id && <Button size="sm" variant="ghost" onClick={() => setForm({ ...EMPTY })}>Cancel</Button>}
        </div>
      </section>

      {list.error && <p className="mt-6 text-[14px] text-destructive">{(list.error as Error).message}</p>}
      <table className="mt-6 w-full text-left text-[13px]">
        <thead className="border-b border-border text-[12px] text-muted-foreground">
          <tr>
            <th scope="col" className="py-2 pr-3">Claim</th>
            <th scope="col" className="pr-3">Source</th>
            <th scope="col" className="pr-3">Division</th>
            <th scope="col" className="pr-3">Status</th>
            <th scope="col" className="pr-3">Used in</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {(list.data ?? []).map((r) => {
            const u = usage.data?.[r.id];
            const expired = r.valid_until && !valid({ ...r, status: "approved" }) ? " (expired)" : "";
            return (
              <tr key={r.id} className="border-b border-border/50 align-top">
                <td className="py-2 pr-3 font-medium">{r.claim}<div className="text-[11px] font-normal text-muted-foreground">Figure {r.figure}{r.valid_until ? ` · until ${r.valid_until}` : ""}</div></td>
                <td className="py-2 pr-3">
                  {r.source_title || r.source_url || r.source_file ? (
                    <>
                      {r.source_url ? <a href={r.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{r.source_title || r.source_url}</a> : r.source_title}
                      {r.source_file && <div className="text-[11px] text-muted-foreground">{r.source_file}</div>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">No source yet</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{r.division_id ? divisions.find((d) => d.id === r.division_id)?.name ?? r.division_id : "Every division"}</td>
                <td className="py-2 pr-3 capitalize">{r.status}{expired}</td>
                <td className="py-2 pr-3 text-muted-foreground">{u ? `${u.decks} decks · ${u.prints} print` : "…"}</td>
                <td className="py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setForm({ id: r.id, figure: r.figure, claim: r.claim, source_title: r.source_title ?? "", source_url: r.source_url ?? "", source_file: r.source_file ?? "", division_id: r.division_id ?? "", valid_until: r.valid_until ?? "", note: r.note ?? "" })}>Edit</Button>
                    {r.status !== "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(r, "approved")}>Approve</Button>}
                    {r.status !== "retired" && <Button size="sm" variant="ghost" onClick={() => setStatus(r, "retired")}>Retire</Button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
