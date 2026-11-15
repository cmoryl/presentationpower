const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
// every piece converts and renders
const conv=await p.evaluate(()=>{const bad=[];__T.ELIB.forEach(x=>{try{const mods=__T.pieceToModules(x);const h=__T.pageHTML(mods,{w:816,h:1056,print:true},false,null);if(!h||mods.length<3)bad.push(x.id+':short')}catch(e){bad.push(x.id+':'+e.message)}});return [__T.ELIB.length,bad]});
ok('all '+conv[0]+' earlier pieces convert to modules and render',!conv[1].length,conv[1].slice(0,5).join(' | '));
await p.click('.nav-lib');await p.waitForTimeout(900);
ok('Library opens from the header',await p.isVisible('h1:text-is("Division library")'));
const folders=await p.$$eval('.el-folder',x=>x.map(e=>e.querySelector('.el-fn').textContent+' '+e.querySelector('b').textContent));
ok('a folder per brand, with counts',folders.length>=10&&/All brands 299/.test(folders[0]),folders.join(' | '));
await p.click('.el-folder:has-text("TransPerfect Legal")');await p.waitForTimeout(500);
const legal=await p.$$eval('.el-card',x=>x.length);ok('a brand folder shows only its pieces',legal===52,legal);
// each card's picture is the piece's own first page, drawn as the card comes into view (v204): no photo stands in
await p.waitForTimeout(2200);
const pics=await p.evaluate(()=>{const cards=[...document.querySelectorAll('.el-card')];const vis=cards.filter(c=>{const r=c.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0});
 return {n:cards.length,vis:vis.length,drawn:vis.filter(c=>c.querySelector('.lp-thumb')).length,photo:cards.filter(c=>{const e=c.querySelector('.el-pic');return e&&/url\(/.test(getComputedStyle(e).backgroundImage)}).length,
  room:cards.filter(c=>{const e=c.querySelector('.el-pic');return e&&e.getBoundingClientRect().height>40}).length}});
ok('the cards on the screen draw their own first page',pics.vis>0&&pics.drawn===pics.vis,JSON.stringify(pics));
ok('no card stands the original photo in while it waits',pics.photo===0,JSON.stringify(pics));
ok('every card keeps the room its picture needs',pics.n>0&&pics.room===pics.n,JSON.stringify(pics));
await p.fill('#el-q','eDiscovery');await p.waitForTimeout(400);
const found=await p.$$eval('.el-card',x=>x.length);ok('search narrows the folder',found>0&&found<50,found);
await p.screenshot({path:__dirname+'/../journey/library.png'});
// open a case study with stats and a quote
const pick=await p.evaluate(()=>{const x=__T.ELIB.find(e=>e.brand==='bm-tp-legal'&&e.kind==='case-study'&&e.heroFile&&(e.stats||[]).length>=2&&e.title);return x&&x.id});
await p.fill('#el-q','');await p.waitForTimeout(300);
await p.click('.el-folder:has-text("TransPerfect Legal")');await p.waitForTimeout(400);
const piece=await p.evaluate(id=>__T.ELIB.find(e=>e.id===id),pick);
await p.click('.el-card:has-text("'+piece.title.slice(0,30).replace(/"/g,'\\"')+'")');await p.waitForTimeout(600);
ok('opening a piece shows what it said',await p.isVisible('#el-detail')&&(await p.textContent('#el-detail')).includes(piece.stats[0].value),piece.title);
await p.screenshot({path:__dirname+'/../journey/library-detail.png'});
await p.click('#el-rebuild');await p.waitForTimeout(400);
ok('rebuild offers a new project for the brand',(await p.$eval('#rb-proj',e=>e.selectedOptions[0].textContent)).includes('TransPerfect Legal'));
await p.click('#rb-go');await p.waitForTimeout(2500);
const m=await p.evaluate(()=>{const m=__T.mat();const pg=document.querySelector('#stage .page');const hero=m.modules.find(x=>x.type==='hero');return {brand:pg&&pg.getAttribute('data-brand'),title:hero.data.title,photo:hero.data.photo,text:pg.textContent,from:m.rebuiltFrom}});
ok('rebuilding opens a new Legal material',m.brand==='bm-tp-legal'&&m.from&&m.from.id===piece.id,JSON.stringify({b:m.brand,f:m.from}));
ok('the title is carried over word for word',m.title===piece.title);
ok('the figures are carried over, with their units',piece.stats.slice(0,3).every(s=>m.text.includes(String(s.value)+(s.unit&&String(s.value).indexOf(s.unit)<0?s.unit:''))),piece.stats.map(s=>s.value+(s.unit||'')).join(','));
const heroOk=await p.evaluate(()=>document.querySelector('#stage .page').innerHTML.includes('element-library/img/'));
ok('the hero photo comes across',heroOk===true,String(heroOk));
await p.screenshot({path:__dirname+'/../journey/library-rebuilt.png'});
await p.click('.nav-lib');await p.waitForTimeout(400);await p.click('.el-folder >> nth=0');await p.waitForTimeout(300);const kt=await p.evaluate(()=>__T.ELIB.find(x=>x.structured==='from-text').title);await p.click('.el-card[aria-label$="'+kt.replace(/"/g,'\\"')+'"] >> nth=0');await p.waitForTimeout(400);
const note=await p.evaluate(()=>{const d=document.querySelector('#el-detail');return d?(d.querySelector('.el-src')||{}).textContent||'none':'no detail'});
ok('pieces pieced together from PDF text say so',/PDF's text/.test(note),note);
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
