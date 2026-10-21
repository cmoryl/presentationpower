import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/design-system/element";

const TITLE = "TransPerfect NEXT — vendor files";
const DESC = "Supplied TransPerfect NEXT live files and brief for a print or production vendor.";

export const Route = createFileRoute("/vendor/$token")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VendorPage,
});

type Pack = {
  status: string;
  job_name?: string;
  vendor_name?: string;
  contact?: string | null;
  deadline?: string | null;
  notes?: string | null;
  files?: { label: string; url: string; kind: string }[];
  pack_version?: string | null;
  expires_at?: string;
};

function VendorPage() {
  const { token } = Route.useParams();
  const [pack, setPack] = useState<Pack | null>(null);
  useEffect(() => {
    supabase.rpc("get_vendor_handoff", { _token: token }).then(({ data, error }) => setPack(error ? { status: "invalid" } : ((data as Pack) ?? { status: "invalid" })));
  }, [token]);

  if (!pack) return <p className="p-10 text-sm text-muted-foreground">Checking link…</p>;
  if (pack.status !== "valid")
    return (
      <main className="mx-auto max-w-lg p-10">
        <h1 className="text-xl font-semibold">This link isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pack.status === "expired" ? "It has expired." : pack.status === "revoked" ? "It was switched off." : "It isn't a valid link."} Ask your TransPerfect contact for a new one.
        </p>
      </main>
    );

  const log = (label: string) => {
    void supabase.rpc("record_vendor_download", { _token: token, _label: label }).then(() => undefined);
  };

  async function brief() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 60;
    const line = (t: string, size = 10, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal").setFontSize(size);
      for (const l of doc.splitTextToSize(t, 480) as string[]) {
        if (y > 790) { doc.addPage(); y = 60; }
        doc.text(l, 56, y);
        y += size * 1.45;
      }
    };
    line("TransPerfect NEXT — vendor brief", 18, true);
    y += 6;
    line(`Job: ${pack!.job_name}`, 11, true);
    line(`Vendor: ${pack!.vendor_name}`);
    if (pack!.deadline) line(`Deadline: ${pack!.deadline}`);
    if (pack!.contact) line(`TransPerfect contact: ${pack!.contact}`);
    line(`Designer pack v${pack!.pack_version ?? "?"} · link valid until ${new Date(pack!.expires_at!).toLocaleDateString()}`);
    y += 8;
    if (pack!.notes) { line("Brief", 12, true); line(pack!.notes); y += 8; }
    line("Colour", 12, true);
    line("Files are supplied in RGB. Use only the CMYK builds marked approved; anything marked proof first needs a signed printed proof before the run. Body text prints 100K. Do not convert colour silently.");
    y += 8;
    line("Files (click to download)", 12, true);
    for (const f of pack!.files ?? []) {
      if (y > 790) { doc.addPage(); y = 60; }
      doc.setTextColor(0, 63, 199);
      doc.textWithLink(f.label, 56, y, { url: f.url });
      doc.setTextColor(0, 0, 0);
      y += 15;
    }
    y += 8;
    line("Supplied files are the originals, unchanged. Send proofs back to your TransPerfect contact for approval before printing.", 9);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(doc.output("blob"));
    a.download = `NEXT-vendor-brief-${(pack!.job_name ?? "job").replace(/[^\w-]+/g, "-")}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    log("brief");
  }

  const groups = ["master", "logo", "font", "colour"].map((k) => ({ k, items: (pack.files ?? []).filter((f) => f.kind === k) })).filter((g) => g.items.length);
  const names: Record<string, string> = { master: "Supplied live files", logo: "Logos", font: "Fonts", colour: "Colour" };

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">TransPerfect NEXT · vendor files</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight">{pack.job_name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For {pack.vendor_name}
        {pack.deadline ? ` · due ${pack.deadline}` : ""}
        {pack.contact ? ` · contact ${pack.contact}` : ""} · link works until {new Date(pack.expires_at!).toLocaleDateString()}
      </p>
      {pack.notes ? <p className="mt-4 whitespace-pre-wrap rounded-lg border border-border p-4 text-sm">{pack.notes}</p> : null}
      <div className="mt-4">
        <Button variant="outline" onClick={brief}>
          <FileText className="size-4" aria-hidden /> Download brief (PDF)
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        These are the original files, unchanged. Files are RGB: use only CMYK builds marked approved, and send a proof back before printing.
      </p>
      {groups.map((g) => (
        <section key={g.k} className="mt-8">
          <h2 className="text-lg font-semibold">{names[g.k]}</h2>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {g.items.map((f) => (
              <li key={f.url + f.label} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span>{f.label}</span>
                <a href={f.url} download onClick={() => log(f.label)} className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline">
                  <Download className="size-4" aria-hidden /> Download
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
