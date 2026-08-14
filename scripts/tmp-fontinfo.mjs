import JSZip from "jszip"; import { readFile } from "node:fs/promises";
const z = await JSZip.loadAsync(await readFile("/tmp/cell.pptx"));
for (const f of Object.keys(z.files).filter(n=>/fntdata/.test(n))) {
  const b = await z.file(f).async("nodebuffer");
  const num = b.readUInt16BE(4); const tags=[];
  for (let i=0;i<num;i++){ const o=12+i*16; tags.push(b.subarray(o,o+4).toString("latin1")); }
  // OS/2 fsType
  let fsType=null;
  for (let i=0;i<num;i++){ const o=12+i*16; if (b.subarray(o,o+4).toString("latin1")==="OS/2"){ const off=b.readUInt32BE(o+8); fsType=b.readUInt16BE(off+8);} }
  console.log(f, "tables:", tags.join(","), "| fsType:", fsType, "| variable:", tags.includes("fvar"));
}
