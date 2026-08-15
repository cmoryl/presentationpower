import { test, expect, type Page } from "@playwright/test";

/**
 * REGRESSION GATE — serialized SVG paint + type for gauge / effect modules.
 *
 * Gauges, dials, rings, orbits and halo effects paint with
 * `var(--slide-accent-text)` (and friends), which resolves from the slide
 * cascade on screen but has NO cascade once the exporter serializes the
 * <svg> into a standalone data URL. When that resolution regresses, arcs and
 * gradient stops ship to PowerPoint as black hairlines, and <text> numerals
 * fall back to the UA serif.
 *
 * This spec drives the REAL exporter serializer (serializeSvgForExport, the
 * same function svgDataUrl feeds in export-dom-decompose) over every
 * gauge/effect module in both light and dark mode, and asserts:
 *
 *  1. zero residual `var(` / `currentColor` in the shipped markup
 *  2. accent paints resolve to the live computed `--slide-accent-text`
 *     (a real brand colour, never empty / black / transparent)
 *  3. every <text>/<tspan> carries an explicit font-family in the brand sans
 *     lineage plus a font-weight
 */

const MODULES = [
  "MV-DASH-GAUGE-ROW",
  "MV-DASH-DONUT-TRIO",
  "MV-DASH-SUMMARY",
  "MV-DASH-PERFORMANCE",
  "MV-DASH-BREAKDOWN",
  "MV-DASH-GROWTH-COLUMNS",
  "MV-DASH-REGION-STATS",
  "MV-DASH-REPORT-CARDS",
  "MV-DASH-SALES-CHART",
  "MV-KPI-DASHBOARD",
  "MV-GRAPH-RINGS",
  "MV-INFO-DONUT",
  "MV-INFO-FUNNEL",
  "MV-INFO-PYRAMID",
  "MV-INFO-VENN",
  "MV-INFO-CIRCULAR-FLOW",
  "MV-INFO-BAR-COMPARE",
  "MV-INFO-HUB-PILL-ORBIT",
  "MV-INFO-HUB-SATELLITES",
  "MV-PROC-STAGE-ORBITS",
  "MV-STAT-ORBIT",
  "MV-STAT-ACTUAL-TARGET",
  "MV-STAT-KPI-RAIL",
  "MV-STAT-EDITORIAL-DASH",
] as const;

/** Anything in the brand sans lineage is acceptable; a serif/UA fallback is not. */
const SANS_RE = /geist|inter|system-ui|-apple-system|segoe|helvetica|arial|sans-serif/i;
const BAD_PAINT = new Set(["", "black", "#000", "#000000", "rgb(0, 0, 0)", "transparent", "none"]);

type Finding = {
  variantId: string;
  index: number;
  issues: string[];
};

/**
 * The grid lazy-mounts previews, so isolate one module at a time through the
 * library's own search field: the match lands at the top of the grid, in view,
 * and mounts for real.
 */
async function isolate(page: Page, id: string) {
  const search = page.getByPlaceholder("Search by name, ID, or purpose");
  // Retry the query: a fill that lands before React hydrates sets the DOM value
  // without updating state, so the grid would never filter and the module would
  // stay unmounted below the fold.
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
  // Auto-fix passes (wcag) run on a 300ms timer per preview; let them settle so
  // the audited markup is the markup the exporter would actually see.
  await page.waitForTimeout(900);
}

/** Serialize every SVG of every listed module through the shipping exporter. */
async function auditSerializedSvg(page: Page, ids: readonly string[]) {
  return await page.evaluate(
    async ({ ids, sansSource, badPaints }) => {
      const sans = new RegExp(sansSource, "i");
      const { serializeSvgForExport } = await import("/src/lib/export-dom-decompose.ts");

      const findings: { variantId: string; index: number; issues: string[] }[] = [];
      const seen: string[] = [];

      for (const id of ids) {
        const host = document.querySelector<HTMLElement>(`[data-variant-id="${id}"]`);
        if (!host) {
          findings.push({ variantId: id, index: -1, issues: ["module not rendered on page"] });
          continue;
        }
        seen.push(id);
        const svgs = Array.from(host.querySelectorAll("svg"));
        if (svgs.length === 0) continue;

        svgs.forEach((svg, i) => {
          const issues: string[] = [];
          const rect = svg.getBoundingClientRect();
          const source = new XMLSerializer().serializeToString(svg);
          const xml = serializeSvgForExport(
            svg as SVGSVGElement,
            Math.max(1, Math.round(rect.width)),
            Math.max(1, Math.round(rect.height)),
          );

          if (!xml) {
            findings.push({ variantId: id, index: i, issues: ["serializer returned null"] });
            return;
          }

          // 1 — nothing unresolved may survive into the standalone document.
          if (xml.includes("var(")) {
            const sample = (xml.match(/var\([^)]*\)/g) ?? []).slice(0, 3).join(", ");
            issues.push(`unresolved CSS var in shipped markup: ${sample}`);
          }
          if (xml.includes("currentColor")) issues.push("currentColor survived serialization");

          // 2 — accent paints must land on the live accent colour.
          const accent = getComputedStyle(svg).getPropertyValue("--slide-accent-text").trim();
          if (source.includes("--slide-accent-text")) {
            if (!accent || badPaints.includes(accent.toLowerCase())) {
              issues.push(`--slide-accent-text computes to an unusable paint: "${accent}"`);
            } else if (!xml.includes(accent)) {
              issues.push(`accent references did not resolve to "${accent}"`);
            }
          }

          // 3 — type must be pinned; a standalone SVG cannot reach web fonts.
          const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
          if (doc.querySelector("parsererror")) {
            issues.push("serialized markup is not parseable XML");
          } else {
            for (const node of Array.from(doc.querySelectorAll("text, tspan"))) {
              const family = node.getAttribute("font-family") ?? "";
              const weight = node.getAttribute("font-weight") ?? "";
              const inherited = node.closest("text")?.getAttribute("font-family") ?? "";
              const effective = family || inherited;
              if (!effective) {
                issues.push(`<${node.tagName}> has no font-family`);
                break;
              }
              if (!sans.test(effective)) {
                issues.push(`<${node.tagName}> font-family outside brand sans: ${effective}`);
                break;
              }
              if (node.tagName.toLowerCase() === "text" && !weight) {
                issues.push("<text> has no font-weight");
                break;
              }
            }
          }

          if (issues.length > 0) findings.push({ variantId: id, index: i, issues });
        });
      }
      return { findings, seen };
    },
    { ids: [...ids], sansSource: SANS_RE.source, badPaints: [...BAD_PAINT] },
  );
}

function format(findings: Finding[]) {
  return findings
    .map((f) => `${f.variantId} (svg #${f.index}): ${f.issues.join(" | ")}`)
    .join("\n");
}

test.describe("Gauge / effect SVG export parity", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`serialized SVG resolves accent vars and pins fonts (${mode})`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.goto("/public/modules", { waitUntil: "domcontentloaded" });
      await page.getByPlaceholder("Search by name, ID, or purpose").waitFor({ timeout: 60_000 });

      if (mode === "dark") {
        await page.getByRole("button", { name: /^dark$/i }).first().click();
        await page.waitForTimeout(400);
      }

      const findings: Finding[] = [];
      const audited: string[] = [];

      for (const id of MODULES) {
        await isolate(page, id);
        const result = await auditSerializedSvg(page, [id]);
        findings.push(...(result.findings as Finding[]));
        audited.push(...result.seen);
      }

      expect(audited.length, "gauge/effect modules rendered by the library").toBe(MODULES.length);
      expect(format(findings)).toBe("");
    });
  }
});
