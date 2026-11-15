/* v219: the examples show every stage, and the skill's install guide plays as a short film. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + String(d).slice(0, 240) : "")); }
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
  const board = () => p.evaluate(() => { const S = __T.S(); const ms = S.mats.filter((x) => !x.deletedAt); return { stages: ms.map((m) => m.status).sort().join(","), cols: [...document.querySelectorAll("#view .board > *")].map((c) => c.querySelectorAll(".mcard").length).join(","), flags: [...document.querySelectorAll(".so-flag")].map((x) => x.textContent).join("|"), hist: ms.map((m) => m.status + ":" + __T.reviewList(m).filter((x) => x.kind === "status").map((x) => x.to).join(">")).sort().join(" "), sample: ms.filter((m) => /^Fernwood/.test(m.name)).map((m) => __T.sampleFields(m).length).join(","), note: ms.filter((m) => m.status === "changes").map((m) => __T.reviewList(m).filter((x) => x.text && /^Example note/.test(x.text)).length).join(","), mark: (S.projects.filter((x) => x.id === S.pid)[0] || {}).exStages, sum: JSON.stringify(((S.projects.filter((x) => x.id === S.pid)[0] || {}).summary || {}).by) }; });
  const openEach = async () => { const out = []; for (let i = 0; i < 5; i++) { await p.click(".mcard >> nth=" + i); await p.waitForTimeout(2300); out.push(await p.evaluate(() => { const r = __T.preflight(__T.mat()); return { st: __T.mat().status, sign: r.list.some((x) => /sign-off/.test(x[1])), note: !!document.querySelector(".so-note") }; })); await p.evaluate(() => __T.go("project", __T.S().pid)); await p.waitForTimeout(1200); } return out; };
  const ALL = "approved,changes,delivered,draft,review";

  /* ---------- the Fernwood & Vale example ---------- */
  await p.evaluate(() => { window.__NOSPXEX = false; });
  await p.click('.sp-hero button:has-text("Open the example project")');
  await p.waitForTimeout(4800);
  let s = await board();
  ok("the example project has a material at every one of the five stages", s.stages === ALL && s.cols === "1,1,1,1,1" && s.mark === 1, s.stages + " / " + s.cols);
  ok("the delivered one shows the road it took, and nothing in the example is sample copy", /delivered:draft>review>approved>delivered/.test(s.hist) && s.sample === "0,0,0,0,0", s.hist + " / " + s.sample);
  let op = await openEach();
  ok("the approved and delivered examples are properly signed: no warning on the board or in the editor", s.flags === "" && op.filter((x) => x.st === "approved" || x.st === "delivered").length === 2 && op.every((x) => !x.sign && !x.note), JSON.stringify(op));

  /* ---------- the Spectrum example ---------- */
  await p.evaluate(() => __T.go("modules"));
  await p.waitForTimeout(1500);
  const hint = await p.evaluate(() => (document.querySelector(".spx-briefs .hint") || {}).textContent || "");
  await p.evaluate(() => document.getElementById("spx-open-briefs").click());
  await p.waitForTimeout(6000);
  s = await board();
  ok("the Spectrum example has one at every stage too, and says so where it is offered", s.stages === ALL && s.cols === "1,1,1,1,1" && /^Five full materials/.test(hint) && /every|each stage/.test(hint), s.stages + " / " + hint.slice(0, 60));
  ok("each carries its history, and the one sent back has the reviewer's note to read", /review:draft>review/.test(s.hist) && /changes:draft>review>changes/.test(s.hist) && /approved:draft>review>approved/.test(s.hist) && s.note === "1", s.hist);
  ok("the project's count by stage agrees with the board", ["draft", "review", "changes", "approved", "delivered"].every((k) => JSON.parse(s.sum || "{}")[k] === 1), s.sum);
  op = await openEach();
  ok("its approved and delivered materials are signed as well, after their heroes are given pictures", s.flags === "" && op.every((x) => !x.sign && !x.note), JSON.stringify(op));

  /* ---------- an example loaded before this: four drafts ---------- */
  const legacy = await p.evaluate(async () => {
    const S = __T.S(), pid = S.pid, now = Date.now();
    const ms = S.mats.filter((x) => !x.deletedAt);
    for (const m of ms) {
      if (m.name === "Spectrum launch page") await __T.Store.patchMaterial(pid, m.id, { deletedAt: now, deletedBy: "x" });
      else await __T.Store.patchMaterial(pid, m.id, { status: "draft", review: { a: { kind: "status", to: "draft", by: __T.ME().id, at: now - 5e8, text: "" } } });
    }
    await __T.Store.patchProject(pid, { exStages: null });
    return pid;
  });
  const before = await p.evaluate((pid) => { const d = JSON.parse(localStorage.getItem("mockdb")); return Object.keys(d).filter((k) => k.indexOf("projects/" + pid + "/materials/") === 0 && k.split("/").length === 4 && !d[k].deletedAt).map((k) => d[k].status).join(","); }, legacy);
  await p.reload();
  await p.waitForTimeout(2500);
  await p.evaluate((pid) => __T.go("project", pid), legacy);
  await p.waitForTimeout(5000);
  s = await board();
  ok("an example loaded earlier as four drafts is brought up to date when its owner opens it", before === "draft,draft,draft,draft" && s.stages === ALL && s.mark === 1 && s.flags === "", before + " -> " + s.stages + " mark=" + s.mark + " flags=" + s.flags);
  await p.reload();
  await p.waitForTimeout(2500);
  await p.evaluate((pid) => __T.go("project", pid), legacy);
  await p.waitForTimeout(4500);
  const again = await board();
  ok("it is done once: opening it again adds nothing", again.stages === ALL, again.stages);
  /* a real project is never touched */
  const real = await p.evaluate(async () => { const T = __T.waTools(32); const t = (n) => T.find((x) => x.name === n); const pr = await t("createProject").execute({ name: "A real project" }); for (let i = 0; i < 4; i++) await t("createMaterial").execute({ projectId: pr.projectId, from: "layout:Blank", name: "Real " + i }); return pr.projectId; });
  await p.evaluate((pid) => __T.go("project", pid), real);
  await p.waitForTimeout(4500);
  ok("a real project with four drafts stays four drafts", await p.evaluate(() => __T.S().mats.filter((x) => !x.deletedAt).map((m) => m.status).join(",") === "draft,draft,draft,draft"));

  /* ---------- found in the scrub ---------- */
  /* examples pass their own checks: nothing runs past its page */
  const fits = await p.evaluate(async () => { const S = __T.S(); const ex = S.projects.filter((x) => x.example && !x.deletedAt); const out = []; for (const pr of ex) { __T.go("project", pr.id); await new Promise((r) => setTimeout(r, 3500)); for (const m of __T.S().mats.filter((x) => !x.deletedAt)) { const over = __T.withStyle(m, () => m.formats.map((id) => __T.fmtById(id)).filter((f) => f && f.print).some((f) => { const parts = []; let cur = []; m.modules.forEach((x) => { if (x.type === "pagebreak") { parts.push(cur); cur = []; } else cur.push(x); }); parts.push(cur); return parts.some((pg) => pg.length && __T.measureAt(pg, f, m.tight || 0) > f.h + 2); })); if (over) out.push(m.name); } } return { n: ex.length, over: out }; });
  ok("no example material runs past its page: long ones are split into pages that fit", fits.n === 2 && fits.over.length === 0, fits.n + " examples; over: " + fits.over.join(", "));
  /* a sign-off made the old way (of the stored copy) still holds when the material is opened */
  const fern = await p.evaluate(() => (__T.S().projects.filter((x) => /^Example: Fernwood/.test(x.name))[0] || {}).id);
  await p.evaluate((pid) => __T.go("project", pid), fern);
  await p.waitForTimeout(3000);
  const oldSign = await p.evaluate(async () => { const S = __T.S(); const m = S.mats.filter((x) => x.status === "approved")[0]; const db = __T.Store.raw(); const ref = db.doc("signoffs/" + __T.ME().id + "/items/" + m.id); const snap = await ref.get(); const doc = snap.data(); const rawHash = __T.contentHash(m); const was = doc.hash; await ref.set(Object.assign({}, doc, { hash: rawHash })); return { mid: m.id, differs: was !== rawHash }; });
  await p.reload();
  await p.waitForTimeout(2500);
  await p.evaluate((a) => __T.go("editor", a[0], a[1]), [fern, oldSign.mid]);
  await p.waitForTimeout(3200);
  const healed = await p.evaluate(() => ({ note: !!document.querySelector(".so-note"), bad: __T.preflight(__T.mat()).list.filter((x) => /sign-off/.test(x[1])).length }));
  ok("an approval signed the old way is not reported as changed when the material is opened", oldSign.differs && !healed.note && healed.bad === 0, JSON.stringify([oldSign.differs, healed]));
  await p.evaluate(() => { const m = __T.mat(); const h = m.modules.filter((x) => x.type === "hero")[0]; window.__was = h.data.title; });
  /* a built-in picture is something to know before press, not an error; a drawn one is never measured in pixels */
  const pics = await p.evaluate(async () => { const T = __T.waTools(32); const t = (n) => T.find((x) => x.name === n); const pr = await t("createProject").execute({ name: "Scrub pictures" }); const c = await t("createMaterial").execute({ projectId: pr.projectId, from: "layout:Client Case Study" }); await t("openMaterial").execute({ projectId: pr.projectId, materialId: c.materialId }); const run = async (pic) => { await t("setPicture").execute({ picture: pic }); await new Promise((r) => setTimeout(r, 1600)); const r = __T.preflight(__T.mat()); return r.list.filter((x) => /picture|Photo/.test(x[1])).map((x) => x[0] + ":" + x[1].slice(0, 60)); }; const first = await run("builtin:ph-launch"); const hero = __T.mat().modules.filter((x) => x.type === "hero")[0]; hero.data.layout = "full"; hero.data.height = "tall"; __T.redraw(); await new Promise((r) => setTimeout(r, 1500)); const full = __T.preflight(__T.mat()).list.filter((x) => /picture|Photo/.test(x[1])).map((x) => x[0] + ":" + x[1].slice(0, 60)); return { photo: first.concat(full), scene: await run("builtin:ribbons") }; });
  ok("a built-in photo is flagged as something to check before press, never as an error", pics.photo.length > 0 && !pics.photo.some((x) => /^bad:/.test(x)), pics.photo.join(" | "));
  ok("a drawn (vector) picture is not measured in pixels at all", !pics.scene.some((x) => /^(bad|warn):/.test(x)), pics.scene.join(" | "));
  /* wrong guesses do not use up what one request may make */
  const allow = await p.evaluate(async () => { const T = __T.waTools(32); const t = (n) => T.find((x) => x.name === n); const pid = __T.S().pid; let wrong = 0; for (let i = 0; i < 10; i++) { try { await t("createMaterial").execute({ projectId: pid, from: "layout:No such layout " + i }); } catch (e) { if (/No starting layout/.test(e.message)) wrong++; } } let made = 0, last = ""; for (let i = 0; i < 9; i++) { try { await t("createMaterial").execute({ projectId: pid, from: "layout:Blank", name: "Allow " + i }); made++; } catch (e) { last = e.message; } } return { wrong, made, last }; });
  ok("ten wrong names do not use up the allowance; the right ones are still made, up to the limit", allow.wrong === 10 && allow.made >= 7 && /most materials one request/.test(allow.last), JSON.stringify(allow).slice(0, 160));
  /* the Library says how many are on show */
  await p.evaluate(() => { __T.WA.open = false; __T.go("library"); });
  await p.waitForTimeout(2800);
  const line0 = await p.evaluate(() => document.querySelector(".el-n").textContent);
  await p.click('[data-elx="t:eBrochure"]');
  await p.waitForTimeout(1500);
  const line1 = await p.evaluate(() => ({ t: document.querySelector(".el-n").textContent, cards: document.querySelectorAll(".el-card").length, dead: [...document.querySelectorAll("[aria-controls]")].filter((e) => e.offsetParent && e.classList.contains("csel-face") && !document.getElementById(e.getAttribute("aria-controls"))).length }));
  ok("with a filter on, the Library's count says how many are showing", /^\d+ pieces/.test(line0) && new RegExp("^Showing " + line1.cards + " of \\d+ pieces").test(line1.t), line1.t.slice(0, 60));
  ok("a closed drop-down does not point at a list that is not on the page", line1.dead === 0, line1.dead);
  await p.click('[data-elx="t:eBrochure"]');
  await p.waitForTimeout(800);

  /* ---------- the agent can always reword, restyle and picture ---------- */
  const agent = async (maxTools, script) => { await p.evaluate((a) => { window.__out = null; const fake = async function (turns, opts) { window.__names = opts.tools.map((t) => t.name); window.__rules2 = turns[0].content; const out = []; const get = (i, pth) => { let o = out[+i]; pth.split(".").forEach((k) => { o = o == null ? o : o[k]; }); return o; }; for (const st of a.script) { const t = opts.tools.find((x) => x.name === st[0]); if (!t) { out.push("Error: no such tool " + st[0]); continue; } const args = {}; Object.keys(st[1] || {}).forEach((k) => { const v = st[1][k]; args[k] = typeof v === "string" && /^\$\d+\./.test(v) ? get(v.match(/^\$(\d+)/)[1], v.replace(/^\$\d+\./, "")) : v; }); try { out.push(await t.execute(args)); } catch (e) { out.push("Error: " + e.message); } } window.__out = out; opts.onText({ text: "Done.", delta: "Done." }); return { text: "Done.", truncated: false }; }; fake.limits = async () => ({ tools: { maxCount: a.max } }); __T.agSetSample(fake); if (__T.S().view !== "editor") __T.go("agent"); else { const w = document.getElementById("wa"); if (!w || w.hidden) { const t = document.getElementById("wa-tab"); if (t) t.click(); } } }, { max: maxTools, script }); await p.waitForTimeout(900); await p.fill("#wa-in", "go"); await p.press("#wa-in", "Enter"); for (let i = 0; i < 80; i++) { await p.waitForTimeout(250); if (await p.evaluate(() => !!window.__out && !__T.WA.busy)) break; } return p.evaluate(() => ({ out: window.__out, names: window.__names, rules: window.__rules2 })); };
  const str = (x) => (typeof x === "string" ? x : JSON.stringify(x));
  let ag = await agent(14, [["listProjects"]]);
  ok("where a view allows only a few tools, reading, rewording, restyling, making and picturing are the ones kept", ag.names.length === 14 && ["getMaterial", "setField", "setOption", "openMaterial", "createMaterial", "setPicture", "addModule"].every((n) => ag.names.indexOf(n) >= 0), ag.names.join(","));
  ok("the model is told which tools it was not given, and to say where the person does those", /you were not given these tools: [^.]*setSequence/.test(ag.rules) && /Rewording and restyling/.test(ag.rules), (ag.rules.match(/not given these tools:[^.]*/) || [""])[0].slice(0, 120));
  ag = await agent(32, [["listProjects"], ["createProject", { name: "Scrub restyle" }], ["createMaterial", { projectId: "$1.projectId", from: "layout:Client Case Study" }], ["openMaterial", { projectId: "$1.projectId", materialId: "$2.materialId" }]]);
  const story = await p.evaluate(() => { const m = __T.mat().modules.filter((x) => x.type === "storyRows")[0]; return { id: m.id, variant: m.data.variant, n: __T.mat().modules.length }; });
  ag = await agent(32, [["getMaterial"], ["setPicture", { picture: "builtin:ph-case", moduleId: story.id }], ["setOption", { moduleId: story.id, option: "variant", value: "Numbered steps" }], ["setOption", { moduleId: story.id, option: "items.0.icon", value: "timer" }], ["setOption", { moduleId: story.id, option: "variant", value: "sideways" }], ["setOption", { moduleId: story.id, option: "colour", value: "red" }], ["setField", { moduleId: story.id, path: "items.0.heading", value: "Where they started" }]]);
  const after = await p.evaluate((id) => { const ms = __T.mat().modules; const i = ms.findIndex((x) => x.id === id); const band = ms[i - 1] || {}; const st = ms[i]; return { n: ms.length, band: band.type, slot: band.data && band.data.slots && band.data.slots[0] && band.data.slots[0].kind, pic: !!(band.data && band.data.slots && band.data.slots[0].data.photo && band.data.slots[0].data.photo.data), layout: band.data && band.data.layout, variant: st.data.variant, icon: st.data.items[0].icon, head: st.data.items[0].heading, drawn: !!document.querySelector("#stage .mod img") }; }, story.id);
  const gm = ag.out[0].modules.filter((x) => x.id === story.id)[0];
  ok("getMaterial lists what each module can be restyled to, and whether it can hold a picture", !!gm.options && /numbered \(Numbered steps\)/.test(str(gm.options.variant.choices)) && gm.options.variant.is === story.variant && gm.canHoldPicture === false && ag.out[0].modules[0].canHoldPicture === true, str(gm.options.variant).slice(0, 120));
  ok("asked for a picture in a section with no place for one, the agent puts it in a band beside it", /picture band before the/.test(str(ag.out[1])) && after.n === story.n + 1 && after.band === "row" && after.slot === "image" && after.pic && after.layout === "1", str(ag.out[1]).slice(0, 110));
  ok("it restyles a module by a choice's name or id, and changes an item's icon", /^Done: set .* to numbered/.test(str(ag.out[2])) && after.variant === "numbered" && after.icon === "timer", str(ag.out[2]) + " / " + str(ag.out[3]).slice(0, 90));
  ok("a choice or option that does not exist is refused with the ones that do", /isn't one of the choices for Style: rows, numbered/.test(str(ag.out[4])) && /isn't an option of the .*Its options: variant/.test(str(ag.out[5])), str(ag.out[4]).slice(0, 80) + " | " + str(ag.out[5]).slice(0, 80));
  ok("and it rewords it", after.head === "Where they started", after.head);
  await p.click("#wa-undo");
  await p.waitForTimeout(800);
  ok("all of it is one undo", await p.evaluate((a) => { const ms = __T.mat().modules; const st = ms.filter((x) => x.id === a.id)[0]; return ms.length === a.n && st.data.variant === a.variant; }, story));
  await p.evaluate(() => { __T.WA.open = false; });

  /* ---------- one change, one write of the project's summary ---------- */
  const d2 = await ctx.newPage();
  await d2.goto("file://" + __dirname + "/test.html#as=dana");
  await d2.waitForTimeout(2300);
  await d2.evaluate((pid) => __T.go("project", pid), fern);
  await p.evaluate((pid) => { __T.WA.open = false; __T.go("project", pid); }, fern);
  await p.waitForTimeout(7000);
  const watch = (pg) => pg.evaluate(() => { window.__plog = 0; const o = window.__writes; window.__writes = new Proxy(o, { set(t, k, v) { if (/^projects\/[^/]+$/.test(k)) window.__plog++; t[k] = v; return true; } }); });
  await watch(p);
  await watch(d2);
  await p.evaluate(async () => { const m = __T.S().mats.filter((x) => (x.status || "draft") === "draft" && !x.deletedAt)[0]; await __T.setStatus(m, "review"); });
  await p.waitForTimeout(8000);
  const wr = { mine: await p.evaluate(() => window.__plog), theirs: await d2.evaluate(() => window.__plog), by: await p.evaluate((pid) => JSON.stringify(JSON.parse(localStorage.getItem("mockdb"))["projects/" + pid].summary.by), fern), seen: await d2.evaluate(() => JSON.stringify((__T.S().projects.filter((x) => x.id === __T.S().pid)[0].summary || {}).by)) };
  ok("after a change, only the page that made it writes the project's summary; the other page writes nothing", wr.mine >= 1 && wr.mine <= 2 && wr.theirs === 0, JSON.stringify(wr));
  ok("and the count is right, for both of them", JSON.parse(wr.by).review === 2 && JSON.parse(wr.by).draft === 0 && ["draft", "review", "changes", "approved", "delivered"].every((k) => JSON.parse(wr.seen || "{}")[k] === JSON.parse(wr.by)[k]), wr.by + " / " + wr.seen);
  await d2.close();

  /* ---------- the install guide, as a short film ---------- */
  await p.evaluate(() => __T.go("about"));
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById("skl-how").click());
  await p.waitForTimeout(500);
  const film = () => p.evaluate(() => { const f = document.getElementById("skf"); if (!f) return null; return { cap: document.getElementById("skf-cap").textContent, on: [...f.querySelectorAll(".skf-seg")].map((x) => (x.classList.contains("on") ? "o" : x.classList.contains("done") ? "d" : "-")).join(""), now: [...document.querySelectorAll(".skl-steps li")].map((x) => (x.classList.contains("skf-now") ? 1 : 0)).join(""), app: (f.querySelector(".skf-app") || {}).textContent, play: document.getElementById("skf-play").textContent, scene: (f.querySelector(".skf-s") || {}).className, first: document.querySelector(".skl-how").children[1].id }; });
  let f = await film();
  ok("the install guide opens with the film, above the written steps, playing from step 1", !!f && f.first === "skf" && /^1 of 5\. In ELEMENT/.test(f.cap) && f.on === "o----" && f.now === "10000" && f.play === "Pause" && f.app === "ELEMENT", JSON.stringify(f));
  await p.waitForTimeout(4600);
  f = await film();
  ok("it moves on by itself, and the matching written step is marked", /^2 of 5\. In Claude, open Customize/.test(f.cap) && f.on === "do---" && f.now === "01000" && f.app === "Claude", f.cap + " " + f.on);
  await p.click("#skf-play");
  const held = (await film()).cap;
  await p.waitForTimeout(4800);
  f = await film();
  ok("Pause holds it where it is", f.cap === held && f.play === "Play", f.cap);
  await p.click("#skf-next");
  await p.click("#skf-next");
  f = await film();
  ok("Next and Back step through by hand", /^4 of 5/.test(f.cap) && f.on === "dddo-" && / skf-s3$/.test(f.scene), f.cap);
  await p.click(".skl-steps li >> nth=4");
  f = await film();
  ok("pressing a written step shows that step", /^5 of 5/.test(f.cap) && f.now === "00001", f.cap);
  await p.click(".skf-seg >> nth=0");
  await p.click("#skf-play");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(600);
  const gone = await p.evaluate(() => !document.getElementById("skf"));
  await p.waitForTimeout(4600);
  ok("closing the guide stops it", gone && errs.length === 0);
  const q = await ctx.newPage();
  await q.emulateMedia({ reducedMotion: "reduce" });
  await q.goto("file://" + __dirname + "/test.html#as=sam");
  await q.waitForTimeout(2300);
  await q.evaluate(() => __T.go("about"));
  await q.waitForTimeout(1200);
  await q.evaluate(() => document.getElementById("skl-how").click());
  await q.waitForTimeout(600);
  const c0 = await q.evaluate(() => ({ cap: document.getElementById("skf-cap").textContent, play: document.getElementById("skf-play").textContent, still: document.getElementById("skf").classList.contains("skf-still") }));
  await q.waitForTimeout(4800);
  const c1 = await q.evaluate(() => document.getElementById("skf-cap").textContent);
  await q.click("#skf-next");
  const c2 = await q.evaluate(() => document.getElementById("skf-cap").textContent);
  ok("for people who ask for less motion it does not play: one step at a time, by the buttons", c0.still && c0.play === "Play" && c1 === c0.cap && /^2 of 5/.test(c2), c0.cap.slice(0, 12) + " / " + c2.slice(0, 12));
  const ph = await b.newContext({ viewport: { width: 390, height: 800 } });
  const m = await ph.newPage();
  await m.goto("file://" + __dirname + "/test.html#as=chris");
  await m.waitForTimeout(2300);
  await m.evaluate(() => __T.go("about"));
  await m.waitForTimeout(1200);
  await m.evaluate(() => document.getElementById("skl-how").click());
  await m.waitForTimeout(600);
  const fit = await m.evaluate(() => { const f = document.getElementById("skf").getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, w: Math.round(f.width), in: f.left >= 0 && f.right <= 390 }; });
  ok("on a phone the film fits the dialog", fit.sw <= 390 && fit.in, JSON.stringify(fit));
  ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
