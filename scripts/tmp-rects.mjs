import { chromium } from "playwright";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
let b;
try { b = await chromium.launch({headless:true}); } catch (e) {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  for (const dir of readdirSync(root).filter(d=>d.startsWith("chromium"))) {
    for (const rel of ["chrome-linux/chrome","chrome-linux/headless_shell"]) {
      const exe = path.join(root,dir,rel);
      if (existsSync(exe)) { b = await chromium.launch({headless:true,executablePath:exe}); break; }
    }
    if (b) break;
  }
}
const p = await (await b.newContext({viewport:{width:1280,height:1800}})).newPage();
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction("!!window.__tpExportVerify",null,{timeout:120000});
const [cap] = await p.evaluate(() => window.__tpExportVerify.pixel([["MV-INFO-DONUT",null,"light","editable"]]));
console.log("graphic", cap.graphicRects.length, JSON.stringify(cap.graphicRects.slice(0,12)));
console.log("text", cap.textRects.length, JSON.stringify(cap.textRects.slice(0,6)));
await b.close();
