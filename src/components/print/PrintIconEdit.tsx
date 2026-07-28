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
}: {
  slot: string;
  name?: IconName;
  d?: string;
  size: number | string;
  color: string;
  strokeWidth?: number;
}) {
  const ctx = usePrintIconEdit();
  const resolved = resolveSlotPath(ctx?.overrides, slot, { name, d });

  const glyph = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block" }}
    >
      <path d={resolved.d} />
    </svg>
  );

  if (!ctx?.active) return glyph;

  return (
    <span
      role="button"
      tabIndex={0}
      data-print-icon-slot={slot}
      title="Change icon"
      aria-label={`Change icon${resolved.name ? ` (${resolved.name.replace(/-/g, " ")})` : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onPick(slot, resolved.name);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          ctx.onPick(slot, resolved.name);
        }
      }}
      className="print-icon-slot"
      style={{
        display: "block",
        cursor: "pointer",
        borderRadius: 6,
        outline: "1px dashed color-mix(in srgb, currentColor 35%, transparent)",
        outlineOffset: 2,
      }}
    >
      {glyph}
    </span>
  );
}
