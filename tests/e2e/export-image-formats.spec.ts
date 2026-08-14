import { test, expect } from "@playwright/test";

/**
 * End-to-end export gate for embedded picture formats.
 *
 * Exports sample decks whose slides carry KNOWN imagery — a bitmap with real
 * transparency, a fully opaque photograph, and a WebP source — through the REAL
 * exporter for each combination of the two export image options, then sniffs the
 * bytes that actually landed in ppt/media (never the extension) and asserts they
 * match the selected toggle:
 *
 *   default            → nothing PowerPoint 2016 cannot decode (WebP re-encoded)
 *   JPEG/PNG only      → every embedded bitmap is JPEG or PNG
 *   transparent → PNG  → transparency stays PNG, opaque goes to JPEG
 */

type EmbedRow = {
  sample: "transparent" | "opaque" | "webp" | "other";
  sourceFormat: string;
  embeddedFormat: string;
  transcoded: boolean;
  transcodeFailed: boolean;
};

type FormatAudit = {
  legacyImages: boolean;
  alphaImages: boolean;
  formatCounts: Record<string, number>;
  risky: string[];
  embeds: EmbedRow[];
  slides: number;
  problems: string[];
  error?: string;
};

const UNDECODABLE = ["webp", "avif", "heic", "unknown"];

function sample(audit: FormatAudit, key: EmbedRow["sample"]): EmbedRow | undefined {
  return audit.embeds.find((e) => e.sample === key);
}

test.describe("PPTX export embedded image formats", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`[browser] ${m.text()}`);
    });
    await page.goto("/dev/image-format-verify", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!window.__tpImageFormatVerify, undefined, {
      timeout: 120_000,
    });
  });

  test("every option produces PowerPoint-decodable formats that match the selection", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    const audits = (await page.evaluate(() =>
      window.__tpImageFormatVerify!.run([
        { legacyImages: false, alphaImages: false },
        { legacyImages: true, alphaImages: false },
        { legacyImages: false, alphaImages: true },
      ]),
    )) as FormatAudit[];

    expect(audits).toHaveLength(3);

    for (const audit of audits) {
      const label = `legacy=${audit.legacyImages} alpha=${audit.alphaImages}`;
      expect(audit.error, `${label}: export failed`).toBeUndefined();
      expect(audit.slides, `${label}: no slides exported`).toBeGreaterThan(0);

      // 1. Package-level invariant, true for every option: nothing in ppt/media
      //    may be a format an older PowerPoint shows as a broken picture.
      expect(audit.risky, `${label}: undecodable media in package`).toEqual([]);
      for (const fmt of Object.keys(audit.formatCounts)) {
        expect(UNDECODABLE, `${label}: ${fmt} embedded`).not.toContain(fmt);
      }
      expect(
        audit.embeds.filter((e) => e.transcodeFailed),
        `${label}: a needed re-encode failed`,
      ).toEqual([]);

      // 2. The sample bitmaps must all be accounted for in the embed ledger.
      const transparent = sample(audit, "transparent");
      const opaque = sample(audit, "opaque");
      expect(transparent, `${label}: transparent sample not embedded`).toBeTruthy();
      expect(opaque, `${label}: opaque sample not embedded`).toBeTruthy();

      // 3. Alpha survival is non-negotiable under every option: a cutout that
      //    became JPEG shows a white box behind it in the deck.
      expect(transparent!.embeddedFormat, `${label}: transparency lost`).toBe("png");

      // 4. A WebP source is always re-encoded, whatever the toggles say.
      const webp = sample(audit, "webp");
      if (webp) {
        expect(webp.sourceFormat, `${label}: sample was not WebP`).toBe("webp");
        expect(webp.transcoded, `${label}: WebP passed through`).toBe(true);
        expect(["png", "jpeg"], `${label}: WebP re-encode target`).toContain(
          webp.embeddedFormat,
        );
      }

      // 5. Toggle-specific expectations.
      if (audit.legacyImages) {
        // "JPEG/PNG only": the whole package, not just our samples.
        expect(
          Object.keys(audit.formatCounts).sort(),
          `${label}: non JPEG/PNG media`,
        ).toEqual(Object.keys(audit.formatCounts).filter((f) => f === "jpeg" || f === "png").sort());
      }
      if (audit.alphaImages) {
        // "transparent → PNG, photos → JPEG": the opaque sample must be JPEG and
        // must have been re-encoded by the alpha rule.
        expect(opaque!.embeddedFormat, `${label}: opaque sample not JPEG`).toBe("jpeg");
        expect(transparent!.transcoded, `${label}: transparent not alpha-normalized`).toBe(true);
      }
    }
  });
});
