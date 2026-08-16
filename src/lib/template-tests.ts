/**
 * TEMPLATE TEST SUITE — the checks the admin "Test" step runs before a template
 * is allowed to ship. Pure functions so the same suite runs in the browser
 * harness and in unit tests.
 */

import { SKIN_SCENES } from "./skin-backgrounds";
import { templateToPack, type CustomTemplate } from "./custom-templates";
import { DESIGN_SKINS } from "./design-skins";
import { INDUSTRY_SKINS } from "./industry-skins";

export type TestStatus = "pass" | "warn" | "fail";

export interface TemplateTest {
  id: string;
  label: string;
  status: TestStatus;
  detail: string;
}

const HEXISH = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function srgb(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function parseHex(hex: string): [number, number, number] | null {
  if (!HEXISH.test((hex ?? "").trim())) return null;
  const h = hex.trim().slice(1);
  const full =
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function relLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(srgb) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two hex colours. */
export function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function ratioLabel(r: number): string {
  return `${r.toFixed(2)}:1`;
}

/** Every catalog code a template can inherit geometry from. */
export const BASE_CODES: string[] = [...DESIGN_SKINS, ...INDUSTRY_SKINS].map((s) =>
  s.code.toUpperCase(),
);

export interface TestContext {
  /** Codes already used by other templates — drives the uniqueness check. */
  existingCodes?: string[];
}

export function runTemplateTests(t: CustomTemplate, ctx: TestContext = {}): TemplateTest[] {
  const tests: TemplateTest[] = [];
  const push = (id: string, label: string, status: TestStatus, detail: string) =>
    tests.push({ id, label, status, detail });

  // 1 — identity
  const code = (t.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{2,12}$/.test(code)) {
    push("code", "Template code", "fail", "2–12 characters, letters/numbers/dashes only.");
  } else if ((ctx.existingCodes ?? []).map((c) => c.toUpperCase()).includes(code)) {
    push("code", "Template code", "fail", `${code} is already used by another template.`);
  } else {
    push("code", "Template code", "pass", `${code} is valid and unique.`);
  }

  push(
    "name",
    "Name & description",
    t.name.trim().length >= 2 && t.description.trim().length >= 12 ? "pass" : "warn",
    t.description.trim().length >= 12
      ? "Named, with a description reviewers can judge."
      : "Add a one-line description — the agent uses it to pick looks.",
  );

  // 2 — palette integrity
  const bad = t.palette.filter((p) => !parseHex(p));
  if (t.palette.length !== 5) {
    push("palette", "Five-stop palette", "fail", `Expected 5 stops, found ${t.palette.length}.`);
  } else if (bad.length) {
    push("palette", "Five-stop palette", "fail", `Not hex: ${bad.join(", ")}.`);
  } else {
    push("palette", "Five-stop palette", "pass", "Field, ink and three accents all valid hex.");
  }

  // 3 — mode matches the field
  const field = t.palette[0] ?? "#ffffff";
  const fieldLum = relLuminance(field);
  const modeOk = t.mode === "dark" ? fieldLum < 0.4 : fieldLum > 0.4;
  push(
    "mode",
    "Mode matches the page field",
    modeOk ? "pass" : "fail",
    modeOk
      ? `${t.mode} template on a ${fieldLum < 0.4 ? "dark" : "light"} field.`
      : `Field ${field} reads ${fieldLum < 0.4 ? "dark" : "light"} but the template is set to ${t.mode}.`,
  );

  // 4 — body contrast (WCAG AA 4.5:1)
  const ink = t.palette[1] ?? "#000000";
  const body = contrastRatio(field, ink);
  push(
    "contrast-body",
    "Body text contrast (AA 4.5:1)",
    body >= 4.5 ? "pass" : body >= 3 ? "warn" : "fail",
    `Ink on field is ${ratioLabel(body)}.`,
  );

  // 5 — display contrast (AA large 3:1)
  const accent = t.palette[2] ?? ink;
  const display = contrastRatio(field, accent);
  push(
    "contrast-accent",
    "Accent contrast (AA large 3:1)",
    display >= 3 ? "pass" : "warn",
    `Accent on field is ${ratioLabel(display)} — used for rules, figures and kickers.`,
  );

  // 6 — accents are distinguishable from each other
  const alt = t.palette[3] ?? accent;
  const spread = contrastRatio(accent, alt);
  push(
    "accent-spread",
    "Accents are distinguishable",
    spread >= 1.35 ? "pass" : "warn",
    `Accent vs accent-alt separation is ${ratioLabel(spread)}.`,
  );

  // 7 — geometry base resolves
  const base = (t.baseSkinCode ?? "").toUpperCase();
  push(
    "base",
    "Geometry base resolves",
    !base ? "warn" : BASE_CODES.includes(base) ? "pass" : "fail",
    !base
      ? "No base look chosen — the template falls back to S01 geometry."
      : BASE_CODES.includes(base)
        ? `Inherits card shapes, motif and layout from ${base}.`
        : `${base} is not a catalog code.`,
  );

  // 8 — every scene paints layers
  let renderStatus: TestStatus = "pass";
  let renderDetail = `All ${SKIN_SCENES.length} section backgrounds paint.`;
  try {
    const pack = templateToPack(t);
    const empty = SKIN_SCENES.filter((s) => pack.ground(s).length === 0);
    if (empty.length) {
      renderStatus = "fail";
      renderDetail = `No background layers for: ${empty.join(", ")}.`;
    }
  } catch (err) {
    renderStatus = "fail";
    renderDetail = `Pack build threw: ${(err as Error).message}`;
  }
  push("render", "Renders every section", renderStatus, renderDetail);

  // 9 — export readiness: exports need a hex field, not a gradient token
  push(
    "export",
    "PowerPoint export readiness",
    parseHex(field) ? "pass" : "fail",
    parseHex(field)
      ? "Flat page field exports as a native slide background."
      : "Page field must be a hex colour for native PPTX backgrounds.",
  );

  return tests;
}

export function testSummary(tests: TemplateTest[]): {
  pass: number;
  warn: number;
  fail: number;
  ready: boolean;
} {
  const pass = tests.filter((t) => t.status === "pass").length;
  const warn = tests.filter((t) => t.status === "warn").length;
  const fail = tests.filter((t) => t.status === "fail").length;
  return { pass, warn, fail, ready: fail === 0 };
}
