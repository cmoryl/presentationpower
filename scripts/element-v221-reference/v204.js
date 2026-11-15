/* v204: what ELEMENT does while it loads.
   - the layouts of the Library's 299 pieces and the fit of every Spectrum template are worked out when ELEMENT is
     built and shipped with it; a bake made from another build is never shipped, and a baked layout is used only
     where it still fits this browser's sheet;
   - a Library card and a Spectrum card keep the room their picture needs and are drawn as they come near the
     window, a few at a time, instead of all at once with the original's photo standing in;
   - no screen answers a question it cannot answer yet: the first-run introduction waits until the projects are
     known, and a board waits for its materials;
   - the editor opens on the page: the full size check runs right after it is drawn, and the Review tab and every
     gate still run it in full. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });

(async () => {
  const b = await chromium.launch();
  const open = async (vp, hash) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1400, height: 950 } });
    await ctx.route(/cdn\.jsdelivr\.net/, (r) => r.abort());
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    await p.goto("file://" + __dirname + "/test.html" + (hash || ""));
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForTimeout(1200);
    return { ctx, p, errs };
  };

  /* ================= 1. the bake: present, current, and true to this browser ================= */
  {
    const { ctx, p, errs } = await open();
    await p.evaluate(() => document.fonts.ready);
    const bake = await p.evaluate(() => {
      const B = __T.pxBake();
      return B ? { pieces: Object.keys(B.pieces || {}).length, templates: Object.keys(B.templates || {}).length, sig: __T.pxSig() } : null;
    });
    ok("the build ships the layouts worked out ahead of time, and they were made from this same build", !!bake && bake.pieces >= 290 && bake.templates >= 25, bake ? JSON.stringify(bake) : "no bake in this build");

    const cmp = await p.evaluate(() => {
      const ids = __T.ELIB.filter((x, i) => i % 12 === 0).map((x) => x.id);
      const out = { n: 0, same: 0, diff: [] };
      const shape = (lay) => JSON.stringify({ t: (lay.modules || []).map((m) => m.type), tight: lay.tight || 0 });
      ids.forEach((id) => {
        const pc = __T.pieceById(id);
        const baked = __T.pxBakedPiece(pc);
        if (!baked) return;
        __T.pxBakeOff(true);
        let live;
        try { live = __T.pieceLayout(pc); } finally { __T.pxBakeOff(false); }
        out.n++;
        if (shape(baked) === shape(live)) out.same++;
        else out.diff.push(id);
      });
      return out;
    });
    ok("a baked layout is the layout this browser would have worked out for itself", cmp.n >= 20 && cmp.diff.length === 0, cmp.same + "/" + cmp.n + (cmp.diff.length ? " differ: " + cmp.diff.slice(0, 3).join(", ") : ""));

    const fits = await p.evaluate(() => {
      const ids = __T.ELIB.filter((x, i) => i % 7 === 0).map((x) => x.id);
      let n = 0, over = 0;
      const f = __T.fmtById("letter");
      ids.forEach((id) => {
        const pc = __T.pieceById(id);
        const lay = __T.pieceLayout(pc);
        const hs = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum" }, () => __T.pageParts(JSON.parse(JSON.stringify(lay.modules))).filter((x) => x.length).map((pt) => __T.measureAt(pt, f, lay.tight || 0))));
        n++;
        if (Math.max.apply(null, hs) > f.h + 2) over++;
      });
      return { n: n, over: over };
    });
    ok("every piece looked at fits its sheet, baked layout and all", fits.n >= 40 && fits.over === 0, JSON.stringify(fits));
    ok("no page errors (the bake)", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ================= 2. the Library: room kept, pictures drawn as they come into view ================= */
  {
    const { ctx, p, errs } = await open();
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => __T.go("library"));
    await p.waitForSelector(".el-card", { timeout: 20000 });
    const early = await p.evaluate(() => {
      const cards = [].slice.call(document.querySelectorAll(".el-card"));
      const pics = cards.map((c) => c.querySelector(".el-pic")).filter(Boolean);
      const photo = pics.filter((e) => /url\(/.test(getComputedStyle(e).backgroundImage)).length;
      return { cards: cards.length, pics: pics.length, photo: photo, drawn: pics.filter((e) => e.querySelector(".lp-thumb")).length, room: pics.filter((e) => e.getBoundingClientRect().height > 40).length };
    });
    ok("a Library card never stands the original's photo in while it waits", early.photo === 0, early.photo + " of " + early.pics);
    ok("every Library card keeps the room its picture needs", early.pics >= 20 && early.room === early.pics, early.room + "/" + early.pics);
    await p.waitForTimeout(2500);
    const after = await p.evaluate(() => {
      const vis = [].slice.call(document.querySelectorAll(".el-card")).filter((c) => { const r = c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
      const far = [].slice.call(document.querySelectorAll(".el-card")).filter((c) => c.getBoundingClientRect().top > innerHeight + 2500);
      return { vis: vis.length, visDrawn: vis.filter((c) => c.querySelector(".lp-thumb")).length, far: far.length, farDrawn: far.filter((c) => c.querySelector(".lp-thumb")).length };
    });
    ok("the cards on the screen are drawn", after.vis >= 3 && after.visDrawn === after.vis, after.visDrawn + "/" + after.vis);
    ok("the cards far down the page wait their turn", after.far === 0 || after.farDrawn < after.far, after.farDrawn + "/" + after.far);
    await p.evaluate(() => window.scrollBy(0, 1600));
    await p.waitForTimeout(2000);
    const scrolled = await p.evaluate(() => {
      const vis = [].slice.call(document.querySelectorAll(".el-card")).filter((c) => { const r = c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
      return { vis: vis.length, drawn: vis.filter((c) => c.querySelector(".lp-thumb")).length };
    });
    ok("scrolling down draws the cards that come into view", scrolled.vis >= 3 && scrolled.drawn === scrolled.vis, scrolled.drawn + "/" + scrolled.vis);
    ok("no page errors (the Library)", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ================= 3. the Spectrum page ================= */
  {
    const { ctx, p, errs } = await open();
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => __T.go("spectrum"));
    await p.waitForSelector(".spxl-card", { timeout: 20000 });
    const early = await p.evaluate(() => {
      const th = [].slice.call(document.querySelectorAll(".spxl-card .spxl-thumb"));
      return { n: th.length, room: th.filter((e) => e.getBoundingClientRect().height > 80).length, waiting: th.filter((e) => e.classList.contains("wait")).length };
    });
    ok("every Spectrum card keeps the room its picture needs before it is drawn", early.n >= 20 && early.room === early.n, early.room + "/" + early.n);
    await p.waitForTimeout(3000);
    const after = await p.evaluate(() => {
      const th = [].slice.call(document.querySelectorAll(".spxl-card .spxl-thumb"));
      const vis = th.filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; });
      const far = th.filter((e) => e.getBoundingClientRect().top > innerHeight + 2000);
      return { vis: vis.length, drawn: vis.filter((e) => e.querySelector(".lp-scale")).length, far: far.length, farDrawn: far.filter((e) => e.querySelector(".lp-scale")).length };
    });
    ok("the Spectrum cards on the screen are drawn", after.vis >= 2 && after.drawn === after.vis, after.drawn + "/" + after.vis);
    ok("the ones further down wait until they are near", after.far === 0 || after.farDrawn < after.far, after.farDrawn + "/" + after.far);
    ok("no page errors (the Spectrum page)", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ================= 4. nothing is said before it is known ================= */
  {
    const ctx = await b.newContext({ viewport: { width: 1300, height: 900 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    await p.goto("file://" + __dirname + "/test.html#lag=2500", { waitUntil: "commit" });
    await p.waitForTimeout(500);
    const waiting = await p.evaluate(() => ({
      wait: !!document.querySelector(".ld-wait"),
      landing: !!document.querySelector(".lp"),
      projectsTitle: !!([].slice.call(document.querySelectorAll("#view h1")).some((x) => /Projects/.test(x.textContent || ""))),
      logo: (document.getElementById("logoImg") || {}).getAttribute ? !!document.getElementById("logoImg").getAttribute("src") : false,
      text: (document.getElementById("view").textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
    }));
    ok("while it waits, the page shows the shape of what is coming and the logo is already there", waiting.wait && waiting.logo, JSON.stringify(waiting));
    ok("it does not open the first-run introduction before the projects are known", !waiting.landing, waiting.text);
    ok("and it does not call the screen Projects before it knows that is where this person lands", !waiting.projectsTitle, waiting.text);
    await p.waitForTimeout(4000);
    const done = await p.evaluate(() => ({ wait: !!document.querySelector(".ld-wait"), landing: !!document.querySelector(".lp"), start: !!document.querySelector("section.start, .lp") }));
    ok("once they are known the right screen is drawn", !done.wait && done.start, JSON.stringify(done));
    ok("no page errors (a slow connection)", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  /* ================= 5. the editor opens on the page, and still checks every size ================= */
  {
    const { ctx, p, errs } = await open();
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => { const x = [].slice.call(document.querySelectorAll("button")).filter((q) => /Open the example project/.test(q.textContent))[0]; x.click(); });
    await p.waitForSelector(".mcard", { timeout: 20000 });
    await p.waitForTimeout(800);
    await p.evaluate(() => { const c = [].slice.call(document.querySelectorAll(".mcard")).filter((x) => /case study/i.test(x.textContent))[0]; c.click(); });
    await p.waitForSelector("#rpane", { timeout: 20000 });
    await p.waitForTimeout(2500);
    const tab = await p.evaluate(() => {
      const t = document.getElementById("rtab-review");
      const full = __T.preflight(__T.S().mat);
      return { label: (t && t.textContent) || "", bad: full.bad, pfBad: __T.S().mat.pfBad };
    });
    const count = /\((\d+)\)/.exec(tab.label);
    ok("the Review tab shows the full count once the page is drawn", (tab.bad === 0 && !count) || (count && +count[1] === tab.bad), JSON.stringify(tab));
    ok("the material's saved count is the full one", tab.pfBad === tab.bad, tab.pfBad + " vs " + tab.bad);
    const rev = await p.evaluate(async () => {
      document.getElementById("rtab-review").click();
      await new Promise((r) => setTimeout(r, 1200));
      const txt = (document.getElementById("rpane").textContent || "").replace(/\s+/g, " ");
      const full = __T.preflight(__T.S().mat);
      return { says: /Fits US Letter|Fits Letter|past the/.test(txt), chars: txt.length, bad: full.bad, sizes: full.list.filter((x) => /Letter|A4|×/.test(x[1])).length };
    });
    ok("the Review tab itself runs the check in full: the page sizes are in it", rev.sizes >= 1 && rev.says, JSON.stringify(rev));
    ok("no page errors (the editor)", errs.length === 0, errs.slice(0, 2).join(" | "));
    await ctx.close();
  }

  R.forEach((x) => console.log(x));
  console.log(R.filter((x) => x.startsWith("FAIL")).length ? "SOME FAILED" : "ALL PASS " + R.length);
  await b.close();
})();
