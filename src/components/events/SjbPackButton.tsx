import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/design-system/element";
import { buildSjbSequencePack, saveSjbBlob, type SjbPackPage } from "@/lib/sjb-sequence-pack";

export interface SjbPackButtonProps { kind: "zip" | "pdf"; pages: SjbPackPage[]; width: number; height: number; filename: string; label: string; className?: string }

/** Rebuilds the pack from the pictures currently shown, at click time. */
export function SjbPackButton({ kind, pages, width, height, filename, label, className }: SjbPackButtonProps) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { saveSjbBlob(await buildSjbSequencePack(kind, pages, width, height), filename); }
    catch (e) { toast.error(e instanceof Error ? e.message : "The download could not be built."); }
    finally { setBusy(false); }
  };
  return <Button type="button" variant="outline" size="sm" className={className} disabled={busy} onClick={() => void run()}>{busy ? <Loader2 className="animate-spin" /> : <Download />}{label}</Button>;
}
