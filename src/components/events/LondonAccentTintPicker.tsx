// Division gradient options for one London panel.
//
// The approved tints only vary how much of the division accent reaches the
// LIGHT end of the ramp — the dark head that carries the white lockup is never
// touched — so every option here stays inside the London event accent rule.
// Master-brand panels have no accent to tint with, so the picker renders
// nothing for them.

import {
  isLondonDoorItem,
  LONDON_ACCENT_TINTS,
  londonDivisionAccent,
  londonEffectiveTint,
} from "@/lib/next-london-division";
import type { LondonPanel } from "@/lib/next-london-signage";
import { setLondonLogoPlacement } from "@/lib/next-london-logo-placement";

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
  const accent = londonDivisionAccent(familyId);
  if (!accent) return null;

  const door = isLondonDoorItem(panel.room, panel.name);
  const active = londonEffectiveTint({ tintId: accentTint, door });

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
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
          aria-pressed={active.id === tint.id}
          onClick={() =>
            setLondonLogoPlacement(panel.id, {
              accentTint: tint.id === "house" && !accentTint ? null : tint.id,
            })
          }
          className={`rounded-full border px-3 py-1 text-xs transition ${
            active.id === tint.id
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {tint.label}
        </button>
      ))}
      <span className="text-[11px] text-muted-foreground">{active.note}</span>
    </div>
  );
}
