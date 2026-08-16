import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1800 } })).newPage();
await p.goto("http://localhost:8080/library", { waitUntil: "domcontentloaded" });
await p.waitForSelector("[data-variant-card]", { timeout: 60000 });
await p.waitForTimeout(6000);
const el = await p.$('[data-variant-id="MV-CTX-CARDS-3"]');
await el.scrollIntoViewIfNeeded();
await p.waitForTimeout(4000);
console.log(await p.evaluate(() => {
  const c = document.querySelector('[data-variant-id="MV-CTX-CARDS-3"]');
  const stage = c.querySelector('[data-slide-stage]');
  const sr = stage.getBoundingClientRect();
  const grid = c.querySelector('.slide-fill-stretch');
  const gr = grid.getBoundingClientRect();
  const plane = c.querySelector('[data-slide-content-plane]');
  const pr = plane.getBoundingClientRect();
  const cs = getComputedStyle(grid);
  return {
    stage: { top: sr.top, h: sr.height },
    plane: { top: pr.top - sr.top, h: pr.height, display: getComputedStyle(plane).display },
    grid: { top: gr.top - sr.top, h: gr.height, rows: cs.gridTemplateRows, flex: cs.flex, alignContent: cs.alignContent },
  };
}));
await b.close();
