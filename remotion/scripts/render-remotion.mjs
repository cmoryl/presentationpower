import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ids = process.argv.slice(2);
if (ids.length === 0) throw new Error("pass composition ids");

const serveUrl = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser });
  await renderStill({
    composition,
    serveUrl,
    frame: 60,
    output: `/tmp/films/${id}-poster.jpg`,
    imageFormat: "jpeg",
    jpegQuality: 90,
    puppeteerInstance: browser,
    overwrite: true,
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 20,
    outputLocation: `/tmp/films/${id}.mp4`,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 4,
    overwrite: true,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 20 === 0) console.log(id, Math.round(progress * 100) + "%");
    },
  });
  console.log("done", id);
}

await browser.close({ silent: false });
