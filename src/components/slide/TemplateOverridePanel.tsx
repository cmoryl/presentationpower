// TEMPLATE INSPECTOR — per-slide overrides on top of the library defaults.
//
// The section-template library answers "how should a slide in this industry,
// section and reading level look?" for every slide automatically. This panel is
// the escape hatch for the one slide that needs a nudge: read it at a different
// level, swap the backdrop scene, give the headline / body / KPI figure more or
// less voice, push the sheet fill, or loosen the content budget.
//
// Everything here writes a SPARSE override: only the fields the author touches
// are stored, each one is individually resettable, and the library default is
// always shown next to the control so it's obvious what is being overridden.
import * as React from "react";
import { RotateCcw } from "lucide-react";
import {
  TEMPLATE_LEVELS,
  TEMPLATE_TYPE_RANGE,
  clampTemplateType,
  resolveSlideTemplate,
  type LevelRole,
  type ResolvedSlideTemplate,
  type SlideTemplateOverride,
  type TemplateLevel,
} from "@/lib/section-templates";
import { SKIN_SCENES, type SkinScene } from "@/lib/skin-backgrounds";
import type { DeckSlide } from "@/lib/deck-store";

const LEVEL_LABEL: Record<TemplateLevel, string> = {
  headline: "Headline",
  body: "Body",
  kpi: "KPI",
  process: "Process",
  appendix: "Appendix",
};

const TYPE_AXES: Array<{ key: keyof LevelRole["typeScale"]; label: string; hint: string }> = [
  { key: "display", label: "Headline", hint: "Slide title and display type" },
  { key: "body", label: "Body", hint: "Paragraphs, bullets and captions" },
  { key: "figure", label: "KPI figure", hint: "Big stat numbers" },
];

const sceneLabel = (s: SkinScene) => s.replace(/[-_]/g, " ");

function Row({
  label,
  hint,
  overridden,
  onReset,
  children,
}: {
  label: string;
  hint?: string;
  overridden?: boolean;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[#0B2A4A]/70">
          {label}
          {overridden && (
            <span className="ml-1.5 rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[9px] font-medium tracking-normal text-[#003FC7]">
              custom
            </span>
          )}
        </label>
        {overridden && onReset && (
          <button
            type="button"
            onClick={onReset}
            title={`Reset ${label.toLowerCase()} to the library default`}
            className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-[#0B2A4A]/55 hover:bg-[#0B2A4A]/5 hover:text-[#0B2A4A]"
          >
            <RotateCcw size={10} /> Reset
          </button>
        )}
      </div>
      {children}
      {hint && <div className="text-[10px] leading-snug text-[#0B2A4A]/45">{hint}</div>}
    </div>
  );
}

export function TemplateOverridePanel({
  slide,
  industryId,
  onChange,
}: {
  slide: DeckSlide;
  /** Deck `context.designRecipeId` — decides which library cell is the default. */
  industryId?: string | null;
  /** Merge patch into the slide override; `null` clears every override. */
  onChange: (patch: SlideTemplateOverride | null) => void;
}) {
  const t: ResolvedSlideTemplate = React.useMemo(
    () => resolveSlideTemplate({ slide, industryId }),
    [slide, industryId],
  );
  const has = (f: Parameters<typeof t.overridden.includes>[0]) => t.overridden.includes(f);
  const ov = slide.templateOverride ?? {};

  // A partial patch of an already-partial field must not wipe its siblings, so
  // reset-one sends the library value back rather than deleting the key.
  const setType = (axis: keyof LevelRole["typeScale"], px: number | null) =>
    onChange({
      typeScale: {
        [axis]: px === null ? t.defaults.typeScale[axis] : clampTemplateType(axis, px),
      } as Partial<LevelRole["typeScale"]>,
    });

  const fillPct = Math.round((ov.fillBias ?? 1) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] leading-snug text-[#0B2A4A]/55">
          Library default:{" "}
          <span className="font-medium text-[#0B2A4A]/80">
            {LEVEL_LABEL[t.defaults.level]} · {sceneLabel(t.defaults.scene)}
          </span>
          {industryId ? <> · recipe {industryId}</> : null}
        </div>
        {t.overridden.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 rounded-md border border-[#0B2A4A]/15 px-2 py-1 text-[10px] font-medium text-[#0B2A4A]/70 hover:bg-[#0B2A4A]/5"
          >
            Reset all
          </button>
        )}
      </div>

      <Row
        label="Read as"
        hint="Which treatment the slide borrows — headline, body copy, KPI, process or appendix."
        overridden={has("level")}
        onReset={() => onChange({ level: t.defaults.level })}
      >
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => onChange({ level: lv })}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                t.level === lv
                  ? "bg-[#003FC7] text-white"
                  : "border border-[#0B2A4A]/15 text-[#0B2A4A]/70 hover:bg-[#0B2A4A]/5"
              }`}
            >
              {LEVEL_LABEL[lv]}
              {lv === t.defaults.level && t.level !== lv ? " ·" : ""}
            </button>
          ))}
        </div>
      </Row>

      <Row
        label="Background section"
        hint={
          pack
            ? `Pick the backdrop this slide uses. Previews are painted with ${pack.label}, and a picked background always uses the pack accent so the colour stays consistent across the deck.`
            : "Pick the backdrop section this slide uses. A picked background keeps the pack's signature accent."
        }
        overridden={has("scene")}
        onReset={() => onChange({ scene: t.defaults.scene })}
      >
        <div className="grid grid-cols-3 gap-1.5">
          {SKIN_SCENES.map((sc) => {
            const selected = t.scene === sc;
            return (
              <button
                key={sc}
                type="button"
                onClick={() => onChange({ scene: sc })}
                aria-pressed={selected}
                title={`${sceneLabel(sc)}${sc === t.defaults.scene ? " (library default)" : ""}`}
                className={`group overflow-hidden rounded-md border text-left transition ${
                  selected
                    ? "border-[#003FC7] ring-1 ring-[#003FC7]/40"
                    : "border-[#0B2A4A]/12 hover:border-[#0B2A4A]/30"
                }`}
              >
                <span
                  aria-hidden
                  className="block h-9 w-full"
                  style={
                    pack
                      ? {
                          backgroundColor: packField(pack),
                          backgroundImage: pack
                            .ground(`scene:${sc} accentlock`)
                            .filter((l) => /gradient|url\(/.test(l))
                            .join(", "),
                          backgroundSize: "cover",
                        }
                      : { backgroundColor: "#E0E8F5" }
                  }
                />
                <span className="flex items-center justify-between gap-1 px-1.5 py-1">
                  <span className="truncate text-[10px] font-medium capitalize text-[#0B2A4A]/80">
                    {sceneLabel(sc)}
                  </span>
                  {sc === t.defaults.scene && (
                    <span className="shrink-0 text-[9px] uppercase tracking-wide text-[#0B2A4A]/40">
                      def
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Row>

      <div className="space-y-3">
        {TYPE_AXES.map(({ key, label, hint }) => {
          const [lo, hi] = TEMPLATE_TYPE_RANGE[key];
          const value = t.typeScale[key];
          const base = t.defaults.typeScale[key];
          return (
            <Row
              key={key}
              label={label}
              hint={`${hint} · library ${base}px`}
              overridden={has(key)}
              onReset={() => setType(key, null)}
            >
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={lo}
                  max={hi}
                  step={1}
                  value={value}
                  onChange={(e) => setType(key, Number(e.target.value))}
                  className="h-1 flex-1 accent-[#003FC7]"
                  aria-label={`${label} size in pixels`}
                />
                <input
                  type="number"
                  min={lo}
                  max={hi}
                  value={value}
                  onChange={(e) => setType(key, Number(e.target.value))}
                  className="w-14 rounded-md border border-[#0B2A4A]/15 px-1.5 py-1 text-right text-[11px] text-[#0B2A4A]"
                  aria-label={`${label} size in pixels`}
                />
                <span className="text-[10px] text-[#0B2A4A]/45">px</span>
              </div>
            </Row>
          );
        })}
      </div>

      <Row
        label="Sheet fill"
        hint="How hard content pushes into the open space. 100% keeps the library setting."
        overridden={has("fill")}
        onReset={() => onChange({ fillBias: 1 })}
      >
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={80}
            max={125}
            step={1}
            value={fillPct}
            onChange={(e) => onChange({ fillBias: Number(e.target.value) / 100 })}
            className="h-1 flex-1 accent-[#003FC7]"
            aria-label="Sheet fill bias"
          />
          <span className="w-10 text-right text-[11px] tabular-nums text-[#0B2A4A]">
            {fillPct}%
          </span>
        </div>
      </Row>

      <Row
        label="Content budget"
        hint="What the editor warns against — blocks, bullets per block and words per block."
        overridden={has("density")}
        onReset={() => onChange({ density: { ...t.defaults.density } })}
      >
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["blocks", "Blocks"],
              ["bullets", "Bullets"],
              ["wordsPerBlock", "Words"],
            ] as Array<[keyof LevelRole["density"], string]>
          ).map(([k, lbl]) => (
            <label key={k} className="space-y-1">
              <span className="block text-[10px] text-[#0B2A4A]/55">{lbl}</span>
              <input
                type="number"
                min={1}
                max={k === "wordsPerBlock" ? 120 : 24}
                value={t.density[k]}
                onChange={(e) =>
                  onChange({
                    density: { [k]: Number(e.target.value) } as Partial<LevelRole["density"]>,
                  })
                }
                className="w-full rounded-md border border-[#0B2A4A]/15 px-1.5 py-1 text-[11px] text-[#0B2A4A]"
              />
            </label>
          ))}
        </div>
      </Row>
    </div>
  );
}
