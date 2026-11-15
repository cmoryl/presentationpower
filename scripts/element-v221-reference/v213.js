/* v213: Spectrum templates an admin can change.
   - the owner and editors see "Edit template"; someone who can only look does not;
   - editing opens the template as a material, and "Update the template" makes what is on the page the template
     for everyone: the card, the modules it hands out, and what "Use template" makes;
   - another person's open page picks the change up; the built-in picture is stored by name, not as data;
   - a changed template is fitted here and not from the layouts worked out for the built-in one;
   - "Restore the original" brings the built-in template back. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|cdnjs/, (r) => r.abort());
  const errs = [];
  const open = async (who, extra) => {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(who + ": " + e.message.slice(0, 140)));
    await p.goto("file://" + __dirname + "/test.html#as=" + who + (extra || ""));
    await p.waitForTimeout(2200);
    return p;
  };
  const A = await open("chris");
  await A.evaluate(() => localStorage.clear());
  await A.reload();
  await A.waitForTimeout(2200);
  await A.evaluate(() => __T.go("spectrum"));
  await A.waitForTimeout(3500);
  const KEY = "launch";
  const before = await A.evaluate((k) => {
    const t = __T.tpls().filter((x) => x.key === k)[0];
    const mods = __T.tplmods(t).filter((m) => m.type !== "pagebreak");
    const card = document.querySelector('.spxl-card[data-k="' + k + '"]');
    return { name: t.name, title: mods[0].data.title, n: mods.length, edit: !!(card && card.querySelector(".spxt-edit")), restore: !!(card && card.querySelector(".spxt-restore")), cards: document.querySelectorAll(".spxl-card .spxt-edit").length };
  }, KEY);
  ok("the owner is offered Edit template on every template card", before.edit && before.cards >= 13 && !before.restore, before.cards + " cards");

  /* someone who can only look */
  const V = await open("sam");
  await V.evaluate(() => __T.go("spectrum"));
  await V.waitForTimeout(3500);
  ok("someone who can only look is not", (await V.evaluate(() => document.querySelectorAll(".spxt-edit").length)) === 0);

  /* ---------- edit ---------- */
  await A.click('.spxl-card[data-k="' + KEY + '"] .spxt-edit');
  await A.waitForTimeout(4500);
  const ed = await A.evaluate(() => ({ view: __T.S().view, key: (__T.mat() || {}).tplKey, name: (__T.mat() || {}).name, btn: !!document.getElementById("spxt-pub"), proj: (__T.S().projects || []).filter((p) => p.id === __T.S().pid).map((p) => p.name)[0] }));
  ok("it opens as a material in the editor, in the project kept for templates", ed.view === "editor" && ed.key === KEY && ed.btn && /template masters/i.test(ed.proj || ""), JSON.stringify(ed));
  // change the headline through the editor's own field, and drop the last module but the footer
  await A.click(".page .mod >> nth=0");
  await A.waitForTimeout(500);
  const typed = await A.evaluate(() => {
    const m = __T.mat();
    const hero = m.modules.filter((x) => x.type === "hero")[0];
    const fields = [].slice.call(document.querySelectorAll(".rbody textarea, .rbody input[type=text]"));
    const f = fields.filter((e) => e.value === hero.data.title)[0];
    if (!f) return "no title field";
    f.focus();
    f.value = "An admin rewrote this headline";
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
    return "typed";
  });
  await sleep(2200);
  await A.click("#spxt-pub");
  await A.waitForTimeout(600);
  ok("updating asks first, and says who it changes it for", await A.evaluate(() => /for everyone/i.test((document.getElementById("scrim") || {}).textContent || "")), typed);
  await A.evaluate(() => { document.getElementById("spxt-name").value = "Launch one-pager, rewritten"; document.getElementById("spxt-desc").value = "A new line under the name."; });
  const firstCopy = await A.evaluate(() => __T.S().mid);
  await A.click("#spxt-go");
  await A.waitForTimeout(2500);
  const stored = await A.evaluate((k) => {
    const db = JSON.parse(localStorage.getItem("mockdb") || "{}");
    const rec = db["spectrum/" + k];
    return rec ? { bytes: rec.json.length, byName: /spxKey/.test(rec.json), dataUri: /data:image\/jpeg;base64/.test(rec.json), by: rec.by, has: /An admin rewrote this headline/.test(rec.json) } : null;
  }, KEY);
  ok("the template is stored once in the shared workspace", !!stored && stored.has, stored ? stored.bytes + " bytes, by " + stored.by : "nothing stored");
  ok("and its built-in picture is stored by name, not as data", !!stored && stored.byName && !stored.dataUri && stored.bytes < 60000, stored ? stored.bytes + " bytes" : "-");

  /* ---------- everyone gets it ---------- */
  await A.evaluate(() => __T.go("spectrum"));
  await A.waitForTimeout(3500);
  const after = await A.evaluate((k) => {
    const t = __T.tpls().filter((x) => x.key === k)[0];
    const mods = __T.tplmods(t).filter((m) => m.type !== "pagebreak");
    const card = document.querySelector('.spxl-card[data-k="' + k + '"]');
    const f = __T.fmtById("letter");
    const hgt = __T.withStyle({ look: "spectrum" }, () => __T.measureAt(JSON.parse(JSON.stringify(mods)), f, __T.spxlTight(t)));
    const parts = __T.pageParts(JSON.parse(JSON.stringify(__T.tplmods(t)))).filter((x) => x.length);
    return { title: mods[0].data.title, photo: !!(mods[0].data.photo && /^data:image/.test(mods[0].data.photo.data || "")), by: card && (card.querySelector(".spxt-by") || {}).textContent, restore: !!(card && card.querySelector(".spxt-restore")), drawn: !!(card && card.querySelector(".spxl-pic .gl, .spxl-pic *")), onePage: parts.length > 1 || hgt <= f.h + 2, html: /An admin rewrote this headline/.test(__T.html(t, false)) };
  }, KEY);
  ok("the template now hands out the edited page", after.title === "An admin rewrote this headline" && after.html, after.title);
  const cardTxt = await A.evaluate((k) => { const c = document.querySelector('.spxl-card[data-k="' + k + '"]'); return { name: c.querySelector("h3").textContent, desc: c.querySelector(".spxl-d").textContent }; }, KEY);
  ok("the card takes the name and the description given when updating", cardTxt.name === "Launch one-pager, rewritten" && cardTxt.desc === "A new line under the name.", JSON.stringify(cardTxt));
  await A.click('.spxl-card[data-k="' + KEY + '"] .spxt-edit');
  await A.waitForTimeout(4000);
  const again = await A.evaluate(() => ({ mid: __T.S().mid, view: __T.S().view, title: __T.mat().modules.filter((x) => x.type === "hero")[0].data.title }));
  ok("editing it again opens the same working copy, not another", again.view === "editor" && again.mid === firstCopy && again.title === "An admin rewrote this headline", again.mid + " / " + firstCopy);
  await A.evaluate(() => __T.go("spectrum"));
  await A.waitForTimeout(3500);
  ok("with its picture back as a picture", after.photo);
  ok("it is fitted here: it holds its page or breaks cleanly", after.onePage);
  ok("the card says it was edited, and by whom, and offers the original back", /Edited by Chris/.test(after.by || "") && after.restore, after.by);
  const seen = await V.evaluate((k) => {
    const t = __T.tpls().filter((x) => x.key === k)[0];
    const card = document.querySelector('.spxl-card[data-k="' + k + '"]');
    return { title: __T.tplmods(t).filter((m) => m.type !== "pagebreak")[0].data.title, by: card && (card.querySelector(".spxt-by") || {}).textContent, edit: document.querySelectorAll(".spxt-edit, .spxt-restore").length };
  }, KEY);
  ok("another person's open page picks it up without reloading", seen.title === "An admin rewrote this headline" && /Edited/.test(seen.by || "") && seen.edit === 0, JSON.stringify(seen));
  const other = await A.evaluate(() => { const t = __T.tpls().filter((x) => x.key === "process")[0]; return { edited: !!t.edited, n: __T.tplmods(t).length }; });
  ok("the other templates are untouched", !other.edited && other.n > 3);

  /* ---------- a second editor (not the owner) may too ---------- */
  const D = await open("dana");
  await D.evaluate(() => __T.go("spectrum"));
  await D.waitForTimeout(3500);
  ok("an editor who is not the owner is offered it too", (await D.evaluate(() => document.querySelectorAll(".spxt-edit").length)) >= 13);

  /* ---------- restore ---------- */
  await A.click('.spxl-card[data-k="' + KEY + '"] .spxt-restore');
  await A.waitForTimeout(500);
  await A.click("#spxt-restore-go");
  await A.waitForTimeout(3000);
  const back = await A.evaluate((k) => {
    const t = __T.tpls().filter((x) => x.key === k)[0];
    const db = JSON.parse(localStorage.getItem("mockdb") || "{}");
    return { title: __T.tplmods(t).filter((m) => m.type !== "pagebreak")[0].data.title, name: t.name, edited: !!t.edited, stored: !!db["spectrum/" + k], n: __T.tplmods(t).filter((m) => m.type !== "pagebreak").length };
  }, KEY);
  ok("restoring brings the built-in template back, word for word", back.title === before.title && back.name === before.name && back.n === before.n && !back.edited && !back.stored, back.title);
  ok("its description too", (await A.evaluate((k) => document.querySelector('.spxl-card[data-k="' + k + '"] .spxl-d').textContent, KEY)) !== "A new line under the name.");
  await sleep(1500);
  ok("for the other person as well", (await V.evaluate((k) => { const t = __T.tpls().filter((x) => x.key === k)[0]; return __T.tplmods(t).filter((m) => m.type !== "pagebreak")[0].data.title; }, KEY)) === before.title);
  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
