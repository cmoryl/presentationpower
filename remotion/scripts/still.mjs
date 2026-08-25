import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
const serveUrl = await bundle({
  entryPoint: "/dev-server/remotion/src/index.ts",
  webpackOverride: (c) => c,
});
const browser = await openBrowser("chrome", {
  browserExecutable: "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});
const composition = await selectComposition({ serveUrl, id: "admin", puppeteerInstance: browser });
for (const f of [70, 200, 450, 700, 870]) {
  await renderStill({
    composition,
    serveUrl,
    frame: f,
    output: `/tmp/films/chk-${f}.png`,
    puppeteerInstance: browser,
    overwrite: true,
  });
}
await browser.close({ silent: false });
console.log("stills ok");
