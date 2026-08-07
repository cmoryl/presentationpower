// Deck-wide reinterpretation controls: design style, typography rhythm and a
// colour lock applied to every slide. Presentational only — the parent owns the
// state and re-runs the design pass when it changes. Named presets are stored
// per-device so a reviewer can reuse a preferred combination.

import { useState } from "react";
import { Bookmark, Check, Lock, Palette, Trash2, Type } from "lucide-react";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import {
  DESIGN_STYLES,
  TYPE_RHYTHMS,
  designStyle,
  typeRhythm,
  type ColorLock,
} from "@/lib/reinterpret-style";
import { useReinterpretPresets } from "@/lib/reinterpret-presets";

export type ReinterpretControlsValue = {
  styleId: string;
  rhythmId: string;
  lock: ColorLock;
};


/** Accent choices — the brand palette, so a lock can never leave the system. */
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

export function ReinterpretControls({
  value,
  onChange,
  brandModeId,
}: {
  value: ReinterpretControlsValue;
  onChange: (next: ReinterpretControlsValue) => void;
  brandModeId: string;
}) {
  const brand = byId(BRAND_MODES, brandModeId);
  const style = designStyle(value.styleId);
  const rhythm = typeRhythm(value.rhythmId);
  const set = (patch: Partial<ReinterpretControlsValue>) => onChange({ ...value, ...patch });

  const { presets, save, remove } = useReinterpretPresets();
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState("");

  const matchesValue = (p: (typeof presets)[number]) =>
    p.styleId === value.styleId &&
    p.rhythmId === value.rhythmId &&
    (p.lock.accent ?? "") === (value.lock.accent ?? "") &&
    (p.lock.mode ?? "") === (value.lock.mode ?? "");

  const commitSave = () => {
    if (!draftName.trim()) return;
    save(draftName, { styleId: value.styleId, rhythmId: value.rhythmId, lock: value.lock });
    setDraftName("");
    setNaming(false);
  };

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      {/* Named presets */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-black/10 pb-3">
        <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/45">
          <Bookmark size={11} /> Presets
        </span>
        {presets.length === 0 && !naming && (
          <span className="text-[11px] text-black/40">None saved yet.</span>
        )}
        {presets.map((p) => {
          const active = matchesValue(p);
          return (
            <span
              key={p.id}
              className={`flex items-center gap-1 rounded-full border pl-2.5 pr-1 py-1 text-[11px] ${
                active
                  ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                  : "border-black/15 bg-white text-black/60"
              }`}
            >
              <button
                type="button"
                onClick={() => set({ styleId: p.styleId, rhythmId: p.rhythmId, lock: p.lock })}
                title={`Apply preset “${p.name}”`}
                className="flex items-center gap-1 hover:text-[#003FC7]"
              >
                {active && <Check size={10} />}
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Delete preset ${p.name}`}
                title="Delete preset"
                className="rounded-full p-0.5 text-black/35 hover:bg-black/5 hover:text-[#E53D2E]"
              >
                <Trash2 size={10} />
              </button>
            </span>
          );
        })}
        {naming ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitSave();
                if (e.key === "Escape") {
                  setNaming(false);
                  setDraftName("");
                }
              }}
              placeholder="Preset name"
              aria-label="Preset name"
              className="w-32 rounded-full border border-black/15 px-2.5 py-1 text-[11px] text-[#03002C]"
            />
            <button
              type="button"
              onClick={commitSave}
              className="rounded-full border border-[#003FC7] bg-[#003FC7] px-2.5 py-1 text-[11px] text-white"
            >
              Save
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="rounded-full border border-dashed border-black/20 px-2.5 py-1 text-[11px] text-black/55 hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            + Save current
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">

        {/* Design style */}
        <div>
          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/45">
            <Palette size={11} /> Design style
          </label>
          <select
            value={value.styleId}
            onChange={(e) => set({ styleId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-[#03002C]"
          >
            {DESIGN_STYLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] leading-snug text-black/45">{style.description}</p>
        </div>

        {/* Typography rhythm */}
        <div>
          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/45">
            <Type size={11} /> Typography lock
          </label>
          <select
            value={value.rhythmId}
            onChange={(e) => set({ rhythmId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-[#03002C]"
          >
            {TYPE_RHYTHMS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] leading-snug text-black/45">
            {rhythm.description}
            {rhythm.titleChars > 0 &&
              ` Headlines ≤ ${rhythm.titleChars} chars, up to ${rhythm.maxBullets} bullets.`}
          </p>
        </div>

        {/* Colour lock */}
        <div>
          <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/45">
            <Lock size={11} /> Colour lock
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => set({ lock: { ...value.lock, accent: undefined } })}
              title={`Brand default${brand ? ` · ${brand.name}` : ""}`}
              className={`rounded-full border px-2 py-1 text-[11px] ${
                value.lock.accent
                  ? "border-black/15 bg-white text-black/55 hover:border-[#003FC7]"
                  : "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
              }`}
            >
              Brand default
            </button>
            {ACCENTS.map((a) => {
              const active = value.lock.accent === a.hex;
              return (
                <button
                  key={a.hex}
                  type="button"
                  aria-label={`Lock accent to ${a.label}`}
                  aria-pressed={active}
                  title={a.label}
                  onClick={() => set({ lock: { ...value.lock, accent: a.hex } })}
                  className={`h-6 w-6 rounded-full border-2 transition ${
                    active ? "border-[#03002C] scale-110" : "border-black/10 hover:border-black/30"
                  }`}
                  style={{ background: a.hex }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  set({ lock: { ...value.lock, mode: value.lock.mode === m ? undefined : m } })
                }
                className={`rounded-full border px-2.5 py-1 text-[11px] capitalize ${
                  value.lock.mode === m
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/15 bg-white text-black/55 hover:border-[#003FC7] hover:text-[#003FC7]"
                }`}
              >
                {m} slides
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-black/45">
            Applied to every slide in the built deck.
          </p>
        </div>
      </div>
    </div>
  );
}
