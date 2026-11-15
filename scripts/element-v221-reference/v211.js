/* v211: the download, the reader, the interruption, and the three cards that did not line up.
   - the reversed client logos ride in the page as drawings rather than base64, and the ones that exist only as
     pictures are encoded no heavier than they need to be: about a megabyte off the download, with every one of
     the 317 still drawing;
   - "Saving" and "Saved" are said as well as shown, the toolbar and the workspace have names, and the export
     menu is announced;
   - work typed a moment before a tab dies comes back: the draft is compared on everything the material holds,
     not only on its modules;
   - three cards side by side keep their rows: a card with no opening line no longer drops its list into the
     row where the opening lines go. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  await p.waitForTimeout(1800);
  await p.evaluate(() => document.fonts.ready);

  /* ---------- the reversed logos ---------- */
  const lw = await p.evaluate(() => {
    const L = __T.LOGO_WHITE || {};
    const keys = Object.keys(L);
    const drawings = keys.filter((k) => typeof L[k] === "string" && L[k].charAt(0) === "<");
    const pictures = keys.filter((k) => typeof L[k] === "string" && /^data:/.test(L[k]));
    const b64svg = keys.filter((k) => /^data:image\/svg\+xml;base64/.test(String(L[k])));
    return { n: keys.length, drawings: drawings.length, pictures: pictures.length, b64svg: b64svg.length, bytes: JSON.stringify(L).length };
  });
  ok("the reversed logos are all accounted for", lw.n >= 300 && lw.drawings + lw.pictures === lw.n, lw.n + ": " + lw.drawings + " drawings, " + lw.pictures + " pictures");
  ok("not one of them rides as base64 markup", lw.b64svg === 0, lw.b64svg + " still base64");
  ok("and together they are under two and a half megabytes", lw.bytes < 2500000, Math.round(lw.bytes / 1024) + " KB");
  const srcs = await p.evaluate(() => {
    const L = __T.LOGO_WHITE || {};
    const keys = Object.keys(L);
    const out = { bad: [], sample: null };
    keys.forEach((k) => {
      const s = __T.whiteLogo(k);
      if (!s || !/^data:image\/(svg\+xml|png|jpeg|webp)[;,]/.test(s)) out.bad.push(k);
    });
    out.sample = __T.whiteLogo(keys[0]).slice(0, 48);
    return out;
  });
  ok("every one of them is handed over as a picture a page can show", srcs.bad.length === 0, srcs.bad.slice(0, 4).join(", ") || srcs.sample);
  const drew = await p.evaluate(async () => {
    const L = __T.LOGO_WHITE || {};
    const keys = Object.keys(L);
    const pick = keys.filter((k, i) => i % 7 === 0).slice(0, 24);
    const res = await Promise.all(pick.map((k) => new Promise((done) => {
      const im = new Image();
      im.onload = () => done({ k, w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => done({ k, w: 0, h: 0 });
      im.src = __T.whiteLogo(k);
    })));
    return { n: res.length, blank: res.filter((r) => !r.w || !r.h).map((r) => r.k) };
  });
  ok("a sample of them draws, none of them blank", drew.blank.length === 0, drew.n + " drawn" + (drew.blank.length ? ", blank: " + drew.blank.join(", ") : ""));
  const ar = await p.evaluate(() => {
    const L = __T.LOGO_WHITE || {};
    const k = Object.keys(L).filter((x) => String(L[x]).charAt(0) === "<" && /viewBox/.test(L[x]))[0];
    return { k: k, ar: __T.logoAR(__T.whiteLogo(k)) };
  });
  ok("a logo's shape is still read from its drawing, so boxes are sized before it loads", ar.ar > 0.05 && ar.ar < 40, ar.k + " is " + (ar.ar || 0).toFixed(2) + " wide for its height");

  /* ---------- what a reader is given ---------- */
  await p.click('.sp-hero button:has-text("Open the example project")');
  await p.waitForTimeout(2000);
  const card = await p.$(".el-card, .mat-card, .board .card, [data-mat]");
  if (card) await card.click();
  await p.waitForTimeout(3500);
  const named = await p.evaluate(() => {
    const out = {};
    [].forEach.call(document.querySelectorAll("header.top, main#view"), (e) => { out[e.tagName.toLowerCase()] = e.getAttribute("aria-label"); });
    return out;
  });
  ok("the toolbar and the workspace have names", !!named.header && !!named.main, JSON.stringify(named));
  const live = await p.evaluate(() => {
    const e = document.getElementById("say");
    return e ? { role: e.getAttribute("role"), live: e.getAttribute("aria-live"), hidden: e.className } : null;
  });
  ok("the page keeps a place for things that are said, not shown", !!live && live.role === "status" && live.live === "polite", JSON.stringify(live));
  const said = await p.evaluate(async () => {
    const out = [];
    const el = document.getElementById("say");
    new MutationObserver(() => out.push((el.textContent || "").trim())).observe(el, { childList: true, characterData: true, subtree: true });
    const f = document.getElementById("ed-client");
    f.focus();
    f.value = "Said out loud";
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 4000));
    return out;
  });
  ok("saving and saved are said out loud", said.some((x) => /saving/i.test(x)) && said.some((x) => /saved/i.test(x)), JSON.stringify(said.slice(0, 4)));
  const menu = await p.evaluate(async () => {
    const btn = [].slice.call(document.querySelectorAll("button")).filter((b) => /export/i.test(b.textContent || "") && b.offsetParent)[0];
    if (!btn) return { none: true };
    btn.click();
    await new Promise((r) => setTimeout(r, 800));
    const m = document.querySelector('[role=menu]');
    const label = m && m.getAttribute("aria-label");
    (document.activeElement || document).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));
    const m2 = document.querySelector('[role=menu]');
    return { label: label, closed: !(m2 && m2.offsetParent) };
  });
  ok("the export menu says what it is and closes on Escape", !!menu.label && menu.closed, JSON.stringify(menu));

  /* ---------- work typed just before the tab dies ---------- */
  const ids = await p.evaluate(() => ({ pid: __T.S().pid, mid: __T.S().mid }));
  const typed = await p.evaluate(async (i) => {
    const f = document.getElementById("ed-client");
    f.focus();
    f.value = "SAVED-FIRST";
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 2500));
    // and now a change made inside the second after that save, the way a crash catches one
    f.value = "TYPED-A-MOMENT-LATER";
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));
    const dr = JSON.parse(localStorage.getItem("gl-draft-" + i.mid) || "null");
    const m = JSON.parse(localStorage.getItem("mockdb") || "{}")["projects/" + i.pid + "/materials/" + i.mid] || {};
    return { draft: dr && dr.mat && dr.mat.client, stored: m.client, newerBy: dr ? dr.at - ((m.contentAt || m.updatedAt || 0) + 1000) : null };
  }, ids);
  ok("the keystroke is in this browser before any save", typed.draft === "TYPED-A-MOMENT-LATER" && typed.stored === "SAVED-FIRST", JSON.stringify(typed));
  ok("and it looks no newer than the last save, which is why the clock cannot settle it", typed.newerBy < 1000, "newer by " + typed.newerBy + " ms past the second's grace");
  // the tab dies here, before its save could go through: the page is then opened again from nothing
  await p.close({ runBeforeUnload: false });
  const p2 = await ctx.newPage();
  const errs2 = [];
  p2.on("pageerror", (e) => errs2.push(e.message.slice(0, 160)));
  await p2.goto("file://" + __dirname + "/test.html");
  await p2.waitForTimeout(2000);
  await p2.evaluate((i) => __T.go("editor", i.pid, i.mid), ids);
  for (let i = 0; i < 12; i++) {
    await sleep(500);
    const there = await p2.evaluate(() => [].slice.call(document.querySelectorAll(".note, [class*=banner]")).some((e) => /unsaved/i.test(e.textContent || "")));
    if (there) break;
  }
  const offer = await p2.evaluate(() => {
    const bn = [].slice.call(document.querySelectorAll(".note, [class*=banner]")).filter((e) => /unsaved/i.test(e.textContent || ""))[0];
    return bn ? { text: (bn.textContent || "").trim().slice(0, 60), acts: [].slice.call(bn.querySelectorAll("button")).map((x) => x.textContent.trim()) } : null;
  });
  ok("opening the page again offers the work back", !!offer && offer.acts.indexOf("Restore them") >= 0, offer ? JSON.stringify(offer.acts) : "nothing was offered");
  const back = await p2.evaluate(async (i) => {
    const bn = [].slice.call(document.querySelectorAll(".note, [class*=banner]")).filter((e) => /unsaved/i.test(e.textContent || ""))[0];
    const btn = bn && [].slice.call(bn.querySelectorAll("button")).filter((x) => /restore/i.test(x.textContent))[0];
    if (btn) btn.click();
    await new Promise((r) => setTimeout(r, 2500));
    const m = JSON.parse(localStorage.getItem("mockdb") || "{}")["projects/" + i.pid + "/materials/" + i.mid] || {};
    return { stored: m.client, field: (document.getElementById("ed-client") || {}).value, mods: (m.modules || []).length };
  }, ids);
  ok("taking the offer puts it back, and disturbs nothing else", back.stored === "TYPED-A-MOMENT-LATER" && back.field === "TYPED-A-MOMENT-LATER" && back.mods > 0, JSON.stringify(back));
  await p2.close();

  /* ---------- three cards, one set of rows ---------- */
  const p3 = await ctx.newPage();
  p3.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  await p3.goto("file://" + __dirname + "/test.html");
  await p3.waitForTimeout(1800);
  await p3.evaluate(() => document.fonts.ready);
  const rows = await p3.evaluate(() => {
    const out = [];
    __T.ELIB.forEach((pc) => {
      let lay;
      try { lay = __T.pieceLayout(pc); } catch (e) { return; }
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px;background:#fff";
      document.body.appendChild(host);
      host.innerHTML = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum", tight: lay.tight || 0 }, () => __T.pageHTML(JSON.parse(JSON.stringify(lay.modules)), { w: 816, h: 1056, print: true }, false, null)));
      [].forEach.call(host.querySelectorAll(".ly-sc, .scols"), (row) => {
        const cards = [].slice.call(row.children).filter((c) => c.children.length);
        if (cards.length < 2) return;
        // where each card's list sits, measured from the top of its own card
        const tops = cards
          .map((c) => {
            const l = c.querySelector(".sc-b, ul");
            if (!l) return null;
            return Math.round(l.getBoundingClientRect().top - c.getBoundingClientRect().top);
          })
          .filter((x) => x !== null);
        if (tops.length < 2) return;
        const spread = Math.max.apply(null, tops) - Math.min.apply(null, tops);
        if (spread > 8) out.push({ id: pc.id, cls: String(row.className).slice(0, 30), tops: tops });
      });
      host.remove();
    });
    return out;
  });
  ok("in every row of cards the lists start on the same line", rows.length === 0, rows.length ? rows.slice(0, 3).map((r) => r.id + " " + r.tops.join("/")).join(" | ") : "checked every piece");

  ok("no page errors", errs.length === 0 && errs2.length === 0, errs.concat(errs2).slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
