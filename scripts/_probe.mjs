import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1800 } })).newPage();
await p.goto("http://localhost:8080/library", { waitUntil: "domcontentloaded" });
await p.waitForSelector("[data-variant-card]", { timeout: 60000 });
await p.waitForTimeout(6000);
console.log(await p.evaluate(() => {
  const c = document.querySelector('[data-variant-id="MV-CTX-CARDS-3"]');
  return { found: !!c, stretch: c ? c.querySelectorAll(".slide-fill-stretch").length : -1, txt: c?.innerHTML.slice(0, 2500) };
}));
await b.close();
