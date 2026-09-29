import { it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { KIOSK_LIVE_LAYOUTS, kioskFaceLayout } from "@/lib/next-california-kiosk-live";
import { liveReturnPdf } from "@/lib/next-california-kiosk-live-export";
it("recolour export", async () => {
  const real = globalThis.fetch;
  vi.stubGlobal("fetch", (u: any, o?: any) => real(String(u).startsWith("/") ? "http://localhost:8080" + u : u, o));
  const L = KIOSK_LIVE_LAYOUTS["veeva-tradebooth-a"]!;
  const F = kioskFaceLayout(L, "left")!;
  const ids = F.blocks.flatMap((b) => b.parts ?? []).map((p) => p.id);
  const parts: any = {};
  ids.slice(0, 6).forEach((id) => (parts[id] = { cmyk: [0, 1, 0, 0] }));
  parts[ids[8]!] = { dx: 60 };
  writeFileSync("/tmp/st2/rc.pdf", await liveReturnPdf(L, {}, "left", { parts }));
  writeFileSync("/tmp/st2/plain.pdf", await liveReturnPdf(L, {}, "left", {}));
  console.log("ids", ids.length);
}, 120000);
