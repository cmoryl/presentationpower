import { test } from "vitest";
import { PDFDocument } from "pdf-lib";
import { kioskLiveLayout } from "@/lib/next-california-kiosk-live";
import { kioskNativePdfUrl } from "@/lib/next-california-kiosk-live";
const nativeBytes = async (id: string) => { let u = kioskNativePdfUrl(id)!; if (u.startsWith("/")) u = "https://transperfectelement.lovable.app" + u; return (await fetch(u)).arrayBuffer(); };
test("sterling timing", async () => {
  const L = kioskLiveLayout("sterling-2-tradebooth-a")!;
  let t = Date.now();
  const bytes = await nativeBytes(L.id);
  console.log("bytes", bytes.byteLength, Date.now() - t); t = Date.now();
  const src = await PDFDocument.load(bytes);
  console.log("load", src.getPageCount(), Date.now() - t); t = Date.now();
  const doc = await PDFDocument.create();
  const ids = Object.keys(L.native!.parts).slice(0, 20);
  await doc.embedPdf(src, ids.map((i) => L.native!.parts[i]!.page));
  console.log("embed20", Date.now() - t); t = Date.now();
  const out = await doc.save(); console.log("save", out.byteLength, Date.now() - t);
}, 300000);
