// One-click PNG / PDF download for a single social card in the adaptor.
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { assetFileSlug, downloadAssetBlob, exportAssetImage, exportAssetsPdf } from "@/lib/asset-export";

export type SocialCardDownloadProps = {
  width: number;
  height: number;
  name: string;
  children: ReactNode;
};

export function SocialCardDownload({ width, height, name, children }: SocialCardDownloadProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | null>(null);
  const run = async (kind: "png" | "pdf") => {
    const node = wrap.current?.querySelector<HTMLElement>("[data-kit-asset-frame]");
    if (!node) {
      toast.error("This card isn't ready to download yet.");
      return;
    }
    setBusy(kind);
    try {
      const target = { node, width, height, label: name };
      const blob = kind === "png" ? await exportAssetImage(target, { format: "png" }) : await exportAssetsPdf([target]);
      downloadAssetBlob(blob, `${assetFileSlug(name, "social-card")}.${kind}`);
    } catch (e) {
      toast.error(`Download failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  };
  const btn =
    "inline-flex h-11 min-w-11 items-center justify-center rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 text-[12px] font-semibold text-[#03002C] hover:border-[#003FC7] focus-visible:outline-2 focus-visible:outline-[#003FC7] disabled:opacity-60";
  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={wrap}>{children}</div>
      <div className="flex gap-2" role="group" aria-label={`Download ${name}`}>
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("png")} aria-label={`Download ${name} as PNG`}>
          {busy === "png" ? "Saving…" : "Download PNG"}
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("pdf")} aria-label={`Download ${name} as PDF`}>
          {busy === "pdf" ? "Saving…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}
