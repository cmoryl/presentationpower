/* v212: the hub on the Spectrum look.
   - a first visit sees what is in the building, as figures taken from the build itself;
   - someone coming back sees where their work stands under the greeting;
   - each way in is a card that answers a click anywhere on it, and still has its own button;
   - the steps are numbered and joined by one line; nothing runs off the side on a phone. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|cdnjs/, (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  await p.goto("file://" + __dirname + "/test.html#as=chris");
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(2500);

  /* ---------- a first visit ---------- */
  const first = await p.evaluate(() => {
    const root = document.querySelector(".lp.sp");
    const stats = [].slice.call(document.querySelectorAll(".hub-stats > div")).map((d) => [d.querySelector("dd").textContent, d.querySelector("dt").textContent]);
    const cards = [].slice.call(document.querySelectorAll(".sp-path"));
    return {
      hub: !!root && root.classList.contains("hub"),
      stats,
      lib: __T.ELIB.length,
      brands: __T.BRANDS.length,
      cards: cards.length,
      glyphs: cards.filter((c) => c.querySelector(".hub-gl svg")).length,
      glyphsHidden: cards.every((c) => (c.querySelector(".hub-gl") || {}).getAttribute && c.querySelector(".hub-gl").getAttribute("aria-hidden") === "true"),
      buttons: cards.filter((c) => c.querySelector("button")).length,
      radius: cards[0] ? getComputedStyle(cards[0]).borderRadius : "",
      h1: [].slice.call(document.querySelectorAll("h1")).filter((e) => !e.closest("[aria-hidden=true]")).length,
    };
  });
  ok("Get started is drawn as the hub", first.hub);
  ok("a first visit is told what is in the building, from the build's own counts", first.stats.length === 4 && +first.stats[0][0] === first.lib && +first.stats[1][0] === first.brands, JSON.stringify(first.stats));
  ok("each of the four ways in is a card with a drawing and its own button", first.cards === 4 && first.glyphs === 4 && first.buttons === 4 && parseFloat(first.radius) >= 16, first.glyphs + " drawings, " + first.buttons + " buttons, radius " + first.radius);
  ok("the drawings are decoration to a reader, and the page still has one heading", first.glyphsHidden && first.h1 === 1, "h1 × " + first.h1);
  const steps = await p.evaluate(() => {
    const li = [].slice.call(document.querySelectorAll(".sp-steps > li"));
    return { n: li.map((x) => getComputedStyle(x, "::before").content.replace(/"/g, "")), rail: li.slice(0, -1).every((x) => { const c = getComputedStyle(x, "::after"); return c.content !== "none" && c.transform === "none" && parseFloat(c.width) > 40; }) };
  });
  ok("the three steps are numbered and joined by one line", steps.n.join("") === "123" && steps.rail, steps.n.join(",") + " rail " + steps.rail);

  /* a click anywhere on a card does what its button does */
  await p.evaluate(() => { const c = document.querySelector(".sp-path.sp-reuse .sp-pt p"); c.click(); });
  await p.waitForTimeout(1800);
  ok("a click anywhere on a card goes where its button goes", (await p.evaluate(() => __T.S().view)) === "library");

  /* ---------- coming back ---------- */
  await p.evaluate(() => __T.go("about"));
  await p.waitForTimeout(1500);
  await p.click('.sp-hero button:has-text("Open the example project")');
  await p.waitForTimeout(2500);
  await p.evaluate(() => __T.go("about"));
  await p.waitForTimeout(3000);
  const back = await p.evaluate(() => {
    const by = { draft: 0, review: 0, changes: 0, approved: 0 };
    (__T.S().projects || []).forEach((pr) => { const s = (pr.summary && pr.summary.by) || {}; Object.keys(by).forEach((k) => (by[k] += +s[k] || 0)); });
    const chips = {};
    [].forEach.call(document.querySelectorAll(".hub-glance li"), (li) => { chips[li.className.replace("hub-g-", "")] = +li.querySelector("b").textContent; });
    const bar = document.querySelector(".sp-work-bar"), pan = document.querySelector(".sp-work-panels");
    const item = document.querySelector(".u-fy-item");
    return {
      greet: (document.querySelector(".sp-work-h") || {}).textContent, by, chips,
      joined: bar && pan ? Math.abs(bar.getBoundingClientRect().bottom - pan.getBoundingClientRect().top) < 2 : false,
      edge: item ? getComputedStyle(item).borderLeftWidth : null,
      band: (function () { const s = document.querySelector(".sp-show"); if (!s) return null; const c = getComputedStyle(s.querySelector("h2")).color; return c; })(),
    };
  });
  ok("someone coming back is greeted", /Welcome back/.test(back.greet || ""), back.greet);
  ok("and sees where their work stands, matching the projects", Object.keys(back.chips).length > 0 && Object.keys(back.chips).every((k) => back.chips[k] === back.by[k]), JSON.stringify(back.chips) + " of " + JSON.stringify(back.by));
  ok("the tabs and the work under them are one panel", back.joined);
  ok("what needs you is a card, not a coloured stripe", back.edge === "1px", "left edge " + back.edge);
  ok("the every-size band sets its words in white on the dark ground", back.band === "rgb(255, 255, 255)", String(back.band));

  /* ---------- the explainer loop ---------- */
  const loop = await p.evaluate(async () => {
    const figs = [].slice.call(document.querySelectorAll(".sp-show .lp-stack .lp-fig"));
    const an = document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest(".sp-stack"));
    const at = (t) => { an.forEach((a) => { a.pause(); a.currentTime = t; }); return figs.map((f) => +getComputedStyle(f).opacity > 0.9 && /^(none|0px( 0px)?)$/.test(getComputedStyle(f).translate)); };
    const early = at(1500), hold = at(8000);
    an.forEach((a) => a.play());
    return { n: an.length, early: early.filter(Boolean).length, hold: hold.filter(Boolean).length, figs: figs.length, dur: an[0] ? an[0].effect.getTiming().duration : 0, iter: an[0] ? an[0].effect.getTiming().iterations === Infinity : false };
  });
  ok("the band plays a loop: the page first, then every size out of it", loop.n >= 5 && loop.early === 1 && loop.hold === loop.figs && loop.figs === 5 && loop.iter === true, JSON.stringify(loop));
  const still = await (async () => {
    const c2 = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    await c2.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|cdnjs/, (r) => r.abort());
    const q = await c2.newPage();
    await q.goto("file://" + __dirname + "/test.html#as=chris");
    await q.waitForTimeout(2500);
    const n = await q.evaluate(() => document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest(".sp-stack")).length);
    await c2.close();
    return n;
  })();
  ok("someone who asked for less motion sees it still", still === 0, still + " animations");

  /* ---------- a phone ---------- */
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(1200);
  const ph = await p.evaluate(() => ({
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cols: getComputedStyle(document.querySelector(".sp-paths")).gridTemplateColumns.split(" ").length,
    stack: (function () { const s = document.querySelector(".sp-show .lp-stack"); const bd = document.querySelector(".sp-show"); if (!s || !bd) return true; const figs = [].slice.call(s.querySelectorAll(".lp-fig")); const r = bd.getBoundingClientRect(); return figs.every((f) => f.getBoundingClientRect().right <= r.right + 1); })(),
  }));
  ok("on a phone nothing runs off the side", ph.over <= 1, ph.over + " px");
  ok("the ways in stack in one column", ph.cols === 1, ph.cols + " columns");
  ok("and every size in the band stays inside it", ph.stack);
  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
