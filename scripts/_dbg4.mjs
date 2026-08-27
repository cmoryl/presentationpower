import { chromium } from "playwright";
import { PNG } from "pngjs";
function magenta(){const p=new PNG({width:8,height:8});for(let i=0;i<p.data.length;i+=4){p.data[i]=255;p.data[i+1]=0;p.data[i+2]=200;p.data[i+3]=255;}return `data:image/png;base64,${PNG.sync.write(p).toString("base64")}`;}
const b=await chromium.launch({headless:true,executablePath:"/opt/ms-playwright/chromium-1194/chrome-linux/chrome"});
const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
p.on("console",m=>console.log("[c]",m.text().slice(0,200)));
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction("!!window.__tpBackdropOverrides",null,{timeout:60000});
const r=await p.evaluate(async(url)=>{
  window.__tpBackdropOverrides({"S01:cover:0":url});
  const ov=await import("/src/lib/skin-backdrop-overrides.ts");
  const raster=await import("/src/lib/pack-background-raster.ts");
  const sp=await import("/src/lib/style-packs.ts");
  const pack=sp.stylePackById("skin-s01");
  const out=await raster.rasterizePackBackground(pack,"MV-OP-COVER","LO-01");
  return {version:ov.skinBackdropOverrideVersion(), lookup:!!ov.skinBackdropOverride("S01","cover",0),
   ground:sp.packGroundPaint(pack,"LO-01")[0].slice(0,30), data:(out.data||"").slice(0,40), len:(out.data||"").length};
},magenta());
console.log(r); await b.close();
