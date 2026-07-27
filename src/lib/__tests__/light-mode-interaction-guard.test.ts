// Visual regression guard: LIGHT-MODE INTERACTION STATES.
//
// Companion to `light-mode-surface-guard.test.ts` and
// `dark-mode-surface-guard.test.ts`. This one narrows in on the sneakiest
// class of dark-mode bleed: interaction state overrides.
//
// A rule like `.btn:hover { background: #03002C }` is technically valid
// in dark mode but paints a dark-navy surface on hover in LIGHT mode too,
// producing the exact "hover flashes black" bug we keep having to hand-fix.
//
// Rule: any selector that ends in an interaction state
//   :hover / :focus / :focus-visible / :focus-within / :active
//   [data-state="open"|"active"|"checked"|"selected"|"on"]
//   [aria-selected="true"] / [aria-expanded="true"] / [aria-pressed="true"]
// AND is NOT scoped under `.dark` / `[data-theme="dark"]` / `.glass-dark`
// MUST NOT paint a dark-mode surface color onto `background`,
// `background-color`, or a surface CSS custom property.
//
// Text/border/foreground overrides are not guarded here — dark text on
// hover in a light theme is expected.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CSS = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");
const stripped = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const rules = stripped
  .split("}")
  .map((r) => r.trim())
  .filter(Boolean);

const DARK_SURFACE_HEXES: Record<string, string> = {
  "#03002c": "Blue 800 — dark-mode surface, never a light-mode interaction bg",
  "#0b2a4a": "Navy elevated tile — dark-mode only",
  "#0a0929": "Dark navy — dark-mode only",
  "#000000": "Pure black — never on a light interaction surface",
  "#0a0a0a": "Near-black — dark-mode only",
  "#111111": "Near-black — dark-mode only",
  "#0f172a": "Slate 950 — dark theme only",
  "#1e293b": "Slate 800 — dark theme only",
};

const SURFACE_TOKENS =
  /^--(background|card|popover|muted|secondary|sidebar(-background)?|input|border|accent)\b/i;

const INTERACTION_STATE =
  /(?::hover|:focus(?:-visible|-within)?|:active)\b|\[data-state\s*[~|^$*]?=\s*["']?(?:open|active|checked|selected|on)\b|\[aria-(?:selected|expanded|pressed|current)\s*=\s*["']?true/i;

const DARK_SCOPE = (sel: string): boolean =>
  /(^|\s|,)\.dark\b/.test(sel) ||
  /\[data-theme\s*[~|^$*]?=\s*["']?dark/i.test(sel) ||
  /\.glass-dark\b/.test(sel);

function isDarkNavyHex(hex: string): boolean {
  const h = hex.toLowerCase().replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return r <= 0x20 && g <= 0x40 && Math.max(r, g, b) < 0x60;
}

describe("light-mode interaction-state surface guard", () => {
  it("no :hover/:focus/:active/data-state rule paints a dark-mode color on a light surface", () => {
    const offenders: string[] = [];

    for (const rule of rules) {
      const braceIdx = rule.indexOf("{");
      if (braceIdx < 0) continue;
      const selector = rule.slice(0, braceIdx);
      const body = rule.slice(braceIdx + 1);

      if (DARK_SCOPE(selector)) continue;
      if (!INTERACTION_STATE.test(selector)) continue;
      if (/^\s*@(keyframes|font-face|supports|media|utility|layer|theme)\b/.test(selector))
        continue;

      const decls = body
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean);
      for (const decl of decls) {
        const colonIdx = decl.indexOf(":");
        if (colonIdx < 0) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl
          .slice(colonIdx + 1)
          .trim()
          .toLowerCase();

        const isBackgroundProp = prop === "background" || prop === "background-color";
        const isSurfaceToken = prop.startsWith("--") && SURFACE_TOKENS.test(prop);
        if (!isBackgroundProp && !isSurfaceToken) continue;

        for (const [hex, reason] of Object.entries(DARK_SURFACE_HEXES)) {
          if (value.includes(hex)) {
            offenders.push(`${selector.trim()} → ${prop}: ${value}  (${reason})`);
            break;
          }
        }

        const hexes = value.match(/#[0-9a-f]{6}\b/gi) ?? [];
        for (const h of hexes) {
          if (h.toLowerCase() in DARK_SURFACE_HEXES) continue;
          if (isDarkNavyHex(h)) {
            offenders.push(
              `${selector.trim()} → ${prop}: ${value}  (dark-navy hex ${h} on light-mode interaction surface)`,
            );
          }
        }
      }
    }

    expect(
      offenders,
      `Light-mode interaction state paints a dark surface:\n\n${offenders.join(
        "\n",
      )}\n\nMove the rule under a \`.dark\` scope (e.g. \`.dark .btn:hover\`) or swap to a light-appropriate token.`,
    ).toEqual([]);
  });

  it("interaction states never remap a surface token to a near-black oklch value in light mode", () => {
    // Catches: `.card:hover { --card: oklch(0.15 …) }` outside dark scope.
    const offenders: string[] = [];
    const oklchLightness = /oklch\(\s*([0-9.]+)/i;

    for (const rule of rules) {
      const braceIdx = rule.indexOf("{");
      if (braceIdx < 0) continue;
      const selector = rule.slice(0, braceIdx);
      const body = rule.slice(braceIdx + 1);

      if (DARK_SCOPE(selector)) continue;
      if (!INTERACTION_STATE.test(selector)) continue;
      if (/^\s*@(keyframes|font-face|supports|media|utility|layer|theme)\b/.test(selector))
        continue;

      const decls = body
        .split(";")
        .map((d) => d.trim())
        .filter(Boolean);
      for (const decl of decls) {
        const colonIdx = decl.indexOf(":");
        if (colonIdx < 0) continue;
        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl
          .slice(colonIdx + 1)
          .trim()
          .toLowerCase();

        const isBackgroundProp = prop === "background" || prop === "background-color";
        const isSurfaceToken = prop.startsWith("--") && SURFACE_TOKENS.test(prop);
        if (!isBackgroundProp && !isSurfaceToken) continue;

        const m = oklchLightness.exec(value);
        if (!m) continue;
        const L = parseFloat(m[1]);
        // L < 0.35 is a dark surface. Light-mode interactions should stay
        // >= 0.85 (tint), or at worst mid (>= 0.55) for pressed states.
        if (L < 0.35) {
          offenders.push(
            `${selector.trim()} → ${prop}: ${value}  (oklch L=${L} is a dark surface)`,
          );
        }
      }
    }

    expect(
      offenders,
      `Light-mode interaction remaps a surface token to a dark oklch:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
