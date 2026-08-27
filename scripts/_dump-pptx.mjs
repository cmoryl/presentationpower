import { chromium } from "playwright";
import { writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
async function launch(){
  const envExe = process.env.PW_CHROME;
  if (envExe && existsSync(envExe)) return chromium.launch({headless:true, executablePath:envExe});
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
const p = await (await b.newContext({viewport:{width:1280,height:1800}})).newPage();
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction("!!window.__tpExportVerify",null,{timeout:180000});
for (const [v,mode] of [["MV-BENTO-8","light"],["MV-BENTO-5","dark"]]) {
  const cap = (await p.evaluate(([v,m])=>window.__tpExportVerify.pixel([[v,"skin-s01",m,"editable"]]),[v,mode]))[0];
  if(!cap?.pptx){ console.log("no pptx",v,cap?.error); continue; }
  const buf = Buffer.from(cap.pptx.replace(/^data:[^,]+,/,""),"base64");
  writeFileSync(`/tmp/pptxdbg/${v}-${mode}.pptx`, buf);
  console.log(v,mode,(buf.length/1024).toFixed(0)+"KB");
}
await b.close();
