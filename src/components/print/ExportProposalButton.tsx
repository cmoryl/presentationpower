// "Export proposal" control: one button, two formats (PDF / PPTX), with
// per-page selection.
//
// Multi-page masters render one page at a time on screen, so the export mounts
// the WHOLE document in an offscreen host (same renderer, same width) and
// captures every `[data-print-page]` node from there. That keeps the editor
// preview untouched while still exporting the full document.
//
// The same offscreen host is used, before any export, to enumerate the pages so
// the user can tick exactly which ones ship. Selection is by document order.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckSquare, FileDown, FileText, Presentation, Square } from "lucide-react";
import { toast } from "sonner";
import type { PrintMode, PrintPageSize } from "@/lib/print-assets.types";

type Fmt = "pdf" | "pptx";
type PageInfo = { index: number; label: string };

/** Human label for a page node: its kind, plus the first heading-ish text. */
function labelFor(node: HTMLElement, index: number): string {
  const kind = node.getAttribute("data-proposal-page") || node.getAttribute("data-page-kind");
  const text = (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 42);
  const pretty = kind ? kind.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  return `${index + 1}. ${pretty || text || "Page"}`;
}

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
  const [scanning, setScanning] = useState(false);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const hostRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<Fmt | null>(null);

  const safe = (title || "proposal").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  // The host must be mounted for either job: enumerating pages or exporting.
  const hostMounted = scanning || !!pending;

  const settle = useCallback(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    [],
  );

  // Enumerate pages when the menu opens for the first time.
  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    (async () => {
      await settle();
      if (cancelled) return;
      const nodes = hostRef.current
        ? Array.from(hostRef.current.querySelectorAll<HTMLElement>("[data-print-page]"))
        : [];
      const found = nodes.map((n, i) => ({ index: i, label: labelFor(n, i) }));
      setPages(found);
      setSelected(new Set(found.map((p) => p.index)));
      setScanning(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scanning, settle]);

  // Once the offscreen document has mounted, capture and write the file.
  useEffect(() => {
    const fmt = pending;
    if (!fmt || runRef.current === fmt) return;
    runRef.current = fmt;
    let cancelled = false;
    (async () => {
      await settle();
      if (cancelled) return;
      const host = hostRef.current;
      const all = host ? Array.from(host.querySelectorAll<HTMLElement>("[data-print-page]")) : [];
      // No selection recorded yet (menu never scanned) means "everything".
      const nodes = selected.size ? all.filter((_, i) => selected.has(i)) : all;
      try {
        if (nodes.length === 0) throw new Error("No pages selected");
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
        toast.success(
          `Exported ${nodes.length} page${nodes.length === 1 ? "" : "s"} as ${fmt.toUpperCase()}`,
        );
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
  }, [pending, mode, pageSize, safe, title, selected, settle]);

  function toggleMenu() {
    setOpen((v) => {
      const next = !v;
      if (next && pages.length === 0) setScanning(true);
      return next;
    });
  }

  function togglePage(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function start(fmt: Fmt) {
    if (pages.length > 0 && selected.size === 0) {
      toast.error("Pick at least one page to export");
      return;
    }
    setOpen(false);
    setPending(fmt);
  }

  const allOn = pages.length > 0 && selected.size === pages.length;

  return (
    <div className="relative" data-export-ignore="true">
      <button
        type="button"
        onClick={toggleMenu}
        disabled={!!pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-40"
      >
        <FileDown size={13} aria-hidden />
        {pending ? `Exporting ${pending.toUpperCase()}…` : label}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-72 overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-xl">
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[#666] uppercase">
              Pages
            </span>
            {pages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelected(allOn ? new Set() : new Set(pages.map((p) => p.index)))
                }
                className="text-[10px] font-medium text-[#003FC7] hover:underline"
              >
                {allOn ? "Clear all" : "Select all"}
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto px-1 pb-1">
            {scanning && <p className="px-1.5 py-2 text-xs text-[#666]">Reading pages…</p>}
            {!scanning && pages.length === 0 && (
              <p className="px-1.5 py-2 text-xs text-[#666]">No pages found.</p>
            )}
            {pages.map((p) => {
              const on = selected.has(p.index);
              return (
                <button
                  key={p.index}
                  type="button"
                  onClick={() => togglePage(p.index)}
                  aria-pressed={on}
                  className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs text-[#03002C] hover:bg-[#F2F2F2]"
                >
                  {on ? (
                    <CheckSquare size={13} className="shrink-0 text-[#003FC7]" aria-hidden />
                  ) : (
                    <Square size={13} className="shrink-0 text-[#666]" aria-hidden />
                  )}
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-1 border-t border-black/10 pt-1">
            <p className="px-2.5 pb-1 text-[10px] text-[#666]">
              {pages.length > 0
                ? `${selected.size} of ${pages.length} page${pages.length === 1 ? "" : "s"} selected`
                : "Exporting the full document"}
            </p>
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
        </div>
      )}

      {/* Offscreen host — full document at print width, never visible. */}
      {hostMounted && (
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
