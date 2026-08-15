// One-off overrides for a single deck run: palette, box/card layout and
// backdrop. These outrank the imported knowledge map and the chosen skin.
import { useState } from "react";
import { toast } from "sonner";
import {
  BACKDROP_OVERRIDE_LABEL,
  OVERRIDE_BACKDROPS,
  OVERRIDE_SHAPES,
  SHAPE_OVERRIDE_LABEL,
  designOverridesSummary,
  isEmptyOverrides,
  readStoredDesignOverrides,
  writeStoredDesignOverrides,
  type DesignOverrides,
  type OverrideBackdrop,
  type OverrideCardShape,
} from "@/lib/agent/design-overrides";

const SWATCH_FIELDS: { key: keyof NonNullable<DesignOverrides["palette"]>; label: string; fallback: string }[] = [
  { key: "background", label: "Background", fallback: "#03002C" },
  { key: "ink", label: "Text", fallback: "#FFFFFF" },
  { key: "accent", label: "Accent", fallback: "#003FC7" },
  { key: "accent2", label: "Pop", fallback: "#A1FBF9" },
];

export function AgentDesignOverrides({
  threadId,
  variant = "light",
  onChange,
}: {
  threadId?: string;
  variant?: "light" | "dark";
  onChange?: (overrides: DesignOverrides | null) => void;
}) {
  const [overrides, setOverrides] = useState<DesignOverrides>(() => readStoredDesignOverrides(threadId) ?? {});
  const [open, setOpen] = useState(false);
  const dark = variant === "dark";
  const active = !isEmptyOverrides(overrides);

  const commit = (next: DesignOverrides) => {
    setOverrides(next);
    writeStoredDesignOverrides(threadId, next);
    onChange?.(isEmptyOverrides(next) ? null : next);
  };

  const setPalette = (key: keyof NonNullable<DesignOverrides["palette"]>, value?: string) => {
    const palette = { ...(overrides.palette ?? {}) };
    if (value) palette[key] = value;
    else delete palette[key];
    commit({ ...overrides, palette: Object.keys(palette).length ? palette : undefined });
  };

  const reset = () => {
    commit({});
    toast.success("Design overrides cleared — back to the knowledge map.");
  };

  const label = `text-[10px] font-semibold uppercase tracking-widest ${dark ? "text-white/45" : "text-[#03002C]/45"}`;
  const btn = `rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
    dark
      ? "border-white/10 bg-white/[0.05] text-white/75 hover:border-white/30 hover:text-white"
      : "border-black/10 bg-white text-[#03002C]/75 hover:border-[#003FC7] hover:text-[#03002C]"
  }`;
  const field = `w-full rounded-lg border px-2 py-1.5 text-[11px] outline-none transition ${
    dark
      ? "border-white/10 bg-[#03002C]/40 text-white focus:border-[#A1FBF9]"
      : "border-black/10 bg-white text-[#03002C] focus:border-[#003FC7]"
  }`;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={label}>Overrides for this deck</span>
        <button type="button" className={btn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Done" : active ? "Edit overrides" : "Override look"}
        </button>
        {active && (
          <button type="button" className={btn} onClick={reset}>
            Reset
          </button>
        )}
      </div>

      {open && (
        <div
          className={`space-y-3 rounded-xl border p-3 ${
            dark ? "border-white/10 bg-white/[0.04]" : "border-black/[0.06] bg-white/70"
          }`}
        >
          {/* palette */}
          <div className="space-y-1.5">
            <span className={label}>Palette</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SWATCH_FIELDS.map((f) => {
                const value = overrides.palette?.[f.key];
                return (
                  <div key={f.key} className="min-w-0">
                    <label
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                        dark ? "border-white/10 bg-[#03002C]/40" : "border-black/10 bg-white"
                      }`}
                    >
                      <input
                        type="color"
                        aria-label={`${f.label} color`}
                        value={value ?? f.fallback}
                        onChange={(e) => setPalette(f.key, e.target.value)}
                        className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                      />
                      <span className={`truncate text-[11px] ${dark ? "text-white/75" : "text-[#03002C]/75"}`}>
                        {f.label}
                      </span>
                    </label>
                    {value && (
                      <button
                        type="button"
                        onClick={() => setPalette(f.key, undefined)}
                        className={`mt-1 text-[10px] underline-offset-2 hover:underline ${
                          dark ? "text-white/45" : "text-[#03002C]/45"
                        }`}
                      >
                        clear {value}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* mode + geometry */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <span className={label}>Mode</span>
              <select
                aria-label="Deck mode"
                className={field}
                value={overrides.mode ?? ""}
                onChange={(e) => commit({ ...overrides, mode: (e.target.value || undefined) as DesignOverrides["mode"] })}
              >
                <option value="">Let the agent decide</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="space-y-1">
              <span className={label}>Box layout</span>
              <select
                aria-label="Box and card layout"
                className={field}
                value={overrides.cardShape ?? ""}
                onChange={(e) =>
                  commit({ ...overrides, cardShape: (e.target.value || undefined) as OverrideCardShape | undefined })
                }
              >
                <option value="">Follow the knowledge map</option>
                {OVERRIDE_SHAPES.map((s) => (
                  <option key={s} value={s}>
                    {SHAPE_OVERRIDE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className={label}>Corners</span>
              <select
                aria-label="Corner treatment"
                className={field}
                value={overrides.cornerRadius ?? ""}
                onChange={(e) =>
                  commit({
                    ...overrides,
                    cornerRadius: (e.target.value || undefined) as DesignOverrides["cornerRadius"],
                  })
                }
              >
                <option value="">Follow the knowledge map</option>
                <option value="sharp">Sharp</option>
                <option value="soft">Soft</option>
                <option value="pill">Pill</option>
              </select>
            </div>
          </div>

          {/* backdrop */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <span className={label}>Backdrop</span>
              <select
                aria-label="Backdrop motif"
                className={field}
                value={overrides.backdrop ?? ""}
                onChange={(e) =>
                  commit({ ...overrides, backdrop: (e.target.value || undefined) as OverrideBackdrop | undefined })
                }
              >
                <option value="">Follow the knowledge map</option>
                {OVERRIDE_BACKDROPS.map((b) => (
                  <option key={b} value={b}>
                    {BACKDROP_OVERRIDE_LABEL[b]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className={label}>
                Backdrop intensity{overrides.backdropIntensity !== undefined ? ` — ${overrides.backdropIntensity}%` : ""}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  aria-label="Backdrop intensity"
                  value={overrides.backdropIntensity ?? 50}
                  onChange={(e) => commit({ ...overrides, backdropIntensity: Number(e.target.value) })}
                  className="h-1.5 w-full cursor-pointer accent-[#003FC7]"
                />
                {overrides.backdropIntensity !== undefined && (
                  <button
                    type="button"
                    onClick={() => commit({ ...overrides, backdropIntensity: undefined })}
                    className={`shrink-0 text-[10px] underline-offset-2 hover:underline ${
                      dark ? "text-white/45" : "text-[#03002C]/45"
                    }`}
                  >
                    auto
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className={label}>Extra direction (optional)</span>
            <textarea
              rows={2}
              maxLength={600}
              value={overrides.notes ?? ""}
              onChange={(e) => commit({ ...overrides, notes: e.target.value || undefined })}
              placeholder="e.g. keep covers full-bleed, no photography, wide gutters"
              className={`${field} resize-y ${dark ? "placeholder:text-white/35" : "placeholder:text-[#03002C]/35"}`}
            />
          </div>
        </div>
      )}

      {active && !open && (
        <p className={`text-[11px] leading-snug ${dark ? "text-white/60" : "text-[#03002C]/60"}`}>
          Overriding: {designOverridesSummary(overrides)} — applied over the knowledge map for this deck.
        </p>
      )}
    </div>
  );
}
