// Dev-only harness for the print-module PDF snapshot gate.
//
// It renders one Letter-sized page per print section module (816 × 1056 CSS px
// = 8.5in × 11in at 96 DPI) using the SAME renderer, doc-mode provider and
// container-query width the real print asset editor uses, then exports every
// page through the production `exportPrintAssetAsPdf` path. The snapshot script
// (scripts/print-module-pdf-snapshots.mjs) drives this page, downloads the PDF,
// rasterizes it and pixel-compares against stored baselines.
//
// Nothing here is reachable from product navigation: it exists so a regression
// in a section renderer, the icon treatment or the export pipeline shows up as
// a failed diff instead of a surprise in a client-facing PDF.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { PAGE_W } from "@/components/print/print-primitives";
import {
  PrintDocModeProvider,
  PRINT_ICON_STYLE_DEFAULT,
  type PrintIconStyle,
} from "@/components/print/print-doc-mode";
import { PrintSectionRenderer } from "@/components/print/sections/PrintSectionRenderer";
import { PRINT_SECTION_MODULES, findPrintModule } from "@/lib/print-library/section-modules";
import { exportPrintAssetAsPdf } from "@/lib/print-asset-export";
import type { PrintSection } from "@/lib/print-assets.types";

/** Letter at 96 CSS DPI — matches PRINT_PAGE_PRESETS.Letter (8.5 × 11 in). */
const PAGE_H = 1056;
/** 0.7in side margin, the same gutter the curated print layouts use. */
const PAGE_PAD = 67;

type Search = {
  ids: string;
  mode: "light" | "dark";
  icons: 0 | 1;
  iconScale: number;
  iconStroke: number;
  accent: string;
};

export const Route = createFileRoute("/dev/print-module-pdf")({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    ids: typeof raw.ids === "string" ? raw.ids : "",
    mode: raw.mode === "dark" ? "dark" : "light",
    icons: raw.icons === "0" || raw.icons === 0 ? 0 : 1,
    iconScale: Number(raw.iconScale ?? PRINT_ICON_STYLE_DEFAULT.scale) || 1,
    iconStroke: Number(raw.iconStroke ?? PRINT_ICON_STYLE_DEFAULT.stroke) || 1.6,
    accent: typeof raw.accent === "string" && raw.accent ? raw.accent : "#003FC7",
  }),
  head: () => ({
    meta: [
      { title: "Print module PDF harness · TransPerfect Element" },
      {
        name: "description",
        content: "Internal harness that exports print section modules to PDF for snapshot diffing.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PrintModulePdfHarness,
});

function PrintModulePdfHarness() {
  const search = Route.useSearch();
  const [status, setStatus] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);

  const modules = useMemo(() => {
    const wanted = search.ids
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (wanted.length === 0) return PRINT_SECTION_MODULES.slice(0, 4);
    return wanted.map((id) => findPrintModule(id)).filter((m): m is NonNullable<typeof m> => !!m);
  }, [search.ids]);

  // `make()` is intentionally called once per mount: the demo copy must stay
  // byte-identical across runs or every snapshot diff would be noise.
  const sections = useMemo<Array<{ id: string; label: string; section: PrintSection }>>(
    () => modules.map((m) => ({ id: m.id, label: m.label, section: m.make() })),
    [modules],
  );

  const iconStyle: PrintIconStyle = useMemo(
    () => ({
      ...PRINT_ICON_STYLE_DEFAULT,
      scale: search.iconScale,
      stroke: search.iconStroke,
      accent: search.accent,
    }),
    [search.iconScale, search.iconStroke, search.accent],
  );

  const exportPdf = useCallback(async () => {
    const host = pagesRef.current;
    if (!host) return;
    const nodes = Array.from(host.querySelectorAll<HTMLElement>("[data-print-page]"));
    if (nodes.length === 0) return;
    setStatus("exporting");
    setError(null);
    try {
      await exportPrintAssetAsPdf(nodes, {
        pageSize: "Letter",
        format: "digital",
        mode: search.mode,
        // Exercise the vector-text overlay, which digital output skips by
        // default — text drift is exactly what these snapshots must catch.
        vectorText: true,
        filename: "print-module-snapshot.pdf",
      });
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [search.mode]);

  useEffect(() => {
    // Signal readiness only after fonts settle, so the first capture is not a
    // fallback-metrics render.
    let cancelled = false;
    const mark = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* best effort */
      }
      await new Promise((r) => window.setTimeout(r, 500));
      if (!cancelled) document.documentElement.setAttribute("data-pdf-harness-ready", "1");
    };
    void mark();
    return () => {
      cancelled = true;
      document.documentElement.removeAttribute("data-pdf-harness-ready");
    };
  }, [sections]);

  const paper = search.mode === "dark" ? "#03002C" : "#ffffff";

  return (
    <main className="min-h-screen bg-[#f4f5f8] p-6" data-testid="print-module-pdf-harness">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void exportPdf()}
          data-testid="harness-export-pdf"
          className="rounded-md bg-[#003FC7] px-4 py-2 text-sm font-medium text-white"
        >
          Export PDF
        </button>
        <span data-testid="harness-status" data-status={status} className="text-sm text-[#666]">
          {status}
          {error ? `: ${error}` : ""}
        </span>
        <span className="text-sm text-[#666]" data-testid="harness-count">
          {sections.length} page(s)
        </span>
      </div>

      <div ref={pagesRef} className="flex flex-col items-start gap-6">
        {sections.map(({ id, label, section }) => (
          <div
            key={id}
            data-print-page=""
            data-module-id={id}
            style={{
              width: PAGE_W,
              height: PAGE_H,
              background: paper,
              padding: PAGE_PAD,
              containerType: "inline-size",
            }}
            className="relative overflow-hidden"
          >
            <PrintDocModeProvider icons={search.icons === 1} iconStyle={iconStyle}>
              <PrintSectionRenderer section={section} mode={search.mode} accent={search.accent} />
            </PrintDocModeProvider>
            <div
              // Authoring label — must never appear in the exported PDF; the
              // suppression path is part of what this snapshot verifies.
              data-export-ignore="true"
              className="absolute bottom-2 right-3 text-[10px] uppercase tracking-widest text-[#666]"
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
