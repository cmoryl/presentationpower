// Visual regression guard: dark mode must NEVER globally remap navy
// surfaces (#03002C / #0B2A4A) or the `.bg-white` class to the bright
// brand blue (#003FC7). That override caused every dark-mode card,
// tile, and panel to glow bright blue, blowing out the aurora look.
//
// Rule: any `.dark ...` selector that resolves to `#003FC7` (any case)
// MUST be scoped to interactive chrome via `:where(button, a, [role="button"])`.
// Everything else must be caught here before it ships.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");

// Strip comments so /* ... #003FC7 ... */ doesn't produce false positives.
const stripped = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

// Split into top-level rules on `}` — good enough for the flat rule set
// this project uses (no nested at-rules that contain `.dark`).
const rules = stripped.split("}").map((r) => r.trim()).filter(Boolean);

const BRIGHT_BLUE = /#003fc7\b/i;
const NAVY_SURFACE = /#03002c|#0b2a4a/i;
const ALLOWED_SCOPE = /:where\s*\(\s*button/i;

describe("dark-mode surface override guard", () => {
  it("no .dark rule remaps a navy surface to bright brand blue outside interactive chrome", () => {
    const offenders: string[] = [];
    for (const rule of rules) {
      const braceIdx = rule.indexOf("{");
      if (braceIdx < 0) continue;
      const selector = rule.slice(0, braceIdx);
      const body = rule.slice(braceIdx + 1);
      if (!/(^|\s|,)\.dark\b/.test(selector)) continue;
      if (!BRIGHT_BLUE.test(body)) continue;
      // Interactive CTA remap is intentional — only allowed via :where(button, a, ...).
      if (ALLOWED_SCOPE.test(selector)) continue;
      offenders.push(`${selector.trim()} { ${body.trim()} }`);
    }
    expect(
      offenders,
      `Found ${offenders.length} dark-mode rule(s) painting bright blue on non-interactive surfaces:\n\n${offenders.join("\n\n")}\n\nScope with :where(button, a, [role="button"]) or drop the override.`,
    ).toEqual([]);
  });

  it("no .dark rule silently forces a navy surface token to any non-navy background", () => {
    // Catches the sibling bug: a broad `.dark [class*="bg-[#03002C]"]`
    // remapping to something other than a deep-navy value.
    const offenders: string[] = [];
    for (const rule of rules) {
      const braceIdx = rule.indexOf("{");
      if (braceIdx < 0) continue;
      const selector = rule.slice(0, braceIdx);
      const body = rule.slice(braceIdx + 1);
      if (!/(^|\s|,)\.dark\b/.test(selector)) continue;
      if (!NAVY_SURFACE.test(selector)) continue;
      if (ALLOWED_SCOPE.test(selector)) continue;
      // Body must set background to a dark navy family (#0x…, #1x…) — not
      // a light or saturated brand color.
      const bg = /background(?:-color)?\s*:\s*(#[0-9a-f]{3,8})/i.exec(body);
      if (!bg) continue;
      const hex = bg[1].toLowerCase();
      const r = parseInt(hex.slice(1, 3), 16);
      // Reject anything with a red channel > 0x30 — real navy stays low-red.
      if (r > 0x30) offenders.push(`${selector.trim()} → ${hex}`);
    }
    expect(offenders, `Dark-mode navy surface remapped to non-navy:\n${offenders.join("\n")}`).toEqual([]);
  });

  // Full disallow-list: bright brand pops and light neutrals must never paint
  // a dark-mode surface. Text/borders are fine — this only fires when the
  // color lands on `background`, `background-color`, or a surface CSS custom
  // property (--background, --card, --popover, --muted, --secondary, --sidebar).
  const DISALLOWED_ON_SURFACE: Record<string, string> = {
    "#003fc7": "Primary Blue 500 — CTA only, never a dark surface",
    "#a1fbf9": "Aqua accent — max 10% usage, never a surface",
    "#c2a3ff": "Lavender accent — max 10% usage, never a surface",
    "#ffeb66": "Tertiary yellow — pop only, never a surface",
    "#a6fa87": "Tertiary green — pop only, never a surface",
    "#ff9b70": "Tertiary peach — pop only, never a surface",
    "#ec388a": "Tertiary pink — pop only, never a surface",
    "#e53d2e": "Tertiary red — pop only, never a surface",
    "#ffffff": "Pure white — light-mode surface, never a dark-mode surface",
    "#f2f2f2": "Light gray — light-mode surface, never a dark-mode surface",
    "#e0e8f5": "Blue white — light-mode surface, never a dark-mode surface",
  };
  const SURFACE_TOKENS = /^--(background|card|popover|muted|secondary|sidebar(-background)?|input|border|accent)\b/i;

  it("no .dark rule paints a disallowed brand color onto a surface property", () => {
    const offenders: string[] = [];
    for (const rule of rules) {
      const braceIdx = rule.indexOf("{");
      if (braceIdx < 0) continue;
      const selector = rule.slice(0, braceIdx);
      const body = rule.slice(braceIdx + 1);
      if (!/(^|\s|,)\.dark\b/.test(selector)) continue;
      if (ALLOWED_SCOPE.test(selector)) continue;

      // Parse each declaration in the body.
      const decls = body.split(";").map((d) => d.trim()).filter(Boolean);
      for (const decl of decls) {
        const colonIdx = decl.indexOf(":");
        if (colonIdx < 0) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl.slice(colonIdx + 1).trim().toLowerCase();

        // Only surface-painting properties are guarded — text/border colors
        // in a bright accent are fine.
        const isBackgroundProp = prop === "background" || prop === "background-color";
        const isSurfaceToken = prop.startsWith("--") && SURFACE_TOKENS.test(prop);
        if (!isBackgroundProp && !isSurfaceToken) continue;

        for (const [hex, reason] of Object.entries(DISALLOWED_ON_SURFACE)) {
          if (value.includes(hex)) {
            offenders.push(`${selector.trim()} → ${prop}: ${value}  (${reason})`);
            break;
          }
        }
      }
    }
    expect(
      offenders,
      `Dark-mode surface painted with a disallowed brand color:\n\n${offenders.join("\n")}\n\nMove the color to text/border, scope with :where(button, a, [role="button"]), or drop the override.`,
    ).toEqual([]);
  });
});

