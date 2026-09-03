// Step & repeat WALL BUILDER.
//
// A real photo wall is a repeating tile field, so this is a pattern editor, not
// a single-object placement editor: pick what repeats (lockup, live text, a
// scannable QR, or alternating rows), set the mark size, the gaps, the row drop
// and the tilt, and the .svg / .ai masters rebuild the whole wall live. Every
// number reads in millimetres AND inches, because signage vendors quote in both.

import { useMemo } from "react";
import { Grid3X3, QrCode, RotateCcw, Ruler, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NEXT_LOGO_COLOURWAY_LABELS,
  nextLogoColourways,
  nextLogoFamily,
  NEXT_LOGO_FAMILIES,
} from "@/lib/next-logo-vectors";
import type { LondonPanel } from "@/lib/next-london-signage";
import {
  DEFAULT_STEP_REPEAT,
  dimText,
  mmToIn,
  resetStepRepeatConfig,
  setStepRepeatConfig,
  sizeText,
  STEP_REPEAT_KIND_LABELS,
  STEP_REPEAT_KINDS,
  STEP_REPEAT_LIMITS,
  stepRepeatConfig,
  stepRepeatPlan,
  stepRepeatWarnings,
  useStepRepeatConfigs,
  type StepRepeatKind,
} from "@/lib/next-london-step-repeat";

const AGENDA_LINK = "https://transperfectelement.lovable.app/events/next/london/agenda";

/** Families that ship a usable lockup, in catalogue order. */
const FAMILY_IDS = Object.keys(NEXT_LOGO_FAMILIES);

function Slider({
  label,
  value,
  min,
  max,
  step,
  readout,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  readout: string;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex min-w-[210px] flex-1 items-center gap-2 text-xs text-muted-foreground">
      <span className="w-24 shrink-0">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full min-w-[80px] flex-1"
      />
      <span className="w-28 shrink-0 text-right tabular-nums text-foreground">{readout}</span>
    </label>
  );
}

export interface StepRepeatWallPanelProps {
  panel: LondonPanel;
}

export function StepRepeatWallPanel({ panel }: StepRepeatWallPanelProps) {
  const map = useStepRepeatConfigs();
  const config = useMemo(() => stepRepeatConfig(panel.id, map), [panel.id, map]);
  const plan = useMemo(() => stepRepeatPlan(panel, config), [panel, config]);
  const warnings = useMemo(() => stepRepeatWarnings(panel, plan), [panel, plan]);
  const colourways = nextLogoColourways(config.familyId);
  const overridden = !!map[panel.id];
  const set = (patch: Parameters<typeof setStepRepeatConfig>[1]) =>
    setStepRepeatConfig(panel.id, patch);

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Grid3X3 className="h-3.5 w-3.5" /> Step &amp; repeat wall
        </h4>
        <span className="text-[11px] text-muted-foreground">
          {sizeText(panel.trimW, panel.trimH)} finished
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        The pattern runs full bleed and staggers row to row, so every photo crop contains whole
        marks and a subject never blocks a column.
      </p>

      {/* What repeats */}
      <div className="mt-3 flex flex-wrap gap-2">
        {STEP_REPEAT_KINDS.map((kind: StepRepeatKind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={config.kind === kind}
            onClick={() => set({ kind })}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              config.kind === kind
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {STEP_REPEAT_KIND_LABELS[kind]}
          </button>
        ))}
      </div>

      {/* Mark source */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Mark
          <select
            value={config.familyId}
            onChange={(event) => set({ familyId: event.target.value })}
            className="h-9 min-w-[180px] rounded-md border border-border bg-background px-2 text-sm"
          >
            {FAMILY_IDS.map((id) => (
              <option key={id} value={id}>
                {nextLogoFamily(id).label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Lockup
          <select
            value={config.orientation}
            onChange={(event) =>
              set({ orientation: event.target.value as "auto" | "stacked" | "side" })
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="auto">Auto</option>
            <option value="stacked">Stacked</option>
            <option value="side">Side by side</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {colourways.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={config.colourway === key}
              onClick={() => set({ colourway: key })}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                config.colourway === key
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {NEXT_LOGO_COLOURWAY_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Pattern geometry */}
      <div className="mt-3 space-y-2">
        <Slider
          label="Mark width"
          value={config.tileWidthMm}
          {...STEP_REPEAT_LIMITS.tileWidthMm}
          readout={`${config.tileWidthMm}mm / ${mmToIn(config.tileWidthMm).toFixed(1)}\u2033`}
          onChange={(tileWidthMm) => set({ tileWidthMm })}
        />
        <Slider
          label="Gap across"
          value={config.gapX}
          {...STEP_REPEAT_LIMITS.gap}
          readout={`${Math.round(config.gapX * 100)}% · ${mmToIn(plan.pitchX).toFixed(1)}\u2033 pitch`}
          onChange={(gapX) => set({ gapX })}
        />
        <Slider
          label="Gap down"
          value={config.gapY}
          {...STEP_REPEAT_LIMITS.gap}
          readout={`${Math.round(config.gapY * 100)}% · ${mmToIn(plan.pitchY).toFixed(1)}\u2033 pitch`}
          onChange={(gapY) => set({ gapY })}
        />
        <Slider
          label="Row drop"
          value={config.drop}
          {...STEP_REPEAT_LIMITS.drop}
          readout={`${Math.round(config.drop * 100)}%`}
          onChange={(drop) => set({ drop })}
        />
        <Slider
          label="Tilt"
          value={config.rotationDeg}
          {...STEP_REPEAT_LIMITS.rotationDeg}
          readout={`${config.rotationDeg}\u00b0`}
          onChange={(rotationDeg) => set({ rotationDeg })}
        />
        <Slider
          label="Mark opacity"
          value={config.opacity}
          {...STEP_REPEAT_LIMITS.opacity}
          readout={`${Math.round(config.opacity * 100)}%`}
          onChange={(opacity) => set({ opacity })}
        />
      </div>

      {/* Tile content */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 text-xs text-muted-foreground">
          Repeat text
          <input
            type="text"
            value={config.text}
            maxLength={STEP_REPEAT_LIMITS.textMaxChars}
            onChange={(event) => set({ text: event.target.value })}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          />
        </label>
        <label className="flex min-w-[220px] flex-1 items-center gap-2 text-xs text-muted-foreground">
          <QrCode className="h-3.5 w-3.5" /> Repeat QR link
          <input
            type="text"
            value={config.qrData}
            maxLength={STEP_REPEAT_LIMITS.qrMaxChars}
            placeholder="No code in the pattern"
            onChange={(event) => set({ qrData: event.target.value })}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => set({ qrData: AGENDA_LINK })}
        >
          <QrCode className="h-3.5 w-3.5" /> Agenda code
        </Button>
      </div>

      {/* Spec readout — mm and inches */}
      <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {[
          ["Mark", `${dimText(config.tileWidthMm, 1)} wide`],
          ["Pitch", `${dimText(plan.pitchX, 1)} × ${dimText(plan.pitchY, 1)}`],
          ["Grid", `${plan.cols} across × ${plan.rows} down · ${plan.tiles.length} marks`],
          ["Density", `${plan.marksPerM2} marks/m²`],
          ["Safe inset", dimText(plan.safeMm, 1)],
          [
            "Lockup",
            `${plan.orientation === "side" ? "side by side" : "stacked"} · ${plan.colourway}`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 border-b border-border/50 py-1"
          >
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-right text-xs tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div
        className={`mt-3 flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
          warnings.length === 0
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        }`}
      >
        {warnings.length === 0 ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <span>
          {warnings.length === 0
            ? "Wall reads on camera: mark size, gaps and row drop are all inside press-wall practice."
            : warnings.join(" ")}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!overridden}
          onClick={() => resetStepRepeatConfig(panel.id)}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset wall
        </Button>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Ruler className="h-3.5 w-3.5" />
          {overridden
            ? "Custom recipe — live in the stage, the .svg and the .ai"
            : `House recipe · ${DEFAULT_STEP_REPEAT.tileWidthMm}mm mark, 50% drop`}
        </span>
      </div>
    </div>
  );
}
