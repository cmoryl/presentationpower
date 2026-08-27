import { chromium } from "playwright";
const b = await chromium.launch({headless:true, executablePath:"/opt/ms-playwright/chromium-1194/chrome-linux/chrome"});
const p = await (await b.newContext({viewport:{width:1280,height:1800}})).newPage();
p.on("console",m=>m.type()==="error"&&console.log("[err]",m.text().slice(0,200)));
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction("!!window.__tpExportVerify",null,{timeout:120000});
console.log(await p.evaluate(()=>window.__tpExportVerify.variants.filter(v=>/COVER/i.test(v)).slice(0,8)));
const r = await p.evaluate(async ()=>{
  try{
    const out = await window.__tpExportVerify.pixel([["MV-COVER-STATEMENT","skin-s01","light","editable"]]);
    return {keys:Object.keys(out[0]||{}), pptxLen:(out[0]?.pptx||"").length, buildLen:(out[0]?.build||"").length};
  }catch(e){return {error:String(e)}}
});
console.log(r);
console.log(await p.evaluate(()=>document.querySelectorAll("[data-slide-stage]").length+"/"+document.querySelectorAll("[data-slide-stage-root]").length));
await b.close();
