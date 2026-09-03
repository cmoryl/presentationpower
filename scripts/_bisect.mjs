import { readFile, writeFile } from "node:fs/promises";
import JSZip from "jszip";
import {
  renderPptxWithPowerPoint,
  deleteDriveItem,
} from "/dev-server/scripts/render-via-powerpoint.mjs";
const src = process.argv[2];
const base = await readFile(src);

async function attempt(label, mutate) {
  const zip = await JSZip.loadAsync(base);
  await mutate(zip);
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  try {
    const r = await renderPptxWithPowerPoint(bytes, `bisect-${label}-${Date.now()}.pptx`);
    await deleteDriveItem(r.itemId);
    console.log("OK  ", label);
  } catch (e) {
    console.log("FAIL", label, String(e.message).slice(0, 180).replace(/\s+/g, " "));
  }
}

await attempt("as-is", () => {});
await attempt("no-media", async (zip) => {
  let s = await zip.file("ppt/slides/slide1.xml").async("string");
  s = s.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, "");
  zip.file("ppt/slides/slide1.xml", s);
});
await attempt("no-text", async (zip) => {
  let s = await zip.file("ppt/slides/slide1.xml").async("string");
  s = s.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, "");
  zip.file("ppt/slides/slide1.xml", s);
});
await attempt("no-notes", async (zip) => {
  for (const n of Object.keys(zip.files)) if (/notes/i.test(n)) zip.remove(n);
});
