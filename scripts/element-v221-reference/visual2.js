// visual tools round two: photo looks (kept, drawn, exported), grid and rulers, across divisions; audit fixes (CTA fills in print, logo wall rows)
const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950}});const errs=[];const url='file://'+__dirname+'/test.html';
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js'};
await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());await ctx.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(k)r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])});else r.abort()});
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1800);
await p.click('#stage .mod >> nth=0');await p.waitForTimeout(300);await p.click('#ctb button:text-is("Full")');await p.waitForTimeout(300);
await p.setInputFiles('.imgpick input[type=file]',__dirname+'/pa-hi.jpg');await p.waitForTimeout(2500);
// photo looks
ok('a placed photo offers looks and brightness',await p.isVisible('[id$="-look"]')&&(await p.locator('.ip-sw').count())===6&&await p.isVisible('[id$="-bright"]'));
await p.click('.ip-sw[aria-label="Black and white"]');await p.waitForTimeout(1200);
ok('a look is kept on the photo and drawn on the page',await p.evaluate(()=>__T.mat().modules[0].data.photo.look==='mono'&&/grayscale\(1\)/.test(document.querySelector('#stage .hp img').style.filter)));
await p.$eval('[id$="-bright"]',e=>{e.value='10';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))});await p.waitForTimeout(800);
ok('brightness is kept and added to the filter',await p.evaluate(()=>__T.mat().modules[0].data.photo.bright===10&&/brightness\(1\.1\)/.test(document.querySelector('#stage .hp img').style.filter)));
ok('the schema keeps look and brightness and drops junk',await p.evaluate(()=>{const c=__T.cleanMods([{id:'a',type:'hero',data:Object.assign(__T.MODULES.hero.def(),{photo:{id:'0123456789abcdef0123456789abcdef',look:'duo',bright:17,evil:'x'}})}]);const ph=c[0].data.photo;return ph.look==='duo'&&ph.bright===15&&!('evil' in ph)}));
// the PNG export carries the look: the hero photo region comes out grey
await p.evaluate(()=>{const d=__T.mat().modules[0].data;d.overlay='none';d.panel='none';__T.mat().tight=14;__T.redraw()});await p.waitForTimeout(700);
await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});await p.evaluate(()=>__T.exportOne(__T.fmtById('letter'),'png'));
await p.waitForFunction(()=>(window.__saved||[]).some(x=>/\.png$/.test(x)),null,{timeout:60000});await p.waitForTimeout(300);
const rf=await p.evaluate(()=>{const im=document.querySelector('#stage .hp img').getBoundingClientRect(),pg=document.querySelector('#stage .page').getBoundingClientRect();return {x:(im.left-pg.left)/pg.width,y:(im.top-pg.top)/pg.height,w:im.width/pg.width,h:im.height/pg.height}});
const grey=await p.evaluate(async(rf)=>{const i=window.__saved.findIndex(x=>/\.png$/.test(x));const bm=await createImageBitmap(window.__blobs[i]);const c=document.createElement('canvas');c.width=bm.width;c.height=bm.height;const x=c.getContext('2d');x.drawImage(bm,0,0);
 // sample the hero's photo area (top band), skipping the overlay-heavy left side
 const d=x.getImageData(Math.round(bm.width*(rf.x+rf.w*0.55)),Math.round(bm.height*(rf.y+rf.h*0.1)),Math.round(bm.width*rf.w*0.3),Math.round(bm.height*rf.h*0.2)).data;let sat=0,n=0;for(let k=0;k<d.length;k+=16){const r=d[k],g=d[k+1],bb=d[k+2];sat+=Math.max(r,g,bb)-Math.min(r,g,bb);n++}return sat/n},rf);
ok('a black-and-white photo under a Spectrum fade comes out grey in the PNG',grey<8,grey.toFixed(1));
await p.click('.ip-sw[aria-label="Natural"]');await p.waitForTimeout(800);
ok('Natural clears the look',await p.evaluate(()=>!__T.mat().modules[0].data.photo.look));
// grid and rulers
ok('a Grid toggle sits beside Safe areas / zoom',await p.isVisible('#grid-tg'));
await p.click('#grid-tg');await p.waitForTimeout(1000);
const g=await p.evaluate(()=>{const ov=document.querySelector('.grid-ov');const cols=ov?ov.querySelectorAll('.grid-col').length:0;const rx=document.querySelector('.ruler-x'),ry=document.querySelector('.ruler-y');const majors=rx?[...rx.querySelectorAll('.tick.major b')].map(b=>b.textContent):[];return {cols,rx:!!rx,ry:!!ry,majors,unit:rx?rx.querySelector('.ruler-unit').textContent:''}});
ok('12 columns, margins and two rulers appear',g.cols===12&&g.rx&&g.ry,JSON.stringify(g));
ok('print rulers read in inches, 0 to 8',g.unit==='in'&&g.majors[0]==='0'&&g.majors.indexOf('8')>=0,g.majors.join(','));
await p.keyboard.press('g');await p.waitForTimeout(700);ok('G toggles the grid off',!(await p.$('.grid-ov'))&&!(await p.$('.ruler')));
await p.click('.fmtbar button:has-text("Square")');await p.waitForTimeout(1500);await p.keyboard.press('g');await p.waitForTimeout(900);
const g2=await p.evaluate(()=>{const rx=document.querySelector('.ruler-x');return rx?rx.querySelector('.ruler-unit').textContent:''});
ok('on a social size the rulers read in px',g2==='px',g2);
ok('the grid never leaks into the export',await p.evaluate(()=>!__T.fmtHTML(__T.mat().modules,__T.fmtById('square'),false).includes('grid-ov')));
await p.keyboard.press('g');await p.click('.fmtbar button:has-text("Letter")');await p.waitForTimeout(1000);
// across divisions
await p.click('#fmt-all');await p.waitForTimeout(2000);ok('the All sizes head offers Across divisions',await p.isVisible('#gal-div'));
await p.check('#gal-div');await p.waitForTimeout(3500);
const dv=await p.evaluate(()=>{const ts=[...document.querySelectorAll('.gallery-div .gal-tile')];return {n:ts.length,names:ts.map(t=>t.querySelector('.gal-cap b').textContent),cur:ts.filter(t=>t.classList.contains('cur')).length,brands:[...new Set(ts.map(t=>{const g=t.querySelector('.gl');return g?g.getAttribute('data-brand'):''}))].length}});
ok('one tile per division and product, each drawn in its own brand',dv.n>=9&&dv.brands>=9&&dv.cur===1,JSON.stringify(dv));
await p.uncheck('#gal-div');await p.waitForTimeout(1500);ok('back to sizes',!(await p.$('.gallery-div')));
await p.click('.gal-tile >> nth=0');await p.waitForTimeout(1200);
// audit fixes
const ctas=await p.evaluate(()=>{const T=__T;const out={};['navy','cobalt','gradient'].forEach(f=>{const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);host.innerHTML=T.pageHTML([{id:'c'+f,type:'cta',data:Object.assign(T.MODULES.cta.def(),{fill:f})}],T.fmtById('letter'),false);const cs=getComputedStyle(host.querySelector('.cta'));out[f]=cs.backgroundColor+'|'+cs.backgroundImage;host.remove()});return out});
ok('print pages: every CTA fill is one flat Spectrum colour',new Set(Object.values(ctas)).size>=1&&Object.values(ctas).every(v=>/\|none$/.test(v)),JSON.stringify(ctas));
const lw=await p.evaluate(()=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);host.innerHTML=T.pageHTML([{id:'lw',type:'logoWall',data:Object.assign(T.MODULES.logoWall.def(),{cols:'4'})}],T.fmtById('letter'),false);const ts=[...host.querySelectorAll('.dk-lt')];const rows={};ts.forEach(t=>{const r=t.getBoundingClientRect();(rows[Math.round(r.top)]=rows[Math.round(r.top)]||[]).push(r)});const keys=Object.keys(rows).map(Number).sort((a,b)=>a-b);const first=rows[keys[0]],last=rows[keys[keys.length-1]];const grid=host.querySelector('.dk-lg').getBoundingClientRect();const c=r=>(r[0].left+r[r.length-1].right)/2;host.remove();return {rows:keys.length,first:first.length,last:last.length,firstC:c(first),lastC:c(last),gridC:(grid.left+grid.right)/2}});
ok('logo wall: a short last row is centred under the full rows',lw.last<lw.first&&Math.abs(lw.lastC-lw.gridC)<2&&Math.abs(lw.firstC-lw.gridC)<2,JSON.stringify(lw));
await p.click('.fmtbar button:has-text("Square")');await p.waitForTimeout(700);await p.click('.fmtbar button:has-text("Story")');await p.waitForTimeout(700);
ok('clicking through sizes keeps one Grid and one Safe areas button',await p.evaluate(()=>document.querySelectorAll('#grid-tg').length===1&&document.querySelectorAll('.safe-tg:not(.grid-tg)').length===1),await p.evaluate(()=>document.querySelectorAll('#grid-tg').length+'/'+document.querySelectorAll('.safe-tg:not(.grid-tg)').length));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
