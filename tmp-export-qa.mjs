import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
const out="/tmp/pptxqa/out"; await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.PW_CHROME});
const p=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();
p.on("pageerror",e=>console.log("PAGEERR",String(e).slice(0,160)));
await p.goto("http://localhost:8080/dev/export-verify",{waitUntil:"domcontentloaded"});
await p.waitForFunction("!!window.__tpExportVerify",null,{timeout:180000});
const packs=await p.evaluate(()=>window.__tpExportVerify.packs.filter(Boolean));
console.log("packs sample:",packs.slice(0,8), "n=",packs.length);
const pack=packs[1]??packs[0];
const jobs=[["MV-OP-COVER",pack,"light"],["MV-PROOF-STATS-4",pack,"light"],["MV-GRAPH-CATEGORY-BARS",pack,"light"],["MV-BENTO-5",pack,"dark"]];
for(const j of jobs){
  const [cap]=await p.evaluate(job=>window.__tpExportVerify.pixel([job]),j);
  if(!cap?.pptx){console.log("FAIL",j[0],cap?.error);continue;}
  await writeFile(`${out}/${j[0]}_${j[2]}.pptx`, Buffer.from(cap.pptx,"base64"));
  console.log("ok",j[0],j[2],"pack",pack);
}
await b.close();
