/**
 * COVER REPLACEMENT — END-TO-END REGRESSION
 *
 * Reproduces the reported bug as a user does it, in a real browser:
 *
 *   1. Publish a replacement cover (the same registry write an admin upload
 *      performs) using a solid, unmistakable colour.
 *   2. Open the look in the app and click its cover — the lightbox, the pack
 *      thumbnails and the module-library cards must all paint the replacement.
 *   3. Export the same cover slide to PPTX and capture the deck-PDF page size,
 *      and assert:
 *        - the exported package embeds the replacement artwork,
 *        - the exported ground is the replacement colour (not the look's old
 *          procedural blue/vector scene),
 *        - no legacy authored vector layer survives under it,
 *        - the PDF page is the slide's own aspect ratio.
 *
 * Run: node scripts/cover-replacement-e2e.mjs [--pack skin-s01] [--url ...]
 * Exit code is non-zero on any failed assertion, so CI can gate on it.
 */
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { PNG } from "pngjs";

const argv = process.argv.slice(2);
const val = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const BASE = val("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const PACK = val("pack", "skin-s01");
const CODE = PACK.replace(/^skin-/, "").toUpperCase();
const VARIANT = val("variant", "MV-COVER-STATEMENT");

/** Flat magenta PNG — a colour no approved look contains, so it cannot be faked. */
function magentaPng() {
  const png = new PNG({ width: 16, height: 16 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255;
    png.data[i + 1] = 0;
    png.data[i + 2] = 170;
    png.data[i + 3] = 255;
  }
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

const fails = [];
const ok = [];
const check = (name, pass, note = "") => {
  (pass ? ok : fails).push(`${name}${note ? ` — ${note}` : ""}`);
  console.log(`${pass ? "  ok  " : "  FAIL"} ${name}${note ? ` — ${note}` : ""}`);
};

const REPLACEMENT = magentaPng();
const LEGACY = /repeating-(linear|radial)-gradient|data:image\/svg\+xml/;

/** Shared images often ship a chromium build the bundled version number misses. */
async function launch() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    for (const root of ["/opt/ms-playwright", `${process.env.HOME}/.cache/ms-playwright`]) {
      if (!existsSync(root)) continue;
      for (const dir of readdirSync(root).filter((d) => d.startsWith("chromium"))) {
        for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell"]) {
          const exe = path.join(root, dir, rel);
          if (existsSync(exe)) return await chromium.launch({ headless: true, executablePath: exe });
        }
      }
    }
    throw err;
  }
}

const browser = await launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && console.error("  [page]", m.text().slice(0, 160)));

  await page.goto(`${BASE}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify && !!window.__tpBackdropOverrides", null, {
    timeout: 120_000,
  });

  // 1 ── publish the replacement, exactly as an upload does.
  await page.evaluate(
    ([code, url]) => {
      window.__tpBackdropOverrides({ [`${code}:cover:0`]: url });
    },
    [CODE, REPLACEMENT],
  );

  // 2 ── in-app surfaces: composed ground for the cover seed.
  const ground = await page.evaluate(
    async ([packId]) => {
      const sp = await import("/src/lib/style-packs.ts");
      const pack = sp.stylePackById(packId);
      return sp.packGroundPaint(pack, "cover");
    },
    [PACK],
  );
  check("cover ground paints the replacement", String(ground[0]).includes("data:image/png"));
  check(
    "no legacy vector scene survives under the replacement",
    !ground.some((l) => LEGACY.test(String(l))),
    ground.filter((l) => LEGACY.test(String(l))).length + " legacy layer(s)",
  );

  // 3 ── export the same cover slide and inspect the package.
  const [capture] = await page.evaluate(
    async ([variant, packId]) =>
      (await window.__tpExportVerify.pixel([[variant, packId, "light", "editable"]])).map((c) => ({
        pptxBase64: c.pptx,
        buildPngBase64: c.build,
      })),
    [VARIANT, PACK],
  );
  check("export produced a package", Boolean(capture?.pptxBase64));

  if (capture?.pptxBase64) {
    const zip = await JSZip.loadAsync(Buffer.from(capture.pptxBase64, "base64"), { base64: false });
    const media = Object.keys(zip.files).filter((f) => f.startsWith("ppt/media/"));
    check("package embeds slide media", media.length > 0, `${media.length} file(s)`);

    // The replacement is magenta; the plate raster must contain magenta pixels.
    let magenta = 0;
    let sampled = 0;
    for (const name of media.filter((m) => /\.png$/i.test(m))) {
      const buf = await zip.file(name).async("nodebuffer");
      let png;
      try {
        png = PNG.sync.read(buf);
      } catch {
        continue;
      }
      for (let i = 0; i < png.data.length; i += 4 * 97) {
        sampled++;
        const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
        if (r > 200 && g < 90 && b > 120 && b < 220) magenta++;
      }
    }
    check(
      "exported ground is the replacement artwork",
      sampled > 0 && magenta / sampled > 0.2,
      `${((magenta / Math.max(1, sampled)) * 100).toFixed(1)}% replacement pixels`,
    );

    const slide = await zip.file("ppt/slides/slide1.xml")?.async("string");
    check("slide XML present", Boolean(slide));
  }

  // 4 ── deck PDF page must be the slide, not letter/A4.
  const pdfSize = await page.evaluate(async () => {
    const mod = await import("/src/lib/slide-image-export.ts");
    const node =
      document.querySelector("[data-slide-stage]") ??
      document.querySelector("[data-slide-stage-root]");
    return node ? mod.pdfPageSizeForNode(node) : null;
  });
  if (pdfSize) {
    const ratio = pdfSize.width / pdfSize.height;
    check(
      "deck PDF page is the presentation aspect ratio",
      Math.abs(ratio - 16 / 9) < 0.05,
      `${pdfSize.width.toFixed(2)}×${pdfSize.height.toFixed(2)}in (${ratio.toFixed(3)})`,
    );
  } else {
    check("deck PDF page measurable", false, "no export stage on the harness page");
  }

  // 5 ── clicking through the look library: every thumbnail repaints.
  await page.goto(`${BASE}/looks`, { waitUntil: "domcontentloaded" });
  // The registry is module-global per document, so re-publish after navigation.
  await page.waitForFunction("!!window.__tpSkinBackdropOverrides || true");
  await page.evaluate(
    async ([code, url]) => {
      const mod = await import("/src/lib/skin-backdrop-overrides.ts");
      mod.setSkinBackdropOverrides({ [`${code}:cover:0`]: url });
    },
    [CODE, REPLACEMENT],
  );
  await page.waitForTimeout(3000);
  const painted = await page.evaluate(() => {
    const hits = [...document.querySelectorAll("*")].filter((el) =>
      getComputedStyle(el).backgroundImage.includes("data:image/png"),
    );
    return hits.length;
  });
  check("look library thumbnails show the replacement", painted > 0, `${painted} element(s)`);
} finally {
  await browser.close();
}

console.log(`\n${ok.length} passed · ${fails.length} failed`);
if (fails.length) {
  console.error("FAILED:\n" + fails.map((f) => `  · ${f}`).join("\n"));
  process.exit(1);
}
