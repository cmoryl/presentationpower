// A single bloom ad as a plain, public HTML page, built so Canva's importer can
// turn it into a real editable design: the photograph as its own image element,
// the headline and its italic call-out word as live text, the small line as live
// text, the colour bloom and accent splash as their own coloured layers, and the
// Legal lockup as its own image. Nothing here is a flattened screenshot.
//
//   /api/public/canva-ad?ad=soapbox&w=1200&h=1200&support=1
//
// The /api/public prefix keeps the page reachable without a sign-in, which is
// what the Canva importer needs.

import { createFileRoute } from "@tanstack/react-router";
import { bloomColour, LEGAL_BLOOM_SCENES } from "@/lib/social-legal-bloom";

// Served from public/legal-bloom so the published page can fetch them: assets
// only referenced by this server route are not emitted into the client build.
const soapbox = "/legal-bloom/bloom-soapbox-run.jpg";
const lockup = "/legal-bloom/tp-legal-black.svg";

const PHOTOS: Record<string, string> = {
  soapbox,
  kayak: "/legal-bloom/bloom-kayak-chute.jpg",
  ocean: "/legal-bloom/bloom-ocean-race.jpg",
  cliff: "/legal-bloom/bloom-cliff-camp.jpg",
  ice: "/legal-bloom/bloom-ice-fall.jpg",
  rally: "/legal-bloom/bloom-rally-rut.jpg",
  cave: "/legal-bloom/bloom-cave-haul.jpg",
  deep: "/legal-bloom/bloom-deep-line.jpg",
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const Route = createFileRoute("/api/public/canva-ad")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const adId = url.searchParams.get("ad") ?? "soapbox";
        const scene = LEGAL_BLOOM_SCENES.find((s) => s.id === adId) ?? LEGAL_BLOOM_SCENES[0]!;
        const w = Math.max(400, Math.min(4000, Number(url.searchParams.get("w")) || 1200));
        const h = Math.max(400, Math.min(4000, Number(url.searchParams.get("h")) || 1200));
        const withSupport = url.searchParams.get("support") !== "0";
        const C = bloomColour(scene);
        const origin = `${url.protocol}//${url.host}`;
        const photo = `${origin}${PHOTOS[scene.id] ?? soapbox}`;
        const mark = `${origin}${lockup}`;

        const short = Math.min(w, h);
        const tall = h > w * 1.1;
        const margin = short * 0.055;

        // picture frame: wide shots run long, upright shots stand tall
        const picW = tall ? w - margin * 2 : w * 0.56;
        const picH = tall ? h * 0.52 : h - margin * 2;
        const picX = tall ? margin : w - margin - picW;
        const picY = margin;
        const r = short * 0.14;

        // the copy column sits beside the picture on wide trims, under it on tall
        const copyX = margin;
        const copyY = tall ? picY + picH + short * 0.07 : h * 0.3;
        const copyW = tall ? w - margin * 2 : picX - margin - short * 0.045;

        const headPx = Math.max(24, Math.min(copyW / 9.2, short * 0.098));
        const turnPx = headPx * 1.62;
        const supportPx = Math.max(12, Math.min(headPx * 0.3, short * 0.028));
        const markH = short * 0.052;

        const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(`TP Legal — ${scene.turn} — ${w}x${h}`)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet" />
<style>
  html, body { margin: 0; padding: 0; background: #FBFBFD; }
  .page { position: relative; width: ${w}px; height: ${h}px; background: #FBFBFD; overflow: hidden; }
  .bloom { position: absolute; border-radius: 50%; filter: blur(${short * 0.08}px); }
  .splash { position: absolute; border-radius: 50%; filter: blur(${short * 0.06}px); }
  .frame { position: absolute; overflow: hidden; box-sizing: border-box;
           border: ${Math.max(2, short * 0.008)}px solid ${C.type};
           border-radius: ${r}px 0 ${r}px 0; }
  .frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .head { position: absolute; font-family: "Playfair Display", Georgia, serif; font-weight: 700;
          color: #03002C; font-size: ${headPx}px; line-height: 1.18; letter-spacing: -0.015em; }
  .turn { font-style: italic; color: ${C.type}; font-size: ${turnPx}px; line-height: 1; }
  .support { position: absolute; font-family: "Instrument Sans", system-ui, sans-serif;
             font-size: ${supportPx}px; line-height: 1.42; color: #03002CB8; }
  .mark { position: absolute; height: ${markH}px; width: auto; }
</style>
</head>
<body>
  <div class="page" data-document-role="page" data-label="${esc(`${scene.turn} ${w}x${h}`)}">
    <div class="bloom" style="left:${picX - short * 0.16}px; top:${picY - short * 0.1}px; width:${picW * 0.9}px; height:${picH * 0.8}px; background:${C.glow};"></div>
    <div class="splash" style="left:${-short * 0.16}px; top:${h - short * 0.36}px; width:${short * 0.7}px; height:${short * 0.56}px; background:${C.glow};"></div>
    <div class="frame" style="left:${picX}px; top:${picY}px; width:${picW}px; height:${picH}px;">
      <img src="${photo}" alt="${esc(scene.shot)}" />
    </div>
    <div class="head" style="left:${copyX}px; top:${copyY}px; width:${copyW}px;">${esc(scene.lead)} <span class="turn">${esc(scene.turn)}</span> ${esc(scene.tail)}</div>
    ${
      withSupport
        ? `<div class="support" style="left:${copyX}px; top:${copyY + headPx * 3.1}px; width:${Math.min(copyW, supportPx * 24)}px;">${esc(scene.support)}</div>`
        : ""
    }
    <img class="mark" src="${mark}" alt="TransPerfect Legal" style="right:${margin}px; bottom:${margin}px;" />
  </div>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
