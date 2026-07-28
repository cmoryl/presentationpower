import * as React from "react";
import {
  readFunnelStyle,
  resolveFunnelStyle,
  funnelBandBackground,
  funnelSheenBackground,
  funnelGhostOpacity,
  funnelChipStyle,
  FUNNEL_SHEEN_OPTIONS,
  FUNNEL_GHOST_OPTIONS,
  FUNNEL_CHIP_OPTIONS,
  type FunnelStyle,
} from "@/lib/funnel-style";
import type { BrandMode } from "@/lib/taxonomy";

/**
 * Per-slide funnel appearance controls (MV-FUNNEL).
 * Every field falls back to the active brand theme, so clearing a value
 * restores the brand default rather than a hardcoded colour.
 */
export function FunnelStylePanel({
  brand,
  value,
  onChange,
}: {
  brand: BrandMode;
  value: unknown;
  onChange: (next: FunnelStyle) => void;
}) {
  const id = React.useId();
  const raw = readFunnelStyle(value);
  const resolved = resolveFunnelStyle(value, brand);

  const set = (patch: Partial<FunnelStyle>) => onChange({ ...raw, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <ColorField
          id={`${id}-from`}
          label="Band start"
          hint="Brand primary"
          value={raw.colorFrom}
          fallback={brand.tokens.primary}
          onChange={(v) => set({ colorFrom: v })}
        />
        <ColorField
          id={`${id}-to`}
          label="Band end"
          hint="Brand accent"
          value={raw.colorTo}
          fallback={brand.tokens.accent}
          onChange={(v) => set({ colorTo: v })}
        />
      </div>

      <label className="block text-xs" htmlFor={`${id}-fade`}>
        <span className="mb-1 flex items-center justify-between font-medium text-black/70">
          <span>Depth fade</span>
          <span className="tabular-nums text-black/45">{resolved.fade}%</span>
        </span>
        <input
          id={`${id}-fade`}
          type="range"
          min={0}
          max={60}
          step={2}
          value={resolved.fade}
          onChange={(e) => set({ fade: Number(e.target.value) })}
          className="w-full accent-[#003FC7]"
        />
        <span className="mt-1 block text-[11px] text-black/50">
          How much lower stages lighten toward the bottom of the funnel.
        </span>
      </label>

      <SelectField
        id={`${id}-sheen`}
        label="Sheen intensity"
        value={resolved.sheen}
        options={FUNNEL_SHEEN_OPTIONS}
        onChange={(v) => set({ sheen: v as FunnelStyle["sheen"] })}
      />
      <SelectField
        id={`${id}-ghost`}
        label="Ghost numerals"
        value={resolved.ghost}
        options={FUNNEL_GHOST_OPTIONS}
        onChange={(v) => set({ ghost: v as FunnelStyle["ghost"] })}
      />
      <SelectField
        id={`${id}-chip`}
        label="Drop-off chip style"
        value={resolved.chipStyle}
        options={FUNNEL_CHIP_OPTIONS}
        onChange={(v) => set({ chipStyle: v as FunnelStyle["chipStyle"] })}
      />

      {/* live preview */}
      <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
        <div className="mb-2 text-[11px] uppercase tracking-widest text-black/45">Preview</div>
        <div className="space-y-1.5">
          {[0, 0.5, 1].map((depth, i) => (
            <React.Fragment key={depth}>
              {i > 0 && (
                <div className="flex justify-center">
                  <span
                    className="rounded-full uppercase"
                    style={{
                      ...funnelChipStyle(resolved, "#03002C", true),
                      fontSize: 9,
                      padding: "2px 8px",
                      letterSpacing: "0.16em",
                    }}
                  >
                    ▼ 24% drop-off
                  </span>
                </div>
              )}
              <div
                className="relative mx-auto overflow-hidden rounded-[3px]"
                style={{
                  width: `${100 - depth * 34}%`,
                  height: 34,
                  background: funnelBandBackground(resolved, depth),
                }}
              >
                <span
                  className="pointer-events-none absolute left-2 top-[-8px] font-bold tabular-nums leading-none text-white"
                  style={{ fontSize: 42, opacity: funnelGhostOpacity(resolved, false) }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="pointer-events-none absolute inset-0"
                  style={{ background: funnelSheenBackground(resolved, false) }}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange({})}
        className="text-[11px] uppercase tracking-widest text-black/40 hover:text-black"
      >
        Reset to brand theme
      </button>
    </div>
  );
}

function ColorField({
  id,
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value?: string;
  fallback: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <label className="block text-xs" htmlFor={id}>
      <span className="mb-1 block font-medium text-black/70">{label}</span>
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          aria-label={`${label} colour`}
          value={value || fallback}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded-lg border border-black/15 bg-white p-1"
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="flex-1 truncate rounded-lg border border-black/10 px-2 py-1.5 text-left text-[11px] text-black/55 hover:bg-black/5"
        >
          {value ? `${value} · clear` : hint}
        </button>
      </span>
    </label>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs" htmlFor={id}>
      <span className="mb-1 block font-medium text-black/70">{label}</span>
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
