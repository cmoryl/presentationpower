/* v202: icons in the colour of their place, and step markers left as their design draws them.
   - on a Spectrum page an icon tile carries the colour of its position (1st aqua, 2nd blue, 3rd violet), never one
     blue tile everywhere, with the frame set or unset;
   - a step marker on a line (.dk-dot, .tl-dot, .stl-dot) is drawn by its own design: no frame squares it, so no
     square sits inside a round node, on screen or on a printed page;
   - the frame picked on the Content tab reaches every module, and a module's own Icons setting still wins;
   - a material signed before the Spectrum look keeps the frames it had, markers included. */
const { chromium } = require("playwright");
const R = [];
function ok(n, c, d) { R.push((c ? "PASS " : "FAIL ") + n + (d !== undefined ? " — " + d : "")); }
process.on("unhandledRejection", (e) => { R.forEach((x) => console.log(x)); console.log("CRASH", String((e && e.stack) || e).slice(0, 400)); process.exit(1); });
const NODES = ["dk-dot", "tl-dot", "stl-dot"];
const AQUA = "15, 181, 178", BLUE = "59, 123, 240", VIOLET = "143, 107, 240";

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 950 } });
  await ctx.route(/cdn\.jsdelivr\.net/, (r) => r.abort());
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
  await p.goto("file://" + __dirname + "/test.html");
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.fonts.ready);

  /* what every icon enclosure of every design looks like: as drawn, and with the frame classes taken off */
  const scan = await p.evaluate((NODES) => {
    const SEL = ".disc,.tile,.dk-ico,.dk-dot,.tl-dot,.stl-dot";
    const which = (e) => ["disc", "tile", "dk-ico", "dk-dot", "tl-dot", "stl-dot"].filter((c) => e.classList.contains(c)).join("+");
    const desc = (e) => {
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), svg = e.querySelector("svg");
      const par = e.parentElement, pcs = getComputedStyle(par);
      return {
        c: which(e), node: NODES.some((n) => e.classList.contains(n)), pos: (String(e.className).match(/\bspx([123])\b/) || [0, ""])[1],
        w: Math.round(r.width), h: Math.round(r.height), disp: cs.display, rad: cs.borderTopLeftRadius,
        bg: cs.backgroundImage !== "none" ? cs.backgroundImage.replace(/\s+/g, " ") : cs.backgroundColor,
        bd: cs.borderTopWidth !== "0px" ? cs.borderTopWidth + " " + cs.borderTopColor : "", sh: cs.boxShadow === "none" ? "" : cs.boxShadow,
        st: svg ? getComputedStyle(svg).stroke : "",
        round: cs.borderTopLeftRadius === "50%" || parseFloat(cs.borderTopLeftRadius) >= Math.min(r.width, r.height) / 2 - 0.6,
        inRing: par ? pcs.borderTopLeftRadius === "50%" && par.getBoundingClientRect().width > 0 : false,
        parent: String(par.className).replace(/\bspx\d\b/g, "").trim().split(/\s+/).slice(0, 2).join("."),
      };
    };
    const out = [];
    Object.keys(__T.MODULES).forEach((k) => {
      const M = __T.MODULES[k];
      let base;
      try { base = M.def(); } catch (e) { return; }
      const list = [["default", JSON.parse(JSON.stringify(base))]];
      (__T.libVariants(k) || []).forEach((v, i) => list.push(["lib" + i + " " + v[0], Object.assign(JSON.parse(JSON.stringify(base)), JSON.parse(JSON.stringify(v[1] || {})))]));
      (M.fields || []).filter((f) => f.t === "select" && f.k !== "iconStyle").forEach((f) => (f.o || []).forEach((o) => {
        const d = JSON.parse(JSON.stringify(base)); d[f.k] = o[0]; list.push([f.k + "=" + o[0], d]);
      }));
      list.forEach(([name, d]) => {
        const mods = [{ id: "a1aaaaaaaaaa", type: k, data: d }];
        const row = { k: k, name: name };
        let any = false;
        [["dig", false], ["pv", true]].forEach(([tag, pr]) => {
          let html;
          try { html = __T.withStyle({ look: "spectrum" }, () => __T.pageHTML(JSON.parse(JSON.stringify(mods)), { w: 816, h: pr ? 1056 : 0, print: pr }, false, null)); } catch (e) { return; }
          const host = document.createElement("div");
          host.style.cssText = "position:absolute;left:0;top:0;width:816px";
          document.body.appendChild(host);
          host.innerHTML = html;
          const A = [].map.call(host.querySelectorAll(SEL), desc);
          const mod = host.querySelector(".mod") || host.firstElementChild;
          const hA = Math.round(mod.getBoundingClientRect().height * 10) / 10;
          [].forEach.call(host.querySelectorAll(".if-gradient"), (e) => e.classList.remove("if-gradient"));
          [].forEach.call(host.querySelectorAll(".ic-gradient"), (e) => e.classList.remove("ic-gradient"));
          const B = [].map.call(host.querySelectorAll(SEL), desc);
          const hB = Math.round(mod.getBoundingClientRect().height * 10) / 10;
          host.remove();
          if (A.length) any = true;
          row[tag] = { A: A, B: B, hA: hA, hB: hB };
        });
        if (any) out.push(row);
      });
    });
    return out;
  }, NODES);

  const KEYS = ["c", "w", "h", "disp", "rad", "bg", "bd", "sh", "st"];
  const same = (a, b) => KEYS.every((k) => a[k] === b[k]);
  let nodes = 0, tiles = 0;
  const moved = [], boxed = [], flat = [];
  scan.forEach((r) => ["dig", "pv"].forEach((t) => {
    const x = r[t];
    if (!x || x.A.length !== x.B.length) return;
    x.A.forEach((e, j) => {
      const ref = x.B[j];
      if (e.node) {
        nodes++;
        if (!same(e, ref)) moved.push(r.k + " [" + r.name + "] " + t + " " + e.c + " in " + e.parent);
        if (e.inRing && !e.round) boxed.push(r.k + " [" + r.name + "] " + t + " " + e.c + " r" + e.rad + " in " + e.parent);
      } else if (t === "dig") {
        tiles++;
        if (e.pos && /linear-gradient/.test(e.bg)) {
          const want = e.pos === "1" ? AQUA : e.pos === "2" ? BLUE : VIOLET;
          if (e.bg.indexOf(want) < 0) flat.push(r.k + " [" + r.name + "] " + e.c + " spx" + e.pos + " " + e.bg.slice(0, 60));
        }
      }
    });
  }));

  ok("every design was looked at, on screen and on a printed page", scan.length >= 110 && nodes >= 250 && tiles >= 300, scan.length + " designs, " + nodes + " step markers, " + tiles + " tiles");
  ok("no icon frame changes a step marker on a Spectrum page: each is drawn as its design draws it", moved.length === 0, moved.slice(0, 4).join(" | "));
  ok("no square sits inside a round step marker", boxed.length === 0, boxed.slice(0, 4).join(" | "));
  ok("a tile takes the colour of its place (1st aqua, 2nd blue, 3rd violet), never one colour throughout", flat.length === 0, flat.slice(0, 4).join(" | "));

  /* the three positions really do differ on a page that repeats cells */
  const trio = await p.evaluate(() => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:0;top:0;width:816px";
    document.body.appendChild(host);
    const out = {};
    ["dig", "pv"].forEach((tag) => {
      host.innerHTML = __T.withStyle({ look: "spectrum" }, () => __T.pageHTML([{ id: "a1aaaaaaaaaa", type: "features", data: __T.MODULES.features.def() }], { w: 816, h: tag === "pv" ? 1056 : 0, print: tag === "pv" }, false, null));
      out[tag] = [].slice.call(host.querySelectorAll(".disc,.tile,.dk-ico")).slice(0, 3).map((e) => getComputedStyle(e).backgroundImage.replace(/\s+/g, " "));
    });
    host.remove();
    return out;
  });
  ["dig", "pv"].forEach((t) => {
    const c = trio[t] || [];
    ok("three icons in a row are aqua, blue and violet (" + (t === "pv" ? "printed page" : "on screen") + ")",
      c.length === 3 && c[0].indexOf(AQUA) >= 0 && c[1].indexOf(BLUE) >= 0 && c[2].indexOf(VIOLET) >= 0 && c[0] !== c[1] && c[1] !== c[2], c.map((x) => x.slice(0, 44)).join(" | "));
  });

  /* every frame a person can pick, on the material */
  const frames = await p.evaluate((NODES) => {
    const out = {};
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:0;top:0;width:816px";
    document.body.appendChild(host);
    const mods = () => [
      { id: "a1aaaaaaaaaa", type: "kpis", data: __T.MODULES.kpis.def() },
      { id: "a2aaaaaaaaaa", type: "features", data: __T.MODULES.features.def() },
      { id: "a3aaaaaaaaaa", type: "timeline", data: __T.MODULES.timeline.def() },
      { id: "a4aaaaaaaaaa", type: "pipeline", data: Object.assign(__T.MODULES.pipeline.def(), { layout: "ribbon" }) },
    ];
    [""].concat(__T.ICON_FRAMES.map(function (f) { return f[0]; })).forEach((fr) => {
      const st = { look: "spectrum" };
      if (fr) st.iconFrame = fr;
      ["dig", "pv"].forEach((tag) => {
        host.innerHTML = __T.withStyle(st, () => __T.pageHTML(mods(), { w: 816, h: tag === "pv" ? 1056 : 0, print: tag === "pv" }, false, null));
        const root = host.firstElementChild;
        const nodeShapes = [].map.call(host.querySelectorAll(".dk-dot,.tl-dot,.stl-dot"), (e) => {
          const cs = getComputedStyle(e), r = e.getBoundingClientRect(), par = e.parentElement;
          return { rad: cs.borderTopLeftRadius, inRing: getComputedStyle(par).borderTopLeftRadius === "50%", round: cs.borderTopLeftRadius === "50%" || parseFloat(cs.borderTopLeftRadius) >= Math.min(r.width, r.height) / 2 - 0.6 };
        });
        const tile = host.querySelector(".mod .disc,.mod .tile");
        out[fr + "|" + tag] = {
          root: (String(root.className).match(/\bif-\w+/g) || []).join("+"),
          mods: [].map.call(host.querySelectorAll(".mod"), (m) => (String(m.className).match(/\bic-\w+/g) || ["-"]).join("+")),
          tile: tile ? getComputedStyle(tile).backgroundImage.replace(/\s+/g, " ").slice(0, 60) + " r" + getComputedStyle(tile).borderTopLeftRadius : "",
          nodes: nodeShapes,
        };
      });
    });
    host.remove();
    return out;
  }, NODES);

  const framesList = await p.evaluate(() => __T.ICON_FRAMES.map(function (f) { return f[0]; }));
  const badNodes = [], badCarry = [];
  [""].concat(framesList).forEach((fr) => ["dig", "pv"].forEach((t) => {
    const x = frames[fr + "|" + t];
    if (!x) return;
    x.nodes.forEach((n) => { if (!n.round) badNodes.push((fr || "default") + " " + t + " r" + n.rad); if (n.inRing && !n.round) badNodes.push((fr || "default") + " " + t + " boxed in a ring"); });
    const want = "ic-" + (fr || "gradient");
    if (x.mods.filter((m) => m === want).length < 3) badCarry.push((fr || "default") + " " + t + " " + x.mods.join(" "));
  }));
  ok("whichever frame is picked, every step marker keeps its round shape", badNodes.length === 0, badNodes.slice(0, 5).join(" | "));
  ok("the frame picked on the Content tab reaches every module", badCarry.length === 0, badCarry.slice(0, 3).join(" | "));
  ok("the Spectrum tile is the frame when none is picked", frames["|dig"] && frames["|dig"].root === "if-gradient" && /linear-gradient/.test(frames["|dig"].tile), frames["|dig"] && frames["|dig"].tile);
  ok("a picked frame is drawn: the ring is an open circle, the sharp square has no rounding",
    /r50%/.test(frames["ring|dig"].tile) && /r0px/.test(frames["square|dig"].tile), frames["ring|dig"].tile + " // " + frames["square|dig"].tile);

  /* a module's own Icons setting still wins over the material's frame */
  const own = await p.evaluate(() => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:0;top:0;width:816px";
    document.body.appendChild(host);
    host.innerHTML = __T.withStyle({ look: "spectrum", iconFrame: "ring" }, () => __T.pageHTML([
      { id: "a1aaaaaaaaaa", type: "features", data: Object.assign(__T.MODULES.features.def(), { iconStyle: "disc" }) },
      { id: "a2aaaaaaaaaa", type: "features", data: Object.assign(__T.MODULES.features.def(), { iconStyle: "none" }) },
      { id: "a3aaaaaaaaaa", type: "features", data: __T.MODULES.features.def() },
    ], { w: 816, h: 0, print: false }, false, null));
    const r = [].map.call(host.querySelectorAll(".mod"), (m) => (String(m.className).match(/\bic-\w+/g) || ["-"]).join("+"));
    const hidden = getComputedStyle(host.querySelectorAll(".mod")[1].querySelector(".disc") || document.body).display;
    host.remove();
    return { r: r, hidden: hidden };
  });
  ok("a module's own Icons setting wins over the material's frame, No icons included", own.r[0] === "ic-disc" && own.r[1] === "ic-none" && own.r[2] === "ic-ring" && own.hidden === "none", own.r.join(" ") + " / " + own.hidden);

  /* a material signed before the Spectrum look is untouched */
  const legacy = await p.evaluate(() => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:0;top:0;width:816px";
    document.body.appendChild(host);
    const out = {};
    [["plain", { look: "", status: "approved" }], ["square", { look: "", status: "delivered", iconFrame: "square" }], ["ring", { look: "", status: "approved", iconFrame: "ring" }]].forEach(([tag, st]) => {
      host.innerHTML = __T.withStyle(st, () => __T.pageHTML([{ id: "a1aaaaaaaaaa", type: "timeline", data: __T.MODULES.timeline.def() }], { w: 816, h: 0, print: false }, false, null));
      const root = host.firstElementChild, e = host.querySelector(".tl-dot"), cs = getComputedStyle(e);
      out[tag] = { spx: /\bspx\b/.test(root.className), frame: (String(root.className).match(/\bif-\w+/g) || []).join("+"), rad: cs.borderTopLeftRadius, bg: cs.backgroundImage !== "none" ? "gradient" : cs.backgroundColor };
    });
    host.remove();
    return out;
  });
  ok("a material signed before the Spectrum look is not on the Spectrum look", !legacy.plain.spx && !legacy.square.spx, JSON.stringify(legacy.plain));
  ok("on such a material a frame still draws its step markers, as it always did (sharp square squares them)", legacy.square.frame === "if-square" && legacy.square.rad === "0px", JSON.stringify(legacy.square));
  ok("and the ring frame leaves them open", legacy.ring.frame === "if-ring" && legacy.ring.rad === "50%" && /rgba\(0, 0, 0, 0\)/.test(legacy.ring.bg), JSON.stringify(legacy.ring));

  /* the picker says what the Spectrum tile is now */
  const words = await p.evaluate(() => {
    const f = __T.ICON_FRAMES.filter((x) => x[0] === "gradient")[0];
    return { label: f[1], hint: f[2] };
  });
  ok("the Spectrum tile is described by the colour of its place, not by one brand gradient", words.label === "Spectrum tile" && /colour of its place/i.test(words.hint) && !/^The brand gradient/i.test(words.hint), words.hint);

  /* the Library is unmoved: every piece still fits its sheet */
  const fit = await p.evaluate(() => {
    const f = __T.fmtById("letter");
    const ids = __T.ELIB.filter((x, i) => i % 5 === 0).map((x) => x.id);
    let over = 0, bad = 0, n = 0;
    ids.forEach((id) => {
      const pc = __T.ELIB.filter((x) => x.id === id)[0];
      const lay = __T.pieceLayout(pc);
      const hs = __T.withBrand(__T.brandById(pc.brand), () => __T.withStyle({ look: "spectrum" }, () => __T.pageParts(JSON.parse(JSON.stringify(lay.modules))).filter((x) => x.length).map((pt) => __T.measureAt(pt, f, lay.tight || 0))));
      n++;
      if (Math.max.apply(null, hs) > f.h + 1) over++;
      const pf = __T.withBrand(__T.brandById(pc.brand), () => __T.preflight({ id: "x", name: pc.title || id, modules: lay.modules, formats: ["letter"], look: "spectrum", tight: lay.tight || 0, lang: "en", rebuiltFrom: { id: id } }, true));
      if (pf.bad) bad++;
    });
    return { n: n, over: over, bad: bad };
  });
  ok("every Library piece looked at still fits its sheet, with nothing for preflight to report", fit.n >= 55 && fit.over === 0 && fit.bad === 0, JSON.stringify(fit));

  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
  R.forEach((x) => console.log(x));
  console.log(R.filter((x) => x.startsWith("FAIL")).length ? "SOME FAILED" : "ALL PASS " + R.length);
  await b.close();
})();
