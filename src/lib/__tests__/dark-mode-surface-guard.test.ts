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
});
