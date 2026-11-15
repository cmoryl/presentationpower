/* v209: the build's speed, and the hero that replaced the white card.
   - the baked layouts are trusted after one measurement of how this browser sets type, instead of every piece
     being measured again; a browser that sets type differently still checks each piece, as before;
   - the editor's full check fits each size in its own slice and keeps the answer, so the panel never freezes
     behind it — and the count it ends on is the same one the old single pass gave;
   - the Library keeps the cards it has already built when a redraw changes nothing about them;
   - no piece puts its headline in a white card on the photo: the picture fades into the page and the words stand
     on the page in ink. */
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
  await p.goto("file://" + __dirname + "/test.html");
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(1600);
  await p.evaluate(() => document.fonts.ready);

  /* ---------- the bake is trusted on one measurement ---------- */
  const fp = await p.evaluate(() => ({ fp: __T.pxTextFp(), trusted: __T.pxBakeTrusted() }));
  ok("this browser's type is measured once", /\d+(\.\d+)?x\d/.test(fp.fp), fp.fp);
  ok("the baked layouts are trusted here", fp.trusted === true, String(fp.trusted));
  const speed = await p.evaluate(() => {
    const ids = __T.ELIB.map((x) => x.id).slice(0, 24);
    const t = performance.now();
    ids.forEach((id) => __T.pieceLayout(__T.pieceById(id)));
    return Math.round(performance.now() - t);
  });
  ok("two dozen pieces are laid out in well under a second", speed < 700, speed + " ms for 24 pieces");

  /* ---------- the editor's size check: one slice at a time, same answer ---------- */
  await p.click('.sp-hero button:has-text("Open the example project")');
  await p.waitForTimeout(1200);
  const card = await p.$(".el-card, .mat-card, .board .card, [data-mat]");
  if (card) await card.click();
  await p.waitForTimeout(3500);
  const pf = await p.evaluate(() => {
    const m = __T.mat();
    if (!m) return null;
    const PFS = __T.pfSizes();
    const kept = Object.keys(PFS || {}).length;
    const t1 = performance.now();
    const a = __T.preflight(m);
    const warm = Math.round(performance.now() - t1);
    // and again from nothing, the way the single pass used to do it
    const keys = Object.keys(PFS);
    const stash = {};
    keys.forEach((k) => { stash[k] = PFS[k]; delete PFS[k]; });
    const t2 = performance.now();
    const b2 = __T.preflight(m);
    const cold = Math.round(performance.now() - t2);
    keys.forEach((k) => (PFS[k] = stash[k]));
    return { kept, warm, cold, a: a.bad, b: b2.bad, la: a.list.length, lb: b2.list.length };
  });
  ok("the sizes the editor fitted are kept", pf && pf.kept >= 6, pf ? pf.kept + " sizes" : "no material");
  ok("the full check gives the same answer as before", pf && pf.a === pf.b && pf.la === pf.lb, pf ? pf.a + "/" + pf.b + " bad, " + pf.la + "/" + pf.lb + " lines" : "-");
  ok("and it no longer fits every size itself", pf && pf.warm * 3 < pf.cold + 30, pf ? pf.warm + " ms against " + pf.cold + " ms" : "-");

  /* ---------- the Library keeps its cards between draws ---------- */
  const grid = await p.evaluate(async () => {
    __T.go("library");
    await new Promise((r) => setTimeout(r, 2500));
    const g = document.querySelector(".el-groups");
    if (!g) return null;
    g.setAttribute("data-probe", "1");
    const n = document.querySelectorAll(".el-card").length;
    document.querySelectorAll(".el-card")[4].click();
    await new Promise((r) => setTimeout(r, 1200));
    const g2 = document.querySelector(".el-groups");
    return { same: !!(g2 && g2.getAttribute("data-probe") === "1"), cards: n, after: document.querySelectorAll(".el-card").length };
  });
  ok("opening a piece keeps the cards that are already drawn", grid && grid.same, grid ? grid.cards + " cards, " + grid.after + " after" : "no library");

  /* ---------- the hero ---------- */
  const ids = await p.evaluate(() => __T.ELIB.map((x) => x.id));
  const heroes = [];
  for (let i = 0; i < ids.length; i += 25) {
    const r = await p.evaluate((chunk) => {
      return chunk.map((id) => {
        const pc = __T.pieceById(id);
        try {
          const h = __T.pieceLayout(pc).modules.filter((m) => m.type === "hero")[0];
          return { id, panel: (h && h.data.panel) || "none", layout: h && h.data.layout, words: h && h.data.words, title: !!(h && String(h.data.title || "").trim()) };
        } catch (e) { return { id, panel: "err" }; }
      });
    }, ids.slice(i, i + 25));
    heroes.push(...r);
  }
  const carded = heroes.filter((x) => x.panel === "card");
  ok("no piece puts its headline in a card on the photo", carded.length === 0, carded.slice(0, 3).map((x) => x.id).join(", ") || heroes.length + " pieces");
  const fade = heroes.filter((x) => x.layout === "fade");
  ok("the fading hero is in use", fade.length >= 20, fade.length + " of " + heroes.length);
  ok("every hero still carries its headline", heroes.every((x) => x.title), heroes.filter((x) => !x.title).slice(0, 3).map((x) => x.id).join(", "));

  const ink = await p.evaluate((id) => {
    const pc = __T.pieceById(id);
    const l = __T.pieceLayout(pc);
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
    document.body.appendChild(host);
    host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () =>
      __T.withStyle({ look: "spectrum", tight: l.tight || 0 }, () => __T.pageHTML(JSON.parse(JSON.stringify(l.modules)), { w: 816, h: 1056, print: false }, false, null))
    );
    const h1 = host.querySelector(".m-hero h1");
    const cs = h1 ? getComputedStyle(h1) : null;
    const panel = host.querySelector(".m-hero .hcopy");
    const out = cs ? { color: cs.webkitTextFillColor && cs.webkitTextFillColor !== "rgba(0, 0, 0, 0)" ? cs.webkitTextFillColor : cs.color, bg: panel ? getComputedStyle(panel).backgroundColor : "", radius: panel ? getComputedStyle(panel).borderRadius : "" } : null;
    host.remove();
    return out;
  }, fade.length ? fade[0].id : ids[0]);
  const lum = (c) => {
    const m = String(c).match(/\d+(\.\d+)?/g) || [0, 0, 0];
    const v = m.slice(0, 3).map((x) => { x = +x / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  ok("its headline is set in ink, not in white", ink && lum(ink.color) < 0.2, ink ? ink.color : "-");
  ok("and stands on the page, not on a panel", ink && (ink.bg === "rgba(0, 0, 0, 0)" || ink.bg === "transparent"), ink ? ink.bg + " " + ink.radius : "-");

  /* ---------- what a screen reader is given ---------- */
  const sr = await p.evaluate(async () => {
    __T.go("library");
    await new Promise((r) => setTimeout(r, 2500));
    window.scrollTo(0, 1800);
    await new Promise((r) => setTimeout(r, 1500));
    const drawn = [].slice.call(document.querySelectorAll(".el-pic")).filter((e) => e.querySelector(".gl"));
    const hidden = drawn.filter((e) => e.getAttribute("aria-hidden") === "true" || e.closest('[aria-hidden="true"]'));
    const card = document.querySelector(".el-card");
    return { drawn: drawn.length, hidden: hidden.length, label: card ? card.getAttribute("aria-label") : null };
  });
  ok("a drawn card is a picture, not a page of text to read out", sr.drawn > 0 && sr.drawn === sr.hidden, sr.hidden + " of " + sr.drawn + " marked");
  ok("and the card itself says what it is", !!(sr.label && sr.label.length > 8), sr.label);

  /* a key event whose target is the document itself (assistive tech, a synthetic press) is not an error */
  const stray = await p.evaluate(() => {
    const before = window.__strayErr || 0;
    try {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      return "ok";
    } catch (e) {
      return String(e.message).slice(0, 60);
    }
  });
  ok("a stray key press is not an error", stray === "ok", stray);

  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
