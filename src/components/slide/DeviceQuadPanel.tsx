/**
 * DeviceQuadPanel — structural + style editor for MV-SHOW-DEVICE-QUAD.
 *
 * Owns the benefit grid (add / remove / reorder two to six icon benefits, each
 * with its own glyph and label) plus the device and tile design knobs. The
 * screen image itself is edited through the unified slide media panel.
 */
import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { IconPicker } from "@/components/IconPicker";
import {
  DEFAULT_QUAD_STYLE,
  MAX_BENEFITS,
  MIN_BENEFITS,
  QUAD_LIMITS,
  addBenefit,
  isDefaultQuadStyle,
  moveBenefit,
  patchBenefit,
  patchQuadStyle,
  readBenefits,
  removeBenefit,
  resolveQuadStyle,
  type QuadBenefit,
  type QuadStyle,
} from "@/lib/showcase-cards";

type Props = {
  benefits: unknown;
  style: unknown;
  deviceKind: unknown;
  deviceTone: unknown;
  brandModeId?: string;
  onChangeBenefits: (rows: QuadBenefit[]) => void;
  onChangeStyle: (style: QuadStyle) => void;
  onChangeField: (field: string, value: unknown) => void;
};

const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-black/30";
const btnCls =
  "inline-flex items-center gap-1 rounded-lg border border-black/15 px-2 py-1 text-xs text-black/70 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-40";
const labelCls = "block text-[11px] uppercase tracking-wider text-black/50";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="mt-1 inline-flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest transition ${
              value === o.id
                ? "border-transparent bg-[#03002C] text-white"
                : "border-black/15 text-black/60 hover:bg-black/5"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DeviceQuadPanel({
  benefits: raw,
  style: rawStyle,
  deviceKind,
  deviceTone,
  brandModeId,
  onChangeBenefits,
  onChangeStyle,
  onChangeField,
}: Props) {
  const rows = React.useMemo(() => readBenefits(raw), [raw]);
  const st = React.useMemo(() => resolveQuadStyle(rawStyle), [rawStyle]);
  const kind = deviceKind === "monitor" ? "monitor" : "laptop";
  const tone = ["graphite", "silver", "ink"].includes(String(deviceTone))
    ? (String(deviceTone) as "graphite" | "silver" | "ink")
    : "silver";

  return (
    <section
      aria-label="Device benefits"
      className="rounded-2xl border border-black/10 bg-white p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-black/50">Benefits</h3>
          <p className="mt-1 text-xs text-black/50">
            {rows.length} of {MAX_BENEFITS} benefits beside the device
          </p>
        </div>
        <button
          type="button"
          className={btnCls}
          disabled={rows.length >= MAX_BENEFITS}
          onClick={() => onChangeBenefits(addBenefit(rows))}
        >
          <Plus size={14} aria-hidden /> Add benefit
        </button>
      </header>

      <div className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="grid items-end gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <label className="block">
              <span className={labelCls}>Benefit {i + 1}</span>
              <input
                className={`${inputCls} mt-1`}
                value={row.label}
                onChange={(e) => onChangeBenefits(patchBenefit(rows, i, { label: e.target.value }))}
              />
            </label>
            <div>
              <span className={labelCls}>Icon</span>
              <div className="mt-1">
                <IconPicker
                  value={row.icon}
                  onChange={(icon) => onChangeBenefits(patchBenefit(rows, i, { icon: icon ?? "" }))}
                  autoLabel={row.label}
                  ai={brandModeId ? { brandModeId } : undefined}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className={btnCls}
                aria-label={`Move benefit ${i + 1} earlier`}
                disabled={i === 0}
                onClick={() => onChangeBenefits(moveBenefit(rows, i, -1))}
              >
                <ArrowUp size={14} aria-hidden />
              </button>
              <button
                type="button"
                className={btnCls}
                aria-label={`Move benefit ${i + 1} later`}
                disabled={i === rows.length - 1}
                onClick={() => onChangeBenefits(moveBenefit(rows, i, 1))}
              >
                <ArrowDown size={14} aria-hidden />
              </button>
              <button
                type="button"
                className={btnCls}
                aria-label={`Remove benefit ${i + 1}`}
                disabled={rows.length <= MIN_BENEFITS}
                onClick={() => onChangeBenefits(removeBenefit(rows, i))}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-black/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs uppercase tracking-widest text-black/50">Layout &amp; design</h4>
          <button
            type="button"
            className={btnCls}
            disabled={isDefaultQuadStyle(rawStyle)}
            onClick={() => onChangeStyle({ ...DEFAULT_QUAD_STYLE })}
          >
            Reset
          </button>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Segmented
            label="Device"
            value={kind}
            options={[
              { id: "laptop", label: "Laptop" },
              { id: "monitor", label: "Monitor" },
            ]}
            onChange={(next) => onChangeField("deviceKind", next)}
          />
          <Segmented
            label="Chassis"
            value={tone}
            options={[
              { id: "silver", label: "Silver" },
              { id: "graphite", label: "Graphite" },
              { id: "ink", label: "Ink" },
            ]}
            onChange={(next) => onChangeField("deviceTone", next)}
          />
          <Segmented
            label="Device side"
            value={st.deviceSide}
            options={[
              { id: "left", label: "Left" },
              { id: "right", label: "Right" },
            ]}
            onChange={(deviceSide) => onChangeStyle(patchQuadStyle(rawStyle, { deviceSide }))}
          />
          <Segmented
            label="Grid columns"
            value={String(st.columns) as "1" | "2"}
            options={[
              { id: "2", label: "Two up" },
              { id: "1", label: "Single column" },
            ]}
            onChange={(v) =>
              onChangeStyle(patchQuadStyle(rawStyle, { columns: v === "1" ? 1 : 2 }))
            }
          />
          <Segmented
            label="Icon tile"
            value={st.tileLook}
            options={[
              { id: "outline", label: "Outlined" },
              { id: "tile", label: "Tinted" },
              { id: "bare", label: "No frame" },
            ]}
            onChange={(tileLook) => onChangeStyle(patchQuadStyle(rawStyle, { tileLook }))}
          />
          <Segmented
            label="Label align"
            value={st.labelAlign}
            options={[
              { id: "center", label: "Centred" },
              { id: "left", label: "Left" },
            ]}
            onChange={(labelAlign) => onChangeStyle(patchQuadStyle(rawStyle, { labelAlign }))}
          />
          <label className="block">
            <span className={labelCls}>
              Device column share <span className="text-black/40">· {st.split.toFixed(2)}×</span>
            </span>
            <input
              className="mt-2 w-full"
              type="range"
              min={QUAD_LIMITS.split.min}
              max={QUAD_LIMITS.split.max}
              step={QUAD_LIMITS.split.step}
              value={st.split}
              onChange={(e) =>
                onChangeStyle(patchQuadStyle(rawStyle, { split: Number(e.target.value) }))
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>
              Icon size <span className="text-black/40">· {Math.round(st.iconScale * 100)}%</span>
            </span>
            <input
              className="mt-2 w-full"
              type="range"
              min={QUAD_LIMITS.iconScale.min}
              max={QUAD_LIMITS.iconScale.max}
              step={QUAD_LIMITS.iconScale.step}
              value={st.iconScale}
              onChange={(e) =>
                onChangeStyle(patchQuadStyle(rawStyle, { iconScale: Number(e.target.value) }))
              }
            />
          </label>
          <label className="block">
            <span className={labelCls}>
              Tile radius <span className="text-black/40">· {st.tileRadius}px</span>
            </span>
            <input
              className="mt-2 w-full"
              type="range"
              min={QUAD_LIMITS.tileRadius.min}
              max={QUAD_LIMITS.tileRadius.max}
              step={QUAD_LIMITS.tileRadius.step}
              value={st.tileRadius}
              onChange={(e) =>
                onChangeStyle(patchQuadStyle(rawStyle, { tileRadius: Number(e.target.value) }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-black/70">
            <input
              type="checkbox"
              checked={st.showTitleRule}
              onChange={(e) =>
                onChangeStyle(patchQuadStyle(rawStyle, { showTitleRule: e.target.checked }))
              }
            />
            Accent rule under the title
          </label>
        </div>
      </div>
    </section>
  );
}
