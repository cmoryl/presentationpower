// -----------------------------------------------------------------------------
// PrintProofMenu — the shared "print & production proof" control.
//
// Sits next to AssetExportMenu wherever a DOM-rendered asset can be exported.
// Digital exports stay in that menu; this one owns the production side:
// resolution (up to 300 DPI and beyond), bleed margin, crop marks, and the
// proof metadata sheet that ships with the artwork.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { downloadAssetBlob } from "@/lib/asset-export";
import {
  DEFAULT_PROOF_OPTIONS,
  PROOF_DPI_OPTIONS,
  proofGeometry,
  type ProofDpi,
  type ProofOptions,
  type ProofTarget,
} from "@/lib/print-proof-export";

export type PrintProofMenuProps = {
  /** Resolved at click time so the menu never captures a stale node. */
  resolveTarget: () => ProofTarget | null;
  label?: string;
  className?: string;
  /** Production context printed into the metadata sheet. */
  context?: Record<string, string | number | null>;
};

export function PrintProofMenu({
  resolveTarget,
  label = "Print proof",
  className,
  context,
}: PrintProofMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dpi, setDpi] = useState<ProofDpi>(DEFAULT_PROOF_OPTIONS.dpi);
  const [bleed, setBleed] = useState(DEFAULT_PROOF_OPTIONS.bleedMm > 0);
  const [bleedMm, setBleedMm] = useState(DEFAULT_PROOF_OPTIONS.bleedMm);
  const [cropMarks, setCropMarks] = useState(DEFAULT_PROOF_OPTIONS.cropMarks);
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

  const options: ProofOptions = {
    dpi,
    bleedMm: bleed ? bleedMm : 0,
    cropMarks: bleed && cropMarks,
    paper: "#ffffff",
  };

  const preview = (() => {
    const t = resolveTarget();
    if (!t) return null;
    try {
      return proofGeometry(t.width, t.height, options);
    } catch {
      return null;
    }
  })();

  async function run(format: "png" | "jpg" | "pdf" | "zip") {
    const target = resolveTarget();
    if (!target?.node || !(target.width > 0 && target.height > 0)) {
      toast.error("Nothing to export — the asset has not finished rendering.");
      return;
    }
    setBusy(true);
    const toastId = toast.loading(`Rendering ${options.dpi} DPI proof…`);
    try {
      const { exportPrintProof } = await import("@/lib/print-proof-export");
      const res = await exportPrintProof(target, options, format, context);
      downloadAssetBlob(res.blob, res.filename);
      const kb = (res.blob.size / 1024).toFixed(0);
      const warn = res.geometry.downscaled
        ? ` · reduced to ${res.geometry.dpi} DPI to stay inside the browser's canvas limit`
        : "";
      toast.success(
        `${res.filename} · ${kb} KB · ${res.metadata.sheet.mm} sheet · proof, not a press master${warn}`,
        { id: toastId },
      );
      setOpen(false);
    } catch (err) {
      toast.error(`Proof failed: ${err instanceof Error ? err.message : String(err)}`, {
        id: toastId,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={wrapRef} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-[11px] font-medium text-[#03002C] transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-60"
      >
        {busy ? "Rendering…" : label}
        <span aria-hidden="true" className="text-[9px] opacity-60">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-72 overflow-hidden rounded-xl border border-black/10 bg-white p-3 shadow-xl"
        >
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[#666] uppercase">
            Resolution
          </p>
          <div className="mt-1.5 flex gap-1">
            {PROOF_DPI_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDpi(d)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] transition ${
                  dpi === d
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/15 text-[#03002C] hover:border-[#003FC7]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 text-[12px] text-[#03002C]">
            <input type="checkbox" checked={bleed} onChange={(e) => setBleed(e.target.checked)} />
            Bleed margin
            {bleed ? (
              <select
                value={bleedMm}
                onChange={(e) => setBleedMm(Number(e.target.value))}
                className="ml-auto rounded-md border border-black/15 px-1.5 py-0.5 text-[11px]"
              >
                {[3, 5].map((mm) => (
                  <option key={mm} value={mm}>
                    {mm} mm
                  </option>
                ))}
              </select>
            ) : null}
          </label>

          <label className="mt-2 flex items-center gap-2 text-[12px] text-[#03002C]">
            <input
              type="checkbox"
              checked={cropMarks}
              disabled={!bleed}
              onChange={(e) => setCropMarks(e.target.checked)}
            />
            Crop marks
            {!bleed ? <span className="text-[10px] text-[#666]">(needs bleed)</span> : null}
          </label>

          {preview ? (
            <p className="mt-3 rounded-lg bg-muted p-2 text-[10.5px] leading-[1.45] text-[#03002C]">
              Sheet {Math.round(preview.sheetIn.width * 25.4)} × {Math.round(preview.sheetIn.height * 25.4)} mm ·{" "}
              {preview.sheetPx.width} × {preview.sheetPx.height} px at {preview.dpi} DPI.
              {preview.downscaled
                ? ` Requested ${preview.requestedDpi} DPI is beyond the browser's canvas limit for this size.`
                : ""}{" "}
              RGB proof for position, copy and colour direction — not a press master.
            </p>
          ) : null}

          <div className="mt-2 border-t border-black/10 pt-1">
            {(
              [
                ["zip", "PNG + proof metadata (ZIP)"],
                ["png", "PNG · high-res sheet"],
                ["pdf", "PDF · one page at sheet size"],
                ["jpg", "JPG · compressed sheet"],
              ] as const
            ).map(([fmt, text]) => (
              <button
                key={fmt}
                type="button"
                role="menuitem"
                onClick={() => void run(fmt)}
                className="block w-full rounded-lg px-2 py-2 text-left text-[12px] text-[#03002C] hover:bg-[#E0E8F5]"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
