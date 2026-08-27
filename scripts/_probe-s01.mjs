import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
async function launch(){
  try { return await chromium.launch({headless:true}); } catch(e){
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    for (const dir of readdirSync(root).filter(d=>d.startsWith("chromium")))
      for (const rel of ["chrome-linux/chrome","chrome-linux/headless_shell"]) {
        const exe = path.join(root, dir, rel);
        if (existsSync(exe)) return chromium.launch({headless:true, executablePath:exe});
      }
    throw e;
  }
}
const b = await launch();
const p = await (await b.newContext({viewport:{width:1440,height:2000}})).newPage();
await p.goto("http://localhost:8080/public/modules?style=skin-s01",{waitUntil:"domcontentloaded"});
await p.waitForTimeout(9000);
const res = await p.evaluate(() => {
  const out = { borders: [], overflow: [], stages: 0 };
  const stages = [...document.querySelectorAll('[data-variant-id.,id]')];
  out.stages = stages.length;
  const seen = new Set();
  for (const st of stages.slice(0, 400)) {
    const sr = st.getBoundingClientRect();
    if (sr.width < 200) continue;
    const key = st.getAttribute('data-variant-id.,) || st.className?.slice?.(0,40);
    for (const el of st.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const bw = ['Top','Right','Bottom','Left'].map(s=>parseFloat(cs['border'+s+'Width'])||0);
      const bc = ['Top','Right','Bottom','Left'].map(s=>cs['border'+s+'Color']);
      const visible = bw.some((w,i)=>w>0 && !/rgba\(.*,\s*0\)/.test(bc[i]) && bc[i]!=='transparent');
      const r = el.getBoundingClientRect();
      if (visible && r.width > sr.width*0.5 && r.height > sr.height*0.3) {
        const sig = key+'|'+el.className+'|'+bw.join(',')+'|'+bc.join(',');
        if(!seen.has(sig)){seen.add(sig);out.borders.push({variant:key, cls:String(el.className).slice(0,120), bw, bc, w:Math.round(r.width), h:Math.round(r.height)});}
      }
      if (r.bottom > sr.bottom + 2 || r.right > sr.right + 2 || r.top < sr.top - 2) {
        if (el.textContent && el.textContent.trim().length > 2) {
          const sig='of|'+key+'|'+el.className;
          if(!seen.has(sig)){seen.add(sig);out.overflow.push({variant:key, cls:String(el.className).slice(0,90), text:el.textContent.trim().slice(0,40), dBottom:Math.round(r.bottom-sr.bottom), dRight:Math.round(r.right-sr.right), dTop:Math.round(sr.top-r.top)});}
        }
      }
    }
  }
  return out;
});
console.log(JSON.stringify(res,null,1).slice(0,6000));
await b.close();
