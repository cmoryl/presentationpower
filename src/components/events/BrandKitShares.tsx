// Partner share links for the NEXT brand kit (admins / brand leads; RLS enforces).
import { useEffect, useState } from "react";
import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button, Input } from "@/design-system/element";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";

type Share = { id: string; token: string; label: string; expires_at: string; revoked: boolean };

function newToken() {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function BrandKitShares() {
  const [rows, setRows] = useState<Share[] | null>(null);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(30);

  async function load() {
    const { data, error } = await supabase
      .from("next_brand_kit_shares")
      .select("id, token, label, expires_at, revoked")
      .order("created_at", { ascending: false });
    setRows(error ? [] : (data as Share[]));
  }
  useEffect(() => {
    load();
  }, []);

  const url = (t: string) => `${NEXT_APP_ORIGIN}/share/next-brand-kit/${t}`;

  async function create() {
    const expires = new Date(Date.now() + Math.max(1, Math.min(days, 365)) * 864e5).toISOString();
    const token = newToken();
    const { error } = await supabase.from("next_brand_kit_shares").insert({ token, label: label.trim(), expires_at: expires });
    if (error) return toast.error("Only admins and brand leads can create partner links.");
    await navigator.clipboard.writeText(url(token)).catch(() => {});
    toast.success("Partner link created and copied.");
    setLabel("");
    load();
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("next_brand_kit_shares").update({ revoked: true }).eq("id", id);
    if (error) return toast.error("Couldn't switch the link off.");
    load();
  }

  return (
    <section aria-labelledby="share-h" className="mt-12 border-t border-border pt-8">
      <h2 id="share-h" className="text-xl font-semibold">Partner links</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A read-only link for agencies and printers. No sign-in, no editors, and it stops working on the date you set.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs font-medium">
          Who it's for
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Print vendor" className="w-56" />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Days valid
          <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" />
        </label>
        <Button onClick={create}><Link2 className="size-4" aria-hidden /> Create link</Button>
      </div>
      <ul className="mt-4 divide-y divide-border text-sm">
        {(rows ?? []).map((r) => {
          const dead = r.revoked || new Date(r.expires_at) < new Date();
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-medium">{r.label || "Untitled"}</span>
              <span className="text-xs text-muted-foreground">
                {r.revoked ? "Switched off" : dead ? "Expired" : `Until ${new Date(r.expires_at).toLocaleDateString()}`}
              </span>
              {!dead ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(url(r.token)).then(() => toast.success("Copied"))}>
                    <Copy className="size-3.5" aria-hidden /> Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => revoke(r.id)}>Switch off</Button>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
