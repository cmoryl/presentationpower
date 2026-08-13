// Export quality picker — chooses the rasterization DPI used for the parts of
// a PPTX slide that cannot be vectors (style-pack sheets, gradient/pattern
// backgrounds). Persists to localStorage so the choice sticks per reviewer.

import { useCallback, useEffect, useState } from "react";
import {
  EXPORT_QUALITIES,
  exportQualityById,
  rasterSize,
  readExportQuality,
  writeExportQuality,
  DEFAULT_EXPORT_FIDELITY,
  EXPORT_FIDELITIES,
  readExportFidelity,
  writeExportFidelity,
  readExportDebugTree,
  writeExportDebugTree,
  readExportEmbedFonts,
  writeExportEmbedFonts,
  DEFAULT_EXPORT_EMBED_FONTS,
  EXPORT_FONT_EMBED_EXPLAINER,
  readExportLegacyImages,
  writeExportLegacyImages,
  DEFAULT_EXPORT_LEGACY_IMAGES,
  EXPORT_LEGACY_IMAGES_EXPLAINER,
  type ExportFidelityId,
  type ExportQualityId,
} from "@/lib/export-quality";

export function useExportQuality(): [ExportQualityId, (id: ExportQualityId) => void] {
  const [id, setId] = useState<ExportQualityId>("high");
  useEffect(() => setId(readExportQuality()), []);
  const set = useCallback((next: ExportQualityId) => {
    setId(next);
    writeExportQuality(next);
  }, []);
  return [id, set];
}

export function ExportQualitySelect({
  value,
  onChange,
  className,
  compact,
}: {
  value: ExportQualityId;
  onChange: (id: ExportQualityId) => void;
  className?: string;
  compact?: boolean;
}) {
  const q = exportQualityById(value);
  const { width, height } = rasterSize(q);
  return (
    <label className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="sr-only">Export quality</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ExportQualityId)}
        title={`${q.note} · background plate ${width}×${height}px`}
        className={`rounded-md border border-border bg-background text-foreground ${
          compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
        }`}
      >
        {EXPORT_QUALITIES.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {!compact ? (
        <span className="text-[11px] text-muted-foreground">
          {width}×{height} plate · text stays vector
        </span>
      ) : null}
    </label>
  );
}

// -----------------------------------------------------------------------------
// Export fidelity picker — native editable objects (default), layered decor
// plate, or flat design-exact plate.
// -----------------------------------------------------------------------------

export function useExportFidelity(): [ExportFidelityId, (id: ExportFidelityId) => void] {
  const [id, setId] = useState<ExportFidelityId>(DEFAULT_EXPORT_FIDELITY);
  useEffect(() => setId(readExportFidelity()), []);
  const set = useCallback((next: ExportFidelityId) => {
    setId(next);
    writeExportFidelity(next);
  }, []);
  return [id, set];
}

export function ExportFidelitySelect({
  value,
  onChange,
  className,
  compact,
}: {
  value: ExportFidelityId;
  onChange: (id: ExportFidelityId) => void;
  className?: string;
  compact?: boolean;
}) {
  const opt = EXPORT_FIDELITIES.find((f) => f.id === value) ?? EXPORT_FIDELITIES[0];
  return (
    <label className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="sr-only">Export fidelity</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ExportFidelityId)}
        title={opt.note}
        className={`rounded-md border border-border bg-background text-foreground ${
          compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
        }`}
      >
        {EXPORT_FIDELITIES.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      {!compact ? <span className="text-[11px] text-muted-foreground">{opt.note}</span> : null}
    </label>
  );
}

// -----------------------------------------------------------------------------
// Debug object tree toggle — ships a `<deck>.layers.json` sidecar and a debug
// .pptx whose notes spell out each object's type, editability and layering.
// -----------------------------------------------------------------------------

export function useExportDebugTree(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(readExportDebugTree()), []);
  const set = useCallback((next: boolean) => {
    setOn(next);
    writeExportDebugTree(next);
  }, []);
  return [on, set];
}

export function ExportDebugTreeToggle({
  value,
  onChange,
  className,
  compact,
}: {
  value: boolean;
  onChange: (on: boolean) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-1.5 ${compact ? "text-[11px]" : "text-xs"} ${className ?? ""}`}
      title="Also export object-tree metadata: a .layers.json sidecar plus a debug .pptx listing every object's type, editability and layering in the speaker notes."
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border"
      />
      Debug object tree
    </label>
  );
}

// -----------------------------------------------------------------------------
// Font embedding toggle — ships the brand font files inside the .pptx so the
// deck keeps its typography on machines that don't have Geist installed. Costs
// about a megabyte, so it is a user choice rather than a silent default.
// -----------------------------------------------------------------------------

export function useExportEmbedFonts(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(DEFAULT_EXPORT_EMBED_FONTS);
  useEffect(() => setOn(readExportEmbedFonts()), []);
  const set = useCallback((next: boolean) => {
    setOn(next);
    writeExportEmbedFonts(next);
  }, []);
  return [on, set];
}

export function ExportFontEmbedToggle({
  value,
  onChange,
  className,
  compact,
}: {
  value: boolean;
  onChange: (on: boolean) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label
        className={`flex items-center gap-1.5 ${compact ? "text-[11px]" : "text-xs"}`}
        title={EXPORT_FONT_EMBED_EXPLAINER}
      >
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border"
        />
        Embed fonts
      </label>
      {!compact ? (
        <p className="max-w-[34rem] text-[11px] leading-relaxed text-muted-foreground">
          {value
            ? "On — the brand font (Geist) travels inside the file, so the deck looks identical on any computer, even without the font installed. Adds about 1 MB."
            : "Off — smaller file, but PowerPoint will substitute a system font on computers without Geist, so headlines and line breaks may shift."}
        </p>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Legacy image compatibility toggle — forces every embedded picture to JPEG or
// PNG (rasterizing SVG) so the file opens identically in PowerPoint 2007-2016,
// Google Slides and Keynote. Off by default: modern PowerPoint renders the
// crisper vector/WebP-free mix we already ship.
// -----------------------------------------------------------------------------

export function useExportLegacyImages(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(DEFAULT_EXPORT_LEGACY_IMAGES);
  useEffect(() => setOn(readExportLegacyImages()), []);
  const set = useCallback((next: boolean) => {
    setOn(next);
    writeExportLegacyImages(next);
  }, []);
  return [on, set];
}

export function ExportLegacyImagesToggle({
  value,
  onChange,
  className,
  compact,
}: {
  value: boolean;
  onChange: (on: boolean) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label
        className={`flex items-center gap-1.5 ${compact ? "text-[11px]" : "text-xs"}`}
        title={EXPORT_LEGACY_IMAGES_EXPLAINER}
      >
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border"
        />
        JPEG/PNG images only
      </label>
      {!compact ? (
        <p className="max-w-[34rem] text-[11px] leading-relaxed text-muted-foreground">
          {value
            ? "On — every picture is saved as JPEG or PNG and icons/logos are flattened, so the deck opens the same way in PowerPoint 2016 and older, Google Slides and Keynote. Slightly larger file, icons no longer scale perfectly crisp."
            : "Off — icons and logos stay sharp vectors and photos keep their original format (WebP is always converted). Best for PowerPoint 2019 and Microsoft 365."}
        </p>
      ) : null}
    </div>
  );
}
