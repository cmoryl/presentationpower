// Visual regression guard: LIGHT MODE (default, unscoped or `.light`) must
// NEVER paint a deep-navy / near-black hex onto a surface property. That is
// the tell-tale symptom of dark-mode styles bleeding into the light export
// (e.g. an author copies a `.dark` rule and forgets to scope it).
//
// Companion to `dark-mode-surface-guard.test.ts`. Together they enforce:
//   - dark rules never paint bright brand colors onto surfaces
//   - light rules never paint deep-navy dark-mode colors onto surfaces
//
// A "surface property" is `background`, `background-color`, or a surface
// CSS custom property (--background, --card, --popover, --muted,
// --secondary, --sidebar*, --input, --border, --accent).
//
// Text/border/foreground colors are NOT guarded — a dark hex on `color:` in
// light mode is expected (that's just body text).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");
const stripped = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const rules = stripped.split("}").map((r) => r.trim()).filter(Boolean);

// Canonical dark-mode surface hexes and near-black navy tones that must
// never appear on a light-mode surface.
const DARK_SURFACE_HEXES: Record<string, string> = {
  "#03002c": "Blue 800 — canonical dark-mode background, never a light surface",
  "#0b2a4a": "Navy elevated tile — dark-mode only, never a light surface",
  "#000000": "Pure black — never paint a light-mode surface",
  "#0a0a0a": "Near-black — dark-mode surface, never a light surface",
  "#111111": "Near-black — dark-mode surface, never a light surface",
  "#0f172a": "Slate 950 — dark theme surface, never a light surface",
  "#1e293b": "Slate 800 — dark theme surface, never a light surface",
};

const SURFACE_TOKENS = /^--(background|card|popover|muted|secondary|sidebar(-background)?|input|border|accent)\b/i;

// Any hex whose red channel is very low AND overall luminance is very dark
// is treated as a "dark navy / near-black" and forbidden on light surfaces
// even if it isn't in the explicit list above.
function isDarkNavyHex(hex: string): boolean {
  const h = hex.toLowerCase().replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // low red, low green, and the whole color is dark (max channel < 0x60).
  return r <= 0x20 && g <= 0x40 && Math.max(r, g, b) < 0x60;
}

describe("light-mode surface override guard", () => {
  it("no unscoped or .light rule paints a dark-mode surface color onto a surface property", () => {
    const offenders: string[] = [];

    for (const rule of rules) {
      const braceIdx = rule.indexOf("{");
      if (braceIdx < 0) continue;
      const selector = rule.slice(0, braceIdx);
      const body = rule.slice(braceIdx + 1);

      // Skip rules scoped to dark mode — those are governed by the sibling test.
      if (/(^|\s|,)\.dark\b/.test(selector)) continue;
      if (/\[data-theme\s*[~|^$*]?=\s*["']?dark/i.test(selector)) continue;
      if (/\.glass-dark\b/.test(selector)) continue;
      // Skip @keyframes / @font-face bodies — no cascade meaning here.
      if (/^\s*@(keyframes|font-face|supports|media)\b/.test(selector)) continue;


      const decls = body.split(";").map((d) => d.trim()).filter(Boolean);
      for (const decl of decls) {
        const colonIdx = decl.indexOf(":");
        if (colonIdx < 0) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl.slice(colonIdx + 1).trim().toLowerCase();

        const isBackgroundProp = prop === "background" || prop === "background-color";
        const isSurfaceToken = prop.startsWith("--") && SURFACE_TOKENS.test(prop);
        if (!isBackgroundProp && !isSurfaceToken) continue;

        // Explicit named offenders.
        for (const [hex, reason] of Object.entries(DARK_SURFACE_HEXES)) {
          if (value.includes(hex)) {
            offenders.push(`${selector.trim()} → ${prop}: ${value}  (${reason})`);
            break;
          }
        }

        // Heuristic: any other #RRGGBB in the value that reads as deep navy.
        const hexes = value.match(/#[0-9a-f]{6}\b/gi) ?? [];
        for (const h of hexes) {
          if (h.toLowerCase() in DARK_SURFACE_HEXES) continue; // already reported
          if (isDarkNavyHex(h)) {
            offenders.push(`${selector.trim()} → ${prop}: ${value}  (dark-navy hex ${h} on light surface)`);
          }
        }
      }
    }

    expect(
      offenders,
      `Light-mode surface painted with a dark-mode color:\n\n${offenders.join("\n")}\n\nMove the rule under a \`.dark\` scope, use a semantic token, or drop the override.`,
    ).toEqual([]);
  });

  it("light-mode base tokens stay on a light surface (:root --background is not deep-navy)", () => {
    // Sanity check on the canonical `:root` block: --background / --card /
    // --popover must resolve to a light value. This catches a swapped
    // :root <-> .dark block regression at the source.
    const rootRule = rules.find((r) => /^:root\s*\{?$/.test(r.split("{")[0].trim()));
    expect(rootRule, "expected a :root block in styles.css").toBeTruthy();

    const body = rootRule!.slice(rootRule!.indexOf("{") + 1);
    const surfaceProps = ["--background", "--card", "--popover"] as const;
    const offenders: string[] = [];

    for (const prop of surfaceProps) {
      const re = new RegExp(`${prop}\\s*:\\s*([^;]+);`, "i");
      const m = re.exec(body);
      if (!m) continue;
      const value = m[1].trim().toLowerCase();

      // oklch(L …) — L must be high (>0.85) for a light surface.
      const oklchMatch = /oklch\(\s*([0-9.]+)/i.exec(value);
      if (oklchMatch) {
        const L = parseFloat(oklchMatch[1]);
        if (L < 0.85) offenders.push(`${prop}: ${value} (oklch L=${L} is too dark for a light surface)`);
        continue;
      }

      // Fallback hex check.
      const hexMatch = /#[0-9a-f]{6}\b/i.exec(value);
      if (hexMatch && isDarkNavyHex(hexMatch[0])) {
        offenders.push(`${prop}: ${value} (dark-navy hex on :root surface)`);
      }
    }

    expect(offenders, `:root surface tokens read as dark:\n${offenders.join("\n")}`).toEqual([]);
  });
});
