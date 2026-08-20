// Masthead rule + title-block typography controls for the hero inspector.
// These map 1:1 onto `section.rule` and `section.titleType`, which the hero
// renderers read — so what the panel shows is what prints and exports.

import type { PrintHeroRule, PrintHeroSection, PrintHeroTitleType } from "@/lib/print-assets.types";

const box =
  "w-full rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs text-[#03002C] focus:border-[#003FC7] focus:outline-none dark:border-white/10 dark:bg-white/[0.03] dark:text-white";

const RULE_DEFAULTS = { weight: 4, gap: 16 };
const TYPE_DEFAULTS = {
  titlePx: 30,
  titleWeight: 700,
  titleTracking: -20,
  titleLeading: 106,
  eyebrowPx: 9.5,
  eyebrowTracking: 200,
  summaryPx: 12,
  summaryLeading: 140,
};

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-black/10 p-2 dark:border-white/10">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45 dark:text-white/45">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Slider({
  label,
  value,
  fallback,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number | undefined;
  fallback: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const v = value ?? fallback;
  return (
    <label className="block text-[10px] text-black/55 dark:text-white/55">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-semibold text-black/70 dark:text-white/70">
          {v}
          {suffix ?? ""}
          {value === undefined ? " (auto)" : ""}
        </span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#003FC7]"
      />
    </label>
  );
}

export function HeroRuleTypeControls({
  section,
  onPatch,
}: {
  section: PrintHeroSection;
  onPatch: (p: Partial<PrintHeroSection>) => void;
}) {
  const rule = section.rule ?? {};
  const type = section.titleType ?? {};
  const patchRule = (p: Partial<PrintHeroRule>) => onPatch({ rule: { ...rule, ...p } });
  const patchType = (p: Partial<PrintHeroTitleType>) => onPatch({ titleType: { ...type, ...p } });

  return (
    <div className="space-y-2">
      <Group label="Masthead rule">
        <Slider
          label="Thickness"
          value={rule.weight}
          fallback={RULE_DEFAULTS.weight}
          min={0}
          max={16}
          suffix="px"
          onChange={(weight) => patchRule({ weight })}
        />
        <Slider
          label="Space below rule"
          value={rule.gap}
          fallback={RULE_DEFAULTS.gap}
          min={0}
          max={48}
          suffix="px"
          onChange={(gap) => patchRule({ gap })}
        />
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <span className="text-[10px] text-black/55 dark:text-white/55">
            Rule colour {rule.color ? "" : "(accent)"}
          </span>
          <span className="flex items-center gap-1">
            <input
              type="color"
              aria-label="Rule colour"
              value={rule.color ?? "#003FC7"}
              onChange={(e) => patchRule({ color: e.target.value })}
              className="h-6 w-8 shrink-0 cursor-pointer rounded border border-black/10 bg-transparent dark:border-white/10"
            />
            {rule.color ? (
              <button
                type="button"
                onClick={() => patchRule({ color: undefined })}
                className="text-[10px] font-medium text-[#003FC7] hover:underline"
              >
                Reset
              </button>
            ) : null}
          </span>
        </div>
        <label className="flex items-center gap-1.5 text-[10px] text-black/60 dark:text-white/60">
          <input
            type="checkbox"
            checked={rule.hairline ?? true}
            onChange={(e) => patchRule({ hairline: e.target.checked })}
          />
          Closing hairline under the title block
        </label>
        {(rule.hairline ?? true) && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <span className="text-[10px] text-black/55 dark:text-white/55">
              Hairline colour {rule.hairlineColor ? "" : "(auto)"}
            </span>
            <span className="flex items-center gap-1">
              <input
                type="color"
                aria-label="Hairline colour"
                value={rule.hairlineColor ?? "#C9CDD6"}
                onChange={(e) => patchRule({ hairlineColor: e.target.value })}
                className="h-6 w-8 shrink-0 cursor-pointer rounded border border-black/10 bg-transparent dark:border-white/10"
              />
              {rule.hairlineColor ? (
                <button
                  type="button"
                  onClick={() => patchRule({ hairlineColor: undefined })}
                  className="text-[10px] font-medium text-[#003FC7] hover:underline"
                >
                  Reset
                </button>
              ) : null}
            </span>
          </div>
        )}
      </Group>

      <Group label="Title block type">
        <Slider
          label="Title size"
          value={type.titlePx}
          fallback={TYPE_DEFAULTS.titlePx}
          min={16}
          max={64}
          step={0.5}
          suffix="px"
          onChange={(titlePx) => patchType({ titlePx })}
        />
        <label className="block text-[10px] text-black/55 dark:text-white/55">
          Title weight
          <select
            aria-label="Title weight"
            className={box}
            value={String(type.titleWeight ?? TYPE_DEFAULTS.titleWeight)}
            onChange={(e) => patchType({ titleWeight: Number(e.target.value) })}
          >
            {[500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <Slider
          label="Title tracking"
          value={type.titleTracking}
          fallback={TYPE_DEFAULTS.titleTracking}
          min={-60}
          max={60}
          suffix="/1000em"
          onChange={(titleTracking) => patchType({ titleTracking })}
        />
        <Slider
          label="Title leading"
          value={type.titleLeading}
          fallback={TYPE_DEFAULTS.titleLeading}
          min={90}
          max={150}
          suffix="%"
          onChange={(titleLeading) => patchType({ titleLeading })}
        />
        <label className="flex items-center gap-1.5 text-[10px] text-black/60 dark:text-white/60">
          <input
            type="checkbox"
            checked={type.titleCase === "upper"}
            onChange={(e) => patchType({ titleCase: e.target.checked ? "upper" : "none" })}
          />
          Set title in all caps
        </label>
        <Slider
          label="Eyebrow size"
          value={type.eyebrowPx}
          fallback={TYPE_DEFAULTS.eyebrowPx}
          min={7}
          max={16}
          step={0.5}
          suffix="px"
          onChange={(eyebrowPx) => patchType({ eyebrowPx })}
        />
        <Slider
          label="Eyebrow tracking"
          value={type.eyebrowTracking}
          fallback={TYPE_DEFAULTS.eyebrowTracking}
          min={0}
          max={400}
          step={10}
          suffix="/1000em"
          onChange={(eyebrowTracking) => patchType({ eyebrowTracking })}
        />
        <Slider
          label="Summary size"
          value={type.summaryPx}
          fallback={TYPE_DEFAULTS.summaryPx}
          min={8}
          max={22}
          step={0.5}
          suffix="px"
          onChange={(summaryPx) => patchType({ summaryPx })}
        />
        <Slider
          label="Summary leading"
          value={type.summaryLeading}
          fallback={TYPE_DEFAULTS.summaryLeading}
          min={110}
          max={175}
          suffix="%"
          onChange={(summaryLeading) => patchType({ summaryLeading })}
        />
        {(section.rule || section.titleType) && (
          <button
            type="button"
            onClick={() => onPatch({ rule: undefined, titleType: undefined })}
            className="text-[11px] font-medium text-[#003FC7] hover:underline"
          >
            Reset rule & type to the template defaults
          </button>
        )}
      </Group>
    </div>
  );
}
