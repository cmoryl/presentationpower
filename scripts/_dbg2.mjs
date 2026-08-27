import { chromium } from "playwright";
import JSZip from "jszip";
import { PNG } from "pngjs";
import fs from "node:fs";
const b = await chromium.launch({headless:true, executablePath:"/opt/ms-playwright/chromium-1194/chrome-linux/chrome"});
const p = await (await b.newContext({viewport:{width:1280,height:1800}})).newPage();
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction("!!window.__tpExportVerify && !!window.__tpBackdropOverrides",null,{timeout:120000});
const png=new PNG({width:8,height:8});
for(let i=0;i<png.data.length;i+=4){png.data[i]=255;png.data[i+1]=0;png.data[i+2]=170;png.data[i+3]=255;}
const url=`data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
await p.evaluate(u=>window.__tpBackdropOverrides({"S01:cover:0":u}),url);
const out = await p.evaluate(async()=> (await window.__tpExportVerify.pixel([["MV-OP-COVER","skin-s01","light","editable"]]))[0]);
const zip = await JSZip.loadAsync(Buffer.from(out.pptx,"base64"));
fs.mkdirSync("/tmp/cov",{recursive:true});
for(const n of Object.keys(zip.files).filter(f=>f.startsWith("ppt/media/"))){
  const buf=await zip.file(n).async("nodebuffer");
  fs.writeFileSync("/tmp/cov/"+n.split("/").pop(),buf);
  console.log(n, buf.length);
}
fs.writeFileSync("/tmp/cov/build.png",Buffer.from(out.build,"base64"));
await b.close();
