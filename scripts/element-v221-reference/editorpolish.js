// Editor polish (99m-editor-polish.js): round-2 first-time-user and power-user findings
const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
const AXE=fs.readFileSync(__dirname+'/../node_modules/axe-core/axe.min.js','utf8');
(async()=>{const b=await chromium.launch();const errs=[];
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js','pptxgenjs':L+'pptxgenjs-3.12.0/package/dist/pptxgen.bundle.js','docx@':L+'docx-8.5.0/package/build/index.umd.js'};
const page=async(vp,ctx={})=>{const c=await b.newContext({viewport:vp,...ctx});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])})});
 await p.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
 await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);return p};
const newMat=async(p)=>{await p.click('button:has-text("New project") >> nth=0');await p.waitForTimeout(400);await p.fill('#np-name','Polish test');await p.click('button:has-text("Create project")');await p.waitForTimeout(900);await p.click('text=Create and open');await p.waitForSelector('.page .mod',{timeout:15000});await p.waitForTimeout(1000)};
let p=await page({width:1440,height:900});await newMat(p);

// ---------- 1. the editor bar's language menu asks before relabelling the page ----------
ok('the language menu is labelled Original language',/Original language/.test(await p.getAttribute('#ed-lang-face','aria-label'))&&/Original language/.test(await p.textContent('.edlang')));
await p.click('#ed-lang-face');await p.waitForTimeout(250);
ok('it offers Make a language version… at the top',/Make a language version/.test(await p.textContent('.csel-pop [role=option] >> nth=0')));
await p.click('.csel-pop [role=option]:has-text("German")');await p.waitForTimeout(400);
ok('picking German doesn\'t relabel the page at once',await p.evaluate(()=>(__T.mat().lang||'en')==='en')&&/English/.test(await p.textContent('#ed-lang-face')));
const conf=await p.textContent('.modal').catch(()=>'');
ok('a confirm step says nothing is translated and offers a German version',/doesn't translate anything/.test(conf)&&/Make a German version/.test(conf),conf.slice(0,120));
await p.click('#lang-make-ver');await p.waitForTimeout(500);
ok('Make a German version opens Languages with German picked',await p.evaluate(()=>!!document.querySelector('.modal .pick[lang="de"][aria-pressed="true"]')));
await p.click('.modal .mact .btn.primary');await p.waitForTimeout(1800);
ok('…and one click creates it',await p.evaluate(()=>__T.S().mats.some(m=>m.lang==='de'&&m.source)));
await p.click('#ed-lang-face');await p.waitForTimeout(250);await p.click('.csel-pop [role=option]:has-text("French")');await p.waitForTimeout(300);await p.click('#lang-set');await p.waitForTimeout(500);
ok('confirming sets the language',await p.evaluate(()=>__T.mat().lang==='fr'));
await p.click('#ed-lang-face');await p.waitForTimeout(250);await p.click('.csel-pop [role=option]:has-text("English") >> nth=0');await p.waitForTimeout(300);await p.click('#lang-set');await p.waitForTimeout(500);

// ---------- 2. Languages dialog ----------
await p.click('#lang-btn');await p.waitForTimeout(500);
ok('Create versions is disabled until a language is picked, and says why',await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal .mact .btn.primary')].find(x=>/Create/.test(x.textContent));return b.disabled&&!document.getElementById('lv-why').hidden}));
ok('chips show the native and the English name',(await p.textContent('.modal .pick[lang="fi"]')).replace(/\s+/g,'')==='SuomiFinnish'&&await p.evaluate(()=>getComputedStyle(document.querySelector('.modal .pick[lang="fi"] .pick-en'),'::before').content.includes('·')));
await p.click('.modal .pick[lang="fi"]');await p.waitForTimeout(100);await p.click('.modal .mact .btn.primary');await p.waitForTimeout(1500);
ok('one click after picking creates the version',await p.evaluate(()=>__T.S().mats.some(m=>m.lang==='fi'))&&!(await p.$('.modal')));
await p.click('#lang-btn');await p.waitForTimeout(500);
await p.click('.modal .lrow-go >> nth=0',{position:{x:160,y:12}});await p.waitForTimeout(1500);
ok('clicking a row opens that version',await p.evaluate(()=>!!__T.mat().source));
await p.evaluate(()=>{const m=__T.S().mats.find(x=>!x.source&&x.name==='Client case study'||!x.source);__T.go('editor',__T.S().pid,m.id)});await p.waitForTimeout(1500);

// ---------- 5. outlines draw under overlapping modules ----------
ok('module outlines sit beneath modules that overlap them',await p.evaluate(()=>{const m=document.querySelector('#stage .mod');m.classList.add('sel');const z=getComputedStyle(m,'::after').zIndex;m.classList.remove('sel');return z==='auto'}));

// ---------- 17. toolbar and roles ----------
ok('modules are focusable groups, not buttons holding buttons',await p.evaluate(()=>{const m=[...document.querySelectorAll('#stage .mod')];return m.length&&m.every(x=>x.getAttribute('role')==='group')}));
await p.click('#stage .mod >> nth=2');await p.waitForTimeout(500);
const tbo=await p.evaluate(()=>{const t=document.getElementById('ctb').getBoundingClientRect();const sel=document.querySelector('#stage .mod.sel');const hit=[...document.querySelectorAll('#stage .mod')].filter(m=>m!==sel).some(m=>[...m.children].some(c=>{if(c.classList.contains('modtag'))return false;const r=c.getBoundingClientRect();return r.height&&r.left<t.right-1&&t.left<r.right-1&&r.top<t.bottom-1&&t.top<r.bottom-1}));return {hit,pe:getComputedStyle(document.getElementById('ctb')).pointerEvents}});
ok('the toolbar of a module mid-page doesn\'t cover the module above it',!tbo.hit&&tbo.pe==='none',JSON.stringify(tbo));
await p.addScriptTag({content:AXE});
const nest=await p.evaluate(async()=>{const r=await axe.run(document.querySelector('#stage'),{runOnly:['nested-interactive']});return r.violations.map(v=>v.nodes.length)});
ok('no nested-interactive violations on the selected page',!nest.length,JSON.stringify(nest));
await p.click('#stage .mod >> nth=0',{position:{x:700,y:20}});await p.waitForTimeout(500);
const grip=await p.evaluate(()=>{const i=document.querySelector('#stage .hero-grip i');if(!i)return null;const r=i.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {top:!!e.closest('.hero-grip'),op:getComputedStyle(i).opacity}});
ok('the hero height handle is on top of the cards and fully opaque',grip&&grip.top&&grip.op==='1',JSON.stringify(grip));

// ---------- 7. undo goes a word at a time ----------
const ta=p.locator('#rpane textarea[id$="-title"]').first();await ta.click();await ta.press('End');
const orig=await p.evaluate(()=>__T.mat().modules[0].data.title);
await p.keyboard.type(' extra words typed here',{delay:25});await p.waitForTimeout(300);
let u=0;for(;u<30;u++){if(await p.evaluate(o=>__T.mat().modules[0].data.title===o,orig))break;await p.keyboard.press('Control+z');await p.waitForTimeout(120)}
ok('Ctrl+Z in a field undoes a word at a time (4 words, not 23 characters)',u>=2&&u<=5,u+' presses');
ok('the field keeps focus through undo',await p.evaluate(()=>/-title$/.test(document.activeElement.id)));
await p.keyboard.press('Control+Shift+z');await p.waitForTimeout(200);
ok('Ctrl+Shift+Z redoes the word',await p.evaluate(o=>__T.mat().modules[0].data.title===o+' extra ',orig),await p.evaluate(()=>__T.mat().modules[0].data.title.slice(-20)));
await p.keyboard.press('Control+z');await p.waitForTimeout(200);

// ---------- 14. headline length and emptiness ----------
await ta.fill('AAAAAAAAAA Very long headline that goes on and on about mRNA vaccine localization across twenty four European markets');await p.waitForTimeout(700);
ok('the counter says how far over it is, in red',await p.evaluate(()=>{const c=document.querySelector('label[for$="-title"] .cnt');return /117\/70, over by 47/.test(c.textContent)&&c.classList.contains('over')}));
ok('preflight names the long headline',await p.evaluate(()=>__T.preflight(__T.mat()).list.some(x=>/hero headline is 117 characters, 47 over/.test(x[1]))));
await ta.fill('');await p.waitForTimeout(800);
ok('an empty headline shows "Add a headline" on the page while editing',await p.evaluate(()=>{const h=document.querySelector('#stage h1');return h.classList.contains('ph-empty')&&getComputedStyle(h,'::before').content.includes('Add a headline')}));
ok('preflight flags it as a must-fix, once',await p.evaluate(()=>{const l=__T.preflight(__T.mat()).list;return l.filter(x=>/no headline/.test(x[1])&&x[0]==='bad').length===1&&!l.some(x=>/^1 empty text field in Hero$/.test(x[1]))}));
await p.click('.rtabs button >> nth=2');await p.waitForTimeout(500);await p.click('#rpane .check button:has-text("Fix")');await p.waitForTimeout(500);
ok('its Fix puts you in the headline field',await p.evaluate(()=>/-title$/.test(document.activeElement.id)));
await p.keyboard.type('Back to a headline');await p.waitForTimeout(800);


// ---------- 8. photo upload progress ----------
await p.click('.rtabs button >> nth=0');await p.click('#stage .mod >> nth=0',{position:{x:700,y:20}});await p.waitForTimeout(400);
await p.evaluate(()=>{const S=__T.S();const h=S.mat.modules[0];h.data.layout='right';__T.redraw()});await p.waitForTimeout(400);
await p.evaluate(()=>{window.__busySeen=[];new MutationObserver(()=>{const n=[...document.querySelectorAll('.ph-busy')].map(x=>x.closest('#rpane')?'panel':'page');if(n.length)window.__busySeen.push(n.join(','))}).observe(document.body,{childList:true,subtree:true})});
const fc=p.waitForEvent('filechooser');await p.click('#rpane .ip-prev');await (await fc).setFiles(__dirname+'/bigphoto.jpg');
await p.waitForFunction(()=>{const ph=__T.mat().modules[0].data.photo;return ph&&(ph.id||ph.data||ph.src)},null,{timeout:30000});await p.waitForTimeout(900);
const busy=await p.evaluate(()=>window.__busySeen.join('|'));
ok('while a photo uploads, the hero and the panel both show progress',/page/.test(busy)&&/panel/.test(busy),busy.slice(0,60));
ok('the progress goes when the upload is done',!(await p.$('.ph-busy')));
ok('after the upload the focal-point preview is in view',await p.evaluate(()=>{const v=document.querySelector('#rpane .ip-prev:not(.empty)');if(!v)return false;const r=v.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}));

// ---------- 9. Fit fits social frames; the control is compact ----------
for(const s of ['Square','Story']){await p.locator('.fmtbar button',{has:p.locator(`.fmt-s:text-is("${s}")`)}).click();await p.waitForTimeout(900);
 const r=await p.evaluate(()=>{const st=document.getElementById('stage').getBoundingClientRect();const w=document.querySelector('#stage .canvasWrap').getBoundingClientRect();return [Math.round(w.bottom),Math.round(st.bottom)]});
 ok('Fit shows the whole '+s+' frame in the stage at 1440×900',r[0]<=r[1],r.join(' ≤ '));}
const seg=await p.evaluate(()=>{const s=document.querySelector('.fmtbar .seg');const bs=[...s.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height);return {h:Math.round(s.getBoundingClientRect().height),bs}});
ok('Fit / 100% is a compact switch, not a stretched box',seg.h<=32&&seg.bs.every(x=>x<=30),JSON.stringify(seg));
await p.locator('.fmtbar button',{has:p.locator('.fmt-s:text-is("Letter")')}).click();await p.waitForTimeout(700);

// ---------- 4. size bar keyboard ----------
const tabs=await p.evaluate(()=>[...document.querySelectorAll('.fmt-scroll button')].filter(b=>b.tabIndex===0).length);
ok('the size bar is one Tab stop',tabs===1,tabs);
await p.focus('.fmt-scroll button[tabindex="0"]');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');
ok('arrow keys move between sizes',await p.evaluate(()=>{const a=document.activeElement;return a.closest('.fmt-scroll')&&/Slide/.test(a.textContent)}),await p.evaluate(()=>document.activeElement.textContent));

// ---------- 6. print checklist ----------
await p.evaluate(()=>{window.__printed=0;window.print=()=>{window.__printed++}});
await p.click('button[aria-haspopup="menu"]:has-text("Export")');await p.waitForTimeout(300);await p.click('.pop[role=menu] >> text=as vector PDF');await p.waitForTimeout(600);
if(await p.isVisible('.modal button:has-text("Export anyway")').catch(()=>false)){await p.click('.modal button:has-text("Export anyway")');await p.waitForTimeout(600)}
const pc=await p.textContent('.modal').catch(()=>'');
ok('vector PDF shows the print checklist first',/Save as PDF/.test(pc)&&/Margins/.test(pc)&&/None/.test(pc)&&/Background graphics/.test(pc)&&/100%/.test(pc)&&await p.evaluate(()=>window.__printed===0),pc.slice(0,100));
await p.click('.modal >> text=Cancel');await p.waitForTimeout(400);
ok('Cancel prints nothing and cleans up',await p.evaluate(()=>window.__printed===0&&!document.getElementById('print-host')));
await p.click('button[aria-haspopup="menu"]:has-text("Export")');await p.waitForTimeout(300);await p.click('.pop[role=menu] >> text=for a print shop');await p.waitForTimeout(600);
if(await p.isVisible('.modal button:has-text("Export anyway")').catch(()=>false)){await p.click('.modal button:has-text("Export anyway")');await p.waitForTimeout(600)}
await p.check('#pc-skip');await p.click('#pc-print');await p.waitForTimeout(500);
ok('Print goes on to the print dialog',await p.evaluate(()=>window.__printed===1));
await p.evaluate(()=>{const h=document.getElementById('print-host');if(h)h.remove();const c=document.getElementById('print-css');if(c)c.remove()});
await p.click('button[aria-haspopup="menu"]:has-text("Export")');await p.waitForTimeout(300);await p.click('.pop[role=menu] >> text=as vector PDF');await p.waitForTimeout(600);
if(await p.isVisible('.modal button:has-text("Export anyway")').catch(()=>false)){await p.click('.modal button:has-text("Export anyway")');await p.waitForTimeout(600)}
ok('"Don\'t show again" skips the checklist next time',await p.evaluate(()=>window.__printed===2&&!document.getElementById('pc-print')));

// ---------- 15. translation import report ----------
await p.evaluate(()=>{const m=__T.S().mats.find(x=>x.lang==='de');__T.go('editor',__T.S().pid,m.id)});await p.waitForTimeout(1500);
const hid=await p.evaluate(()=>__T.mat().modules[0].id);
const xlf='<?xml version="1.0" encoding="UTF-8"?><xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2"><file original="x" source-language="en" target-language="de" datatype="plaintext"><body>'+
 '<trans-unit id="'+hid+'|title" resname="title"><source>A</source><target>Ein Titel</target></trans-unit>'+
 '<trans-unit id="bogus|title" resname="title"><source>B</source><target>Noch einer</target></trans-unit></body></file></xliff>';
fs.writeFileSync(__dirname+'/tmp-polish.xlf',xlf);
await p.click('button[aria-haspopup="menu"]:has-text("Export")');const [fch]=await Promise.all([p.waitForEvent('filechooser'),p.click('.pop >> text=Import translation (XLIFF)')]);await fch.setFiles(__dirname+'/tmp-polish.xlf');await p.waitForTimeout(1500);
const rep=await p.textContent('#l10n-report').catch(()=>'');fs.unlinkSync(__dirname+'/tmp-polish.xlf');
ok('the import report counts fields, not units',/1 field imported, 1 skipped/.test(rep),rep.slice(0,80));
ok('a skipped field the page no longer has is named plainly, never by its raw id',/A field that's no longer on this page/.test(rep)&&!/bogus/.test(rep),rep.slice(0,300));
if(await p.$('.modal'))await p.click('.modal >> text=Done');await p.waitForTimeout(300);

// ---------- 12. Help search ----------
await p.click('.nav-help');await p.waitForTimeout(600);
await p.fill('#hp-q','how do i change the logo');await p.waitForTimeout(300);
const hg=await p.$$eval('.hp-guide h2',x=>x.map(e=>e.textContent));
ok('a plain question finds guides (logo ~ brand, plurals)',hg.length>0&&/logo|brand/i.test(hg[0]),hg.slice(0,3).join(' | '));
await p.fill('#hp-q','pictures');await p.waitForTimeout(300);ok('synonyms: pictures finds the photo guide',(await p.$$eval('.hp-guide h2',x=>x.map(e=>e.textContent))).some(t=>/photo/i.test(t)));
await p.click('#hp-tab-faq');await p.fill('#hp-q','qqzz logo approval');await p.waitForTimeout(300);
ok('no exact match shows the closest topics',/No exact match/.test(await p.textContent('.hp-panel'))&&(await p.$$('.hp-faq')).length>0);
ok('the build number is out of the Help header (kept in a tooltip)',!/build \d{8}/i.test(await p.textContent('.hp-head'))&&/Build \d{8}/.test(await p.getAttribute('.hp-head .sub','title')));
await p.fill('#hp-q','');

// ---------- 13. one module count ----------
await p.click('#appnav button:has-text("Modules")');await p.waitForTimeout(800);const mx=(await p.textContent('.sub')).match(/(\d+) modules/)[1];
await p.evaluate(()=>__T.go('about'));await p.waitForTimeout(800);const gs=((await p.textContent('#view')).match(/(\d+) modules/)||[])[1];
ok('Modules page and Get started give the same module count',mx===gs,mx+' vs '+gs);

// ---------- 11. Library ----------
await p.click('#appnav button:has-text("Library")');await p.waitForTimeout(900);
const ln=await p.textContent('.el-n');
ok('the library line separates originals, ELEMENT-made and rebuilt',/299 pieces: \d+ originals and \d+ made in ELEMENT\. None rebuilt as a material yet\./.test(ln),ln);
const pc0=await p.evaluate(()=>{const x=__T.ELIB.find(e=>e.yearSource==='Dropbox folder year'&&e.title&&e.client&&e.title.length>12);return x&&{id:x.id,t:x.title}});const pid=pc0.id;
await p.fill('#el-q',pc0.t);await p.waitForTimeout(500);await p.click('.el-card[data-id="'+pid+'"] >> nth=0').catch(()=>p.click('.el-card >> nth=0'));await p.waitForTimeout(500);
const yr=await p.textContent('#el-detail .el-yr').catch(()=>'');ok('the year says where it came from in plain words',/^Year \d{4}, taken from the year of the folder it was filed in\.$/.test(yr),yr);
await p.click('#el-rebuild');await p.waitForTimeout(300);
ok('Rebuild defaults to the project you were in',(await p.$eval('#rb-proj',e=>e.selectedOptions[0].textContent)).startsWith('Polish test'));
await p.selectOption('#rb-proj','__new');await p.click('#rb-go');await p.waitForTimeout(2500);
const np=await p.evaluate(id=>{const S=__T.S();const pr=S.projects.find(x=>x.id===S.pid);return [pr.name,__T.ELIB.find(e=>e.id===id).title]},pid);
ok('a new project is named after the piece, not its client line',np[0]===np[1],np.join(' / '));
await p.context().close();

// ---------- 4. 1280×720: one row, size bar scrolls, trail shortened ----------
p=await page({width:1280,height:720});await newMat(p);
const row=await p.evaluate(()=>{const kids=[...document.querySelectorAll('#edbar > *')].filter(e=>e.offsetWidth);const tops=kids.map(e=>{const r=e.getBoundingClientRect();return Math.round((r.top+r.bottom)/2/12)});const bar=document.getElementById('edbar').getBoundingClientRect();return {rows:new Set(tops).size,right:Math.max(...kids.map(e=>e.getBoundingClientRect().right)),w:bar.right}});
ok('at 1280×720 the editor bar holds one row, nothing cut off',row.rows===1&&row.right<=row.w,JSON.stringify(row));
const sb=await p.evaluate(()=>{const s=document.querySelector('.fmtbar .seg').getBoundingClientRect(),st=document.getElementById('stage').getBoundingClientRect(),sc=document.querySelector('.fmt-scroll');return {segIn:s.right<=st.right&&s.left>=st.left,scrolls:sc.scrollWidth>sc.clientWidth}});
ok('the size bar scrolls sideways and keeps Fit / 100% in view',sb.segIn&&sb.scrolls,JSON.stringify(sb));
const cr=await p.evaluate(()=>[...document.querySelectorAll('#crumbs li')].filter(l=>l.offsetWidth).map(l=>l.textContent.trim()));
const ov=await p.evaluate(()=>{const b=document.getElementById('bcbar');return b&&b.scrollWidth<=b.clientWidth+1});
ok('below 1400 px the trail, now in its own bar, shows every step and fits',cr.length>=4&&cr[0]==='Projects'&&ov,cr.join(' › '));
ok('the save state is short, the full text in its tooltip',await p.evaluate(()=>{const s=document.getElementById('savedLbl');return /^(Saved|Saving…)$/.test(s.getAttribute('data-short'))&&s.title===s.textContent.trim()}));
await p.context().close();

// ---------- 3. phone: dialogs fit, toasts clear, editing keeps a preview ----------
p=await page({width:390,height:844},{isMobile:true,hasTouch:true,deviceScaleFactor:2});
await p.click('button:has-text("New project") >> nth=0');await p.waitForTimeout(400);await p.fill('#np-name','Phone');await p.click('button:has-text("Create project")');await p.waitForTimeout(1000);
const dl=await p.evaluate(()=>{const m=document.querySelector('.modal').getBoundingClientRect(),s=document.getElementById('scrim');const t=document.getElementById('toast').getBoundingClientRect();const go=[...document.querySelectorAll('.modal .mact .btn')].map(b=>b.getBoundingClientRect());return {l:m.left,r:m.right,sw:s.scrollWidth,toastOver:document.getElementById('toast').textContent?go.some(g=>g.left<t.right&&t.left<g.right&&g.top<t.bottom&&t.top<g.bottom):false}});
ok('the New material dialog fits a 390 px phone with side padding',dl.l>=8&&dl.r<=382&&dl.sw<=390,JSON.stringify(dl));
ok('the toast doesn\'t cover the dialog buttons',!dl.toastOver);
await p.click('text=Create and open');await p.waitForTimeout(2500);
const hb=await p.locator('.page .mod').first().boundingBox();await p.touchscreen.tap(hb.x+hb.width/2,hb.y+30);await p.waitForTimeout(600);await p.touchscreen.tap(hb.x+hb.width/2,hb.y+30);await p.waitForTimeout(600);
const pta=p.locator('#rpane textarea[id$="-title"]').first();await pta.tap();await p.waitForTimeout(400);await pta.press('End');await p.keyboard.type(' now',{delay:20});await p.waitForTimeout(900);
const pk=await p.evaluate(()=>{const k=document.getElementById('ph-peek');if(!k)return null;const r=k.getBoundingClientRect();return {h:r.height,txt:k.querySelector('.pk-view').textContent.includes(' now'),btn:!!k.querySelector('button')}});
ok('editing on a phone keeps a live preview of the module in view',pk&&pk.h>60&&pk.txt&&pk.btn,JSON.stringify(pk));
await p.click('#ph-peek button');await p.waitForTimeout(600);
ok('Show page goes back to the page',!(await p.$('#ph-peek'))&&await p.evaluate(()=>{const r=document.querySelector('#stage .mod.sel').getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}));
ok('no sideways scroll on the phone',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await p.context().close();
// ---------- 16. Request changes without a note says why ----------
p=await page({width:1440,height:900});await p.click('text=Open the example project');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);await p.click('.rtabs button >> nth=2');await p.waitForTimeout(500);
const rc=p.locator('#rpane button:text-is("Request changes")');
if(await rc.count()){await rc.click();await p.waitForTimeout(300);
 ok('Request changes with an empty note says why by the note box',/Add a note so the author knows what to change/.test(await p.textContent('#rv-note-err').catch(()=>''))&&await p.getAttribute('#rv-note','aria-invalid')==='true');
 await p.fill('#rv-note','Shorten the intro');await p.waitForTimeout(200);ok('…and the message goes once a note is typed',!(await p.$('#rv-note-err')));
} else ok('Request changes is offered on a material in review',false,'no button');
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
