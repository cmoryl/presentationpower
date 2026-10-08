import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { legalSignLayout, type LegalSign } from "@/lib/legal-next-signage";
import { kioskEditKey, type KioskEdits } from "@/lib/next-california-kiosk-live";

async function savedEdits(key: string): Promise<KioskEdits> {
  const { data } = await supabase.from("kiosk_layer_edits").select("edits").eq("booth_id", key).maybeSingle();
  return (data?.edits as KioskEdits) ?? {};
}

/** Whole demo booth set: one ZIP of print PDFs (every face, latest saved edits), and a resend of every booth's 3D artwork. */
export function DemoBoothSetActions({ signs }: { signs: LegalSign[] }) {
  const [busy, setBusy] = useState<null | "zip" | "sync">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function downloadAll() {
    setBusy("zip"); setMsg(null);
    try {
      const [{ default: JSZip }, { liveFrontPdf }] = await Promise.all([import("jszip"), import("@/lib/next-california-kiosk-live-export")]);
      const zip = new JSZip();
      let n = 0;
      for (const s of signs) {
        const dir = zip.folder(s.id)!;
        for (const f of s.faces) {
          const L = legalSignLayout(f.id);
          if (!L) continue;
          setMsg(`Building ${s.title} — ${f.label}…`);
          dir.file(`rdraft-${f.id}.pdf`, await liveFrontPdf(L, await savedEdits(kioskEditKey(L))));
          n++;
        }
      }
      zip.file("README.txt", "NEXT demo booth master set (draft, rdraft-). Print PDFs with 1/8 in bleed and crop marks, built from the latest saved edits of every face. RGB as designed; confirm with the printer before production.\n");
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "rdraft-next-demo-booths-master-set.zip"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setMsg(`Downloaded ${n} print files for ${signs.length} booths.`);
    } catch (e) { setMsg(`Download failed: ${e instanceof Error ? e.message : e}`); }
    finally { setBusy(null); }
  }

  async function syncAll() {
    setBusy("sync"); setMsg(null);
    try {
      const { publishSignArt } = await import("@/lib/booth-art-publish");
      const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
      let ok = 0; const failed: string[] = [];
      for (const s of signs) {
        const L = legalSignLayout(s.faces[0]!.id);
        setMsg(`Sending ${s.title} to 3D…`);
        try { if (L && (await publishSignArt(L, uid))) ok++; else failed.push(s.title); }
        catch (e) { failed.push(`${s.title} (${e instanceof Error ? e.message : e})`); }
      }
      setMsg(`Sent the latest artwork for ${ok} of ${signs.length} booths to 3D.${failed.length ? ` Not sent: ${failed.join(", ")}.` : ""}`);
    } finally { setBusy(null); }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={downloadAll} disabled={!!busy}><Download className="h-3.5 w-3.5" />{busy === "zip" ? "Building…" : "Download all (master set)"}</Button>
      <Button size="sm" variant="outline" onClick={syncAll} disabled={!!busy}><RefreshCw className="h-3.5 w-3.5" />{busy === "sync" ? "Sending…" : "Send latest to 3D"}</Button>
      {msg ? <p role="status" className="text-xs text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
