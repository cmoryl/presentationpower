import { chromium } from "playwright";
const b = await chromium.launch({ headless: true, executablePath: process.env.PW_CHROME });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1800 } })).newPage();
await p.goto("http://localhost:8080/library", { waitUntil: "domcontentloaded" });
await p.waitForSelector("[data-variant-card]", { timeout: 60000 });
await p.waitForTimeout(5000);
for (const id of ["MV-COMPARE-SLIDER"]) {
  const el = await p.$(`[data-variant-id="${id}"]`);
  if (!el) { console.log(id, "missing"); continue; }
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(2500);
  console.log(id, await p.evaluate((i) => {
    const c = document.querySelector(`[data-variant-id="${i}"]`);
    const st = c.querySelector("[data-slide-stage]");
    const sr = st.getBoundingClientRect();
    const out = [];
    for (const el of st.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.height < 4) continue;
      const cs = getComputedStyle(el);
      out.push({
        tag: el.tagName,
        cls: (el.className || "").toString().slice(0, 48),
        t: +((r.top - sr.top) / sr.height).toFixed(2),
        b: +((r.bottom - sr.top) / sr.height).toFixed(2),
        bg: cs.backgroundColor,
        bgi: cs.backgroundImage.slice(0, 18),
        bf: cs.backdropFilter,
        sh: cs.boxShadow.slice(0, 18),
      });
    }
    return out.filter((o) => o.b > 0.6);
  }, id));
}
await b.close();
