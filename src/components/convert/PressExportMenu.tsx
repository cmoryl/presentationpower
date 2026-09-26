// -----------------------------------------------------------------------------
// PressExportMenu — press-ready output for the adaptor's print formats.
//
// Sits next to the digital and proof menus, and only appears for print targets.
// Unlike the proof menu, what comes out here is intended to go to a printer:
// 300/600 DPI, trim + bleed, crop marks, copy re-drawn as embedded Geist vector
// text, optional PDF/X-4, and an Illustrator-openable .ai twin.
//
// The receipt after every download states what is vector, what is raster, the
// DPI actually achieved, and that colour is brand RGB.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { downloadAssetBlob } from "@/lib/asset-export";
import { exportConvertPress, MM_PER_IN, type PressDelivery } from "@/lib/convert-press-export";

export type PressExportTarget = {
  node: HTMLElement;
  trimIn: { width: number; height: number };
  label: string;
};

export type PressExportMenuProps = {
  /** Resolved at click time so the menu never holds a stale node. */
  resolveTarget: () => PressExportTarget | null;
  className?: string;
  context?: Record<string, string | number | null>;
};

export function PressExportMenu({ resolveTarget, className, context }: PressExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quality, setQuality] = useState<"300dpi" | "600dpi">("300dpi");
  const [bleedMm, setBleedMm] = useState(3);
  const [cropMarks, setCropMarks] = useState(true);
  const [pdfX4, setPdfX4] = useState(false);
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

  const target = open ? resolveTarget() : null;
  const mm = (v: number) => Math.round(v * MM_PER_IN);

  async function run(deliver: PressDelivery) {
    const t = resolveTarget();
    if (!t?.node || !(t.trimIn.width > 0 && t.trimIn.height > 0)) {
      toast.error("Nothing to export — the page has not finished rendering.");
      return;
    }
    setBusy(true);
    const id = toast.loading("Building the press file…");
    try {
      const res = await exportConvertPress({
        node: t.node,
        trimIn: t.trimIn,
        label: t.label,
        quality,
        bleedMm,
        cropMarks,
        pdfX4,
        deliver,
        context,
        onProgress: (p) => toast.loading(p.message, { id }),
      });
      downloadAssetBlob(res.blob, res.filename);
      const mb = res.bytes > 900_000;
      const size = mb ? `${(res.bytes / 1_048_576).toFixed(1)} MB` : `${Math.round(res.bytes / 1024)} KB`;
      toast.success(
        `${res.filename} · ${size} · ${mm(res.trimIn.width)} × ${mm(res.trimIn.height)} mm trim + ${res.bleedMm} mm bleed · ` +
          `${Math.round(res.effectiveDpi)} DPI · ${res.vector.linesDrawn} lines of text kept as vector · RGB` +
          (res.pdfX4 ? " · PDF/X-4" : "") +
          (res.dpiClamped ? ` · reduced from ${res.requestedDpi} DPI (${res.clampReason})` : ""),
        { id, duration: 12000 },
      );
      setOpen(false);
    } catch (err) {
      toast.error(`Press export failed: ${err instanceof Error ? err.message : String(err)}`, {
        id,
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
        className="inline-flex items-center gap-1.5 rounded-sm border border-[#003FC7] bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:bg-[#03002C] disabled:opacity-60"
      >
        {busy ? "Building…" : "Press-ready export"}
        <span aria-hidden="true" className="text-[9px] opacity-70">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-80 rounded-sm border border-black/10 bg-white p-3 shadow-xl"
        >
          <p className="text-[10px] font-semibold tracking-[0.12em] text-[#666] uppercase">
            Resolution
          </p>
          <div className="mt-1.5 flex gap-1">
            {(["300dpi", "600dpi"] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                className={`flex-1 rounded-sm border px-2 py-1.5 text-[11px] transition ${
                  quality === q
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/15 text-[#03002C] hover:border-[#003FC7]"
                }`}
              >
                {q === "300dpi" ? "300 DPI · standard" : "600 DPI · large format"}
              </button>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 text-[12px] text-[#03002C]">
            Bleed
            <select
              value={bleedMm}
              onChange={(e) => setBleedMm(Number(e.target.value))}
              className="ml-auto rounded-sm border border-black/15 px-1.5 py-0.5 text-[11px]"
            >
              {[0, 3, 5, 10].map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "none (trim only)" : `${v} mm per edge`}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-2 flex items-center gap-2 text-[12px] text-[#03002C]">
            <input
              type="checkbox"
              checked={cropMarks && bleedMm > 0}
              disabled={bleedMm === 0}
              onChange={(e) => setCropMarks(e.target.checked)}
            />
            Crop marks
            {bleedMm === 0 ? <span className="text-[10px] text-[#666]">(needs bleed)</span> : null}
          </label>

          <label className="mt-2 flex items-center gap-2 text-[12px] text-[#03002C]">
            <input type="checkbox" checked={pdfX4} onChange={(e) => setPdfX4(e.target.checked)} />
            PDF/X-4 (adds a press colour profile)
          </label>

          {target ? (
            <p className="mt-3 rounded-sm bg-muted p-2 text-[10.5px] leading-[1.45] text-[#03002C]">
              {mm(target.trimIn.width)} × {mm(target.trimIn.height)} mm trim
              {bleedMm > 0 ? `, ${mm(target.trimIn.width) + bleedMm * 2} × ${mm(target.trimIn.height) + bleedMm * 2} mm with bleed` : ""}.
              Copy is embedded Geist vector text; backgrounds and photography are a{" "}
              {quality === "600dpi" ? "600" : "300"} DPI raster. Colour stays brand RGB — no CMYK
              conversion. Very large sizes may be written at a lower resolution, and the receipt
              says so.
            </p>
          ) : null}

          <div className="mt-2 border-t border-black/10 pt-1">
            {(
              [
                ["zip", "Press pack (ZIP) · PDF + .ai + manifest"],
                ["pdf", "Press PDF · one page, trim + bleed"],
                ["ai", "Illustrator file (.ai)"],
              ] as const
            ).map(([d, text]) => (
              <button
                key={d}
                type="button"
                role="menuitem"
                onClick={() => void run(d)}
                className="block w-full rounded-sm px-2 py-2 text-left text-[12px] text-[#03002C] hover:bg-[#E0E8F5]"
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
