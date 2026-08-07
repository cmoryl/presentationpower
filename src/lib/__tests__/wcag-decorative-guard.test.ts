// @vitest-environment jsdom
//
// Guards the invariant behind the "doubled-up 40" stat bug: the WCAG contrast
// auto-fixer (and the self-correcting auditor) must NEVER repaint decorative
// type. Ghost stat counterforms are drawn as outlined/transparent glyphs; the
// moment the fixer forces an ink colour on them they render as a solid slab
// over the real numeral.
//
// A decorative node is anything that is aria-hidden, tagged [data-decorative]
// or [data-accent-glow], outlined via -webkit-text-stroke, or filled with a
// fully transparent -webkit-text-fill-color — plus every descendant of those.

import { describe, expect, it, beforeEach } from "vitest";
import { applyAutoFix, auditNode } from "@/lib/wcag";

// Grey-on-white: fails AA at any size, so the fixer always wants to touch it.
const FAILING_INK = "rgb(204, 204, 204)";

function mount(html: string, mode: "light" | "dark" = "dark"): HTMLElement {
  const root = document.createElement("div");
  root.setAttribute("data-slide-mode", mode);
  // White stage so effectiveBg() resolves to a light surface deterministically.
  root.style.backgroundColor = "rgb(255, 255, 255)";
  root.innerHTML = html;
  document.body.appendChild(root);
  snapshot(root);
  return root;
}

// Snapshot inline styles up front: decorative glyphs legitimately carry their
// own inline `color: transparent` etc., so "untouched" means the fixer wrote
// nothing new — no marker attributes and no inline-style drift.
const baselines = new WeakMap<HTMLElement, string>();

function snapshot(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    baselines.set(el, el.style.cssText);
  });
}

function find(root: HTMLElement, sel: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`element not found: ${sel}`);
  return el;
}

function touched(el: HTMLElement): boolean {
  return Boolean(
    el.dataset.wcagFixed ||
      el.dataset.wcagShadow ||
      el.dataset.wcagLightInk ||
      el.dataset.wcagOriginal !== undefined ||
      el.style.cssText !== (baselines.get(el) ?? ""),
  );
}

const GHOST = `
  <span id="ghost" aria-hidden="true" data-accent-glow data-decorative
        style="color: transparent; -webkit-text-fill-color: transparent;
               -webkit-text-stroke-width: 2px; font-size: 180px; font-weight: 600;">40</span>`;

describe("wcag auto-fix never repaints decorative type", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("leaves a ghost stat counterform untouched while fixing the real numeral", () => {
    const root = mount(`
      <div data-stat-figure="xl" data-stat-shape="ghost">
        ${GHOST}
        <span id="value" style="color: ${FAILING_INK}; font-size: 96px; font-weight: 700;">40</span>
      </div>`);

    const fixed = applyAutoFix(root);

    expect(touched(find(root, "#ghost"))).toBe(false);
    expect(touched(find(root, "#value"))).toBe(true);
    expect(fixed).toBe(1);
  });

  it.each([
    ["data-decorative", `<span id="t" data-decorative`],
    ["aria-hidden", `<span id="t" aria-hidden="true"`],
    ["data-accent-glow", `<span id="t" data-accent-glow`],
    [
      "-webkit-text-stroke outline",
      `<span id="t" style="-webkit-text-stroke-width: 3px;`,
    ],
    [
      "transparent -webkit-text-fill-color",
      `<span id="t" style="-webkit-text-fill-color: rgba(0, 0, 0, 0);`,
    ],
  ])("skips nodes marked via %s", (_label, open) => {
    const hasStyle = open.includes("style=");
    const root = mount(
      `${open}${hasStyle ? ` color: ${FAILING_INK};"` : ` style="color: ${FAILING_INK};"`}>88%</span>`,
    );
    expect(applyAutoFix(root)).toBe(0);
    expect(touched(find(root, "#t"))).toBe(false);
  });

  it("skips descendants of a decorative container", () => {
    const root = mount(`
      <div data-decorative>
        <span id="child" style="color: ${FAILING_INK};">counterform</span>
      </div>`);
    expect(applyAutoFix(root)).toBe(0);
    expect(touched(find(root, "#child"))).toBe(false);
  });

  it("skips decorative type on light slides too (no navy ink swap)", () => {
    const root = mount(
      `${GHOST}<span id="value" style="color: ${FAILING_INK}; font-size: 96px; font-weight: 700;">40</span>`,
      "light",
    );

    applyAutoFix(root);

    const ghost = find(root, "#ghost");
    expect(touched(ghost)).toBe(false);
    expect(ghost.dataset.wcagLightInk).toBeUndefined();
    // The real figure still gets the light-mode brand ink treatment.
    expect(find(root, "#value").dataset.wcagLightInk).toBe("1");
  });

  it("auditNode neither samples nor mutates decorative type", () => {
    const root = mount(`
      ${GHOST}
      <p id="body" style="color: rgb(3, 0, 44); font-size: 16px;">Readable body copy</p>`);

    const report = auditNode(root);

    expect(touched(find(root, "#ghost"))).toBe(false);
    // Only the body paragraph is sampled — the ghost glyph is invisible to it.
    expect(report.sampled).toBe(1);
    expect(report.worst?.text).toContain("Readable body copy");
  });

  it("re-running the fixer keeps decorative type untouched (idempotent)", () => {
    const root = mount(`
      ${GHOST}
      <span id="value" style="color: ${FAILING_INK}; font-size: 96px; font-weight: 700;">40</span>`);

    applyAutoFix(root);
    applyAutoFix(root);
    auditNode(root);

    expect(touched(find(root, "#ghost"))).toBe(false);
  });
});
