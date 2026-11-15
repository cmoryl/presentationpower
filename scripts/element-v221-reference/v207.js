/* v207: a dense piece gives up hero height before it gives up type size.
   - a page that has to be set small cuts its hero to a band, 40px at a time, down to 220px — a fifth of the sheet,
     so the page still opens on its picture with the headline and the lead on it;
   - the band is only taken where it is needed: a piece that fits keeps its full hero;
   - no word is lost to it, nothing runs past the sheet, and preflight has nothing to report;
   - and a chart's column labels, now set larger, break over two lines inside their own column instead of
     running into the next one. */
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

  /* ---------- the hero band across the whole library ---------- */
  const lay = [];
  for (let i = 0; i < ids.length; i += 10) {
    const r = await p.evaluate((chunk) => {
      return chunk.map((id) => {
        const pc = __T.pieceById(id);
        let l;
        try { l = __T.pieceLayout(pc); } catch (e) { return { id, err: String(e).slice(0, 80) }; }
        const h = l.modules.filter((m) => m.type === "hero")[0];
        return {
          id,
          tight: l.tight || 0,
          pages: l.modules.filter((m) => m.type === "pagebreak").length + 1,
          band: h && h.data.height === "custom" ? +h.data.heightPx || 0 : 0,
          head: h ? String(h.data.title || "").trim().length : -1,
          fits: l.fits !== false,
        };
      });
    }, ids.slice(i, i + 10));
    lay.push(...r);
  }
  const broke = lay.filter((x) => x.err);
  ok("every piece lays out", broke.length === 0, broke.length ? broke[0].id + " " + broke[0].err : lay.length + " pieces");

  const banded = lay.filter((x) => x.band > 0);
  ok("a hero band is never shorter than 220px", banded.every((x) => x.band >= 220), "shortest " + Math.min.apply(null, banded.map((x) => x.band).concat([999])));
  ok("a banded hero still carries its headline", banded.every((x) => x.head > 0), banded.filter((x) => x.head <= 0).map((x) => x.id).slice(0, 3).join(", ") || banded.length + " banded");
  ok("the band is taken only where the page is tight", banded.every((x) => x.tight > 0), banded.filter((x) => !x.tight).map((x) => x.id).slice(0, 3).join(", "));
  const loose = lay.filter((x) => x.tight === 0 && x.pages === 1);
  ok("a piece that fits keeps its full hero", loose.every((x) => !x.band), loose.filter((x) => x.band).map((x) => x.id).slice(0, 3).join(", ") || loose.length + " roomy pieces");
  ok("no piece is set below the readability floor", lay.every((x) => x.tight <= 34), "largest tighten " + Math.max.apply(null, lay.map((x) => x.tight)) + "%");
  const dense = lay.filter((x) => x.tight >= 15 && x.pages === 1);
  ok("few pieces are still set 15% smaller or more", dense.length <= 8, dense.length + " of " + lay.length);

  /* ---------- every page still fits its sheet ---------- */
  const over = [];
  const pfBad = [];
  for (let i = 0; i < ids.length; i += 20) {
    const r = await p.evaluate((chunk) => {
      return chunk.map((id) => {
        const pc = __T.pieceById(id);
        try {
          const l = __T.pieceLayout(pc);
          const f = __T.fmtById("letter");
          const br = __T.brandById(pc.brand);
          const hh = __T.withBrand(br, () =>
            __T.withStyle({ look: "spectrum" }, () =>
              Math.max.apply(null, __T.pageParts(JSON.parse(JSON.stringify(l.modules))).map((pt) => __T.measureAt(pt, f, l.tight || 0)))
            )
          );
          const pf = __T.withBrand(br, () =>
            __T.preflight({ id: "x", name: pc.title || id, modules: l.modules, formats: ["letter"], look: "spectrum", tight: l.tight || 0, lang: "en", rebuiltFrom: { id } }, true)
          );
          return { id, over: Math.round(hh - f.h), pf: pf.bad || 0 };
        } catch (e) { return { id, over: 0, pf: 0, err: String(e).slice(0, 60) }; }
      });
    }, ids.slice(i, i + 20));
    r.forEach((x) => { if (x.over > 0 || x.err) over.push(x.id + " " + (x.err || "+" + x.over)); if (x.pf) pfBad.push(x.id); });
  }
  ok("no page runs past its sheet", over.length === 0, over.slice(0, 3).join("; ") || ids.length + " pieces");
  ok("preflight has nothing to report", pfBad.length === 0, pfBad.slice(0, 3).join("; "));

  /* ---------- chart labels stay inside their own column ---------- */
  const ch = await p.evaluate(() => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
    document.body.appendChild(host);
    const mod = {
      type: "dataChart",
      data: {
        kind: "bar",
        wide: true,
        title: "Results at a glance",
        unit: "%",
        items: [
          { label: "Average 3-year ROI", value: "537" },
          { label: "Reduction in time-to-market", value: "74" },
          { label: "Localization cost reduction", value: "47" },
          { label: "Consumers preferring native language", value: "73" },
        ],
      },
    };
    host.innerHTML = __T.withBrand(__T.brandById("globallink"), () =>
      __T.withStyle({ look: "spectrum", tight: 0 }, () => __T.pageHTML([mod], { w: 816, h: 1056, print: true }, false, null))
    );
    const labs = [].slice.call(host.querySelectorAll(".ch-lab"));
    const box = labs.map((l) => {
      const r = l.getBoundingClientRect();
      const sp = [].slice.call(l.querySelectorAll("tspan"));
      return {
        t: (sp.length ? sp.map((s) => s.textContent.trim()).join(" ") : l.textContent).trim(),
        x: Math.round(r.left),
        r: Math.round(r.right),
        lines: Math.max(1, sp.length),
      };
    });
    host.remove();
    return box;
  });
  ok("every chart label is drawn", ch.length === 4, JSON.stringify(ch.map((x) => x.t.slice(0, 18))));
  let hit = "";
  for (let i = 1; i < ch.length; i++) if (ch[i - 1].r > ch[i].x) hit = ch[i - 1].t + " over " + ch[i].t;
  ok("no chart label runs into the next one", !hit, hit || ch.length + " labels clear");
  ok("a label too wide for its column breaks over two lines", ch.filter((x) => x.lines > 1).length >= 1, JSON.stringify(ch.map((x) => x.lines)));
  ok("no word of a label is lost", ch[3] && /Consumers preferring native language/.test(ch[3].t.replace(/\s+/g, " ")), ch[3] && ch[3].t);

  /* ---------- package tiers: the flag inside the card, the button readable ---------- */
  const ti = await p.evaluate(() => {
    const out = {};
    [["screen", false], ["print", true]].forEach(function (pr) {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
      document.body.appendChild(host);
      host.innerHTML = __T.withBrand(__T.brandById("globallink"), () =>
        __T.withStyle({ look: "spectrum", tight: 0 }, () =>
          __T.pageHTML([{ id: "m0", type: "tiers", data: __T.MODULES.tiers.def() }], { w: 816, h: 1056, print: pr[1] }, false, null)
        )
      );
      const card = host.querySelector(".tier.featured"), tag = host.querySelector(".tier-tag"), cta = host.querySelector(".tier.featured .tier-cta");
      const name = host.querySelectorAll(".tier .tier-n");
      const cs = getComputedStyle(cta);
      out[pr[0]] = {
        tagIn: tag && card ? Math.round(tag.getBoundingClientRect().top - card.getBoundingClientRect().top) : null,
        names: [].slice.call(name).map((n) => Math.round(n.getBoundingClientRect().top)),
        color: cs.color,
        fill: cs.webkitTextFillColor,
        bg: cs.backgroundImage.replace(/\s+/g, " ").slice(0, 90),
      };
      host.remove();
    });
    return out;
  });
  const lum = (c) => {
    const m = String(c).match(/\d+(\.\d+)?/g) || [0, 0, 0];
    const v = m.slice(0, 3).map((x) => { x = +x / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  ["screen", "print"].forEach((k) => {
    const t = ti[k];
    ok("the flag sits inside the featured column (" + k + ")", t.tagIn !== null && t.tagIn >= 0, "tag " + t.tagIn + "px from the card's top");
    ok("the three tier names line up (" + k + ")", Math.max.apply(null, t.names) - Math.min.apply(null, t.names) <= 1, JSON.stringify(t.names));
    const fill = t.fill && t.fill !== "rgba(0, 0, 0, 0)" ? t.fill : t.color;
    const bg = (t.bg.match(/rgb\([^)]+\)/) || ["rgb(31, 111, 209)"])[0];
    ok("the tier button's words read on its fill (" + k + ")", ratio(fill, bg) >= 4.5, fill + " on " + bg + " = " + ratio(fill, bg).toFixed(2) + ":1");
  });

  /* ---------- project statistics: cards, not a rule across the top ---------- */
  const xs = await p.evaluate(() => {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:-30000px;top:0;width:816px";
    document.body.appendChild(host);
    host.innerHTML = __T.withBrand(__T.brandById("globallink"), () =>
      __T.withStyle({ look: "spectrum", tight: 0 }, () =>
        __T.pageHTML([{ id: "m0", type: "expert", data: __T.MODULES.expert.def() }], { w: 816, h: 1056, print: true }, false, null)
      )
    );
    const cards = [].slice.call(host.querySelectorAll(".card.xstat,.ly-ex .ex-s.card"));
    const out = cards.map((c) => {
      const cs = getComputedStyle(c);
      return { bt: parseFloat(cs.borderTopWidth), r: parseFloat(cs.borderTopLeftRadius), bw: parseFloat(cs.borderLeftWidth) };
    });
    host.remove();
    return out;
  });
  ok("the statistics are drawn as cards", xs.length >= 3, xs.length + " cards");
  ok("no rule is drawn across the top of a statistic", xs.every((c) => c.bt <= 1.1), JSON.stringify(xs.map((c) => c.bt)));
  ok("each statistic card keeps its border and corners", xs.every((c) => c.bw > 0 && c.r >= 8), JSON.stringify(xs.map((c) => [c.bw, c.r])));

  /* ---------- socials: no ruled background, a stacked figure, a link with no underline ---------- */
  const so = await p.evaluate(() => {
    const out = {};
    ["square", "linkedin", "story"].forEach((fid) => {
      const f = __T.FORMATS.find((x) => x.id === fid);
      const t = __T.tpls().find((x) => x.key === "product");
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-30000px;top:0";
      host.style.width = f.w + "px";
      document.body.appendChild(host);
      host.innerHTML = __T.withBrand(__T.brandById("globallink"), () =>
        __T.withStyle({ look: "spectrum", tight: 0 }, () => __T.fmtHTML(JSON.parse(JSON.stringify(__T.spxlMods(t))), f))
      );
      const root = host.firstElementChild;
      try { __T.fitFrame(root); } catch (e) {}
      const rb = root.getBoundingClientRect();
      const box = (s) => { const e = host.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left - rb.left), r: Math.round(r.right - rb.left), b: Math.round(r.bottom - rb.top), t: Math.round(r.top - rb.top), w: Math.round(r.width) }; };
      const pill = host.querySelector(".pill");
      out[fid] = {
        bg: getComputedStyle(root).backgroundImage.indexOf("repeating-linear") >= 0,
        head: box(".fm-fh"),
        big: box(".big"),
        cap: box(".sig-cap"),
        und: pill ? getComputedStyle(pill).backgroundImage !== "none" || getComputedStyle(pill).textDecorationLine !== "none" : null,
        arrow: pill ? getComputedStyle(pill, "::after").maskImage || getComputedStyle(pill, "::after").webkitMaskImage : null,
        over: Math.round(root.scrollHeight - f.h),
      };
      host.remove();
    });
    return out;
  });
  ["square", "linkedin", "story"].forEach((k) => {
    const s = so[k];
    ok("no ruled lines behind the " + k + " frame", !s.bg, s.bg ? "a repeating gradient is still drawn" : "clear");
    ok("the figure starts where the headline starts (" + k + ")", s.big && s.head && Math.abs(s.big.x - s.head.x) <= 1, s.big && s.head ? s.big.x + " vs " + s.head.x : "no figure");
    ok("the figure stays inside its column (" + k + ")", s.big && s.head && s.big.r <= s.head.r + 1, s.big && s.head ? s.big.r + " vs " + s.head.r : "-");
    ok("the caption sits under the figure (" + k + ")", s.cap && s.big && s.cap.t >= s.big.b - 2 && Math.abs(s.cap.x - s.big.x) <= 2, s.cap && s.big ? "cap " + s.cap.t + "/" + s.cap.x + " figure " + s.big.b + "/" + s.big.x : "-");
    ok("the call to action is not underlined (" + k + ")", s.und === false, String(s.und));
    ok("the call to action carries the chevron (" + k + ")", /svg/.test(String(s.arrow)), String(s.arrow).slice(0, 40));
    ok("the " + k + " frame holds its sheet", s.over <= 1, s.over + "px past");
  });

  ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  R.forEach((x) => console.log(x));
  console.log(R.some((x) => x.startsWith("FAIL")) ? "SUITE FAIL" : "SUITE PASS");
  await b.close();
})();
