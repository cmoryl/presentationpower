/* v214: one look is not the whole page.
   - on every Library page, of the modules that lead with icons at most one in three keeps them, never two in a
     row; a list carried over several modules counts as one;
   - a row of figures gives its marks up first, and its number is not squeezed into the column the mark left;
   - the starting layouts and the Spectrum templates are rationed the same way, so new briefs begin mixed;
   - "No icons" really shows none on a Spectrum page, which the page-wide icon frame used to overrule;
   - nothing got taller: every piece still holds its pages. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 1200 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  await p.goto("file://" + __dirname + "/test.html");
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1800);
  await p.evaluate(() => document.fonts.ready);
  const ids = await p.evaluate(() => __T.ELIB.map((x) => x.id));
  const bad = { adjacent: [], many: [], figures: [], over: [] };
  let pages = 0, typed = 0, led = 0;
  for (let i = 0; i < ids.length; i += 12) {
    const r = await p.evaluate((chunk) => chunk.map((id) => {
      const pc = __T.pieceById(id); let lay;
      try { lay = __T.pieceLayout(pc); } catch (e) { return { id, err: 1 }; }
      const host = document.createElement("div"); host.style.cssText = "position:absolute;left:-9999px;top:0;width:816px"; document.body.appendChild(host);
      host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum", tight: lay.tight || 0 }, () => __T.pageHTML(JSON.parse(JSON.stringify(lay.modules)), { w: 816, h: 1056, print: true }, false, null)));
      const els = {}; [].forEach.call(host.querySelectorAll(".mod"), (el) => (els[el.dataset.id] = el));
      const shown = (m) => { const el = els[m.id]; return el ? [].filter.call(el.querySelectorAll(".disc, .tile"), (e) => getComputedStyle(e).display !== "none").length : 0; };
      const out = { id, pages: [], figures: [], typed: 0 };
      let pg = [];
      const flush = () => { if (pg.length) out.pages.push(pg); pg = []; };
      lay.modules.forEach((m, k) => {
        if (m.type === "pagebreak") return flush();
        if (/^(hero|cta|footer|cover|divider)$/.test(m.type)) { pg.push(null); return; }
        if (m.data.iconStyle === "none") { out.typed++; if (/^(stats|kpis|numbersGrid|quoteStats|bigMetric)$/.test(m.type)) out.figures.push(m.type); }
        const key = m.type + "|" + (m.data.layout || "") + "|" + (m.data.variant || "");
        const prev = pg[pg.length - 1];
        if (prev && prev.key === key && lay.modules[k - 1] === prev.last) { prev.icons = Math.max(prev.icons, shown(m)); prev.last = m; }
        else pg.push({ key, type: m.type, icons: shown(m), last: m });
      });
      flush();
      out.pages = out.pages.map((x) => x.filter(Boolean).map((u) => ({ type: u.type, led: u.icons >= 2 })));
      const f = __T.fmtById("letter");
      const parts = __T.pageParts(JSON.parse(JSON.stringify(lay.modules))).filter((x) => x.length);
      out.over = parts.some((pt) => __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum" }, () => __T.measureAt(pt, f, lay.tight || 0))) > f.h + 1);
      host.remove();
      return out;
    }), ids.slice(i, i + 12));
    r.forEach((x) => {
      if (x.err) return;
      typed += x.typed;
      if (x.figures.length) bad.figures.push(x.id);
      if (x.over) bad.over.push(x.id);
      x.pages.forEach((pg, pi) => {
        pages++;
        const fixed = () => false;
        const n = pg.filter((u) => u.led).length;
        led += n;
        for (let k = 1; k < pg.length; k++) if (pg[k].led && pg[k - 1].led && !(fixed(pg[k]) && fixed(pg[k - 1]))) bad.adjacent.push(x.id + " p" + (pi + 1));
        const free = pg.filter((u) => u.led && !fixed(u)).length, fx = pg.filter((u) => u.led && fixed(u)).length;
        if (free && free + fx > Math.max(1, Math.ceil(pg.length / 3))) bad.many.push(x.id + " p" + (pi + 1) + " " + (free + fx) + "/" + pg.length);
      });
    });
  }
  ok("on no page do two icon-led modules sit one under the other", bad.adjacent.length === 0, bad.adjacent.slice(0, 4).join(", ") || pages + " pages");
  ok("and at most one module in three leads with icons", bad.many.length === 0, bad.many.slice(0, 4).join(", ") || led + " icon-led modules on " + pages + " pages");
  ok("the modules that gave theirs up are set in type", typed >= 15, typed + " modules");
  ok("rows of figures are among the modules set in type", bad.figures.length >= 5, bad.figures.length + " pieces");
  const ledger = await p.evaluate(() => {
    const pc = __T.pieceById("lifesci-top10-pharma-careers-site-15-languages"); const lay = __T.pieceLayout(pc);
    const host = document.createElement("div"); host.style.cssText = "position:absolute;left:-9999px;top:0;width:816px"; document.body.appendChild(host);
    host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum", tight: lay.tight || 0 }, () => __T.pageHTML(JSON.parse(JSON.stringify(lay.modules)), { w: 816, h: 1056, print: true }, false, null)));
    const rows = [].slice.call(host.querySelectorAll(".mod.ic-none .lg-row"));
    const cut = rows.filter((r) => { const st = r.querySelector(".t-stat"); return st && st.scrollWidth > st.clientWidth + 1; }).length;
    const out = { rows: rows.length, cut, cols: rows[0] ? getComputedStyle(rows[0]).gridTemplateColumns.split(" ").length : 0 };
    host.remove();
    return out;
  });
  ok("and no number is squeezed into the column its mark left", ledger.rows > 0 && ledger.cut === 0 && ledger.cols === 2, JSON.stringify(ledger));
  const fresh = await p.evaluate(() => {
    const ratio = (mods) => {
      const pages = [[]]; mods.forEach((m) => { if (m.type === "pagebreak") pages.push([]); else if (!/^(hero|cta|footer|cover|divider)$/.test(m.type)) pages[pages.length - 1].push(m); });
      return pages.every((pg) => {
        const led = pg.map((m) => m.data.iconStyle !== "none" && m.type !== "storyRows" && (__T.pageHTML([JSON.parse(JSON.stringify(m))], { w: 816, h: 0, print: true }, false, null).match(/class="(?:disc|tile)[" ]/g) || []).length >= 2);
        const n = led.filter(Boolean).length;
        return n <= Math.max(1, Math.ceil(pg.length / 3)) && !led.some((x, i) => x && led[i - 1] && pg[i].type + (pg[i].data.layout || "") !== pg[i - 1].type + (pg[i - 1].data.layout || ""));
      });
    };
    return __T.withStyle({ look: "spectrum" }, () => ({
      presets: Object.keys(__T.PRESETS).filter((k) => { try { return !ratio(__T.PRESETS[k]()); } catch (e) { return false; } }),
      templates: __T.spxlAll().filter((t) => !ratio(__T.tplmods(t))).map((t) => t.key),
      n: Object.keys(__T.PRESETS).length + __T.spxlAll().length,
    }));
  });
  ok("every starting layout and Spectrum template begins within the same ration", fresh.presets.length === 0 && fresh.templates.length === 0, fresh.presets.concat(fresh.templates).slice(0, 5).join(", ") || fresh.n + " checked");
  ok("every piece still holds its pages", bad.over.length === 0, bad.over.slice(0, 4).join(", "));

  /* "No icons" on a Spectrum page */
  const none = await p.evaluate(() => {
    const pc = __T.ELIB.map((x) => x).find((x) => { try { return __T.pieceLayout(x).modules.some((m) => m.type === "capabilities"); } catch (e) { return false; } });
    const lay = __T.pieceLayout(pc);
    const m = JSON.parse(JSON.stringify(lay.modules.find((x) => x.type === "capabilities")));
    const count = (style) => {
      m.data.iconStyle = style;
      const host = document.createElement("div"); host.style.cssText = "position:absolute;left:-9999px;top:0;width:816px"; document.body.appendChild(host);
      host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum" }, () => __T.pageHTML([JSON.parse(JSON.stringify(m))], { w: 816, h: 0, print: true }, false, null)));
      const n = [].filter.call(host.querySelectorAll(".disc, .tile"), (e) => getComputedStyle(e).display !== "none").length;
      host.remove();
      return n;
    };
    return { on: count(""), off: count("none") };
  });
  ok("“No icons” shows none on a Spectrum page", none.on >= 2 && none.off === 0, none.on + " with, " + none.off + " without");
  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
