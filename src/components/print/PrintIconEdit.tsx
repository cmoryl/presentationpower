/**
 * Canvas-level icon editing for print assets.
 *
 * Print layouts render icons from the fixed Heroicons-outline set in
 * `print-primitives`. Historically most of those glyphs were hard-coded per
 * layout slot, so the only way to change one was… you couldn't.
 *
 * `EditableIcon` gives every glyph a stable *slot key*. When the editor
 * provides a `PrintIconEditContext`, the glyph becomes a click target that
 * opens the picker; the chosen name is stored in `content.iconOverrides`
 * keyed by slot, so the change persists with the document and re-renders in
 * real time. Outside the editor (export, print, previews) the context is
 * absent and the component renders a plain, non-interactive glyph.
 */

import { createContext, useContext } from "react";
import { ICON_PATHS, type IconName } from "./print-primitives";
import { usePrintIconStyle } from "./print-doc-mode";

export type IconOverrides = Record<string, string>;

type IconEditCtx = {
  active: boolean;
  overrides: IconOverrides;
  onPick: (slot: string, current: IconName | null) => void;
};

export const PrintIconEditContext = createContext<IconEditCtx | null>(null);

export function usePrintIconEdit() {
  return useContext(PrintIconEditContext);
}

/** Resolve a slot to a glyph path, honouring any stored override. */
export function resolveSlotPath(
  overrides: IconOverrides | undefined,
  slot: string,
  fallback: { name?: IconName; d?: string },
): { d: string; name: IconName | null } {
  const ov = overrides?.[slot];
  if (ov && ICON_PATHS[ov as IconName]) return { d: ICON_PATHS[ov as IconName], name: ov as IconName };
  if (fallback.name && ICON_PATHS[fallback.name]) {
    return { d: ICON_PATHS[fallback.name], name: fallback.name };
  }
  const d = fallback.d ?? ICON_PATHS.sparkles;
  const match = (Object.keys(ICON_PATHS) as IconName[]).find((k) => ICON_PATHS[k] === d) ?? null;
  return { d, name: match };
}

export function EditableIcon({
  slot,
  name,
  d,
  size,
  color,
  strokeWidth = 1.5,
  label,
}: {
  slot: string;
  name?: IconName;
  d?: string;
  size: number | string;
  color: string;
  strokeWidth?: number;
  /**
   * Accessible name for glyphs that carry meaning on their own (a trend
   * direction, a contact channel). Omit for glyphs that merely decorate text
   * that already says the same thing — those stay hidden from assistive tech
   * so screen readers don't announce the label twice.
   */
  label?: string;
}) {
  const ctx = usePrintIconEdit();
  const style = usePrintIconStyle();
  const resolved = resolveSlotPath(ctx?.overrides, slot, { name, d });

  // `size` is usually a cqw string from cq(); scale it with calc() so glyph
  // sizing stays page-relative.
  const scaled =
    style.scale === 1
      ? size
      : typeof size === "number"
        ? size * style.scale
        : `calc(${size} * ${style.scale})`;

  const glyph = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={style.accent ?? color}
      strokeWidth={strokeWidth * style.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      /* Sizing lives in CSS, not SVG attributes: container-query units and
         calc() are invalid as `width`/`height` attribute values and make the
         glyph fall back to 100% of its parent. */
      style={{ display: "block", width: scaled, height: scaled, flex: "0 0 auto" }}
    >
      {label ? <title>{label}</title> : null}
      <path d={resolved.d} />
    </svg>
  );


  if (!ctx?.active) return glyph;

  const glyphName = resolved.name ? resolved.name.replace(/-/g, " ") : null;
  const buttonName = label
    ? `Change ${label} icon${glyphName ? ` (currently ${glyphName})` : ""}`
    : `Change icon${glyphName ? ` (currently ${glyphName})` : ""}`;

  return (
    <button
      type="button"
      data-print-icon-slot={slot}
      title="Change icon"
      aria-label={buttonName}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onPick(slot, resolved.name);
      }}
      className="print-icon-slot"
      style={{
        display: "block",
        padding: 0,
        border: "none",
        background: "none",
        cursor: "pointer",
        borderRadius: 6,
      }}
    >
      {/* The button carries the accessible name; the glyph itself is decorative here. */}
      <span aria-hidden style={{ display: "block" }}>
        {glyph}
      </span>
    </button>
  );
}

