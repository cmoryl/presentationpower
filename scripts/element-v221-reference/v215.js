/* v215: the Agent area. Claude is faked (a script that calls the page's tools the way the model would); what is
   tested is everything on our side: the page, the tools, the guards, and the conversation following the person.
   - Agent is in the header and opens as a full page with a place to type;
   - the agent can look across the workspace, start a project, make a material from a starting layout, a
     Spectrum template or a Library piece, open it, and add, move and remove modules;
   - when it opens a material the same conversation becomes a drawer beside the editor;
   - its changes to a material are undone in one step;
   - it has no tool to approve, review, export or delete, and nothing is made for a view-only person. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });
const FAKE = () => {
  window.__script = null;
  const fake = async function (turns, opts) {
    window.__lastTurns = turns;
    window.__lastTools = (opts.tools || []).map((t) => t.name);
    const out = [];
    const ref = (v) => {
      if (typeof v === "string" && /^\$\d+\./.test(v)) { const m = v.match(/^\$(\d+)\.(.+)$/); let o = out[+m[1]]; m[2].split(".").forEach((k) => { o = o == null ? o : o[k]; }); return o; }
      if (typeof v === "string") return v.replace(/\$(\d+)\.([\w.]+)/g, (_, i, path) => { let o = out[+i]; path.split(".").forEach((k) => { o = o == null ? o : o[k]; }); return o; });
      return v;
    };
    for (const st of window.__script || []) {
      const t = (opts.tools || []).find((x) => x.name === st[0]);
      if (!t) { out.push("Error: no such tool " + st[0]); continue; }
      const args = {};
      Object.keys(st[1] || {}).forEach((k) => (args[k] = ref(st[1][k])));
      try { out.push(await t.execute(args, { signal: opts.signal })); } catch (e) { out.push("Error: " + e.message); }
    }
    window.__toolOut = out;
    const text = window.__reply || "Done.";
    opts.onText({ text, delta: text });
    return { text, truncated: false };
  };
  fake.limits = async () => ({ maxPromptBytes: 262144, tools: { maxCount: 32 } });
  __T.agSetSample(fake);
};
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route(/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|cdnjs/, (r) => r.abort());
  const errs = [];
  const open = async (who) => {
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push(who + ": " + e.message.slice(0, 160)));
    await p.goto("file://" + __dirname + "/test.html#as=" + who);
    await p.waitForTimeout(2200);
    return p;
  };
  const p = await open("chris");
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForTimeout(2200);
  await p.click('.sp-hero button:has-text("Open the example project")');
  await p.waitForTimeout(2500);
  await p.evaluate(FAKE);
  const run = async (script, msg, reply) => {
    await p.evaluate(([s, r]) => { window.__script = s; window.__reply = r; window.__toolOut = null; }, [script, reply || "Done."]);
    await p.fill("#wa-in", msg);
    await p.press("#wa-in", "Enter");
    for (let i = 0; i < 80; i++) { await p.waitForTimeout(250); if (await p.evaluate(() => !!window.__toolOut && !__T.WA.busy)) break; }
    return p.evaluate(() => window.__toolOut);
  };

  /* ---------- the page ---------- */
  await p.click('#appnav button:has-text("Agent")');
  await p.waitForTimeout(1000);
  const page = await p.evaluate(() => ({ view: __T.S().view, full: document.body.classList.contains("wa-full"), ideas: document.querySelectorAll(".wa-idea").length, input: !!document.getElementById("wa-in"), inSlot: !!document.querySelector("#wa-slot #wa"), h1: [].slice.call(document.querySelectorAll("h1")).filter((e) => !e.closest("[aria-hidden=true]")).length, crumb: (document.querySelector("#crumbs") || {}).textContent }));
  ok("Agent is in the header and opens as a full page with a place to type", page.view === "agent" && page.full && page.inSlot && page.input && page.ideas >= 3 && page.h1 === 1, JSON.stringify(page));

  /* ---------- looking across the workspace ---------- */
  let o = await run([["whereAmI"], ["listProjects"], ["startingPoints"], ["searchLibrary", { query: "ebrochure" }], ["listMaterials", { projectId: "$1.0.id" }]], "what do I have");
  ok("it knows where the person is and what they may do", o[0].view === "agent" && o[0].canChangeThings === true && /Chris/.test(o[0].person), JSON.stringify(o[0]).slice(0, 120));
  ok("it sees the projects and what is in one", o[1].length >= 1 && o[1][0].id && o[4].length >= 3 && o[4][0].stage, o[1].length + " projects, " + o[4].length + " materials");
  ok("it sees the starting layouts, the Spectrum templates and the Library", o[2].layouts.length >= 5 && o[2].templates.length >= 13 && o[3].found > 5 && /^library:/.test(o[3].pieces[0].from), o[2].layouts.length + " layouts, " + o[2].templates.length + " templates, " + o[3].found + " pieces found");
  const tools = await p.evaluate(() => window.__lastTools);
  ok("it has no tool to approve, review, export, delete or share", tools.length >= 20 && !tools.some((t) => /status|approve|review|export|download|delete|trash|share|access/i.test(t)), tools.length + " tools");
  ok("the model is told the rules, with the tools", await p.evaluate(() => /Never invent a figure/.test(__lastTurns[0].content) && /cannot send a material for review/.test(__lastTurns[0].content)));

  /* ---------- making something, and the conversation following ---------- */
  const node = await p.evaluateHandle(() => document.getElementById("wa"));
  o = await run([
    ["createProject", { name: "Acme spring launch", client: "Acme", brand: "Life Sciences" }],
    ["createMaterial", { projectId: "$0.projectId", from: "layout:Client Case Study" }],
    ["openMaterial", { projectId: "$0.projectId", materialId: "$1.materialId" }],
  ], "start a case study for Acme", "I made the project and a case study and opened it.");
  const made = await p.evaluate((ids) => {
    const db = JSON.parse(localStorage.getItem("mockdb") || "{}");
    const pr = db["projects/" + ids[0]], m = db["projects/" + ids[0] + "/materials/" + ids[1]];
    return { pr: pr && { name: pr.name, client: pr.client, brand: pr.brand, owner: pr.ownerId }, m: m && { name: m.name, layout: m.layout, mods: m.modules.length, status: m.status }, view: __T.S().view, mid: __T.S().mid, open: document.body.classList.contains("wa-open"), full: document.body.classList.contains("wa-full"), shown: !document.getElementById("wa").hidden, bubbles: document.querySelectorAll("#wa .wa-b").length, did: [].slice.call(document.querySelectorAll("#wa .wa-did-r")).map((r) => r.textContent) };
  }, [o[0].projectId, o[1].materialId]);
  ok("it starts a project", !!made.pr && made.pr.name === "Acme spring launch" && made.pr.client === "Acme" && /lifesci|life/i.test(made.pr.brand), JSON.stringify(made.pr));
  ok("and makes a material in it from a starting layout", !!made.m && made.m.layout === "Client Case Study" && made.m.mods >= 4 && made.m.status === "draft", JSON.stringify(made.m));
  ok("then opens it: the person is in the editor on that material", made.view === "editor" && made.mid === o[1].materialId);
  ok("and the same conversation is now a drawer beside it", made.open && !made.full && made.shown && made.bubbles >= 4 && (await p.evaluate((n) => n === document.getElementById("wa") && n.parentNode === document.body, node)), made.bubbles + " messages");
  ok("what it made is listed with a way back to it", made.did.some((t) => /Created the project/.test(t)) && made.did.some((t) => /Made .* in Acme spring launch/.test(t)), made.did.join(" | "));
  ok("the editor's own assistant steps aside while the agent is open", await p.evaluate(() => { const f = document.getElementById("ag-fab"); return !f || getComputedStyle(f).display === "none"; }));

  /* ---------- working in the material ---------- */
  const n0 = await p.evaluate(() => __T.mat().modules.length);
  o = await run([["getMaterial"], ["addModule", { type: "checklist" }], ["moveModule", { moduleId: "$1.moduleId", position: 1 }], ["removeModule", { moduleId: "nope" }]], "add a checklist near the top");
  const afterAdd = await p.evaluate(() => ({ n: __T.mat().modules.length, at1: __T.mat().modules[1].type, last: __T.mat().modules[__T.mat().modules.length - 1].type, undo: !!document.getElementById("wa-undo") }));
  ok("it adds a module and moves it, leaving the footer last", afterAdd.n === n0 + 1 && afterAdd.at1 === "checklist" && afterAdd.last === "footer", JSON.stringify(afterAdd));
  ok("a wrong id is refused, not guessed", /^Error: No module with that id/.test(String(o[3])), String(o[3]).slice(0, 60));
  ok("its changes are offered back in one step", afterAdd.undo);
  await p.click("#wa-undo");
  await p.waitForTimeout(800);
  ok("and undoing puts the material back", (await p.evaluate(() => __T.mat().modules.length)) === n0);

  /* ---------- a Library piece and a Spectrum template ---------- */
  await p.click("#wa-full");
  await p.waitForTimeout(1000);
  ok("the drawer goes back to the full page, conversation intact", await p.evaluate(() => __T.S().view === "agent" && document.body.classList.contains("wa-full") && document.querySelectorAll("#wa-slot #wa .wa-b").length >= 6));
  o = await run([["listProjects"], ["searchLibrary", { query: "case study", brand: "Legal" }], ["createMaterial", { projectId: "$0.0.id", from: "$1.pieces.0.from" }], ["createMaterial", { projectId: "$0.0.id", from: "template:launch", name: "Launch one-pager" }]], "rebuild a legal case study and add a launch one-pager");
  const two = await p.evaluate((ids) => {
    const db = JSON.parse(localStorage.getItem("mockdb") || "{}");
    const a = db["projects/" + ids[0] + "/materials/" + ids[1]], c = db["projects/" + ids[0] + "/materials/" + ids[2]];
    return { lib: a && { from: a.rebuiltFrom && a.rebuiltFrom.id, mods: a.modules.length }, tpl: c && { name: c.name, look: c.look, mods: c.modules.length } };
  }, [o[2] && o[2].projectId, o[2] && o[2].materialId, o[3] && o[3].materialId]);
  ok("it rebuilds an earlier piece from the Library", !!two.lib && !!two.lib.from && two.lib.mods >= 3 && "library:" + two.lib.from === o[1].pieces[0].from, JSON.stringify(two.lib));
  ok("and makes one from a Spectrum template", !!two.tpl && two.tpl.name === "Launch one-pager" && two.tpl.look === "spectrum", JSON.stringify(two.tpl));
  o = await run([["setField", { moduleId: "x", path: "title", value: "y" }], ["createMaterial", { projectId: "none", from: "layout:Client Case Study" }], ["createMaterial", { projectId: "$1.x", from: "bogus:1" }]], "bad asks");
  ok("a material tool with no material open says to open one", /^Error: No material is open/.test(String(o[0])), String(o[0]).slice(0, 70));
  ok("an unknown project is refused", /^Error: No project with that id/.test(String(o[1])));

  /* ---------- someone who can only look ---------- */
  const v = await open("sam");
  await v.evaluate(FAKE);
  await v.evaluate(() => __T.go("agent"));
  await v.waitForTimeout(1200);
  const before = await v.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("mockdb") || "{}")).length);
  await v.evaluate(() => { window.__script = [["whereAmI"], ["createProject", { name: "Should not exist" }]]; window.__reply = "You have view access."; });
  await v.fill("#wa-in", "make me a project");
  await v.press("#wa-in", "Enter");
  await v.waitForTimeout(2500);
  const ro = await v.evaluate(() => ({ out: window.__toolOut, keys: Object.keys(JSON.parse(localStorage.getItem("mockdb") || "{}")).length }));
  ok("for a view-only person nothing is made, and the agent is told why", ro.out && ro.out[0].canChangeThings === false && /^Error: This person has view access only/.test(String(ro.out[1])) && ro.keys === before, String(ro.out && ro.out[1]).slice(0, 60));

  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
