import { test, expect } from "@playwright/test";

/**
 * Single-slide PPTX export regression gate.
 *
 * The library card chips and the public module wall download ONE module through
 * `downloadSingleSlidePptx`, a second entry point into the exporter. Nothing
 * gated it, so a defect there (missing background, dropped photos, soft icons)
 * shipped while the deck-path audits stayed green.
 *
 * This test exports the same module through BOTH entry points and asserts the
 * single-slide package carries: a discrete full-bleed background picture, its
 * icon glyphs (vector + an adequately sized raster fallback), and — for an
 * imagery module — its photograph as its own picture object.
 */

type Pair = { deck: string | null; single: string | null; error?: string };

async function inventory(base64: string) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(Buffer.from(base64, "base64"));
  const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
  const picNames = [...xml.matchAll(/<p:pic>[\s\S]*?name="([^"]*)"/g)].map((m) => m[1]);
  const media: Array<{ name: string; bytes: number; longEdge: number | null }> = [];
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/media\/.+/.test(name) || zip.files[name]!.dir) continue;
    const bytes = await zip.file(name)!.async("nodebuffer");
    let longEdge: number | null = null;
    if (/\.png$/i.test(name) && bytes.length > 24) {
      longEdge = Math.max(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    }
    media.push({ name: name.split("/").pop()!, bytes: bytes.length, longEdge });
  }
  return { xml, picNames, media };
}

test.describe("single-slide PPTX export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/export-verify", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__tpExportVerify, undefined, { timeout: 120_000 });
  });

  test("icon module keeps background, icons and logo as discrete objects", async ({ page }) => {
    const pair = (await page.evaluate(
      async () => await window.__tpExportVerify!.pair("MV-BENTO-6", null, "light", "editable"),
    )) as Pair;
    expect(pair.error).toBeFalsy();
    expect(pair.single).toBeTruthy();
    expect(pair.deck).toBeTruthy();

    const single = await inventory(pair.single!);
    // Background is its own full-bleed picture, not a merged plate.
    expect(single.picNames).toContain("TP Background");
    expect(single.picNames).not.toContain("TP Design plate");
    expect(single.picNames).toContain("TP Logo");
    // Icons present as real pictures with vector media alongside.
    expect(single.picNames.filter((n) => n === "TP Icon").length).toBeGreaterThan(0);
    expect(single.media.some((m) => /\.svg$/i.test(m.name))).toBe(true);
    // Every raster fallback is sized for the slide, not the 24px authoring box.
    for (const m of single.media) {
      if (m.longEdge != null) expect(m.longEdge).toBeGreaterThanOrEqual(64);
    }

    // Path parity: the single-slide entry point must not diverge from the deck path.
    const deck = await inventory(pair.deck!);
    expect(single.picNames).toEqual(deck.picNames);
  });

  test("imagery module exports its photograph as its own picture", async ({ page }) => {
    const pair = (await page.evaluate(
      async () => await window.__tpExportVerify!.pair("MV-IMG-SPLIT", null, "light", "editable"),
    )) as Pair;
    expect(pair.error).toBeFalsy();
    expect(pair.single).toBeTruthy();

    const single = await inventory(pair.single!);
    expect(single.picNames).toContain("TP Background");
    expect(single.picNames).toContain("TP Photo");
  });
});
