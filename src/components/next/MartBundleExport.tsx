// NEXT MART — press bundle export panel.
//
// Builds the layered PDF/X-4 + Illustrator package for every mart signage set
// at its own measured footprint, with the print spec sheet the printer works
// to, and hands back one zip.

import { useState } from "react";
import { Download, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  exportMartBundle,
  type MartExportEntry,
  type MartExportProgress,
} from "@/lib/next-mart-export";
import {
  NEXT_MART_ARTWORK,
  NEXT_MART_FLAT_SIGNS,
  NEXT_MART_LOGOS,
  NEXT_MART_PILLARS,
} from "@/lib/next-mart";
import type { MartStop } from "@/lib/next-mart-stops";

export function MartBundleExport({ stop }: { stop?: MartStop }) {
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<MartExportEntry[] | null>(null);

  async function run() {
    setBusy(true);
    const id = toast.loading("Building the NEXT MART press bundle…");
    try {
      const res = await exportMartBundle({
        stop,
        onProgress: (p: MartExportProgress) =>
          toast.loading(`${p.label} (${p.index}/${p.total})`, { id }),
      });
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setEntries(res.entries);
      toast.success(`Bundle ready · ${res.entries.length} sets · ${res.totalPanels} panels`, {
        id,
        description: res.filename,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bundle export failed.", { id });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#03002C]">
            <PackageCheck size={17} /> Production bundle · PDF/X-4 + Illustrator
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-black/60">
            One zip for the whole mart. Every pillar set is built from the layered vector pipeline at
            its own measured footprint — entrance tower, till, wayfinding and logo column — as a
            PDF/X-4 press file with an Illustrator-openable <code>.ai</code> twin and an editable
            vector gradient ground. The supplied die-cut artwork ships as its layered Illustrator
            master, flat signage as measured print specs, plus the approved logo pack, a production manifest and a read-me.
          </p>
        </div>
        <Button size="lg" onClick={run} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {busy ? "Building…" : "Download all"}
        </Button>
      </div>

      <ul className="mt-4 grid gap-2 text-[11px] text-black/60 sm:grid-cols-3">
        <li>{NEXT_MART_PILLARS.length} pillar sets · layered vector press files</li>
        <li>{NEXT_MART_ARTWORK.length} die-cut artwork masters · cut contour preserved</li>
        <li>{NEXT_MART_FLAT_SIGNS.length} flat signage sets · measured trim + bleed</li>
        <li>{NEXT_MART_LOGOS.length} approved lockups · EPS + SVG + PNG</li>
        <li>Production manifest + read-me · one zipped folder</li>
      </ul>

      {entries ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="text-black/50">
              <tr>
                <th className="py-1.5 pr-4 font-medium">Set</th>
                <th className="py-1.5 pr-4 font-medium">Type</th>
                <th className="py-1.5 pr-4 font-medium">Print spec</th>
                <th className="py-1.5 pr-4 font-medium">Qty</th>
                <th className="py-1.5 pr-4 font-medium">Artwork</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-black/5">
                  <td className="py-1.5 pr-4 font-medium text-[#03002C]">{e.name}</td>
                  <td className="py-1.5 pr-4">{e.kind}</td>
                  <td className="py-1.5 pr-4 text-black/60">{e.spec}</td>
                  <td className="py-1.5 pr-4">{e.quantity}</td>
                  <td className="py-1.5 pr-4">
                    {e.vector
                      ? `vector · ${Math.max(1, Math.round(e.bytes / 1024))} KB`
                      : "spec only"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
