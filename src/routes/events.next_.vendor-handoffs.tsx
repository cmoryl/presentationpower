import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Badge, Button } from "@/design-system/element";

const TITLE = "NEXT vendor links — TransPerfect Element";
const DESC = "Every set of NEXT live files sent to an outside vendor: who, when, downloads, and switch-off.";

export const Route = createFileRoute("/events/next_/vendor-handoffs")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorHandoffs,
});

type Row = {
  id: string;
  token: string;
  job_name: string;
  vendor_name: string;
  vendor_email: string | null;
  files: unknown;
  expires_at: string;
  revoked: boolean;
  download_count: number;
  last_downloaded_at: string | null;
  created_at: string;
};

function VendorHandoffs() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const load = async () => {
    const { data, error } = await supabase.from("vendor_handoffs").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => {
    void load();
  }, []);

  async function revoke(id: string) {
    const { error } = await supabase.from("vendor_handoffs").update({ revoked: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Link switched off.");
    void load();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Vendor links</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Live files sent outside the system. Create new ones with "Send to vendor" on the NEXT brand kit.
        </p>
        {!rows ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : !rows.length ? (
          <p className="mt-6 text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((r) => {
              const live = !r.revoked && new Date(r.expires_at) > new Date();
              const url = `${window.location.origin}/vendor/${r.token}`;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <p className="font-semibold">{r.job_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.vendor_name}
                      {r.vendor_email ? ` · ${r.vendor_email}` : ""} · {Array.isArray(r.files) ? r.files.length : 0} files · sent {new Date(r.created_at).toLocaleDateString()} · {r.download_count} downloads
                      {r.last_downloaded_at ? ` (last ${new Date(r.last_downloaded_at).toLocaleDateString()})` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={live ? "default" : "outline"}>{r.revoked ? "Switched off" : live ? `Live until ${new Date(r.expires_at).toLocaleDateString()}` : "Expired"}</Badge>
                    {live ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(url); toast.success("Copied."); }}>Copy link</Button>
                        <Button size="sm" variant="outline" onClick={() => revoke(r.id)}>Switch off</Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
