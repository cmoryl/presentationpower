import { chromium } from "playwright";
import { ensureChromiumLaunchOptions } from "./lib/ensure-chromium.mjs";
import JSZip from "jszip";
const b = await chromium.launch(await ensureChromiumLaunchOptions());
const p = await (await b.newContext({viewport:{width:1280,height:1800}})).newPage();
p.setDefaultTimeout(600000);
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction(()=>Boolean(window.__tpExportVerify));
const r = await p.evaluate(()=>window.__tpExportVerify.pair("MV-BENTO-6",null,"light","editable"));
const zip = await JSZip.loadAsync(Buffer.from(r.single,"base64"));
for (const n of Object.keys(zip.files)) {
  if(!/^ppt\/media\//.test(n)||zip.files[n].dir) continue;
  const buf = await zip.file(n).async("nodebuffer");
  let dim="-";
  if(/\.png$/i.test(n)&&buf.length>24) dim=`${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
  console.log(n, buf.length, dim);
}
await b.close();
