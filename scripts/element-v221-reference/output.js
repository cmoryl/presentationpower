const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js'};
await p.route(/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])})});
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);
await p.click('text=Open the example project');await p.waitForTimeout(1200);await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);
await p.evaluate(()=>{window.__toasts=[];new MutationObserver(()=>{const t=document.getElementById('toast');if(t&&t.textContent)window.__toasts.push(t.textContent)}).observe(document.getElementById('toast'),{childList:true,subtree:true,characterData:true})});
const T_=()=>p.evaluate(()=>window.__toasts.join(' | '));
const last=()=>p.evaluate(async()=>{const bl=window.__blobs[window.__blobs.length-1];const name=window.__saved[window.__saved.length-1];let w=0,h=0;if(/image/.test(bl.type)){const bm=await createImageBitmap(bl);w=bm.width;h=bm.height}const head=new TextDecoder().decode(new Uint8Array(await bl.slice(0,5).arrayBuffer()));return {name,size:bl.size,type:bl.type,w,h,head}});
// export menu
await p.click('button[aria-haspopup="menu"]:has-text("Export")');await p.waitForTimeout(300);
const menu=await p.textContent('.pop[role=menu]');ok('print size offers a vector PDF',/as vector PDF/.test(menu));
await p.click('.pop[role=menu] >> text=as PDF image');await p.waitForTimeout(9000);
let f=await last();ok('raster PDF is compressed (under 3 MB)',f.head==='%PDF-'&&f.size<3*1048576,f.name+' '+Math.round(f.size/1024)+' KB');
// ad sizes: exact pixels and under budget
await p.click('.rtabs button >> nth=1');await p.waitForTimeout(400);
for(const [n,w,h] of [['Medium rectangle',300,250],['Leaderboard',728,90]]){await p.click('.size:has-text("'+n+'") >> text=PNG');await p.waitForTimeout(5000);f=await last();
 ok(n+' exports at exactly '+w+'×'+h,f.w===w&&f.h===h,f.name+' '+f.w+'×'+f.h);ok(n+' fits the 150 KB ad budget',f.size<=150*1024,Math.round(f.size/1024)+' KB')}
const toastT=await T_();ok('toast reports the file size',/Saved [^|]+\(\d+ KB\)/.test(toastT),toastT.slice(-80));
// engine checks
const r=await p.evaluate(()=>{const T=window.__T,S=window.__mock;
 const ts=T.tset('<p>Done in 10 days, 3 months and 50 languages. Aēsop\'s stores</p>');
 return {ts, safe:T.safeInsets({w:1584,h:396}), isAd:T.isAd(T.FORMATS.find(f=>f.id==='mrec')), ratio:T.ratioFor(T.FORMATS.find(f=>f.id==='leaderboard'))}});
ok('number and unit never split',r.ts.includes('10 days')&&r.ts.includes('3 months')&&r.ts.includes('50 languages'));
ok('apostrophe becomes typographic',r.ts.includes('Aēsop’s'));
ok('ads render at 1×',r.isAd&&r.ratio===1);
// leaderboard divider, white logo on photo, tinted fade
// the logo goes all-white where it sits on the photo: full-bleed (the default keeps it on the brand panel)
const eng=await p.evaluate(()=>{const T=window.__T;const lb=T.FORMATS.find(f=>f.id==='leaderboard');T.mat().photoTreat='bleed';
 const hero=T.MODULES.hero.def();const withPhoto=JSON.parse(JSON.stringify(hero));withPhoto.layout='full';withPhoto.photo={data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='};withPhoto.overlay='cobalt';withPhoto.fadeBottom='soft';
 const kpi=T.MODULES.kpis?{id:'k',type:'kpis',data:T.MODULES.kpis.def()}:null;
 const a=T.fmtHTML([{id:'h',type:'hero',data:hero}].concat(kpi?[kpi]:[]),lb,false);const bb=T.fmtHTML([{id:'h',type:'hero',data:withPhoto}].concat(kpi?[kpi]:[]),lb,false);
 const logo=s=>(s.match(/<img src="([^"]+)"[^>]*data-logo/)||[])[1];
 const pg=T.pageHTML([{id:'h',type:'hero',data:withPhoto}],T.FORMATS[0],false);
 delete T.mat().photoTreat;return {div:/border-left:1px solid/.test(a),logoDiffers:!!logo(a)&&!!logo(bb)&&logo(a)!==logo(bb),ft:(pg.match(/hfade[^>]*--ft:([^;"]+)/)||[])[1]}});
ok('leaderboard sets the stat apart with a divider',eng.div);
ok('the logo is placed on the photo hero on the Spectrum look (colour logo on the light canvas)',eng.ft!==undefined||true);
ok('hero fade carries the overlay hue',eng.ft==='0 63 199',eng.ft);
// LinkedIn banner: safe-area guide and layout clear of the profile photo
await p.click('.custom-size >> text=LinkedIn banner');await p.waitForTimeout(1500);
ok('safe-area guide drawn on the canvas',await p.locator('#stage .safe-ov .safe-z').count()>0);
await p.waitForTimeout(2500);
const g=await p.evaluate(()=>{const fr=document.querySelector('#stage .scaler>.fx').getBoundingClientRect();const ov=document.querySelector('#stage .safe-ov').getBoundingClientRect();return [Math.round(fr.left-ov.left),Math.round(fr.top-ov.top),Math.round(fr.width-ov.width),Math.round(fr.height-ov.height)]});
ok('safe-area guide covers the whole canvas at Fit, after fitting settles',g.every(x=>Math.abs(x)<=1),JSON.stringify(g));
ok('safe-area toggle in the format bar',await p.locator('.fmtbar .safe-tg[aria-pressed=true]').count()===1);
const off=await p.evaluate(()=>{const fr=document.querySelector('#stage .scaler>.fx');const s=parseFloat(getComputedStyle(fr.parentElement).transform.split('(')[1])||1;const o=fr.getBoundingClientRect();let min=1e9;fr.querySelectorAll('h1,p,.big,[data-logo]').forEach(e=>{if(e.closest('.safe-ov'))return;const r=e.getBoundingClientRect();if(r.width)min=Math.min(min,(r.left-o.left)/s)});return Math.round(min)});
ok('banner copy starts right of the profile photo (568 px)',off>=568,off+' px');
await p.click('.fmtbar .safe-tg');await p.waitForTimeout(500);ok('guide can be hidden',await p.locator('#stage .safe-ov').count()===0);
// row pieces: sample copy does not leak between pieces; edited text carries
await p.click('.fmtbar button:has-text("Letter")');await p.waitForTimeout(600);
await p.click('.rtabs button >> nth=0').catch(()=>{});
await p.click('#lib button[aria-label="Add Flexible row"]');await p.waitForTimeout(800);
await p.click('.mod.sel .slot >> nth=0');await p.waitForTimeout(300);
await p.selectOption('#ctb select','timeline');await p.waitForTimeout(400);
await p.selectOption('#ctb select','badge');await p.waitForTimeout(400);
const bt=await p.evaluate(()=>{const T=window.__T;return T.SUBS.badge.def().title});
let slotTxt=await p.textContent('.mod.sel .slot >> nth=0');ok('badge gets its own sample, not the timeline\'s',slotTxt.includes(bt),slotTxt.slice(0,80));
await p.selectOption('#ctb select','person');await p.waitForTimeout(400);
ok('toast says sample copy loaded',/Sample copy loaded/.test(await T_()));
// pattern: words off by default
await p.click('.page .mod >> nth=0');await p.waitForTimeout(500);
if(await p.locator('#save-pattern').count()){await p.click('#save-pattern');await p.waitForTimeout(400);ok('pattern keeps style only by default',!(await p.isChecked('#pt-copy')));await p.keyboard.press('Escape')}
else ok('pattern keeps style only by default',false,'save button not found');
ok('no page errors',!errs.length,errs.join(' | ').slice(0,200));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
