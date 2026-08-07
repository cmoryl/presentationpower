import { useMemo } from "react";
import {
  STAT_SHAPE_PRESETS,
  isStatShape,
  statShapePreset,
  type StatLayout,
  type StatShape,
} from "@/lib/stat-layouts";
import { STAT_ICON_PRESETS, isStatIconName, type StatIconName } from "@/lib/stat-icons";

const FAMILY_LABELS: Record<string, string> = {
  baseline: "Baseline",
  counterform: "Counterform",
  gauge: "Gauges",
  frame: "Frames",
  editorial: "Editorial",
  icon: "Oversized icons",
};

const selectClass =
  "w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[11px] font-medium text-[#03002C] outline-none transition focus:border-[#003FC7]";

/**
 * Slide-level stat typography control: pick the figure shape (including the
 * oversized-icon treatments) and, for icon shapes, the icon itself. Writes a
 * `statLayout` fragment onto the slide content, which `resolveStatLayout`
 * layers over the module's intentional default.
 */
export function StatStylePicker({
  moduleLayout,
  value,
  onChange,
  onReset,
}: {
  /** The module's intentional default (shown as the inherited option). */
  moduleLayout: StatLayout;
  /** Current slide-level override, if any. */
  value?: Partial<StatLayout> | null;
  onChange: (patch: Partial<StatLayout>) => void;
  onReset: () => void;
}) {
  const shape: StatShape | "inherit" = value?.shape ?? "inherit";
  const effectiveShape = value?.shape ?? moduleLayout.shape ?? "auto";
  const isIcon = effectiveShape.startsWith("icon-");
  const preset = statShapePreset(effectiveShape);
  const icon: StatIconName | "auto" = value?.icon ?? moduleLayout.icon ?? "auto";
  const progress = value?.progress ?? moduleLayout.progress ?? 0.72;

  const grouped = useMemo(() => {
    const out = new Map<string, typeof STAT_SHAPE_PRESETS>();
    for (const p of STAT_SHAPE_PRESETS) {
      const list = out.get(p.family) ?? [];
      list.push(p);
      out.set(p.family, list);
    }
    return [...out.entries()];
  }, []);

  const iconGroups = useMemo(() => {
    const out = new Map<string, typeof STAT_ICON_PRESETS>();
    for (const p of STAT_ICON_PRESETS) {
      const list = out.get(p.group) ?? [];
      list.push(p);
      out.set(p.group, list);
    }
    return [...out.entries()];
  }, []);

  return (
    <div className="flex w-[248px] flex-col gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40">
          Figure shape
        </span>
        <select
          className={selectClass}
          value={shape}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "inherit") onReset();
            else if (isStatShape(v)) onChange({ shape: v });
          }}
        >
          <option value="inherit">
            Module default — {statShapePreset(moduleLayout.shape ?? "auto").label}
          </option>
          {grouped.map(([family, list]) => (
            <optgroup key={family} label={FAMILY_LABELS[family] ?? family}>
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <p className="text-[10px] leading-snug text-black/45">{preset.description}</p>

      {isIcon && (
        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40">
            Oversized icon
          </span>
          <select
            className={selectClass}
            value={icon}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "auto") onChange({ icon: undefined });
              else if (isStatIconName(v)) onChange({ icon: v });
            }}
          >
            <option value="auto">Auto — inferred from the stat</option>
            {iconGroups.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      {preset.usesProgress && (
        <label className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.16em] text-black/40">
            Sweep
            <span className="tabular-nums text-black/55">{Math.round(progress * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(progress * 100)}
            onChange={(e) => onChange({ progress: Number(e.target.value) / 100 })}
            aria-label="Stat gauge sweep"
            className="w-full accent-[#003FC7]"
          />
        </label>
      )}

      {value && Object.keys(value).length > 0 && (
        <button
          type="button"
          onClick={onReset}
          className="self-start rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-medium text-black/60 transition hover:border-[#003FC7] hover:text-[#003FC7]"
        >
          ⟲ Use module default
        </button>
      )}
    </div>
  );
}
