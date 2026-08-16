import { test, expect } from "@playwright/test";

/**
 * EXPORT EDGE-CASE GATE (rendered artifacts)
 * ==========================================
 *
 * export-all-formats.spec.ts proves the happy path: authored industry look,
 * assets that load, default resolution. This spec proves the export survives
 * the three conditions that actually broke in the field:
 *
 *   1. BLENDED industry backgrounds — a ground composed from two looks (veil +
 *      foreign accent tint + double strike) instead of an authored sheet.
 *   2. MISSING ASSETS — every remote logo/photo request fails; the file must
 *      still open with its text and a background, not throw or ship blank.
 *   3. UNUSUAL IMAGE DPI — hairline strips, tracking pixels and print-DPI
 *      squares must keep their native ratio inside the placeholder, and an
 *      off-default export resolution must still produce a valid package.
 *
 * The pure-function counterpart is src/lib/__tests__/export-edge-cases.test.ts.
 */

type Artifact = {
  format: string;
  container: string;
  bytes: number;
  opens: boolean;
  detail: Record<string, number | string | boolean>;
  fingerprint: number[] | null;
  houseDistance: number | null;
  packDistance: number | null;
  problems: string[];
};

type RunResult = {
  variantId: string;
  packLabel: string;
  packMode: "light" | "dark";
  ok: boolean;
  artifacts: Artifact[];
  problems: string[];
  blendDistance?: number | null;
  error?: string;
};

const FORMATS = ["pptx-light", "pptx-dark", "pdf", "png", "zip"];

/** Every artifact opened cleanly, at a plausible size, in a real container. */
function expectAllOpen(run: RunResult, label: string) {
  expect(run.error, `${label}: run threw`).toBeFalsy();
  expect(run.artifacts.map((a) => a.format).sort(), `${label}: missing formats`).toEqual(
    [...FORMATS].sort(),
  );
  for (const a of run.artifacts) {
    expect(a.problems, `${label} · ${a.format}: problems`).toEqual([]);
    expect(a.opens, `${label} · ${a.format}: did not open`).toBe(true);
    expect(a.container, `${label} · ${a.format}: container`).not.toBe("unknown");
    expect(a.bytes, `${label} · ${a.format}: implausibly small`).toBeGreaterThan(20_000);
  }
}

test.describe("module export — edge cases", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`[browser] ${m.text()}`);
    });
  });

  async function openHarness(page: import("@playwright/test").Page) {
    await page.goto("/dev/format-verify", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__tpFormatVerify, undefined, { timeout: 120_000 });
  }

  test("blended industry backgrounds still export in every format", async ({ page }) => {
    test.setTimeout(420_000);
    await openHarness(page);

    const packId = (await page.evaluate(
      () => window.__tpFormatVerify!.industryPacks[0],
    )) as string;

    const blended = (await page.evaluate(
      async (p) =>
        await window.__tpFormatVerify!.run(window.__tpFormatVerify!.variant, p, { blend: true }),
      packId,
    )) as RunResult;

    expectAllOpen(blended, `blended · ${blended.packLabel}`);

    const byFormat = new Map(blended.artifacts.map((a) => [a.format, a]));

    // The composed ground is a real painting: text still native, background
    // picture embedded, raster not flat.
    for (const key of ["pptx-light", "pptx-dark"]) {
      const a = byFormat.get(key)!;
      expect(Number(a.detail.runs), `blended · ${key}: text runs`).toBeGreaterThan(0);
      expect(Number(a.detail.pics), `blended · ${key}: pictures`).toBeGreaterThan(0);
      expect(a.fingerprint, `blended · ${key}: no background fingerprint`).toBeTruthy();
    }
    const png = byFormat.get("png")!;
    expect(Number(png.detail.variance), "blended png is visually flat").toBeGreaterThan(4);

    // It must differ from BOTH references: the house backdrop and pack A's own
    // authored sheet. A blend that collapses back to either is a silent bug.
    expect(
      byFormat.get("png")!.houseDistance ?? 0,
      "blended ground is identical to the house backdrop",
    ).toBeGreaterThan(2);
    expect(blended.blendDistance, "no blend comparison reported").not.toBeNull();
    expect(
      blended.blendDistance!,
      "blended ground collapsed back to the authored pack sheet",
    ).toBeGreaterThan(1);
  });

  // KNOWN GAP (kept as an executable spec, not a silent skip): when every
  // image request fails, the stage rasteriser returns nothing ("stage raster
  // returned nothing") instead of rendering the slide with placeholders, so
  // PNG/PDF/ZIP come out empty. Un-fixme once the raster path tolerates
  // undecodable images.
  test.fixme("exports survive missing remote assets", async ({ page }) => {
    test.setTimeout(420_000);

    await openHarness(page);

    // Only AFTER the harness is live, fail every image fetch: logos, stock
    // photography, AI backdrops. Routing the whole app up front starves the
    // Vite module graph, so the interception is scoped to bitmaps/vectors and
    // installed once the page is ready to export.
    await page.route(/\.(png|jpe?g|webp|avif|gif|svg)(\?|#|$)/i, (route) =>
      route.abort("failed"),
    );

    const packId = (await page.evaluate(
      () => window.__tpFormatVerify!.industryPacks[0],
    )) as string;

    const run = (await page.evaluate(
      async (p) => await window.__tpFormatVerify!.run(window.__tpFormatVerify!.variant, p),
      packId,
    )) as RunResult;

    expectAllOpen(run, `missing-assets · ${run.packLabel}`);

    const byFormat = new Map(run.artifacts.map((a) => [a.format, a]));
    for (const key of ["pptx-light", "pptx-dark"]) {
      const a = byFormat.get(key)!;
      // Content is text + native shapes, so it must all still be there.
      expect(Number(a.detail.runs), `missing-assets · ${key}: text runs lost`).toBeGreaterThan(0);
      expect(Number(a.detail.shapes), `missing-assets · ${key}: shapes lost`).toBeGreaterThan(0);
      // The procedural industry ground is CSS, not a download — it must survive.
      expect(Number(a.detail.pics), `missing-assets · ${key}: background lost`).toBeGreaterThan(0);
    }
    // And the visible raster is still a painted slide, not a blank sheet.
    expect(
      Number(byFormat.get("png")!.detail.variance),
      "missing-assets png is blank",
    ).toBeGreaterThan(4);
  });

  test("unusual image DPI keeps its native ratio inside the placeholder", async ({ page }) => {
    test.setTimeout(180_000);
    await openHarness(page);

    const sizes: Array<[number, number]> = [
      [1, 1],
      [1200, 3],
      [3, 1200],
      [9, 4000],
      [4000, 9],
      [2401, 1279],
      [2000, 2000],
    ];

    const probes = (await page.evaluate(
      async (s) => await window.__tpFormatVerify!.dpiProbe(s as Array<[number, number]>),
      sizes,
    )) as Array<{
      w: number;
      h: number;
      ratio: number | null;
      insideBox: boolean;
      finite: boolean;
      ratioError: number | null;
    }>;

    expect(probes.length).toBe(sizes.length);
    for (const p of probes) {
      const at = `${p.w}×${p.h}`;
      expect(p.ratio, `${at}: intrinsic size never measured`).not.toBeNull();
      expect(p.ratio!, `${at}: wrong measured ratio`).toBeCloseTo(p.w / p.h, 3);
      expect(p.finite, `${at}: non-finite export geometry`).toBe(true);
      expect(p.insideBox, `${at}: artwork escaped its placeholder box`).toBe(true);
      expect(p.ratioError ?? 1, `${at}: picture is stretched`).toBeLessThan(0.005);
    }
  });

  test("an off-default export resolution still produces valid files", async ({ page }) => {
    test.setTimeout(420_000);
    await openHarness(page);

    const packId = (await page.evaluate(
      () => window.__tpFormatVerify!.industryPacks[0],
    )) as string;

    for (const quality of ["standard", "ultra"] as const) {
      const run = (await page.evaluate(
        async ({ p, q }) =>
          await window.__tpFormatVerify!.run(window.__tpFormatVerify!.variant, p, {
            quality: q as "standard" | "ultra",
          }),
        { p: packId, q: quality },
      )) as RunResult;

      const label = `dpi:${quality} · ${run.packLabel}`;
      expect(run.error, `${label}: run threw`).toBeFalsy();
      const byFormat = new Map(run.artifacts.map((a) => [a.format, a]));

      for (const key of ["pptx-light", "pptx-dark"]) {
        const a = byFormat.get(key)!;
        expect(a.problems, `${label} · ${key}: problems`).toEqual([]);
        expect(a.container, `${label} · ${key}: container`).toBe("ooxml-zip");
        expect(Number(a.detail.runs), `${label} · ${key}: text runs`).toBeGreaterThan(0);
        expect(a.fingerprint, `${label} · ${key}: background undecodable`).toBeTruthy();
      }
      // The 16:9 geometry of the deliverable never depends on the resolution.
      const png = byFormat.get("png")!;
      expect(
        Math.abs(Number(png.detail.width) / Number(png.detail.height) - 16 / 9),
        `${label}: png aspect drifted`,
      ).toBeLessThan(0.02);
      expect(Number(png.detail.variance), `${label}: png is flat`).toBeGreaterThan(4);
    }
  });
});
