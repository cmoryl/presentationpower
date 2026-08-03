// Enlarged view + actions for an inherited PPTX backdrop layer.
//
// Opened from the master-background audit table. Lets a user inspect the
// resolved backdrop at deck scale, download it as a 1920×1080 PNG, copy the
// CSS, or file it into a division's approved imagery library.

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, X, Check, Copy, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { BRAND_MODES } from "@/lib/taxonomy";
import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/hooks/use-modal-a11y";
import { uploadDivisionImagery, approveDivisionImagery } from "@/lib/division-imagery.functions";
import type { ImportedBackdrop } from "@/lib/imported-backdrop";
import {
  backdropCss,
  backdropCssText,
  backdropFilename,
  backdropLabel,
  backdropToPngDataUrl,
  downloadDataUrl,
} from "@/lib/backdrop-capture";

export type BackdropRow = {
  index: number;
  title: string;
  backdrop: ImportedBackdrop | null;
  masterPath?: string;
  layoutPath?: string;
  backgroundFrom?: string;
};

export async function saveBackdropToDivision(opts: {
  row: BackdropRow;
  divisionId: string;
  deckName: string;
  upload: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  approve?: (args: { data: { id: string; approved: boolean } }) => Promise<unknown>;
}): Promise<{ id: string; approved: boolean }> {
  const png = await backdropToPngDataUrl(opts.row.backdrop);
  const res = await opts.upload({
    data: {
      divisionId: opts.divisionId,
      filename: backdropFilename(opts.row.backdrop, opts.row.index),
      contentType: "image/png",
      data: png,
      kind: "abstract",
      tags: ["imported_backdrop", "master_backdrop"],
      note: `Inherited backdrop from “${opts.deckName}” slide ${opts.row.index + 1} (${backdropLabel(
        opts.row.backdrop,
      )})`,
    },
  });
  let approved = false;
  if (opts.approve) {
    try {
      await opts.approve({ data: { id: res.id, approved: true } });
      approved = true;
    } catch {
      approved = false;
    }
  }
  return { id: res.id, approved };
}

export function BackdropInspector({
  row,
  deckName,
  defaultDivisionId,
  onClose,
}: {
  row: BackdropRow;
  deckName: string;
  defaultDivisionId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose, containerRef: ref });

  const upload = useServerFn(uploadDivisionImagery);
  const approve = useServerFn(approveDivisionImagery);
  const [divisionId, setDivisionId] = useState(defaultDivisionId);
  const [busy, setBusy] = useState<"save" | "download" | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setSaved(false), [row.index, divisionId]);

  const label = backdropLabel(row.backdrop);
  const css = backdropCssText(row.backdrop);

  const handleDownload = async () => {
    setBusy("download");
    try {
      const png = await backdropToPngDataUrl(row.backdrop);
      downloadDataUrl(png, backdropFilename(row.backdrop, row.index));
      toast.success("Backdrop PNG downloaded (1920×1080).");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy("save");
    try {
      const out = await saveBackdropToDivision({
        row,
        divisionId,
        deckName,
        upload: upload as never,
        approve: approve as never,
      });
      setSaved(true);
      toast.success(
        out.approved
          ? "Added to approved imagery for this division."
          : "Added to the division imagery library — an admin still needs to approve it.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backdrop-inspector-title"
        tabIndex={-1}
        className="w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2
              id="backdrop-inspector-title"
              className="truncate text-sm font-semibold tracking-tight"
            >
              Slide {row.index + 1} · {row.title || "Untitled"}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{label}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" strokeWidth={1.75} />
          </Button>
        </div>

        <div
          className="aspect-video w-full border-b border-border"
          style={backdropCss(row.backdrop)}
          role="img"
          aria-label={`Enlarged backdrop preview: ${label}`}
        />

        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            aria-label="Target division imagery library"
          >
            {BRAND_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Button onClick={handleSave} disabled={busy !== null} className="gap-1.5">
            {busy === "save" ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : saved ? (
              <Check className="size-4" strokeWidth={1.75} />
            ) : (
              <ImagePlus className="size-4" strokeWidth={1.75} />
            )}
            {saved ? "Added to imagery" : "Add to division imagery"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={busy !== null}
            className="gap-1.5"
          >
            {busy === "download" ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Download className="size-4" strokeWidth={1.75} />
            )}
            Download PNG
          </Button>
          {css && (
            <Button
              variant="ghost"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard
                  .writeText(css)
                  .then(() => toast.success("CSS copied."))
                  .catch(() => toast.error("Clipboard unavailable."));
              }}
            >
              <Copy className="size-4" strokeWidth={1.75} /> Copy CSS
            </Button>
          )}
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {row.masterPath?.split("/").pop()} · {row.layoutPath?.split("/").pop()} ·{" "}
            {row.backgroundFrom}
          </span>
        </div>
      </div>
    </div>
  );
}
