import { test } from "vitest";
import { kioskLiveLayout } from "@/lib/next-california-kiosk-live";
import { liveFrontPdf, liveReturnPdf, pressFrontSvg } from "@/lib/next-california-kiosk-live-export";
const of = globalThis.fetch;
globalThis.fetch = ((u: any, i?: any) => of(typeof u === "string" && u.startsWith("/") ? "https://transperfectelement.lovable.app" + u : u, i)) as any;
test("sterling full", async () => {
  const L = kioskLiveLayout("sterling-2-tradebooth-a")!;
  for (const [n, f] of [["front", () => liveFrontPdf(L, {} as any)], ["left", () => liveReturnPdf(L, {} as any, "left")], ["right", () => liveReturnPdf(L, {} as any, "right")], ["press", () => pressFrontSvg(L, {} as any)]] as const) {
    const t = Date.now();
    const r: any = await Promise.race([(f as any)(), new Promise((_, j) => setTimeout(() => j(new Error(n + " timeout")), 60000))]);
    console.log(n, r?.byteLength ?? r?.length, Date.now() - t);
  }
}, 300000);
