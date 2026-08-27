import { chromium } from "playwright";
const b=await chromium.launch({headless:true,executablePath:"/opt/ms-playwright/chromium-1194/chrome-linux/chrome"});
const p=await (await b.newContext({viewport:{width:1280,height:1800}})).newPage();
await p.goto("http://localhost:8080/looks",{waitUntil:"domcontentloaded"});
await p.waitForTimeout(4000);
const r=await p.evaluate(async()=>{
  const m=await import("/src/lib/skin-backdrop-overrides.ts");
  m.setSkinBackdropOverrides({"S01:cover:0":"data:image/png;base64,iVBORw0KGgo="});
  await new Promise(r=>setTimeout(r,3000));
  const sp=await import("/src/lib/style-packs.ts");
  return {has:m.hasSkinBackdropOverrides(), v:m.skinBackdropOverrideVersion(),
    ground:sp.packGroundPaint(sp.stylePackById("skin-s01"),"cover")[0].slice(0,40),
    dataBg:[...document.querySelectorAll("*")].filter(e=>getComputedStyle(e).backgroundImage.includes("data:image/png")).length,
    imgs:[...document.querySelectorAll("img")].filter(i=>i.src.startsWith("data:image/png")).length};
});
console.log(r); await b.close();
