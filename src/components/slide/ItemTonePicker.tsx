// Per-row accent tone picker. Used by the deck inspector and the admin module
// sample studio so a single lane / pillar's gradient wash, rail and hairline can
// be recoloured without touching the rest of the module.

import { TONE_SWATCHES, isToneHex, itemTone } from "@/lib/item-tone";

/** Compact swatch row for one item. */
export function ItemToneRow({
  tone,
  onChange,
  label,
}: {
  tone: string | null;
  onChange: (hex: string | null) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] uppercase tracking-widest text-black/40">
        {label ?? "Gradient colour"}
      </span>
      {TONE_SWATCHES.map((sw) => {
        const active = tone?.toLowerCase() === sw.hex.toLowerCase();
        return (
          <button
            key={sw.hex}
            type="button"
            title={sw.label}
            aria-label={`${label ?? "Gradient colour"}: ${sw.label}`}
            aria-pressed={active}
            onClick={() => onChange(sw.hex)}
            className={
              "h-5 w-5 rounded-full border transition " +
              (active ? "border-primary ring-2 ring-primary/30" : "border-black/15 hover:border-black/40")
            }
            style={{
              backgroundImage: `linear-gradient(180deg, ${sw.hex} 0%, color-mix(in oklab, ${sw.hex} 22%, transparent) 100%)`,
            }}
          />
        );
      })}
      <label className="ml-1 inline-flex items-center gap-1 text-[10px] text-black/50">
        Custom
        <input
          type="color"
          value={isToneHex(tone) ? (tone as string) : "#003FC7"}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-6 cursor-pointer rounded border border-black/15 bg-white p-0"
          aria-label="Custom gradient colour"
        />
      </label>
      {tone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] text-black/55 hover:border-black/30"
        >
          Auto
        </button>
      )}
    </div>
  );
}

/**
 * Panel listing every lane / pillar in a module with its own gradient colour.
 * `items` is the raw content array; writes go back through `onChange`.
 */
export function ItemTonePanel({
  items,
  onChange,
  title = "Layer gradient colours",
  rowLabel = "Layer",
}: {
  items: unknown;
  onChange: (items: Record<string, unknown>[]) => void;
  title?: string;
  rowLabel?: string;
}) {
  const rows = Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
  if (rows.length === 0) return null;

  const setTone = (i: number, hex: string | null) =>
    onChange(
      rows.map((it, k) => {
        if (k !== i) return it;
        const next = { ...it };
        if (hex) next["tone"] = hex;
        else delete next["tone"];
        return next;
      }),
    );

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-black/50">{title}</div>
        {rows.some((r) => itemTone(r)) && (
          <button
            type="button"
            onClick={() => onChange(rows.map(({ tone: _tone, ...rest }) => rest))}
            className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/55 hover:border-black/30"
          >
            Reset all
          </button>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-black/45">
        Each row's wash gradient, rail and hairline follow this colour. Contrast is auto-corrected
        for light and dark appearance, and the choice carries into PowerPoint and PDF exports.
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row, i) => {
          const name =
            (typeof row["label"] === "string" && row["label"]) ||
            (typeof row["title"] === "string" && row["title"]) ||
            (typeof row["meta"] === "string" && row["meta"]) ||
            `${rowLabel} ${i + 1}`;
          return (
            <div key={i} className="rounded-xl border border-black/10 p-2">
              <div className="mb-1.5 truncate text-xs font-semibold text-black/75">{name}</div>
              <ItemToneRow tone={itemTone(row)} onChange={(hex) => setTone(i, hex)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
