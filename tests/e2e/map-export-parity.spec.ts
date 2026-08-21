/**
 * Export regression: the Global Locations map and the signature header must
 * come out of the PDF and PPTX pipelines identical to what the editor shows.
 *
 * The harness route /dev/map-export-parity renders one locations page with a
 * fixed 15-pin probe grid plus the real "Export proposal" control. For each
 * target we compare:
 *   - pin COUNT       (nothing dropped, no authoring chrome rasterised in)
 *   - pin POSITIONS   (normalised centroids, per page geometry)
 *   - HEADER LAYOUT   (eyebrow / title / rule / logo band signature)
 * against the on-screen DOM truth and the on-screen capture.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, expect, type Page, type Download } from "@playwright/test";

const METRICS = path.resolve("scripts/lib/map-parity-metrics.py");
/** Map band scanned for pins (excludes the legend swatches below the map). */
const BAND = ["0.23", "0.715"];
/** Header band: eyebrow, title, hairline rule, logo. */
const HEADER = ["0.0", "0.22"];
/** Normalised centroid tolerance (~2px at 1275px wide). */
const POS_TOL = 0.006;
/** Mean absolute grayscale delta allowed across the header signature. */
const HEADER_TOL = 26;

type Metrics = {
  w: number;
  h: number;
  pins: Array<{ x: number; y: number; kind: string; area: number }>;
  header: number[];
};

function metricsFor(image: string): Metrics {
  const out = execFileSync(
    "python3",
    [METRICS, image, "--band", ...BAND, "--header", ...HEADER],
    { maxBuffer: 64 * 1024 * 1024 },
  ).toString();
  return JSON.parse(out) as Metrics;
}

/**
 * Row-bucketed ordering. Sub-pixel jitter between the screen, the PDF render
 * and the PPTX raster must never reshuffle pins within a row.
 */
function sortPins<T extends { x: number; y: number }>(pins: T[]) {
  const row = (v: number) => Math.round(v * 100) / 100;
  return [...pins].sort((a, b) => row(a.y) - row(b.y) || a.x - b.x);
}

type Pt = { x: number; y: number; kind?: string };

/**
 * Greedy nearest-neighbour pairing of expected (on-screen) pins to captured
 * ones. Index-based pairing is fragile at row boundaries, so parity is measured
 * as: every expected pin has its own captured pin within `tol`, and no captured
 * pin is left over.
 */
function pairPins(expected: Pt[], got: Pt[], tol: number) {
  const used = new Set<number>();
  const worst: Array<{ i: number; d: number; kind?: string }> = [];
  expected.forEach((e, i) => {
    let best = -1;
    let bestD = Infinity;
    got.forEach((g, j) => {
      if (used.has(j)) return;
      const d = Math.hypot(g.x - e.x, g.y - e.y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    if (best >= 0 && bestD <= tol) used.add(best);
    worst.push({ i, d: bestD, kind: best >= 0 ? got[best]!.kind : undefined });
  });
  return { matched: used.size, leftover: got.length - used.size, worst };
}


/** Pin centres from the live SVG, normalised to the print page box. */
async function domPins(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector<HTMLElement>("[data-print-page]");
    if (!host) return [];
    const pageBox = host.getBoundingClientRect();
    return Array.from(host.querySelectorAll<SVGCircleElement>("svg circle")).map((c) => {
      const b = c.getBoundingClientRect();
      return {
        x: (b.x + b.width / 2 - pageBox.x) / pageBox.width,
        y: (b.y + b.height / 2 - pageBox.y) / pageBox.height,
      };
    });
  });
}

/** Header element geometry from the live DOM, normalised to the page box. */
async function domHeader(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector<HTMLElement>("[data-print-page]");
    if (!host) return null;
    const pageBox = host.getBoundingClientRect();
    const norm = (el: Element) => {
      const b = el.getBoundingClientRect();
      return {
        x: (b.x - pageBox.x) / pageBox.width,
        y: (b.y - pageBox.y) / pageBox.height,
        w: b.width / pageBox.width,
      };
    };
    const logo = host.querySelector('img[alt="TransPerfect"]');
    const text = Array.from(host.querySelectorAll<HTMLElement>("*")).filter((el) =>
      /OUR FOOTPRINT/i.test(el.textContent ?? "") && el.children.length === 0,
    );
    return {
      logo: logo ? norm(logo) : null,
      eyebrow: text.length ? norm(text[0]!) : null,
    };
  });
}

async function saveDownload(dl: Download, dir: string, name: string) {
  const file = path.join(dir, name);
  await dl.saveAs(file);
  return file;
}

async function exportAs(page: Page, fmt: "PDF" | "PowerPoint", dir: string, name: string) {
  const wait = page.waitForEvent("download", { timeout: 120_000 });
  await page.getByRole("button", { name: /Export proposal/i }).click();
  await page.getByRole("button", { name: new RegExp(fmt, "i") }).click();
  return saveDownload(await wait, dir, name);
}

test.describe("Global Locations map — export parity", () => {
  test.slow();

  test("PDF and PPTX keep the on-screen pins and header layout", async ({ page }) => {
    const dir = mkdtempSync(path.join(tmpdir(), "map-parity-"));

    await page.goto("/dev/map-export-parity", { waitUntil: "domcontentloaded" });
    const pageEl = page.locator("[data-print-page]").first();
    await expect(pageEl).toBeVisible();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(600);

    // ---- on-screen truth -------------------------------------------------
    const dom = sortPins(await domPins(page));
    expect(dom.length, "probe pins missing from the live map").toBe(15);
    const header = await domHeader(page);
    expect(header?.logo, "header logo missing on screen").toBeTruthy();
    expect(header?.eyebrow, "header eyebrow missing on screen").toBeTruthy();
    // Signature header rhythm: eyebrow flush left, logo flush right.
    expect(header!.eyebrow!.x).toBeLessThan(0.08);
    expect(header!.logo!.x + header!.logo!.w).toBeGreaterThan(0.9);

    const screenShot = path.join(dir, "screen.png");
    await pageEl.screenshot({ path: screenShot });
    const screen = metricsFor(screenShot);
    expect(screen.pins.length, "detector disagreed with the DOM on screen").toBe(dom.length);
    for (const [i, p] of sortPins(screen.pins).entries()) {
      expect(Math.abs(p.x - dom[i]!.x), `screen pin ${i} x`).toBeLessThan(POS_TOL);
      expect(Math.abs(p.y - dom[i]!.y), `screen pin ${i} y`).toBeLessThan(POS_TOL);
    }

    // ---- PDF -------------------------------------------------------------
    const pdf = await exportAs(page, "PDF", dir, "parity.pdf");
    execFileSync("pdftoppm", ["-png", "-r", "150", "-f", "1", "-l", "1", pdf, path.join(dir, "pdf")]);
    const pdfPng = readdirSync(dir)
      .filter((f) => f.startsWith("pdf-") && f.endsWith(".png"))
      .map((f) => path.join(dir, f))[0]!;
    expect(existsSync(pdfPng), "PDF did not render a first page").toBe(true);
    const pdfM = metricsFor(pdfPng);

    // ---- PPTX ------------------------------------------------------------
    const pptx = await exportAs(page, "PowerPoint", dir, "parity.pptx");
    const media = path.join(dir, "pptx-media");
    execFileSync("unzip", ["-o", "-q", pptx, "ppt/media/*", "-d", media]);
    const mediaDir = path.join(media, "ppt", "media");
    const slideImg = readdirSync(mediaDir)
      .map((f) => path.join(mediaDir, f))
      .sort((a, b) => readFileSync(b).length - readFileSync(a).length)[0]!;
    const pptxM = metricsFor(slideImg);

    // ---- parity assertions ----------------------------------------------
    for (const [label, m] of [
      ["pdf", pdfM],
      ["pptx", pptxM],
    ] as const) {
      expect(m.pins.length, `${label}: pin count drifted`).toBe(dom.length);

      const pair = pairPins(dom, sortPins(m.pins), POS_TOL);
      const drifted = pair.worst.filter((wp) => wp.d > POS_TOL);
      expect(
        drifted.map((wp) => `#${wp.i} Δ${wp.d.toFixed(4)}`),
        `${label}: pin positions drifted`,
      ).toEqual([]);
      expect(pair.matched, `${label}: unmatched pins`).toBe(dom.length);
      expect(pair.leftover, `${label}: extra blobs captured (chrome leaked?)`).toBe(0);
      const wrongKind = pair.worst.filter((wp) => wp.kind && wp.kind !== dom[wp.i]!.kind);
      expect(
        wrongKind.map((wp) => `#${wp.i} ${wp.kind} != ${dom[wp.i]!.kind}`),
        `${label}: pin kind colours drifted`,
      ).toEqual([]);


      // Header band signature must match the on-screen header.
      const delta =
        m.header.reduce((sum, v, i) => sum + Math.abs(v - screen.header[i]!), 0) /
        m.header.length;
      expect(delta, `${label}: header layout drifted (mean Δ ${delta.toFixed(1)})`).toBeLessThan(
        HEADER_TOL,
      );
    }

    writeFileSync(
      path.join(dir, "summary.json"),
      JSON.stringify({ dom: dom.length, pdf: pdfM.pins.length, pptx: pptxM.pins.length }, null, 2),
    );
  });
});
