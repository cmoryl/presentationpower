const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);
await p.click('text=Open the example project');await p.waitForTimeout(1500);await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);
await p.click('.page .mod >> nth=0');await p.waitForTimeout(500);
ok('hero shows a text safe area guide',await p.isVisible('#stage .hero-safe-box'));
ok('band covered by the next section is marked',await p.isVisible('#stage .hero-safe-cov'));
const vid=await p.$eval('.rbody select[id$="-valign"]',e=>e.id);await p.selectOption('#'+vid,'center');await p.waitForTimeout(800);
const sid=await p.$eval('.rbody select[id$="-safe"]',e=>e.id);await p.selectOption('#'+sid,'roomy');await p.waitForTimeout(800);
// make the hero taller so centring is visible
const g=await p.$('#stage .hero-grip');await g.focus();for(let i=0;i<10;i++){await p.keyboard.press('ArrowDown');await p.waitForTimeout(120)}await p.waitForTimeout(600);
const r=await p.evaluate(()=>{const box=document.querySelector('#stage .hero-safe-box').getBoundingClientRect();const c=document.querySelector('#stage .mod.sel .hcopy').getBoundingClientRect();const sec=document.querySelector('#stage .mod.sel section.m-hero');return {boxMid:(box.top+box.bottom)/2,copyMid:(c.top+c.bottom)/2,inside:c.top>=box.top-1&&c.bottom<=box.bottom+1,left:Math.round(c.left-box.left),cls:sec.className}});
ok('text is vertically centred in the safe area',Math.abs(r.boxMid-r.copyMid)<=3,JSON.stringify(r));
ok('text stays inside the safe area, left aligned at its edge',r.inside&&Math.abs(r.left)<=2,r.left);
ok('roomy margin applied',/hs-roomy/.test(r.cls));
await p.screenshot({path:'../shots/hero-safe.png',clip:{x:250,y:120,width:850,height:560}});
ok('no page errors',!errs.length,errs.join(' | ').slice(0,200));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
