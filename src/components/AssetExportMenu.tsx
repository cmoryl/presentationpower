// -----------------------------------------------------------------------------
// AssetExportMenu — the shared "export this asset" control.
//
// Any DOM-rendered asset (social post, event collateral, banner, module sample)
// gets the same multi-format menu: PNG at 1× / 2× native pixels, JPG, WebP, a
// PDF page, and — when the caller passes more than one target — a zip bundle.
//
// Every export is verified against its own bytes before the toast says "saved",
// so a broken rasterizer surfaces as an error instead of a 0-byte download.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  assetFileSlug,
  downloadAssetBlob,
  exportAssetImage,
  exportAssetsPdf,
  exportAssetsZip,
  type AssetCaptureTarget,
  type AssetImageFormat,
} from "@/lib/asset-export";
import { verifyExportBlob, type ExportKind } from "@/lib/export-verify-bytes";

export type AssetExportMenuProps = {
  /** Resolved at click time so the menu never captures a stale node. */
  resolveTargets: () => AssetCaptureTarget[];
  /** Base filename (no extension). */
  filename: string;
  /** Optional bundle label used for the zip folder + manifest. */
  bundleName?: string;
  label?: string;
  className?: string;
  /** Hide the zip row even when several targets resolve. */
  allowZip?: boolean;
};

type Job =
  | { kind: "image"; format: AssetImageFormat; scale: number; label: string }
  | { kind: "pdf"; label: string }
  | { kind: "zip"; label: string };

const IMAGE_JOBS: Job[] = [
  { kind: "image", format: "png", scale: 1, label: "PNG · native size" },
  { kind: "image", format: "png", scale: 2, label: "PNG · 2× retina" },
  { kind: "image", format: "jpg", scale: 1, label: "JPG · compressed" },
  { kind: "image", format: "webp", scale: 1, label: "WebP · web-optimised" },
];

export function AssetExportMenu({
  resolveTargets,
  filename,
  bundleName,
  label = "Export",
  className,
  allowZip = true,
}: AssetExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(job: Job) {
    const targets = resolveTargets().filter((t) => t?.node && t.width > 0 && t.height > 0);
    if (targets.length === 0) {
      toast.error("Nothing to export — the asset has not finished rendering.");
      return;
    }
    const base = assetFileSlug(filename, "asset");
    setBusy(job.label);
    const toastId = toast.loading(`Exporting ${job.label}…`);
    try {
      let blob: Blob;
      let name: string;
      let kind: ExportKind;
      let expect: { width?: number; height?: number; pages?: number } = {};

      if (job.kind === "image") {
        const t = targets[0];
        blob = await exportAssetImage(t, { format: job.format, scale: job.scale });
        name = `${base}-${Math.round(t.width * job.scale)}x${Math.round(t.height * job.scale)}.${job.format}`;
        kind = job.format;
        if (job.format === "png") {
          expect = {
            width: Math.round(t.width * job.scale),
            height: Math.round(t.height * job.scale),
          };
        }
      } else if (job.kind === "pdf") {
        blob = await exportAssetsPdf(targets);
        name = `${base}.pdf`;
        kind = "pdf";
        expect = { pages: targets.length };
      } else {
        blob = await exportAssetsZip(targets, { bundleName: bundleName ?? filename });
        name = `${base}.zip`;
        kind = "zip";
      }

      const verdict = await verifyExportBlob(blob, kind, expect);
      if (!verdict.ok) {
        toast.error(`Export failed verification: ${verdict.problems.join("; ")}`, { id: toastId });
        return;
      }
      downloadAssetBlob(blob, name);
      toast.success(`${name} · ${(verdict.bytes / 1024).toFixed(0)} KB · ${verdict.detail}`, {
        id: toastId,
      });
      setOpen(false);
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`, {
        id: toastId,
      });
    } finally {
      setBusy(null);
    }
  }

  const multi = allowZip;

  return (
    <div ref={wrapRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!!busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-[11px] font-medium text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-60"
      >
        {busy ? "Exporting…" : label}
        <span aria-hidden="true" className="text-[9px] opacity-60">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-xl"
        >
          {IMAGE_JOBS.map((job) => (
            <button
              key={job.label}
              type="button"
              role="menuitem"
              onClick={() => void run(job)}
              className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-[#03002C] hover:bg-[#E0E8F5]"
            >
              {job.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => void run({ kind: "pdf", label: "PDF" })}
            className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-[#03002C] hover:bg-[#E0E8F5]"
          >
            PDF · page per asset
          </button>
          {multi ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => void run({ kind: "zip", label: "ZIP bundle" })}
              className="block w-full rounded-lg px-3 py-2 text-left text-[12px] text-[#03002C] hover:bg-[#E0E8F5]"
            >
              ZIP · all sizes + manifest
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
