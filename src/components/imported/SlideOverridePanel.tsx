// Per-slide override of the deck-wide reinterpretation controls.
//
// Deck-wide style / typography / colour locks steer every slide; this panel
// lets a reviewer break one slide out of the deck rhythm before approving —
// e.g. a KPI layout on a single page inside an otherwise editorial deck.
// Presentational only: the parent owns the override map.

import { SlidersHorizontal, X } from "lucide-react";
import {
  DESIGN_STYLES,
  TYPE_RHYTHMS,
  type SlideStyleOverride,
} from "@/lib/reinterpret-style";

/** Same brand accents offered by the deck-wide colour lock. */
const ACCENTS: Array<{ hex: string; label: string }> = [
  { hex: "#003fc7", label: "Blue 500" },
  { hex: "#a1fbf9", label: "Aqua" },
  { hex: "#c2a3ff", label: "Lavender" },
  { hex: "#ffeb66", label: "Yellow" },
  { hex: "#a6fa87", label: "Green" },
  { hex: "#ff9b70", label: "Peach" },
  { hex: "#ec388a", label: "Pink" },
  { hex: "#e53d2e", label: "Red" },
];

export function hasSlideOverride(o: SlideStyleOverride | undefined): boolean {
  return Boolean(
    o && (o.styleId !== undefined || o.rhythmId !== undefined || o.accent !== undefined || o.mode !== undefined),
  );
}

export function SlideOverridePanel({
  value,
  onChange,
  deckStyleId,
  deckRhythmId,
}: {
  value: SlideStyleOverride | undefined;
  /** `undefined` clears every override on this slide. */
  onChange: (next: SlideStyleOverride | undefined) => void;
  deckStyleId: string;
  deckRhythmId: string;
}) {
  const o = value ?? {};
  const set = (patch: SlideStyleOverride) => onChange({ ...o, ...patch });
  const deckStyleLabel = DESIGN_STYLES.find((s) => s.id === deckStyleId)?.label ?? "Deck default";
  const deckRhythmLabel = TYPE_RHYTHMS.find((r) => r.id === deckRhythmId)?.label ?? "Deck default";
  const active = hasSlideOverride(value);

  return (
    <div
      className={`mt-3 rounded-lg border p-3 ${
        active ? "border-[#003FC7]/40 bg-[#E0E8F5]/40" : "border-black/10 bg-black/[0.015]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/45">
          <SlidersHorizontal size={11} /> This slide only
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2 py-0.5 text-[11px] text-black/55 hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            <X size={10} /> Use deck settings
          </button>
        )}
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {/* Design style */}
        <label className="block">
          <span className="text-[11px] text-black/45">Design style</span>
          <select
            value={o.styleId ?? ""}
            onChange={(e) => set({ styleId: e.target.value || undefined })}
            className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-[#03002C]"
          >
            <option value="">Deck · {deckStyleLabel}</option>
            {DESIGN_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {/* Typography rhythm */}
        <label className="block">
          <span className="text-[11px] text-black/45">Typography lock</span>
          <select
            value={o.rhythmId ?? ""}
            onChange={(e) => set({ rhythmId: e.target.value || undefined })}
            className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-[#03002C]"
          >
            <option value="">Deck · {deckRhythmLabel}</option>
            {TYPE_RHYTHMS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        {/* Colour lock */}
        <div>
          <span className="text-[11px] text-black/45">Colour lock</span>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => set({ accent: undefined })}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                o.accent === undefined
                  ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                  : "border-black/15 bg-white text-black/55 hover:border-[#003FC7]"
              }`}
            >
              Deck
            </button>
            <button
              type="button"
              onClick={() => set({ accent: null })}
              title="Brand default accent for this slide"
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                o.accent === null
                  ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                  : "border-black/15 bg-white text-black/55 hover:border-[#003FC7]"
              }`}
            >
              Brand
            </button>
            {ACCENTS.map((a) => (
              <button
                key={a.hex}
                type="button"
                aria-label={`Accent ${a.label} on this slide`}
                aria-pressed={o.accent === a.hex}
                title={a.label}
                onClick={() => set({ accent: a.hex })}
                className={`h-5 w-5 rounded-full border-2 transition ${
                  o.accent === a.hex
                    ? "border-[#03002C] scale-110"
                    : "border-black/10 hover:border-black/30"
                }`}
                style={{ background: a.hex }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set({ mode: o.mode === m ? undefined : m })}
                className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${
                  o.mode === m
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/15 bg-white text-black/55 hover:border-[#003FC7] hover:text-[#003FC7]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
