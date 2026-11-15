// Multi-page materials: page breaks, Add a page, Split into pages, per-page checks and multi-page exports.
const {chromium}=require('playwright');const fs=require('fs');const cp=require('child_process');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' ')));
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js','pptxgenjs':L+'pptxgenjs-3.12.0/package/dist/pptxgen.bundle.js','docx@':L+'docx-8.5.0/package/build/index.umd.js'};
await p.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])})});
await p.addInitScript(()=>{/* these checks are about exports, not sample copy: pass the sample-copy question */new MutationObserver(()=>{const b=document.getElementById('u-export-anyway')||document.getElementById('sp-export-anyway');if(b)b.click()}).observe(document,{childList:true,subtree:true})});await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
const X=__dirname+'/../exports/';fs.mkdirSync(X,{recursive:true});

// a project, then the Multi-page Brief layout
await p.click('button:has-text("New project")');await p.waitForTimeout(400);
await p.fill('#np-name','Pages test');await p.click('button:has-text("Create project")');await p.waitForTimeout(1300);
ok('the Multi-page Brief layout is offered',!!(await p.$('.lay-card[data-layout="Multi-page Brief"]')));
await p.click('.lay-card[data-layout="Multi-page Brief"]');await p.click('button:has-text("Create and open")');await p.waitForTimeout(2000);
const sh=await p.evaluate(()=>{const pg=document.querySelector('#stage .page');return {multi:pg.classList.contains('multi'),sheets:pg.querySelectorAll(':scope>.sheet').length,h:[...pg.querySelectorAll(':scope>.sheet')].map(s=>s.offsetHeight),seam:(pg.querySelector('.pgseam')||{}).textContent}});
ok('the page is drawn as two US Letter pages',sh.multi&&sh.sheets===2&&sh.h.every(x=>x>=1056)&&sh.seam==='Page 2',JSON.stringify(sh));
const note=await p.textContent('#stage .note');
ok('the line under the sizes counts the pages',/2 US Letter pages/.test(note),note);
ok('the footer ends the last page',await p.evaluate(()=>{const s=[...document.querySelectorAll('#stage .page>.sheet')];return !s[0].querySelector('.foot')&&!!s[1].querySelector('.foot')}));
const stk=await p.evaluate(()=>[...document.querySelectorAll('#stack li[data-mid]')].map(li=>li.textContent.trim()));
ok('the stack shows where page 2 starts',stk.some(t=>/Page 2 starts here/.test(t)),stk.join(' | '));

// Add a page: goes in before the call to action and footer
await p.click('#add-page');await p.waitForTimeout(600);
const types=await p.evaluate(()=>__T.mat().modules.map(m=>m.type));
ok('Add a page puts a break before the call to action and footer',types.filter(t=>t==='pagebreak').length===2&&types.slice(-3).join()==='pagebreak,cta,footer',types.join(','));
await p.evaluate(()=>{const a=__T.mat().modules;const i=a.findIndex(m=>m.type==='cta');a.splice(i,0,__T.mk('pagebreak'))});
const pf2=await p.evaluate(()=>__T.preflight(__T.mat()).list.map(x=>x[1]).filter(t=>/empty page/.test(t)));
ok('preflight flags back-to-back page breaks',pf2.length===1,pf2.join(' | '));
await p.click('button:has-text("Undo")').catch(()=>{});await p.waitForTimeout(300);
await p.evaluate(()=>{const a=__T.mat().modules;for(let i=a.length-1;i>0;i--)if(a[i].type==='pagebreak'&&a[i-1].type==='pagebreak')a.splice(i,1);});

// a single page that overflows: Split into pages
await p.evaluate(()=>{const S=__T.S();S.mat.modules=S.mat.modules.filter(m=>m.type!=='pagebreak');window.dispatchEvent(new Event('resize'))});await p.waitForTimeout(800);
const before=await p.textContent('#stage .note');
ok('an overflowing page offers Split into pages',/px past the/.test(before)&&!!(await p.$('#split-pages')),before.slice(0,120));
await p.click('#split-pages');await p.waitForTimeout(1200);
const after=await p.evaluate(()=>({n:__T.pageCount(__T.mat()),types:__T.mat().modules.map(m=>m.type),note:document.querySelector('#stage .note').textContent}));
ok('Split into pages makes pages that each fit',after.n>=2&&/each fits/.test(after.note),after.note);
ok('the call to action and footer stay together at the end',after.types.slice(-2).join()==='cta,footer'&&after.types[0]==='hero',after.types.join(','));
const heights=await p.evaluate(()=>{const f=__T.fmtById('letter');return __T.pageParts(__T.mat().modules).map(pt=>__T.measure(JSON.parse(JSON.stringify(pt)),f))});
ok('no page is taller than US Letter',heights.every(x=>x<=1058),heights.join(','));
// A4 is checked page by page too
const a4=await p.evaluate(()=>__T.preflight(__T.mat()).list.filter(x=>/A4|US Letter/.test(x[1])).map(x=>x[0]+':'+x[1]));
ok('preflight checks each page',a4.every(x=>/^ok:|page \d by/.test(x)),a4.join(' | '));

// social sizes are made from the whole material
const soc=await p.evaluate(()=>{const f=__T.FORMATS.find(x=>x.id==='square');const h=__T.fmtHTML(JSON.parse(JSON.stringify(__T.mat().modules)),f,false);return {seam:/pgseam/.test(h),len:h.length}});
ok('social sizes ignore page breaks',!soc.seam&&soc.len>500,JSON.stringify(soc));

// stage selection: clicking the seam selects the break, and it says what it does
await p.click('#stage .pgseam >> nth=0');await p.waitForTimeout(400);
ok('a selected page break explains itself',/starts a new page/.test(await p.textContent('.rbody')));
ok('a page break has nothing to swap for',!(await p.$('#swap-btn')));
await p.keyboard.press('Escape');

// exports
const grab=async(label,ext)=>{await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});await p.click('button:has-text("Export")');await p.waitForTimeout(300);await p.click('.pop button:has-text("'+label+'")');
 if(await p.isVisible('#export-anyway').catch(()=>false)){await p.click('#export-anyway')}
 await p.waitForFunction(e=>(window.__saved||[]).some(n=>n.endsWith(e)),ext,{timeout:90000});
 const b64=await p.evaluate(async e=>{const i=window.__saved.findIndex(n=>n.endsWith(e));const bl=window.__blobs[i];const a=new Uint8Array(await bl.arrayBuffer());let s='';for(let j=0;j<a.length;j+=32768)s+=String.fromCharCode.apply(null,a.subarray(j,j+32768));return [window.__saved[i],btoa(s)]},ext);
 fs.writeFileSync(X+b64[0],Buffer.from(b64[1],'base64'));return b64[0]};
const n=after.n;
const pdf=await grab('as PDF image','.pdf');
const pdfPages=(fs.readFileSync(X+pdf,'latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
ok('the PDF has every page',pdfPages===n,pdfPages+' of '+n);
const pptx=await grab('as PowerPoint','.pptx');
const slides=cp.execSync('unzip -l "'+X+pptx+'"').toString().match(/ppt\/slides\/slide\d+\.xml/g)||[];
ok('PowerPoint has a slide per page',slides.length===n,slides.length+' of '+n);
const docx=await grab('Word document','.docx');
const doc=cp.execSync('unzip -p "'+X+docx+'" word/document.xml').toString();
ok('Word has one section per page',(doc.match(/<w:sectPr/g)||[]).length===n,(doc.match(/<w:sectPr/g)||[]).length);
const ai=await grab('for Illustrator','.zip');
const svgs=cp.execSync('unzip -l "'+X+ai+'"').toString().match(/-p\d+-illustrator\.svg/g)||[];
ok('Illustrator gets one file per page',svgs.length===n,svgs.join(','));
const png=await grab('US Letter as PNG','.zip');
const pngs=cp.execSync('unzip -l "'+X+png+'"').toString().match(/-p\d+\.png/g)||[];
ok('PNG gives one image per page',pngs.length===n,pngs.join(','));
// vector print: one printed page per page
await p.evaluate(()=>{window.print=()=>{window.__printed=document.querySelectorAll('#print-host>.page').length}});
await p.click('button:has-text("Export")');await p.waitForTimeout(300);
const vbtn=await p.$('.pop button:has-text("as vector PDF")');
if(vbtn){await vbtn.click();if(await p.isVisible('#export-anyway').catch(()=>false))await p.click('#export-anyway');await p.waitForTimeout(600);if(await p.isVisible('#pc-print').catch(()=>false))await p.click('#pc-print');await p.waitForTimeout(900);
 ok('the vector PDF prints every page',await p.evaluate(()=>window.__printed)===n,await p.evaluate(()=>window.__printed));}
await p.keyboard.press('Escape');

// the library rebuild keeps every word: a piece that fits comes back on one page, a longer one runs onto more pages
const long=await p.evaluate(()=>{const f=__T.fmtById('letter');const x=__T.ELIB.filter(e=>!__T.pieceIsMulti(e)).map(e=>[e,__T.measure(__T.pieceToModules(e),f)]).sort((a,b)=>b[1]-a[1])[0];return {id:x[0].id,h:x[1]}});
ok('some earlier pieces are longer than a page as written',long.h>1060,JSON.stringify(long));
const rebuild=async id=>{await p.click('#appnav button:has-text("Library")');await p.waitForTimeout(800);
 await p.fill('input[type=search]',await p.evaluate(id=>__T.ELIB.find(e=>e.id===id).title,id));await p.waitForTimeout(600);
 await p.click('.el-card >> nth=0');await p.waitForTimeout(500);await p.click('#el-rebuild');await p.waitForTimeout(500);await p.click('#rb-go');await p.waitForTimeout(2500);
 return p.evaluate(()=>({n:__T.pageCount(__T.mat()),tight:__T.mat().tight||0,note:(document.querySelector('#stage .note')||{}).textContent||'',log:JSON.stringify(__T.mat().review)}))};
const one=await rebuild(long.id);
ok('a piece with more than a page of content runs onto more pages, each fitting',one.n>1&&/each fits/.test(one.note),JSON.stringify(one).slice(0,300));
ok('the material says every word of the original is kept',/Every word of the original is kept/.test(one.log));
const words=await p.evaluate(()=>{const m=__T.mat();const pc=__T.ELIB.find(e=>e.title&&m.name&&(m.rebuiltFrom||{}).id===e.id);const t=JSON.stringify(m.modules).toLowerCase();const src=[pc.challenge,pc.solution,pc.results].flat().filter(Boolean).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>3);return src.filter(w=>t.indexOf(w)<0).length});
ok('nothing of the original is cut in the rebuild',words===0,words);
// an eBrochure a little over a page stays on one page with smaller type, every word kept
const mid=await p.evaluate(()=>{const x=__T.ELIB.filter(e=>!__T.pieceIsMulti(e)&&e.kind==='ebrochure').map(e=>{const l=__T.pieceLayout(e);return [e.id,l.tight||0,l.modules.some(m=>m.type==='pagebreak')]}).filter(x=>!x[2]&&x[1]>6&&x[1]<=22).sort((a,b)=>b[1]-a[1])[0];return x&&x[0]});
const smal=await rebuild(mid);
ok('an eBrochure over a page stays on one page with smaller type',smal.n===1&&smal.tight>6&&/Fits US Letter/.test(smal.note),JSON.stringify(smal).slice(0,300));
ok('it says the type was set smaller so every word fits',/smaller so every word fits/.test(smal.log),smal.log.slice(0,300));
const words2=await p.evaluate(()=>{const m=__T.mat();const pc=__T.ELIB.find(e=>(m.rebuiltFrom||{}).id===e.id);const t=JSON.stringify(m.modules).toLowerCase();const src=[pc.challenge,pc.solution,pc.results].flat().filter(Boolean).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>3);return src.filter(w=>t.indexOf(w)<0).length});
ok('nothing of it is cut',words2===0,words2);
const multiId=await p.evaluate(()=>{const x=__T.ELIB.find(e=>__T.pieceIsMulti(e));return x&&x.id});
const multi=await rebuild(multiId);
ok('a piece made as multi-page is never condensed to one page (its type is never set smaller; with room it may be set larger)',multi.n>=2&&multi.tight<=0&&!/Condensed to fit one page/.test(multi.log)&&/Fits US Letter|each fits/.test(multi.note),JSON.stringify(multi).slice(0,200));
await p.screenshot({path:__dirname+'/../journey/pages-rebuilt.png'});
ok('no page errors',!errs.length,errs.join(' | ').slice(0,400));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
