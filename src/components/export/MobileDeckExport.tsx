/**
 * MOBILE DECK EXPORT — get a phone-built deck off the phone.
 *
 * The desktop export panel assumes a Downloads folder and a print dialog, and
 * neither is usable on a phone: iOS Safari's print sheet cannot save a
 * deck-sized PDF reliably, and a downloaded .pptx is hard to find again. This
 * bar builds the real files in the browser and hands them to the OS share
 * sheet (`navigator.share` with files), so the deck can go straight into mail,
 * Slack, Teams, or AirDrop from the device that built it. When file sharing is
 * unavailable the same blob falls back to a plain download.
 *
 * Both formats come from the same engines as desktop — `exportDeckToPptx` for
 * PowerPoint and the on-page slide nodes for the PDF — so what leaves the
 * phone is the same deliverable, at the slide's own aspect ratio.
 */
import { useState } from "react";
import { FileDown, Loader2, Share2 } from "lucide-react";
import type { Deck } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";

/** Attribute the export page stamps on each rendered slide frame. */
export const MOBILE_EXPORT_SLIDE_ATTR = "data-mobile-export-slide";

function safeName(title: string): string {
  return (title || "deck").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "") || "deck";
}

/** Share a generated file through the OS sheet, or download it if that fails. */
async function deliverFile(blob: Blob, fileName: string, mime: string): Promise<"shared" | "saved"> {
  const file = new File([blob], fileName, { type: mime });
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
  };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName });
      return "shared";
    } catch (err) {
      // A user-cancelled sheet is not a failure — re-throw so the caller stays quiet.
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      // Anything else (unsupported payload, policy) falls through to a download.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "saved";
}

export type MobileDeckExportProps = {
  deck: Deck;
  brand: BrandMode;
  /** True when QA blocks the export; the bar explains instead of exporting. */
  blocked?: boolean;
  onBlocked?: (what: string) => void;
  className?: string;
};

export function MobileDeckExport({
  deck,
  brand,
  blocked,
  onBlocked,
  className,
}: MobileDeckExportProps) {
  const [busy, setBusy] = useState<null | "pdf" | "pptx">(null);

  async function run(kind: "pdf" | "pptx", force = false) {
    if (busy) return;
    if (blocked && !force) {
      const label = kind === "pdf" ? "PDF export" : "PowerPoint export";
      onBlocked?.(label);
      const { toast } = await import("sonner");
      toast.warning(`${label} is on hold — resolve the blocking QA issues first.`, {
        action: { label: "Export anyway", onClick: () => void run(kind, true) },
      });
      return;
    }
    setBusy(kind);

    const { toast } = await import("sonner");
    const id = toast.loading(kind === "pdf" ? "Building the PDF…" : "Building the PowerPoint…", {
      description: `${deck.slides.length} slide${deck.slides.length === 1 ? "" : "s"} — stay on this screen.`,
    });
    try {
      let blob: Blob;
      let fileName: string;
      let mime: string;
      if (kind === "pptx") {
        const { exportDeckToPptx } = await import("@/lib/pptx-export");
        const res = await exportDeckToPptx(deck, brand, { output: "blob" });
        if (!res.blob) throw new Error("Export produced no file");
        blob = res.blob;
        fileName = `${safeName(deck.title)}.pptx`;
        mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      } else {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>(`[${MOBILE_EXPORT_SLIDE_ATTR}]`),
        );
        if (nodes.length === 0) throw new Error("Slides are still rendering — try again in a moment");
        const { exportSlidesAsImagePdf } = await import("@/lib/slide-image-export");
        const out = await exportSlidesAsImagePdf(
          nodes.map((node, i) => ({ node, mode: (deck.slides[i]?.mode ?? "light") as "light" | "dark" })),
          {
            returnBlob: true,
            onProgress: (p) =>
              toast.loading("Building the PDF…", { id, description: p.message ?? p.stage }),
          },
        );
        if (!out) throw new Error("PDF export produced no file");
        blob = out;
        fileName = `${safeName(deck.title)}.pdf`;
        mime = "application/pdf";
      }
      const how = await deliverFile(blob, fileName, mime);
      toast.success(how === "shared" ? `${fileName} ready to send` : `${fileName} saved`, {
        id,
        description:
          how === "shared"
            ? "Pick mail, chat or AirDrop in the share sheet."
            : "Find it in your device's downloads and attach it from there.",
        duration: 8000,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.dismiss(id);
        return;
      }
      const { describeExportError } = await import("@/lib/export-feedback");
      toast.error(kind === "pdf" ? "PDF export failed" : "PowerPoint export failed", {
        id,
        description: describeExportError(err),
        duration: 14000,
      });
      console.error(`[mobile-deck-export] ${kind} failed:`, err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className={`rounded-2xl border border-black/10 bg-white p-4 shadow-sm lg:hidden ${className ?? ""}`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
        Send from this device
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-black/60">
        Build the file here, then email, message or AirDrop it straight from the share sheet.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void run("pdf")}
          disabled={busy !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#003FC7] px-4 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
          {busy === "pdf" ? "Building…" : "Share PDF"}
        </button>
        <button
          type="button"
          onClick={() => void run("pptx")}
          disabled={busy !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-4 text-[13px] font-semibold text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-60"
        >
          {busy === "pptx" ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
          {busy === "pptx" ? "Building…" : "Share .pptx"}
        </button>
      </div>
    </section>
  );
}
