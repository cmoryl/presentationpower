/* v208: one system in the Library's briefs — the pre-Spectrum designs are out.
   - a brief never closes on a saturated bar (the gradient and cobalt closes): every close is a light one;
   - no figure card on a Spectrum page carries the old heavy rule across its top (the rule marked a card in the
     print system; beside a template, where every card is a frosted card on a hairline, it read as another system);
   - a section rule (the head of a text block, a ledger's first row) is a different thing and is still drawn;
   - a figure drawn as a ring takes its own position colour, on screen and on the page, instead of one flat blue;
   - the numbers grid that drew its figures over its own bars is out of the Library's choices. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });

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

  /* ---------- what the Library's briefs are made of ---------- */
  const use = {};
  const who = {};
  for (let i = 0; i < ids.length; i += 20) {
    const r = await p.evaluate((chunk) => {
      return chunk.map((id) => {
        const pc = __T.pieceById(id);
        try {
          return {
            id,
            ks: __T.pieceLayout(pc).modules.filter((m) => m.type !== "pagebreak").map((m) => {
              const d = m.data || {};
              return m.type + ":" + [d.layout, d.variant, d.cols, d.kind, d.style, d.side, d.tone, d.fill].filter((x) => x != null).join("/");
            }),
          };
        } catch (e) { return { id, ks: [] }; }
      });
    }, ids.slice(i, i + 20));
    r.forEach((x) => x.ks.forEach((k) => { use[k] = (use[k] || 0) + 1; if (!who[k]) who[k] = x.id; }));
  }
  const closes = Object.keys(use).filter((k) => k.indexOf("cta:") === 0);
  const loud = closes.filter((k) => /gradient|cobalt/.test(k));
  ok("every brief has a close", closes.length > 0, closes.map((k) => k + " ×" + use[k]).join(", "));
  ok("no brief closes on a saturated bar", loud.length === 0, loud.map((k) => k + " e.g. " + who[k]).join("; "));
  ok("the numbers grid that drew over its own bars is out", !use["numbersGrid:stair"], (use["numbersGrid:stair"] || 0) + " uses of the rising-steps grid");

  /* ---------- no card on a Spectrum page carries the old top rule ---------- */
  const ruled = [];
  for (let i = 0; i < ids.length; i += 8) {
    const r = await p.evaluate((chunk) => {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
      document.body.appendChild(host);
      const bad = [];
      chunk.forEach((id) => {
        const pc = __T.pieceById(id);
        try {
          const l = __T.pieceLayout(pc);
          __T.withBrand(__T.brandById(pc.brand), () => {
            host.innerHTML = __T.withStyle({ look: "spectrum", tight: l.tight || 0 }, () =>
              __T.pageHTML(JSON.parse(JSON.stringify(l.modules)), { w: 816, h: 1056, print: true }, false, null)
            );
          });
          /* a card: something drawn as a box (its own background or border round it). A rule across the top of one
             is the pre-Spectrum device; a rule on a row or a section head is not. */
          [].slice.call(host.querySelectorAll(".card,.kt,.cn,.tier,.scol,.ex-s,.xstat")).forEach((e) => {
            const cs = getComputedStyle(e);
            if (parseFloat(cs.borderTopWidth) >= 1.6 && parseFloat(cs.borderLeftWidth) < 1.6) bad.push(id + " " + (e.className || "").slice(0, 28) + " " + cs.borderTopWidth);
          });
        } catch (e) {}
      });
      host.remove();
      return bad;
    }, ids.slice(i, i + 8));
    ruled.push(...r);
  }
  ok("no figure card is marked with a rule across its top", ruled.length === 0, ruled.slice(0, 3).join("; ") || ids.length + " pieces");

  /* ---------- a section rule is still drawn ---------- */
  const sec = await p.evaluate(() => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
    document.body.appendChild(host);
    host.innerHTML = __T.withBrand(__T.brandById("globallink"), () =>
      __T.withStyle({ look: "spectrum", tight: 0 }, () =>
        __T.pageHTML([{ id: "m0", type: "storyColumns", data: Object.assign(__T.MODULES.storyColumns.def(), { layout: "flow" }) }], { w: 816, h: 1056, print: true }, false, null)
      )
    );
    const e = host.querySelector(".ly-scflow");
    const cs = e ? getComputedStyle(e) : null;
    const out = cs ? { w: cs.borderTopWidth, c: cs.borderTopColor } : null;
    host.remove();
    return out;
  });
  ok("a block of text still opens on its rule", sec && parseFloat(sec.w) >= 1.5, sec ? sec.w + " " + sec.c : "no block");

  /* ---------- rings take their position colour, not one flat blue ---------- */
  const rings = await p.evaluate(() => {
    const out = {};
    [["screen", false], ["print", true]].forEach((pr) => {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
      document.body.appendChild(host);
      host.innerHTML = __T.withBrand(__T.brandById("globallink"), () =>
        __T.withStyle({ look: "spectrum", tight: 0 }, () =>
          __T.pageHTML(
            [
              { id: "m0", type: "stats", data: Object.assign(__T.MODULES.stats.def(), { variant: "rings" }) },
              { id: "m1", type: "bigMetric", data: Object.assign(__T.MODULES.bigMetric.def(), { layout: "ring" }) },
            ],
            { w: 816, h: 1056, print: pr[1] },
            false,
            null
          )
        )
      );
      const stops = [].slice.call(host.querySelectorAll(".ringstat")).slice(0, 3).map((e) => {
        const g = e.querySelector("stop.rg-a");
        return g ? getComputedStyle(g).stopColor : "";
      });
      const bm = host.querySelector(".bm-arc");
      out[pr[0]] = { stops, bm: bm ? getComputedStyle(bm).stroke : "" };
      host.remove();
    });
    return out;
  });
  ["screen", "print"].forEach((k) => {
    const s = rings[k].stops.filter(Boolean);
    ok("each ring takes its own colour (" + k + ")", s.length >= 3 && new Set(s).size >= 3, JSON.stringify(rings[k].stops));
    ok("the big figure's ring is not one flat blue (" + k + ")", /url\(/.test(rings[k].bm), rings[k].bm);
  });

  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
