import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1800 } })).newPage();
await p.goto("http://localhost:8080/library", { waitUntil: "domcontentloaded" });
await p.waitForSelector("[data-variant-card]", { timeout: 60000 });
await p.waitForTimeout(5000);
for (const id of ["MV-COMPARE-SLIDER", "MV-IMG-MATRIX-4", "MV-CASE-METRICS"]) {
  const el = await p.$(`[data-variant-id="${id}"]`);
  if (!el) { console.log(id, "missing"); continue; }
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(2500);
  console.log(id, await p.evaluate((i) => {
    const c = document.querySelector(`[data-variant-id="${i}"]`);
    const st = c.querySelector("[data-slide-stage]");
    const sr = st.getBoundingClientRect();
    const g = c.querySelector(".slide-fill-stretch");
    if (!g) return { stretch: false };
    const gr = g.getBoundingClientRect();
    return { stretch: true, top: +((gr.top - sr.top) / sr.height).toFixed(2), bottom: +((gr.bottom - sr.top) / sr.height).toFixed(2) };
  }, id));
}
await b.close();
