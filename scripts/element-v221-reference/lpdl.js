// Module examples (Get started): each module offers its design on show as a PowerPoint or Illustrator file.
const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js','pptxgenjs':L+'pptxgenjs-3.12.0/package/dist/pptxgen.bundle.js','docx@':L+'docx-8.5.0/package/build/index.umd.js'};
await p.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])})});await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
// open whatever disclosure holds the module listing
await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>{d.open=true;d.dispatchEvent(new Event('toggle'))})});await p.waitForTimeout(1200);
const n=await p.$$eval('.lp-mod',x=>x.length);const nd=await p.$$eval('.lp-mod .lp-dl',x=>x.length);
ok('every module example has a download row',n>20&&nd===n,n+' modules, '+nd+' rows');
ok('each row offers PowerPoint and Illustrator',await p.$$eval('.lp-mod .lp-dl',x=>x.every(r=>[...r.querySelectorAll('.mx-dlb')].map(b=>b.textContent).join('|')==='PowerPoint|Illustrator')));
const fig=p.locator('.lp-mod').filter({has:p.locator('figcaption b',{hasText:/^KPI trio$/})}).first();await fig.scrollIntoViewIfNeeded();await p.waitForTimeout(900);
await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});
await fig.locator('.mx-dlb',{hasText:'Illustrator'}).click();await p.waitForFunction(()=>(window.__saved||[]).some(x=>/\.svg$/.test(x)),null,{timeout:60000});
ok('Illustrator downloads an SVG of that module',await p.evaluate(async()=>{const i=window.__saved.findIndex(x=>/\.svg$/.test(x));const t=await window.__blobs[i].text();return /<svg/.test(t)&&/<text/.test(t)}),await p.evaluate(()=>window.__saved.join(',')));
// pick the third variation, then PowerPoint: the file is of the design on show
const tiles=fig.locator('.lp-var');if(await tiles.count()>2){await tiles.nth(2).click();await p.waitForTimeout(500)}
ok('choosing a variation is remembered for the download',await fig.evaluate(f=>f._i===2));
await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});
await fig.locator('.mx-dlb',{hasText:'PowerPoint'}).click();await p.waitForFunction(()=>(window.__saved||[]).some(x=>/\.pptx$/.test(x)),null,{timeout:90000});
ok('PowerPoint downloads a .pptx',await p.evaluate(()=>window.__blobs[window.__saved.findIndex(x=>/\.pptx$/.test(x))].size>5000),await p.evaluate(()=>window.__saved.join(',')));
await fig.screenshot({path:'/tmp/shots/lpdl.png'});
// Modules page > What's new: every example there offers the same two files
await p.evaluate(()=>{const s=__T.S();s.mxGroup='new';__T.go('modules',null,null)});await p.waitForTimeout(1500);
const wn=await p.evaluate(()=>{const figs=[...document.querySelectorAll('#mx-new .mx-var')];return {n:figs.length,rows:figs.filter(f=>[...f.querySelectorAll('.mx-dl .mx-dlb')].map(b=>b.textContent).join('|')==='PowerPoint|Illustrator').length}});
ok("What's new: every example has PowerPoint and Illustrator links",wn.n>20&&wn.rows===wn.n,wn.rows+' of '+wn.n);
const wf=p.locator('#mx-new .mx-var').filter({has:p.locator('figcaption',{hasText:/^KPI trends: tiles with sparklines$/})}).first();await wf.scrollIntoViewIfNeeded();await p.waitForTimeout(900);
await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});
await wf.locator('.mx-dlb',{hasText:'Illustrator'}).click();await p.waitForFunction(()=>(window.__saved||[]).some(x=>/\.svg$/.test(x)),null,{timeout:60000});
ok("What's new: Illustrator downloads that example as an SVG with live text",await p.evaluate(async()=>{const i=window.__saved.findIndex(x=>/\.svg$/.test(x));const t=await window.__blobs[i].text();return /<svg/.test(t)&&/<text/.test(t)&&/kpi-trends-tiles/.test(window.__saved[i])}),await p.evaluate(()=>window.__saved.join(',')));
const wf2=p.locator('#mx-new .mx-var').filter({has:p.locator('figcaption',{hasText:/^Checklist: tiles$/})}).first();await wf2.scrollIntoViewIfNeeded();await p.waitForTimeout(900);
await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});
await wf2.locator('.mx-dlb',{hasText:'PowerPoint'}).click();await p.waitForFunction(()=>(window.__saved||[]).some(x=>/\.pptx$/.test(x)),null,{timeout:90000});
ok("What's new: PowerPoint downloads a .pptx",await p.evaluate(()=>window.__blobs[window.__saved.findIndex(x=>/\.pptx$/.test(x))].size>5000),await p.evaluate(()=>window.__saved.join(',')));
ok("What's new: the links do not open the larger view",!(await p.$('.scrim .mx-big')));
await wf2.screenshot({path:'/tmp/shots/wndl.png'});
ok('no page errors',errs.length===0,errs.join(' | '));
R.forEach(x=>console.log(x));await b.close();process.exit(R.some(x=>x.startsWith('FAIL'))?1:0)})();
