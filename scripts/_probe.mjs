import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1800 } })).newPage();
await p.goto("http://localhost:8080/library", { waitUntil: "domcontentloaded" });
await p.waitForSelector("[data-variant-card]", { timeout: 60000 });
await p.waitForTimeout(5000);
console.log(await p.evaluate(() => {
  const cards = document.querySelectorAll("[data-variant-card]");
  const c = cards[0];
  const stages = c ? c.querySelectorAll("[data-slide-stage]") : [];
  const r = stages[0]?.getBoundingClientRect();
  return { cards: cards.length, stages: stages.length, rect: r && {w:r.width,h:r.height}, html: c ? c.outerHTML.slice(0,400) : null };
}));
await b.close();
