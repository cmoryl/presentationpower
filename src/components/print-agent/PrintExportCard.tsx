// Export step for the Print Agent chat: renders the selected page at full trim
// size off-screen and downloads real print-ready deliverables (PDF, PNG, SVG).
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Download, FileImage, FileText, Shapes } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { runWithExportFeedback } from "@/lib/export-feedback";
import type { PrintPageSizeKey } from "@/lib/print-asset-export";
import {
  assertPrintPageReady,
  downloadPrintPageAsset,
  printPageTrim,
  waitForPrintPageReady,
  type PrintPageExportFormat,
} from "@/lib/print-agent/page-export";
import type {
  PrintAssetKind,
  PrintDensity,
  PrintMode,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { PrintPagePreview } from "./PrintPagePreview";

/**
 * The staged page renders live layout code with agent-authored content. A crash
 * in there used to take the whole chat route down and leave the export as a
 * silent no-op; contain it and report it through the export toast instead.
 */
class StageBoundary extends Component<
  { onError: (message: string) => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(err: unknown) {
    this.props.onError(
      err instanceof Error && err.message
        ? `This page could not be rendered: ${err.message}`
        : "This page could not be rendered for export.",
    );
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}


export type PrintExportRequest = {
  assetId: string;
  title?: string;
  kind?: string;
  divisionId?: string | null;
  /** Zero-based page index of the page to export. */
  page?: number;
  formats?: PrintPageExportFormat[];
  note?: string;
};

export function printExportFromTool(part: unknown): PrintExportRequest | null {
  const out = (part as { output?: unknown } | null)?.output as
    | (PrintExportRequest & { ok?: boolean })
    | undefined;
  if (!out || typeof out !== "object" || !out.assetId) return null;
  return out;
}

type Row = {
  title: string;
  kind: string;
  brand_mode_id: string | null;
  content: unknown;
  context: { editorMode?: string; pageSize?: string; density?: string } | null;
};

const FORMAT_META: Record<
  PrintPageExportFormat,
  { label: string; hint: string; Icon: typeof FileText }
> = {
  pdf: { label: "PDF", hint: "300 dpi press, bleed + crop marks", Icon: FileText },
  png: { label: "PNG", hint: "300 dpi flattened raster", Icon: FileImage },
  svg: { label: "SVG", hint: "Page-sized vector container", Icon: Shapes },
};

export function PrintExportCard({ request }: { request: PrintExportRequest }) {
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageErrorRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase
      .from("print_assets")
      .select("title, kind, brand_mode_id, content, context")
      .eq("id", request.assetId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError(err.message);
        else if (!data) setError("This piece is no longer available.");
        else setRow(data as Row);
      });
    return () => {
      alive = false;
    };
  }, [request.assetId]);

  const ctx = row?.context ?? null;
  const pageSize = (ctx?.pageSize ?? "Letter") as PrintPageSize;
  const mode: PrintMode = ctx?.editorMode === "dark" ? "dark" : "light";
  const pageIndex = request.page ?? 0;
  const trim = printPageTrim(pageSize as PrintPageSizeKey);
  const formats = request.formats?.length ? request.formats : (["pdf", "png", "svg"] as const);

  const run = useCallback(
    async (list: PrintPageExportFormat[], label: string) => {
      if (!row || busy) return;
      setBusy(label);
      stageErrorRef.current = null;
      setStaged(true);
      try {
        const base = `${(row.title || "print-page").slice(0, 60)}-p${pageIndex + 1}`;
        await runWithExportFeedback(
          {
            pending: `Building print-ready ${label}…`,
            success: `${label} downloaded`,
            failure: `${label} export failed`,
            successDescription: `${row.title} · page ${pageIndex + 1} · ${pageSize}`,
          },
          async () => {
            setStatus("Rendering the page at trim size…");
            // One frame for the stage to mount, then the real readiness gate.
            await new Promise<void>((r) => requestAnimationFrame(() => r()));
            if (stageErrorRef.current) throw new Error(stageErrorRef.current);
            const node = assertPrintPageReady(
              stageRef.current?.querySelector<HTMLElement>("[data-print-page]"),
            );
            await waitForPrintPageReady(node);
            if (stageErrorRef.current) throw new Error(stageErrorRef.current);
            for (const format of list) {
              setStatus(`Writing ${format.toUpperCase()}…`);
              await downloadPrintPageAsset(format, node, {
                pageSize: pageSize as PrintPageSizeKey,
                mode,
                baseName: base,
                onProgress: (p) => setStatus(p.message),
              });
            }
          },
        );
      } catch {
        // runWithExportFeedback already surfaced the reason.
        if (stageErrorRef.current) setError(stageErrorRef.current);
      } finally {
        setStatus(null);
        setBusy(null);
        setStaged(false);
      }
    },
    [busy, mode, pageIndex, pageSize, row],
  );



  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <Download className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            Export page {pageIndex + 1} — {row?.title ?? request.title ?? "print piece"}
          </p>
          <p className="text-xs text-muted-foreground">
            {(row?.kind ?? request.kind ?? "print").replace(/-/g, " ")} · {pageSize} ·{" "}
            {trim.widthIn.toFixed(2)} × {trim.heightIn.toFixed(2)} in
            {mode === "dark" ? " · dark" : ""}
          </p>
        </div>
      </div>

      {request.note ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{request.note}</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {formats.map((format) => {
          const meta = FORMAT_META[format];
          return (
            <Button
              key={format}
              size="sm"
              variant="secondary"
              className="h-8 text-[11px]"
              disabled={!row || Boolean(busy)}
              onClick={() => void run([format], meta.label)}
              title={meta.hint}
            >
              <meta.Icon className="mr-1 size-3.5" aria-hidden />
              {meta.label}
            </Button>
          );
        })}
        <Button
          size="sm"
          className="h-8 text-[11px]"
          disabled={!row || Boolean(busy)}
          onClick={() => void run([...formats], "print pack")}
        >
          <Download className="mr-1 size-3.5" aria-hidden />
          Download all
        </Button>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        {status ?? "PDF is press-ready (bleed + crop marks). PNG and SVG are for placement."}
      </p>

      {/* Off-screen, full trim-size render used as the export source. */}
      {staged && row ? (
        <div
          ref={stageRef}
          aria-hidden
          className="pointer-events-none fixed left-[-20000px] top-0 z-[-1]"
          style={{ width: `${trim.widthIn * 96}px` }}
        >
          <div data-print-page style={{ width: "100%" }}>
            <StageBoundary
              onError={(message) => {
                stageErrorRef.current = message;
              }}
            >
              <PrintPagePreview
                kind={row.kind as PrintAssetKind}
                content={row.content}
                divisionId={row.brand_mode_id ?? request.divisionId ?? null}
                mode={mode}
                pageSize={pageSize}
                density={(ctx?.density ?? "standard") as PrintDensity}
                pageIndex={pageIndex}
                className="!rounded-none !border-0"
              />
            </StageBoundary>
          </div>

        </div>
      ) : null}
    </div>
  );
}
