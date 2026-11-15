/* v205: the Library set the way the Spectrum templates are set.
   - a column of text never breaks inside a sentence: a full stop in "e.g.", "U.S." or an initial does not end one,
     so a column no longer carries on with "g., irrelevant domains…";
   - a headed story is set as the templates set one (numbered rows, or columns under coloured headers) wherever the
     page has the room; the two text columns are what is left when it has not;
   - one palette: on a Spectrum page the headings and rules of the body take the Spectrum blue and hairline, on
     screen and on a printed page, instead of each division's own colour (teal, green, magenta);
   - a material signed before the Spectrum look still prints in its division's colours. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });

/* the Spectrum palette: ink, the eyebrow blue, the three position colours and their deep steps, white */
const SPX_OK = ["rgb(3, 0, 44)", "rgb(0, 63, 199)", "rgb(61, 59, 92)", "rgb(94, 107, 153)", "rgb(255, 255, 255)",
  "rgb(15, 181, 178)", "rgb(10, 142, 153)", "rgb(10, 63, 73)", "rgb(59, 123, 240)", "rgb(26, 63, 194)", "rgb(143, 107, 240)", "rgb(61, 31, 166)",
  "rgb(214, 220, 240)", "rgba(0, 0, 0, 0)"];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.route(/cdn\.jsdelivr\.net/, (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  await p.goto("file://" + __dirname + "/test.html");
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1400);
  await p.evaluate(() => document.fonts.ready);
  const ids = await p.evaluate(() => __T.ELIB.map((x) => x.id));

  /* ---------- 1. no column breaks inside a sentence ---------- */
  const breaks = { n: 0, cols: 0, bad: [] };
  for (let i = 0; i < ids.length; i += 10) {
    const r = await p.evaluate((chunk) => {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
      document.body.appendChild(host);
      const out = chunk.map((id) => {
        const pc = __T.pieceById(id);
        const lay = __T.pieceLayout(pc);
        const bad = [];
        let cols = 0;
        try {
          host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum", tight: lay.tight || 0 }, () => __T.pageHTML(JSON.parse(JSON.stringify(lay.modules)), { w: 816, h: 1056, print: true }, false, null)));
        } catch (e) {
          return { id: id, err: String(e).slice(0, 80) };
        }
        [].forEach.call(host.querySelectorAll(".ly-scflow"), function (sec) {
          cols++;
          const colA = sec.children[0], colB = sec.children[1];
          if (!colB || !colB.querySelector(".scf.cont")) return; // a clean break between sections
          const txt = (e) => (e.textContent || "").replace(/\s+/g, " ").trim();
          const lastA = [].filter.call(colA.querySelectorAll("p,li"), txt).pop();
          const firstB = [].filter.call(colB.querySelectorAll("p,li"), txt)[0];
          if (!lastA || !firstB || lastA.tagName === "LI" || firstB.tagName === "LI") return;
          const a = txt(lastA), bb = txt(firstB);
          const ends = /[.!?][")'”’\]]*$/.test(a) || a.length < 60; // a heading-like line has no full stop
          const starts = /^[A-Z0-9"'“‘(\[]/.test(bb);
          if (!ends || !starts) bad.push(id + ": …" + a.slice(-50) + " // " + bb.slice(0, 50));
        });
        return { id: id, cols: cols, bad: bad };
      });
      host.remove();
      return out;
    }, ids.slice(i, i + 10));
    r.forEach((x) => { breaks.n++; breaks.cols += x.cols || 0; (x.bad || []).forEach((y) => breaks.bad.push(y)); });
  }
  ok("every piece draws, and the Library still uses two text columns where it needs them", breaks.n === ids.length && breaks.cols >= 60, breaks.n + " pieces, " + breaks.cols + " two-column blocks");
  ok("a column never carries on inside a sentence", breaks.bad.length === 0, breaks.bad.slice(0, 3).join(" | "));

  /* the abbreviation that used to break: "…content (e.g., irrelevant domains…" stays whole */
  const doj = await p.evaluate(() => {
    const pc = __T.pieceById("legal-accelerated-doj-second-request");
    if (!pc) return null;
    const lay = __T.pieceLayout(pc);
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
    document.body.appendChild(host);
    host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum", tight: lay.tight || 0 }, () => __T.pageHTML(JSON.parse(JSON.stringify(lay.modules)), { w: 816, h: 1056, print: true }, false, null)));
    const paras = [].map.call(host.querySelectorAll(".ly-scflow p"), (x) => (x.textContent || "").replace(/\s+/g, " "));
    host.remove();
    return { whole: paras.some((t) => /\(e\.g\., irrelevant domains/.test(t)), split: paras.some((t) => /\(e\.$/.test(t.trim())) };
  });
  ok("the abbreviation that used to be cut in two is whole", !!doj && doj.whole && !doj.split, JSON.stringify(doj));

  /* ---------- 2. one palette ---------- */
  const pal = { n: 0, off: [] };
  for (let i = 0; i < ids.length; i += 10) {
    const r = await p.evaluate(([chunk, OK]) => {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
      document.body.appendChild(host);
      const out = chunk.map((id) => {
        const pc = __T.pieceById(id);
        const lay = __T.pieceLayout(pc);
        const off = [];
        [[true, "a printed page"], [false, "the screen"]].forEach(([pr, tag]) => {
          try {
            host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum", tight: lay.tight || 0 }, () => __T.pageHTML(JSON.parse(JSON.stringify(lay.modules)), { w: 816, h: pr ? 1056 : 0, print: pr }, false, null)));
          } catch (e) {
            return;
          }
          [].forEach.call(host.querySelectorAll(".sec h2,.sec h3,.sec h4,.scf h3"), (e) => {
            if (e.closest(".dk,.kdark,.ly-dark,.cta,.minicta,.pillar,.dk-pcard")) return; // words on a deep panel
            const c = getComputedStyle(e).color;
            if (OK.indexOf(c) < 0) off.push(id + " " + tag + " " + (e.textContent || "").trim().slice(0, 18) + " " + c);
          });
          [].forEach.call(host.querySelectorAll(".ly-scflow"), (e) => {
            const c = getComputedStyle(e).borderTopColor;
            if (OK.indexOf(c) < 0) off.push(id + " " + tag + " a text-column rule " + c);
          });
        });
        return { id: id, off: off };
      });
      host.remove();
      return out;
    }, [ids.slice(i, i + 10), SPX_OK]);
    r.forEach((x) => { pal.n++; (x.off || []).forEach((y) => pal.off.push(y)); });
  }
  ok("every heading and rule in the Library body is in the Spectrum palette, on screen and on the page", pal.off.length === 0, pal.off.slice(0, 4).join(" | ") || pal.n + " pieces");

  /* a material signed before the Spectrum look keeps its division's print colours */
  const legacy = await p.evaluate(() => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
    document.body.appendChild(host);
    const mods = [{ id: "a1aaaaaaaaaa", type: "storyColumns", data: Object.assign(__T.MODULES.storyColumns.def(), { layout: "flow" }) }];
    const out = {};
    [["spectrum", { look: "spectrum" }], ["signed", { look: "", status: "approved" }]].forEach(([tag, st]) => {
      host.innerHTML = __T.withBrand(__T.brandById("bm-tp-legal"), () => __T.withStyle(st, () => __T.pageHTML(JSON.parse(JSON.stringify(mods)), { w: 816, h: 1056, print: true }, false, null)));
      const h3 = host.querySelector(".ly-scflow h3");
      out[tag] = h3 ? getComputedStyle(h3).color : "-";
    });
    host.remove();
    return out;
  });
  ok("a Spectrum page prints in the Spectrum blue", legacy.spectrum === "rgb(0, 63, 199)", JSON.stringify(legacy));
  ok("a material signed before the Spectrum look still prints in its division's colour", legacy.signed !== "rgb(0, 63, 199)" && /^rgb/.test(legacy.signed), JSON.stringify(legacy));

  /* ---------- 3. headed stories are set the way the templates set them ---------- */
  const mix = { flow: 0, numbered: 0, banded: 0, pieces: 0, over: 0, bad: 0 };
  for (let i = 0; i < ids.length; i += 20) {
    const r = await p.evaluate((chunk) => chunk.map((id) => {
      const pc = __T.pieceById(id);
      const lay = __T.pieceLayout(pc);
      const f = __T.fmtById("letter");
      const hs = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum" }, () => __T.pageParts(JSON.parse(JSON.stringify(lay.modules))).filter((x) => x.length).map((pt) => __T.measureAt(pt, f, lay.tight || 0))));
      const pf = __T.withBrand(__T.brandById(pc.brand), () => __T.preflight({ id: "x", name: pc.title || id, modules: lay.modules, formats: ["letter"], look: "spectrum", tight: lay.tight || 0, lang: "en", rebuiltFrom: { id: id } }, true));
      return {
        id: id,
        over: Math.max.apply(null, hs) > f.h + 1 ? 1 : 0,
        bad: pf.bad || 0,
        d: lay.modules.map((m) => m.type + ":" + (m.data.layout || m.data.variant || "")),
      };
    }), ids.slice(i, i + 20));
    r.forEach((x) => {
      mix.pieces++;
      mix.over += x.over;
      mix.bad += x.bad;
      x.d.forEach((d) => {
        if (d === "storyColumns:flow") mix.flow++;
        if (d === "storyRows:numbered") mix.numbered++;
        if (d === "storyColumns:banded") mix.banded++;
      });
    });
  }
  ok("a headed story is set as the templates set one wherever there is room", mix.numbered >= 15 && mix.banded >= 15, "numbered rows " + mix.numbered + ", coloured headers " + mix.banded);
  ok("the text columns are the fallback, not the habit", mix.flow <= 165, "two text columns " + mix.flow + " of " + mix.pieces + " pieces");
  ok("every piece still fits its sheet, with nothing for preflight to report", mix.pieces === ids.length && mix.over === 0 && mix.bad === 0, JSON.stringify(mix));

  /* ---------- 4. a page is set on two only when two pages are full of it ---------- */
  const two = await p.evaluate(() => {
    const f = __T.fmtById("letter");
    const out = { moved: 0, thin: [], dense: 0 };
    __T.ELIB.forEach((x) => {
      const pc = __T.pieceById(x.id);
      const lay = __T.pieceLayout(pc);
      const parts = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum" }, () => __T.pageParts(JSON.parse(JSON.stringify(lay.modules))).filter((q) => q.length)));
      if (parts.length < 2) {
        if ((lay.tight || 0) >= 10) out.dense++;
        return;
      }
      out.moved++;
      const fill = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum" }, () => parts.map((pt) => __T.measureAt(pt, f, lay.tight || 0) / f.h)));
      if (Math.min.apply(null, fill) < 0.5) out.thin.push(x.id + " " + fill.map((q) => Math.round(q * 100)).join("/"));
    });
    return out;
  });
  ok("a piece on several pages fills them", two.moved >= 40 && two.thin.length <= 2, two.moved + " on more than one page, thin: " + (two.thin.join(" | ") || "none"));
  ok("a piece that would not fill two pages keeps its one", two.dense >= 40, two.dense + " one-page pieces with their type set 10% or more smaller");

  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
  R.forEach((x) => console.log(x));
  console.log(R.filter((x) => x.startsWith("FAIL")).length ? "SOME FAILED" : "ALL PASS " + R.length);
  await b.close();
})();
