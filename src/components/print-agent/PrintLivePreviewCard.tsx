// Live, to-scale preview of a print piece the user owns, rendered inline in the
// chat after each build step so the work is visible as it happens.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type {
  PrintAssetKind,
  PrintDensity,
  PrintMode,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { PrintPagePreview } from "./PrintPagePreview";

export type PrintLivePreview = {
  assetId: string;
  title?: string;
  kind?: string;
  divisionId?: string | null;
  note?: string;
  page?: number;
};

export function printLivePreviewFromTool(part: unknown): PrintLivePreview | null {
  const out = (part as { output?: unknown } | null)?.output as
    | (PrintLivePreview & { ok?: boolean })
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

export function PrintLivePreviewCard({ preview }: { preview: PrintLivePreview }) {
  const [row, setRow] = useState<Row | null>(null);
  const [nonce, setNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    void supabase
      .from("print_assets")
      .select("title, kind, brand_mode_id, content, context")
      .eq("id", preview.assetId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) {
          setError(err.message);
          return;
        }
        if (!data) {
          setError("This piece is no longer available.");
          return;
        }
        setRow(data as Row);
      });
    return () => {
      alive = false;
    };
  }, [preview.assetId, nonce]);

  const ctx = row?.context ?? null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {row?.title ?? preview.title ?? "Live preview"}
            </p>
            <p className="text-xs text-muted-foreground">
              {(row?.kind ?? preview.kind ?? "print").replace(/-/g, " ")}
              {ctx?.editorMode === "dark" ? " · dark" : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => setNonce((n) => n + 1)}
          >
            <RefreshCw className="size-3" aria-hidden />
            <span className="sr-only">Refresh preview</span>
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-[11px]" asChild>
            <Link to="/asset/$assetId" params={{ assetId: preview.assetId }}>
              Open <ExternalLink className="ml-1 size-3" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {preview.note ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{preview.note}</p>
      ) : null}

      <div className="mx-auto mt-3 max-w-[320px]">
        {error ? (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {error}
          </p>
        ) : row ? (
          <PrintPagePreview
            kind={row.kind as PrintAssetKind}
            content={row.content}
            divisionId={row.brand_mode_id ?? preview.divisionId ?? null}
            mode={(ctx?.editorMode === "dark" ? "dark" : "light") as PrintMode}
            pageSize={(ctx?.pageSize ?? "Letter") as PrintPageSize}
            density={(ctx?.density ?? "standard") as PrintDensity}
            pageIndex={preview.page ?? 0}
          />
        ) : (
          <div className="aspect-[8.5/11] animate-pulse rounded-lg border border-border bg-muted/40" />
        )}
      </div>
    </div>
  );
}
