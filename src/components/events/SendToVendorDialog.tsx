// "Send to vendor" — the team picks supplied live files and creates an
// expiring, revocable vendor link. Files are linked byte-for-byte as supplied.
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Input, Textarea } from "@/design-system/element";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NEXT_DIVISIONS, type KitFamily } from "@/lib/next-brand-kit";
import { DESIGNER_PACK_VERSION, logoFormats } from "@/lib/next-designer-pack";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";

export type VendorFile = { label: string; url: string; kind: string };

const abs = (u: string) => (/^https?:/i.test(u) ? u : `${NEXT_APP_ORIGIN}${u}`);

export function SendToVendorDialog({ families }: { families: KitFamily[] }) {
  const [open, setOpen] = useState(false);
  const [division, setDivision] = useState(NEXT_DIVISIONS[0].id);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [extras, setExtras] = useState({ logos: true, fonts: true, colour: true });
  const [form, setForm] = useState({ job: "", vendor: "", email: "", contact: "", deadline: "", notes: "", days: "14" });
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const masters = useMemo(
    () =>
      families.flatMap((f) =>
        f.templates
          .filter((t) => t.downloadUrl && norm(t.divisionId) === norm(division))
          .map((t) => ({ key: `${f.id}:${t.code}:${t.format}`, label: `${f.label} — ${t.format} (${t.size})`, url: t.downloadUrl! })),
      ),
    [families, division],
  );

  function files(): VendorFile[] {
    const out: VendorFile[] = masters.filter((m) => picked.has(m.key)).map((m) => ({ label: m.label, url: abs(m.url), kind: "master" }));
    const d = NEXT_DIVISIONS.find((x) => x.id === division)!;
    if (extras.logos)
      for (const l of d.lockups) {
        const f = logoFormats(l.src);
        for (const k of ["eps", "svg", "png"] as const) out.push({ label: `${d.name} ${l.lockupLabel} ${l.variantLabel} (${k.toUpperCase()})`, url: abs(f[k]), kind: "logo" });
      }
    if (extras.fonts) for (const f of ["Geist-Regular.ttf", "Geist-Bold.ttf"]) out.push({ label: f, url: abs(`/fonts/${f}`), kind: "font" });
    if (extras.colour) out.push({ label: "NEXT colour palette (HEX, RGB, CMYK)", url: abs("/canva-master-reference/next-2026-color-palette.csv"), kind: "colour" });
    return out;
  }

  async function create() {
    const list = files();
    if (!form.job.trim() || !form.vendor.trim()) return toast.error("Add a job name and vendor.");
    if (!list.length) return toast.error("Pick at least one file.");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const days = Math.min(90, Math.max(1, Number(form.days) || 14));
    const { data, error } = await supabase
      .from("vendor_handoffs")
      .insert({
        job_name: form.job.trim(),
        vendor_name: form.vendor.trim(),
        vendor_email: form.email.trim() || null,
        contact: form.contact.trim() || null,
        deadline: form.deadline || null,
        notes: form.notes.trim() || null,
        files: list,
        pack_version: DESIGNER_PACK_VERSION,
        expires_at: new Date(Date.now() + days * 864e5).toISOString(),
        created_by: u.user?.id,
      })
      .select("token")
      .single();
    setBusy(false);
    if (error || !data) return toast.error(error?.message ?? "Couldn't create the link.");
    setLink(`${window.location.origin}/vendor/${data.token}`);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); setLink(null); }}>
        <Send className="size-4" aria-hidden />
        Send to vendor
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send live files to a vendor</DialogTitle>
            <DialogDescription>
              The vendor gets an expiring link to the supplied files, unchanged, plus a one-page brief. No sign-in needed. You can switch the link off any time.
            </DialogDescription>
          </DialogHeader>
          {link ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Link ready. Send it to {form.vendor}:</p>
              <div className="flex gap-2">
                <Input readOnly value={link} aria-label="Vendor link" />
                <Button onClick={() => { void navigator.clipboard.writeText(link); toast.success("Copied."); }}>
                  <Copy className="size-4" aria-hidden /> Copy
                </Button>
              </div>
              <Link to="/events/next/vendor-handoffs" className="text-sm underline">See all outgoing links</Link>
            </div>
          ) : (
            <div className="grid gap-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">Job name<Input value={form.job} onChange={set("job")} maxLength={160} /></label>
                <label className="grid gap-1">Vendor<Input value={form.vendor} onChange={set("vendor")} maxLength={160} /></label>
                <label className="grid gap-1">Vendor email<Input type="email" value={form.email} onChange={set("email")} /></label>
                <label className="grid gap-1">Our contact<Input value={form.contact} onChange={set("contact")} placeholder="Name, email or phone" /></label>
                <label className="grid gap-1">Deadline<Input type="date" value={form.deadline} onChange={set("deadline")} /></label>
                <label className="grid gap-1">Link works for (days)<Input type="number" min={1} max={90} value={form.days} onChange={set("days")} /></label>
              </div>
              <label className="grid gap-1">Brief: sizes, quantities, colour notes<Textarea rows={3} value={form.notes} onChange={set("notes")} maxLength={4000} /></label>
              <label className="grid gap-1">
                Division
                <select className="h-9 rounded-md border border-border bg-background px-2" value={division} onChange={(e) => { setDivision(e.target.value); setPicked(new Set()); }}>
                  {NEXT_DIVISIONS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <fieldset className="grid gap-1">
                <legend className="font-medium">Supplied live files ({masters.length})</legend>
                {masters.length === 0 ? <p className="text-muted-foreground">No supplied masters for this division yet.</p> : null}
                {masters.map((m) => (
                  <label key={m.key} className="flex items-center gap-2">
                    <input type="checkbox" checked={picked.has(m.key)} onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(m.key); else n.delete(m.key); setPicked(n); }} />
                    {m.label}
                  </label>
                ))}
              </fieldset>
              <fieldset className="flex flex-wrap gap-4">
                <legend className="font-medium">Also include</legend>
                {([["logos", "Logos (EPS, SVG, PNG)"], ["fonts", "Geist fonts"], ["colour", "Colour sheet"]] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={extras[k]} onChange={(e) => setExtras({ ...extras, [k]: e.target.checked })} />
                    {l}
                  </label>
                ))}
              </fieldset>
              <div><Button onClick={create} disabled={busy}>Create vendor link</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
