/* v216: the Agent, for every kind of person who uses the build.
   Owner, reviewer, editor and viewer each ask for what they would ask for; two people run it on one material at
   once; a run is stopped half way, and the person walks off mid-run. Claude is faked by a script of tool calls. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + String(d).slice(0, 230) : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 500)); process.exit(1); });
const FAKE = () => {
  window.__script = null;
  const fake = async function (turns, opts) {
    window.__lastTools = (opts.tools || []).map((t) => t.name);
    window.__rules = turns[0].content;
    window.__images = (opts.images || []).length;
    window.__lastUser = turns[turns.length - 1].content;
    const out = [];
    const path = (i, p) => { let o = out[+i]; p.split(".").forEach((k) => { o = o == null ? o : o[k]; }); return o; };
    const ref = (v) => (typeof v !== "string" ? v : /^\$\d+\.[\w.]+$/.test(v) ? path(v.match(/^\$(\d+)/)[1], v.replace(/^\$\d+\./, "")) : v);
    for (const st of window.__script || []) {
      if (st[0] === "__wait") { await new Promise((r, j) => { const t = setTimeout(r, st[1]); opts.signal.addEventListener("abort", () => { clearTimeout(t); j({ code: "cancelled", text: "" }); }); }); continue; }
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
  fake.limits = async () => ({ maxPromptBytes: 262144, images: true, tools: { maxCount: 32 } });
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
    await p.waitForTimeout(2300);
    return p;
  };
  const arm = async (p) => { await p.evaluate(FAKE); await p.evaluate(() => __T.go("agent")); await p.waitForTimeout(900); };
  const run = async (p, script, msg, wait) => {
    await p.evaluate((s) => { window.__script = s; window.__toolOut = null; }, script);
    await p.fill("#wa-in", msg || "go");
    await p.press("#wa-in", "Enter");
    if (wait === false) return null;
    for (let i = 0; i < 100; i++) { await p.waitForTimeout(250); if (await p.evaluate(() => !!window.__toolOut && !__T.WA.busy)) break; }
    return p.evaluate(() => window.__toolOut);
  };
  const str = (x) => (typeof x === "string" ? x : JSON.stringify(x));

  /* ---------- the workspace: an example project, with a reviewer named ---------- */
  const chris = await open("chris");
  await chris.evaluate(() => localStorage.clear());
  await chris.reload();
  await chris.waitForTimeout(2300);
  await chris.click('.sp-hero button:has-text("Open the example project")');
  await chris.waitForTimeout(2600);
  const ex = await chris.evaluate(async () => {
    const pid = __T.S().pid;
    await __T.Store.patchProject(pid, { reviewers: ["u_test000000000000000003"] });
    const ms = __T.S().mats.map((m) => ({ id: m.id, name: m.name, status: m.status || "draft" }));
    return { pid, ms };
  });
  const by = (st) => (ex.ms.filter((m) => m.status === st)[0] || {}).id;
  await chris.waitForTimeout(800);

  /* ================= the owner ================= */
  await arm(chris);
  let o = await run(chris, [["whereAmI"], ["whatNeedsMe"], ["listProjects"]]);
  const hub = await chris.evaluate(() => __T.forYou().length);
  ok("owner: what needs them is what the hub says needs them", o[1].count === hub && o[1].items.every((x) => x.projectId && x.materialId && x.why), o[1].count + " items, hub " + hub);
  ok("owner: is told they own the project", o[2][0].yourRole === "owner", o[2][0].yourRole);
  o = await run(chris, [["createProject", { name: "Northwind autumn launch", client: "Northwind" }], ["setProjectBrief", { projectId: "$0.projectId", message: "Northwind opens in nine markets this autumn", goal: "Announce the launch" }], ["createMaterial", { projectId: "$0.projectId", from: "layout:Client Case Study" }], ["openMaterial", { projectId: "$0.projectId", materialId: "$2.materialId" }], ["setDetails", { due: "2027-01-15", client: "Northwind Ltd" }], ["createProject", { name: "northwind AUTUMN launch" }]]);
  const own = await chris.evaluate(() => { const m = __T.mat(); const h = m.modules.filter((x) => x.type === "hero")[0]; return { title: h.data.title, due: m.due, client: m.client, projects: __T.S().projects.filter((p) => /northwind/i.test(p.name)).length }; });
  ok("owner: a brief is written, and the new material's headline comes from it", own.title === "Northwind opens in nine markets this autumn", own.title);
  ok("owner: a material's due date and client are set", own.due === "2027-01-15" && own.client === "Northwind Ltd", own.due + " / " + own.client);
  ok("owner: asking for the same project twice does not make two", o[5].alreadyExisted === true && own.projects === 1, own.projects + " projects");
  await chris.click("#wa-undo");
  await chris.waitForTimeout(700);
  ok("owner: undo takes the details back too", await chris.evaluate(() => !__T.mat().due && !__T.mat().client));
  const many = [["listProjects"]];
  for (let i = 0; i < 10; i++) many.push(["createMaterial", { projectId: "$0.0.id", from: "template:launch", name: "Copy " + i }]);
  o = await run(chris, many);
  const madeN = o.slice(1).filter((x) => x && x.materialId).length, refused = o.slice(1).filter((x) => /^Error: That is the most materials/.test(str(x))).length;
  ok("owner: one request cannot create without end", madeN === 8 && refused === 2, madeN + " made, " + refused + " refused");
  o = await run(chris, [["setProjectBrief", { projectId: ex.pid, message: "A truly unique game-changer" }], ["openMaterial", { projectId: ex.pid, materialId: "gone" }]]);
  ok("owner: a missing material is said so at once", /^Error: No material with that id/.test(str(o[1])), str(o[1]).slice(0, 60));

  /* ================= the reviewer ================= */
  const priya = await open("priya");
  await arm(priya);
  o = await run(priya, [["listProjects"], ["whatNeedsMe"], ["openMaterial", { projectId: ex.pid, materialId: by("review") }], ["whereAmI"], ["setField", { moduleId: "$2.modules.0.id", path: "title", value: "Reviewer rewrote this" }]]);
  const exRow = (o[0] || []).filter((p) => p.id === ex.pid)[0] || {};
  ok("reviewer: is told she reviews this project", exRow.yourRole === "reviewer", exRow.yourRole);
  ok("reviewer: the review waiting for her is first in what needs her", o[1].count >= 1 && /review/i.test(o[1].items[0].why) && o[1].items[0].materialId === by("review"), JSON.stringify(o[1].items[0] || {}).slice(0, 120));
  ok("reviewer: the agent opens it and knows she may approve here", o[3].material && o[3].material.id === by("review") && o[3].canApproveHere === true && o[3].roleInOpenProject === "reviewer", JSON.stringify(o[3]).slice(0, 160));
  ok("reviewer: there is still no tool that approves for her", !(await priya.evaluate(() => window.__lastTools)).some((t) => /approve|status|review/i.test(t)));
  const inRev = await priya.evaluate(() => ({ title: __T.mat().modules[0].data.title, side: document.body.classList.contains("wa-ed"), left: Math.round(document.getElementById("wa").getBoundingClientRect().left), insp: !!document.querySelector(".pane.r") && document.querySelector(".pane.r").getBoundingClientRect().right > document.getElementById("wa").getBoundingClientRect().right }));
  ok("reviewer: work in review is not rewritten by the agent", inRev.title !== "Reviewer rewrote this" && /^Error/.test(str(o[4])), str(o[4]).slice(0, 90));
  ok("reviewer: beside the editor the agent sits on the left, clear of the Review tab", inRev.side && inRev.left < 40 && inRev.insp, JSON.stringify(inRev));

  /* ================= the editor ================= */
  const dana = await open("dana");
  await arm(dana);
  o = await run(dana, [["listProjects"], ["openMaterial", { projectId: ex.pid, materialId: by("approved") }], ["whereAmI"], ["addModule", { type: "checklist" }], ["setDetails", { name: "Renamed while approved" }], ["createMaterial", { projectId: ex.pid, from: "template:launch", name: "Dana's one-pager" }]]);
  const dRow = (o[0] || []).filter((p) => p.id === ex.pid)[0] || {};
  ok("editor: is told she is an editor and cannot approve", dRow.yourRole === "editor" && o[2].canApproveHere === false, dRow.yourRole + " / " + o[2].canApproveHere);
  ok("editor: approved work is closed to the agent", /^Error: This material can't be changed/.test(str(o[3])) && /^Error/.test(str(o[4])) && (await dana.evaluate(() => __T.mat().name !== "Renamed while approved")), str(o[3]).slice(0, 70));
  ok("editor: she can still add a material to a project she does not own", !!o[5].materialId, str(o[5]).slice(0, 80));

  /* ================= the viewer ================= */
  const sam = await open("sam");
  await sam.evaluate(FAKE);
  await sam.waitForTimeout(700);
  const tabHidden = await sam.evaluate(() => { const t = document.getElementById("wa-tab"); return !t || t.hidden; });
  await sam.evaluate(() => __T.go("agent"));
  await sam.waitForTimeout(900);
  const keys0 = await sam.evaluate(() => localStorage.getItem("mockdb").length);
  o = await run(sam, [["whereAmI"], ["listProjects"], ["searchLibrary", { query: "case study" }], ["openMaterial", { projectId: ex.pid, materialId: by("draft") }], ["setField", { moduleId: "$3.modules.0.id", path: "title", value: "Viewer wrote this" }], ["setProjectBrief", { projectId: ex.pid, message: "x" }], ["createMaterial", { projectId: ex.pid, from: "template:launch" }]]);
  const samRow = (o[1] || []).filter((p) => p.id === ex.pid)[0] || {};
  ok("viewer: can ask, look, search and be shown a material", o[0].canChangeThings === false && samRow.yourRole === "viewer" && o[2].found > 0 && (await sam.evaluate(() => __T.S().view)) === "editor", samRow.yourRole);
  ok("viewer: nothing is written, whatever is asked", [o[4], o[5], o[6]].every((x) => /^Error/.test(str(x))) && (await sam.evaluate(() => localStorage.getItem("mockdb").length)) === keys0, [o[4], o[5], o[6]].map((x) => str(x).slice(7, 40)).join(" | "));
  ok("viewer: the rules tell the model what a viewer can and cannot have", /A viewer can only look and comment/.test(await sam.evaluate(() => window.__rules)));
  ok("viewer: is not offered the side button until they have a conversation", tabHidden);

  /* ================= two people, one material, both with the agent ================= */
  const draft = by("draft");
  const prep = async (p) => { await run(p, [["openMaterial", { projectId: ex.pid, materialId: draft }]]); return p.evaluate(() => __T.mat().modules.filter((m) => m.type !== "pagebreak").map((m) => ({ id: m.id, type: m.type }))); };
  const mods = await prep(chris);
  await prep(dana);
  const hero = mods.filter((m) => m.type === "hero")[0], other = mods.filter((m) => m.type === "cta")[0];
  await Promise.all([
    run(chris, [["setField", { moduleId: hero.id, path: "title", value: "Chris's agent set the headline" }]]),
    run(dana, [["setField", { moduleId: other.id, path: "title", value: "Dana's agent set the close" }]]),
  ]);
  await chris.waitForTimeout(4000);
  const both = await chris.evaluate((i) => { const m = JSON.parse(localStorage.getItem("mockdb"))["projects/" + i.pid + "/materials/" + i.mid]; return { hero: m.modules.filter((x) => x.type === "hero")[0].data.title, cta: m.modules.filter((x) => x.type === "cta")[0].data.title, n: m.modules.length }; }, { pid: ex.pid, mid: draft });
  ok("two agents on one material, different modules: both changes are kept", both.hero === "Chris's agent set the headline" && both.cta === "Dana's agent set the close", JSON.stringify(both));

  /* ================= stopping, and walking off mid-run ================= */
  await chris.evaluate(() => __T.go("agent"));
  await chris.waitForTimeout(800);
  await run(chris, [["__wait", 6000], ["createProject", { name: "Should never be made" }]], "slow one", false);
  await chris.waitForTimeout(700);
  const working = await chris.evaluate(() => ({ busy: __T.WA.busy, btn: document.getElementById("wa-send").textContent }));
  await chris.click('#appnav button:has-text("Library")');
  await chris.waitForTimeout(1200);
  const walked = await chris.evaluate(() => ({ view: __T.S().view, open: document.body.classList.contains("wa-open"), shown: !document.getElementById("wa").hidden, busy: __T.WA.busy }));
  ok("walking off mid-run brings the conversation along, still working", working.busy && working.btn === "Stop" && walked.view === "library" && walked.open && walked.shown && walked.busy, JSON.stringify(walked));
  await chris.click("#wa-send");
  await chris.waitForTimeout(1200);
  const stopped = await chris.evaluate(() => ({ busy: __T.WA.busy, btn: document.getElementById("wa-send").textContent, last: [].slice.call(document.querySelectorAll("#wa .wa-ai")).pop().textContent, made: __T.S().projects.some((p) => p.name === "Should never be made") }));
  ok("Stop stops it: nothing after that point is made", !stopped.busy && stopped.btn === "Send" && /Stopped/.test(stopped.last) && !stopped.made, JSON.stringify(stopped));
  await chris.click("#wa-new");
  await chris.waitForTimeout(400);
  ok("New chat clears the conversation and offers the ideas again", await chris.evaluate(() => __T.WA.turns.length === 0 && document.querySelectorAll("#wa .wa-idea").length >= 3));
  await chris.click("#wa-close");
  await chris.waitForTimeout(400);
  ok("closing the drawer leaves a button to bring it back", await chris.evaluate(() => document.getElementById("wa").hidden && !document.getElementById("wa-tab").hidden));


  /* ================= watching it work ================= */
  await chris.evaluate(() => { __T.WA.open = false; __T.go("projects"); });
  await chris.waitForTimeout(900);
  await chris.click("#wa-tab");
  await chris.waitForTimeout(400);
  const face = await chris.evaluate(() => ({ body: getComputedStyle(document.body).fontFamily, nav: getComputedStyle(document.querySelector("#appnav button")).fontFamily, size: getComputedStyle(document.body).fontSize, wa: getComputedStyle(document.getElementById("wa")).fontFamily }));
  ok("with the drawer open the whole interface is still set in Geist", /^"?Geist"?,/.test(face.body) && /^"?Geist"?,/.test(face.nav) && /^"?Geist"?,/.test(face.wa) && face.size === "14px", JSON.stringify(face));
  await run(chris, [["whereAmI"], ["createProject", { name: "Watch me work" }], ["__wait", 1800], ["createMaterial", { projectId: "$1.projectId", from: "layout:Client Case Study" }], ["openMaterial", { projectId: "$1.projectId", materialId: "$2.materialId" }], ["removeModule", { moduleId: "nope" }], ["__wait", 2500], ["addModule", { type: "checklist" }], ["__wait", 1500]], "make it", false);
  await chris.waitForTimeout(800);
  const mid1 = await chris.evaluate(() => ({ view: __T.S().view, project: (__T.S().projects.filter((p) => p.id === __T.S().pid)[0] || {}).name, sum: (document.getElementById("wa-sum") || {}).textContent, rows: [].map.call(document.querySelectorAll("#wa-steplist li"), (li) => li.className + ":" + li.querySelector("span").firstChild.textContent), busy: __T.WA.busy }));
  ok("a new project is shown the moment the agent makes it, with the step ticked", mid1.busy && mid1.view === "project" && mid1.project === "Watch me work" && mid1.rows[1] === "ok:Creating the project “Watch me work”" && /^Step \d/.test(mid1.sum), JSON.stringify(mid1));
  await chris.waitForTimeout(2600);
  await chris.click("#wa-close");
  await chris.waitForTimeout(300);
  const put = await chris.evaluate(() => ({ hidden: document.getElementById("wa").hidden, tab: document.getElementById("wa-tab").textContent, busy: __T.WA.busy, view: __T.S().view, pad: getComputedStyle(document.querySelector(".ed")).paddingLeft }));
  ok("put away while it works, the button says what it is doing", put.busy && put.hidden && /^Agent: /.test(put.tab) && put.view === "editor" && put.pad === "0px", JSON.stringify(put));
  await chris.click("#wa-tab");
  let touched = false;
  for (let i = 0; i < 80; i++) { await chris.waitForTimeout(150); touched = touched || (await chris.evaluate(() => !!document.querySelector(".mod.wa-touch"))); if (await chris.evaluate(() => !__T.WA.busy)) break; }
  await chris.waitForTimeout(500);
  const endS = await chris.evaluate(() => ({ sum: document.getElementById("wa-sum").textContent, rows: [].map.call(document.querySelectorAll("#wa-steplist li"), (li) => li.className), bad: (document.querySelector("#wa-steplist li.bad em") || {}).textContent, room: parseFloat(getComputedStyle(document.querySelector(".ed")).paddingLeft), waRight: document.getElementById("wa").getBoundingClientRect().right, stageLeft: document.querySelector(".stage").getBoundingClientRect().left, show: document.querySelectorAll("#wa-steplist li button").length, order: [].map.call(document.querySelectorAll("#wa-log > *"), (e) => (e.id === "wa-steps" ? "steps" : e.className.replace("wa-b ", ""))).join(",") }));
  ok("every step is listed, ticked or refused with the reason, and summed up at the end", endS.rows.join(",") === "ok,ok,ok,ok,bad,ok" && /No module with that id/.test(endS.bad) && /^6 steps in \d+ s, 1 refused$/.test(endS.sum) && endS.show === 2, JSON.stringify(endS).slice(0, 220));
  ok("the steps sit between the request and the reply", /wa-me,steps,wa-ai$/.test(endS.order), endS.order);
  ok("the module the agent added is brought into view and outlined", touched);
  ok("the editor makes room: the page is beside the conversation, not under it", endS.room > 400 && endS.waRight <= endS.stageLeft + 1, endS.room + " / " + Math.round(endS.waRight) + " <= " + Math.round(endS.stageLeft));

  /* ================= the Claude skill, from the homepage ================= */
  await chris.evaluate(() => { __T.WA.open = false; window.__saved = []; window.__blobs = []; __T.go("about"); });
  await chris.waitForTimeout(1200);
  const skl = await chris.evaluate(() => ({ h: (document.getElementById("skl-h") || {}).textContent, meta: (document.getElementById("skl-meta") || {}).textContent, nextText: document.querySelector(".skl").nextElementSibling.textContent.slice(0, 400), shown: document.getElementById("skl-dl").getBoundingClientRect().height > 0, steps: document.querySelectorAll(".skl-mini li").length }));
  ok("Get started offers the Claude skill, with its version", skl.h === "Use ELEMENT from Claude" && /^Version 2\d\d\.[0-9a-f]{6} · \d+ KB/.test(skl.meta) && skl.steps === 3 && skl.shown, JSON.stringify(skl).slice(0, 200));
  await chris.click("#skl-dl");
  await chris.waitForFunction(() => (window.__saved || []).length > 0, null, { timeout: 8000 });
  const zip = await chris.evaluate(async () => { const a = new Uint8Array(await window.__blobs[0].arrayBuffer()); const txt = new TextDecoder("latin1").decode(a); const names = []; let i = 0; while ((i = txt.indexOf("PK\x01\x02", i)) >= 0) { const n = a[i + 28] | (a[i + 29] << 8); names.push(txt.substr(i + 46, n)); i += 46 + n; } return { name: window.__saved[0], sig: txt.slice(0, 2), bytes: a.length, names }; });
  ok("the download is a real skill zip: SKILL.md at the top of one folder, references, script and install guide", zip.name === "element-builder.zip" && zip.sig === "PK" && zip.names.indexOf("element-builder/SKILL.md") >= 0 && zip.names.indexOf("element-builder/INSTALL.md") >= 0 && zip.names.indexOf("element-builder/scripts/element.py") >= 0 && zip.names.indexOf("element-builder/references/schema.json") >= 0 && zip.names.every((n) => /^element-builder\//.test(n)), zip.bytes + " bytes: " + zip.names.join(", "));
  await chris.click("#skl-how");
  await chris.waitForTimeout(400);
  const how = await chris.evaluate(() => ({ title: (document.getElementById("modal-title") || {}).textContent, steps: [].map.call(document.querySelectorAll(".skl-steps li strong"), (e) => e.textContent), facts: [].map.call(document.querySelectorAll(".skl-facts dt"), (e) => e.textContent), ver: (document.querySelector(".skl-ver") || {}).textContent }));
  ok("the how-to walks through install, checking, updating and what to do when it fails", how.title === "Install the ELEMENT skill in Claude" && how.steps.length === 5 && how.steps[2] === "Upload it" && how.facts.join("|") === "What you need|Keeping it current|What it will not do|If something fails" && /38 modules, 11 brands, 14 sizes/.test(how.ver), JSON.stringify(how).slice(0, 200));
  await chris.keyboard.press("Escape");
  await chris.waitForTimeout(4500);
  const stamp = await chris.evaluate(() => { const d = JSON.parse(localStorage.getItem("mockdb"))["meta/skill"]; return d ? d.version : null; });
  ok("the app records the skill version it carries, where an installed skill can read it", stamp && skl.meta.indexOf(stamp) >= 0, stamp);
  await chris.evaluate(() => __T.go("help"));
  await chris.waitForTimeout(900);
  ok("Help has the install guide too", await chris.evaluate(() => /Use ELEMENT from Claude \(install the skill\)/.test(document.getElementById("view").textContent)));
  await sam.evaluate(() => __T.go("about"));
  await sam.waitForTimeout(1200);
  ok("a viewer can take the skill as well", await sam.evaluate(() => !!document.getElementById("skl-dl")));

  /* ================= story rows on the Spectrum look ================= */
  await chris.evaluate(() => __T.go("agent"));
  await chris.waitForTimeout(800);
  await run(chris, [["listProjects"], ["createMaterial", { projectId: ex.pid, from: "layout:Client Case Study", name: "Story rows check" }], ["openMaterial", { projectId: ex.pid, materialId: "$1.materialId" }]]);
  await chris.waitForTimeout(1500);
  const story = await chris.evaluate(() => { const rows = [].slice.call(document.querySelectorAll("#stage .sec>.srow:not(.srow-n)")); return { n: rows.length, tiles: rows.filter((r) => { const t = r.querySelector(".tile"); return t && getComputedStyle(t).display !== "none"; }).length, bars: rows.map((r) => { const b = getComputedStyle(r, "::before"); return b.width + " " + (/gradient/.test(b.backgroundImage) ? "g" : "-"); }).join("|"), hues: new Set(rows.map((r) => getComputedStyle(r, "::before").backgroundImage)).size, left: rows.map((r) => Math.round(r.querySelector("h3").getBoundingClientRect().left - r.getBoundingClientRect().left)).join(",") }; });
  ok("story rows are a label and words beside a colour bar: no icon tile, one hue per row", story.n >= 2 && story.tiles === 0 && story.bars.split("|").every((x) => x === "3px g") && story.hues === Math.min(3, story.n), JSON.stringify(story));

  /* ================= pictures ================= */
  /* (the material from the story-rows check is open, its hero in type alone) */
  const heroBefore = await chris.evaluate(() => { const h = __T.mat().modules.filter((m) => m.type === "hero")[0]; return { layout: h.data.layout, has: !!(h.data.photo && (h.data.photo.id || h.data.photo.data)) }; });
  await chris.setInputFiles("#wa-file", __dirname + "/photo.jpg");
  await chris.waitForTimeout(500);
  const chip = await chris.evaluate(() => ({ n: document.querySelectorAll("#wa-files .wa-file").length, text: (document.querySelector("#wa-files .wa-file span") || {}).textContent, clip: !document.getElementById("wa-clip").hidden }));
  ok("a picture can be attached to the conversation, and shows as a chip", chip.n === 1 && chip.text === "1. photo.jpg" && chip.clip, JSON.stringify(chip));
  o = await run(chris, [["listPictures"], ["setPicture", { picture: "attached:1" }]], "put this on the hero");
  const pic1 = await chris.evaluate(() => { const h = __T.mat().modules.filter((m) => m.type === "hero")[0]; return { id: !!(h.data.photo && h.data.photo.id), layout: h.data.layout, images: window.__images, user: window.__lastUser, me: [].slice.call(document.querySelectorAll("#wa .wa-me")).pop().textContent }; });
  ok("the agent uploads the attached picture and puts it on the hero", o[0].attached.length === 1 && o[0].attached[0].ref === "attached:1" && /^Done: put “photo.jpg” on the hero/.test(str(o[1])) && pic1.id && pic1.layout !== "text" && !heroBefore.has, str(o[1]).slice(0, 80) + " / " + pic1.layout);
  ok("Claude is shown the picture and told its name with the message", pic1.images === 1 && /put this on the hero\n\(Picture attached: attached:1 “photo.jpg”\)/.test(pic1.user), pic1.images + " / " + pic1.user.slice(-70));
  o = await run(chris, [["listPictures"], ["setPicture", { picture: "builtin:ph-launch" }], ["setPicture", { picture: "builtin:nope" }], ["setPicture", { picture: "https://example.com/a.jpg" }], ["searchLibrary", { query: "case study" }]], "use a built-in one");
  const pic2 = await chris.evaluate(() => { const h = __T.mat().modules.filter((m) => m.type === "hero")[0]; return { data: /^data:image/.test((h.data.photo || {}).data || ""), images: window.__images }; });
  ok("it gets a built-in picture, and says no to one it does not have or a web address", o[0].builtIn.length >= 15 && pic2.data && /^Error: No built-in picture/.test(str(o[2])) && /^Error: picture must start with/.test(str(o[3])) && pic2.images === 0, o[0].builtIn.length + " built in");
  const withPic = await chris.evaluate(() => (__T.ELIB.filter((pc) => pc.heroFile)[0] || {}).id);
  await run(chris, [["setPicture", { picture: "library:" + withPic }]], "library one");
  const libPic = await chris.evaluate(() => { const h = __T.mat().modules.filter((m) => m.type === "hero")[0]; const im = document.querySelector("#stage .mod img"); return { elib: (h.data.photo || {}).elib, drawn: !!document.querySelector('#stage .mod [style*="element-library"], #stage .mod img[src*="element-library"], #stage .mod img[src*="_blob"]') }; });
  o = await run(chris, [["setPicture", { picture: "library:" + withPic }], ["removePicture"], ["removePicture"]], "library one, then none");
  const pic3 = await chris.evaluate(() => { const h = __T.mat().modules.filter((m) => m.type === "hero")[0]; return { has: !!(h.data.photo && (h.data.photo.id || h.data.photo.data || h.data.photo.elib)), layout: h.data.layout }; });
  ok("it takes a Library piece's picture, and removes a picture when asked", !!libPic.elib && libPic.drawn && /^Done: put the picture from/.test(str(o[0])) && /^Done: removed the picture/.test(str(o[1])) && /^Error: There is no picture/.test(str(o[2])) && !pic3.has && pic3.layout === "text", str(o[0]).slice(0, 70));
  await run(sam, [["openMaterial", { projectId: ex.pid, materialId: by("draft") }], ["setPicture", { picture: "builtin:ph-case" }]], "picture please");
  const samPic = await sam.evaluate(() => ({ out: String(window.__toolOut[1]), clip: document.getElementById("wa-clip").hidden }));
  ok("a viewer cannot place or attach a picture", /^Error: This person has view access only/.test(samPic.out) && samPic.clip, samPic.out.slice(0, 60));
  await chris.click("#wa-new");
  await chris.waitForTimeout(300);
  ok("New chat clears the attached pictures", await chris.evaluate(() => __T.WA.files.length === 0 && document.getElementById("wa-files").hidden));

  ok("no page errors for anyone", errs.length === 0, errs.slice(0, 3).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
