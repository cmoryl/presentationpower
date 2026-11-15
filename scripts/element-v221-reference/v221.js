/* v221: the Spectrum area is the Templates area. The look keeps its name; the place and its templates lose it. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + String(d).slice(0, 220) : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 500)); process.exit(1); });
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
  await p.waitForTimeout(2300);
  const nav = await p.evaluate(() => [...document.querySelectorAll("#appnav button")].map((x) => x.textContent.trim()).join("|"));
  ok("the header says Templates where it said Spectrum", /\|Templates\|/.test(nav) && !/Spectrum/.test(nav), nav);
  await p.click('#appnav button[data-sec="spectrum"]');
  await p.waitForTimeout(2500);
  const page = await p.evaluate(() => ({ h1: document.querySelector("#view h1").textContent, crumb: (document.querySelector(".crumbs, .bcbar") || {}).textContent || "", title: document.title, view: __T.S().view, cards: document.querySelectorAll("#view .spxl-card, #view [data-tpl]").length, said: (document.getElementById("view").innerText.match(/Spectrum[^\n]{0,40}/g) || []).slice(0, 6) }));
  ok("the page is titled Templates, in its heading and its trail", page.h1 === "Templates" && /Templates/.test(page.crumb) && !/Spectrum/.test(page.crumb), JSON.stringify([page.h1, page.crumb.trim().slice(0, 40)]));
  ok("nothing on the page calls a template a Spectrum template", !page.said.some((x) => /Spectrum template/i.test(x)), page.said.join(" | "));
  /* using one */
  const made = await p.evaluate(async () => { const T = __T.waTools(32); const t = (n) => T.find((x) => x.name === n); const sp = await t("startingPoints").execute({}); const pr = await t("createProject").execute({ name: "Templates rename" }); const c = await t("createMaterial").execute({ projectId: pr.projectId, from: sp.templates[0].from }); let wrong = ""; try { await t("createMaterial").execute({ projectId: pr.projectId, from: "template:nope" }); } catch (e) { wrong = e.message; } const go1 = await t("goTo").execute({ place: "templates" }); const v1 = __T.S().view; const go2 = await t("goTo").execute({ place: "spectrum" }); const m = JSON.parse(localStorage.getItem("mockdb"))["projects/" + pr.projectId + "/materials/" + c.materialId]; const hist = Object.values(m.review).map((x) => x.text).join(" "); return { n: sp.templates.length, old: sp.spectrumTemplates === undefined, wrong, v1, go1, go2: __T.S().view, hist, look: m.look, rules: String(t("createMaterial").description + t("goTo").description + t("startingPoints").description) }; });
  ok("the agent calls them templates, goes to Templates by that name (and still by the old one)", made.n >= 13 && made.old && /^No template with the key/.test(made.wrong) && made.v1 === "spectrum" && made.go2 === "spectrum" && !/Spectrum/.test(made.rules), made.wrong + " / " + made.go1);
  ok("a material made from one says so plainly, and is still on the Spectrum look", /^Started from the template “/.test(made.hist) && made.look === "spectrum", made.hist.slice(0, 60));
  /* projects made under the old names are still the ones used */
  const old = await p.evaluate(async () => { const now = Date.now(); const mk = (name) => ({ id: Math.random().toString(36).slice(2, 14).padEnd(12, "0"), name, client: "", brand: "bm-division", industry: "", due: "", ownerId: __T.ME().id, kit: ["letter"], brief: {}, createdAt: now, updatedAt: now, summary: __T.summarize([]), activity: [] }); const a = mk("Example: Spectrum templates"), b2 = mk("Spectrum template masters"); await __T.Store.setProject(a); await __T.Store.setProject(b2); return { a: a.id, b: b2.id }; });
  await p.reload();
  await p.waitForTimeout(2500);
  await p.evaluate(() => __T.go("spectrum"));
  await p.waitForTimeout(2500);
  const btn = await p.evaluate(() => (document.getElementById("spxl-all") || {}).textContent);
  await p.click("#spxl-all");
  await p.waitForTimeout(1800);
  const opened = await p.evaluate(() => ({ pid: __T.S().pid, n: __T.S().projects.filter((x) => !x.deletedAt && /templates$/i.test(x.name) && /^Example/.test(x.name)).length }));
  ok("a template project loaded under the old name is opened, not made again", btn === "Open the template project" && opened.pid === old.a && opened.n === 1, btn + " / " + opened.n);
  await p.evaluate(() => __T.go("spectrum"));
  await p.waitForTimeout(2200);
  const edit = await p.evaluate(() => { const x = document.querySelector(".spxt-edit"); if (x) x.click(); return !!x; });
  await p.waitForTimeout(3500);
  const masters = await p.evaluate(() => ({ pid: __T.S().pid, view: __T.S().view, n: __T.S().projects.filter((x) => !x.deletedAt && /template masters$/i.test(x.name)).length }));
  ok("the admin's working copies stay in the project made under the old name", edit && masters.pid === old.b && masters.n === 1, JSON.stringify(masters));
  /* Help and the Library */
  await p.evaluate(() => __T.go("help"));
  await p.waitForTimeout(1200);
  const help = await p.evaluate(async () => { let all = ""; const tabs = [...document.querySelectorAll("#view [role=tab], #view .hp-tabs button")]; for (let i = 0; i < Math.max(1, tabs.length); i++) { const t = [...document.querySelectorAll("#view [role=tab], #view .hp-tabs button")][i]; if (t) { t.click(); await new Promise((r) => setTimeout(r, 400)); } all += " " + document.getElementById("view").textContent; } return all; });
  ok("Help points to Header > Templates", /Where are the ready-made templates\?/.test(help) && !/Header > Spectrum/.test(help), (help.match(/Where are the ready-made[^?]*\?/) || ["not found"])[0]);
  await p.evaluate(() => __T.go("library"));
  await p.waitForTimeout(2500);
  const lib = await p.evaluate(() => (document.getElementById("spx-lib-all") || {}).textContent);
  ok("the Library's rebuild button no longer says “in Spectrum”", lib === "Rebuild every brand", lib);
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
