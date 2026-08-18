import { chromium } from "playwright";
import { readdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
let b; try { b = await chromium.launch({headless:true}); } catch { const root=process.env.PLAYWRIGHT_BROWSERS_PATH; for (const d of readdirSync(root).filter(d=>d.startsWith("chromium"))) for (const rel of ["chrome-linux/chrome","chrome-linux/headless_shell"]) { const e=path.join(root,d,rel); if (existsSync(e)) { b=await chromium.launch({headless:true,executablePath:e}); break; } } }
const p = await (await b.newContext({viewport:{width:1280,height:1800}})).newPage();
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction("!!window.__tpExportVerify",null,{timeout:120000});
const api = await p.evaluate(()=>Object.keys(window.__tpExportVerify));
console.log(api);
await b.close();
