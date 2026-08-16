import { test, expect } from "@playwright/test";

/**
 * End-to-end gate for the library export panel's full format matrix.
 *
 * A representative module section is exported to EVERY format the panel offers
 * — PPTX light, PPTX dark, PDF, PNG, and the ZIP bundle — for real industry
 * looks, and each artifact is audited for two things:
 *
 *   1. it OPENS: true container sniff (zip central directory / %PDF / PNG
 *      magic), required parts present, no truncation, no empty bundle entries;
 *   2. it carries the INDUSTRY BACKGROUND: the painted pixels fingerprint close
 *      to the pack's own rasterized background sheet, and measurably away from
 *      the same module rendered in the house look.
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
  packId: string;
  packLabel: string;
  packMode: "light" | "dark";
  ok: boolean;
  artifacts: Artifact[];
  problems: string[];
  error?: string;
};

const FORMATS = ["pptx-light", "pptx-dark", "pdf", "png", "zip"];

// Two industry looks: enough to prove the background is pack-specific rather
// than a single hardcoded sheet, while keeping the gate inside CI budget.
const PACK_SAMPLE = 2;

test.describe("module export — every format", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`[browser] ${m.text()}`);
    });
    await page.goto("/dev/format-verify", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__tpFormatVerify, undefined, { timeout: 120_000 });
  });

  test("PPTX, PDF, PNG and ZIP all open and carry the industry background", async ({ page }) => {
    test.setTimeout(420_000);

    const packs = (await page.evaluate(
      (n) => window.__tpFormatVerify!.industryPacks.slice(0, n),
      PACK_SAMPLE,
    )) as string[];
    expect(packs.length, "no industry looks registered").toBe(PACK_SAMPLE);

    const runs: RunResult[] = [];
    for (const packId of packs) {
      runs.push(
        (await page.evaluate(
          async (p) => await window.__tpFormatVerify!.run(window.__tpFormatVerify!.variant, p),
          packId,
        )) as RunResult,
      );
    }

    const houseDistances: number[] = [];

    for (const run of runs) {
      const label = `${run.variantId} · ${run.packLabel}`;
      expect(run.error, `${label}: run threw`).toBeFalsy();

      // Every format was produced.
      expect(
        run.artifacts.map((a) => a.format).sort(),
        `${label}: missing formats`,
      ).toEqual([...FORMATS].sort());

      for (const a of run.artifacts) {
        const at = `${label} · ${a.format}`;
        // 1. It opens, with no structural complaints.
        expect(a.problems, `${at}: problems`).toEqual([]);
        expect(a.opens, `${at}: did not open cleanly`).toBe(true);
        expect(a.container, `${at}: wrong container`).not.toBe("unknown");
        expect(a.bytes, `${at}: implausibly small file`).toBeGreaterThan(20_000);
      }

      const byFormat = new Map(run.artifacts.map((a) => [a.format, a]));

      // PPTX: both modes carry slide content as real objects.
      for (const key of ["pptx-light", "pptx-dark"]) {
        const a = byFormat.get(key)!;
        expect(a.detail.slides, `${label} · ${key}: slide count`).toBe(1);
        expect(Number(a.detail.runs), `${label} · ${key}: text runs`).toBeGreaterThan(0);
        expect(Number(a.detail.pics), `${label} · ${key}: pictures`).toBeGreaterThan(0);
      }

      // PDF: one page, a full-width embedded raster, complete trailer.
      const pdf = byFormat.get("pdf")!;
      expect(pdf.detail.pages, `${label} · pdf: pages`).toBe(1);
      expect(Number(pdf.detail.rasterWidth), `${label} · pdf: raster width`).toBeGreaterThanOrEqual(
        960,
      );

      // PNG: 16:9, high resolution, and not a flat/blank capture.
      const png = byFormat.get("png")!;
      expect(Number(png.detail.width), `${label} · png: width`).toBeGreaterThanOrEqual(1600);
      expect(Number(png.detail.variance), `${label} · png: visually flat`).toBeGreaterThan(4);

      // ZIP: reopens with every artifact inside, none empty.
      const zip = byFormat.get("zip")!;
      expect(Number(zip.detail.entries), `${label} · zip: entries`).toBeGreaterThanOrEqual(4);
      expect(
        Number(zip.detail.smallestEntryBytes),
        `${label} · zip: empty entry`,
      ).toBeGreaterThan(0);

      // 2. Industry background evidence.
      //    The pack sheet is rasterized in the look's own mode, so only the
      //    artifacts rendered in that mode are compared against it; the opposite
      //    PPTX mode is legitimately a different (inverted) painting.
      const sheetComparable = [`pptx-${run.packMode}`, "pdf", "png"];
      for (const key of ["pptx-light", "pptx-dark", "pdf", "png"]) {
        const a = byFormat.get(key)!;
        expect(a.fingerprint, `${label} · ${key}: nothing rasterized to fingerprint`).toBeTruthy();
        expect(a.houseDistance, `${label} · ${key}: no house comparison`).not.toBeNull();
        houseDistances.push(a.houseDistance!);
        if (!sheetComparable.includes(key)) continue;
        expect(a.packDistance, `${label} · ${key}: no pack sheet comparison`).not.toBeNull();
        // Close to the pack's own background sheet: the industry artwork landed.
        expect(a.packDistance!, `${label} · ${key}: background is not the pack sheet`).toBeLessThan(
          90,
        );
      }

      // The look must differ from the house default somewhere in the artwork.
      const maxHouse = Math.max(
        ...["pptx-light", "pptx-dark", "pdf", "png"].map(
          (k) => byFormat.get(k)!.houseDistance ?? 0,
        ),
      );
      expect(maxHouse, `${label}: exports look identical to the house backdrop`).toBeGreaterThan(2);
    }

    // Two different industry looks must not produce interchangeable artwork.
    const [a, b] = runs.map((r) => r.artifacts.find((x) => x.format === "png")!.fingerprint!);
    const drift =
      a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / Math.max(1, a.length);
    expect(drift, "two industry looks rendered the same background").toBeGreaterThan(2);
  });
});
