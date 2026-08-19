import { test, expect } from "@playwright/test";

/**
 * Certified "Preview in PowerPoint" parity gate.
 *
 * The preview panel used to paint only the background plan, so authors saw a
 * bare gradient and assumed the export had dropped their content. It now
 * repaints the REAL export capture (`rasterizeObjectPlate`): the decor plate,
 * every native shape/picture and every editable text run.
 *
 * This test mounts that exact canvas at 1:1 slide scale for key templates and
 * asserts nothing is lost or displaced: painted layer counts equal captured
 * layer counts, every layer sits within 1.5px of its captured geometry, no
 * layer paints with zero area, no text box paints empty, and every picture
 * actually loads.
 */

type CertifiedAudit = {
  variantId: string;
  packId: string | null;
  mode: "light" | "dark";
  ok: boolean;
  captured: { plate: boolean; shapes: number; images: number; runs: number };
  painted: { plate: boolean; shapes: number; images: number; runs: number };
  maxDeltaPx: number;
  zeroArea: number;
  emptyText: number;
  brokenImages: number;
  problems: string[];
  error?: string;
};

/**
 * Key templates: a split cover, an imagery bento, a stat orbit, a process
 * stack and a dashboard — between them they exercise photographs, icons,
 * vector charts, tracked eyebrow copy and dense body text in both modes.
 */
const CASES: Array<{ variant: string; mode: "light" | "dark"; pack: string | null }> = [
  { variant: "MV-OP-COVER-SPLIT", mode: "light", pack: null },
  { variant: "MV-BENTO-6", mode: "light", pack: null },
  { variant: "MV-STAT-ORBIT", mode: "dark", pack: null },
  { variant: "MV-PROC-LAYER-STACK", mode: "light", pack: null },
  { variant: "MV-DASH-REPORT-CARDS", mode: "dark", pack: null },
];

function report(a: CertifiedAudit): string {
  return [
    `${a.variantId} (${a.mode}${a.packId ? ` · ${a.packId}` : ""})`,
    `captured plate=${a.captured.plate} shapes=${a.captured.shapes} images=${a.captured.images} runs=${a.captured.runs}`,
    `painted  plate=${a.painted.plate} shapes=${a.painted.shapes} images=${a.painted.images} runs=${a.painted.runs}`,
    `maxDelta=${a.maxDeltaPx.toFixed(2)}px zeroArea=${a.zeroArea} emptyText=${a.emptyText} brokenImages=${a.brokenImages}`,
    a.error ? `error=${a.error}` : "",
    ...a.problems.map((p) => `  · ${p}`),
  ]
    .filter(Boolean)
    .join("\n");
}

test.describe("certified PowerPoint preview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/export-verify", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__tpExportVerify, undefined, { timeout: 120_000 });
  });

  for (const c of CASES) {
    test(`${c.variant} (${c.mode}) paints every captured layer at 1:1`, async ({ page }) => {
      test.setTimeout(180_000);
      const [audit] = (await page.evaluate(
        async ([variant, pack, mode]) =>
          await window.__tpExportVerify!.certified([
            [variant as string, pack as string | null, mode as "light" | "dark"],
          ]),
        [c.variant, c.pack, c.mode] as const,
      )) as CertifiedAudit[];

      expect(audit, "harness returned no audit").toBeTruthy();
      expect(audit.error, report(audit)).toBeFalsy();

      // The capture itself must be substantive — a preview of nothing proves nothing.
      expect(audit.captured.plate, report(audit)).toBe(true);
      expect(audit.captured.runs, report(audit)).toBeGreaterThan(0);
      expect(
        audit.captured.shapes + audit.captured.images,
        report(audit),
      ).toBeGreaterThan(0);

      // Nothing captured may be missing from the painted preview.
      expect(audit.painted.plate, report(audit)).toBe(true);
      expect(audit.painted.runs, report(audit)).toBe(audit.captured.runs);
      expect(audit.painted.shapes, report(audit)).toBe(audit.captured.shapes);
      expect(audit.painted.images, report(audit)).toBe(audit.captured.images);

      // 1:1 geometry, and every painted layer is actually visible.
      expect(audit.maxDeltaPx, report(audit)).toBeLessThanOrEqual(1.5);
      expect(audit.zeroArea, report(audit)).toBe(0);
      expect(audit.emptyText, report(audit)).toBe(0);
      expect(audit.brokenImages, report(audit)).toBe(0);

      expect(audit.ok, report(audit)).toBe(true);
    });
  }

  test("an imagery module keeps its photographs as discrete preview pictures", async ({ page }) => {
    test.setTimeout(180_000);
    const [audit] = (await page.evaluate(
      async () => await window.__tpExportVerify!.certified([["MV-BENTO-6", null, "light"]]),
    )) as CertifiedAudit[];
    expect(audit.error, report(audit)).toBeFalsy();
    expect(audit.captured.images, report(audit)).toBeGreaterThan(0);
    expect(audit.painted.images, report(audit)).toBe(audit.captured.images);
    expect(audit.brokenImages, report(audit)).toBe(0);
  });
});
