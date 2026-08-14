import JSZip from "jszip"; import { readFile } from "node:fs/promises";
import { renderPptxWithPowerPoint, deleteDriveItem } from "./render-via-powerpoint.mjs";
const src = await JSZip.loadAsync(await readFile("/tmp/cell.pptx"));
const clone = async () => JSZip.loadAsync(await src.generateAsync({type:"nodebuffer"}));
async function attempt(name, mut){ const z=await clone(); await mut(z);
  try{ const r=await renderPptxWithPowerPoint(await z.generateAsync({type:"nodebuffer"}), `b2-${Date.now()}.pptx`); await deleteDriveItem(r.itemId); console.log("✓ OPENS ", name); }
  catch(e){ console.log("✗ 406   ", name); } }

// A: keep font parts + rels, drop only the embeddedFontLst declaration
await attempt("declaration removed, parts+rels kept", async z=>{
  let p = await z.file("ppt/presentation.xml").async("string");
  z.file("ppt/presentation.xml", p.replace(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/,""));
});
// B: declare regular only (drop bold/italic/boldItalic children + their parts)
await attempt("regular weight only", async z=>{
  let p = await z.file("ppt/presentation.xml").async("string");
  p = p.replace(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/, (m)=>m.replace(/<p:(bold|italic|boldItalic)\b[^>]*\/>/g,""));
  z.file("ppt/presentation.xml", p);
});
// C: no p:font panose/pitchFamily attrs
await attempt("font element without panose/pitchFamily", async z=>{
  let p = await z.file("ppt/presentation.xml").async("string");
  z.file("ppt/presentation.xml", p.replace(/<p:font typeface="Geist"[^>]*\/>/, '<p:font typeface="Geist"/>'));
});
// D: embeddedFontLst moved to very end of p:presentation children
await attempt("embeddedFontLst last child", async z=>{
  let p = await z.file("ppt/presentation.xml").async("string");
  const m = p.match(/<p:embeddedFontLst>[\s\S]*?<\/p:embeddedFontLst>/)[0];
  p = p.replace(m, "").replace("</p:presentation>", m + "</p:presentation>");
  z.file("ppt/presentation.xml", p);
});
