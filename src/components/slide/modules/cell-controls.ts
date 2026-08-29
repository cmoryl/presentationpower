/**
 * Shared per-cell Studio controls (see VariantSampleStudio Sections panel).
 *
 * The studio commits these fields onto item objects in the draft content bag:
 * - `tone` / `toneEnd` — recolour this cell's accent ink, wash, seam and rails
 *   (gradient start/end);
 * - `iconAlign` ("top" | "center" | "bottom") / `iconOffsetPct` (-40..40) —
 *   nudge the glyph inside its well without moving the copy;
 * - `iconSize` ("xs".."display") — per-cell glyph scale.
 *
 * Every module family that declares `cellControls` in the registry must read
 * these through the helpers below so the stage, canvas editor and every export
 * (all read the same DOM) honour the edit. Unset cells render exactly as
 * before, so saved samples are untouched.
 */
import { itemTone, itemToneEnd, toneWashGradient } from "@/lib/item-tone";
import { accentInk, type AccentMode } from "@/lib/accent-tokens";
import { cardWashGradient } from "@/lib/surface-tokens";

/** Per-cell accent ink: the item's `tone` override lifted onto the mode ramp,
 * or the family fallback when unset. */
export function cellAccent(
  it: Record<string, unknown>,
  fallback: string,
  mode: AccentMode,
): string {
  const t = itemTone(it);
  return t ? accentInk(t, mode, 4.5) : fallback;
}

/** Per-cell card wash: a two-colour tone gradient when `tone` is set, else the
 * canonical house wash on the fallback accent. */
export function cellWash(it: Record<string, unknown>, fallback: string): string {
  const t = itemTone(it);
  return t ? toneWashGradient(t, itemToneEnd(it)) : cardWashGradient(fallback);
}

/** Per-cell glyph well style: vertical alignment + percentage nudge. Spread
 * onto the flex well that wraps the icon/numeral. */
export function iconWellStyle(it: Record<string, unknown>) {
  const align = String(it.iconAlign ?? "center");
  const offset = Math.max(-40, Math.min(40, Number(it.iconOffsetPct ?? 0) || 0));
  return {
    alignItems: align === "top" ? "flex-start" : align === "bottom" ? "flex-end" : "center",
    transform: offset ? `translateY(${offset}%)` : undefined,
  } as const;
}

/** Per-cell icon scale multiplier matching the Studio icon size stepper. */
export function cellIconScale(it: Record<string, unknown>): number {
  return (
    ({ xs: 0.6, sm: 0.8, md: 1, lg: 1.25, xl: 1.6, display: 2.2 }) as Record<string, number>
  )[String(it.iconSize ?? "md")] ?? 1;
}
