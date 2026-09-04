// Editor controls for the orbit rings on the growth-proof split module: ring
// colour, ring weight and the orbit dot treatment, authored separately for the
// light face and the dark face.

import { useState } from "react";
import {
  MAX_DOT_SIZE,
  MAX_RING_OPACITY,
  MAX_RING_WIDTH,
  MIN_DOT_SIZE,
  MIN_RING_OPACITY,
  MIN_RING_WIDTH,
  ORBIT_DOT_STYLES,
  isDefaultOrbitFace,
  patchOrbitStyle,
  resetOrbitFace,
  resolveOrbitStyle,
  type OrbitFaceStyle,
  type OrbitStyle,
} from "@/lib/orbit-style";

const SWATCHES = [
  { id: "accent", value: null as string | null, label: "Brand accent" },
  { id: "blue", value: "#003FC7", label: "Blue 500" },
  { id: "aqua", value: "#A1FBF9", label: "Aqua" },
  { id: "lavender", value: "#C2A3FF", label: "Lavender" },
  { id: "yellow", value: "#FFEB66", label: "Yellow" },
  { id: "green", value: "#A6FA87", label: "Green" },
  { id: "pink", value: "#EC388A", label: "Pink" },
  { id: "white", value: "#FFFFFF", label: "White" },
  { id: "navy", value: "#03002C", label: "Blue 800" },
];

function Swatches({
  current,
  onPick,
  label,
}: {
  current: string | null;
  onPick: (v: string | null) => void;
  label: string;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {SWATCHES.map((sw) => {
        const active = (current ?? null) === sw.value;
        return (
          <button
            key={sw.id}
            type="button"
            onClick={() => onPick(sw.value)}
            aria-label={`${label}: ${sw.label}`}
            aria-pressed={active}
            title={sw.label}
            className={`h-6 w-6 rounded-full border transition ${
              active ? "border-[#003FC7] ring-2 ring-[#003FC7]/30" : "border-black/15"
            }`}
            style={
              sw.value
                ? { backgroundColor: sw.value }
                : {
                    background:
                      "conic-gradient(#003FC7, #A1FBF9, #C2A3FF, #FFEB66, #EC388A, #003FC7)",
                  }
            }
          />
        );
      })}
    </div>
  );
}

export function OrbitStylePanel({
  style,
  onChange,
}: {
  style: unknown;
  onChange: (next: OrbitStyle) => void;
}) {
  const [face, setFace] = useState<"light" | "dark">("light");
  const resolved = resolveOrbitStyle(style);
  const f = resolved[face];
  const set = (patch: Partial<OrbitFaceStyle>) => onChange(patchOrbitStyle(style, face, patch));

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[#03002C]">Ring styling</h3>
          <p className="text-[11px] text-black/55">
            Ring colour, thickness and orbit dots — set separately for each face.
          </p>
        </div>
        {!isDefaultOrbitFace(f, face) && (
          <button
            type="button"
            onClick={() => onChange(resetOrbitFace(style, face))}
            className="rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-medium text-black/60 transition hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            ⟲ Reset
          </button>
        )}
      </div>

      <div
        className="mt-3 inline-flex rounded-full border border-black/10 p-0.5"
        role="tablist"
        aria-label="Theme face"
      >
        {(["light", "dark"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={face === m}
            onClick={() => setFace(m)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${
              face === m ? "bg-[#003FC7] text-white" : "text-black/60 hover:text-[#003FC7]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Ring colour
        </span>
        <Swatches
          label="Ring colour"
          current={f.ringColor}
          onPick={(v) => set({ ringColor: v })}
        />
      </div>

      <label className="mt-4 flex flex-col gap-1">
        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Ring thickness
          <span className="tabular-nums text-black/60">{f.ringWidth}px</span>
        </span>
        <input
          type="range"
          min={MIN_RING_WIDTH}
          max={MAX_RING_WIDTH}
          step={1}
          value={f.ringWidth}
          onChange={(e) => set({ ringWidth: Number(e.target.value) })}
          aria-label="Ring thickness"
          className="w-full accent-[#003FC7]"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1">
        <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Ring strength
          <span className="tabular-nums text-black/60">{f.ringOpacity}%</span>
        </span>
        <input
          type="range"
          min={MIN_RING_OPACITY}
          max={MAX_RING_OPACITY}
          step={5}
          value={f.ringOpacity}
          onChange={(e) => set({ ringOpacity: Number(e.target.value) })}
          aria-label="Ring strength"
          className="w-full accent-[#003FC7]"
        />
      </label>

      <div className="mt-5 border-t border-black/5 pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Orbit dots
        </span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ORBIT_DOT_STYLES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => set({ dotStyle: opt.id })}
              aria-pressed={f.dotStyle === opt.id}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                f.dotStyle === opt.id
                  ? "border-[#003FC7] bg-[#003FC7]/8 text-[#003FC7]"
                  : "border-black/10 text-black/60 hover:border-[#003FC7] hover:text-[#003FC7]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Swatches label="Dot colour" current={f.dotColor} onPick={(v) => set({ dotColor: v })} />

        <label className="mt-3 flex flex-col gap-1">
          <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
            Dot size
            <span className="tabular-nums text-black/60">{f.dotSize}px</span>
          </span>
          <input
            type="range"
            min={MIN_DOT_SIZE}
            max={MAX_DOT_SIZE}
            step={1}
            value={f.dotSize}
            onChange={(e) => set({ dotSize: Number(e.target.value) })}
            disabled={f.dotStyle === "none"}
            aria-label="Orbit dot size"
            className="w-full accent-[#003FC7] disabled:opacity-40"
          />
        </label>
      </div>
    </section>
  );
}
