// Step & repeat WALL BUILDER.
//
// A real photo wall is a repeating tile field, so this is a pattern editor, not
// a single-object placement editor: pick what repeats (lockup, live text, a
// scannable QR, or alternating rows), set the mark size, the gaps, the row drop
// and the tilt, and the .svg / .ai masters rebuild the whole wall live. Every
// number reads in millimetres AND inches, because signage vendors quote in both.
//
// The controls sit in a narrow right-hand rail, so they are grouped into labelled
// blocks with one control per row and the readout under the slider — long dual-unit
// readouts used to be clipped off the edge of the rail.

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
  STEP_REPEAT_QR_MODULE_LABELS,
  STEP_REPEAT_QR_MODULE_SHAPES,
  STEP_REPEAT_QR_PLATE_LABELS,
  STEP_REPEAT_QR_PLATE_SHAPES,
  STEP_REPEAT_QR_SWATCHES,
  stepRepeatConfig,
  stepRepeatPlan,
  stepRepeatWarnings,
  useStepRepeatConfigs,
  type StepRepeatKind,
} from "@/lib/next-london-step-repeat";

const AGENDA_LINK = "https://transperfectelement.lovable.app/events/next/london/agenda";

/** Families that ship a usable lockup, in catalogue order. */
const FAMILY_IDS = Object.keys(NEXT_LOGO_FAMILIES);

/** One labelled block in the rail. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-md border border-border/60 bg-background/60 p-2.5">
      <h5 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h5>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

/** Pill group: one choice per row of chips, wrapping inside the rail. */
function Chips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
              value === opt.value
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

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
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[11px] tabular-nums text-foreground">{readout}</span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full"
      />
    </div>
  );
}

/** Brand-ink swatch row; `allowNone` adds a "no plate" chip. */
function Swatches({
  label,
  value,
  onChange,
  allowNone,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  allowNone?: boolean;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {STEP_REPEAT_QR_SWATCHES.map((sw) => (
          <button
            key={sw.hex}
            type="button"
            title={`${sw.label} · ${sw.hex}`}
            aria-label={sw.label}
            aria-pressed={value.toUpperCase() === sw.hex}
            onClick={() => onChange(sw.hex)}
            className={`h-6 w-6 rounded-full border-2 transition ${
              value.toUpperCase() === sw.hex
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-foreground/40"
            }`}
            style={{ background: sw.hex }}
          />
        ))}
        {allowNone ? (
          <button
            type="button"
            aria-pressed={value === "none"}
            onClick={() => onChange("none")}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              value === "none"
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            None
          </button>
        ) : null}
      </div>
    </div>
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

  const showsQr = config.kind === "qr" || config.kind === "logo-qr";
  const showsText = config.kind === "text" || config.kind === "logo-text";

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
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        The pattern runs full bleed and staggers row to row, so every photo crop contains whole
        marks and a subject never blocks a column.
      </p>

      <Group title="What repeats">
        <div className="flex flex-wrap gap-1.5">
          {STEP_REPEAT_KINDS.map((kind: StepRepeatKind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={config.kind === kind}
              onClick={() => set({ kind })}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                config.kind === kind
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {STEP_REPEAT_KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Mark">
        <Field label="Lockup family">
          <select
            value={config.familyId}
            onChange={(event) => set({ familyId: event.target.value })}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            {FAMILY_IDS.map((id) => (
              <option key={id} value={id}>
                {nextLogoFamily(id).label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Orientation">
          <select
            value={config.orientation}
            onChange={(event) =>
              set({ orientation: event.target.value as "auto" | "stacked" | "side" })
            }
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="auto">Auto</option>
            <option value="stacked">Stacked</option>
            <option value="side">Side by side</option>
          </select>
        </Field>
        <Chips
          label="Colourway"
          value={config.colourway}
          options={colourways.map((key) => ({
            value: key,
            label: NEXT_LOGO_COLOURWAY_LABELS[key],
          }))}
          onChange={(colourway) => set({ colourway })}
        />
      </Group>

      <Group title="Pattern geometry">
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
          readout={`${Math.round(config.gapX * 100)}% · ${mmToIn(plan.pitchX).toFixed(1)}\u2033`}
          onChange={(gapX) => set({ gapX })}
        />
        <Slider
          label="Gap down"
          value={config.gapY}
          {...STEP_REPEAT_LIMITS.gap}
          readout={`${Math.round(config.gapY * 100)}% · ${mmToIn(plan.pitchY).toFixed(1)}\u2033`}
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
      </Group>

      {showsText ? (
        <Group title="Repeat text">
          <Field label="Wordmark line">
            <input
              type="text"
              value={config.text}
              maxLength={STEP_REPEAT_LIMITS.textMaxChars}
              onChange={(event) => set({ text: event.target.value })}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>
        </Group>
      ) : null}

      <Group title="QR rows">
        <Field
          label={
            <>
              <QrCode className="h-3.5 w-3.5" /> Repeat QR link
            </>
          }
        >
          <input
            type="text"
            value={config.qrData}
            maxLength={STEP_REPEAT_LIMITS.qrMaxChars}
            placeholder="No code in the pattern"
            onChange={(event) => set({ qrData: event.target.value })}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          />
        </Field>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => set({ qrData: AGENDA_LINK })}
        >
          <QrCode className="h-3.5 w-3.5" /> Use the agenda code
        </Button>

        <Swatches
          label="Code colour"
          value={config.qrInkHex}
          onChange={(qrInkHex) => set({ qrInkHex })}
        />
        <Swatches
          label="Plate colour"
          value={config.qrPlateHex}
          allowNone
          onChange={(qrPlateHex) => set({ qrPlateHex })}
        />
        <Chips
          label="Plate shape"
          value={config.qrPlateShape}
          options={STEP_REPEAT_QR_PLATE_SHAPES.map((s) => ({
            value: s,
            label: STEP_REPEAT_QR_PLATE_LABELS[s],
          }))}
          onChange={(qrPlateShape) => set({ qrPlateShape })}
        />
        <Chips
          label="Module shape"
          value={config.qrModuleShape}
          options={STEP_REPEAT_QR_MODULE_SHAPES.map((s) => ({
            value: s,
            label: STEP_REPEAT_QR_MODULE_LABELS[s],
          }))}
          onChange={(qrModuleShape) => set({ qrModuleShape })}
        />
        {!showsQr ? (
          <p className="text-[11px] text-muted-foreground">
            Pick “Lockup + QR rows” or “QR only” above to put these codes in the pattern.
          </p>
        ) : null}
      </Group>

      {/* Spec readout — mm and inches */}
      <Group title="Spec">
        <dl className="grid gap-x-4 gap-y-1">
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
              <dt className="shrink-0 text-[11px] text-muted-foreground">{label}</dt>
              <dd className="text-right text-[11px] tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Group>

      <div
        className={`mt-3 flex items-start gap-2 rounded-md px-2 py-1.5 text-[11px] leading-relaxed ${
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

      <div className="mt-3 space-y-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          disabled={!overridden}
          onClick={() => resetStepRepeatConfig(panel.id)}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset wall
        </Button>
        <span className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {overridden
            ? "Custom recipe — live in the stage, the .svg and the .ai"
            : `House recipe · ${DEFAULT_STEP_REPEAT.tileWidthMm}mm mark, 50% drop`}
        </span>
      </div>
    </div>
  );
}
