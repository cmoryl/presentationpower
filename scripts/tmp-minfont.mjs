import PptxGenJS from "pptxgenjs"; import JSZip from "jszip"; import { readFile } from "node:fs/promises";
import { renderPptxWithPowerPoint, deleteDriveItem } from "./render-via-powerpoint.mjs";
const cell = await JSZip.loadAsync(await readFile("/tmp/cell.pptx"));
const ttf = await cell.file("ppt/fonts/font1.fntdata").async("nodebuffer");

async function base(){ const p=new PptxGenJS(); const s=p.addSlide(); s.addText("Geist embed probe",{x:1,y:1,fontSize:32,fontFace:"Geist"});
  return JSZip.loadAsync(await p.write({outputType:"nodebuffer"})); }

async function probe(name, mut){ const z=await base(); await mut(z);
  try{ const r=await renderPptxWithPowerPoint(await z.generateAsync({type:"nodebuffer"}), `mf-${Date.now()}.pptx`); await deleteDriveItem(r.itemId); console.log("✓ OPENS ", name); }
  catch(e){ console.log("✗ 406   ", name); } }

await probe("no embed (control)", async()=>{});

const addFont = (z, data, ext="fntdata") => {
  z.file(`ppt/fonts/font1.${ext}`, data);
  let rels = z.file("ppt/_rels/presentation.xml.rels");
  return rels;
};
await probe("embed raw TTF, regular only", async z=>{
  z.file("ppt/fonts/font1.fntdata", ttf);
  let rels = await z.file("ppt/_rels/presentation.xml.rels").async("string");
  const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map(m=>+m[1]);
  const id = `rId${Math.max(...ids)+1}`;
  rels = rels.replace("</Relationships>", `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/font1.fntdata"/></Relationships>`);
  z.file("ppt/_rels/presentation.xml.rels", rels);
  let ct = await z.file("[Content_Types].xml").async("string");
  if(!/fntdata/.test(ct)) ct = ct.replace("<Default", `<Default Extension="fntdata" ContentType="application/x-fontdata"/><Default`);
  z.file("[Content_Types].xml", ct);
  let pres = await z.file("ppt/presentation.xml").async("string");
  const blk = `<p:embeddedFontLst><p:embeddedFont><p:font typeface="Geist" panose="020B0604020202020204" pitchFamily="34" charset="0"/><p:regular r:id="${id}"/></p:embeddedFont></p:embeddedFontLst>`;
  pres = /<p:defaultTextStyle/.test(pres) ? pres.replace(/<p:defaultTextStyle/, blk+"<p:defaultTextStyle") : pres.replace("</p:presentation>", blk+"</p:presentation>");
  z.file("ppt/presentation.xml", pres);
});
