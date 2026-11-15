import { createElement as dvCreateElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server.browser';
import { engineSupport } from './engine-support';
const { esc, attrText, cleanText, clone, uid, imgSrc, hasImg, cleanPhoto, photoImg, overlayCss, ic, LOGO, CUR_BRAND, DECK_MAP, QR, PROOF, spxOn } = engineSupport;
const __RE = {createElement:dvCreateElement};
const __RDS = {renderToStaticMarkup};
// Ported render-only definitions: 20-engine-modules.js
var DARK_G = ["dark", "navy", "indigo", "cobalt", "signature"];
var MODULES = {
  hero: {
    name: "Hero",
    group: "Open",
    vk: "layout",
    vk2: "scheme",
    desc: "Title block with photo placement, overlays, alignment and color schemes.",
    fields: [
      { t: "head", l: "Words" },
      /* the hero carries its headline only: no rule and kind label ("Solution brief", "Case study") above it, on
         the page or on any other size, so there is no label field. A label saved with an earlier material stays
         in its data, unread (61-content-review.js leaves it out of the material's text). */
      { k: "title", l: "Title", t: "textarea" },
      { k: "highlight", l: "Words to color (copy them from the title)" },
      { k: "lead", l: "Intro sentence", t: "textarea" },
      { k: "short", l: "Short title for social and ads" },
      { t: "head", l: "Photo" },
      {
        k: "layout",
        l: "Placement",
        t: "select",
        o: [
          ["text", "No photo"],
          ["right", "Photo right"],
          ["left", "Photo left"],
          ["fade", "Photo fading in"],
          ["full", "Full-bleed photo"],
        ],
      },
      {
        k: "photo",
        l: "Photo",
        t: "image",
        when: function (d) {
          return d.layout !== "text";
        },
      },
      {
        k: "photoWidth",
        l: "Photo width",
        t: "range",
        min: 30,
        max: 70,
        step: 2,
        unit: "%",
        when: function (d) {
          return d.layout === "right" || d.layout === "left" || d.layout === "fade";
        },
      },
      {
        k: "overlay",
        l: "Overlay color",
        t: "select",
        o: [
          ["navy", "Navy"],
          ["indigo", "Indigo"],
          ["cobalt", "Cobalt"],
          ["signature", "Violet to aqua"],
          ["white", "White"],
          ["black", "Black"],
          ["none", "No overlay"],
        ],
        when: function (d) {
          return d.layout === "full";
        },
      },
      {
        k: "overlayStrength",
        l: "Overlay strength",
        t: "range",
        min: 0,
        max: 95,
        step: 5,
        unit: "%",
        when: function (d) {
          return d.layout === "full" && d.overlay !== "none";
        },
      },
      {
        k: "overlayDir",
        l: "Overlay shape",
        t: "select",
        o: [
          ["left", "Strongest behind the text"],
          ["even", "Even"],
          ["bottom", "Strongest at the bottom"],
        ],
        when: function (d) {
          return d.layout === "full" && d.overlay !== "none";
        },
      },
      {
        k: "words",
        l: "Words",
        t: "select",
        opt: true, // unset means "where the look puts them": never written into a material that has not chosen it
        o: [
          ["auto", "Where the look puts them"],
          ["over", "On the picture"],
        ],
        when: function (d) {
          return d.layout === "full";
        },
      },
      {
        k: "panel",
        l: "Panel behind the words",
        t: "select",
        o: [
          ["none", "None"],
          ["light", "Frosted, light"],
          ["dark", "Frosted, dark"],
          ["card", "White card"],
        ],
        when: function (d) {
          return d.layout !== "text";
        },
      },
      {
        k: "logo",
        l: "Client logo",
        t: "image",
        lib: true,
      },
      {
        k: "logoTone",
        l: "Logo colour",
        t: "select",
        o: [
          ["color", "Original colours"],
          ["grey", "Grey"],
          ["white", "White"],
        ],
        when: function (d) {
          return hasImg(d.logo);
        },
      },
      {
        k: "logoW",
        l: "Logo width",
        t: "range",
        min: 70,
        max: 340,
        step: 10,
        unit: "px",
        when: function (d) {
          return hasImg(d.logo);
        },
      },
      {
        k: "chip",
        l: "Floating figure on the photo",
        when: function (d) {
          return d.layout !== "text";
        },
      },
      {
        k: "chipSub",
        l: "Floating figure caption",
        when: function (d) {
          return d.layout !== "text" && !!d.chip;
        },
      },
      { t: "head", l: "Position" },
      {
        k: "align",
        l: "Text alignment",
        t: "select",
        o: [
          ["left", "Left"],
          ["center", "Centered"],
        ],
      },
      {
        k: "valign",
        l: "Vertical position",
        t: "select",
        o: [
          ["top", "Top"],
          ["center", "Centered in the safe area"],
          ["bottom", "Bottom"],
        ],
      },
      {
        k: "safe",
        l: "Text safe margin",
        t: "select",
        o: [
          ["standard", "Standard (32 px)"],
          ["roomy", "Roomy (56 px)"],
          ["wide", "Wide (80 px)"],
        ],
      },
      {
        k: "width",
        l: "Text width",
        t: "select",
        o: [
          ["narrow", "Narrow"],
          ["standard", "Standard"],
          ["wide", "Wide"],
        ],
      },
      {
        k: "height",
        l: "Hero height",
        t: "select",
        o: [
          ["compact", "Compact"],
          ["standard", "Standard"],
          ["tall", "Tall"],
          ["custom", "Custom (drag the hero's bottom edge)"],
        ],
      },
      {
        k: "heightPx",
        l: "Custom height",
        t: "range",
        min: 160,
        max: 1000,
        step: 4,
        unit: " px",
        when: function (d) {
          return d.height === "custom";
        },
      },
      { t: "head", l: "Blend into the page" },
      {
        k: "fadeBottom",
        l: "Edge fade",
        t: "select",
        o: [
          ["auto", "Match the background"],
          ["none", "No fade"],
          ["soft", "Soft fade"],
          ["long", "Long fade"],
        ],
      },
      {
        k: "fadeEdge",
        l: "Fade from",
        t: "select",
        o: [
          ["bottom", "Bottom"],
          ["top", "Top"],
          ["topbottom", "Top and bottom"],
          ["sides", "Both sides"],
          ["left", "Left side"],
          ["right", "Right side"],
          ["all", "All edges"],
        ],
        when: function (d) {
          return d.fadeBottom !== "none";
        },
      },
      {
        k: "overlap",
        l: "Next section overlaps the hero",
        t: "select",
        o: [
          ["auto", "Automatic"],
          ["none", "No overlap"],
          ["small", "Small, 40 px"],
          ["standard", "Standard, 72 px"],
          ["deep", "Deep, 120 px"],
        ],
      },
      { t: "head", l: "Color" },
      {
        k: "scheme",
        l: "Background",
        t: "select",
        o: [
          ["dark", "Deep gradient"],
          ["navy", "Navy"],
          ["indigo", "Indigo glow"],
          ["cobalt", "Cobalt"],
          ["signature", "Violet to aqua"],
          ["light", "White with aurora"],
          ["ice", "Ice"],
        ],
      },
      {
        k: "textColor",
        l: "Text color",
        t: "select",
        o: [
          ["auto", "Automatic"],
          ["light", "White"],
          ["dark", "Navy"],
        ],
      },
      {
        k: "accent",
        l: "Highlight color",
        t: "select",
        o: [
          ["auto", "Automatic"],
          ["cobalt", "Cobalt"],
          ["sky", "Sky"],
          ["light-sky", "Light sky"],
          ["aqua", "Aqua"],
          ["violet", "Violet"],
        ],
      },
    ],
    def: function () {
      return {
        layout: "text",
        scheme: "dark",
        eyebrowStyle: "plain",
        eyebrow: "Client Case Study",
        title: "Helping Global Teams Move Faster with GlobalLink",
        highlight: "Move Faster",
        lead: "TransPerfect GlobalLink brings people, content and technology together to help global teams translate, adapt and deliver with speed and clarity.",
        short: "Helping global teams move faster",
        photo: null,
        photoWidth: 46,
        overlay: "navy",
        overlayStrength: 60,
        overlayDir: "left",
        panel: "none",
        chip: "",
        chipSub: "",
        align: "left",
        valign: "top",
        width: "standard",
        height: "standard",
        heightPx: 380,
        fadeEdge: "bottom",
        safe: "standard",
        textColor: "auto",
        accent: "auto",
        fadeBottom: "auto",
        overlap: "auto",
        logo: null,
        logoTone: "color",
        logoW: 200,
      };
    },
    render: function (d) {
      var L = d.layout || "text",
        sch = d.scheme || (d.variant && d.variant !== "dark" ? "light" : "dark");
      var hp = L !== "text" && hasImg(d.photo);
      var tc =
        d.textColor && d.textColor !== "auto"
          ? d.textColor
          : L === "full" && hp
            ? d.overlay === "white"
              ? "dark"
              : "light"
            : DARK_G.indexOf(sch) >= 0
              ? "light"
              : "dark";
      var acc =
        d.accent && d.accent !== "auto"
          ? d.accent
          : tc === "light"
            ? sch === "signature"
              ? "navy"
              : "light-sky"
            : "cobalt";
      var t = esc(d.title);
      if (d.highlight && d.title.indexOf(d.highlight) >= 0)
        t = t.replace(esc(d.highlight), function () { return '<span style="color:var(--' + acc + ')">' + esc(d.highlight) + "</span>"; });
      /* no label above the headline, in any hero (it used to be a rule and the kind of piece, a pill, or the brand's
         lockup): the headline opens the page */
      var top = "";
      var ph = "";
      if (L !== "text") {
        var w = (d.photoWidth || 46) + "%";
        var st = L === "full" ? "" : "width:" + (L === "fade" ? Math.min(80, (d.photoWidth || 46) + 14) + "%" : w);
        ph =
          '<div class="hp hp-' +
          L +
          '" style="' +
          st +
          '">' +
          (hp ? photoImg(d.photo, "hp-img") : '<div class="hp-empty" role="button" tabindex="0" aria-label="Add a photo"><span>Add a photo</span></div>') +
          (L === "full" && hp && d.overlay !== "none"
            ? '<div class="hp-ov" style="background:' +
              overlayCss(d.overlay, d.overlayStrength, d.overlayDir) +
              '"></div>'
            : "") +
          "</div>";
      }
      var cw = L === "right" || L === "left" ? "max-width:calc(" + (100 - (d.photoWidth || 46)) + "% - 40px)" : "";
      // bottom fade into the page: "auto" keeps the deep gradient's built-in fade and carries it over a full-bleed photo
      var fb = d.fadeBottom || "auto";
      if (fb === "auto") fb = sch === "dark" && hp && L === "full" ? "soft" : "none";
      // the fade carries the overlay's own hue down to the page (interpolated in OKLCH, so it stays saturated
      // instead of greying out where navy meets white)
      var tint = L === "full" && hp && d.overlay && d.overlay !== "none" && d.overlay !== "white" ? (d.overlay === "signature" ? "140,82,255" : OVC[d.overlay] || OVC.navy) : "3,0,44";
      // one gradient per faded edge; each runs from the hero's own colour into the page
      var EDGES = { bottom: ["b"], top: ["t"], topbottom: ["t", "b"], sides: ["l", "r"], left: ["l"], right: ["r"], all: ["t", "r", "b", "l"] };
      var edges = fb === "none" ? [] : EDGES[d.fadeEdge] || EDGES.bottom;
      var fade = edges
        .map(function (e) {
          return '<div class="hfade hf-' + fb + " fe-" + e + '" style="--ft:' + tint.replace(/,/g, " ") + '" aria-hidden="true"></div>';
        })
        .join("");
      var fadeBottomEdge = edges.indexOf("b") >= 0,
        fadeTopEdge = edges.indexOf("t") >= 0;
      return (
        '<section class="m-hero g-' +
        sch +
        " on-" +
        tc +
        " hl-" +
        L +
        " ha-" +
        (d.align || "left") +
        " hv-" +
        (d.valign || "top") +
        " hw-" +
        (d.width || "standard") +
        " hh-" +
        (d.height || "standard") +
        (d.safe && d.safe !== "standard" ? " hs-" + d.safe : "") +
        (fadeBottomEdge ? " has-fade" : "") +
        (fadeTopEdge ? " has-fade-top" : "") +
        (d.overlap && d.overlap !== "auto" ? " ho-" + d.overlap : "") +
        (d.words === "over" && L === "full" && hp ? " hx-over" : "") +
        '"' +
        ' style="--pw:' + (d.photoWidth || 46) + "%" + (d.height === "custom" ? ";min-height:" + Math.round(+d.heightPx || 380) + "px" : "") + '"' +
        ">" +
        ph +
        fade +
        '<div class="hcopy' +
        (L !== "text" && d.panel && d.panel !== "none" ? " hc-" + d.panel : "") +
        '" style="' +
        cw +
        '">' +
        top +
        '<h1 class="' +
        (d.title.length > 48 ? "t-hero-long" : "t-hero") +
        '">' +
        t +
        "</h1>" +
        (hasImg(d.logo) ? '<div class="hlead">' : "") +
        (hasImg(d.logo)
          ? '<div class="hlogo lt-' + (d.logoTone || "color") + '" style="--hlw:' + Math.round(+d.logoW || 200) + 'px"><img class="hlogo-img" src="' + esc(imgSrc(d.logo)) + '" alt="' + esc(d.logoAlt || "Client logo") + '"></div>'
          : "") +
        '<p class="t-lead">' +
        esc(d.lead) +
        "</p>" +
        (hasImg(d.logo) ? "</div>" : "") +
        "</div>" +
        (L !== "text" && d.chip
          ? '<div class="hchip"><b>' + esc(d.chip) + "</b>" + (d.chipSub ? "<span>" + (function (t) { var i = String(t).indexOf(" "); return i > 0 ? "<i>" + esc(String(t).slice(0, i)) + "</i> <i>" + esc(String(t).slice(i + 1)) + "</i>" : esc(t); })(d.chipSub) + "</span>" : "") + "</div>"
          : "") +
        "</section>"
      );
    },
  },
  kpis: {
    name: "KPI trio",
    group: "Proof",
    vk: "variant",
    desc: "Three headline results; cards, one bar or dark cards.",
    fields: [
      {
        k: "variant",
        l: "Style",
        t: "select",
        o: [
          ["cards", "White cards"],
          ["bar", "Single bar"],
          ["dark", "Navy cards"],
        ],
      },
      {
        k: "items",
        l: "Results",
        t: "list",
        min: 2,
        max: 3,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "value", l: "Value" },
          { k: "caption", l: "Caption" },
        ],
      },
    ],
    def: function () {
      return {
        variant: "cards",
        items: [
          { icon: "clock", value: "10 Days", caption: "Project time, down from 3 months" },
          { icon: "coins", value: "33%", caption: "Reduction in engineering localization costs" },
          { icon: "check-circle-2", value: "On Time", caption: "Modules rolled out within budget" },
        ],
      };
    },
    render: function (d, ctx) {
      var v = d.variant || "cards";
      var cell = function (k) {
        return (
          '<span class="disc">' +
          ic(k.icon) +
          '</span><div><div class="t-stat">' +
          esc(k.value) +
          '</div><div class="t-body">' +
          esc(k.caption) +
          "</div></div>"
        );
      };
      var ov = ctx.afterHero ? " overlap" : "";
      if (v === "bar")
        return (
          '<section class="sec' +
          ov +
          '"><div class="card row split kbar" style="gap:0">' +
          d.items
            .map(function (k) {
              return '<div class="kpi">' + cell(k) + "</div>";
            })
            .join("") +
          "</div></section>"
        );
      return (
        '<section class="row sec' +
        ov +
        '">' +
        d.items
          .map(function (k) {
            return '<div class="card kpi' + (v === "dark" ? " kdark" : "") + '">' + cell(k) + "</div>";
          })
          .join("") +
        "</section>"
      );
    },
  },
  stats: {
    name: "Stat strip",
    group: "Proof",
    vk: "variant",
    desc: "3–5 icon stats: open, in cards, or on an ice band.",
    fields: [
      {
        k: "variant",
        l: "Style",
        t: "select",
        o: [
          ["open", "Open with hairlines"],
          ["cards", "Cards"],
          ["band", "Ice band"],
        ],
      },
      {
        k: "items",
        l: "Stats",
        t: "list",
        min: 3,
        max: 5,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "value", l: "Value" },
          { k: "caption", l: "Caption" },
        ],
      },
    ],
    def: function () {
      return {
        variant: "open",
        items: [
          { icon: "users", value: "100%", caption: "Global teams empowered" },
          { icon: "coins", value: "48%", caption: "Reduction in localization costs" },
          { icon: "gauge", value: "98%", caption: "Translation quality score" },
          { icon: "globe-2", value: "35+", caption: "Markets supported" },
          { icon: "trending-up", value: "3.4x", caption: "Faster time-to-market" },
        ],
      };
    },
    render: function (d) {
      var v = d.variant || "open";
      if (v === "cards")
        return (
          '<section class="row sec">' +
          d.items
            .map(function (s) {
              return (
                '<div class="card colstat xstat" style="padding:16px 10px">' +
                '<span class="disc">' +
                ic(s.icon) +
                '</span><span class="t-stat acc">' +
                esc(s.value) +
                '</span><span class="t-body">' +
                esc(s.caption) +
                "</span></div>"
              );
            })
            .join("") +
          "</section>"
        );
      if (v === "band")
        return (
          '<section class="sec"><div class="band row split" style="gap:0">' +
          d.items
            .map(function (s) {
              return (
                '<div class="stat"><span class="v"><span class="disc" style="background:var(--white)">' +
                ic(s.icon) +
                '</span><span class="t-stat">' +
                esc(s.value) +
                '</span></span><span class="t-body">' +
                esc(s.caption) +
                "</span></div>"
              );
            })
            .join("") +
          "</div></section>"
        );
      return (
        '<section class="row sec split" style="gap:0">' +
        d.items
          .map(function (s) {
            return (
              '<div class="stat"><span class="v"><span class="disc">' +
              ic(s.icon) +
              '</span><span class="t-stat">' +
              esc(s.value) +
              '</span></span><span class="t-body">' +
              esc(s.caption) +
              "</span></div>"
            );
          })
          .join("") +
        "</section>"
      );
    },
  },
  capabilities: {
    name: "Capability grid",
    group: "Proof",
    vk: "variant",
    desc: "3–6 icon + verb cards: tray grid or open two-column list.",
    fields: [
      {
        k: "variant",
        l: "Style",
        t: "select",
        o: [
          ["tray", "Cards in a tray"],
          ["list", "Open two-column list"],
        ],
      },
      {
        k: "items",
        l: "Capabilities",
        t: "list",
        min: 3,
        max: 6,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "title", l: "Verb" },
          { k: "text", l: "Line", t: "textarea" },
        ],
      },
    ],
    def: function () {
      return {
        variant: "tray",
        items: [
          {
            icon: "layers-3",
            title: "Supports",
            text: "Adobe AEM 6.5 LTS SP packages with cross-environment compatibility",
          },
          { icon: "git-branch", title: "Adapts", text: "to any AEM content tree, out-of-the-box or custom" },
          { icon: "globe-2", title: "Enables", text: "custom localization for URLs and internal and external links" },
          {
            icon: "workflow",
            title: "Automates",
            text: "translation submission through AEM publishing workflow triggers",
          },
          { icon: "refresh-cw", title: "Triggers", text: "AEM workflows with AI and human oversight" },
          { icon: "brain", title: "Learns", text: "adaptive forms with dictionaries stored under new path locations" },
        ],
      };
    },
    render: function (d, ctx) {
      if (d.variant === "list")
        return (
          '<section class="sec' +
          (ctx.afterHero ? " overlap" : "") +
          '"><div class="' +
          (ctx.afterHero ? "card " : "") +
          'caplist">' +
          d.items
            .map(function (c) {
              return (
                '<div class="cap"><span class="disc">' +
                ic(c.icon) +
                '</span><div><div class="t-card" style="font-size:19px;line-height:24px">' +
                esc(c.title) +
                '</div><div class="t-body">' +
                esc(c.text) +
                "</div></div></div>"
              );
            })
            .join("") +
          "</div></section>"
        );
      return (
        '<section class="sec' +
        (ctx.afterHero ? " overlap" : "") +
        '"><div class="tray">' +
        d.items
          .map(function (c) {
            return (
              '<div class="card cap"><span class="disc">' +
              ic(c.icon) +
              '</span><div><div class="t-card">' +
              esc(c.title) +
              '</div><div class="t-body">' +
              esc(c.text) +
              "</div></div></div>"
            );
          })
          .join("") +
        "</div></section>"
      );
    },
  },
  features: {
    name: "Icon feature row",
    group: "Proof",
    desc: "Centered label over 3–5 icon-and-line columns.",
    fields: [
      { k: "label", l: "Label" },
      {
        k: "items",
        l: "Columns",
        t: "list",
        min: 3,
        max: 5,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "text", l: "Line" },
        ],
      },
    ],
    def: function () {
      return {
        label: "We Know How",
        items: [
          { icon: "building", text: "Supports 600+ global enterprises" },
          { icon: "bot", text: "Enables workflows with AI and human oversight" },
          { icon: "handshake", text: "Combines in-house teams and external vendors" },
          { icon: "network", text: "Integrates with 100+ platforms seamlessly" },
          { icon: "trending-up", text: "Reduces costs and accelerates time-to-market" },
        ],
      };
    },
    render: function (d) {
      return (
        '<section class="sec"><div class="feat-h"><i></i><b class="t-label">' +
        esc(d.label) +
        '</b><i></i></div><div class="row split" style="gap:0">' +
        d.items
          .map(function (f) {
            return (
              '<div class="colstat"><span class="disc">' +
              ic(f.icon) +
              '</span><span class="t-body">' +
              esc(f.text) +
              "</span></div>"
            );
          })
          .join("") +
        "</div></section>"
      );
    },
  },
  storyRows: {
    name: "Challenge / Solution / Result",
    group: "Story",
    vk: "variant",
    desc: "Three-part story as rows, numbered steps or side-by-side cards.",
    fields: [
      {
        k: "variant",
        l: "Style",
        t: "select",
        o: [
          ["rows", "Rows with labels"],
          ["numbered", "Numbered steps"],
          ["cards", "Side-by-side columns"],
        ],
      },
      {
        k: "items",
        l: "Rows",
        t: "list",
        min: 2,
        max: 6,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "heading", l: "Heading" },
          { k: "text", l: "Paragraph", t: "textarea" },
        ],
      },
    ],
    def: function () {
      return {
        variant: "rows",
        items: [
          {
            icon: "search",
            heading: "The Challenge",
            text: "Aēsop needed to localize hundreds of product knowledge modules across multiple markets. Disconnected processes, inconsistent terminology and manual handoffs slowed delivery and increased costs.",
          },
          {
            icon: "workflow",
            heading: "The Solution",
            text: "GlobalLink for Adobe Experience Manager Plus unified content, automation and workflows in one centralized ecosystem with a one-click workflow and full visibility.",
          },
          {
            icon: "trophy",
            heading: "The Result",
            text: "Aēsop cut project management time by more than 70% and reduced engineering localization costs by 33% across 7 markets — on time and on budget.",
          },
        ],
      };
    },
    render: function (d) {
      var v = d.variant || "rows";
      if (v === "cards")
        return (
          '<section class="row sec">' +
          d.items
            .map(function (s) {
              return (
                '<div class="card scol"><span class="tile" style="margin-bottom:12px">' +
                ic(s.icon) +
                "</span><h3>" +
                esc(s.heading) +
                '</h3><p class="t-body" style="margin-top:4px">' +
                esc(s.text) +
                "</p></div>"
              );
            })
            .join("") +
          "</section>"
        );
      if (v === "numbered")
        return (
          '<section class="sec">' +
          d.items
            .map(function (s, i) {
              return (
                '<div class="srow srow-n"><span class="num">' +
                ("0" + (i + 1)).slice(-2) +
                "</span><div><h3>" +
                esc(s.heading) +
                '</h3><p class="t-body">' +
                esc(s.text) +
                "</p></div></div>"
              );
            })
            .join("") +
          "</section>"
        );
      return (
        '<section class="sec">' +
        d.items
          .map(function (s) {
            /* a row with no heading is a plain paragraph across the page: no icon, no empty label column */
            if (!String(s.heading || "").trim()) return '<div class="srow srow-nh"><div><p class="t-body">' + esc(s.text) + "</p></div></div>";
            return (
              '<div class="srow"><span class="tile">' +
              ic(s.icon) +
              "</span><div><h3>" +
              esc(s.heading) +
              '</h3><p class="t-body">' +
              esc(s.text) +
              "</p></div></div>"
            );
          })
          .join("") +
        "</section>"
      );
    },
  },
  storyColumns: {
    name: "Challenge / Approach / Impact",
    group: "Story",
    desc: "Three cards with intro and bullets. eBrochures.",
    fields: [
      {
        k: "items",
        l: "Columns",
        t: "list",
        min: 3,
        max: 6,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "heading", l: "Heading" },
          { k: "text", l: "Intro", t: "textarea" },
          { k: "bullets", l: "Bullets (one per line)", t: "textarea" },
        ],
      },
    ],
    def: function () {
      return {
        items: [
          {
            icon: "search",
            heading: "The Challenge",
            text: "The client struggled with fragmented tools and slow localization.",
            bullets: "Disconnected systems\nInconsistent terminology\nLong turnaround times\nLimited visibility",
          },
          {
            icon: "workflow",
            heading: "Our Approach",
            text: "We implemented GlobalLink AI to unify content operations.",
            bullets: "Unified orchestration\nAI-powered workflow\nCentralized governance\nReal-time dashboards",
          },
          {
            icon: "trending-up",
            heading: "The Impact",
            text: "Measurable improvements in speed, quality and efficiency.",
            bullets: "3.4x faster time-to-market\n48% lower localization costs\n98% translation quality\n35+ markets",
          },
        ],
      };
    },
    render: function (d, ctx) {
      return (
        '<section class="row sec scols' +
        (ctx.afterHero ? " overlap" : "") +
        '">' +
        d.items
          .map(function (c) {
            // no heading: no icon-and-blank header row; one card: its list runs in two columns
            return (
              '<div class="card scol' +
              (d.items.length === 1 ? " solo" : "") +
              '">' +
              (String(c.heading || "").trim()
                ? '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px"><span class="disc">' + ic(c.icon) + "</span><h3>" + esc(c.heading) + "</h3></div>"
                : "") +
              (String(c.text || "").trim() ? '<p class="t-body">' + esc(c.text) + "</p>" : "") +
              '<ul class="t-body">' +
              String(c.bullets || "")
                .split("\n")
                .filter(Boolean)
                .map(function (b) {
                  return "<li>" + esc(b) + "</li>";
                })
                .join("") +
              "</ul></div>"
            );
          })
          .join("") +
        "</section>"
      );
    },
  },
  quote: {
    name: "Quote band + snapshot",
    group: "Voice",
    vk: "side",
    desc: "Testimonial on a soft tint, optional proof card.",
    fields: [
      { k: "quote", l: "Quote", t: "textarea" },
      { k: "attribution", l: "Attribution" },
      {
        k: "side",
        l: "Beside the quote",
        t: "select",
        o: [
          ["snapshot", "Engagement Snapshot"],
          ["discover", "Discover line + proof"],
          ["none", "Nothing (full width)"],
        ],
      },
      { k: "sideText", l: "Snapshot label or discover line", t: "textarea" },
      {
        k: "proof",
        l: "Proof points",
        t: "list",
        min: 0,
        max: 3,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "text", l: "Text" },
        ],
      },
    ],
    def: function () {
      return {
        quote:
          "TransPerfect helped us simplify a complex localization process and free our internal team to focus on higher-value work.",
        attribution: "- Aēsop",
        side: "snapshot",
        sideText: "Engagement Snapshot",
        proof: clone(PROOF),
      };
    },
    render: function (d) {
      var q =
        '<div class="qband" style="flex:2"><span class="qmark">' + QM() + '</span><p class="t-quote">' +
        esc(unq(d.quote)) +
        '</p><span class="t-attr">' +
        esc(attrText(d.attribution)) +
        "</span></div>";
      if (d.side === "none") return '<section class="row sec">' + q + "</section>";
      var head =
        d.side === "snapshot"
          ? '<div class="t-label acc" style="text-align:center">' + esc(d.sideText) + "</div>"
          : '<p class="t-body">' + esc(d.sideText) + "</p>";
      return (
        '<section class="row sec" style="align-items:stretch">' +
        q +
        '<div class="card" style="flex:1">' +
        head +
        '<ul class="proof">' +
        d.proof
          .map(function (p) {
            return '<li class="t-body">' + ic(p.icon) + esc(p.text) + "</li>";
          })
          .join("") +
        "</ul></div></section>"
      );
    },
  },
  quoteStats: {
    name: "Quote card + stat grid",
    group: "Voice",
    desc: "2×2 stats beside a feature testimonial.",
    fields: [
      {
        k: "items",
        l: "Stats",
        t: "list",
        min: 2,
        max: 4,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "value", l: "Value" },
          { k: "caption", l: "Caption" },
        ],
      },
      { k: "quote", l: "Quote", t: "textarea" },
      { k: "client", l: "Client title" },
      { k: "attribution", l: "Attribution" },
    ],
    def: function () {
      return {
        items: [
          { icon: "users", value: "100%", caption: "Global teams empowered" },
          { icon: "coins", value: "48%", caption: "Reduction in localization costs" },
          { icon: "gauge", value: "98%", caption: "Translation quality score" },
          { icon: "globe-2", value: "35+", caption: "Markets supported" },
        ],
        quote:
          "GlobalLink gave our team the speed, visibility, and consistency we need to scale multicultural content with confidence.",
        client: "Client Title",
        attribution: "- Aēsop",
      };
    },
    render: function (d, ctx) {
      return (
        '<section class="row sec' +
        (ctx.afterHero ? " overlap" : "") +
        '" style="align-items:center;gap:var(--space-lg)"><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 16px;flex:1">' +
        d.items
          .map(function (s) {
            return (
              '<div class="stat" style="padding:0"><span class="v"><span class="disc">' +
              ic(s.icon) +
              '</span><span class="t-stat">' +
              esc(s.value) +
              '</span></span><span class="t-body">' +
              esc(s.caption) +
              "</span></div>"
            );
          })
          .join("") +
        '</div><div class="card" style="flex:1;padding:24px"><span class="qmark">' + QM() + '</span><p class="t-quote-lg" style="margin:8px 0 14px">' +
        esc(unq(d.quote)) +
        '</p><div class="t-attr">' +
        esc(d.client) +
        '</div><div class="t-attr">' +
        esc(attrText(d.attribution)) +
        "</div></div></section>"
      );
    },
  },
  expert: {
    name: "Project stats + expert card",
    group: "Voice",
    desc: "Icon stat cards with a Talk-to-an-Expert card.",
    fields: [
      { k: "label", l: "Section label" },
      {
        k: "items",
        l: "Stats",
        t: "list",
        min: 2,
        max: 4,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "value", l: "Value" },
          { k: "caption", l: "Caption" },
        ],
      },
      { k: "title", l: "Card title" },
      { k: "line", l: "Card line", t: "textarea" },
      { k: "button", l: "Button" },
    ],
    def: function () {
      return {
        label: "Project Statistics",
        items: [
          { icon: "trophy", value: "15+", caption: "Years partner experience" },
          { icon: "globe-2", value: "200+", caption: "Shared customers" },
          { icon: "network", value: "100+", caption: "Platform integrations" },
        ],
        title: "Talk to a GlobalLink Expert",
        line: "Our experts help global teams streamline content operations and drive measurable results.",
        button: "Contact an Expert",
      };
    },
    render: function (d) {
      var t = esc(d.title).replace("GlobalLink", '<span class="acc">GlobalLink</span>');
      return (
        '<section class="sec" style="display:flex;gap:var(--space-md);align-items:stretch"><div style="flex:1"><div class="t-label" style="font-size:15px;margin-bottom:12px">' +
        esc(d.label) +
        '</div><div class="row">' +
        d.items
          .map(function (s) {
            return (
              '<div class="card xstat" style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="disc">' +
              ic(s.icon) +
              '</span><span class="t-stat acc">' +
              esc(s.value) +
              '</span><span class="t-body">' +
              esc(s.caption) +
              "</span></div>"
            );
          })
          .join("") +
        '</div></div><div class="card" style="width:230px;flex:none"><div class="t-label" style="font-size:17px;line-height:21px">' +
        t +
        '</div><p class="t-body" style="margin:8px 0">' +
        esc(d.line) +
        '</p><ul class="proof">' +
        PROOF.map(function (p) {
          return '<li class="t-body">' + ic(p.icon) + esc(p.text) + "</li>";
        }).join("") +
        '</ul><div style="margin-top:12px"><span class="pill dark t-body">' +
        esc(d.button) +
        "</span></div></div></section>"
      );
    },
  },
  cta: {
    name: "CTA bar",
    group: "Action",
    vk: "fill",
    desc: "G mark, title, sub-line and a Book a Demo pill.",
    fields: [
      {
        k: "fill",
        l: "Fill",
        t: "select",
        o: [
          ["navy", "Navy"],
          ["gradient", "Violet to aqua gradient"],
          ["cobalt", "Cobalt"],
        ],
      },
      { k: "title", l: "Title" },
      { k: "sub", l: "Sub-line" },
      { k: "button", l: "Button" },
    ],
    def: function () {
      return {
        fill: "navy",
        title: "See GlobalLink in Action",
        sub: "Explore how GlobalLink AI can transform your content operations.",
        button: "Book a Demo",
      };
    },
    render: function (d) {
      return (
        '<section class="sec"><div class="cta ' +
        (d.fill === "navy" ? "" : d.fill) +
        (LOGO.mark ? "" : " nomark") +
        '">' +
        (LOGO.mark ? '<img src="' + LOGO.mark + '" alt="">' : "") +
        '<div class="copy"><div class="t-cta">' +
        (function () {
          // the brand's name in the title is set in bold, as "GlobalLink" always was
          var nm = typeof CUR_BRAND !== "undefined" && CUR_BRAND && CUR_BRAND.short ? CUR_BRAND.short : "GlobalLink";
          return esc(d.title).replace(esc(nm), "<b>" + esc(nm) + "</b>");
        })() +
        '</div><div class="t-ctasub">' +
        esc(d.sub) +
        '</div></div><span class="pill" style="font-size:18px">' +
        esc(d.button) +
        "</span></div></section>"
      );
    },
  },
  footer: {
    name: "Footer",
    group: "Close",
    vk: "style",
    desc: "Wordmarks, URL and email. Always last.",
    fields: [
      {
        k: "style",
        l: "Style",
        t: "select",
        o: [
          ["open", "Open strip"],
          ["card", "White card"],
        ],
      },
      { k: "url", l: "URL" },
      { k: "email", l: "Email" },
      /* the small print a printed piece carries at its foot: a tagline beside the logo, handles or offices after the
         addresses, and the company's own paragraph above them. All optional; an earlier piece's own go here, so they
         are kept without each taking a module of the page. */
      { k: "line", l: "Line beside the logo (a tagline)", opt: true },
      { k: "extra", l: "More contact details (social handles, offices)", opt: true },
      { k: "aboutHead", l: "About: its heading", opt: true },
      { k: "about", l: "About: a short paragraph above the contact row", t: "textarea", opt: true },
    ],
    def: function () {
      return { style: "open", url: "transperfect.com/globallink", email: "globallink@transperfect.com" };
    },
    render: function (d) {
      var about = String(d.about || "").trim(), aboutHead = String(d.aboutHead || "").trim(), line = String(d.line || "").trim(), extra = String(d.extra || "").trim();
      return (
        '<footer class="foot' +
        (d.style === "card" ? " card" : "") +
        (about ? " has-about" : "") +
        '">' +
        (about ? '<p class="foot-about' + (about.length > 240 ? " two" : "") + '">' + (aboutHead ? "<b>" + esc(aboutHead.replace(/[.:]\s*$/, "")) + ".</b> " : "") + esc(about) + "</p>" : "") +
        '<div class="marks">' +
        (function () {
          // products are endorsed by TransPerfect (both marks); divisions and the master brand carry one lockup
          var b = typeof CUR_BRAND !== "undefined" && CUR_BRAND ? CUR_BRAND : { endorse: true, name: "GlobalLink" };
          /* each logo's box is sized from its artwork, so the footer's layout (and every height measured through it)
             is the same before the image has decoded as after */
          var boxW = function (src, hh) {
            var ar = typeof logoAR === "function" ? logoAR(src) : 0;
            return ar ? ";width:" + Math.min(150, Math.round(hh * ar)) + "px" : "";
          };
          var oh = b.endorse ? 21 : 30;
          var own = '<img src="' + LOGO.gl + '" alt="' + esc(b.name) + '" style="height:' + oh + "px" + boxW(LOGO.gl, oh) + '">';
          // a product whose logo isn't in the build shows TransPerfect's alone, not twice
          var endorse = b.endorse && !(typeof brandLogoMissing === "function" && brandLogoMissing(b));
          return endorse ? '<img src="' + LOGO.tp + '" alt="TransPerfect" style="height:13px' + boxW(LOGO.tp, 13) + '">' + own : own;
        })() +
        (line ? '<span class="foot-line">' + esc(line) + "</span>" : "") +
        "</div>" +
        /* the addresses are one block at the outer edge (a long web address wraps inside it, instead of dropping the
           email under the logo); handles or offices sit on a line under them */
        '<div class="foot-cs"><div class="foot-r">' +
        '<span class="c t-body">' +
        esc(d.url) +
        "</span>" +
        (d.email ? '<span class="c t-body">' + esc(d.email) + "</span>" : "") +
        "</div>" +
        (extra ? '<span class="c t-body foot-x">' + esc(extra) + "</span>" : "") +
        "</div></footer>"
      );
    },
  },
};
var GROUPS = ["Open", "Proof", "Story", "Voice", "Compose", "Action", "Close"];

// Ported render-only definitions: 20b-engine-surface.js
/* ================= module backgrounds and the library's five variations =================
   Every content module can sit on a background: none, a tinted panel, a full-width band, an outlined box
   or an accent rule down its left edge (data.surface, optional: modules saved before it existed stay
   exactly as they were). The library lists five variations under each module: its own styles first, then
   its usual style on each background, so every module offers five ready-made looks with a preview. */
var SURFACES = [
  ["plain", "No background"],
  ["tint", "Tinted panel"],
  ["band", "Full-width band"],
  ["card", "Outlined box"],
  ["accent", "Accent rule"],
];
var SURFACE_SKIP = { hero: 1, pagebreak: 1 };
Object.keys(MODULES).forEach(function (k) {
  if (SURFACE_SKIP[k]) return;
  var d = MODULES[k];
  d.fields = (d.fields || []).concat([{ k: "surface", l: "Background", t: "select", opt: true, o: SURFACES.map(function (s) { return s.slice(); }) }]);
});
function surfaceClass(data) {
  var s = data && data.surface;
  return s && s !== "plain" && /^(tint|band|card|accent)$/.test(s) ? " sf-" + s : "";
}
/* sample copy that lets a variation show what it is for (the examples page and the library previews) */
var VARIANT_EXTRA = { quote: { discover: { sideText: "Discover how one glossary and one workflow keep every market on message." } } };
/* five variations of module k: [[name, overrides], ...] */
function libVariants(k) {
  var d = MODULES[k];
  if (!d || k === "pagebreak") return [];
  var out = [];
  var st = [];
  if (d.vk) {
    var f = (d.fields || []).filter(function (x) { return x.k === d.vk; })[0];
    st = f && f.o ? f.o.map(function (o) { return Array.isArray(o) ? o : [o, o]; }) : [];
  }
  st.slice(0, 5).forEach(function (s) {
    var o = {};
    o[d.vk] = s[0];
    if (VARIANT_EXTRA[k] && VARIANT_EXTRA[k][s[0]]) Object.assign(o, VARIANT_EXTRA[k][s[0]]);
    out.push([String(s[1]), o]);
  });
  if (!SURFACE_SKIP[k]) {
    var dv = d.vk ? d.def()[d.vk] : null;
    var base = st.filter(function (s) { return s[0] === dv; })[0] || st[0];
    SURFACES.forEach(function (sf, i) {
      if (out.length >= 5) return;
      if (i === 0 && st.length) return; // the plain style is already listed
      var o = { surface: sf[0] };
      if (base) o[d.vk] = base[0];
      out.push([base ? base[1] + ", " + sf[1].toLowerCase() : sf[1], o]);
    });
  }
  return out.slice(0, 5);
}

// Ported render-only definitions: 21-engine-submodules.js
/* ---------- sub-modules (live inside a Flexible row's slots) ---------- */
var SUBS = {
  stat: {
    name: "Stat card",
    fields: [
      { k: "icon", l: "Icon", t: "icon" },
      { k: "value", l: "Value" },
      { k: "caption", l: "Caption" },
    ],
    def: function () {
      return { icon: "trending-up", value: "3.4x", caption: "Faster time-to-market" };
    },
    render: function (d) {
      return (
        '<div class="card colstat sub-fill" style="padding:18px 12px;justify-content:center"><span class="disc">' +
        ic(d.icon) +
        '</span><span class="t-stat acc">' +
        esc(d.value) +
        '</span><span class="t-body">' +
        esc(d.caption) +
        "</span></div>"
      );
    },
  },
  highlight: {
    name: "Highlight number",
    fields: [
      { k: "value", l: "Value" },
      { k: "caption", l: "Caption" },
    ],
    def: function () {
      return { value: "98%", caption: "Translation quality score, human evaluation" };
    },
    render: function (d) {
      return (
        '<div class="hl sub-fill"><div class="hlv">' +
        esc(d.value) +
        '</div><div class="t-body">' +
        esc(d.caption) +
        "</div></div>"
      );
    },
  },
  iconCard: {
    name: "Icon card",
    fields: [
      { k: "icon", l: "Icon", t: "icon" },
      { k: "title", l: "Title" },
      { k: "text", l: "Text", t: "textarea" },
    ],
    def: function () {
      return {
        icon: "workflow",
        title: "Automates",
        text: "Translation submission through AEM publishing workflow triggers.",
      };
    },
    render: function (d) {
      return (
        '<div class="card sub-fill"><span class="disc">' +
        ic(d.icon) +
        '</span><div class="t-card" style="font-size:18px;line-height:23px;margin:10px 0 4px;color:var(--cobalt)">' +
        esc(d.title) +
        '</div><div class="t-body">' +
        esc(d.text) +
        "</div></div>"
      );
    },
  },
  quote: {
    name: "Quote",
    fields: [
      { k: "quote", l: "Quote", t: "textarea" },
      { k: "attribution", l: "Attribution" },
    ],
    def: function () {
      return {
        quote: "GlobalLink gave our team the speed, visibility, and consistency we need.",
        attribution: "- Aēsop",
      };
    },
    render: function (d) {
      return (
        '<div class="qband sub-fill"><span class="qmark">' + QM() + '</span><p class="t-quote" style="margin:8px 0">' +
        esc(unq(d.quote)) +
        '</p><span class="t-attr">' +
        esc(attrText(d.attribution)) +
        "</span></div>"
      );
    },
  },
  proof: {
    name: "Proof list",
    fields: [
      { k: "title", l: "Title" },
      {
        k: "items",
        l: "Points",
        t: "list",
        min: 1,
        max: 4,
        f: [
          { k: "icon", l: "Icon", t: "icon" },
          { k: "text", l: "Text" },
        ],
      },
    ],
    def: function () {
      return { title: "Engagement Snapshot", items: clone(PROOF) };
    },
    render: function (d) {
      return (
        '<div class="card sub-fill"><div class="t-label acc">' +
        esc(d.title) +
        '</div><ul class="proof">' +
        d.items
          .map(function (p) {
            return '<li class="t-body">' + ic(p.icon) + esc(p.text) + "</li>";
          })
          .join("") +
        "</ul></div>"
      );
    },
  },
  text: {
    name: "Text block",
    fields: [
      { k: "eyebrow", l: "Eyebrow" },
      { k: "heading", l: "Heading" },
      { k: "body", l: "Body", t: "textarea" },
    ],
    def: function () {
      return {
        eyebrow: "Why GlobalLink",
        heading: "One platform for every market",
        body: "Unify content, automation and governance so every team ships on-brand content faster, everywhere.",
      };
    },
    render: function (d) {
      return (
        '<div class="sub-fill" style="padding:4px 2px"><div class="t-eyebrow acc" style="font-size:11px;letter-spacing:1.4px;margin-bottom:6px">' +
        esc(d.eyebrow) +
        '</div><div class="t-card" style="font-size:22px;line-height:27px;margin-bottom:8px">' +
        esc(d.heading) +
        "</div>" +
        String(d.body == null ? "" : d.body)
          .split(/\n\s*\n/)
          .map(function (t) {
            return '<p class="t-body" style="font-size:13px;line-height:19px;margin:0 0 9px;max-width:68ch">' + esc(t) + "</p>";
          })
          .join("") +
        "</div>"
      );
    },
  },
  bullets: {
    name: "Bullet card",
    fields: [
      { k: "heading", l: "Heading" },
      { k: "bullets", l: "Bullets (one per line)", t: "textarea" },
    ],
    def: function () {
      return {
        heading: "What's included",
        bullets: "Unified orchestration\nAI-powered workflow\nCentralized governance\nReal-time dashboards",
      };
    },
    render: function (d) {
      return (
        '<div class="card scol sub-fill"><h3>' +
        esc(d.heading) +
        '</h3><ul class="t-body">' +
        String(d.bullets || "")
          .split("\n")
          .filter(Boolean)
          .map(function (b) {
            return "<li>" + esc(b) + "</li>";
          })
          .join("") +
        "</ul></div>"
      );
    },
  },
  image: {
    name: "Image area",
    fields: [
      { k: "photo", l: "Photo", t: "image" },
      {
        k: "fit",
        l: "Fit",
        t: "select",
        o: [
          ["cover", "Fill the slot (crop)"],
          ["contain", "Show the whole image"],
        ],
        when: function (d) {
          return hasImg(d.photo);
        },
      },
      { k: "height", l: "Minimum height", t: "range", min: 100, max: 420, step: 10, unit: "px" },
      {
        k: "corners",
        l: "Corners",
        t: "select",
        o: [
          ["round", "Rounded"],
          ["square", "Square"],
        ],
      },
      {
        k: "tone",
        l: "Backdrop",
        t: "select",
        o: [
          ["deep", "Deep gradient"],
          ["glow", "Aurora glow"],
          ["ice", "Ice tint"],
          ["white", "White"],
        ],
      },
      { k: "caption", l: "Caption (leave empty to hide)" },
    ],
    def: function () {
      return {
        photo: null,
        fit: "cover",
        height: 170,
        corners: "round",
        tone: "deep",
        caption: "Product UI or photography goes here",
      };
    },
    render: function (d) {
      var hp = hasImg(d.photo);
      return (
        '<div class="imgarea sub-fill tone-' +
        esc(d.tone || "deep") +
        (d.corners === "square" ? " sq" : "") +
        '" style="min-height:' +
        (d.height || 170) +
        'px">' +
        (hp ? photoImg(d.photo, "ia-img fit-" + (d.fit || "cover")) : "") +
        (d.caption ? "<span>" + esc(d.caption) + "</span>" : "") +
        "</div>"
      );
    },
  },
  miniCta: {
    name: "Mini CTA",
    fields: [
      { k: "title", l: "Title" },
      { k: "button", l: "Button" },
    ],
    def: function () {
      return { title: "Talk to a GlobalLink expert", button: "Contact an Expert" };
    },
    render: function (d) {
      return (
        '<div class="minicta sub-fill"><div class="t-card" style="font-size:19px;line-height:24px">' +
        esc(d.title) +
        '</div><span class="pill" style="font-size:13px;padding:6px 16px;margin-top:14px;align-self:flex-start">' +
        esc(d.button) +
        "</span></div>"
      );
    },
  },
  compare: {
    name: "Before and after",
    fields: [
      { k: "label", l: "What changed" },
      { k: "before", l: "Before" },
      { k: "beforeLabel", l: "Before label" },
      { k: "after", l: "After" },
      { k: "afterLabel", l: "After label" },
    ],
    def: function () {
      return { label: "Project turnaround", before: "3 months", beforeLabel: "Manual handoffs", after: "10 days", afterLabel: "With GlobalLink" };
    },
    render: function (d) {
      return (
        '<div class="card cmp sub-fill"><div class="t-label acc">' +
        esc(d.label) +
        '</div><div class="cmp-row"><div class="cmp-b"><div class="cmp-v">' +
        esc(d.before) +
        '</div><div class="t-body">' +
        esc(d.beforeLabel) +
        '</div></div><span class="cmp-arrow">' +
        ic("arrow-right") +
        '</span><div class="cmp-a"><div class="cmp-v">' +
        esc(d.after) +
        '</div><div class="t-body">' +
        esc(d.afterLabel) +
        "</div></div></div></div>"
      );
    },
  },
  ring: {
    name: "Percentage ring",
    fields: [
      { k: "value", l: "Percent", t: "range", min: 0, max: 100, step: 1, unit: "%" },
      { k: "caption", l: "Caption" },
    ],
    def: function () {
      return { value: 33, caption: "Lower engineering localization costs" };
    },
    render: function (d) {
      var v = Math.max(0, Math.min(100, +d.value || 0)),
        r = 34,
        c = 2 * Math.PI * r;
      return (
        '<div class="card ring sub-fill"><div class="ring-w"><svg viewBox="0 0 84 84" class="ring-g" role="img" aria-label="' +
        v +
        ' percent"><circle cx="42" cy="42" r="' +
        r +
        '" class="ring-t"/><circle cx="42" cy="42" r="' +
        r +
        '" class="ring-a" stroke-dasharray="' +
        ((c * v) / 100).toFixed(2) +
        " " +
        c.toFixed(2) +
        '"/></svg><div class="ring-v">' +
        v +
        '<small>%</small></div></div><div class="t-body">' +
        esc(d.caption) +
        "</div></div>"
      );
    },
  },
  bars: {
    name: "Bar chart",
    fields: [
      { k: "title", l: "Title" },
      { k: "unit", l: "Unit after each value" },
      {
        k: "items",
        l: "Bars",
        t: "list",
        min: 2,
        max: 5,
        f: [
          { k: "label", l: "Label" },
          { k: "value", l: "Value", t: "range", min: 0, max: 1000, step: 1 },
        ],
      },
    ],
    def: function () {
      return {
        title: "Turnaround by market, days",
        unit: "",
        items: [
          { label: "Before", value: 90 },
          { label: "Pilot", value: 32 },
          { label: "Today", value: 10 },
        ],
      };
    },
    render: function (d) {
      var items = (d.items || []).slice(0, 5),
        max = Math.max.apply(null, items.map(function (i) { return +i.value || 0; }).concat([1]));
      return (
        '<div class="card bars sub-fill"><div class="t-label acc">' +
        esc(d.title) +
        "</div>" +
        items
          .map(function (i, k) {
            var w = Math.max(2, ((+i.value || 0) / max) * 100);
            return (
              '<div class="bar"><span class="bar-l t-body">' +
              esc(i.label) +
              '</span><span class="bar-t"><i class="' +
              (k === items.length - 1 ? "last" : "") +
              '" style="width:' +
              w.toFixed(1) +
              '%"></i></span><b class="bar-v">' +
              esc(String(+i.value || 0)) +
              esc(d.unit || "") +
              "</b></div>"
            );
          })
          .join("") +
        "</div>"
      );
    },
  },
  timeline: {
    name: "Timeline",
    fields: [
      { k: "title", l: "Title" },
      {
        k: "items",
        l: "Steps",
        t: "list",
        min: 2,
        max: 4,
        f: [
          { k: "when", l: "When" },
          { k: "what", l: "What happened" },
        ],
      },
    ],
    def: function () {
      return {
        title: "Rollout",
        items: [
          { when: "Week 1", what: "Connector installed in AEM" },
          { when: "Week 2", what: "Pilot in 2 markets" },
          { when: "Week 6", what: "Live in all 7 markets" },
        ],
      };
    },
    render: function (d) {
      return (
        '<div class="card tl sub-fill"><div class="t-label acc">' +
        esc(d.title) +
        '</div><ol class="tl-l">' +
        (d.items || [])
          .slice(0, 4)
          .map(function (i) {
            return '<li><b class="tl-w">' + esc(i.when) + '</b><span class="t-body">' + esc(i.what) + "</span></li>";
          })
          .join("") +
        "</ol></div>"
      );
    },
  },
  markets: {
    name: "Markets and languages",
    fields: [
      { k: "value", l: "Headline number" },
      { k: "caption", l: "Caption" },
      { k: "codes", l: "Markets or languages, comma separated" },
    ],
    def: function () {
      return { value: "7 markets", caption: "Launched on the same day", codes: "FR, DE, IT, ES, JA, KO, ZH" };
    },
    render: function (d) {
      var codes = String(d.codes || "")
        .split(",")
        .map(function (x) { return x.trim(); })
        .filter(Boolean)
        .slice(0, 16);
      return (
        '<div class="card mk sub-fill"><div class="mk-h"><span class="disc">' +
        ic("globe") +
        '</span><div><div class="t-stat acc">' +
        esc(d.value) +
        '</div><div class="t-body">' +
        esc(d.caption) +
        '</div></div></div><div class="mk-c">' +
        codes.map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") +
        "</div></div>"
      );
    },
  },
  person: {
    name: "Expert card",
    fields: [
      { k: "photo", l: "Portrait", t: "image" },
      { k: "name", l: "Name" },
      { k: "role", l: "Role" },
      { k: "text", l: "Short quote or bio", t: "textarea" },
    ],
    def: function () {
      return { photo: null, name: "Alex Moreau", role: "Solutions Architect, GlobalLink", text: "Ask me how teams cut review cycles in half." };
    },
    render: function (d) {
      var hp = hasImg(d.photo),
        ini = String(d.name || "")
          .split(/\s+/)
          .map(function (w) { return w.charAt(0); })
          .join("")
          .slice(0, 2)
          .toUpperCase();
      return (
        '<div class="card person sub-fill"><div class="ps-h">' +
        (hp ? '<span class="ps-ph">' + photoImg(d.photo, "ps-img") + "</span>" : '<span class="ps-ph ps-ini">' + esc(ini) + "</span>") +
        '<div><div class="t-label">' +
        esc(d.name) +
        '</div><div class="t-body acc">' +
        esc(d.role) +
        '</div></div></div><p class="t-body ps-t">' +
        esc(d.text) +
        "</p></div>"
      );
    },
  },
  badge: {
    name: "Badge",
    fields: [
      { k: "icon", l: "Icon", t: "icon" },
      { k: "title", l: "Title" },
      { k: "text", l: "Text" },
    ],
    def: function () {
      return { icon: "award", title: "Adobe Gold Partner", text: "Certified AEM connector" };
    },
    render: function (d) {
      return (
        '<div class="card badge sub-fill"><span class="bdg-seal">' +
        ic(d.icon) +
        '</span><div class="t-label">' +
        esc(d.title) +
        '</div><div class="t-body">' +
        esc(d.text) +
        "</div></div>"
      );
    },
  },
  media: {
    name: "Video still",
    fields: [
      { k: "photo", l: "Still image", t: "image" },
      { k: "title", l: "Title" },
      { k: "duration", l: "Length, e.g. 2:14" },
    ],
    def: function () {
      return { photo: null, title: "See the AEM connector in action", duration: "2:14" };
    },
    render: function (d) {
      var hp = hasImg(d.photo);
      return (
        '<div class="imgarea media tone-deep sub-fill">' +
        (hp ? photoImg(d.photo, "ia-img fit-cover") : "") +
        '<span class="md-play" aria-hidden="true"><i></i></span><div class="md-cap"><b>' +
        esc(d.title) +
        "</b>" +
        (d.duration ? "<small>" + esc(d.duration) + "</small>" : "") +
        "</div></div>"
      );
    },
  },
};
var SUB_ORDER = ["stat", "highlight", "iconCard", "quote", "proof", "text", "bullets", "image", "miniCta", "compare", "ring", "bars", "timeline", "markets", "person", "badge", "media"];
var ROW_LAYOUTS = {
  1: ["1fr"],
  2: ["1fr", "1fr"],
  "2-1": ["2fr", "1fr"],
  "1-2": ["1fr", "2fr"],
  3: ["1fr", "1fr", "1fr"],
  4: ["1fr", "1fr", "1fr", "1fr"],
};
function mkSlot(kind, over) {
  var d = SUBS[kind].def();
  if (over) for (var k in over) d[k] = over[k];
  return { id: uid(), kind: kind, data: d };
}
function fitSlots(d) {
  var n = ROW_LAYOUTS[d.layout].length;
  while (d.slots.length < n) d.slots.push(mkSlot(SUB_ORDER[d.slots.length % SUB_ORDER.length]));
  return d;
}
MODULES.row = {
  name: "Flexible row",
  group: "Compose",
  vk: "layout",
  desc: "1–4 slots; drop any sub-module in each and switch it live.",
  fields: [
    {
      k: "layout",
      l: "Columns",
      t: "select",
      o: [
        ["1", "One, full width"],
        ["2", "Two, equal"],
        ["2-1", "Two, wide then narrow"],
        ["1-2", "Two, narrow then wide"],
        ["3", "Three, equal"],
        ["4", "Four, equal"],
      ],
    },
    {
      k: "align",
      l: "Height",
      t: "select",
      o: [
        ["stretch", "Equal heights"],
        ["start", "Natural heights"],
      ],
    },
  ],
  def: function () {
    return { layout: "3", align: "stretch", slots: [mkSlot("stat"), mkSlot("quote"), mkSlot("proof")] };
  },
  render: function (d, ctx) {
    fitSlots(d);
    var cols = ROW_LAYOUTS[d.layout] || ROW_LAYOUTS["3"];
    return (
      '<section class="sec' +
      (ctx.afterHero ? " overlap" : "") +
      '"><div class="flexrow" style="grid-template-columns:' +
      cols.join(" ") +
      ";align-items:" +
      (d.align === "start" ? "start" : "stretch") +
      '">' +
      cols
        .map(function (c, i) {
          var s = d.slots[i];
          var sub = SUBS[s.kind] || SUBS.text;
          return (
            '<div class="slot' +
            (ctx.selSlot === i ? " sel" : "") +
            '" data-slot="' +
            i +
            '"><span class="slottag">' +
            esc(sub.name) +
            "</span>" +
            sub.render(s.data) +
            "</div>"
          );
        })
        .join("") +
      "</div></section>"
    );
  },
};

function mk(type, over) {
  var d = MODULES[type].def();
  if (over) for (var k in over) d[k] = over[k];
  return { id: uid(), type: type, data: d };
}

// Ported render-only definitions: 22-engine-formats-reflow.js
/* ---------- formats ---------- */
var FORMATS = [
  { id: "letter", n: "US Letter", w: 816, h: 1056, print: true },
  { id: "a4", n: "A4", w: 794, h: 1123, print: true },
  { id: "slide", n: "16:9 slide", w: 1920, h: 1080 },
  { id: "square", n: "Square post (Instagram, LinkedIn)", w: 1080, h: 1080 },
  { id: "portrait", n: "Portrait post (Instagram)", w: 1080, h: 1350 },
  { id: "story", n: "Story / Reel", w: 1080, h: 1920 },
  { id: "linkedin", n: "LinkedIn / Facebook link", w: 1200, h: 627 },
  { id: "x", n: "X post", w: 1600, h: 900 },
  { id: "email", n: "Email header", w: 600, h: 200 },
  { id: "mrec", n: "Medium rectangle", w: 300, h: 250 },
  { id: "halfpage", n: "Half page", w: 300, h: 600 },
  { id: "leaderboard", n: "Leaderboard", w: 728, h: 90 },
  { id: "billboard", n: "Billboard", w: 970, h: 250 },
  { id: "mobile", n: "Mobile banner", w: 320, h: 50 },
];
function fmtById(id) {
  for (var i = 0; i < FORMATS.length; i++) if (FORMATS[i].id === id) return FORMATS[i];
  return FORMATS[0];
}

/* derive the social/ad content from the module stack */
function derive(mods) {
  FXP = null;
  var c = {
    eyebrow: "",
    title: "",
    short: "",
    lead: "",
    stats: [],
    quote: "",
    attribution: "",
    cta: MODULES.cta.def(),
  };
  mods.forEach(function (m) {
    var d = m.data;
    if (m.type === "hero" && !c.title) {
      // (the hero's kind label, "Case study" or "Solution brief", is not said on any size: c.eyebrow stays empty)
      c.title = d.title;
      c.short = d.short || autoShort(d.title);
      c.lead = d.lead;
      if (d.layout && d.layout !== "text" && hasImg(d.photo))
        c.photo = { photo: d.photo, overlay: d.overlay || "navy", strength: d.overlayStrength, ovOn: d.layout === "full" && d.overlay !== "none" };
    }
    if (["kpis", "stats", "quoteStats", "expert"].indexOf(m.type) >= 0 && !c.stats.length)
      c.stats = d.items.map(function (i) {
        return { value: i.value, caption: i.caption };
      });
    if (m.type === "dataChart" && !c.stats.length)
      c.stats = (d.items || []).map(function (i) {
        return { value: String(i.value || "") + (String(d.unit || "").trim() === "%" ? "%" : ""), caption: i.label };
      });
    if (m.type === "comparison" && !c.stats.length)
      c.stats = (d.rows || []).map(function (r) {
        return { value: r.a + " → " + r.b, caption: r.label };
      });
    if (m.type === "numbersGrid" && !c.stats.length)
      c.stats = (d.items || []).map(function (i) {
        return { value: i.value, caption: i.label };
      });
    if (m.type === "bigMetric" && !c.stats.length) c.stats = [{ value: d.value, caption: d.caption }];
    if (m.type === "footprint" && !c.stats.length) c.stats = [{ value: d.value, caption: (d.unit || "") + (d.pill ? ", " + d.pill : "") }];
    if ((m.type === "quote" || m.type === "quoteStats") && !c.quote) {
      c.quote = d.quote;
      c.attribution = d.attribution;
    }
    if (m.type === "row")
      d.slots.forEach(function (s) {
        if (!c.stats.length) {
          // every numeric piece can supply the headline stat for social and ad sizes
          var sd = s.data;
          if (s.kind === "stat" || s.kind === "highlight") c.stats = [{ value: sd.value, caption: sd.caption }];
          else if (s.kind === "compare") c.stats = [{ value: sd.after, caption: sd.label + ", down from " + sd.before }];
          else if (s.kind === "ring") c.stats = [{ value: (+sd.value || 0) + "%", caption: sd.caption }];
          else if (s.kind === "markets") c.stats = [{ value: sd.value, caption: sd.caption }];
          else if (s.kind === "bars" && sd.items && sd.items.length) {
            var last = sd.items[sd.items.length - 1];
            c.stats = [{ value: String(+last.value || 0) + (sd.unit || ""), caption: sd.title + ", " + last.label.toLowerCase() }];
          }
        }
        if (s.kind === "quote" && !c.quote) {
          c.quote = s.data.quote;
          c.attribution = s.data.attribution;
        }
      });
    if (m.type === "cta") c.cta = d;
  });
  // no usable hero photo: the first photo added anywhere else in the piece (cover, story row, divider, portrait, a slot) leads the social and ad sizes
  if (!c.photo) {
    var found = null,
      skipHero = function (m) { return m.type === "hero"; };
    var seek = function (o, depth) {
      if (found || !o || typeof o !== "object" || depth > 5) return;
      if (hasImg(o.photo)) { found = o; return; }
      Object.keys(o).forEach(function (k) {
        if (k !== "photo") seek(o[k], depth + 1);
      });
    };
    mods.forEach(function (m) {
      if (!found && !skipHero(m)) seek(m.data, 0);
    });
    if (found) c.photo = { photo: found.photo, overlay: found.overlay || "navy", strength: found.overlayStrength };
  }
  // social and ad sizes show numbers only: a stat that's a word ("Lower", "Real time") stays on the page
  c.stats = c.stats.filter(function (s) {
    return /[\d\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF]/.test(String(s.value == null ? "" : s.value));
  });
  c.hs = c.stats.length
    ? c.stats
        .map(function (s, i) {
          return [statScore(s.value), -i, s];
        })
        .sort(function (a, b) {
          return b[0] - a[0] || b[1] - a[1];
        })[0][2]
    : { value: "", caption: "" };
  NOSTAT = !c.stats.length;
  if (!c.stats.length) c.stats = [{ value: "", caption: "" }];
  FXP = c.photo || null;
  return c;
}
/* how strong a figure reads as the one number on a post or ad */
function statScore(v) {
  v = String(v == null ? "" : v).trim().replace(/[\u0660-\u0669]/g, function (d) { return d.charCodeAt(0) - 0x660; }).replace(/[\u06F0-\u06F9]/g, function (d) { return d.charCodeAt(0) - 0x6f0; }).replace(/[\u0966-\u096F]/g, function (d) { return d.charCodeAt(0) - 0x966; }).replace(/[\u09E6-\u09EF]/g, function (d) { return d.charCodeAt(0) - 0x9e6; }).replace(/\u066A/g, "%");
  var s = 0;
  if (/[%×x$€£+]|\b(k|m|bn|million|billion)\b/i.test(v)) s += 3;
  if (/^(19|20)\d\d$/.test(v)) s -= 3; // a year
  if (/^\d$/.test(v)) s -= 2; // a bare single digit
  var n = parseFloat(v.replace(/[^\d.]/g, ""));
  if (n >= 10) s += 1;
  if (v.length > 9) s -= 2; // too long for the big number
  return s;
}
/* a social and ad headline from a long title: the phrase before a colon or dash, when it stands alone */
function autoShort(t) {
  t = String(t || "");
  if (t.length <= 60) return t;
  var m = /^(.{12,60}?)\s*(?::|\s[—–-]\s|\s\|\s)/.exec(t);
  return m ? m[1] : t;
}
var NOSTAT = false;
function pillS(c, s, al) {
  return (
    '<span class="pill" style="font-size:' +
    s +
    "px;padding:.45em 1.2em;border-width:" +
    Math.max(1.5, s / 14) +
    "px;flex-shrink:0;align-self:" +
    (al || "flex-start") +
    '">' +
    esc(c.cta.button) +
    "</span>"
  );
}
function glw(h) {
  var src = FXP ? LOGO.glWhite : LOGO.glRev;
  var ar = logoAR(src) || LOGO_AR.gl;
  // a wider wordmark gets a little less height so every brand reads at the same weight
  var hh = h * Math.min(1.25, Math.max(0.72, Math.sqrt(LOGO_AR.gl / ar)));
  return (
    '<img src="' +
    src +
    '" alt="GlobalLink" style="height:' +
    hh.toFixed(1) +
    "px;width:" +
    (hh * ar).toFixed(1) +
    'px;display:block;flex-shrink:0" data-logo>'
  );
}
/* a logo's width ÷ height from its SVG viewBox (data URI), cached */
var LOGO_AR_CACHE = {};
function logoAR(src) {
  if (!src) return 0;
  if (LOGO_AR_CACHE[src] !== undefined) return LOGO_AR_CACHE[src];
  var ar = 0;
  try {
    /* a drawing arrives three ways: base64, percent-encoded, or the markup itself */
    var m = /^data:image\/svg\+xml([^,]*),(.*)$/.exec(src);
    var svg = m ? (/;base64/i.test(m[1]) ? atob(m[2]) : decodeURIComponent(m[2])) : src.charAt(0) === "<" ? src : "";
    var vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(svg);
    if (vb && +vb[2]) ar = +vb[1] / +vb[2];
  } catch (e) {}
  return (LOGO_AR_CACHE[src] = ar);
}
/* logo boxes are sized from the SVG viewBox, so layout never depends on image decode timing */
var LOGO_AR = { gl: 607.46 / 122.51, mark: 122 / 122.51 };
var FXP = null;
/* the brand's mark for the smallest banners; its wordmark when it has no mark */
function smallMark(hh) {
  if (LOGO.markRev) return '<img src="' + LOGO.markRev + '" alt="" style="height:' + hh + "px;width:" + (hh * LOGO_AR.mark).toFixed(1) + 'px;flex-shrink:0" data-logo>';
  var src = FXP ? LOGO.glWhite : LOGO.glRev;
  var ar = logoAR(src) || LOGO_AR.gl;
  var h2 = Math.min(hh * 0.62, 64 / ar);
  return '<img src="' + src + '" alt="" style="height:' + h2.toFixed(1) + "px;width:" + (h2 * ar).toFixed(1) + 'px;flex-shrink:0" data-logo>';
}
function fx(f, pad, inner) {
  var bg = "";
  if (FXP) {
    var tall = f.h >= f.w * 0.8;
    var ph = FXP.photo;
    // tall sizes put the headline at the top: the subject sits lower unless it was placed on purpose
    if (tall && ph && (ph.fy == null || +ph.fy === 50)) ph = Object.assign({}, ph, { fy: 68 });
    // the photo shows as it is; a darkening only when the editor asks for one (full-bleed hero with an overlay)
    bg =
      photoImg(ph, "fxbg") +
      (FXP.ovOn
        ? '<div class="fxov fxov-on" style="background:' +
          overlayCss(FXP.overlay === "white" ? "navy" : FXP.overlay, FXP.strength == null ? 60 : FXP.strength, f.w >= f.h * 1.3 ? "left" : "bottom") +
          '"></div>'
        : "");
  }
  return (
    '<div class="gl fx' +
    (FXP ? " has-photo" : "") +
    (NOSTAT ? " nostat" : "") +
    '"' +
    langAttrs() +
    ' style="width:' +
    f.w +
    "px;height:" +
    f.h +
    "px;padding:" +
    pad +
    '">' +
    bg +
    inner +
    "</div>"
  );
}
function bottom(c, ps, lh, mt) {
  return (
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:' +
    (mt || 0) +
    'px">' +
    pillS(c, ps) +
    glw(lh) +
    "</div>"
  );
}
var REFLOW = {
  slide: function (c, f) {
    return fx(
      f,
      "110px 120px",
      '<p class="ey" style="font-size:26px;margin:0">' +
        esc(c.eyebrow) +
        '</p><h1 style="font-size:84px;line-height:1.05;margin:36px 0 0;max-width:1180px">' +
        esc(c.title) +
        '</h1><p style="font-size:34px;line-height:1.4;max-width:1040px;margin:32px 0 0">' +
        esc(c.lead) +
        (NOSTAT ? "" : '</p><div style="margin-top:auto;display:flex;background:var(--white);color:var(--navy);border-radius:24px;padding:34px 0">') +
        (NOSTAT ? "</p>" : "") +
        c.stats
          .slice(0, 4)
          .map(function (k, i) {
            return (
              '<div style="flex:1;padding:0 44px;' +
              (i ? "border-left:2px solid var(--rule)" : "") +
              '"><div style="font-weight:700;font-size:58px;line-height:1.1;color:var(--cobalt)">' +
              esc(k.value) +
              '</div><div style="font-size:26px;margin-top:6px">' +
              esc(k.caption) +
              "</div></div>"
            );
          })
          .join("") +
        '</div><div style="position:absolute;inset-inline-end:120px;top:110px">' +
        glw(64) +
        "</div>",
    );
  },
  square: function (c, f) {
    return fx(
      f,
      "88px",
      '<p class="ey" style="font-size:24px;margin:0">' +
        esc(c.eyebrow) +
        '</p><h1 style="font-size:66px;line-height:1.08;margin:40px 0 0;max-width:880px">' +
        esc(c.short) +
        '</h1><div style="margin-top:auto"><div class="big" style="font-size:' +
        (c.hs.value.length > 6 ? 130 : 210) +
        'px">' +
        esc(c.hs.value) +
        '</div><div style="font-size:34px;margin-top:14px">' +
        esc(c.hs.caption) +
        "</div></div>" +
        bottom(c, 30, 52, 64),
    );
  },
  portrait: function (c, f) {
    return fx(
      f,
      "96px 88px",
      '<p class="ey" style="font-size:24px;margin:0">' +
        esc(c.eyebrow) +
        '</p><h1 style="font-size:72px;line-height:1.06;margin:40px 0 0">' +
        esc(c.short) +
        '</h1><div style="margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:40px">' +
        c.stats
          .slice(0, 2)
          .map(function (k) {
            return (
              '<div><div class="big" style="font-size:' +
              (k.value.length > 6 ? 60 : 96) +
              'px">' +
              esc(k.value) +
              '</div><div style="font-size:28px;margin-top:10px">' +
              esc(k.caption) +
              "</div></div>"
            );
          })
          .join("") +
        "</div>" +
        (c.quote
          ? '<p class="t-quote" style="font-size:32px;line-height:1.35;margin:60px 0 0">' +
            QO() +
            esc(unq(c.quote)) +
            QC() +
            "</p>"
          : "") +
        bottom(c, 30, 52, 60),
    );
  },
  story: function (c, f) {
    return fx(
      f,
      "250px 88px 340px",
      '<p class="ey" style="font-size:26px;margin:0">' +
        esc(c.eyebrow) +
        '</p><h1 style="font-size:76px;line-height:1.06;margin:36px 0 0">' +
        esc(c.short) +
        // stats sit in the middle of the free space (no dead band), all at one size
        '</h1><div style="margin:auto 0;display:flex;flex-direction:column;gap:44px">' +
        c.stats
          .slice(0, 3)
          .map(function (k, i, all) {
            return (
              '<div><div class="big" style="font-size:' +
              (all.some(function (x) { return String(x.value).length > 6; }) ? 70 : 96) +
              'px">' +
              esc(k.value) +
              '</div><div style="font-size:34px;margin-top:10px">' +
              esc(k.caption) +
              "</div></div>"
            );
          })
          .join("") +
        "</div>" +
        bottom(c, 34, 58, 90),
    );
  },
  linkedin: function (c, f) {
    return fx(
      f,
      "64px 72px",
      '<div style="display:flex;gap:56px;align-items:center;flex:1"><div style="flex:1.4"><p class="ey" style="font-size:18px;margin:0">' +
        esc(c.eyebrow) +
        '</p><h1 style="font-size:52px;line-height:1.08;margin:22px 0 0">' +
        esc(c.short) +
        '</h1></div><div style="flex:1"><div class="big" style="font-size:' +
        (c.hs.value.length > 6 ? 80 : 150) +
        'px">' +
        esc(c.hs.value) +
        '</div><div style="font-size:24px;margin-top:8px">' +
        esc(c.hs.caption) +
        "</div></div></div>" +
        bottom(c, 22, 40),
    );
  },
  x: function (c, f) {
    return fx(
      f,
      "84px 96px",
      '<div style="display:flex;gap:72px;align-items:center;flex:1"><div style="flex:1.4"><p class="ey" style="font-size:24px;margin:0">' +
        esc(c.eyebrow) +
        '</p><h1 style="font-size:70px;line-height:1.08;margin:28px 0 0">' +
        esc(c.short) +
        '</h1></div><div style="flex:1"><div class="big" style="font-size:' +
        (c.hs.value.length > 6 ? 110 : 200) +
        'px">' +
        esc(c.hs.value) +
        '</div><div style="font-size:32px;margin-top:10px">' +
        esc(c.hs.caption) +
        "</div></div></div>" +
        bottom(c, 28, 52),
    );
  },
  email: function (c, f) {
    return fx(
      f,
      "0 36px",
      '<div style="display:flex;align-items:center;gap:24px;height:100%"><div style="flex:1"><div style="font-weight:700;font-size:26px;line-height:1.15">' +
        esc(c.short) +
        '</div><div style="font-size:13px;margin-top:6px">' +
        esc(c.cta.title) +
        "</div></div>" +
        pillS(c, 14, "center") +
        "</div>",
    );
  },
  mrec: function (c, f) {
    return fx(
      f,
      "20px",
      '<div style="font-weight:700;font-size:21px;line-height:1.15">' +
        esc(c.short) +
        '</div><div class="big" style="font-size:' +
        (c.hs.value.length > 6 ? 30 : 54) +
        'px;margin-top:auto">' +
        esc(c.hs.value) +
        '</div><div style="font-size:11px;margin-top:4px">' +
        esc(c.hs.caption) +
        '</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">' +
        pillS(c, 11, "center") +
        glw(18) +
        "</div>",
    );
  },
  halfpage: function (c, f) {
    return fx(
      f,
      "28px 24px",
      '<p class="ey" style="font-size:11px;margin:0">' +
        esc(c.eyebrow) +
        '</p><div style="font-weight:700;font-size:28px;line-height:1.12;margin-top:14px">' +
        esc(c.short) +
        '</div><div style="margin:auto 0;display:flex;flex-direction:column;gap:18px">' +
        c.stats
          .slice(0, 2)
          .map(function (k, i, all) {
            return (
              '<div><div class="big" style="font-size:' +
              (all.some(function (x) { return String(x.value).length > 6; }) ? 38 : 48) +
              'px">' +
              esc(k.value) +
              '</div><div style="font-size:12px;margin-top:4px">' +
              esc(k.caption) +
              "</div></div>"
            );
          })
          .join("") +
        '</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px">' +
        pillS(c, 12, "center") +
        glw(18) +
        "</div>",
    );
  },
  leaderboard: function (c, f) {
    return fx(
      f,
      "0 24px",
      '<div style="display:flex;align-items:center;gap:20px;height:100%">' +
        glw(22) +
        '<div style="flex:1;font-weight:700;font-size:18px;line-height:1.2">' +
        esc(c.short) +
        "</div>" +
        (c.hs.value && !new RegExp("(^|[^\\w])" + String(c.hs.value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^\\w])").test(String(c.short))
          ? '<div style="flex:none;padding-left:20px;border-left:1px solid rgba(255,255,255,.28);font-weight:700;font-size:26px;line-height:1;color:var(--light-sky)">' + esc(c.hs.value) + "</div>"
          : "") +
        pillS(c, 12, "center") +
        "</div>",
    );
  },
  billboard: function (c, f) {
    return fx(
      f,
      "0 48px",
      '<div style="display:flex;align-items:center;gap:40px;height:100%"><div style="flex:1.5"><p class="ey" style="font-size:13px;margin:0">' +
        esc(c.eyebrow) +
        '</p><div style="font-weight:700;font-size:34px;line-height:1.1;margin-top:10px">' +
        esc(c.short) +
        '</div></div><div><div class="big" style="font-size:' +
        (c.hs.value.length > 6 ? 40 : 72) +
        'px">' +
        esc(c.hs.value) +
        '</div><div style="font-size:13px;margin-top:4px">' +
        esc(c.hs.caption) +
        '</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:18px">' +
        glw(26) +
        pillS(c, 15, "flex-end") +
        "</div></div>",
    );
  },
  mobile: function (c, f) {
    return fx(
      f,
      "0 12px",
      '<div style="display:flex;align-items:center;gap:10px;height:100%">' +
        smallMark(26) +
        '<div style="flex:1;min-width:0;font-weight:700;font-size:12.5px;line-height:1.15;text-wrap:balance">' +
        esc(c.short.length <= 35 ? c.short : c.cta.title) +
        "</div>" +
        pillS(c, 11, "center") +
        "</div>",
    );
  },
};

// Ported render-only definitions: 26-engine-lang.js
var LANGS = [
  // code, English name, native name, dir, opening quote, closing quote
  ["en", "English", "English", "ltr", "“", "”"],
  ["en-GB", "English (UK)", "English (UK)", "ltr", "‘", "’"],
  ["de", "German", "Deutsch", "ltr", "„", "“"],
  ["fr", "French", "Français", "ltr", "« ", " »"],
  ["es", "Spanish", "Español", "ltr", "«", "»"],
  ["it", "Italian", "Italiano", "ltr", "«", "»"],
  ["pt-BR", "Portuguese (Brazil)", "Português (Brasil)", "ltr", "“", "”"],
  ["pt-PT", "Portuguese (Portugal)", "Português (Portugal)", "ltr", "«", "»"],
  ["nl", "Dutch", "Nederlands", "ltr", "“", "”"],
  ["sv", "Swedish", "Svenska", "ltr", "”", "”"],
  ["pl", "Polish", "Polski", "ltr", "„", "”"],
  ["tr", "Turkish", "Türkçe", "ltr", "“", "”"],
  ["ru", "Russian", "Русский", "ltr", "«", "»"],
  ["ja", "Japanese", "日本語", "ltr", "「", "」"],
  ["zh-Hans", "Chinese (Simplified)", "简体中文", "ltr", "“", "”"],
  ["zh-Hant", "Chinese (Traditional)", "繁體中文", "ltr", "「", "」"],
  ["ko", "Korean", "한국어", "ltr", "“", "”"],
  ["ar", "Arabic", "العربية", "rtl", "«", "»"],
  ["he", "Hebrew", "עברית", "rtl", "“", "”"],
  ["th", "Thai", "ไทย", "ltr", "“", "”"],
  // the rest of ELEMENT's language list
  ["cs", "Czech", "Čeština", "ltr", "„", "“"],
  ["da", "Danish", "Dansk", "ltr", "»", "«"],
  ["fi", "Finnish", "Suomi", "ltr", "”", "”"],
  ["no", "Norwegian", "Norsk", "ltr", "«", "»"],
  ["uk", "Ukrainian", "Українська", "ltr", "«", "»"],
  ["fa", "Persian", "فارسی", "rtl", "«", "»"],
  ["ur", "Urdu", "اردو", "rtl", "“", "”"],
  ["vi", "Vietnamese", "Tiếng Việt", "ltr", "“", "”"],
  ["id", "Indonesian", "Bahasa Indonesia", "ltr", "“", "”"],
  ["ms", "Malay", "Bahasa Melayu", "ltr", "“", "”"],
  ["hi", "Hindi", "हिन्दी", "ltr", "“", "”"],
  ["bn", "Bengali", "বাংলা", "ltr", "“", "”"],
  ["ta", "Tamil", "தமிழ்", "ltr", "“", "”"],
  ["el", "Greek", "Ελληνικά", "ltr", "«", "»"],
  ["ro", "Romanian", "Română", "ltr", "„", "”"],
  ["hu", "Hungarian", "Magyar", "ltr", "„", "”"],
  ["bg", "Bulgarian", "Български", "ltr", "„", "“"],
  ["sk", "Slovak", "Slovenčina", "ltr", "„", "“"],
  ["sl", "Slovenian", "Slovenščina", "ltr", "„", "“"],
  ["hr", "Croatian", "Hrvatski", "ltr", "„", "”"],
  ["sr", "Serbian", "Srpski", "ltr", "„", "”"],
  ["et", "Estonian", "Eesti", "ltr", "„", "“"],
  ["lv", "Latvian", "Latviešu", "ltr", "„", "“"],
  ["lt", "Lithuanian", "Lietuvių", "ltr", "„", "“"],
];
var LANG_CTX = "en";
function langInfo(code) {
  code = String(code || "en").trim().replace(/_/g, "-");
  var lc = code.toLowerCase();
  for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0].toLowerCase() === lc) return LANGS[i];
  // the codes translation tools write: zh-TW/HK/MO are Traditional, nb/nn Norwegian
  if (/^zh-(tw|hk|mo|hant)\b/.test(lc)) lc = "zh-hant";
  else if (/^zh\b/.test(lc)) lc = "zh-hans";
  else if (/^(nb|nn)\b/.test(lc)) lc = "no";
  for (var k = 0; k < LANGS.length; k++) if (LANGS[k][0].toLowerCase() === lc) return LANGS[k];
  var base = lc.split("-")[0];
  for (var j = 0; j < LANGS.length; j++) if (LANGS[j][0].toLowerCase().split("-")[0] === base) return LANGS[j];
  return LANGS[0];
}
function langAttrs(code) {
  var L = langInfo(code || LANG_CTX);
  return ' lang="' + esc(L[0]) + '" dir="' + L[3] + '"';
}
function isRTL(code) {
  return langInfo(code || LANG_CTX)[3] === "rtl";
}
function QO() {
  return esc(langInfo(LANG_CTX)[4]);
}
/* the decorative quote mark above a quote: the language's opening mark, unless that mark sits on the
   baseline (German „, Polish „), which would print into the first line; then its closing mark */
function QM() {
  var o = langInfo(LANG_CTX)[4].trim();
  return esc(/^[„‚]$/.test(o) ? langInfo(LANG_CTX)[5].trim() : o);
}
function QC() {
  return esc(langInfo(LANG_CTX)[5]);
}
/* quote text without the marks someone already typed around it (the layout adds the right ones) */
function unq(s) {
  return String(s == null ? "" : s).replace(/^[\s"'“”„«»‹›「」『』‘’‚]+|[\s"'“”„«»‹›「」『』‘’‚]+$/g, "");
}
/* display form of a language code: "ZH-Hans", "PT-BR", "DE" */
function langCode(code) {
  var p = String(code || "en").split("-");
  return p[0].toUpperCase() + (p[1] ? "-" + (p[1].length === 2 ? p[1].toUpperCase() : p[1]) : "");
}
function withLang(code, fn) {
  var prev = LANG_CTX;
  LANG_CTX = code || "en";
  try {
    return fn();
  } finally {
    LANG_CTX = prev;
  }
}
/* how much room text takes: graphemes (so Arabic vowel marks and emoji count once), with full-width
   CJK characters counting double, the way they set */
var SEG = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
var WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;
function textWidth(s) {
  s = String(s || "");
  var n = 0;
  if (SEG) {
    var it = SEG.segment(s)[Symbol.iterator](),
      r;
    while (!(r = it.next()).done) n += WIDE.test(r.value.segment) ? 2 : 1;
    return n;
  }
  return s.length;
}

// Ported render-only definitions: 27-engine-deck.js
/* ---------- corporate deck modules ----------
   Sections built from TransPerfect's corporate deck (Deck No.3): the same Geist type and navy ink, plus the
   deck's own layer: the teal → blue → violet spectrum on numerals and accent words, soft lavender washes,
   white cards with hairline borders, small tracked labels, checklists, steppers and the dotted world map.
   Each module reads well on its own page section and feeds the social and ad sizes like the other proof
   modules (its first figures become the headline stat). */
var DECK_TONES = [
  ["teal", "Teal"],
  ["blue", "Blue"],
  ["violet", "Violet"],
];
/* words of the title to set in the spectrum gradient (must appear in the title) */
function deckTitle(title, accent, cls) {
  var t = esc(title || "");
  if (accent && String(title || "").indexOf(accent) >= 0) t = t.replace(esc(accent), function () { return '<span class="dk-grad">' + esc(accent) + "</span>"; });
  return '<h2 class="dk-title ' + (cls || "") + '">' + t + "</h2>";
}
function deckEyebrow(s) {
  return s ? '<p class="dk-eye">' + esc(s) + "</p>" : "";
}
function deckLines(s) {
  return String(s || "")
    .split(/\n|;/)
    .map(function (x) {
      return x.trim();
    })
    .filter(Boolean);
}
function deckCheck(items) {
  return (
    '<ul class="dk-check">' +
    items
      .map(function (x) {
        return "<li>" + ic("check-circle-2") + "<span>" + esc(x) + "</span></li>";
      })
      .join("") +
    "</ul>"
  );
}
var DECK_REGIONS = {
  // background position and size of the world map for each region (percent of the map)
  world: [100, 50, 78],
  na: [14, 28, 210],
  latam: [30, 92, 260],
  emea: [53, 34, 200],
  apac: [86, 56, 190],
};
Object.assign(MODULES, {
  numbersGrid: {
    name: "Numbers grid",
    group: "Corporate",
    vk: "variant",
    desc: "Big spectrum figures in a grid, with an optional platform card. From “Numbers that work for you”.",
    fields: [
      { k: "variant", l: "Style", t: "select", o: [["card", "Grid with platform card"], ["grid", "Grid only"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "accent", l: "Words in the spectrum gradient (copy them from the title)" },
      { k: "items", l: "Figures", t: "list", min: 2, max: 6, f: [{ k: "value", l: "Figure" }, { k: "label", l: "Label" }] },
      {
        k: "cardTitle",
        l: "Card title",
        when: function (d) {
          return d.variant !== "grid";
        },
      },
      {
        k: "card",
        l: "Card figures",
        t: "list",
        min: 2,
        max: 4,
        f: [{ k: "value", l: "Figure" }, { k: "label", l: "Label" }],
        when: function (d) {
          return d.variant !== "grid";
        },
      },
    ],
    def: function () {
      return {
        variant: "card",
        eyebrow: "24/7/365 local support",
        title: "Numbers that work for you",
        accent: "work for you",
        items: [
          { value: "10,000+", label: "TransPerfect employees" },
          { value: "150+", label: "Cities worldwide" },
          { value: "50+", label: "Countries" },
          { value: "6", label: "Continents" },
          { value: "10K+", label: "Executed deployments" },
          { value: "90%", label: "Agnostic AI marketplace" },
        ],
        cardTitle: "The World’s Only Global Performance Platform™",
        card: [
          { value: "90%", label: "Of Fortune 500 companies run on GlobalLink" },
          { value: "97%", label: "Of clients achieve ROI in 12 months" },
          { value: "6,000+", label: "Clients trust GlobalLink" },
          { value: "200+", label: "Full-time developers" },
        ],
      };
    },
    render: function (d) {
      var grid =
        '<div class="dk-ngrid">' +
        d.items
          .map(function (i) {
            return '<div class="dk-n"><div class="dk-big dk-grad">' + esc(i.value) + '</div><div class="dk-lab">' + esc(i.label) + "</div></div>";
          })
          .join("") +
        "</div>";
      var card =
        d.variant === "grid"
          ? ""
          : '<div class="dk-pcard"><div class="dk-pcard-h"><img src="' +
            LOGO.glWhite +
            '" alt="GlobalLink" data-logo style="height:16px;width:' +
            (16 * LOGO_AR.gl).toFixed(1) +
            'px"><p>' +
            esc(d.cardTitle) +
            "</p></div>" +
            (d.card || [])
              .map(function (i) {
                return '<div class="dk-pc"><b>' + esc(i.value) + "</b><span>" + esc(i.label) + "</span></div>";
              })
              .join("") +
            "</div>";
      return '<section class="sec dk dk-numbers' + (card ? " has-card" : "") + '"><div class="dk-col">' + deckEyebrow(d.eyebrow) + deckTitle(d.title, d.accent) + grid + "</div>" + card + "</section>";
    },
  },
  stages: {
    name: "Process stages",
    group: "Corporate",
    vk: "variant",
    desc: "Numbered stages with photos, checklists and a progress line. From “Three stages, end to end”.",
    fields: [
      { k: "variant", l: "Style", t: "select", o: [["columns", "Stages side by side"], ["focus", "One stage in focus"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      {
        k: "current",
        l: "Stage in focus",
        t: "select",
        o: [["1", "Stage 1"], ["2", "Stage 2"], ["3", "Stage 3"], ["4", "Stage 4"]],
        when: function (d) {
          return d.variant === "focus";
        },
      },
      {
        k: "items",
        l: "Stages",
        t: "list",
        min: 2,
        max: 4,
        f: [
          { k: "label", l: "Short name (on the progress line)" },
          { k: "title", l: "Stage title" },
          { k: "points", l: "Checklist (one per line)", t: "textarea" },
          { k: "photo", l: "Photo", t: "image" },
          { k: "tone", l: "Colour", t: "select", o: DECK_TONES },
        ],
      },
    ],
    def: function () {
      return {
        variant: "columns",
        current: "1",
        eyebrow: "Translation process",
        title: "Three stages, end to end",
        items: [
          { label: "Pre-flight", title: "Project analysis & pre-flight", points: "Timeline construction\nTranslation memory analysis\nGlossary & style guide creation", photo: null, tone: "teal" },
          { label: "Production", title: "Production", points: "Translations & review\nFormatting & layout\nPost-localization testing", photo: null, tone: "blue" },
          { label: "Post-production", title: "Post-production", points: "Client feedback\nQuality assurance assessment", photo: null, tone: "violet" },
        ],
      };
    },
    render: function (d) {
      var n = d.items.length;
      var pad = function (i) {
        return (i + 1 < 10 ? "0" : "") + (i + 1);
      };
      var tile = function (it, i, big) {
        return (
          '<div class="dk-tile' +
          (hasImg(it.photo) ? "" : " no-img") +
          " tone-" +
          esc(it.tone || "blue") +
          (big ? " big" : "") +
          '">' +
          (hasImg(it.photo) ? photoImg(it.photo, "ia-img") : '<span class="dk-tile-ph">' + ic("image") + "</span>") +
          '<span class="dk-num" aria-hidden="true">' +
          pad(i) +
          "</span></div>"
        );
      };
      var line =
        '<ol class="dk-steps" style="--n:' +
        n +
        '">' +
        d.items
          .map(function (it, i) {
            var on = d.variant === "focus" ? i === Math.min(n, Math.max(1, +d.current || 1)) - 1 : true;
            return '<li class="' + (on ? "on" : "") + '"><b>' + pad(i) + "</b> " + esc(it.label) + "</li>";
          })
          .join("") +
        "</ol>";
      if (d.variant === "focus" && n) {
        var k = Math.min(n, Math.max(1, +d.current || 1)) - 1,
          it = d.items[k];
        return (
          '<section class="sec dk dk-stage1"><div class="dk-s1"><div class="dk-col">' +
          deckEyebrow((d.eyebrow || "") + " · Stage " + (k + 1)) +
          '<h2 class="dk-title">' +
          esc(it.title) +
          "</h2>" +
          deckCheck(deckLines(it.points)) +
          "</div>" +
          tile(it, k, true) +
          "</div>" +
          '<p class="dk-of">Stage ' +
          pad(k) +
          " of " +
          pad(n - 1) +
          "</p>" +
          line +
          "</section>"
        );
      }
      return (
        '<section class="sec dk dk-stages">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        '</h2><div class="dk-scols" style="--n:' +
        n +
        '">' +
        d.items
          .map(function (it, i) {
            return '<div class="dk-scol">' + tile(it, i) + '<p class="dk-eye sm">Stage ' + pad(i) + '</p><h3 class="dk-st">' + esc(it.title) + "</h3>" + deckCheck(deckLines(it.points)) + "</div>";
          })
          .join("") +
        "</div>" +
        line +
        "</section>"
      );
    },
  },
  footprint: {
    name: "Global footprint",
    group: "Corporate",
    vk: "variant",
    desc: "Dotted world map with a big city count, the support pill and a city list, or a regional split.",
    fields: [
      { k: "variant", l: "Style", t: "select", o: [["list", "Map with city list"], ["split", "Map with regional split"]] },
      { k: "region", l: "Map focus", t: "select", o: [["world", "World"], ["na", "North America"], ["latam", "Latin America"], ["emea", "Europe, Middle East & Africa"], ["apac", "Asia-Pacific"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "value", l: "Figure" },
      { k: "unit", l: "Figure label" },
      { k: "pill", l: "Pill" },
      {
        k: "cities",
        l: "Cities (one per line or comma separated)",
        t: "textarea",
        when: function (d) {
          return d.variant !== "split";
        },
      },
      {
        k: "split",
        l: "Regions",
        t: "list",
        min: 2,
        max: 4,
        f: [{ k: "value", l: "Figure" }, { k: "label", l: "Region" }],
        when: function (d) {
          return d.variant === "split";
        },
      },
    ],
    def: function () {
      return {
        variant: "list",
        region: "world",
        eyebrow: "Global footprint",
        title: "Local teams, everywhere you sell",
        value: "150+",
        unit: "cities",
        pill: "24/7/365 local support",
        cities: "New York, London, Barcelona, Berlin, Dubai, Mumbai, Singapore, Shanghai, Seoul, Tokyo, Sydney, São Paulo, Mexico City, Toronto, Chicago, Boston",
        split: [
          { value: "60", label: "Americas" },
          { value: "74", label: "Europe, Middle East & Africa" },
          { value: "22", label: "Asia Pacific" },
        ],
      };
    },
    render: function (d) {
      var r = DECK_REGIONS[d.region] || DECK_REGIONS.world;
      var map = '<div class="dk-map" aria-hidden="true" style="background-image:url(' + DECK_MAP + ");background-position:" + r[0] + "% " + r[1] + "%;background-size:" + r[2] + '% auto"></div>';
      var head = '<div class="dk-fhead"><span class="dk-big dk-grad">' + esc(d.value) + '</span><span class="dk-unit">' + esc(d.unit) + (d.pill ? '<em class="dk-pill">' + esc(d.pill) + "</em>" : "") + "</span></div>";
      var body;
      if (d.variant === "split") {
        var tot = 0;
        (d.split || []).forEach(function (s) {
          tot += parseFloat(String(s.value).replace(/[^\d.]/g, "")) || 0;
        });
        body =
          '<div class="dk-split">' +
          (d.split || [])
            .map(function (s) {
              var v = parseFloat(String(s.value).replace(/[^\d.]/g, "")) || 0;
              return '<div><b class="dk-grad">' + esc(s.value) + '</b><i style="--w:' + (tot ? Math.max(8, Math.round((v / tot) * 100)) : 33) + '%"></i><span>' + esc(s.label) + "</span></div>";
            })
            .join("") +
          "</div>";
      } else {
        var cs = String(d.cities || "")
          .split(/\n|,/)
          .map(function (x) {
            return x.trim();
          })
          .filter(Boolean);
        body =
          '<div class="dk-cities">' +
          cs
            .map(function (c) {
              return "<span>" + esc(c) + "</span>";
            })
            .join("") +
          "</div>";
      }
      return '<section class="sec dk dk-foot">' + map + '<div class="dk-fin">' + deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>" + head + body + "</div></section>";
    },
  },
  bigMetric: {
    name: "Big metric",
    group: "Corporate",
    desc: "One headline figure with a before/after bar and a list of what drives it. From “−60% turnaround time”.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "value", l: "Figure" },
      { k: "caption", l: "What the figure means" },
      { k: "before", l: "Before (bar label)" },
      { k: "after", l: "After (bar label)" },
      { k: "ratio", l: "After as a share of before", t: "range", min: 10, max: 100, step: 5, unit: "%" },
      { k: "chips", l: "Outcomes (comma separated)" },
      { k: "items", l: "What drives it", t: "list", min: 2, max: 5, f: [{ k: "icon", l: "Icon", t: "icon" }, { k: "title", l: "Title" }, { k: "text", l: "Text" }] },
    ],
    def: function () {
      return {
        eyebrow: "GlobalLink AI",
        title: "The World’s Only Global Performance Platform™",
        value: "−60%",
        caption: "turnaround time with GlobalLink AI",
        before: "Standard workflow",
        after: "With GlobalLink AI",
        ratio: 40,
        chips: "Budgets optimized, Content generated, Faster delivery",
        items: [
          { icon: "sparkles", title: "AI tools", text: "Optimize budgets, generate content, cut turnaround by 60%" },
          { icon: "lock", title: "Secure files", text: "Secure file sharing and storage" },
          { icon: "refresh-cw", title: "Automation", text: "Automated translation for web, apps and more" },
          { icon: "users", title: "Personalization", text: "Personalized content at scale, online and at events" },
        ],
      };
    },
    render: function (d) {
      var chips = String(d.chips || "")
        .split(",")
        .map(function (x) {
          return x.trim();
        })
        .filter(Boolean);
      /* a figure with nothing to compare it with and no drivers beside it stands alone: no empty bars, and the layouts
         set the figure and its caption across the width instead of leaving half the module blank */
      var bars = !!(String(d.before || "").trim() || String(d.after || "").trim());
      var solo = !bars && !chips.length && !(d.items || []).length;
      return (
        '<section class="sec dk dk-metric"><div class="dk-col' + (solo ? " bm-solo" : "") + '">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title sm">' +
        esc(d.title) +
        '</h2><div class="dk-mega dk-grad">' +
        esc(d.value) +
        '</div><p class="dk-cap">' +
        esc(d.caption) +
        "</p>" +
        (bars
          ? '<div class="dk-bars"><div><span>' +
            esc(d.before) +
            '</span><i style="--w:100%"></i></div><div class="after"><span>' +
            esc(d.after) +
            '</span><i style="--w:' +
            Math.round(+d.ratio || 40) +
            '%"></i></div></div>'
          : "") +
        (chips.length
          ? '<div class="dk-chips">' +
            chips
              .map(function (c) {
                return "<span>" + esc(c) + "</span>";
              })
              .join("") +
            "</div>"
          : "") +
        '</div><ul class="dk-feats">' +
        d.items
          .map(function (i) {
            return '<li><span class="dk-ico">' + ic(i.icon) + '</span><div><p class="dk-eye sm">' + esc(i.title) + "</p><p>" + esc(i.text) + "</p></div></li>";
          })
          .join("") +
        "</ul></section>"
      );
    },
  },
  pillars: {
    name: "Photo pillars",
    group: "Corporate",
    desc: "Three tall photo cards washed in teal, blue and violet, each with a title, line and points. From “The power of AI”.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      {
        k: "items",
        l: "Pillars",
        t: "list",
        min: 2,
        max: 4,
        f: [
          { k: "title", l: "Title" },
          { k: "text", l: "Line" },
          { k: "points", l: "Points (one per line)", t: "textarea" },
          { k: "photo", l: "Photo", t: "image" },
          { k: "tone", l: "Colour", t: "select", o: DECK_TONES },
        ],
      },
    ],
    def: function () {
      return {
        eyebrow: "AI at TransPerfect",
        title: "TransPerfect brings you the power of AI",
        items: [
          { title: "Technology", text: "In-house R&D team gives you the power to personalize & scale", points: "Proprietary neural machine translation\nThird-party models & LLMs\nData security and privacy", photo: null, tone: "teal" },
          { title: "Services", text: "Client-powered feedback loop: we listen to what you want", points: "Human post-editing\nSpecialized AI consulting\nContent matrix development", photo: null, tone: "blue" },
          { title: "Products", text: "Performance reporting & ongoing improvement", points: "Standalone portal\nAI-powered workflows\nPlug-ins, APIs and integrations", photo: null, tone: "violet" },
        ],
      };
    },
    render: function (d) {
      return (
        '<section class="sec dk dk-pillars">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        '</h2><div class="dk-pcols" style="--n:' +
        d.items.length +
        '">' +
        d.items
          .map(function (it, i) {
            return (
              '<div class="dk-pil' +
              (hasImg(it.photo) ? "" : " no-img") +
              " tone-" +
              esc(it.tone || "blue") +
              '">' +
              (hasImg(it.photo) ? photoImg(it.photo, "ia-img") : "") +
              '<div class="dk-pil-in"><span class="dk-chip">0' +
              (i + 1) +
              '</span><h3>' +
              esc(it.title) +
              "</h3><p>" +
              esc(it.text) +
              "</p><ul>" +
              deckLines(it.points)
                .map(function (x) {
                  return "<li>" + esc(x) + "</li>";
                })
                .join("") +
              "</ul></div></div>"
            );
          })
          .join("") +
        "</div></section>"
      );
    },
  },
  hub: {
    name: "Hub and spoke",
    group: "Corporate",
    desc: "GlobalLink at the centre, with two lists of options feeding in. From the AI marketplace.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "intro", l: "Intro sentence", t: "textarea" },
      { k: "leftTitle", l: "Left list title" },
      { k: "left", l: "Left list (one per line)", t: "textarea" },
      { k: "rightTitle", l: "Right list title" },
      { k: "right", l: "Right list (one per line)", t: "textarea" },
    ],
    def: function () {
      return {
        eyebrow: "GlobalLink AI marketplace",
        title: "The tool that’s best for you",
        intro: "TransPerfect’s AI marketplace gives you the flexibility to use the tool that’s best for you.",
        leftTitle: "Neural MT",
        left: "TransPerfect\nMicrosoft\nDeepL\nAmazon",
        rightTitle: "LLMs",
        right: "OpenAI (GPT)\nAnthropic (Claude)\nGoogle (Gemini)\nBring your own",
      };
    },
    render: function (d) {
      var list = function (t, items, side) {
        return (
          '<div class="dk-hl ' +
          side +
          '"><p class="dk-eye sm">' +
          esc(t) +
          "</p>" +
          deckLines(items)
            .map(function (x) {
              return "<span>" + esc(x) + "</span>";
            })
            .join("") +
          "</div>"
        );
      };
      return (
        '<section class="sec dk dk-hub">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        "</h2>" +
        (d.intro ? '<p class="dk-intro">' + esc(d.intro) + "</p>" : "") +
        '<div class="dk-hubg">' +
        list(d.leftTitle, d.left, "l") +
        '<div class="dk-orb"><img src="' +
        LOGO.glWhite +
        '" alt="GlobalLink" data-logo style="height:18px;width:' +
        (18 * LOGO_AR.gl).toFixed(1) +
        'px"></div>' +
        list(d.rightTitle, d.right, "r") +
        "</div></section>"
      );
    },
  },
  pipeline: {
    name: "Pipeline",
    group: "Corporate",
    desc: "Numbered steps on a line, grouped under two brackets, ending on a highlighted result. From “AI + human-in-the-loop”.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "intro", l: "Intro sentence", t: "textarea" },
      { k: "groupA", l: "First bracket label" },
      { k: "splitAt", l: "Steps under the first bracket", t: "select", o: [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]] },
      { k: "groupB", l: "Second bracket label" },
      { k: "items", l: "Steps (the last one is the result)", t: "list", min: 3, max: 6, f: [{ k: "icon", l: "Icon", t: "icon" }, { k: "label", l: "Step" }] },
    ],
    def: function () {
      return {
        eyebrow: "How we work",
        title: "AI + human-in-the-loop",
        intro: "The speed and efficiency of AI combined with the precision and excellence of human intelligence.",
        groupA: "AI speed",
        splitAt: "2",
        groupB: "Human precision",
        items: [
          { icon: "database", label: "Leverage TM" },
          { icon: "sparkles", label: "AI empty segments" },
          { icon: "pen-line", label: "Human post-editing" },
          { icon: "file-check", label: "Human proofreading" },
          { icon: "send", label: "Client delivery" },
        ],
      };
    },
    render: function (d) {
      var n = d.items.length,
        a = Math.max(1, Math.min(n - 2, +d.splitAt || 2));
      var steps = d.items
        .map(function (it, i) {
          return '<li class="' + (i === n - 1 ? "end" : "") + '"><span class="dk-dot">' + ic(it.icon) + "</span><b>" + (i + 1) + "</b><span>" + esc(it.label) + "</span></li>";
        })
        .join("");
      return (
        '<section class="sec dk dk-pipe">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        "</h2>" +
        (d.intro ? '<p class="dk-intro">' + esc(d.intro) + "</p>" : "") +
        '<div class="dk-brk" style="--n:' +
        n +
        '"><span style="grid-column:1 / span ' +
        a +
        '">' +
        esc(d.groupA) +
        '</span><span class="b" style="grid-column:' +
        (a + 1) +
        " / span " +
        Math.max(1, n - 1 - a) +
        '">' +
        esc(d.groupB) +
        '</span></div><ol class="dk-pl" style="--n:' +
        n +
        '">' +
        steps +
        "</ol></section>"
      );
    },
  },
  logoWall: {
    name: "Logo wall",
    group: "Corporate",
    vk: "cols",
    desc: "Client or partner logos on white tiles. Upload each logo (with permission to use it).",
    fields: [
      { k: "cols", l: "Columns", t: "select", o: [["4", "4"], ["5", "5"], ["6", "6"]] },
      { k: "tone", l: "Logo colour", t: "select", o: [["color", "Original colours"], ["grey", "Greyscale"], ["white", "White on navy"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "logos", l: "Logos", t: "list", min: 1, max: 24, f: [{ k: "name", l: "Name (alt text)" }, { k: "photo", l: "Logo", t: "image", lib: true }] },
    ],
    def: function () {
      var l = [];
      for (var i = 0; i < 10; i++) l.push({ name: "Client " + (i + 1), photo: null });
      return { cols: "5", tone: "color", eyebrow: "Our clients", title: "The world runs on TransPerfect", logos: l };
    },
    render: function (d) {
      return (
        '<section class="sec dk dk-logos lt-' + esc(d.tone || "color") + '">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title c">' +
        esc(d.title) +
        '</h2><div class="dk-lg" style="--c:' +
        (+d.cols || 5) +
        '">' +
        d.logos
          .map(function (l) {
            return '<div class="dk-lt">' + (hasImg(l.photo) ? photoImg(l.photo, "ia-img fit-contain").replace('alt=""', function () { return 'alt="' + esc(l.name) + '"'; }) : "<span>" + esc(l.name) + "</span>") + "</div>";
          })
          .join("") +
        "</div></section>"
      );
    },
  },
});
GROUPS.splice(GROUPS.indexOf("Proof") + 1, 0, "Corporate");

// Ported render-only definitions: 29-engine-advance.js
/* ================= design advancements, batch A =================
   Every one of these is an option: a material or a module drawn before they existed renders exactly as it
   did. In this file (the engine): the fields, the data they add and the markup; the classes they put on
   the page are styled in canvas.css (digital surfaces and the print system each in their own voice).
   1. Icon style on the proof modules: disc (as before), chip (a tinted, hairlined rounded square the icon
      sits on, also on print pages where the print system otherwise strips icons) or none.
   2. Delta badges: a short "which way it moved" badge after a figure (↓ 89%, ✓ on budget), on the KPI trio,
      the stat strip and the numbers grid.
   3. Display numerals on the story rows' numbered variant: 01 / 02 / 03 set large in a quiet tint.
   4. Pull quote: a quote band variant that gives the one line that carries the story the whole width, a
      spectrum quotation mark and a portrait or logo with the attribution.
   5. Stat rings: a stat strip variant that draws percentages as arcs.
   6. Spectrum rules: a material-level accent style where the flat rules become the signature gradient
      (digital surfaces; the print system keeps its flat division rule in two tones).                     */
var ICON_STYLE_MODULES = ["capabilities", "features", "kpis", "stats", "expert", "quote", "storyRows", "storyColumns"];
var ICON_STYLE_FIELD = { k: "iconStyle", l: "Icons", t: "select", opt: true, o: [["disc", "On a disc"], ["chip", "On a chip"], ["none", "No icons"]] };
ICON_STYLE_MODULES.forEach(function (k) {
  var d = MODULES[k];
  if (!d) return;
  /* story rows carry no icon on the Spectrum look (a colour bar instead), so the choice is not offered there:
     a control that changes nothing reads as broken */
  if (k === "storyRows") {
    var own = {};
    Object.keys(ICON_STYLE_FIELD).forEach(function (x) { own[x] = ICON_STYLE_FIELD[x]; });
    own.when = function () { return !(typeof spxOn === "function" && spxOn()); };
    d.fields = (d.fields || []).concat([own]);
    return;
  }
  d.fields = (d.fields || []).concat([ICON_STYLE_FIELD]);
});
function iconStyleClass(data) {
  var s = data && data.iconStyle;
  return s === "chip" || s === "none" ? " ic-" + s : "";
}
/* ---------- 2. delta badges ---------- */
var DELTA_FIELD = { k: "delta", l: "Change badge (e.g. ↓ 89%, ✓ on budget)", opt: true };
function deltaField(k, listKey) {
  var d = MODULES[k];
  if (!d) return;
  (d.fields || []).forEach(function (f) {
    if (f.k === listKey && f.t === "list" && f.f && !f.f.some(function (x) { return x.k === "delta"; })) f.f.push(DELTA_FIELD);
  });
}
deltaField("kpis", "items");
deltaField("stats", "items");
deltaField("numbersGrid", "items");
function deltaTone(t) {
  t = String(t || "").trim();
  if (!t) return "";
  if (/^[=~≈]/.test(t) || /^(same|flat|steady|held)/i.test(t)) return " neutral";
  return "";
}
function deltaHTML(t) {
  t = String(t || "").trim().slice(0, 18);
  if (!t) return "";
  var arrow = t.charAt(0);
  var glyph = /^[↓↑✓✔→]/.test(arrow) ? '<i class="dl-g">' + esc(arrow) + "</i>" : "";
  var rest = glyph ? t.slice(1).trim() : t;
  return '<span class="delta' + deltaTone(t) + '">' + glyph + esc(rest) + "</span>";
}
/* after each item's figure, in render order */
function injectDeltas(html, items, open, close) {
  var at = 0;
  (items || []).forEach(function (it) {
    var v = esc(String(it.value == null ? "" : it.value));
    var i = html.indexOf(open + v + close, at);
    if (i < 0) return;
    var end = i + open.length + v.length;
    if (it.delta) html = html.slice(0, end) + deltaHTML(it.delta) + html.slice(end);
    at = end + (it.delta ? deltaHTML(it.delta).length : 0) + close.length;
  });
  return html;
}
(function () {
  var raw = MODULES.kpis.render;
  MODULES.kpis.render = function (d, ctx) {
    var out = raw.apply(this, arguments);
    return d.items && d.items.some(function (i) { return i.delta; }) ? injectDeltas(out, d.items, '<div class="t-stat">', "</div>") : out;
  };
  var rawS = MODULES.stats.render;
  MODULES.stats.render = function (d, ctx) {
    if (d.variant === "rings") return statRings(d);
    var out = rawS.apply(this, arguments);
    if (!(d.items && d.items.some(function (i) { return i.delta; }))) return out;
    out = injectDeltas(out, d.items, '<span class="t-stat">', "</span>");
    return injectDeltas(out, d.items, '<span class="t-stat acc">', "</span>");
  };
  var rawN = MODULES.numbersGrid.render;
  MODULES.numbersGrid.render = function (d, ctx) {
    var out = rawN.apply(this, arguments);
    return d.items && d.items.some(function (i) { return i.delta; }) ? injectDeltas(out, d.items, '<div class="dk-big dk-grad">', "</div>") : out;
  };
})();
/* ---------- 3. display numerals ---------- */
(function () {
  var d = MODULES.storyRows;
  if (!d) return;
  d.fields = (d.fields || []).concat([{ k: "numeral", l: "Numbers", t: "select", opt: true, o: [["badge", "On a badge"], ["display", "Large, in a tint"]] }]);
  var raw = d.render;
  d.render = function (data) {
    var out = raw.apply(this, arguments);
    if ((data.variant || "rows") === "numbered" && data.numeral === "display") out = out.replace(/class="srow srow-n"/g, 'class="srow srow-n num-display"');
    return out;
  };
})();
/* ---------- 4. pull quote ---------- */
(function () {
  var d = MODULES.quote;
  if (!d) return;
  (d.fields || []).forEach(function (f) {
    if (f.k === "side" && f.o && !f.o.some(function (o) { return o[0] === "pull"; })) f.o.push(["pull", "Pull quote, full width"]);
  });
  d.fields = d.fields.concat([{ k: "portrait", l: "Portrait (for the pull quote)", t: "image", opt: true }, { k: "role", l: "Role line (for the pull quote)", opt: true }]);
  var raw = d.render;
  d.render = function (data) {
    if (data.side !== "pull") return raw.apply(this, arguments);
    var who = String(data.attribution || "").replace(/^[\s\-–—~]+/, "").trim();
    var parts = who.split(/,\s*/);
    var name = parts[0] || "";
    var role = data.role || parts.slice(1).join(", ");
    var ini = name
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) { return w.charAt(0); })
      .join("")
      .toUpperCase();
    var face = hasImg(data.portrait) ? '<span class="pq-av">' + photoImg(data.portrait, "pq-img") + "</span>" : '<span class="pq-av pq-ini" aria-hidden="true">' + esc(ini) + "</span>";
    return (
      '<section class="sec"><div class="pull" data-side="pull"><span class="pq-mark" aria-hidden="true">' +
      QM() +
      '</span><p class="t-quote pq-text">' +
      esc(unq(data.quote)) +
      '</p><div class="pq-who">' +
      face +
      '<span class="pq-name"><b>' +
      esc(name) +
      "</b>" +
      (role ? '<span class="pq-role">' + esc(role) + "</span>" : "") +
      "</span></div></div></section>"
    );
  };
})();
/* ---------- 5. stat rings ---------- */
(function () {
  var d = MODULES.stats;
  if (!d) return;
  (d.fields || []).forEach(function (f) {
    if (f.k === "variant" && f.o && !f.o.some(function (o) { return o[0] === "rings"; })) f.o.push(["rings", "Rings"]);
  });
})();
/* the share of the ring a value fills: a percentage as itself, anything else a confident three quarters */
function ringShare(v) {
  var s = String(v == null ? "" : v).trim();
  var m = s.match(/^([\d.,]+)\s*%/);
  if (m) {
    var n = parseFloat(m[1].replace(/,/g, ""));
    if (isFinite(n)) return Math.max(0.04, Math.min(1, n / 100));
  }
  return 0.72;
}
function statRings(d) {
  var R = 27,
    C = 2 * Math.PI * R;
  return (
    '<section class="sec rings-sec"><div class="rings">' +
    (d.items || [])
      .map(function (s, i) {
        var share = ringShare(s.value);
        var id = "rg" + uid();
        var dash = (C * share).toFixed(2) + " " + C.toFixed(2);
        return (
          '<div class="ringstat"><span class="ring" role="img" aria-label="' +
          esc(s.value) +
          '"><svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="' +
          id +
          '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="rg-a"/><stop offset="1" class="rg-b"/></linearGradient></defs><circle class="ring-track" cx="32" cy="32" r="' +
          R +
          '"/><circle class="ring-arc" cx="32" cy="32" r="' +
          R +
          '" stroke="url(#' +
          id +
          ')" stroke-dasharray="' +
          dash +
          '"/></svg><span class="ring-v t-stat">' +
          esc(s.value) +
          "</span></span>" +
          '<span class="t-body ring-cap">' +
          esc(s.caption) +
          "</span>" +
          (s.delta ? deltaHTML(s.delta) : "") +
          "</div>"
        );
      })
      .join("") +
    "</div></section>"
  );
}
/* ---------- 6. spectrum rules (material-level) ---------- */

// Ported render-only definitions: 31-engine-advance-b.js
/* ================= design advancements, batch B: shape and print =================
   Options again; nothing drawn before them changes.
   1. CTA split with a QR code: the bar divides into copy and a gradient side that carries a code drawn
      from the link, so a printed page still converts. Footer: a small code beside the URL.
   2. Hero photo frames: the photo panel takes a shape (arch, diagonal, rounded) that echoes the brand.
   3. Hero stat callout: one key figure set in the photo corner.
   4. Hub and spoke: curved connectors instead of straight ticks.
   5. Pipeline: tinted bands behind each bracket's steps.
   6. Logo wall: optical balancing, so a square mark and a wide wordmark read at one visual weight.    */
function qrLink(s) {
  s = String(s || "").trim();
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  return s;
}
/* ---------- 1. CTA split + QR, footer QR ---------- */
(function () {
  var d = MODULES.cta;
  d.fields = d.fields.concat([
    { k: "layout", l: "Layout", t: "select", opt: true, o: [["bar", "One bar"], ["split", "Split, with a QR code"]] },
    { k: "link", l: "Link behind the QR code", opt: true },
    { k: "scan", l: "Line beside the code", opt: true },
  ]);
  var raw = d.render;
  d.render = function (data) {
    if (data.layout !== "split") return raw.apply(this, arguments);
    var link = qrLink(data.link || (typeof PROJECT_URL === "string" ? PROJECT_URL : "") || "https://www.transperfect.com/globallink");
    var nm = typeof CUR_BRAND !== "undefined" && CUR_BRAND && CUR_BRAND.short ? CUR_BRAND.short : "GlobalLink";
    var title = esc(data.title).replace(esc(nm), "<b>" + esc(nm) + "</b>");
    var shown = link.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return (
      '<section class="sec"><div class="cta cta-split ' +
      (data.fill === "navy" ? "" : data.fill) +
      (LOGO.mark ? "" : " nomark") +
      '"><div class="cta-main">' +
      (LOGO.mark ? '<img src="' + LOGO.mark + '" alt="">' : "") +
      '<div class="copy"><div class="t-cta">' +
      title +
      '</div><div class="t-ctasub">' +
      esc(data.sub) +
      '</div><span class="pill" style="font-size:16px">' +
      esc(data.button) +
      '</span></div></div><div class="cta-side"><div class="cta-scan"><b>' +
      esc(data.scan || "Scan to book a walkthrough") +
      '</b><span class="cta-link">' +
      /* a web address breaks after a slash or a dot, never in the middle of a word */
      esc(shown).replace(/([\/])(?=[^\/])/g, "$1<wbr>").replace(/\.(?=[a-z0-9])/gi, "<wbr>.") +
      '</span></div><span class="qr-tile">' +
      QR.svg(link, 84, "#03002c", "#fff") +
      "</span></div></div></section>"
    );
  };
  var f = MODULES.footer;
  f.fields = f.fields.concat([{ k: "qr", l: "QR code", t: "select", opt: true, o: [["none", "None"], ["url", "To the URL"]] }]);
  var rawF = f.render;
  f.render = function (data) {
    var out = rawF.apply(this, arguments);
    if (data.qr !== "url" || !data.url) return out;
    var link = qrLink(data.url);
    return out.replace("</footer>", '<span class="foot-qr">' + QR.svg(link, 44, "currentColor", "") + "</span></footer>").replace('<footer class="foot', '<footer class="foot has-qr');
  };
})();
/* ---------- 2 + 3. hero frames and stat callout ---------- */
(function () {
  var d = MODULES.hero;
  d.fields = d.fields.concat([
    { k: "frame", l: "Photo frame", t: "select", opt: true, o: [["none", "Straight edge"], ["arch", "Arch"], ["diagonal", "Diagonal"], ["rounded", "Rounded corner"]] },
    { k: "callout", l: "Stat callout on the photo (e.g. 41%)", opt: true },
    { k: "calloutLabel", l: "Callout label", opt: true },
  ]);
  var raw = d.render;
  d.render = function (data, ctx) {
    var out = raw.apply(this, arguments);
    var L = data.layout;
    var hasPanel = L === "right" || L === "left" || L === "fade";
    if (data.frame && data.frame !== "none" && hasPanel) out = out.replace('<div class="hp hp-' + L + '"', '<div class="hp hp-' + L + " fr-" + data.frame + '"');
    if (data.callout && (hasPanel || L === "full") && hasImg(data.photo)) {
      var co = '<div class="hp-callout"><b class="t-stat">' + esc(data.callout) + "</b>" + (data.calloutLabel ? "<span>" + esc(data.calloutLabel) + "</span>" : "") + "</div>";
      var i = out.indexOf('<div class="hp hp-');
      if (i >= 0) {
        var j = out.indexOf("</div>", out.indexOf("hp-img", i)); // after the photo's own markup
        var end = out.indexOf('<div class="hp-ov"', i);
        var at = end >= 0 ? end : j >= 0 ? j : -1;
        if (at >= 0) out = out.slice(0, at) + co + out.slice(at);
      }
    }
    return out;
  };
})();
/* ---------- 4. hub curves ---------- */
(function () {
  var d = MODULES.hub;
  if (!d) return;
  d.fields = d.fields.concat([{ k: "connectors", l: "Connectors", t: "select", opt: true, o: [["straight", "Straight"], ["curved", "Curved"]] }]);
  var raw = d.render;
  d.render = function (data) {
    var out = raw.apply(this, arguments);
    if (data.connectors !== "curved") return out;
    out = out.replace('<div class="dk-hubg">', '<div class="dk-hubg curved">');
    ["l", "r"].forEach(function (side) {
      var lines = deckLines(side === "l" ? data.left : data.right);
      var k = lines.length,
        pitch = 33;
      var re = new RegExp('(<div class="dk-hl ' + side + '">[\\s\\S]*?)(</div>)');
      out = out.replace(re, function (m, body, close) {
        var i = 0;
        body = body.replace(/<span>([^<]*)<\/span>/g, function (sp, txt) {
          var dy = ((k - 1) / 2 - i) * pitch;
          i++;
          var path = side === "l" ? "M0 0 C34 0 26 " + dy.toFixed(1) + " 60 " + dy.toFixed(1) : "M60 0 C26 0 34 " + dy.toFixed(1) + " 0 " + dy.toFixed(1);
          return "<span>" + txt + '<svg class="hub-c" aria-hidden="true" viewBox="0 0 60 1"><path d="' + path + '"/></svg></span>';
        });
        return body + close;
      });
    });
    return out;
  };
})();
/* ---------- 5. pipeline bands ---------- */
(function () {
  var d = MODULES.pipeline;
  if (!d) return;
  d.fields = d.fields.concat([{ k: "bands", l: "Bracket bands", t: "select", opt: true, o: [["none", "None"], ["tint", "Tinted bands behind the steps"]] }]);
  var raw = d.render;
  d.render = function (data) {
    var out = raw.apply(this, arguments);
    if (data.bands !== "tint") return out;
    var n = data.items.length,
      a = Math.max(1, Math.min(n - 2, +data.splitAt || 2));
    var bands = '<div class="dk-bands" style="--n:' + n + '" aria-hidden="true"><i class="a" style="grid-column:1 / span ' + a + '"></i><i class="b" style="grid-column:' + (a + 1) + " / span " + Math.max(1, n - 1 - a) + '"></i></div>';
    return out.replace('<ol class="dk-pl"', bands + '<ol class="dk-pl banded"');
  };
})();
/* ---------- 6. logo wall optical balancing (a field; the pass itself runs after layout) ---------- */
(function () {
  var d = MODULES.logoWall;
  if (!d) return;
  d.fields = d.fields.concat([{ k: "balance", l: "Logo sizing", t: "select", opt: true, o: [["box", "Fit the box"], ["optical", "Optically balanced"]] }]);
  var raw = d.render;
  d.render = function (data) {
    var out = raw.apply(this, arguments);
    return data.balance === "optical" ? out.replace('<section class="sec dk dk-logos', '<section class="sec dk dk-logos lw-optical') : out;
  };
})();
/* a wide wordmark may fill its tile; a square mark is held to a smaller height, so both read at one weight */

// Ported render-only definitions: 32-engine-advance-c.js
/* ================= design advancements, batch C: new modules =================
   Seven modules the case studies and one-pagers kept asking for. Each feeds the social and ad sizes like
   the proof modules (its first figure becomes the headline stat), draws its graphics as SVG so Illustrator
   gets vector and PowerPoint a crisp picture, and follows the print system's flat voice on print pages.
   1. Data chart: bar, line or donut from numbers typed in.
   2. Comparison table: before / after, or us / typical.
   3. Timeline: dated milestones along a line.
   4. Testimonial wall: three short quotes with names and logos.
   5. Team trio: three portraits with role lines.
   6. Package tiers: two or three columns of what each tier includes.
   7. Checklist: what the client gets, or must prepare.                                                 */
function numOf(v) {
  var m = String(v == null ? "" : v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
/* a column label is only as wide as its own column: a long one breaks over two lines at a space, and a line that
   is still too wide (one long word) is set a little smaller. Nothing is cut: every word of the label is drawn. */
function chLab(s, maxw, fs) {
  s = String(s == null ? "" : s).trim();
  var fit = Math.max(3, maxw / (fs * 0.52)); // characters that fit on one line
  if (!s || textWidth(s) <= fit) return { lines: [s], fs: 0 };
  var w = s.split(/\s+/),
    a = "",
    b = "";
  for (var i = 0; i < w.length; i++) {
    if (!a || (!b && textWidth(a + " " + w[i]) <= fit)) a = a ? a + " " + w[i] : w[i];
    else b = b ? b + " " + w[i] : w[i];
  }
  var lines = b ? [a, b] : [a];
  var longest = Math.max.apply(
    null,
    lines.map(function (x) {
      return textWidth(x);
    })
  );
  return { lines: lines, fs: longest > fit ? Math.max(8, Math.round((fs * fit * 10) / longest) / 10) : 0 };
}
function chLabSVG(s, cx, maxw, fs, H) {
  var lb = chLab(s, maxw, fs);
  var base = lb.lines.length > 1 ? H - 23 : H - 12;
  return (
    '<text class="ch-lab" x="' +
    cx +
    '" y="' +
    base +
    '" text-anchor="middle"' +
    (lb.fs ? ' font-size="' + lb.fs + '"' : "") +
    ">" +
    lb.lines
      .map(function (ln, k) {
        return '<tspan x="' + cx + '" dy="' + (k ? 13 : 0) + '">' + esc(ln) + "</tspan>";
      })
      .join("") +
    "</text>"
  );
}
function chartSVG(d) {
  var items = (d.items || []).filter(function (i) { return i && i.label != null; }).slice(0, 8);
  var vals = items.map(function (i) { return numOf(i.value); });
  var ok = vals.filter(function (v) { return isFinite(v); });
  if (!ok.length) return '<p class="t-body chart-empty">Type a label and a number for each item to draw the chart.</p>';
  var unit = esc(d.unit || "");
  var W = d.wide ? 960 : 640,
    H = d.wide ? 250 : 240,
    pad = { l: 16, r: 16, t: 26, b: 34 };
  var max = Math.max.apply(null, ok.concat([0])),
    min = Math.min.apply(null, ok.concat([0]));
  var span = max - min || 1;
  var y = function (v) { return pad.t + ((max - v) / span) * (H - pad.t - pad.b); };
  var out = '<svg class="chart chart-' + esc(d.kind || "bar") + (d.wide ? " chart-wide" : "") + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(d.title || "Chart") + '">';
  var fmt = function (v) { return isFinite(v) ? (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-US") : String(Math.round(v * 10) / 10)) + unit : ""; };
  if ((d.kind || "bar") === "donut") {
    var total = ok.reduce(function (a, b) { return a + Math.max(0, b); }, 0) || 1;
    var cx = 120,
      cy = H / 2,
      r = 78,
      C = 2 * Math.PI * r,
      off = 0;
    out += '<g class="donut">';
    items.forEach(function (it, i) {
      var v = Math.max(0, isFinite(vals[i]) ? vals[i] : 0);
      var share = v / total;
      out += '<circle class="seg s' + (i % 6) + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-dasharray="' + (C * share).toFixed(2) + " " + C.toFixed(2) + '" stroke-dashoffset="' + (-C * off).toFixed(2) + '" transform="rotate(-90 ' + cx + " " + cy + ')"/>';
      off += share;
    });
    out += '<text class="ch-big" x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle">' + fmt(total) + "</text></g>";
    items.forEach(function (it, i) {
      var ly = 40 + i * 26;
      out += '<rect class="sw s' + (i % 6) + '" x="240" y="' + (ly - 9) + '" width="12" height="12" rx="3"/><text class="ch-lab" x="262" y="' + (ly + 1) + '">' + esc(it.label) + '</text><text class="ch-val" x="' + (W - pad.r) + '" y="' + (ly + 1) + '" text-anchor="end">' + fmt(vals[i]) + (isFinite(vals[i]) && (d.unit || "").trim() !== "%" ? " · " + Math.round((Math.max(0, vals[i]) / total) * 100) + "%" : "") + "</text>";
    });
    return out + "</svg>";
  }
  var n = items.length,
    gw = (W - pad.l - pad.r) / n;
  out += '<line class="ch-axis" x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '"/>';
  if ((d.kind || "bar") === "line") {
    var pts = items.map(function (it, i) { return [pad.l + gw * (i + 0.5), isFinite(vals[i]) ? y(vals[i]) : null]; }).filter(function (p) { return p[1] != null; });
    var path = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var area = path + " L" + pts[pts.length - 1][0].toFixed(1) + " " + y(0).toFixed(1) + " L" + pts[0][0].toFixed(1) + " " + y(0).toFixed(1) + " Z";
    out += '<path class="ch-area" d="' + area + '"/><path class="ch-line" d="' + path + '"/>';
    pts.forEach(function (p) { out += '<circle class="ch-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5"/>'; });
  }
  items.forEach(function (it, i) {
    var cx2 = pad.l + gw * (i + 0.5);
    if ((d.kind || "bar") === "bar" && isFinite(vals[i])) {
      var top = Math.min(y(vals[i]), y(0)),
        hh = Math.abs(y(vals[i]) - y(0));
      var bw = Math.min(56, gw * 0.62);
      out += '<rect class="ch-bar' + (i === n - 1 && d.highlightLast !== "no" ? " last" : "") + '" x="' + (cx2 - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(2, hh).toFixed(1) + '" rx="6"/>';
    }
    if (isFinite(vals[i])) out += '<text class="ch-val" x="' + cx2.toFixed(1) + '" y="' + (Math.min(y(vals[i]), y(0)) - 8).toFixed(1) + '" text-anchor="middle">' + fmt(vals[i]) + "</text>";
    out += chLabSVG(it.label, cx2.toFixed(1), Math.max(24, gw - 6), d.wide ? 14 : 12, H);
  });
  return out + "</svg>";
}
Object.assign(MODULES, {
  dataChart: {
    name: "Data chart",
    group: "Proof",
    vk: "kind",
    desc: "A bar, line or donut chart drawn from numbers you type, in brand colours. Vector in Illustrator; a crisp picture in PowerPoint.",
    fields: [
      { k: "kind", l: "Chart", t: "select", o: [["bar", "Bars"], ["line", "Line"], ["donut", "Donut"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "unit", l: "Unit after each number (e.g. %, K, days)", opt: true },
      { k: "note", l: "Source or note under the chart", opt: true },
      { k: "items", l: "Values", t: "list", min: 2, max: 8, f: [{ k: "label", l: "Label" }, { k: "value", l: "Number" }] },
    ],
    def: function () {
      return {
        kind: "bar",
        eyebrow: "Time to market",
        title: "Weeks from content freeze to launch",
        unit: " wks",
        note: "Fictional launch data for the example project.",
        items: [
          { label: "2023", value: "14" },
          { label: "2024", value: "11" },
          { label: "2025", value: "8" },
          { label: "2026", value: "6" },
        ],
      };
    },
    render: function (d) {
      return '<section class="sec dk dk-chart">' + deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>" + chartSVG(d) + (d.note ? '<p class="dk-note">' + esc(d.note) + "</p>" : "") + "</section>";
    },
  },
  comparison: {
    name: "Comparison table",
    group: "Proof",
    desc: "Before / after, or us / typical: three to six rows of figures, ticks or short text, the second column highlighted.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "rowLabel", l: "First column heading", opt: true },
      { k: "colA", l: "Second column heading (before / typical)" },
      { k: "colB", l: "Third column heading (highlighted)" },
      { k: "rows", l: "Rows", t: "list", min: 2, max: 7, f: [{ k: "label", l: "Row" }, { k: "a", l: "Second column" }, { k: "b", l: "Third column" }] },
    ],
    def: function () {
      return {
        eyebrow: "Before and after",
        title: "What changed for the launch team",
        rowLabel: "",
        colA: "Before",
        colB: "With GlobalLink",
        rows: [
          { label: "Markets live on day one", a: "3", b: "14" },
          { label: "Weeks from freeze to launch", a: "12", b: "6" },
          { label: "Cost per translated word", a: "Baseline", b: "31% lower" },
          { label: "Product names reworked", a: "Dozens", b: "0" },
          { label: "One glossary for every market", a: "✗", b: "✓" },
        ],
      };
    },
    render: function (d) {
      var cell = function (v, hi) {
        var t = String(v == null ? "" : v).trim();
        var cls = /^[✓✔]$/.test(t) ? " yes" : /^[✗✘×]$/.test(t) ? " no" : "";
        return "<td" + (hi ? ' class="hi' + cls + '"' : cls ? ' class="' + cls.trim() + '"' : "") + ">" + (cls === " yes" ? ic("check-circle-2") : cls === " no" ? ic("circle-x") : esc(t)) + "</td>";
      };
      return (
        '<section class="sec dk dk-compare">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        '</h2><table class="cmp-t"><thead><tr><th>' +
        esc(d.rowLabel || "") +
        "</th><th>" +
        esc(d.colA) +
        '</th><th class="hi">' +
        esc(d.colB) +
        "</th></tr></thead><tbody>" +
        (d.rows || [])
          .map(function (r) {
            return "<tr><th>" + esc(r.label) + "</th>" + cell(r.a, false) + cell(r.b, true) + "</tr>";
          })
          .join("") +
        "</tbody></table></section>"
      );
    },
  },
  timeline: {
    name: "Timeline",
    group: "Story",
    vk: "direction",
    desc: "Dated milestones along a line: engagement histories, roll-out plans, what happens when.",
    fields: [
      { k: "direction", l: "Direction", t: "select", o: [["across", "Across the page"], ["down", "Down the page"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "items", l: "Milestones", t: "list", min: 2, max: 6, f: [{ k: "when", l: "Date or stage" }, { k: "heading", l: "Heading" }, { k: "text", l: "Line", t: "textarea" }, { k: "icon", l: "Icon", t: "icon" }] },
    ],
    def: function () {
      return {
        direction: "across",
        eyebrow: "How the launch ran",
        title: "Twelve weeks, every market",
        items: [
          { when: "Week 1", heading: "Connect", text: "CMS and commerce platform linked; glossary agreed.", icon: "webhook" },
          { when: "Week 3", heading: "Translate", text: "4,800 pages through memory, AI and linguists.", icon: "languages" },
          { when: "Week 8", heading: "Review", text: "38 in-market reviewers approve in one tool.", icon: "user-check" },
          { when: "Week 12", heading: "Launch", text: "14 markets live the same morning.", icon: "rocket" },
        ],
      };
    },
    render: function (d) {
      var items = d.items || [];
      var down = d.direction === "down";
      return (
        '<section class="sec dk dk-timeline' +
        (down ? " down" : "") +
        '">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        '</h2><ol class="tl-list" style="--n:' +
        items.length +
        '">' +
        items
          .map(function (it, i) {
            return '<li class="tl-it' + (i === items.length - 1 ? " end" : "") + '"><span class="tl-when">' + esc(it.when) + '</span><span class="tl-dot">' + ic(it.icon || "circle") + '</span><div class="tl-body"><h3 class="tl-h">' + esc(it.heading) + '</h3><p class="t-body tl-t">' + esc(it.text) + "</p></div></li>";
          })
          .join("") +
        "</ol></section>"
      );
    },
  },
  testimonials: {
    name: "Testimonial wall",
    group: "Voice",
    desc: "Three short quotes side by side, each with a name, role and, if you have it, a logo.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "items", l: "Quotes", t: "list", min: 2, max: 3, f: [{ k: "quote", l: "Quote", t: "textarea" }, { k: "name", l: "Name" }, { k: "role", l: "Role and company" }, { k: "logo", l: "Logo", t: "image", lib: true, opt: true }] },
    ],
    def: function () {
      return {
        eyebrow: "What clients say",
        title: "Three teams, one launch day",
        items: [
          { quote: "Every region went live the same morning, with the same product names and the same sizing.", name: "Jordan Ellery", role: "VP Digital Commerce, Fernwood & Vale (fictional)" },
          { quote: "The glossary did the arguing for us. Our reviewers stopped debating names and started selling.", name: "Priya Nandakumar", role: "Localization Lead, Fernwood & Vale (fictional)" },
          { quote: "We saw the first market live in nine days. That used to take a quarter.", name: "Marco Alvarez", role: "Head of Growth, Fernwood & Vale (fictional)" },
        ],
      };
    },
    render: function (d) {
      return (
        '<section class="sec dk dk-testi">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        '</h2><div class="testi-row">' +
        (d.items || [])
          .map(function (it) {
            return '<figure class="testi"><span class="testi-mark" aria-hidden="true">' + QM() + '</span><blockquote class="t-body testi-q">' + esc(unq(it.quote)) + '</blockquote><figcaption class="testi-who">' + (hasImg(it.logo) ? '<span class="testi-logo">' + photoImg(it.logo, "ia-img fit-contain") + "</span>" : "") + "<b>" + esc(it.name) + "</b><span>" + esc(it.role) + "</span></figcaption></figure>";
          })
          .join("") +
        "</div></section>"
      );
    },
  },
  team: {
    name: "Team trio",
    group: "Voice",
    desc: "Three portraits with role lines, for the people behind a programme.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "items", l: "People", t: "list", min: 2, max: 4, f: [{ k: "name", l: "Name" }, { k: "role", l: "Role" }, { k: "line", l: "One line about them", t: "textarea" }, { k: "photo", l: "Portrait", t: "image", opt: true }] },
    ],
    def: function () {
      return {
        eyebrow: "Your team",
        title: "The people who run your programme",
        items: [
          { name: "Dana Reyes", role: "Program Manager", line: "Owns the schedule and reports progress every Friday." },
          { name: "Yuki Tanaka", role: "Lead Linguist, Japanese", line: "Trained on outdoor and fit terminology." },
          { name: "Sam Whitfield", role: "Solutions Architect", line: "Connects your CMS and commerce platform." },
        ],
      };
    },
    render: function (d) {
      return (
        '<section class="sec dk dk-team">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        '</h2><div class="team-row">' +
        (d.items || [])
          .map(function (it) {
            var ini = String(it.name || "")
              .split(/\s+/)
              .slice(0, 2)
              .map(function (w) { return w.charAt(0); })
              .join("")
              .toUpperCase();
            return '<div class="person-c"><span class="person-ph' + (hasImg(it.photo) ? "" : " ini") + '">' + (hasImg(it.photo) ? photoImg(it.photo, "ia-img") : esc(ini)) + '</span><b class="person-n">' + esc(it.name) + '</b><span class="person-r">' + esc(it.role) + "</span>" + (it.line ? '<p class="t-body person-l">' + esc(it.line) + "</p>" : "") + "</div>";
          })
          .join("") +
        "</div></section>"
      );
    },
  },
  tiers: {
    name: "Package tiers",
    group: "Corporate",
    desc: "Two or three columns of what each tier includes, one marked as the one to pick.",
    fields: [
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "featured", l: "Highlighted tier (1, 2 or 3)", t: "select", o: [["0", "None"], ["1", "First"], ["2", "Second"], ["3", "Third"]] },
      { k: "items", l: "Tiers", t: "list", min: 2, max: 3, f: [{ k: "name", l: "Tier name" }, { k: "line", l: "One line under the name" }, { k: "features", l: "What it includes (one per line)", t: "textarea" }, { k: "cta", l: "Button", opt: true }] },
    ],
    def: function () {
      return {
        eyebrow: "Programmes",
        title: "Pick the level of support",
        featured: "2",
        items: [
          { name: "Connect", line: "For one platform and a few markets", features: "CMS connector\nTranslation memory\nQuarterly review", cta: "Talk to us" },
          { name: "Scale", line: "For a launch across many markets", features: "Everything in Connect\nAI first drafts with linguist edit\nIn-market reviewers in one tool\nWeekly reporting", cta: "Book a demo" },
          { name: "Enterprise", line: "For the whole content operation", features: "Everything in Scale\nNamed program manager\nCustom workflows and SLAs\nSecurity review", cta: "Talk to us" },
        ],
      };
    },
    render: function (d) {
      var f = +d.featured || 0;
      return (
        '<section class="sec dk dk-tiers">' +
        deckEyebrow(d.eyebrow) +
        '<h2 class="dk-title">' +
        esc(d.title) +
        '</h2><div class="tier-row">' +
        (d.items || [])
          .map(function (it, i) {
            return '<div class="tier' + (i + 1 === f ? " featured" : "") + '">' + (i + 1 === f ? '<span class="tier-tag">Most teams start here</span>' : "") + '<b class="tier-n">' + esc(it.name) + '</b><span class="tier-l">' + esc(it.line) + "</span>" + deckCheck(deckLines(it.features)) + (it.cta ? '<span class="pill tier-cta">' + esc(it.cta) + "</span>" : "") + "</div>";
          })
          .join("") +
        "</div></section>"
      );
    },
  },
  checklist: {
    name: "Checklist",
    group: "Story",
    vk: "cols",
    desc: "A tick-list of what the client gets, or must prepare. One or two columns.",
    fields: [
      { k: "cols", l: "Columns", t: "select", o: [["1", "One"], ["2", "Two"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "items", l: "Items (one per line)", t: "textarea" },
    ],
    def: function () {
      return {
        cols: "2",
        eyebrow: "Before we start",
        title: "What we need from your team",
        items: "A content owner for each market\nAccess to the CMS staging environment\nThe current glossary, if one exists\nBrand guidelines and tone notes\nLaunch dates by market\nA weekly 30-minute check-in",
      };
    },
    render: function (d) {
      return '<section class="sec dk dk-checklist cols-' + (+d.cols === 2 ? 2 : 1) + '">' + deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>" + deckCheck(deckLines(d.items)) + "</section>";
    },
  },
});
/* backgrounds, as every other content module (20b ran before these existed) */
["dataChart", "comparison", "timeline", "testimonials", "team", "tiers", "checklist"].forEach(function (k) {
  if (MODULES[k].fields.some(function (f) { return f.k === "surface"; })) return;
  MODULES[k].fields.push({ k: "surface", l: "Background", t: "select", opt: true, o: SURFACES.map(function (s) { return s.slice(); }) });
});
/* the headline stat for social and ad sizes */
var deriveAdvCRaw = derive;
derive = function (mods) {
  var c = deriveAdvCRaw.apply(this, arguments);
  if (!NOSTAT) return c;
  var found = null;
  (mods || []).some(function (m) {
    var d = m.data || {};
    if (m.type === "dataChart" && d.items && d.items.length) {
      var last = d.items[d.items.length - 1];
      if (isFinite(numOf(last.value))) found = { value: String(last.value).trim() + (d.unit || ""), caption: (d.title || "") + (last.label ? ", " + last.label : "") };
    } else if (m.type === "comparison" && d.rows) {
      var r = d.rows.filter(function (x) { return isFinite(numOf(x.b)); })[0];
      if (r) found = { value: String(r.b).trim(), caption: r.label };
    } else if (m.type === "timeline" && d.items && d.items.length) {
      var it = d.items.filter(function (x) { return isFinite(numOf(x.heading)) || isFinite(numOf(x.text)); })[0];
      if (it) found = { value: String(isFinite(numOf(it.heading)) ? it.heading : it.text.match(/-?[\d,.]+\s*\S*/)[0]).replace(/[.,;:]+$/, ""), caption: it.heading };
    }
    return !!found;
  });
  if (found) {
    c.stats = [found];
    c.hs = found;
    NOSTAT = false;
  }
  return c;
};

// Ported render-only definitions: 33-engine-layouts.js
/* ================= design advancements, batch D: layout variations =================
   Every module offers at least five designs that differ in structure — column count, where the figure
   sits, list or cards, photo placement, alignment, numeral treatment — not only in background. New values
   join each module's Style select (or a new Layout select where there was none); materials saved before
   keep their value and render as they did. The library and the module examples page list the five designs
   from LIB_DESIGNS below; backgrounds are no longer used as filler.                                      */
function lyWrap(k, fn) {
  var d = MODULES[k];
  if (!d) return;
  var raw = d.render;
  d.render = function (data, ctx) {
    var out = fn.call(this, data, ctx || {}, function (data2) { return raw.call(d, data2 || data, ctx || {}); });
    return out == null ? raw.apply(d, arguments) : out;
  };
}
function lyOpt(k, key, more, label) {
  var d = MODULES[k];
  if (!d) return;
  var f = (d.fields || []).filter(function (x) { return x.k === key; })[0];
  if (f && f.o) {
    more.forEach(function (o) {
      if (!f.o.some(function (x) { return x[0] === o[0]; })) f.o.push(o);
    });
    return;
  }
  d.fields = [{ k: key, l: label || "Layout", t: "select", opt: true, o: more }].concat(d.fields || []);
  if (!d.vk) d.vk = key;
}
function lyIni(name) {
  return String(name || "")
    .split(/\s+/)
    .slice(0, 2)
    .map(function (w) { return w.charAt(0); })
    .join("")
    .toUpperCase();
}
function lyDeltas(html, items, open, close) {
  return items && items.some(function (i) { return i.delta; }) ? injectDeltas(html, items, open, close) : html;
}
function lyNum(i) {
  return (i + 1 < 10 ? "0" : "") + (i + 1);
}
/* ---------- KPI trio: stacked with hairlines, tinted tiles ---------- */
lyOpt("kpis", "variant", [["stacked", "Stacked, hairlines"], ["tiles", "Tinted tiles"]]);
lyWrap("kpis", function (d, ctx) {
  var v = d.variant;
  if (v !== "stacked" && v !== "tiles") return null;
  var ov = ctx.afterHero ? " overlap" : "";
  var html;
  if (v === "stacked")
    html =
      '<section class="sec ly ly-kstack' + ov + '">' +
      d.items.map(function (k) { return '<div class="ks"><div class="t-stat">' + esc(k.value) + '</div><div class="ks-r"><span class="disc">' + ic(k.icon) + '</span><div class="t-body">' + esc(k.caption) + "</div></div></div>"; }).join("") +
      "</section>";
  else
    html =
      '<section class="sec ly ly-ktiles' + ov + '" style="--n:' + d.items.length + '">' +
      d.items.map(function (k) { return '<div class="kt"><span class="disc">' + ic(k.icon) + '</span><div class="t-stat">' + esc(k.value) + '</div><div class="t-body">' + esc(k.caption) + "</div></div>"; }).join("") +
      "</section>";
  return lyDeltas(html, d.items, '<div class="t-stat">', "</div>");
});
/* ---------- stat strip: two-column ledger ---------- */
lyOpt("stats", "variant", [["ledger", "Two-column ledger"]]);
lyWrap("stats", function (d) {
  if (d.variant !== "ledger") return null;
  var html =
    '<section class="sec ly ly-ledger">' +
    d.items.map(function (s) { return '<div class="lg-row"><span class="disc">' + ic(s.icon) + '</span><span class="t-stat">' + esc(s.value) + '</span><span class="t-body">' + esc(s.caption) + "</span></div>"; }).join("") +
    "</section>";
  return lyDeltas(html, d.items, '<span class="t-stat">', "</span>");
});
/* ---------- capability grid: numbered cards, icon columns, chip strip ---------- */
lyOpt("capabilities", "variant", [["numbered", "Numbered cards"], ["columns", "Icon columns"], ["strip", "Chip strip"]]);
/* an icon drawn in the Spectrum gradient: the gradient is defined inside the svg so it survives every export */
function lyGradIcon(name, id) {
  var g = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0FB5B2"/><stop offset=".55" stop-color="#3B7BF0"/><stop offset="1" stop-color="#8F6BF0"/></linearGradient></defs>';
  return ic(name).replace("<svg ", '<svg style="stroke:url(#' + id + ')" ').replace("aria-hidden=\"true\">", 'aria-hidden="true">' + g);
}
lyWrap("capabilities", function (d, ctx) {
  var v = d.variant;
  var ov = ctx.afterHero ? " overlap" : "";
  if (v === "numbered")
    return (
      '<section class="sec ly ly-capnum' + ov + '">' +
      d.items.map(function (c, i) { return '<div class="card cn"><span class="cn-i" aria-hidden="true">' + lyGradIcon(c.icon, "cng" + i) + '</span><span class="cn-n">' + lyNum(i) + '</span><div class="t-card">' + esc(c.title) + '</div><div class="t-body">' + esc(c.text) + "</div></div>"; }).join("") +
      "</section>"
    );
  if (v === "columns")
    return (
      '<section class="sec ly ly-capcols' + ov + '" style="--n:' + d.items.length + '">' +
      d.items.map(function (c) { return '<div class="cc"><span class="disc">' + ic(c.icon) + '</span><div class="t-card">' + esc(c.title) + '</div><div class="t-body">' + esc(c.text) + "</div></div>"; }).join("") +
      "</section>"
    );
  if (v === "strip")
    return (
      '<section class="sec ly ly-capstrip' + ov + '"><div class="cs-chips">' +
      d.items.map(function (c) { return '<span class="cs-chip">' + ic(c.icon) + "<b>" + esc(c.title) + "</b></span>"; }).join("") +
      '</div><div class="cs-lines">' +
      d.items.map(function (c) { return '<div class="cs-line"><b class="t-label">' + esc(c.title) + '</b><span class="t-body">' + esc(c.text) + "</span></div>"; }).join("") +
      "</div></section>"
    );
  return null;
});
/* ---------- icon feature row: stacked list, tiles, navy band, chip line ---------- */
lyOpt("features", "layout", [["row", "Icon columns"], ["stack", "Stacked list"], ["tiles", "Tinted tiles"], ["dark", "Navy band"], ["chips", "Chip line"]]);
lyWrap("features", function (d) {
  var v = d.layout;
  if (!v || v === "row") return null;
  var head = '<div class="feat-h"><i></i><b class="t-label">' + esc(d.label) + "</b><i></i></div>";
  if (v === "stack")
    return '<section class="sec ly ly-fstack"><div class="fs-h"><b class="t-label">' + esc(d.label) + "</b></div><div class=\"fs-list\">" + d.items.map(function (f) { return '<div class="fs-it"><span class="disc">' + ic(f.icon) + '</span><span class="t-body">' + esc(f.text) + "</span></div>"; }).join("") + "</div></section>";
  if (v === "tiles")
    return '<section class="sec ly ly-ftiles">' + head + '<div class="ft-grid" style="--n:' + d.items.length + '">' + d.items.map(function (f) { return '<div class="ft"><span class="disc">' + ic(f.icon) + '</span><span class="t-body">' + esc(f.text) + "</span></div>"; }).join("") + "</div></section>";
  if (v === "dark")
    return '<section class="sec ly ly-fdark"><div class="ly-dark fd-band"><b class="t-label">' + esc(d.label) + '</b><div class="fd-row" style="--n:' + d.items.length + '">' + d.items.map(function (f) { return '<div class="fd"><span class="disc">' + ic(f.icon) + '</span><span class="t-body">' + esc(f.text) + "</span></div>"; }).join("") + "</div></div></section>";
  if (v === "chips")
    return '<section class="sec ly ly-fchips"><b class="t-label">' + esc(d.label) + '</b><div class="fc-row">' + d.items.map(function (f) { return '<span class="fc">' + ic(f.icon) + "<span>" + esc(f.text) + "</span></span>"; }).join("") + "</div></section>";
  return null;
});
/* ---------- story rows: vertical timeline, heading beside text ---------- */
lyOpt("storyRows", "variant", [["timeline", "Vertical timeline"], ["split", "Heading beside text"]]);
lyWrap("storyRows", function (d) {
  var v = d.variant;
  if (v === "timeline")
    return (
      '<section class="sec ly ly-stl">' +
      d.items.map(function (s, i) { return '<div class="stl-it' + (i === d.items.length - 1 ? " end" : "") + '"><span class="stl-dot">' + ic(s.icon) + '</span><div class="stl-b"><h3>' + esc(s.heading) + '</h3><p class="t-body">' + esc(s.text) + "</p></div></div>"; }).join("") +
      "</section>"
    );
  if (v === "split")
    return (
      '<section class="sec ly ly-ssplit">' +
      d.items.map(function (s, i) { return '<div class="ss-row"><div class="ss-h"><span class="ss-n">' + lyNum(i) + "</span><h3>" + esc(s.heading) + '</h3></div><p class="t-body">' + esc(s.text) + "</p></div>"; }).join("") +
      "</section>"
    );
  return null;
});
/* ---------- story columns: open, stacked, coloured headers, display numerals ---------- */
lyOpt("storyColumns", "layout", [["cards", "Three cards"], ["open", "Open columns"], ["stacked", "Stacked rows"], ["banded", "Coloured headers"], ["numbered", "Display numerals"], ["flow", "Two text columns"]]);
/* "Label: what it says" set as a labelled line (the label in bold), the way a printed one-pager sets a list of
   named points; a list where most lines are labelled is set without bullets, a line to each point */
function lyLabelSplit(t) {
  var m = /^([A-Z0-9][^:.!?\n]{1,58}):\s+(\S[\s\S]{7,})$/.exec(String(t || "").trim());
  return m && m[1].split(/\s+/).length <= 7 && !/^https?$/i.test(m[1]) ? [m[1], m[2]] : null;
}
/* a paragraph in sentences, as a reader sees them. A full stop inside "e.g.", "U.S.", "No." or an initial does not
   end a sentence, and a sentence ends only where the next one starts: a capital, a figure or an opening quote.
   (Splitting on every full stop used to break a column mid-word — "…non-responsive content (e." / "g., irrelevant
   domains…" — because the second column began inside an abbreviation.) */
var LY_ABBR = "e.g,i.e,etc,vs,approx,no,nos,fig,figs,vol,al,inc,ltd,co,corp,dept,est,jr,sr,mr,mrs,ms,dr,prof,st,u.s,u.k,a.m,p.m,ph.d,cf,ca,ibid,op,pp,ed,eds,mins,hrs,sq,ft,incl,max,min".split(",");
function lySentences(para) {
  var t = String(para || "");
  var out = [], start = 0, m;
  var rx = /[.!?]+["'”’)\]]*(\s+)/g;
  while ((m = rx.exec(t))) {
    var end = m.index + m[0].length;
    var before = t.slice(start, m.index);
    var word = (before.match(/([A-Za-z][A-Za-z.’']*)$/) || ["", ""])[1].toLowerCase().replace(/\.+$/, "");
    var next = t.slice(end, end + 1);
    var abbrev = !word || word.length === 1 || LY_ABBR.indexOf(word) >= 0;
    var opens = /[A-Z0-9"'“‘(\[–—]/.test(next);
    if (abbrev || !opens) continue;
    out.push(t.slice(start, end));
    start = end;
  }
  if (start < t.length) out.push(t.slice(start));
  return out.filter(function (x) { return x.trim(); });
}
function lyListHTML(text) {
  var its = String(text || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean);
  if (!its.length) return "";
  var lab = its.map(lyLabelSplit);
  var labelled = lab.filter(Boolean).length >= Math.max(1, Math.ceil(its.length * 0.6));
  return '<ul' + (labelled ? ' class="lab"' : "") + ">" + its.map(function (b, i) { return "<li>" + (labelled && lab[i] ? "<b>" + esc(lab[i][0]) + ":</b> " + esc(lab[i][1]) : esc(b)) + "</li>"; }).join("") + "</ul>";
}
lyWrap("storyColumns", function (d, ctx) {
  var v = d.layout;
  if (!v || v === "cards") return null;
  var bl = function (c) {
    return lyListHTML(c.bullets) || "<ul></ul>";
  };
  var tones = ["teal", "blue", "violet", "blue"];
  /* two text columns: the sections run down the left column and carry on down the right, split where the two come
     out most alike in length. Each section is its heading, its paragraphs and its list at a comfortable measure
     (about 62 characters a line). The split falls between two sections where that leaves the columns near enough
     alike; where it would leave one column far longer than the other, a section carries on in the second column,
     between two paragraphs, two points of its list or two sentences (never straight after a heading). Each block
     of text still sits whole in one column, so the editable exports keep it as one text box. */
  if (v === "flow") {
    var CPL = 62;
    var trimmed = function (t) { return String(t || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); };
    var atoms = [];
    d.items.forEach(function (c, i) {
      var hasHead = !!String(c.heading || "").trim();
      var bl = trimmed(c.bullets);
      var labs = bl.map(lyLabelSplit);
      var labelled = bl.length > 0 && labs.filter(Boolean).length >= Math.max(1, Math.ceil(bl.length * 0.6));
      var lead = i ? 1.4 : 0; // the space and the rule above a section that follows another
      if (hasHead) atoms.push({ s: i, k: "h", t: c.heading, w: 1.5 + lead });
      var firstText = true;
      trimmed(c.text).forEach(function (para, pi) {
        var sents = para.length > 200 ? lySentences(para) : null;
        var extra = (firstText && !hasHead ? lead : 0) + 0.35;
        firstText = false;
        if (sents && sents.length >= 2) sents.forEach(function (st, si) { atoms.push({ s: i, k: "s", p: pi, t: st, w: st.length / CPL + (si ? 0 : extra) }); });
        else atoms.push({ s: i, k: "p", p: pi, t: para, w: Math.max(1, Math.ceil(para.length / CPL)) + extra });
      });
      bl.forEach(function (b2, bi) { atoms.push({ s: i, k: "b", t: b2, lab: labelled ? labs[bi] : null, labelled: labelled, w: Math.max(1, Math.ceil(b2.length / (CPL - 4))) + 0.25 + (firstText && !hasHead && !bi ? lead : 0) }); });
    });
    var tot = atoms.reduce(function (a, x) { return a + x.w; }, 0);
    var cut = atoms.length, best = Infinity, acc = 0;
    for (var k = 1; k < atoms.length; k++) {
      acc += atoms[k - 1].w;
      var A = atoms[k - 1], B = atoms[k];
      if (A.k === "h") continue; // a heading never ends a column
      var cost = Math.abs(2 * acc - tot);
      if (A.s === B.s) {
        cost += 2; // a section kept whole is tidier: it is split only where that evens the columns by more than two lines
        if (A.k === "s" && B.k === "s" && A.p === B.p) {
          /* inside a paragraph: at least two lines of it on each side */
          var same = function (x) { return x.s === A.s && x.k === "s" && x.p === A.p; };
          var before = atoms.slice(0, k).filter(same).reduce(function (a, x) { return a + x.t.length; }, 0), after = atoms.slice(k).filter(same).reduce(function (a, x) { return a + x.t.length; }, 0);
          cost += before < CPL * 1.6 || after < CPL * 1.6 ? 6 : 1.5;
        }
      }
      if (cost < best) { best = cost; cut = k; }
    }
    /* too little to make two columns of (a few lines): one column at a readable measure */
    if (tot < 5) cut = atoms.length;
    var colHTML = function (list, carries) {
      var html = "", open = null, para = null, ul = null;
      var endPara = function () { if (para != null) { html += '<p class="t-body">' + esc(para.trim()) + "</p>"; para = null; } };
      var endUl = function () { if (ul) { html += '<div class="t-body scf-b"><ul' + (ul.lab ? ' class="lab"' : "") + ">" + ul.li.join("") + "</ul></div>"; ul = null; } };
      var endSec = function () { endPara(); endUl(); if (open != null) html += "</div>"; open = null; };
      list.forEach(function (a, ai) {
        if (open !== a.s) {
          endSec();
          var cont = carries && !ai && a.k !== "h";
          html += '<div class="scf' + (a.k === "h" ? "" : " nh") + (cont ? " cont" : "") + '">';
          open = a.s;
        }
        if (a.k === "h") html += "<h3>" + esc(a.t) + "</h3>";
        else if (a.k === "s") {
          endUl();
          if (para != null && list[ai - 1] && list[ai - 1].k === "s" && list[ai - 1].p === a.p && list[ai - 1].s === a.s) para += a.t;
          else { endPara(); para = a.t; }
        } else if (a.k === "p") { endPara(); endUl(); html += '<p class="t-body">' + esc(a.t) + "</p>"; }
        else {
          endPara();
          if (!ul) ul = { lab: a.labelled, li: [] };
          ul.li.push("<li>" + (a.lab ? "<b>" + esc(a.lab[0]) + ":</b> " + esc(a.lab[1]) : esc(a.t)) + "</li>");
        }
      });
      endSec();
      return html;
    };
    var listA = atoms.slice(0, cut), listB = atoms.slice(cut);
    var carries = listB.length > 0 && listA.length > 0 && listA[listA.length - 1].s === listB[0].s;
    var colA = colHTML(listA, false), colB = colHTML(listB, carries);
    /* one section under one heading that carries on: the second column starts level with the first line of text in the first */
    if (carries && d.items.length === 1 && listA[0].k === "h") colB = colB.replace('<div class="scf nh cont">', '<div class="scf nh cont"><h3 class="scf-ghost" aria-hidden="true">&nbsp;</h3>');
    return '<section class="sec ly ly-scflow' + (colB ? "" : " one") + '"><div class="scf-col">' + colA + "</div>" + (colB ? '<div class="scf-col">' + colB + "</div>" : "") + "</section>";
  }
  /* a column with no heading has no header at all: an icon beside nothing marks nothing */
  var hasH = function (c) { return !!String(c.heading || "").trim(); };
  if (v === "stacked")
    return '<section class="sec ly ly-scstack">' + d.items.map(function (c) { return '<div class="scs' + (hasH(c) ? "" : " scs-nh") + '">' + (hasH(c) ? '<div class="scs-h"><span class="disc">' + ic(c.icon) + "</span><h3>" + esc(c.heading) + "</h3></div>" : "") + (c.text ? '<p class="t-body">' + esc(c.text) + "</p>" : "") + '<div class="t-body scs-b">' + bl(c) + "</div></div>"; }).join("") + "</section>";
  return (
    '<section class="sec ly ly-sc ly-sc-' + v + '" style="--n:' + d.items.length + '">' +
    d.items.map(function (c, i) {
      var h = !hasH(c) ? "" : v === "numbered" ? '<span class="sc-num">' + lyNum(i) + "</span><h3>" + esc(c.heading) + "</h3>" : v === "banded" ? '<div class="sc-band tone-' + tones[i % 4] + '"><span class="disc">' + ic(c.icon) + "</span><h3>" + esc(c.heading) + "</h3></div>" : '<div class="sc-oh"><span class="disc">' + ic(c.icon) + "</span><h3>" + esc(c.heading) + "</h3></div>";
      return '<div class="sc">' + h + (c.text ? '<p class="t-body">' + esc(c.text) + "</p>" : "") + '<div class="t-body sc-b">' + bl(c) + "</div></div>";
    }).join("") +
    "</section>"
  );
});
/* ---------- quote band: quote with proof chips ---------- */
lyOpt("quote", "side", [["chips", "Quote with proof chips"]]);
lyWrap("quote", function (d) {
  if (d.side !== "chips") return null;
  return (
    '<section class="sec ly ly-qchips"><div class="qc"><div class="qc-q"><span class="qmark">' + QM() + '</span><p class="t-quote">' + esc(unq(d.quote)) + '</p><span class="t-attr">' + esc(attrText(d.attribution)) + "</span></div>" +
    (d.proof && d.proof.length ? '<div class="qc-chips">' + d.proof.map(function (p) { return '<span class="qc-chip">' + ic(p.icon) + "<span>" + esc(p.text) + "</span></span>"; }).join("") + "</div>" : "") +
    "</div></section>"
  );
});
/* ---------- quote + stat grid: quote first, stacked, navy band, ledger ---------- */
lyOpt("quoteStats", "layout", [["side", "Stats beside the quote"], ["quoteFirst", "Quote beside the stats"], ["stacked", "Quote above a stat row"], ["band", "Stats on a navy band"], ["ledger", "Stat ledger beside the quote"]]);
lyWrap("quoteStats", function (d, ctx) {
  var v = d.layout;
  if (!v || v === "side") return null;
  var stat = function (s) { return '<div class="qs-s"><span class="disc">' + ic(s.icon) + '</span><span class="t-stat">' + esc(s.value) + '</span><span class="t-body">' + esc(s.caption) + "</span></div>"; };
  var quote = '<div class="qs-q card"><span class="qmark">' + QM() + '</span><p class="t-quote-lg">' + esc(unq(d.quote)) + '</p><div class="t-attr">' + esc(d.client) + '</div><div class="t-attr">' + esc(attrText(d.attribution)) + "</div></div>";
  var ov = "";
  var html;
  if (v === "quoteFirst") html = '<section class="sec ly ly-qs ly-qs-first' + ov + '">' + quote + '<div class="qs-grid">' + d.items.map(stat).join("") + "</div></section>";
  else if (v === "stacked") html = '<section class="sec ly ly-qs ly-qs-stacked' + ov + '">' + quote.replace("qs-q card", "qs-q qs-wide") + '<div class="qs-row" style="--n:' + d.items.length + '">' + d.items.map(stat).join("") + "</div></section>";
  else if (v === "band") html = '<section class="sec ly ly-qs ly-qs-band' + ov + '"><div class="ly-dark qs-band" style="--n:' + d.items.length + '">' + d.items.map(stat).join("") + "</div>" + quote + "</section>";
  else html = '<section class="sec ly ly-qs ly-qs-ledger' + ov + '"><div class="qs-ledger">' + d.items.map(function (s) { return '<div class="qs-l"><span class="t-stat">' + esc(s.value) + '</span><span class="t-body">' + esc(s.caption) + "</span></div>"; }).join("") + "</div>" + quote + "</section>";
  return lyDeltas(html, d.items, '<span class="t-stat">', "</span>");
});
/* ---------- expert: card left, stacked, navy card, open stats ---------- */
lyOpt("expert", "layout", [["side", "Stats, card on the right"], ["cardLeft", "Card on the left"], ["stacked", "Stats row, card beneath"], ["navy", "Navy expert card"], ["open", "Stat ledger, card beside"]]);
lyWrap("expert", function (d) {
  var v = d.layout;
  if (!v || v === "side") return null;
  var t = esc(d.title).replace("GlobalLink", '<span class="acc">GlobalLink</span>');
  var card = '<div class="ex-card card' + (v === "navy" ? " ly-dark" : "") + '"><div class="t-label ex-t">' + t + '</div><p class="t-body">' + esc(d.line) + '</p><ul class="proof">' + PROOF.map(function (p) { return '<li class="t-body">' + ic(p.icon) + esc(p.text) + "</li>"; }).join("") + '</ul><span class="pill' + (v === "navy" || v === "stacked" ? "" : " dark") + ' t-body">' + esc(d.button) + "</span></div>";
  var stats = '<div class="ex-stats' + (v === "open" ? " ex-ledger" : "") + '" style="--n:' + d.items.length + '">' + d.items.map(function (s) { return '<div class="ex-s' + (v === "open" ? "" : " card") + '"><span class="disc">' + ic(s.icon) + '</span><span class="t-stat acc">' + esc(s.value) + '</span><span class="t-body">' + esc(s.caption) + "</span></div>"; }).join("") + "</div>";
  var label = '<div class="t-label ex-l">' + esc(d.label) + "</div>";
  if (v === "cardLeft") return '<section class="sec ly ly-ex ly-ex-left">' + card + "<div>" + label + stats + "</div></section>";
  if (v === "stacked") return '<section class="sec ly ly-ex ly-ex-stacked">' + label + stats + card.replace("ex-card card", "ex-card ex-bar ly-dark") + "</section>";
  return '<section class="sec ly ly-ex ly-ex-' + v + '"><div>' + label + stats + "</div>" + card + "</section>";
});
/* ---------- CTA: centred stack ---------- */
lyOpt("cta", "layout", [["centered", "Centred stack"]]);
lyWrap("cta", function (d) {
  if (d.layout !== "centered") return null;
  var nm = typeof CUR_BRAND !== "undefined" && CUR_BRAND && CUR_BRAND.short ? CUR_BRAND.short : "GlobalLink";
  return '<section class="sec"><div class="cta cta-center ' + (d.fill === "navy" ? "" : d.fill) + (LOGO.mark ? "" : " nomark") + '">' + (LOGO.mark ? '<img src="' + LOGO.mark + '" alt="">' : "") + '<div class="copy"><div class="t-cta">' + esc(d.title).replace(esc(nm), "<b>" + esc(nm) + "</b>") + '</div><div class="t-ctasub">' + esc(d.sub) + '</div></div><span class="pill" style="font-size:18px">' + esc(d.button) + "</span></div></section>";
});
/* ---------- footer: navy strip, centred ---------- */
lyOpt("footer", "style", [["band", "Navy strip"], ["centered", "Centred"]]);
lyWrap("footer", function (d, ctx, raw) {
  if (d.style !== "band" && d.style !== "centered") return null;
  var out = raw(Object.assign({}, d, { style: "open" }));
  return out.replace('<footer class="foot', '<footer class="foot foot-' + d.style + (d.style === "band" ? " ly-dark" : ""));
});
/* ---------- numbers grid: navy tiles, one line, ledger ---------- */
lyOpt("numbersGrid", "variant", [["dark", "Navy tiles"], ["inline", "Figures in one line"], ["ledger", "Figure ledger"], ["bento", "One lead figure, the rest beside"], ["swiss", "Ruled grid with index marks"], ["stair", "Rising steps"], ["halo", "Figures in rings"]]);
lyWrap("numbersGrid", function (d) {
  var v = d.variant;
  if (v !== "dark" && v !== "inline" && v !== "ledger" && v !== "bento" && v !== "swiss" && v !== "stair" && v !== "halo") return null;
  var head = deckEyebrow(d.eyebrow) + deckTitle(d.title, d.accent);
  var html;
  if (v === "dark") html = '<section class="sec dk ly ly-ndark">' + head + '<div class="ly-dark nd" style="--n:' + d.items.length + '">' + d.items.map(function (i) { return '<div class="nd-t"><div class="dk-big dk-grad">' + esc(i.value) + '</div><div class="dk-lab">' + esc(i.label) + "</div></div>"; }).join("") + "</div></section>";
  else if (v === "bento") html = '<section class="sec dk ly ly-nbento">' + head + '<div class="nb" style="--n:' + d.items.length + ';--r:' + Math.max(1, Math.ceil((d.items.length - 1) / 2)) + '">' + d.items.map(function (i, k) { return '<div class="' + (k ? "nb-c" : "nb-hero") + '"><div class="dk-big dk-grad">' + esc(i.value) + '</div><div class="dk-lab">' + esc(i.label) + "</div></div>"; }).join("") + "</div></section>";
  else if (v === "swiss") html = '<section class="sec dk ly ly-nswiss">' + head + '<div class="ns" style="--c:' + (d.items.length <= 3 ? d.items.length : d.items.length === 4 ? 4 : 3) + '">' + d.items.map(function (i, k) { return '<div class="ns-c"><span class="ns-i">' + lyNum(k) + '</span><div class="dk-big dk-grad">' + esc(i.value) + '</div><div class="dk-lab">' + esc(i.label) + "</div></div>"; }).join("") + "</div></section>";
  else if (v === "stair") html = '<section class="sec dk ly ly-nstair">' + head + '<div class="nst" style="--n:' + d.items.length + ';--fs:' + ({ 2: 44, 3: 40, 4: 33, 5: 29 }[d.items.length] || 25) + 'px">' + d.items.map(function (i, k) { return '<div class="nst-c" style="--k:' + (d.items.length - 1 - k) + '"><div class="dk-big dk-grad">' + esc(i.value) + '</div><div class="dk-lab">' + esc(i.label) + "</div></div>"; }).join("") + "</div></section>";
  else if (v === "halo") html = '<section class="sec dk ly ly-nhalo">' + head + '<div class="nh" style="--c:' + (d.items.length <= 3 ? d.items.length : d.items.length === 4 ? 4 : 3) + '">' + d.items.map(function (i) { return '<div class="nh-c"><div class="nh-d"><div class="dk-big dk-grad">' + esc(i.value) + '</div></div><div class="dk-lab">' + esc(i.label) + "</div></div>"; }).join("") + "</div></section>";
  else if (v === "inline") html = '<section class="sec dk ly ly-ninline">' + head + '<div class="ni-row" style="--n:' + d.items.length + '">' + d.items.map(function (i) { return '<div class="ni"><div class="dk-big dk-grad">' + esc(i.value) + '</div><div class="dk-lab">' + esc(i.label) + "</div></div>"; }).join("") + "</div></section>";
  else html = '<section class="sec dk ly ly-nledger' + (String(d.title || "").trim() || String(d.eyebrow || "").trim() ? "" : " nl-solo") + '"><div class="nl-h">' + head + '</div><div class="nl-list">' + d.items.map(function (i) { return '<div class="nl"><div class="dk-big dk-grad">' + esc(i.value) + '</div><div class="dk-lab">' + esc(i.label) + "</div></div>"; }).join("") + "</div></section>";
  return lyDeltas(html, d.items, '<div class="dk-big dk-grad">', "</div>");
});
/* ---------- process stages: chevron steps, down the page, cards ---------- */
lyOpt("stages", "variant", [["steps", "Chevron steps"], ["vertical", "Down the page"], ["cards", "Cards with checklists"]]);
lyWrap("stages", function (d) {
  var v = d.variant;
  if (v !== "steps" && v !== "vertical" && v !== "cards") return null;
  var head = deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>";
  var n = d.items.length;
  if (v === "steps")
    return '<section class="sec dk ly ly-chev">' + head + '<ol class="chev" style="--n:' + n + '">' + d.items.map(function (it, i) { return '<li class="tone-' + esc(it.tone || "blue") + '"><b>' + lyNum(i) + "</b><span>" + esc(it.label) + "</span></li>"; }).join("") + '</ol><div class="chev-cols" style="--n:' + n + '">' + d.items.map(function (it) { return '<div><h3 class="dk-st">' + esc(it.title) + "</h3>" + deckCheck(deckLines(it.points)) + "</div>"; }).join("") + "</div></section>";
  if (v === "vertical")
    return '<section class="sec dk ly ly-svert">' + head + '<ol class="sv">' + d.items.map(function (it, i) { return '<li class="tone-' + esc(it.tone || "blue") + (hasImg(it.photo) ? " has-ph" : "") + '"><span class="sv-n">' + lyNum(i) + '</span><div class="sv-b"><p class="dk-eye sm">' + esc(it.label) + '</p><h3 class="dk-st">' + esc(it.title) + "</h3>" + deckCheck(deckLines(it.points)) + "</div>" + (hasImg(it.photo) ? '<div class="sv-ph">' + photoImg(it.photo, "ia-img") + "</div>" : "") + "</li>"; }).join("") + "</ol></section>";
  return '<section class="sec dk ly ly-scards">' + head + '<div class="scd-row" style="--n:' + n + '">' + d.items.map(function (it, i) { return '<div class="scd tone-' + esc(it.tone || "blue") + '"><span class="scd-n">' + lyNum(i) + '</span><p class="dk-eye sm">' + esc(it.label) + '</p><h3 class="dk-st">' + esc(it.title) + "</h3>" + deckCheck(deckLines(it.points)) + "</div>"; }).join("") + "</div></section>";
});
/* ---------- footprint: headline only, navy, compact ---------- */
lyOpt("footprint", "variant", [["headline", "Map with the figure only"], ["dark", "Navy map"], ["compact", "Small map, list beside"]]);
lyWrap("footprint", function (d, ctx, raw) {
  var v = d.variant;
  if (v !== "headline" && v !== "dark" && v !== "compact") return null;
  var out = raw(Object.assign({}, d, { variant: "list" }));
  if (v === "headline") out = out.replace(/<div class="dk-cities">[\s\S]*?<\/div>/, "");
  return out.replace('<section class="sec dk dk-foot">', '<section class="sec dk dk-foot ly fp-' + v + (v === "dark" ? " ly-dark" : "") + '">');
});
/* ---------- big metric: centred, navy band, split, ring ---------- */
lyOpt("bigMetric", "layout", [["left", "Figure left, drivers right"], ["centered", "Centred figure"], ["band", "Navy band"], ["split", "Figure beside the bars"], ["ring", "Figure in a ring"]]);
lyWrap("bigMetric", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "left") return null;
  var out = raw(d);
  if (v === "ring") out = out.replace('<div class="dk-mega dk-grad">', '<div class="bm-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="spxRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="rg-a"/><stop offset="1" class="rg-b"/></linearGradient></defs><circle class="bm-track" cx="60" cy="60" r="54"/><circle class="bm-arc" cx="60" cy="60" r="54" stroke-dasharray="' + (339.3 * (1 - Math.min(100, Math.max(10, +d.ratio || 40)) / 100)).toFixed(1) + ' 339.3" transform="rotate(-90 60 60)"/></svg><div class="dk-mega dk-grad">').replace('</div><p class="dk-cap">', "</div></div><p class=\"dk-cap\">");
  return out.replace('<section class="sec dk dk-metric">', '<section class="sec dk dk-metric ly bm-' + v + (v === "band" ? " ly-dark" : "") + '">');
});
/* ---------- photo pillars: magazine, cards, numbered text, navy ---------- */
lyOpt("pillars", "layout", [["photos", "Tall photo cards"], ["magazine", "Title over the photo"], ["cards", "Photo above a card"], ["text", "Numbered, no photos"], ["rows", "Stacked rows, photo left"]]);
lyWrap("pillars", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "photos") return null;
  if (v === "text")
    return '<section class="sec dk ly ly-ptext">' + deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + '</h2><div class="pt-row" style="--n:' + d.items.length + '">' + d.items.map(function (it, i) { return '<div class="pt tone-' + esc(it.tone || "blue") + '"><span class="pt-n">' + lyNum(i) + "</span><h3>" + esc(it.title) + "</h3><p>" + esc(it.text) + "</p><ul>" + deckLines(it.points).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>"; }).join("") + "</div></section>";
  var out = raw(d);
  return out.replace('<section class="sec dk dk-pillars">', '<section class="sec dk dk-pillars ly pl-' + v + '">');
});
/* ---------- hub and spoke: navy, list, compact ---------- */
lyOpt("hub", "layout", [["spokes", "Hub between two lists"], ["curved", "Curved connectors"], ["dark", "Navy hub"], ["list", "Hub beside the lists"], ["compact", "Compact row"]]);
lyWrap("hub", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "spokes") return null;
  if (v === "curved") return raw(Object.assign({}, d, { connectors: "curved", layout: "spokes" }));
  var out = raw(Object.assign({}, d, { layout: "spokes" }));
  return out.replace('<section class="sec dk dk-hub">', '<section class="sec dk dk-hub ly hb-' + v + (v === "dark" ? " ly-dark" : "") + '">');
});
/* ---------- pipeline: chevrons, down the page, navy ---------- */
lyOpt("pipeline", "layout", [["line", "Steps on a line"], ["bands", "Tinted bracket bands"], ["chevrons", "Chevron steps"], ["vertical", "Down the page"], ["dark", "Navy line"]]);
lyWrap("pipeline", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "line") return null;
  if (v === "bands") return raw(Object.assign({}, d, { bands: "tint", layout: "line" }));
  if (v === "chevrons") {
    var n = d.items.length;
    return '<section class="sec dk dk-pipe ly pp-chev">' + deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>" + (d.intro ? '<p class="dk-intro">' + esc(d.intro) + "</p>" : "") + '<ol class="pchev" style="--n:' + n + '">' + d.items.map(function (it, i) { return '<li class="' + (i === n - 1 ? "end" : "") + '"><span class="dk-dot">' + ic(it.icon) + "</span><b>" + (i + 1) + "</b><span>" + esc(it.label) + "</span></li>"; }).join("") + "</ol></section>";
  }
  var out = raw(Object.assign({}, d, { layout: "line" }));
  return out.replace('<section class="sec dk dk-pipe">', '<section class="sec dk dk-pipe ly pp-' + v + (v === "dark" ? " ly-dark" : "") + '">');
});
/* ---------- logo wall: tone white sits on a navy band ---------- */
lyWrap("logoWall", function (d, ctx, raw) {
  var out = raw(d);
  return d.tone === "white" ? out.replace('<section class="sec dk dk-logos lt-white">', '<section class="sec dk dk-logos lt-white ly lw-dark">') : out;
});
/* ---------- data chart: horizontal bars, lollipops ---------- */
lyOpt("dataChart", "kind", [["hbar", "Horizontal bars"], ["lollipop", "Lollipops"]]);
lyWrap("dataChart", function (d) {
  var v = d.kind;
  if (v !== "hbar" && v !== "lollipop") return null;
  var items = (d.items || []).filter(function (i) { return i && i.label != null; }).slice(0, 8);
  var vals = items.map(function (i) { return numOf(i.value); });
  var ok = vals.filter(function (x) { return isFinite(x); });
  var body;
  if (!ok.length) body = '<p class="t-body chart-empty">Type a label and a number for each item to draw the chart.</p>';
  else {
    var max = Math.max.apply(null, ok.concat([0])) || 1;
    var unit = esc(d.unit || "");
    /* the label column is as wide as its longest label needs (up to half the chart), so a label is never cut */
    var longest = items.reduce(function (n, i) { return Math.max(n, String(i.label || "").length); }, 0);
    var W = 640, rowH = 34, H = items.length * rowH + 8, lw = Math.max(150, Math.min(320, Math.round(longest * 6.8 + 20)));
    var fmt = function (x) { return isFinite(x) ? (Math.abs(x) >= 1000 ? Math.round(x).toLocaleString("en-US") : String(Math.round(x * 10) / 10)) + unit : ""; };
    body = '<svg class="chart chart-' + v + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(d.title || "Chart") + '">';
    items.forEach(function (it, i) {
      var y = 4 + i * rowH + rowH / 2;
      var w = isFinite(vals[i]) ? Math.max(2, ((W - lw - 70) * Math.max(0, vals[i])) / max) : 0;
      body += '<text class="ch-lab" x="' + (lw - 10) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(it.label) + "</text>";
      if (v === "hbar") body += '<rect class="ch-bar' + (i === items.length - 1 ? " last" : "") + '" x="' + lw + '" y="' + (y - 10) + '" width="' + w.toFixed(1) + '" height="20" rx="6"/>';
      else body += '<line class="ch-stem" x1="' + lw + '" x2="' + (lw + w).toFixed(1) + '" y1="' + y + '" y2="' + y + '"/><circle class="ch-dot" cx="' + (lw + w).toFixed(1) + '" cy="' + y + '" r="7"/>';
      if (isFinite(vals[i])) body += '<text class="ch-val" x="' + (lw + w + 12).toFixed(1) + '" y="' + (y + 4) + '">' + fmt(vals[i]) + "</text>";
    });
    body += "</svg>";
  }
  return '<section class="sec dk dk-chart">' + deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>" + body + (d.note ? '<p class="dk-note">' + esc(d.note) + "</p>" : "") + "</section>";
});
/* ---------- comparison: two cards, navy column, stacked pairs, arrows ---------- */
lyOpt("comparison", "layout", [["table", "Table"], ["cards", "Two columns as cards"], ["dark", "Highlighted column in navy"], ["pairs", "Stacked pairs"], ["arrows", "Before → after"]]);
lyWrap("comparison", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "table") return null;
  var cell = function (x) {
    var t = String(x == null ? "" : x).trim();
    return /^[✓✔]$/.test(t) ? ic("check-circle-2") : /^[✗✘×]$/.test(t) ? ic("circle-x") : esc(t);
  };
  var head = deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>";
  if (v === "dark") return raw(d).replace('<section class="sec dk dk-compare">', '<section class="sec dk dk-compare ly cp-dark">');
  if (v === "cards")
    return '<section class="sec dk ly ly-cpcards">' + head + '<div class="cpc-row"><div class="cpc"><b class="cpc-h">' + esc(d.colA) + "</b>" + (d.rows || []).map(function (r) { return '<div class="cpc-r"><span>' + esc(r.label) + "</span><b>" + cell(r.a) + "</b></div>"; }).join("") + '</div><div class="cpc hi"><b class="cpc-h">' + esc(d.colB) + "</b>" + (d.rows || []).map(function (r) { return '<div class="cpc-r"><span>' + esc(r.label) + "</span><b>" + cell(r.b) + "</b></div>"; }).join("") + "</div></div></section>";
  if (v === "pairs")
    return '<section class="sec dk ly ly-cppairs">' + head + '<div class="cpp-grid">' + (d.rows || []).map(function (r) { return '<div class="cpp"><p class="dk-eye sm">' + esc(r.label) + '</p><div class="cpp-v"><span><i>' + esc(d.colA) + "</i><b>" + cell(r.a) + '</b></span><span class="hi"><i>' + esc(d.colB) + "</i><b>" + cell(r.b) + "</b></span></div></div>"; }).join("") + "</div></section>";
  return '<section class="sec dk ly ly-cparrows">' + head + '<div class="cpa-head"><span></span><span>' + esc(d.colA) + '</span><span></span><span class="hi">' + esc(d.colB) + "</span></div>" + (d.rows || []).map(function (r) { return '<div class="cpa"><span class="cpa-l">' + esc(r.label) + '</span><b class="cpa-a">' + cell(r.a) + '</b><span class="cpa-arrow">' + ic("arrow-right") + '</span><b class="cpa-b">' + cell(r.b) + "</b></div>"; }).join("") + "</section>";
});
/* ---------- timeline: cards, alternating, numbered ---------- */
lyOpt("timeline", "direction", [["cards", "Cards along a line"], ["alternate", "Alternating sides"], ["numbered", "Numbered rows"]]);
lyWrap("timeline", function (d, ctx, raw) {
  var v = d.direction;
  if (v !== "cards" && v !== "alternate" && v !== "numbered") return null;
  var items = d.items || [];
  if (v === "numbered")
    return '<section class="sec dk ly ly-tlnum">' + deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + '</h2><ol class="tln">' + items.map(function (it, i) { return '<li><span class="tln-n">' + lyNum(i) + '</span><span class="tln-w">' + esc(it.when) + '</span><div><h3 class="tl-h">' + esc(it.heading) + '</h3><p class="t-body tl-t">' + esc(it.text) + "</p></div></li>"; }).join("") + "</ol></section>";
  var out = raw(Object.assign({}, d, { direction: v === "alternate" ? "down" : "across" }));
  return out.replace(/<section class="sec dk dk-timeline( down)?">/, '<section class="sec dk dk-timeline$1 ly tl-' + v + '">');
});
/* ---------- testimonials: stacked, navy, featured, strip ---------- */
lyOpt("testimonials", "layout", [["wall", "Three side by side"], ["stacked", "One under another"], ["dark", "Navy cards"], ["featured", "One large, two small"], ["strip", "Open strip"]]);
lyWrap("testimonials", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "wall") return null;
  var out = raw(d);
  return out.replace('<section class="sec dk dk-testi">', '<section class="sec dk dk-testi ly te-' + v + '">');
});
/* ---------- team: list, cards, navy, wide ---------- */
lyOpt("team", "layout", [["trio", "Portraits in a row"], ["list", "Rows with portrait left"], ["cards", "Cards"], ["dark", "Navy cards"], ["wide", "Large portrait, text beside"]]);
lyWrap("team", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "trio") return null;
  var out = raw(d);
  return out.replace('<section class="sec dk dk-team">', '<section class="sec dk dk-team ly tm-' + v + '">');
});
/* ---------- tiers: stacked, navy featured, minimal, outlined ---------- */
lyOpt("tiers", "layout", [["columns", "Columns"], ["stacked", "Stacked rows"], ["dark", "Featured tier in navy"], ["minimal", "Open, hairlines"], ["outlined", "Outlined columns"]]);
lyWrap("tiers", function (d, ctx, raw) {
  var v = d.layout;
  if (!v || v === "columns") return null;
  var out = raw(d);
  return out.replace('<section class="sec dk dk-tiers">', '<section class="sec dk dk-tiers ly ti-' + v + '">');
});
/* ---------- checklist: tiles, numbered, navy band ---------- */
lyOpt("checklist", "cols", [["tiles", "Tiles"], ["numbered", "Numbered"], ["band", "Navy band"]]);
lyWrap("checklist", function (d, ctx, raw) {
  var v = d.cols;
  if (v !== "tiles" && v !== "numbered" && v !== "band") return null;
  var items = deckLines(d.items);
  var head = deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>";
  if (v === "numbered") return '<section class="sec dk ly ly-cknum">' + head + '<ol class="ckn">' + items.map(function (x, i) { return "<li><b>" + lyNum(i) + "</b><span>" + esc(x) + "</span></li>"; }).join("") + "</ol></section>";
  if (v === "tiles") return '<section class="sec dk ly ly-cktiles">' + head + '<div class="ckt-grid">' + items.map(function (x) { return '<div class="ckt">' + ic("check-circle-2") + "<span>" + esc(x) + "</span></div>"; }).join("") + "</div></section>";
  return '<section class="sec dk ly ly-ckband"><div class="ly-dark ckb">' + head + deckCheck(items) + "</div></section>";
});
/* the schema reads cols as a number in the plain render; the new values never reach it */
/* ---------- the five designs per module ---------- */
var LIB_DESIGNS = {
  hero: [["No photo", { layout: "text" }], ["Photo right, arch frame", { layout: "right", frame: "arch" }], ["Photo left", { layout: "left" }], ["Photo fading in, light scheme", { layout: "fade", scheme: "light" }], ["Full-bleed photo", { layout: "full" }]],
  kpis: [["White cards", { variant: "cards" }], ["Single bar", { variant: "bar" }], ["Navy cards", { variant: "dark" }], ["Stacked, hairlines", { variant: "stacked" }], ["Tinted tiles", { variant: "tiles" }]],
  stats: [["Open with hairlines", { variant: "open" }], ["Cards", { variant: "cards" }], ["Ice band", { variant: "band" }], ["Rings", { variant: "rings" }], ["Two-column ledger", { variant: "ledger" }]],
  capabilities: [["Cards in a tray", { variant: "tray" }], ["Open two-column list", { variant: "list" }], ["Numbered cards", { variant: "numbered" }], ["Icon columns", { variant: "columns" }], ["Chip strip", { variant: "strip" }]],
  features: [["Icon columns", { layout: "row" }], ["Stacked list", { layout: "stack" }], ["Tinted tiles", { layout: "tiles" }], ["Navy band", { layout: "dark" }], ["Chip line", { layout: "chips" }]],
  storyRows: [["Rows with labels", { variant: "rows" }], ["Numbered, display numerals", { variant: "numbered", numeral: "display" }], ["Side-by-side columns", { variant: "cards" }], ["Vertical timeline", { variant: "timeline" }], ["Heading beside text", { variant: "split" }]],
  storyColumns: [["Three cards", { layout: "cards" }], ["Open columns", { layout: "open" }], ["Stacked rows", { layout: "stacked" }], ["Coloured headers", { layout: "banded" }], ["Display numerals", { layout: "numbered" }], ["Two text columns", { layout: "flow" }]],
  quote: [["Engagement Snapshot", { side: "snapshot" }], ["Discover line + proof", { side: "discover", sideText: "Discover how one glossary and one workflow keep every market on message." }], ["Full width", { side: "none" }], ["Pull quote", { side: "pull" }], ["Quote with proof chips", { side: "chips" }]],
  quoteStats: [["Stats beside the quote", { layout: "side" }], ["Quote beside the stats", { layout: "quoteFirst" }], ["Quote above a stat row", { layout: "stacked" }], ["Stats on a navy band", { layout: "band" }], ["Stat ledger beside the quote", { layout: "ledger" }]],
  expert: [["Stats, card on the right", { layout: "side" }], ["Card on the left", { layout: "cardLeft" }], ["Stats row, card beneath", { layout: "stacked" }], ["Navy expert card", { layout: "navy" }], ["Stat ledger, card beside", { layout: "open" }]],
  cta: [["Navy bar", { fill: "navy" }], ["Gradient bar", { fill: "gradient" }], ["Cobalt bar", { fill: "cobalt" }], ["Split, with a QR code", { fill: "navy", layout: "split" }], ["Centred stack", { fill: "navy", layout: "centered" }]],
  footer: [["Open strip", { style: "open" }], ["White card", { style: "card" }], ["Open strip with QR code", { style: "open", qr: "url" }], ["Navy strip", { style: "band" }], ["Centred", { style: "centered" }]],
  numbersGrid: [["Grid with platform card", { variant: "card" }], ["Grid only", { variant: "grid" }], ["Navy tiles", { variant: "dark" }], ["Figures in one line", { variant: "inline" }], ["Figure ledger", { variant: "ledger" }], ["Lead figure and four beside", { variant: "bento" }], ["Ruled grid", { variant: "swiss" }], ["Rising steps", { variant: "stair" }], ["Figures in rings", { variant: "halo" }]],
  stages: [["Stages side by side", { variant: "columns" }], ["One stage in focus", { variant: "focus" }], ["Chevron steps", { variant: "steps" }], ["Down the page", { variant: "vertical" }], ["Cards with checklists", { variant: "cards" }]],
  footprint: [["Map with city list", { variant: "list" }], ["Map with regional split", { variant: "split" }], ["Map with the figure only", { variant: "headline" }], ["Navy map", { variant: "dark" }], ["Small map, list beside", { variant: "compact" }]],
  bigMetric: [["Figure left, drivers right", { layout: "left" }], ["Centred figure", { layout: "centered" }], ["Navy band", { layout: "band" }], ["Figure beside the bars", { layout: "split" }], ["Figure in a ring", { layout: "ring" }]],
  pillars: [["Tall photo cards", { layout: "photos" }], ["Title over the photo", { layout: "magazine" }], ["Photo above a card", { layout: "cards" }], ["Numbered, no photos", { layout: "text" }], ["Stacked rows, photo left", { layout: "rows" }]],
  hub: [["Hub between two lists", { layout: "spokes" }], ["Curved connectors", { layout: "curved" }], ["Navy hub", { layout: "dark" }], ["Hub beside the lists", { layout: "list" }], ["Compact row", { layout: "compact" }]],
  pipeline: [["Steps on a line", { layout: "line" }], ["Tinted bracket bands", { layout: "bands" }], ["Chevron steps", { layout: "chevrons" }], ["Down the page", { layout: "vertical" }], ["Navy line", { layout: "dark" }]],
  logoWall: [["Four columns", { cols: "4" }], ["Five columns", { cols: "5" }], ["Six columns", { cols: "6" }], ["Greyscale", { cols: "5", tone: "grey" }], ["White on navy", { cols: "5", tone: "white" }]],
  dataChart: [["Bars", { kind: "bar" }], ["Line", { kind: "line" }], ["Donut", { kind: "donut" }], ["Horizontal bars", { kind: "hbar" }], ["Lollipops", { kind: "lollipop" }]],
  comparison: [["Table", { layout: "table" }], ["Two columns as cards", { layout: "cards" }], ["Highlighted column in navy", { layout: "dark" }], ["Stacked pairs", { layout: "pairs" }], ["Before → after", { layout: "arrows" }]],
  timeline: [["Across the page", { direction: "across" }], ["Down the page", { direction: "down" }], ["Cards along a line", { direction: "cards" }], ["Alternating sides", { direction: "alternate" }], ["Numbered rows", { direction: "numbered" }]],
  testimonials: [["Three side by side", { layout: "wall" }], ["One under another", { layout: "stacked" }], ["Navy cards", { layout: "dark" }], ["One large, two small", { layout: "featured" }], ["Open strip", { layout: "strip" }]],
  team: [["Portraits in a row", { layout: "trio" }], ["Rows with portrait left", { layout: "list" }], ["Cards", { layout: "cards" }], ["Navy cards", { layout: "dark" }], ["Large portrait, text beside", { layout: "wide" }]],
  tiers: [["Columns", { layout: "columns" }], ["Stacked rows", { layout: "stacked" }], ["Featured tier in navy", { layout: "dark" }], ["Open, hairlines", { layout: "minimal" }], ["Outlined columns", { layout: "outlined" }]],
  checklist: [["One column", { cols: "1" }], ["Two columns", { cols: "2" }], ["Tiles", { cols: "tiles" }], ["Numbered", { cols: "numbered" }], ["Navy band", { cols: "band" }]],
};
var libVariantsLyRaw = libVariants;
libVariants = function (k) {
  var L = LIB_DESIGNS[k];
  if (!L) return libVariantsLyRaw.apply(this, arguments);
  return L.map(function (v) { return [v[0], Object.assign({}, v[1])]; });
};

// Ported render-only definitions: 34-engine-spectrum-modules.js
/* ================= design advancements, batch F: modules from the PowerPoint Style Guide's templates =================
   The guide's master deck holds 42 slide templates; most already exist here as modules (numbers, stages,
   footprint, checklist, image cards, team, workflow). Four did not:
   1. Agenda: what the meeting or the page covers, in order.
   2. Section divider: a numbered break between parts of a long material.
   3. Words as design: three giant words in the gradient (Human, Hybrid, AI) with what sits under each.
   4. In the news: dated headlines, from the press and the trade.
   Each has five designs that differ in layout, draws in the deck family's voice (light cards, tracked labels,
   gradient numerals) and turns to the Spectrum look's frosted glass when a material uses it.            */
Object.assign(MODULES, {
  agenda: {
    name: "Agenda",
    group: "Corporate",
    vk: "layout",
    desc: "What the meeting or the page covers, in order. From the guide's Agenda slide.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["split", "Title left, rows right"], ["rows", "Numbered rows"], ["cards", "Numbered tiles"], ["line", "Stops on a line"], ["columns", "Two columns"], ["splitStat", "Title and a big figure left, rows right"], ["splitIcons", "Title and icon tiles left, rows right"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "intro", l: "Line under the title", t: "textarea", opt: true },
      { k: "stat", l: "Big figure (for the figure layout)", opt: true },
      { k: "statLabel", l: "What the figure counts", opt: true },
      { k: "items", l: "Agenda items", t: "list", min: 2, max: 6, f: [{ k: "heading", l: "Item" }, { k: "icon", l: "Icon (for the icon layout)", opt: true }, { k: "text", l: "Line", t: "textarea" }] },
    ],
    def: function () {
      return {
        layout: "split",
        eyebrow: "Agenda",
        title: "What we will cover",
        intro: "Four parts, about forty minutes, with time for questions at the end.",
        items: [
          { heading: "Where you are today", text: "How content moves between your teams and your markets now." },
          { heading: "What changes with GlobalLink", text: "One workflow, one glossary, one view of every market." },
          { heading: "A launch, start to finish", text: "The Fernwood & Vale roll-out in fourteen markets." },
          { heading: "Next steps", text: "A pilot plan, owners and dates." },
        ],
      };
    },
    render: function (d) {
      var items = d.items || [];
      var v = d.layout || "split";
      var head = deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>" + (d.intro ? '<p class="dk-intro">' + esc(d.intro) + "</p>" : "");
      var row = function (it, i) { return '<li class="ag-r"><b class="ag-n">' + lyNum(i) + '</b><div><h3 class="ag-h">' + esc(it.heading) + '</h3><p class="t-body ag-t">' + esc(it.text) + "</p></div></li>"; };
      if (v === "rows") return '<section class="sec dk ly ly-ag ag-rows">' + head + '<ol class="ag-list">' + items.map(row).join("") + "</ol></section>";
      if (v === "cards") return '<section class="sec dk ly ly-ag ag-cards">' + head + '<ol class="ag-grid" style="--n:' + (items.length === 4 ? 2 : Math.min(3, items.length)) + '">' + items.map(function (it, i) { return '<li class="ag-c"><b class="ag-n dk-big">' + lyNum(i) + '</b><h3 class="ag-h">' + esc(it.heading) + '</h3><p class="t-body ag-t">' + esc(it.text) + "</p></li>"; }).join("") + "</ol></section>";
      if (v === "line") return '<section class="sec dk ly ly-ag ag-line">' + head + '<ol class="ag-stops" style="--n:' + items.length + '">' + items.map(function (it, i) { return '<li class="ag-s"><span class="ag-dot">' + (i + 1) + '</span><h3 class="ag-h">' + esc(it.heading) + '</h3><p class="t-body ag-t">' + esc(it.text) + "</p></li>"; }).join("") + "</ol></section>";
      if (v === "columns") return '<section class="sec dk ly ly-ag ag-cols">' + head + '<ol class="ag-list" style="--r:' + Math.ceil(items.length / 2) + '">' + items.map(function (it, i) { var r = row(it, i); return i === Math.ceil(items.length / 2) - 1 || i === items.length - 1 ? r.replace('class="ag-r"', 'class="ag-r last"') : r; }).join("") + "</ol></section>";
      var rail = '<ol class="ag-rail" aria-hidden="true">' + items.map(function (it, i) { return '<li><span class="ag-rd" data-p="' + ((i % 3) + 1) + '">' + (i + 1) + '</span><span class="ag-rt">' + esc(it.heading) + "</span></li>"; }).join("") + "</ol>";
      if (v === "splitStat") {
        var stat = d.stat || String(items.length);
        return '<section class="sec dk ly ly-ag ag-split ag-splitstat"><div class="ag-l">' + head + '<div class="ag-stat"><b class="ag-sv dk-big">' + esc(stat) + '</b><span class="ag-sl">' + esc(d.statLabel || (items.length === 1 ? "step" : "steps")) + "</span></div></div><ol class=\"ag-list\">" + items.map(row).join("") + "</ol></section>";
      }
      if (v === "splitIcons") {
        var dflt = ["list-checks", "workflow", "target", "check-circle", "layers", "sparkles"];
        var tiles = '<div class="ag-tiles' + (Math.min(items.length, 4) === 3 ? " n3" : "") + '" aria-hidden="true">' + items.slice(0, 4).map(function (it, i) { return '<div class="ag-tile"><span class="disc">' + ic(it.icon || dflt[i % dflt.length]) + '</span><span class="ag-tl">' + esc(it.heading) + "</span></div>"; }).join("") + "</div>";
        return '<section class="sec dk ly ly-ag ag-split ag-spliticons"><div class="ag-l">' + head + tiles + '</div><ol class="ag-list">' + items.map(row).join("") + "</ol></section>";
      }
      return '<section class="sec dk ly ly-ag ag-split"><div class="ag-l">' + head + rail + '</div><ol class="ag-list">' + items.map(row).join("") + "</ol></section>";
    },
  },
  divider: {
    name: "Section divider",
    group: "Corporate",
    vk: "layout",
    desc: "A numbered break between the parts of a long material. From the guide's Section divider slide.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["left", "Left, with tinted panel"], ["centered", "Centred"], ["numeral", "Large numeral"], ["rule", "Title on a spectrum rule"], ["band", "Frosted banner"], ["photo", "Photo, tinted in the section colour"]] },
      { k: "eyebrow", l: "Section label" },
      { k: "num", l: "Number", opt: true },
      { k: "title", l: "Title" },
      { k: "accent", l: "Words of the title in the gradient", opt: true },
      { k: "sub", l: "Line under the title", t: "textarea", opt: true },
    ],
    def: function () {
      return { layout: "left", eyebrow: "Section 02", num: "02", title: "From pilot to every market", accent: "every market", sub: "How the first two markets became fourteen, and what the team did differently each time." };
    },
    render: function (d) {
      var v = d.layout || "left";
      var title = deckTitle(d.title, d.accent);
      var sub = d.sub ? '<p class="dk-intro dv-sub">' + esc(d.sub) + "</p>" : "";
      var num = d.num ? '<b class="dv-n dk-mega">' + esc(d.num) + "</b>" : "";
      var eye = deckEyebrow(d.eyebrow);
      if (v === "photo") {
        var ph = cleanPhoto(d.photo); // only a real picture is drawn (an uploaded one by its id, or clean image data)
        return '<section class="sec dk ly ly-dv dv-photo"><div class="dv-ph" style="' + (ph ? "background-image:url(&quot;" + esc(imgSrc(ph)) + "&quot;);background-position:" + (ph.fx || 50) + "% " + (ph.fy || 50) + "%" : "") + '"></div><div class="dv-pt"></div><div class="dv-pc">' + num + '<div class="dv-c">' + eye + title + sub + "</div></div></section>";
      }
      if (v === "centered") return '<section class="sec dk ly ly-dv dv-centered">' + eye + title + sub + "</section>";
      if (v === "numeral") return '<section class="sec dk ly ly-dv dv-numeral">' + num + '<div class="dv-c">' + eye + title + sub + "</div></section>";
      if (v === "rule") return '<section class="sec dk ly ly-dv dv-rule">' + eye + title + '<i class="dv-line" aria-hidden="true"></i>' + sub + "</section>";
      if (v === "band") return '<section class="sec dk ly ly-dv dv-band"><div class="dv-b">' + num + '<div class="dv-c">' + eye + title + sub + "</div></div></section>";
      return '<section class="sec dk ly ly-dv dv-left"><div class="dv-c">' + eye + title + sub + '</div><div class="dv-panel" aria-hidden="true">' + num + "</div></section>";
    },
  },
  typeDesign: {
    name: "Words as design",
    group: "Corporate",
    vk: "layout",
    desc: "Three giant words in the gradient, with what sits under each. From the guide's Type as design slide; three at most.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["rows", "Words left, lists right"], ["columns", "Three columns"], ["stacked", "Words in one line"], ["cards", "Cards"], ["centered", "Centred"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "items", l: "Words", t: "list", min: 2, max: 3, f: [{ k: "label", l: "Label above the word" }, { k: "heading", l: "Word" }, { k: "text", l: "Lines (one per line)", t: "textarea" }] },
    ],
    def: function () {
      return {
        layout: "rows",
        eyebrow: "AI strategy",
        title: "Content-driven AI strategy",
        items: [
          { label: "Human-centric", heading: "Human", text: "Brand campaigns\nLegal contracts\nHR communications\nExecutive messaging" },
          { label: "Hybrid-friendly", heading: "Hybrid", text: "Customer support\nProduct manuals\nKnowledge base\nEmail and notifications" },
          { label: "AI-driven", heading: "AI", text: "User forums\nSupport chat\nProduct reviews\nInternal documents" },
        ],
      };
    },
    render: function (d) {
      var items = (d.items || []).slice(0, 3);
      var v = d.layout || "rows";
      var head = deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>";
      /* every word of the module is set at one size: the one at which the longest fits its column */
      /* beside its list ("rows") a word of two words may take two lines, so its length is that of its longer word */
      var wlen = function (it) {
        var t = String(it.heading || "").trim();
        return Math.max(2, v === "rows" ? Math.max.apply(null, t.split(/\s+/).map(function (w) { return w.length; })) : t.length);
      };
      var lmAll = ' style="--lm:' + Math.max.apply(null, items.map(wlen).concat([2])) + '"';
      var word = function (it) { return '<b class="td-w dk-big' + (v === "rows" && /\s/.test(String(it.heading || "").trim()) ? " td-wr" : "") + '" style="--l:' + wlen(it) + '">' + esc(it.heading) + "</b>"; };
      var lab = function (it) { return '<span class="td-l">' + esc(it.label) + "</span>"; };
      var list = function (it) { return '<ul class="td-ul">' + deckLines(it.text).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; };
      if (v === "columns") return '<section class="sec dk ly ly-td td-columns"' + lmAll + '>' + head + '<div class="td-g" style="--n:' + items.length + ';--cw:' + Math.max(20, 2 + Math.round(.7 * Math.max.apply(null, items.map(function (it) { return Math.max.apply(null, deckLines(it.text).map(function (x) { return String(x).length; }).concat([0])); })))) + ';--lm:' + Math.max.apply(null, items.map(function (it) { return Math.max(2, String(it.heading || "").length); })) + '">' + items.map(function (it) { return '<div class="td-c">' + lab(it) + word(it) + list(it) + "</div>"; }).join("") + "</div></section>";
      if (v === "stacked") return '<section class="sec dk ly ly-td td-stacked"' + lmAll + '>' + head + '<div class="td-line" style="--n:' + items.length + '">' + items.map(function (it) { return '<div class="td-c">' + word(it) + lab(it) + "</div>"; }).join("") + '</div><div class="td-g" style="--n:' + items.length + '">' + items.map(function (it) { return '<div class="td-c">' + list(it) + "</div>"; }).join("") + "</div></section>";
      if (v === "cards") return '<section class="sec dk ly ly-td td-cards"' + lmAll + '>' + head + '<div class="td-g" style="--n:' + items.length + '">' + items.map(function (it) { return '<div class="td-c card">' + lab(it) + word(it) + list(it) + "</div>"; }).join("") + "</div></section>";
      if (v === "centered") return '<section class="sec dk ly ly-td td-centered"' + lmAll + '>' + head + '<div class="td-g" style="--n:' + items.length + '">' + items.map(function (it) { return '<div class="td-c">' + word(it) + lab(it) + list(it) + "</div>"; }).join("") + "</div></section>";
      return '<section class="sec dk ly ly-td td-rows"' + lmAll + '>' + head + items.map(function (it) { return '<div class="td-r"><div class="td-wl">' + lab(it) + word(it) + "</div>" + list(it) + "</div>"; }).join("") + "</section>";
    },
  },
  news: {
    name: "In the news",
    group: "Corporate",
    vk: "layout",
    desc: "Dated headlines from the press and the trade, with a line each. From the guide's In the news slide.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["columns", "Cards in a row"], ["grid", "Two by two"], ["featured", "One large, three small"], ["list", "Headline list"], ["rail", "Dated rail"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "items", l: "Stories", t: "list", min: 2, max: 4, f: [{ k: "label", l: "Outlet" }, { k: "when", l: "Date" }, { k: "heading", l: "Headline" }, { k: "text", l: "Line", t: "textarea" }, { k: "logo", l: "Client logo", t: "image", lib: true, opt: true }] },
    ],
    def: function () {
      return {
        layout: "columns",
        eyebrow: "In the news",
        title: "What the trade is saying",
        items: [
          { label: "Slator", when: "Oct 2026", heading: "AI-first workflows reach the mainstream", text: "Language service buyers move human review to the end of the line." },
          { label: "CSA Research", when: "Sep 2026", heading: "Glossaries drive quality more than models", text: "Brand terms matter more than which engine translates them." },
          { label: "Multilingual", when: "Aug 2026", heading: "One platform, fourteen markets", text: "A retailer's launch moves from a quarter to nine days." },
          { label: "Fernwood Review", when: "Jul 2026", heading: "Launch day, same morning", text: "Regional teams go live together for the first time." },
        ],
      };
    },
    render: function (d) {
      var items = (d.items || []).slice(0, 4);
      var v = d.layout || "columns";
      var head = deckEyebrow(d.eyebrow) + '<h2 class="dk-title">' + esc(d.title) + "</h2>";
      var meta = function (it) { return '<p class="nw-m"><b>' + esc(it.label) + "</b><span>" + esc(it.when) + "</span></p>"; };
      var nlogo = function (it) { return hasImg(it.logo) ? '<span class="nw-logo">' + photoImg(it.logo, "ia-img fit-contain") + "</span>" : ""; };
      var card = function (it, big) { return '<article class="nw-c' + (big ? " big" : "") + '">' + nlogo(it) + meta(it) + '<h3 class="nw-h">' + esc(it.heading) + '</h3><p class="t-body nw-t">' + esc(it.text) + "</p></article>"; };
      if (v === "grid") return '<section class="sec dk ly ly-nw nw-grid">' + head + '<div class="nw-g">' + items.map(function (it) { return card(it); }).join("") + "</div></section>";
      if (v === "featured") return '<section class="sec dk ly ly-nw nw-featured">' + head + '<div class="nw-f">' + (items[0] ? card(items[0], true) : "") + '<div class="nw-s">' + items.slice(1).map(function (it) { return card(it); }).join("") + "</div></div></section>";
      if (v === "list") return '<section class="sec dk ly ly-nw nw-list">' + head + '<ul class="nw-ul">' + items.map(function (it) { return '<li class="nw-r">' + meta(it) + '<div><h3 class="nw-h">' + esc(it.heading) + '</h3><p class="t-body nw-t">' + esc(it.text) + "</p></div></li>"; }).join("") + "</ul></section>";
      if (v === "rail") return '<section class="sec dk ly ly-nw nw-rail">' + head + '<ol class="nw-ol" style="--n:' + items.length + '">' + items.map(function (it) { return '<li class="nw-i"><span class="nw-when">' + esc(it.when) + '</span><span class="nw-pt"></span><b class="nw-o">' + esc(it.label) + '</b><h3 class="nw-h">' + esc(it.heading) + '</h3><p class="t-body nw-t">' + esc(it.text) + "</p></li>"; }).join("") + "</ol></section>";
      return '<section class="sec dk ly ly-nw nw-columns">' + head + '<div class="nw-g" style="--n:' + items.length + '">' + items.map(function (it) { return card(it); }).join("") + "</div></section>";
    },
  },
});

/* a full title page for a long material: four covers, each a whole sheet */
Object.assign(MODULES, {
  cover: {
    name: "Title page",
    group: "Corporate",
    vk: "layout",
    desc: "The first sheet of a whitepaper or report: a photo cover, a split cover, a side-photo cover or a type-only cover.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["photo", "Full photo, tinted"], ["split", "Photo over a white panel"], ["side", "Photo on the right"], ["aura", "Type on the Spectrum aura"], ["bar", "Photo with a bottom title bar"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "accent", l: "Words of the title in the gradient", opt: true },
      { k: "sub", l: "Line under the title", t: "textarea", opt: true },
      { k: "meta", l: "Details (one per line)", t: "textarea", opt: true },
      { k: "photo", l: "Photo", t: "image", opt: true },
    ],
    def: function () {
      return { layout: "photo", eyebrow: "Whitepaper", title: "The title of your whitepaper goes here", accent: "your whitepaper", sub: "A line that says what the reader will take away.", meta: "TransPerfect\nMonth 2026", photo: null };
    },
    render: function (d) {
      var v = d.layout || "photo";
      var ph = cleanPhoto(d.photo); // only a real picture is drawn (an uploaded one by its id, or clean image data)
      var img = ph ? '<div class="cv-ph" style="background-image:url(&quot;' + esc(imgSrc(ph)) + "&quot;);background-position:" + (ph.fx || 50) + "% " + (ph.fy || 50) + '%"></div>' : '<div class="cv-ph cv-none"></div>';
      var meta = d.meta ? '<ul class="cv-meta">' + deckLines(d.meta).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>" : "";
      var body = deckEyebrow(d.eyebrow) + deckTitle(d.title, d.accent, "cv-title") + (d.sub ? '<p class="dk-intro cv-sub">' + esc(d.sub) + "</p>" : "") + '<i class="cv-rule" aria-hidden="true"></i>' + meta;
      if (v === "split") return '<section class="sec dk ly ly-cv cv-split">' + img + '<div class="cv-tint"></div><div class="cv-body">' + body + "</div></section>";
      if (v === "side") return '<section class="sec dk ly ly-cv cv-side"><div class="cv-body">' + body + "</div>" + img + '<div class="cv-tint"></div></section>';
      if (v === "aura") return '<section class="sec dk ly ly-cv cv-aura"><i class="cv-orb o1"></i><i class="cv-orb o2"></i><i class="cv-orb o3"></i><div class="cv-body">' + body + "</div></section>";
      if (v === "bar") return '<section class="sec dk ly ly-cv cv-bar">' + img + '<div class="cv-body">' + body + "</div></section>";
      return '<section class="sec dk ly ly-cv cv-photo">' + img + '<div class="cv-tint"></div><div class="cv-body">' + body + "</div></section>";
    },
  },
});
LIB_DESIGNS.cover = [["Full photo, tinted", { layout: "photo" }], ["Photo over a white panel", { layout: "split" }], ["Photo on the right", { layout: "side" }], ["Type on the Spectrum aura", { layout: "aura" }], ["Photo with a bottom title bar", { layout: "bar" }]];
["agenda", "divider", "typeDesign", "news", "cover"].forEach(function (k) {
  if (MODULES[k].fields.some(function (f) { return f.k === "surface"; })) return;
  MODULES[k].fields.push({ k: "surface", l: "Background", t: "select", opt: true, o: SURFACES.map(function (s) { return s.slice(); }) });
});
LIB_DESIGNS.agenda = [["Title left, rows right", { layout: "split" }], ["Numbered rows", { layout: "rows" }], ["Numbered tiles", { layout: "cards" }], ["Stops on a line", { layout: "line" }], ["Two columns", { layout: "columns" }], ["Big figure beside the rows", { layout: "splitStat" }], ["Icon tiles beside the rows", { layout: "splitIcons" }]];
LIB_DESIGNS.divider = [["Left, with tinted panel", { layout: "left" }], ["Centred", { layout: "centered" }], ["Large numeral", { layout: "numeral" }], ["Title on a spectrum rule", { layout: "rule" }], ["Frosted banner", { layout: "band" }]];
LIB_DESIGNS.typeDesign = [["Words left, lists right", { layout: "rows" }], ["Three columns", { layout: "columns" }], ["Words in one line", { layout: "stacked" }], ["Cards", { layout: "cards" }], ["Centred", { layout: "centered" }]];
LIB_DESIGNS.news = [["Cards in a row", { layout: "columns" }], ["Two by two", { layout: "grid" }], ["One large, three small", { layout: "featured" }], ["Headline list", { layout: "list" }], ["Dated rail", { layout: "rail" }]];

// Ported render-only definitions: 35-engine-dataviz-modules.js
/* ================= design advancements, batch G: data visualization =================
   Five modules for numbers that need more than a bar chart. Each draws from figures typed in the Content tab,
   in the deck family's voice, and turns to frosted glass under the Spectrum look.
   Written as React components (35b-dataviz-react.js), rendered to static HTML so every export keeps working.
   1. KPI trends: figures with a sparkline and a change chip.
   2. Funnel and waterfall: how a number narrows, or how it builds up.
   3. Heatmap: a grid of values, shaded by size.
   4. Target bars: actual against target (bullet, rings, dumbbell, progress, table).
   5. Multi-series chart: lines, grouped or stacked bars, areas, with a legend and a callout.         */
function dvNum(s) {
  var m = String(s == null ? "" : s).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
function dvList(s) {
  return String(s == null ? "" : s).split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}
function dvNums(s) {
  return dvList(s).map(dvNum).filter(function (n) { return isFinite(n); });
}
function dvFmt(n, unit) {
  if (!isFinite(n)) return "";
  var a = Math.abs(n);
  var t = a >= 1000 ? Math.round(n).toLocaleString("en-US") : String(Math.round(n * 10) / 10);
  return t + (unit || "");
}
function dvDir(s) {
  return /^\s*[-−–▼]/.test(String(s || "")) ? "down" : "up";
}
function dvClean(s) {
  return String(s || "").replace(/^\s*[+▲▼]\s*/, "").replace(/^\s*[-−–]\s*/, "−");
}
function dvNice(max) {
  if (!(max > 0)) return 1;
  var p = Math.pow(10, Math.floor(Math.log10(max)));
  var f = max / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 8 ? 8 : 10) * p;
}

Object.assign(MODULES, {
  kpiTrend: {
    name: "KPI trends",
    group: "Proof",
    vk: "layout",
    desc: "Two to four figures, each with a sparkline and a change chip. Type the trend as numbers separated by commas.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["tiles", "Tiles with sparklines"], ["strip", "One strip"], ["rail", "Rows"], ["bars", "Mini columns"], ["hero", "One large, rest beside"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "note", l: "Source or note", opt: true },
      { k: "items", l: "Figures", t: "list", min: 2, max: 4, f: [{ k: "label", l: "Label" }, { k: "value", l: "Figure" }, { k: "delta", l: "Change (e.g. +12%, −3 days)" }, { k: "series", l: "Trend (numbers, commas)" }] },
    ],
    def: function () {
      return {
        layout: "tiles",
        eyebrow: "Programme health",
        title: "Twelve months on GlobalLink",
        note: "Fictional figures for the example project.",
        items: [
          { label: "Markets live", value: "14", delta: "+11", series: "3,3,4,5,7,8,9,11,12,13,14,14" },
          { label: "Weeks to launch", value: "6", delta: "−8 wks", series: "14,13,12,11,10,9,9,8,7,7,6,6" },
          { label: "Cost per word", value: "−31%", delta: "−31%", series: "100,98,95,90,86,82,79,75,73,71,70,69" },
          { label: "Reuse from memory", value: "68%", delta: "+22 pts", series: "46,48,50,53,55,58,60,62,64,66,67,68" },
        ],
      };
    },
  },
  funnel: {
    name: "Funnel and waterfall",
    group: "Proof",
    vk: "layout",
    desc: "How a number narrows stage by stage. The waterfall shows what each stage gained or lost against the one before. Type each stage's number, largest first.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["taper", "Centred funnel"], ["bars", "Bars with step rates"], ["columns", "Columns"], ["steps", "Chevron steps"], ["waterfall", "Waterfall"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "unit", l: "Unit after each number", opt: true },
      { k: "totalLabel", l: "Waterfall: label for the final bar", opt: true },
      { k: "note", l: "Source or note", opt: true },
      { k: "items", l: "Stages", t: "list", min: 3, max: 6, f: [{ k: "label", l: "Stage" }, { k: "value", l: "Number" }, { k: "text", l: "Line (optional)", t: "textarea", opt: true }] },
    ],
    def: function () {
      return {
        layout: "taper",
        eyebrow: "Content pipeline",
        title: "From request to published, in the first quarter",
        unit: "",
        totalLabel: "Remaining",
        note: "Fictional figures for the example project.",
        items: [
          { label: "Requests received", value: "1,200", text: "" },
          { label: "Briefed and scoped", value: "940", text: "" },
          { label: "Translated and reviewed", value: "870", text: "" },
          { label: "Signed off by market", value: "780", text: "" },
          { label: "Published", value: "742", text: "" },
        ],
      };
    },
  },
  heatmap: {
    name: "Heatmap",
    group: "Proof",
    vk: "layout",
    desc: "A grid of values shaded by size: markets by quarter, topics by region. Type column labels, then each row's numbers, separated by commas.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["numbers", "Shaded numbers"], ["grid", "Colour grid"], ["dots", "Dots"], ["bands", "Joined bands"], ["strip", "Calendar strip"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "cols", l: "Column labels (commas)", t: "textarea" },
      { k: "lo", l: "Legend: low end", opt: true },
      { k: "hi", l: "Legend: high end", opt: true },
      { k: "note", l: "Source or note", opt: true },
      { k: "rows", l: "Rows", t: "list", min: 2, max: 7, f: [{ k: "label", l: "Row" }, { k: "values", l: "Numbers (commas)" }] },
    ],
    def: function () {
      return {
        layout: "numbers",
        eyebrow: "Volume by market",
        title: "Where the words go, quarter by quarter",
        cols: "Q1, Q2, Q3, Q4, Q1, Q2",
        lo: "Fewer words",
        hi: "More words",
        note: "Millions of words. Fictional figures for the example project.",
        rows: [
          { label: "Germany", values: "1.2, 1.6, 2.1, 2.8, 3.1, 3.6" },
          { label: "France", values: "0.9, 1.1, 1.8, 2.2, 2.6, 2.9" },
          { label: "Japan", values: "0.4, 0.8, 1.4, 2.0, 2.7, 3.4" },
          { label: "Brazil", values: "0.2, 0.3, 0.7, 1.1, 1.6, 2.2" },
          { label: "Poland", values: "0.1, 0.2, 0.4, 0.6, 0.9, 1.3" },
        ],
      };
    },
  },
  bullet: {
    name: "Target bars",
    group: "Proof",
    vk: "layout",
    desc: "Actual against target for two to five measures, in five drawings. Type the actual and the target as plain numbers.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["bullet", "Bullet bars"], ["rings", "Rings"], ["dumbbell", "Start and end"], ["progress", "Progress bars"], ["table", "Table with status"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "unit", l: "Unit after each number", opt: true },
      { k: "note", l: "Source or note", opt: true },
      { k: "items", l: "Measures", t: "list", min: 2, max: 5, f: [{ k: "label", l: "Measure" }, { k: "value", l: "Actual" }, { k: "target", l: "Target" }, { k: "text", l: "Line (optional)", t: "textarea", opt: true }] },
    ],
    def: function () {
      return {
        layout: "bullet",
        eyebrow: "Year one scorecard",
        title: "Where the programme stands against plan",
        unit: "",
        note: "Fictional figures for the example project.",
        items: [
          { label: "Markets live", value: "14", target: "12", text: "Two markets ahead of plan." },
          { label: "Content on one platform (%)", value: "82", target: "90", text: "Legal and HR still to move." },
          { label: "Memory reuse (%)", value: "68", target: "60", text: "" },
          { label: "Weeks to launch", value: "6", target: "6", text: "" },
        ],
      };
    },
  },
  seriesChart: {
    name: "Multi-series chart",
    group: "Proof",
    vk: "layout",
    desc: "Two to four series on one chart, with a legend and an optional callout. Type labels once, then each series' numbers, separated by commas.",
    fields: [
      { k: "layout", l: "Layout", t: "select", o: [["lines", "Lines"], ["grouped", "Grouped columns"], ["stacked", "Stacked columns"], ["area", "Areas"], ["callout", "Lines with a callout"]] },
      { k: "eyebrow", l: "Label above the title" },
      { k: "title", l: "Title" },
      { k: "cats", l: "Labels along the bottom (commas)", t: "textarea" },
      { k: "calloutHead", l: "Callout: heading", opt: true },
      { k: "calloutText", l: "Callout: text", t: "textarea", opt: true },
      { k: "note", l: "Source or note", opt: true },
      { k: "series", l: "Series", t: "list", min: 2, max: 4, f: [{ k: "name", l: "Name" }, { k: "values", l: "Numbers (commas)" }] },
    ],
    def: function () {
      return {
        layout: "lines",
        eyebrow: "Words by workflow",
        title: "Machine translation took the lead in year two",
        cats: "2022, 2023, 2024, 2025, 2026",
        calloutHead: "Human review stayed flat",
        calloutText: "Volume grew fourfold while the reviewed share held at about a fifth, so quality scores rose with it.",
        note: "Millions of words. Fictional figures for the example project.",
        series: [
          { name: "Machine, then review", values: "2, 5, 11, 19, 27" },
          { name: "Human only", values: "6, 6, 7, 7, 8" },
          { name: "Machine only", values: "1, 2, 4, 8, 14" },
        ],
      };
    },
  },
});
["kpiTrend", "funnel", "heatmap", "bullet", "seriesChart"].forEach(function (k) {
  if (MODULES[k].fields.some(function (f) { return f.k === "surface"; })) return;
  MODULES[k].fields.push({ k: "surface", l: "Background", t: "select", opt: true, o: SURFACES.map(function (s) { return s.slice(); }) });
});
LIB_DESIGNS.kpiTrend = [["Tiles with sparklines", { layout: "tiles" }], ["One strip", { layout: "strip" }], ["Rows", { layout: "rail" }], ["Mini columns", { layout: "bars" }], ["One large, rest beside", { layout: "hero" }]];
LIB_DESIGNS.funnel = [["Centred funnel", { layout: "taper" }], ["Bars with step rates", { layout: "bars" }], ["Columns", { layout: "columns" }], ["Chevron steps", { layout: "steps" }], ["Waterfall", { layout: "waterfall" }]];
LIB_DESIGNS.heatmap = [["Shaded numbers", { layout: "numbers" }], ["Colour grid", { layout: "grid" }], ["Dots", { layout: "dots" }], ["Joined bands", { layout: "bands" }], ["Calendar strip", { layout: "strip" }]];
LIB_DESIGNS.bullet = [["Bullet bars", { layout: "bullet" }], ["Rings", { layout: "rings" }], ["Start and end", { layout: "dumbbell" }], ["Progress bars", { layout: "progress" }], ["Table with status", { layout: "table" }]];
LIB_DESIGNS.seriesChart = [["Lines", { layout: "lines" }], ["Grouped columns", { layout: "grouped" }], ["Stacked columns", { layout: "stacked" }], ["Areas", { layout: "area" }], ["Lines with a callout", { layout: "callout" }]];

// Ported render-only definitions: 35b-dataviz-react.js
/* ================= batch G, drawn with React =================
   The five data modules are components. Each one renders to static HTML (react-dom/server) so the editor preview,
   the PowerPoint, Illustrator and Word exports and print all read the same markup as every other module.
   Class names, custom properties and structure match the stylesheet in canvas.css (HTML5 elements, CSS3 grid,
   custom properties, color-mix and conic gradients).                                                         */
var dvh = __RE.createElement;
function dvRender(C, d) {
  return __RDS.renderToStaticMarkup(dvh(C, { d: d }));
}
function DvHead(p) {
  var d = p.d;
  return [d.eyebrow ? dvh("p", { key: "e", className: "dk-eye" }, d.eyebrow) : null, dvh("h2", { key: "t", className: "dk-title" }, d.title)];
}
function DvNote(p) {
  return p.d.note ? dvh("p", { className: "dk-note" }, p.d.note) : null;
}
function DvSection(p) {
  return dvh("section", { className: p.cls }, dvh(DvHead, { d: p.d }), p.children, dvh(DvNote, { d: p.d }));
}
function dvPx(n) {
  return n.toFixed(1);
}

/* ---- sparkline: a line with its area, or mini columns ---- */
function DvSpark(p) {
  var vals = p.vals, w = p.w, hh = p.h;
  if (vals.length < 2) return null;
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  if (hi === lo) hi = lo + 1;
  var px = 3, py = 4;
  var x = function (i) { return px + (i * (w - 2 * px)) / (vals.length - 1); };
  var y = function (v) { return hh - py - ((v - lo) / (hi - lo)) * (hh - 2 * py); };
  var kids;
  if (p.bars) {
    var bw = (w - 2 * px) / vals.length;
    kids = vals.map(function (v, i) {
      var bh = Math.max(3, ((v - lo) / (hi - lo)) * (hh - 2 * py) + 3);
      return dvh("rect", { key: i, className: "kt-bar" + (i === vals.length - 1 ? " last" : ""), x: dvPx(px + i * bw + bw * 0.14), y: dvPx(hh - py - bh), width: dvPx(bw * 0.72), height: dvPx(bh), rx: 2 });
    });
  } else {
    var pts = vals.map(function (v, i) { return dvPx(x(i)) + "," + dvPx(y(v)); }).join(" ");
    kids = [
      dvh("polygon", { key: "a", className: "kt-area", points: pts + " " + dvPx(x(vals.length - 1)) + "," + hh + " " + dvPx(x(0)) + "," + hh }),
      dvh("polyline", { key: "l", className: "kt-line", points: pts, fill: "none" }),
      dvh("circle", { key: "d", className: "kt-dot", cx: dvPx(x(vals.length - 1)), cy: dvPx(y(vals[vals.length - 1])), r: 3.2 }),
    ];
  }
  return dvh("svg", { className: "kt-svg", viewBox: "0 0 " + w + " " + hh, preserveAspectRatio: "none", "aria-hidden": "true" }, kids);
}
function DvSp(p) {
  return dvh("div", { className: "kt-sp" }, dvh(DvSpark, { vals: dvNums(p.it.series), w: p.w, h: p.h, bars: p.bars }));
}
function DvChip(p) {
  return p.it.delta ? dvh("span", { className: "kt-d " + dvDir(p.it.delta) }, dvClean(p.it.delta)) : null;
}

/* ---- 1. KPI trends ---- */
function KpiTrend(p) {
  var d = p.d;
  var items = (d.items || []).slice(0, 4);
  var v = d.layout || "tiles";
  var cls = "sec dk ly ly-kt kt-" + v;
  var n = { "--n": Math.min(items.length, 4) };
  var tile = function (it, i, bars) {
    return dvh("div", { key: i, className: "kt-c" },
      dvh("span", { className: "kt-l" }, it.label),
      dvh("div", { className: "kt-vr" }, dvh("b", { className: "kt-v dk-big" }, it.value), dvh(DvChip, { it: it })),
      dvh(DvSp, { it: it, w: 160, h: 46, bars: bars }));
  };
  var body;
  if (v === "strip") {
    body = dvh("div", { className: "kt-row", style: { "--n": items.length } }, items.map(function (it, i) {
      return dvh("div", { key: i, className: "kt-c" }, dvh("span", { className: "kt-l" }, it.label), dvh("b", { className: "kt-v dk-big" }, it.value), dvh(DvChip, { it: it }), dvh(DvSp, { it: it, w: 120, h: 34 }));
    }));
  } else if (v === "rail") {
    body = dvh("div", { className: "kt-rows" }, items.map(function (it, i) {
      return dvh("div", { key: i, className: "kt-r" }, dvh("span", { className: "kt-l" }, it.label), dvh(DvSp, { it: it, w: 260, h: 36 }), dvh("b", { className: "kt-v dk-big" }, it.value), dvh(DvChip, { it: it }));
    }));
  } else if (v === "hero") {
    var h0 = items[0] || {};
    body = dvh("div", { className: "kt-hh" },
      dvh("div", { className: "kt-c kt-big" }, dvh("span", { className: "kt-l" }, h0.label), dvh("div", { className: "kt-vr" }, dvh("b", { className: "kt-v dk-mega" }, h0.value), dvh(DvChip, { it: h0 })), dvh(DvSp, { it: h0, w: 320, h: 90 })),
      dvh("div", { className: "kt-side" }, items.slice(1).map(function (it, i) {
        return dvh("div", { key: i, className: "kt-c" }, dvh("span", { className: "kt-l" }, it.label), dvh("div", { className: "kt-vr" }, dvh("b", { className: "kt-v dk-big" }, it.value), dvh(DvChip, { it: it })));
      })));
  } else {
    body = dvh("div", { className: "kt-grid", style: n }, items.map(function (it, i) { return tile(it, i, v === "bars"); }));
  }
  return dvh(DvSection, { cls: cls, d: d }, body);
}

/* ---- 2. Funnel and waterfall ---- */
function Funnel(p) {
  var d = p.d;
  var items = (d.items || []).slice(0, 6);
  var v = d.layout || "taper";
  var u = d.unit || "";
  var vals = items.map(function (it) { return dvNum(it.value); });
  var max = Math.max.apply(null, vals.filter(isFinite).concat([1]));
  var cls = "sec dk ly ly-fn fn-" + v;
  var rate = function (i) { return i > 0 && vals[i - 1] > 0 && isFinite(vals[i]) ? Math.round((vals[i] / vals[i - 1]) * 100) + "%" : ""; };
  var pct = function (i) { return isFinite(vals[i]) ? Math.max(6, (vals[i] / max) * 100) : 6; };
  var shown = function (it) { return String(it.value) + u; };
  var body;
  if (v === "bars") {
    body = dvh("div", { className: "fn-list" }, items.map(function (it, i) {
      return dvh("div", { key: i, className: "fn-r" },
        dvh("div", { className: "fn-t" }, dvh("span", { className: "fn-l" }, it.label), dvh("b", { className: "fn-v" }, shown(it)), i ? dvh("em", { className: "fn-rate" }, rate(i) + " of previous") : null),
        dvh("i", { className: "fn-bar", style: { "--w": dvPx(pct(i)) + "%" } }),
        it.text ? dvh("p", { className: "t-body fn-x" }, it.text) : null);
    }));
  } else if (v === "columns") {
    body = dvh("div", { className: "fn-cols", style: { "--n": items.length } }, items.map(function (it, i) {
      return dvh("div", { key: i, className: "fn-c" },
        dvh("b", { className: "fn-v" }, shown(it)),
        dvh("div", { className: "fn-well" }, dvh("i", { className: "fn-col", style: { "--h": dvPx(pct(i)) + "%" } })),
        dvh("span", { className: "fn-l" }, it.label),
        dvh("em", { className: "fn-rate" }, i ? rate(i) : " "));
    }));
  } else if (v === "steps") {
    body = dvh("div", { className: "fn-chev", style: { "--n": items.length } }, items.map(function (it, i) {
      return dvh("div", { key: i, className: "fn-s" },
        dvh("i", { className: "fn-ch" + (i === items.length - 1 ? " end" : "") }, dvh("b", { className: "fn-v" }, shown(it))),
        dvh("span", { className: "fn-l" }, it.label),
        i ? dvh("em", { className: "fn-rate" }, rate(i)) : null,
        it.text ? dvh("p", { className: "t-body fn-x" }, it.text) : null);
    }));
  } else if (v === "waterfall") {
    var bars = [], hi = 0;
    items.forEach(function (it, i) {
      var val = isFinite(vals[i]) ? vals[i] : 0;
      var prev = i ? (isFinite(vals[i - 1]) ? vals[i - 1] : 0) : 0;
      if (i === 0) bars.push({ label: it.label, from: 0, to: val, kind: "start", raw: it.value });
      else bars.push({ label: it.label, from: prev, to: val, kind: val < prev ? "down" : "up", raw: (val - prev > 0 ? "+" : "−") + dvFmt(Math.abs(val - prev)) });
      hi = Math.max(hi, prev, val);
    });
    var endv = isFinite(vals[items.length - 1]) ? vals[items.length - 1] : 0;
    bars.push({ label: d.totalLabel || "Left at the end", from: 0, to: endv, kind: "total", raw: dvFmt(endv) });
    var span = hi || 1;
    body = dvh("div", { className: "fn-wf", style: { "--n": bars.length } }, bars.map(function (b, i) {
      var a = Math.min(b.from, b.to), z = Math.max(b.from, b.to);
      return dvh("div", { key: i, className: "fn-w" },
        dvh("div", { className: "fn-well" },
          dvh("i", { className: "fn-wb " + b.kind, style: { "--b": dvPx((a / span) * 100) + "%", "--t": dvPx(((z - a) / span) * 100) + "%" } }),
          dvh("b", { className: "fn-v", style: { "--b": dvPx((z / span) * 100) + "%" } }, String(b.raw) + u)),
        dvh("span", { className: "fn-l" }, b.label));
    }));
  } else {
    body = dvh("div", { className: "fn-taper" }, items.map(function (it, i) {
      return dvh("div", { key: i, className: "fn-t2" }, dvh("i", { className: "fn-bar", style: { "--w": dvPx(pct(i)) + "%" } }, dvh("span", { className: "fn-l" }, it.label), dvh("b", { className: "fn-v" }, shown(it))), dvh("em", { className: "fn-rate" }, rate(i)));
    }));
  }
  return dvh(DvSection, { cls: cls, d: d }, body);
}

/* ---- 3. Heatmap ---- */
function Heatmap(p) {
  var d = p.d;
  var rows = (d.rows || []).slice(0, 7);
  var cols = dvList(d.cols);
  var data = rows.map(function (r) { return dvList(r.values).map(dvNum); });
  var flat = [];
  data.forEach(function (r) { r.forEach(function (n) { if (isFinite(n)) flat.push(n); }); });
  var lo = Math.min.apply(null, flat), hi = Math.max.apply(null, flat);
  if (!flat.length) { lo = 0; hi = 1; }
  var tone = function (n) { return isFinite(n) ? (hi === lo ? 0.5 : (n - lo) / (hi - lo)) : 0; };
  var t2 = function (n) { return tone(n).toFixed(2); };
  var txt = function (x) { return isFinite(x) ? String(Math.round(x * 100) / 100) : ""; };
  var v = d.layout || "numbers";
  var n = Math.max(cols.length, Math.max.apply(null, data.map(function (r) { return r.length; }).concat([0])));
  var cls = "sec dk ly ly-hm hm-" + v;
  var range = function () { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; };
  var legend = dvh("div", { className: "hm-key" }, dvh("span", null, d.lo || "Low"), dvh("i", { "aria-hidden": "true" }), dvh("span", null, d.hi || "High"));
  var grid = { "--n": n };
  var body;
  if (v === "bands") {
    body = dvh("div", { className: "hm-m", style: grid }, rows.map(function (r, ri) {
      var last = data[ri].filter(isFinite).slice(-1)[0];
      return dvh("div", { key: ri, className: "hm-r" }, dvh("span", { className: "hm-l" }, r.label), dvh("div", { className: "hm-band" }, range().map(function (i) { return dvh("i", { key: i, className: "hm-b", style: { "--i": t2(data[ri][i]) } }); })), dvh("b", { className: "hm-e" }, isFinite(last) ? txt(last) : ""));
    }));
  } else if (v === "strip") {
    var r0 = rows[0] || { label: "" };
    body = [dvh("p", { key: "l", className: "hm-sl" }, r0.label), dvh("div", { key: "s", className: "hm-st", style: grid }, range().map(function (k) {
      var x = data[0] ? data[0][k] : NaN;
      return dvh("span", { key: k, className: "hm-s", style: { "--i": t2(x) } }, dvh("b", null, data[0] && isFinite(x) ? txt(x) : ""), dvh("em", null, cols[k] || ""));
    }))];
  } else {
    var cell = function (x, i) {
      if (v === "dots") return dvh("span", { key: i, className: "hm-c dot", style: { "--i": t2(x) } }, dvh("i"));
      if (v === "grid") return dvh("span", { key: i, className: "hm-c", style: { "--i": t2(x) }, title: txt(x) });
      return dvh("span", { key: i, className: "hm-c nm" + (tone(x) > 0.55 ? " hi" : "") + (tone(x) > 0.8 ? " top" : ""), style: { "--i": t2(x) } }, txt(x));
    };
    body = dvh("div", { className: "hm-m", style: grid },
      dvh("div", { key: "h", className: "hm-h" }, dvh("span"), cols.slice(0, n).map(function (c, i) { return dvh("span", { key: i }, c); })),
      rows.map(function (r, ri) { return dvh("div", { key: ri, className: "hm-r" }, dvh("span", { className: "hm-l" }, r.label), range().map(function (i) { return cell(data[ri][i], i); })); }));
  }
  return dvh("section", { className: cls }, dvh(DvHead, { d: d }), body, legend, dvh(DvNote, { d: d }));
}

/* ---- 4. Target bars ---- */
function Bullet(p) {
  var d = p.d;
  var items = (d.items || []).slice(0, 5);
  var v = d.layout || "bullet";
  var u = d.unit || "";
  var cls = "sec dk ly ly-bt bt-" + v;
  var calc = items.map(function (it) {
    var a = dvNum(it.value), t = dvNum(it.target);
    var ratio = isFinite(a) && isFinite(t) && t > 0 ? a / t : NaN;
    return { a: a, t: t, p: ratio, st: !isFinite(ratio) ? "" : ratio >= 1 ? "met" : ratio >= 0.85 ? "on" : "behind" };
  });
  var stText = { met: "Met", on: "On track", behind: "Behind" };
  var chip = function (c) { return c.st ? dvh("span", { className: "bt-st " + c.st }, stText[c.st]) : null; };
  var line = function (it) { return it.text ? dvh("p", { className: "t-body bt-x" }, it.text) : null; };
  var val = function (it) { return String(it.value) + u; };
  var tgt = function (it) { return "target " + String(it.target) + u; };
  var clampW = function (c) { return isFinite(c.p) ? Math.min(100, c.p * 100).toFixed(1) : 0; };
  var peak = function (c) { return Math.max(isFinite(c.a) ? c.a : 0, isFinite(c.t) ? c.t : 0, 1); };
  var body;
  if (v === "rings") {
    body = dvh("div", { className: "bt-rings", style: { "--n": items.length } }, items.map(function (it, i) {
      var c = calc[i];
      return dvh("div", { key: i, className: "bt-ring" }, dvh("i", { className: "bt-o", style: { "--p": isFinite(c.p) ? Math.min(100, Math.round(c.p * 100)) : 0 } }, dvh("b", { className: "bt-v" }, val(it))), dvh("span", { className: "bt-l" }, it.label), dvh("em", { className: "bt-t" }, tgt(it)), chip(c));
    }));
  } else if (v === "dumbbell") {
    body = [dvh("div", { key: "l", className: "bt-list" }, items.map(function (it, i) {
      var c = calc[i];
      var hi = peak(c) * 1.12;
      var a = isFinite(c.a) ? (c.a / hi) * 100 : 0, t = isFinite(c.t) ? (c.t / hi) * 100 : 0;
      return dvh("div", { key: i, className: "bt-r" }, dvh("span", { className: "bt-l" }, it.label),
        dvh("div", { className: "bt-db" }, dvh("i", { className: "bt-rule", style: { "--a": dvPx(Math.min(a, t)) + "%", "--b": dvPx(Math.max(a, t)) + "%" } }), dvh("i", { className: "bt-pt tg", style: { "--x": dvPx(t) + "%" } }), dvh("i", { className: "bt-pt ac " + c.st, style: { "--x": dvPx(a) + "%" } })),
        dvh("b", { className: "bt-v" }, val(it)), dvh("em", { className: "bt-t" }, tgt(it)));
    })), dvh("div", { key: "k", className: "bt-key" }, dvh("span", { className: "ac" }, dvh("i"), "Actual"), dvh("span", { className: "tg" }, dvh("i"), "Target"))];
  } else if (v === "progress") {
    body = dvh("div", { className: "bt-list" }, items.map(function (it, i) {
      var c = calc[i];
      return dvh("div", { key: i, className: "bt-r" },
        dvh("div", { className: "bt-top" }, dvh("span", { className: "bt-l" }, it.label), dvh("b", { className: "bt-v" }, isFinite(c.p) ? Math.round(c.p * 100) + "%" : "")),
        dvh("i", { className: "bt-track" }, dvh("i", { className: "bt-fill " + c.st, style: { "--w": clampW(c) + "%" } })),
        dvh("div", { className: "bt-top" }, dvh("em", { className: "bt-t" }, val(it) + " of " + String(it.target) + u), chip(c)),
        line(it));
    }));
  } else if (v === "table") {
    body = dvh("div", { className: "bt-tb" },
      dvh("div", { key: "h", className: "bt-th" }, dvh("span", null, "Measure"), dvh("span", null, "Actual"), dvh("span", null, "Target"), dvh("span"), dvh("span", null, "Status")),
      items.map(function (it, i) {
        var c = calc[i];
        return dvh("div", { key: i, className: "bt-tr" }, dvh("span", { className: "bt-l" }, it.label), dvh("b", { className: "bt-v" }, val(it)), dvh("span", { className: "bt-t" }, String(it.target) + u), dvh("i", { className: "bt-track" }, dvh("i", { className: "bt-fill " + c.st, style: { "--w": clampW(c) + "%" } })), chip(c));
      }));
  } else {
    body = dvh("div", { className: "bt-list" }, items.map(function (it, i) {
      var c = calc[i];
      var mx = peak(c) * 1.15;
      return dvh("div", { key: i, className: "bt-r" },
        dvh("div", { className: "bt-top" }, dvh("span", { className: "bt-l" }, it.label), dvh("span", { className: "bt-vv" }, dvh("b", { className: "bt-v" }, val(it)), dvh("em", { className: "bt-t" }, tgt(it)))),
        dvh("div", { className: "bt-bl" }, dvh("i", { className: "bt-b1" }), dvh("i", { className: "bt-b2" }), dvh("i", { className: "bt-b3" }), dvh("i", { className: "bt-ac " + c.st, style: { "--w": dvPx(isFinite(c.a) ? (c.a / mx) * 100 : 0) + "%" } }), dvh("i", { className: "bt-tick", style: { "--x": dvPx(isFinite(c.t) ? (c.t / mx) * 100 : 0) + "%" } })),
        line(it));
    }));
  }
  return dvh(DvSection, { cls: cls, d: d }, body);
}

/* ---- 5. Multi-series chart ---- */
function SeriesSvg(p) {
  var d = p.d, v = p.v;
  var cats = dvList(d.cats);
  var ser = (d.series || []).slice(0, 4).map(function (s) { return { name: s.name, vals: dvList(s.values).map(dvNum) }; });
  var n = cats.length;
  if (n < 2 || !ser.length) return dvh("p", { className: "dk-note" }, "Add at least two labels and one series.");
  var W = p.w || 700, H = p.w ? 270 : 250, L = 44, R = 12, T = 12, B = 30;
  var stacked = v === "stacked";
  var top = 0;
  for (var i = 0; i < n; i++) {
    if (stacked) {
      var sum = 0;
      ser.forEach(function (s) { sum += isFinite(s.vals[i]) ? s.vals[i] : 0; });
      top = Math.max(top, sum);
    } else ser.forEach(function (s) { if (isFinite(s.vals[i])) top = Math.max(top, s.vals[i]); });
  }
  var max = dvNice(top * 1.04);
  var y = function (val) { return T + (1 - val / max) * (H - T - B); };
  var step = (W - L - R) / n;
  var cx = function (i) { return L + step * (i + 0.5); };
  var kids = [];
  for (var g = 0; g <= 4; g++) {
    var gv = (max * g) / 4;
    kids.push(dvh("line", { key: "g" + g, className: "sc-grid", x1: L, x2: W - R, y1: dvPx(y(gv)), y2: dvPx(y(gv)) }));
    kids.push(dvh("text", { key: "gt" + g, className: "ch-lab sc-ax", x: L - 8, y: dvPx(y(gv) + 3.5), textAnchor: "end" }, dvFmt(gv)));
  }
  cats.forEach(function (c, i) { kids.push(dvh("text", { key: "c" + i, className: "ch-lab sc-ax", x: dvPx(cx(i)), y: H - 9, textAnchor: "middle" }, c)); });
  if (v === "grouped" || stacked) {
    var gw = (step * 0.7) / (stacked ? 1 : ser.length);
    for (var c = 0; c < n; c++) {
      var acc = 0;
      ser.forEach(function (s, k) {
        var val = isFinite(s.vals[c]) ? s.vals[c] : 0;
        var x0 = stacked ? cx(c) - gw / 2 : cx(c) - (gw * ser.length) / 2 + k * gw;
        var y1 = y(stacked ? acc + val : val), y0 = y(stacked ? acc : 0);
        kids.push(dvh("rect", { key: "b" + c + "_" + k, className: "sc-b s" + (k + 1), x: dvPx(x0 + (stacked ? 0 : 1)), y: dvPx(y1), width: dvPx(Math.max(2, gw - (stacked ? 0 : 2))), height: dvPx(Math.max(0, y0 - y1 - (stacked ? 1 : 0))), rx: 3 }));
        acc += val;
      });
    }
  } else {
    ser.forEach(function (s, k) {
      var pts = [];
      s.vals.forEach(function (val, i) { if (isFinite(val) && i < n) pts.push([cx(i), y(val)]); });
      if (pts.length < 2) return;
      var line = pts.map(function (q) { return dvPx(q[0]) + "," + dvPx(q[1]); }).join(" ");
      if (v === "area") kids.push(dvh("polygon", { key: "a" + k, className: "sc-a s" + (k + 1), points: line + " " + dvPx(pts[pts.length - 1][0]) + "," + dvPx(y(0)) + " " + dvPx(pts[0][0]) + "," + dvPx(y(0)) }));
      kids.push(dvh("polyline", { key: "l" + k, className: "sc-l s" + (k + 1), points: line, fill: "none" }));
      pts.forEach(function (q, i) { kids.push(dvh("circle", { key: "p" + k + "_" + i, className: "sc-p s" + (k + 1) + (i === pts.length - 1 ? " end" : ""), cx: dvPx(q[0]), cy: dvPx(q[1]), r: i === pts.length - 1 ? 4.5 : 3 })); });
    });
  }
  return dvh("svg", { className: "sc-svg", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": d.title }, kids);
}
function SeriesChart(p) {
  var d = p.d;
  var v = d.layout || "lines";
  var cls = "sec dk ly ly-sc sc-" + v;
  var ser = (d.series || []).slice(0, 4);
  var chart = dvh("div", { className: "sc-ch" },
    dvh("ul", { className: "sc-key" }, ser.map(function (s, k) { return dvh("li", { key: k, className: "s" + (k + 1) }, dvh("i"), s.name); })),
    dvh(SeriesSvg, { d: d, v: v === "callout" ? "lines" : v, w: v === "callout" ? 470 : 0 }));
  if (v === "callout") {
    return dvh(DvSection, { cls: cls, d: d },
      dvh("div", { className: "sc-g" }, chart,
        dvh("aside", { className: "sc-co" },
          d.calloutHead ? dvh("h3", { className: "sc-ch3" }, d.calloutHead) : null,
          d.calloutText ? dvh("p", { className: "t-body" }, d.calloutText) : null,
          dvh("ul", { className: "sc-last" }, ser.map(function (s, k) {
            var vals = dvList(s.values);
            return dvh("li", { key: k, className: "s" + (k + 1) }, dvh("i"), dvh("span", null, s.name), dvh("b", null, vals[vals.length - 1] || ""));
          })))));
  }
  return dvh(DvSection, { cls: cls, d: d }, chart);
}
MODULES.kpiTrend.render = function (d) { return dvRender(KpiTrend, d); };
MODULES.funnel.render = function (d) { return dvRender(Funnel, d); };
MODULES.heatmap.render = function (d) { return dvRender(Heatmap, d); };
MODULES.bullet.render = function (d) { return dvRender(Bullet, d); };
MODULES.seriesChart.render = function (d) { return dvRender(SeriesChart, d); };

// Ported render-only definitions: 35c-pipeline-react.js
/* ================= batch G, pipeline: five new designs =================
   Written as React components like the data modules. The library and the Modules page now list these five;
   the five earlier designs (line, bands, chevrons, vertical, dark) still render for materials saved with them.
   1. Winding road: the steps sit alternately above and below a curved gradient road.
   2. Staircase: each step is taller than the last, the result at the top.
   3. Relay lanes: the first group runs in an upper lane, hands over to a lower lane, then the result.
   4. Tile grid: a bento of tinted tiles with big numerals, the result as one tall gradient tile.
   5. Loop: the steps around a ring, the result in the middle, the list beside it.                          */
function pzGroup(i, n, a) {
  return i === n - 1 ? "r" : i < a ? "a" : "b";
}
function pzSplit(d) {
  var n = (d.items || []).length;
  return { n: n, a: Math.max(1, Math.min(n - 2, +d.splitAt || 2)) };
}
function PzHead(p) {
  var d = p.d;
  return [d.eyebrow ? dvh("p", { key: "e", className: "dk-eye" }, d.eyebrow) : null, dvh("h2", { key: "t", className: "dk-title" }, d.title), d.intro ? dvh("p", { key: "i", className: "dk-intro" }, d.intro) : null];
}
function PzIcon(p) {
  return dvh("span", { className: "dk-dot", dangerouslySetInnerHTML: { __html: ic(p.name) } });
}
function PzKey(p) {
  var d = p.d, s = pzSplit(d);
  return dvh("ul", { className: "pz-key" },
    dvh("li", { className: "a" }, dvh("i"), d.groupA, dvh("em", null, s.a === 1 ? "step 1" : "steps 1–" + s.a)),
    dvh("li", { className: "b" }, dvh("i"), d.groupB, dvh("em", null, s.a + 1 === s.n - 1 ? "step " + (s.a + 1) : "steps " + (s.a + 1) + "–" + (s.n - 1))));
}
function PzSection(p) {
  return dvh("section", { className: "sec dk dk-pipe ly pz pz-" + p.v }, dvh(PzHead, { d: p.d }), p.children);
}

function PzRoad(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  var W = 800, H = 270;
  var pts = items.map(function (it, i) { return [((i + 0.5) / s.n) * W, i % 2 ? H * 0.64 : H * 0.36]; });
  var path = "M0," + pts[0][1];
  var prev = [0, pts[0][1]];
  pts.forEach(function (q) { var mx = (prev[0] + q[0]) / 2; path += " C" + mx + "," + prev[1] + " " + mx + "," + q[1] + " " + q[0] + "," + q[1]; prev = q; });
  path += " C" + (prev[0] + (W - prev[0]) / 2) + "," + prev[1] + " " + (prev[0] + (W - prev[0]) / 2) + "," + prev[1] + " " + W + "," + prev[1];
  var nodes = items.map(function (it, i) {
    var left = (((i + 0.5) / s.n) * 100).toFixed(2) + "%", top = ((pts[i][1] / H) * 100).toFixed(2) + "%";
    var up = i % 2 === 0;
    return dvh("div", { key: i, className: "pza-s g-" + pzGroup(i, s.n, s.a) + (up ? " up" : " down"), style: { left: left, top: top } },
      dvh(PzIcon, { name: it.icon }),
      dvh("div", { className: "pza-l" }, dvh("b", null, i + 1), dvh("span", null, it.label)));
  });
  return dvh(PzSection, { d: d, v: "path" }, dvh(PzKey, { d: d }),
    dvh("div", { className: "pza" },
      dvh("svg", { className: "pza-svg", viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", "aria-hidden": "true" },
        dvh("defs", null, dvh("linearGradient", { id: "pzg", x1: "0", x2: "1", y1: "0", y2: "0" }, dvh("stop", { offset: "0", stopColor: "#0fb5b2" }), dvh("stop", { offset: ".55", stopColor: "#3b7bf0" }), dvh("stop", { offset: "1", stopColor: "#8f6bf0" }))),
        dvh("path", { className: "pza-road", d: path, fill: "none" }),
        dvh("path", { className: "pza-dash", d: path, fill: "none" })),
      nodes));
}

function PzStairs(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  return dvh(PzSection, { d: d, v: "stairs" },
    dvh("ol", { className: "pzb", style: { "--n": s.n } }, items.map(function (it, i) {
      var g = pzGroup(i, s.n, s.a);
      var hgt = 52 + (i / Math.max(1, s.n - 1)) * 48;
      return dvh("li", { key: i, className: "pzb-s g-" + g, style: { "--h": hgt.toFixed(1) + "%" } },
        dvh("div", { className: "pzb-c" }, dvh(PzIcon, { name: it.icon }), dvh("b", { className: "pzb-n" }, String(i + 1).padStart(2, "0")), dvh("span", { className: "pzb-t" }, it.label)));
    })),
    dvh("div", { className: "dk-brk pzb-base", style: { "--n": s.n } },
      dvh("span", { style: { gridColumn: "1 / span " + s.a } }, d.groupA),
      dvh("span", { className: "b", style: { gridColumn: s.a + 1 + " / span " + Math.max(1, s.n - 1 - s.a) } }, d.groupB)));
}

function PzLanes(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  var step = function (it, i, row) {
    return dvh("div", { key: i, className: "pzc-s g-" + pzGroup(i, s.n, s.a), style: { gridColumn: i + 1, gridRow: row } },
      dvh(PzIcon, { name: it.icon }), dvh("b", null, i + 1), dvh("span", null, it.label));
  };
  var last = items[s.n - 1] || {};
  return dvh(PzSection, { d: d, v: "lanes" },
    dvh("div", { className: "pzc", style: { "--n": s.n } },
      dvh("div", { className: "pzc-lane a", style: { gridColumn: "1 / span " + s.a, gridRow: 1 } }, dvh("span", { className: "pzc-tag" }, d.groupA)),
      dvh("div", { className: "pzc-lane b", style: { gridColumn: s.a + 1 + " / span " + Math.max(1, s.n - 1 - s.a), gridRow: 2 } }, dvh("span", { className: "pzc-tag" }, d.groupB)),
      dvh("i", { className: "pzc-hand", style: { gridColumn: s.a + 1, gridRow: "1 / span 2" }, "aria-hidden": "true" }),
      items.slice(0, s.n - 1).map(function (it, i) { return step(it, i, i < s.a ? 1 : 2); }),
      dvh("div", { className: "pzc-s g-r", style: { gridColumn: s.n, gridRow: "1 / span 2" } },
        dvh(PzIcon, { name: last.icon }), dvh("b", null, s.n), dvh("span", null, last.label))));
}

function PzTiles(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  var cols = Math.ceil((s.n - 1) / 2);
  var last = items[s.n - 1] || {};
  return dvh(PzSection, { d: d, v: "tiles" },
    dvh("div", { className: "pzd", style: { "--c": cols } },
      items.slice(0, s.n - 1).map(function (it, i) {
        var g = pzGroup(i, s.n, s.a);
        return dvh("div", { key: i, className: "pzd-t g-" + g },
          dvh("div", { className: "pzd-top" }, dvh("b", { className: "pzd-n dk-big" }, String(i + 1).padStart(2, "0")), dvh(PzIcon, { name: it.icon })),
          dvh("span", { className: "pzd-l" }, it.label),
          dvh("em", { className: "pzd-g" }, g === "a" ? d.groupA : d.groupB));
      }),
      dvh("div", { className: "pzd-t g-r", style: { gridColumn: cols + 1, gridRow: "1 / span 2" } },
        dvh(PzIcon, { name: last.icon }), dvh("b", { className: "pzd-n" }, String(s.n).padStart(2, "0")), dvh("span", { className: "pzd-l" }, last.label), dvh("em", { className: "pzd-g" }, "Result"))));
}

function PzLoop(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  var last = items[s.n - 1] || {};
  var dots = items.map(function (it, i) {
    var ang = (-90 + (i * 360) / s.n) * (Math.PI / 180);
    var x = 50 + 40 * Math.cos(ang), y = 50 + 40 * Math.sin(ang);
    return dvh("span", { key: i, className: "pze-d g-" + pzGroup(i, s.n, s.a), style: { left: x.toFixed(2) + "%", top: y.toFixed(2) + "%" } }, i + 1);
  });
  return dvh(PzSection, { d: d, v: "loop" },
    dvh("div", { className: "pze" },
      dvh("div", { className: "pze-ring" }, dvh("i", { className: "pze-track" }), dots,
        dvh("div", { className: "pze-core" }, dvh(PzIcon, { name: last.icon }), dvh("b", null, last.label))),
      dvh("div", { className: "pze-side" }, dvh(PzKey, { d: d }),
        dvh("ol", { className: "pze-list" }, items.map(function (it, i) {
          return dvh("li", { key: i, className: "g-" + pzGroup(i, s.n, s.a) }, dvh("b", null, i + 1), dvh(PzIcon, { name: it.icon }), dvh("span", null, it.label));
        })))));
}

function PzNum(i) {
  return String(i + 1).padStart(2, "0");
}
/* 6. Gradient ribbon: one lit rail, ringed medallions on it, step numbers and labels beneath */
function PzRibbon(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  return dvh(PzSection, { d: d, v: "ribbon" },
    dvh("div", { className: "dk-brk pzr-brk", style: { "--n": s.n } },
      dvh("span", { style: { gridColumn: "1 / span " + s.a } }, d.groupA),
      dvh("span", { className: "b", style: { gridColumn: s.a + 1 + " / span " + Math.max(1, s.n - 1 - s.a) } }, d.groupB)),
    dvh("ol", { className: "pzr", style: { "--n": s.n } }, items.map(function (it, i) {
      return dvh("li", { key: i, className: "g-" + pzGroup(i, s.n, s.a) },
        dvh("span", { className: "pzr-node" }, dvh(PzIcon, { name: it.icon })),
        dvh("em", { className: "pzr-k" }, "Step " + PzNum(i)),
        dvh("span", { className: "pzr-t" }, it.label));
    })));
}
/* 7. Editorial numerals: hairline columns, oversized light numerals, a colour bar per group */
function PzEditorial(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  return dvh(PzSection, { d: d, v: "editorial" },
    dvh("ol", { className: "pzi", style: { "--n": s.n } }, items.map(function (it, i) {
      var g = pzGroup(i, s.n, s.a);
      return dvh("li", { key: i, className: "g-" + g },
        dvh("b", { className: "pzi-n" }, PzNum(i)),
        dvh("span", { className: "pzi-t" }, it.label),
        dvh("span", { className: "pzi-f" }, dvh(PzIcon, { name: it.icon }), dvh("em", null, g === "a" ? d.groupA : g === "b" ? d.groupB : "Result")));
    })));
}
/* 8. Cascade: glass cards stepping down and across, the result last and lit */
function PzCascade(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  return dvh(PzSection, { d: d, v: "cascade" },
    dvh("ol", { className: "pzf", style: { "--n": s.n } }, items.map(function (it, i) {
      return dvh("li", { key: i, className: "g-" + pzGroup(i, s.n, s.a), style: { "--i": i } },
        dvh("div", { className: "pzf-c" },
          dvh("div", { className: "pzf-top" }, dvh("b", null, PzNum(i)), dvh(PzIcon, { name: it.icon })),
          dvh("span", { className: "pzf-t" }, it.label)));
    })));
}
/* 9. Centre spine: a vertical line with the steps alternating either side */
function PzSpine(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  return dvh(PzSection, { d: d, v: "spine" },
    dvh("ol", { className: "pzs" }, items.map(function (it, i) {
      var left = i % 2 === 0;
      return dvh("li", { key: i, className: "g-" + pzGroup(i, s.n, s.a) + (left ? " l" : " r") },
        dvh("div", { className: "pzs-c" }, dvh("b", null, PzNum(i)), dvh("span", null, it.label)),
        dvh("span", { className: "pzs-node" }, dvh(PzIcon, { name: it.icon })));
    })));
}
/* 10. Horizon arc: the steps on one clean gradient arch, labels inside it */
function PzArc(p) {
  var d = p.d, s = pzSplit(d), items = d.items || [];
  var W = 800, H = 250, cx = 400, base = 172, rx = 316, ry = 146;
  var nodes = items.map(function (it, i) {
    var th = Math.PI * (1 - i / Math.max(1, s.n - 1));
    var x = cx + rx * Math.cos(th), y = base - ry * Math.sin(th);
    return dvh("div", { key: i, className: "pzg-s g-" + pzGroup(i, s.n, s.a), style: { left: ((x / W) * 100).toFixed(2) + "%", top: ((y / H) * 100).toFixed(2) + "%" } },
      dvh(PzIcon, { name: it.icon }),
      dvh("div", { className: "pzg-l" }, dvh("b", null, PzNum(i)), dvh("span", null, it.label)));
  });
  return dvh(PzSection, { d: d, v: "arc" },
    dvh("div", { className: "pzg" },
      dvh("svg", { className: "pzg-svg", viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", "aria-hidden": "true" },
        dvh("defs", null, dvh("linearGradient", { id: "pzgg", x1: "0", x2: "1", y1: "0", y2: "0" }, dvh("stop", { offset: "0", stopColor: "#0fb5b2" }), dvh("stop", { offset: ".55", stopColor: "#3b7bf0" }), dvh("stop", { offset: "1", stopColor: "#8f6bf0" }))),
        dvh("path", { className: "pzg-glow", d: "M" + (cx - rx) + "," + base + " A" + rx + "," + ry + " 0 0 1 " + (cx + rx) + "," + base, fill: "none" }),
        dvh("path", { className: "pzg-line", d: "M" + (cx - rx) + "," + base + " A" + rx + "," + ry + " 0 0 1 " + (cx + rx) + "," + base, fill: "none" })),
      nodes));
}

(function () {
  var map = { path: PzRoad, stairs: PzStairs, lanes: PzLanes, tiles: PzTiles, loop: PzLoop, ribbon: PzRibbon, editorial: PzEditorial, cascade: PzCascade, spine: PzSpine, arc: PzArc };
  lyOpt("pipeline", "layout", [["ribbon", "Gradient ribbon"], ["editorial", "Editorial numerals"], ["cascade", "Cascade of cards"], ["arc", "Horizon arc"], ["spine", "Centre spine"], ["path", "Winding road"], ["stairs", "Staircase"], ["lanes", "Relay lanes"], ["tiles", "Tile grid"], ["loop", "Loop"]]);
  lyWrap("pipeline", function (d) {
    var C = map[d.layout];
    return C && d.items && d.items.length > 2 ? dvRender(C, d) : null;
  });
  LIB_DESIGNS.pipeline = [["Gradient ribbon", { layout: "ribbon" }], ["Editorial numerals", { layout: "editorial" }], ["Cascade of cards", { layout: "cascade" }], ["Horizon arc", { layout: "arc" }], ["Centre spine", { layout: "spine" }], ["Winding road", { layout: "path" }], ["Staircase", { layout: "stairs" }], ["Relay lanes", { layout: "lanes" }], ["Tile grid", { layout: "tiles" }], ["Loop", { layout: "loop" }]];
})();

var ppImageRender = SUBS.image.render;
SUBS.image.render = function (d) {
  var out = ppImageRender.apply(this, arguments);
  return d && d.tone === "white" && d.fit === "contain" && hasImg(d.photo) ? out.replace('class="imgarea ', 'class="imgarea ia-bare ') : out;
};
var ppStoryColsRender = MODULES.storyColumns.render;
MODULES.storyColumns.render = function (d) {
  var out = ppStoryColsRender.apply(this, arguments);
  var it = d && d.items && d.items.length === 1 ? d.items[0] : null;
  return it && !String(it.heading || "").trim() && !String(it.bullets || "").trim() ? out.replace('class="card scol solo"', 'class="card scol solo scol-note"') : out;
};


MODULES.pagebreak = {name:"Page break",group:"Compose",desc:"Starts a new print page",fields:[],def:function(){return {};},render:function(){return "";}};
export { MODULES, SUBS, SUB_ORDER, ROW_LAYOUTS, FORMATS, LIB_DESIGNS, derive, REFLOW, surfaceClass, iconStyleClass, withLang };
