// "Export proposal" control: one button, two formats (PDF / PPTX).
//
// Multi-page masters render one page at a time on screen, so the export mounts
// the WHOLE document in an offscreen host (same renderer, same width) and
// captures every `[data-print-page]` node from there. That keeps the editor
// preview untouched while still exporting the full document.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileDown, FileText, Presentation } from "lucide-react";
import { toast } from "sonner";
import type { PrintMode, PrintPageSize } from "@/lib/print-assets.types";

type Fmt = "pdf" | "pptx";

export function ExportProposalButton({
  title,
  mode = "light",
  pageSize = "Letter",
  /** Full-document render used for the offscreen capture host. */
  document: docNode,
  label = "Export proposal",
}: {
  title: string;
  mode?: PrintMode;
  pageSize?: PrintPageSize;
  document: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Fmt | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Fmt | null>(null);

  const safe = (title || "proposal").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();

  // Once the offscreen document has mounted, capture and write the file.
  useEffect(() => {
    const fmt = pending;
    if (!fmt || runRef.current === fmt) return;
    runRef.current = fmt;
    let cancelled = false;
    (async () => {
      // Two frames: let layout + container queries settle before capture.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      const host = hostRef.current;
      const nodes = host
        ? Array.from(host.querySelectorAll<HTMLElement>("[data-print-page]"))
        : [];
      try {
        if (nodes.length === 0) throw new Error("No pages to export");
        if (fmt === "pdf") {
          const { exportPrintAssetAsPdf } = await import("@/lib/print-asset-export");
          await exportPrintAssetAsPdf(nodes, {
            pageSize,
            mode,
            format: "digital",
            filename: `${safe}.pdf`,
          });
        } else {
          const { exportPrintPagesAsPptx } = await import("@/lib/print-pptx-export");
          await exportPrintPagesAsPptx(nodes, {
            pageSize,
            mode,
            title,
            filename: `${safe}.pptx`,
          });
        }
        toast.success(`Exported ${nodes.length} page${nodes.length === 1 ? "" : "s"} as ${fmt.toUpperCase()}`);
      } catch (err) {
        console.error("Proposal export failed", err);
        toast.error(`Export failed: ${(err as Error).message}`);
      } finally {
        if (!cancelled) {
          runRef.current = null;
          setPending(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pending, mode, pageSize, safe, title]);

  function start(fmt: Fmt) {
    setOpen(false);
    setPending(fmt);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!!pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-40"
      >
        <FileDown size={13} aria-hidden />
        {pending ? `Exporting ${pending.toUpperCase()}…` : label}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-xl">
          <button
            type="button"
            onClick={() => start("pdf")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#03002C] hover:bg-[#E0E8F5]"
          >
            <FileText size={13} aria-hidden /> PDF document
          </button>
          <button
            type="button"
            onClick={() => start("pptx")}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#03002C] hover:bg-[#E0E8F5]"
          >
            <Presentation size={13} aria-hidden /> PowerPoint (.pptx)
          </button>
        </div>
      )}

      {/* Offscreen capture host — full document at print width, never visible. */}
      {pending && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: "1100px",
            pointerEvents: "none",
            opacity: 1,
          }}
        >
          <div ref={hostRef}>{docNode}</div>
        </div>
      )}
    </div>
  );
}
