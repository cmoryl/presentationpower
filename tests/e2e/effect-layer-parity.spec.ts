import { test, expect, type Page } from "@playwright/test";

/**
 * REGRESSION GATE — effect layers (gauge halos, blurred blooms, feathered edges).
 *
 * PowerPoint has no `filter: blur()` and no gradient mask, so those treatments
 * used to be approximated with `a:glow` (hard ring, mode-dependent alpha) or
 * flattened into the background plate. `export-effect-style.ts` reproduces them
 * as standalone transparent SVG artwork instead.
 *
 * This spec drives the SHIPPING classifier + generator over the live library DOM
 * in both light and dark mode, and asserts that every decorative effect element
 * with paint of its own is claimed by the effect path, produces parseable
 * standalone markup with no unresolved CSS vars, and reserves bleed padding so
 * the bloom is not clipped at the element box.
 */

const MODULES = [
  "MV-DASH-GAUGE-ROW",
  "MV-DASH-DONUT-TRIO",
  "MV-GRAPH-RINGS",
  "MV-STAT-ORBIT",
  "MV-INFO-HUB-PILL-ORBIT",
  "MV-PROC-STAGE-ORBITS",
] as const;

type Finding = { variantId: string; issues: string[] };

async function isolate(page: Page, id: string) {
  const search = page.getByPlaceholder("Search by name, ID, or purpose");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await search.fill("");
    await search.fill(id);
    try {
      await page.waitForSelector(`[data-variant-id="${id}"]`, { timeout: 8_000 });
      break;
    } catch {
      if (attempt === 3) throw new Error(`Module ${id} never mounted for audit`);
      await page.waitForTimeout(1000);
    }
  }
  await page.waitForTimeout(900);
}

async function auditEffects(page: Page, id: string) {
  return await page.evaluate(async (variantId: string) => {
    const { classifyEffectStyle, effectSvg, effectPadPx } = await import(
      "/src/lib/export-effect-style.ts"
    );
    const { resolveCssColor, parseBoxShadow } = await import("/src/lib/export-dom-decompose.ts");
    void parseBoxShadow;

    const issues: string[] = [];
    const host = document.querySelector<HTMLElement>(`[data-variant-id="${variantId}"]`);
    if (!host) return { issues: ["module not rendered on page"], claimed: 0 };

    let claimed = 0;
    for (const el of Array.from(host.querySelectorAll<HTMLElement>("*"))) {
      if (el.closest("svg")) continue;
      const cs = getComputedStyle(el);
      const filter = cs.filter || "none";
      const maskImage =
        (cs as unknown as { maskImage?: string }).maskImage ||
        (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage ||
        "none";
      const boxShadow = cs.boxShadow || "none";
      const shadowLayers = boxShadow === "none" ? [] : boxShadow.split(/,(?![^()]*\))/);
      const shadowish = shadowLayers.length > 1 || shadowLayers.some((l) => /\binset\b/i.test(l));
      const decorative =
        /blur\(|drop-shadow\(/.test(filter) ||
        /linear-gradient\(|radial-gradient\(/.test(maskImage) ||
        shadowish;
      if (!decorative) continue;
      const hasText = (el.textContent ?? "").trim().length > 0;
      if (hasText) continue;

      const bg = cs.backgroundImage || "none";
      const solid = resolveCssColor(cs.backgroundColor);
      const gradientish = /gradient\(/.test(bg);
      if (!gradientish && (!solid || solid.alpha < 0.04)) continue;

      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;

      const style = classifyEffectStyle(
        {
          filter,
          maskImage,
          mixBlendMode: cs.mixBlendMode || "normal",
          clipPath: cs.clipPath || "none",
          opacity: parseFloat(cs.opacity),
          hasText: false,
          // Radial/conic washes carry no linear-gradient record; fall back to the
          // dominant tone so the halo still has paint to draw.
          fill: solid ?? resolveCssColor((bg.match(/rgba?\([^)]*\)/) ?? [])[0] ?? ""),
          gradient: null,
          boxShadow,
          borderWidthPx: parseFloat(cs.borderTopWidth) || 0,
          borderColor:
            (parseFloat(cs.borderTopWidth) || 0) > 0 ? resolveCssColor(cs.borderTopColor) : null,
          radiusPx: parseFloat(cs.borderTopLeftRadius) || 0,
          ellipse: cs.borderRadius.includes("50%"),
        },
        resolveCssColor,
      );
      if (!style) continue;

      claimed += 1;
      const out = effectSvg(style, r.width, r.height);
      if (out.padPx !== effectPadPx(style)) issues.push("padding mismatch vs effectPadPx");
      if (out.padPx <= 0 && (style.blurPx > 0 || style.shadows.length > 0)) {
        issues.push("blur/shadow effect reserved no bleed padding");
      }
      if (/var\(|currentColor/.test(out.svg)) issues.push("unresolved var()/currentColor in effect");
      const doc = new DOMParser().parseFromString(out.svg, "image/svg+xml");
      if (doc.querySelector("parsererror")) issues.push("effect markup is not parseable XML");
      if (style.blurPx > 0 && !out.svg.includes("<feGaussianBlur")) {
        issues.push("blur did not emit feGaussianBlur");
      }
      if (style.feather && !out.svg.includes('mask="url(#m)"')) {
        issues.push("feather did not emit a mask");
      }
      if (style.insetShadows.length > 0 && !out.svg.includes("<feComponentTransfer")) {
        issues.push("inset shadow did not emit an inverted-alpha chain");
      }
      if (style.strokeGlows.length > 0 && !out.svg.includes("<feDropShadow")) {
        issues.push("stroke glow did not emit a halo primitive");
      }
      if (style.stroke && !out.svg.includes("stroke-width=")) {
        issues.push("border paint lost its stroke");
      }
      if (issues.length > 0) break;
    }
    return { issues, claimed };
  }, id);
}

test.describe("Effect layer export parity", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`effect styles export as consistent transparent artwork (${mode})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto("/public/modules", { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("Search by name, ID, or purpose").waitFor({ timeout: 60_000 });

      if (mode === "dark") {
        await page.getByRole("button", { name: /^dark$/i }).first().click();
        await page.waitForTimeout(400);
      }

      const findings: Finding[] = [];
      let audited = 0;
      for (const id of MODULES) {
        await isolate(page, id);
        const result = await auditEffects(page, id);
        audited += 1;
        if (result.issues.length > 0) findings.push({ variantId: id, issues: result.issues });
      }

      expect(audited).toBe(MODULES.length);
      expect(findings.map((f) => `${f.variantId}: ${f.issues.join(" | ")}`).join("\n")).toBe("");
    });
  }
});
