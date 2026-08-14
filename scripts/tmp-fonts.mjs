import JSZip from "jszip"; import { readFile } from "node:fs/promises";
const z = await JSZip.loadAsync(await readFile("/tmp/cell.pptx"));
for (const f of Object.keys(z.files).filter(n=>/fntdata/.test(n))) {
  const b = await z.file(f).async("nodebuffer");
  console.log(f, b.length, "magic:", b.subarray(0,4).toString("hex"), JSON.stringify(b.subarray(0,4).toString("latin1")));
}
const pres = await z.file("ppt/presentation.xml").async("string");
console.log(pres.match(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/)?.[0]?.slice(0,900));
const ct = await z.file("[Content_Types].xml").async("string");
console.log(ct.match(/fntdata[^>]*/g), ct.match(/<Default[^>]*\/>/g));
