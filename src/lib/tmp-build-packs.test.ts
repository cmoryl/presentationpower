import { it, vi } from "vitest";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import JSZip from "jszip";
import { KIOSK_LIVE_LAYOUTS, kioskFaceLayout, kioskLiveFileBase, kioskHasTv, type KioskEdits } from "@/lib/next-california-kiosk-live";
import { liveFrontSvg, liveFrontPdf, pressFrontSvg, liveReturnPdf } from "@/lib/next-california-kiosk-live-export";
it("build packs", async () => {
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", (u: any, o?: any) => real(String(u).startsWith("/") ? "http://localhost:8080" + u : u, o));
  const saved = JSON.parse(readFileSync("/tmp/st2/edits.json", "utf8"));
  mkdirSync("/tmp/st2/packs", { recursive: true });
  for (const L of Object.values(KIOSK_LIVE_LAYOUTS).filter((l) => l.native)) {
    const e0 = saved[L.id] as KioskEdits | undefined;
    const edits: KioskEdits = e0 && e0.layoutVersion === L.native!.version ? e0 : {};
    const base = kioskLiveFileBase(L.id);
    const z = new JSZip();
    const front = await liveFrontPdf(L, edits);
    writeFileSync(`/tmp/st2/packs/${L.id}-front.pdf`, front);
    z.file(`${base}-front.svg`, await liveFrontSvg(L, edits));
    z.file(`${base}-front.pdf`, front);
    z.file(`${base}-front-press-outlined.svg`, await pressFrontSvg(L, edits));
    for (const side of ["left", "right"] as const) {
      const FL = kioskFaceLayout(L, side)!;
      z.file(`${base}-return-${side}.svg`, await liveFrontSvg(FL, {}));
      const ai = await liveReturnPdf(L, edits, side, {});
      writeFileSync(`/tmp/st2/packs/${L.id}-${side}.ai`, ai);
      z.file(`${base}-return-${side}.ai`, ai);
    }
    z.file("README.txt", `DRAFT — not published. Rebuilt from ${L.source}.\nFront 45 x 96 in, side strips 4 x 96 in, 1/8 in bleed. ${kioskHasTv(L.id) ? "TV keep-clear left clear." : "No TV on this kiosk."}\nSide strips: every wave line and shape is its own object on the Content layer.\nThe PROOF png is a screen proof, not a print master. Check in Illustrator before print.\n`);
    writeFileSync(`/tmp/st2/packs/${L.id}.zip`, await z.generateAsync({ type: "nodebuffer" }));
    console.log("built", L.id, edits.layoutVersion ?? "as supplied");
  }
}, 600000);
