// Division gradient options for one London panel.
//
// The approved tints vary how much of the division accent reaches the LIGHT end
// of the ramp — the dark head that carries the white lockup is never touched —
// so every option here stays inside the London event accent rule. Beyond the
// presets, a designer can fine-tune the accent per panel: strength, how late it
// arrives, how pure the colour is and how close it may sit to the mark's own
// accent chevron. Master-brand panels have no accent to tint with, so the
// picker renders nothing for them.

import { useState } from "react";

import {
  isLondonDoorItem,
  LONDON_ACCENT_TINTS,
  LONDON_TINT_LIMITS,
  londonDivisionAccent,
  londonDivisionStops,
  londonEffectiveTint,
} from "@/lib/next-london-division";
import { LONDON_STYLES, type LondonPanel } from "@/lib/next-london-signage";
import {
  londonLogoPlacement,
  londonTintShape,
  setLondonLogoPlacement,
  useLondonLogoPlacement,
} from "@/lib/next-london-logo-placement";

type Knob = {
  key: "accentWeight" | "accentCurve" | "accentSoften" | "accentClearance" | "accentFrom";
  label: string;
  hint: string;
  range: { min: number; max: number; step: number };
  value: number;
  /** Higher slider value = more accent, so some knobs read inverted. */
  invert?: boolean;
};

export function LondonAccentTintPicker({
  panel,
  familyId,
  accentTint,
  className = "",
}: {
  panel: LondonPanel;
  familyId: string;
  accentTint: string | null;
  className?: string;
}) {
  const placement = useLondonLogoPlacement(panel.id);
  const [open, setOpen] = useState(false);
  const accent = londonDivisionAccent(familyId);
  if (!accent) return null;

  const door = isLondonDoorItem(panel.room, panel.name);
  const shape = londonTintShape(placement);
  const active = londonEffectiveTint({ tintId: accentTint, door, shape });
  const preset = londonEffectiveTint({ tintId: accentTint, door });
  const tuned = shape !== null;

  const base = LONDON_STYLES[panel.style]?.stops ?? ["#7C4EF4", "#7FE3E8"];
  const preview = londonDivisionStops(familyId, base, active.weight, active.curve, {
    soften: active.soften,
    clearance: active.clearance,
    from: active.from,
  });

  const knobs: Knob[] = [
    {
      key: "accentWeight",
      label: "Accent strength",
      hint: "How much division colour reaches the light end of the ramp.",
      range: LONDON_TINT_LIMITS.weight,
      value: active.weight,
    },
    {
      key: "accentSoften",
      label: "Colour purity",
      hint: "Lower softening = purer division colour in the tint.",
      range: LONDON_TINT_LIMITS.soften,
      value: active.soften,
      invert: true,
    },
    {
      key: "accentClearance",
      label: "Mark clearance",
      hint: "How much separation the ground keeps from the mark's own accent chevron.",
      range: LONDON_TINT_LIMITS.clearance,
      value: active.clearance,
      invert: true,
    },
    {
      key: "accentCurve",
      label: "Ramp curve",
      hint: "Higher keeps the accent later in the ramp.",
      range: LONDON_TINT_LIMITS.curve,
      value: active.curve,
      invert: true,
    },
    {
      key: "accentFrom",
      label: "Accent start",
      hint: "How far along the ramp the accent begins.",
      range: LONDON_TINT_LIMITS.from,
      value: active.from,
      invert: true,
    },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {accent.label} gradient
          <span
            aria-hidden="true"
            className="ml-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
            style={{ background: accent.hex }}
          />
        </span>
        {LONDON_ACCENT_TINTS.map((tint) => (
          <button
            key={tint.id}
            type="button"
            title={tint.note}
            aria-pressed={preset.id === tint.id}
            onClick={() =>
              setLondonLogoPlacement(panel.id, {
                accentTint: tint.id === "house" && !accentTint ? null : tint.id,
              })
            }
            className={`rounded-full border px-3 py-1 text-xs transition ${
              preset.id === tint.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tint.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            tuned
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {tuned ? "Fine tuned" : "Fine tune"}
        </button>
        <span className="text-[11px] text-muted-foreground">{active.note}</span>
      </div>

      {open ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-3">
            <div
              aria-label="Tinted ramp preview"
              className="h-6 flex-1 rounded"
              style={{ background: `linear-gradient(90deg, ${preview.join(", ")})` }}
            />
            <button
              type="button"
              onClick={() =>
                setLondonLogoPlacement(panel.id, {
                  accentWeight: null,
                  accentCurve: null,
                  accentSoften: null,
                  accentClearance: null,
                  accentFrom: null,
                })
              }
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              Reset to {preset.label}
            </button>
          </div>

          {knobs.map((knob) => (
            <label key={knob.key} className="block text-[11px] text-muted-foreground">
              <span className="flex items-center justify-between gap-2">
                <span className="text-foreground">{knob.label}</span>
                <span>{knob.value.toFixed(2)}</span>
              </span>
              <input
                type="range"
                className="mt-1 w-full"
                min={knob.range.min}
                max={knob.range.max}
                step={knob.range.step}
                value={knob.value}
                onChange={(e) =>
                  setLondonLogoPlacement(panel.id, {
                    [knob.key]: Number(e.target.value),
                  })
                }
              />
              <span className="block">
                {knob.hint}
                {knob.invert ? " Lower = more accent." : " Higher = more accent."}
              </span>
            </label>
          ))}

          <p className="text-[11px] text-muted-foreground">
            The dark head of the ramp is never tinted, so the white lockup keeps full contrast
            whatever you dial in here. Saved per panel, and used by the live preview and the
            downloaded print file alike.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Read the stored placement without a subscription (SSR-safe fallback). */
export function londonPanelTintSummary(panelId: string): string | null {
  const shape = londonTintShape(londonLogoPlacement(panelId));
  return shape ? "fine tuned" : null;
}
