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
