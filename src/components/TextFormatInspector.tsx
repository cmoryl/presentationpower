// -----------------------------------------------------------------------------
// Text formatting inspector
//
// Mounts the slide on the SAME offscreen exact stage the layered PPTX export
// uses, measures every text run with the exporter's own measurement pass, and
// shows the exact properties that get written into PowerPoint for the selected
// run (size in pt, weight, tracking, line spacing, alignment, box geometry).
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, RotateCcw, Type } from "lucide-react";

import { extractTextRuns, type TextRun } from "@/lib/export-text-layer";
import { describeTextRun, type PptxTextProps } from "@/lib/pptx-text-props";
import { withExactStage } from "@/lib/slide-exact-raster";
import type { StylePack } from "@/lib/style-packs";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import { useDeckStore } from "@/lib/deck-store";
import {
  TEXT_SCOPE_LABELS,
  hasTextFormats,
  resolveScopeFormat,
  type SlideTextFormat,
  type SlideTextFormats,
  type SlideTextScope,
} from "@/lib/slide-text-format";

interface Props {
  slide: unknown;
  variant: ModuleVariant;
  brand: BrandMode;
  mode: "light" | "dark";
  pack?: StylePack | null;
  pageNumber?: number;
  /** Changing this key invalidates the measurement (slide id + variant + mode). */
  signature: string;
  /** Enables the editable typography controls (deck editor only). */
  deckId?: string;
  slideId?: string;
  formats?: SlideTextFormats | null;
}

interface Measured {
  run: TextRun;
  props: PptxTextProps;
  index: number;
}

export function TextFormatInspector({
  slide,
  variant,
  brand,
  mode,
  pack = null,
  pageNumber = 1,
  signature,
  deckId,
  slideId,
  formats = null,
}: Props) {
  const [rows, setRows] = useState<Measured[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);

  // A new slide / layout / mode invalidates any previous measurement.
  useEffect(() => {
    setRows(null);
    setSelected(0);
    setError(null);
  }, [signature]);

  const measure = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const out = await withExactStage(
        { slide, variant, brand, mode, pack, pageNumber },
        (stage) => extractTextRuns(stage).runs,
      );
      if (!out) {
        setError("Could not mount the export stage in this browser.");
        setRows([]);
        return;
      }
      const measured: Measured[] = [];
      out.forEach((run, i) => {
        const props = describeTextRun(run);
        if (props) measured.push({ run, props, index: i + 1 });
      });
      setRows(measured);
      setSelected(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Measurement failed.");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [slide, variant, brand, mode, pack, pageNumber]);

  const current = rows && rows.length ? (rows[Math.min(selected, rows.length - 1)] ?? null) : null;

  const fields = useMemo(() => {
    if (!current) return [];
    const p = current.props;
    const s = p.source;
    return [
      { k: "fontSize", v: `${p.fontSize} pt`, note: `${s.fontSizePx}px at 1920×1080` },
      { k: "fontFace", v: p.fontFace, note: "after brand font mapping" },
      {
        k: "bold",
        v: p.bold ? "true" : "false",
        note: s.cssWeight,
      },
      { k: "italic", v: p.italic ? "true" : "false" },
      { k: "underline", v: p.underline ? "sng" : "none" },
      {
        k: "charSpacing",
        v: p.charSpacing === undefined ? "— (none emitted)" : `${p.charSpacing} pt`,
        note: s.trackingEm === null ? undefined : `${s.trackingEm}em tracking`,
      },
      {
        k: "lineSpacing",
        v: p.lineSpacing === undefined ? "— (font metrics)" : `${p.lineSpacing} pt`,
        note: s.lineHeightRatio === null ? undefined : `${s.lineHeightRatio}× line height`,
      },
      { k: "align", v: p.align, note: current.run.align === "justify" ? "justify → left" : undefined },
      { k: "valign", v: p.valign, note: s.singleLine ? "single line" : "wrapped block" },
      { k: "wrap", v: p.wrap ? "true" : "false" },
      { k: "color", v: `#${p.color}` },
      {
        k: "transparency",
        v: p.transparency === undefined ? "0 (opaque)" : `${p.transparency}%`,
      },
      { k: "x / y", v: `${p.x}" / ${p.y}"`, note: "inches from slide top-left" },
      { k: "w / h", v: `${p.w}" / ${p.h}"` },
      { k: "margin / inset", v: "0", note: "text lands on the plate pixel" },
      { k: "shrinkText", v: "false" },
    ];
  }, [current]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] leading-snug text-black/50">
          Measured on the same offscreen stage the PPTX export uses — these are the exact
          properties written to PowerPoint.
        </p>
        <button
          type="button"
          onClick={measure}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs font-medium hover:border-black/35 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : rows ? (
            <RefreshCw className="size-3.5" />
          ) : (
            <Type className="size-3.5" />
          )}
          {busy ? "Measuring" : rows ? "Re-measure" : "Measure text"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-[#E53D2E]">{error}</p>}

      {rows && rows.length === 0 && !error && (
        <p className="mt-3 text-xs text-black/50">
          No editable text runs on this slide — all copy stays inside the raster plate.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-widest text-black/45">
              Text run ({rows.length})
            </span>
            <select
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
              className="w-full rounded-lg border border-black/15 bg-white px-2.5 py-2 text-sm"
            >
              {rows.map((r, i) => (
                <option key={`${r.index}-${i}`} value={i}>
                  {String(r.index).padStart(2, "0")} · {r.props.fontSize}pt ·{" "}
                  {r.props.text.length > 42 ? `${r.props.text.slice(0, 42)}…` : r.props.text}
                </option>
              ))}
            </select>
          </label>

          {current && (
            <>
              <div className="rounded-xl border border-black/10 bg-[#F2F2F2] px-3 py-2 text-sm">
                <span className="line-clamp-3">{current.props.text}</span>
              </div>
              <dl className="divide-y divide-black/5 rounded-xl border border-black/10">
                {fields.map((f) => (
                  <div key={f.k} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                    <dt className="text-[11px] uppercase tracking-widest text-black/45">{f.k}</dt>
                    <dd className="text-right text-xs">
                      <span className="font-medium tabular-nums">{f.v}</span>
                      {f.note && (
                        <span className="block text-[10px] text-black/40">{f.note}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>
      )}
    </div>
  );
}
