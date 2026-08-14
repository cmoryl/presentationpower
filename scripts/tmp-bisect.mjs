import JSZip from "jszip";
import { readFile, writeFile } from "node:fs/promises";
import { renderPptxWithPowerPoint, deleteDriveItem } from "./render-via-powerpoint.mjs";

const src = await JSZip.loadAsync(await readFile("/tmp/cell.pptx"));
console.log("parts:", Object.keys(src.files).filter(f=>!src.files[f].dir).join("\n  "));
async function clone(){ return await JSZip.loadAsync(await src.generateAsync({type:"nodebuffer"})); }
async function attempt(name, mut){
  const z = await clone();
  await mut(z);
  const buf = await z.generateAsync({type:"nodebuffer"});
  try { const r = await renderPptxWithPowerPoint(buf, `bisect-${Date.now()}.pptx`); await deleteDriveItem(r.itemId); console.log(`✓ OPENS  ${name}`); return true; }
  catch(e){ console.log(`✗ 406    ${name} :: ${String(e.message).slice(-120)}`); return false; }
}
const strip = async (z, re) => { for (const f of Object.keys(z.files)) if (re.test(f)) z.remove(f);
  const ct = await z.file("[Content_Types].xml").async("string");
  z.file("[Content_Types].xml", ct); };

await attempt("baseline", async()=>{});
await attempt("no embedded fonts (ppt/fonts/*)", async z=>{
  for (const f of Object.keys(z.files)) if (/^ppt\/fonts\//.test(f)) z.remove(f);
  let pres = await z.file("ppt/presentation.xml").async("string");
  pres = pres.replace(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/g,"");
  z.file("ppt/presentation.xml", pres);
  let rels = await z.file("ppt/_rels/presentation.xml.rels").async("string");
  rels = rels.replace(/<Relationship[^>]*font[^>]*\/>/g,"");
  z.file("ppt/_rels/presentation.xml.rels", rels);
  let ct = await z.file("[Content_Types].xml").async("string");
  ct = ct.replace(/<Override[^>]*ppt\/fonts[^>]*\/>/g,"");
  z.file("[Content_Types].xml", ct);
});
await attempt("no transitions", async z=>{
  for (const f of Object.keys(z.files)) if (/^ppt\/slides\/slide\d+\.xml$/.test(f)) {
    let x = await z.file(f).async("string");
    x = x.replace(/<p:transition[\s\S]*?<\/p:transition>/g,"").replace(/<p:transition[^>]*\/>/g,"").replace(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g,"");
    z.file(f, x);
  }
});
await attempt("no chart (drop graphicFrames)", async z=>{
  for (const f of Object.keys(z.files)) if (/^ppt\/slides\/slide\d+\.xml$/.test(f)) {
    let x = await z.file(f).async("string");
    x = x.replace(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g,"");
    z.file(f, x);
  }
});
