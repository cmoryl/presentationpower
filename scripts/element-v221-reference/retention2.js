// Retention round 2: links and notifying, duplicate, For you (approved, team, new, who), live overdue and the
// table's Monday view, coming back after a gap, the finish panel, tab titles, Download all choices, bulk undo.
const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+String(d).slice(0,300):''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e.stack||e).slice(0,900));process.exit(1)});
const L=__dirname+'/../libs/';const LIBS={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js','pptxgenjs':L+'pptxgenjs-3.12.0/package/dist/pptxgen.bundle.js','docx@':L+'docx-8.5.0/package/build/index.umd.js'};
const url='file://'+__dirname+'/test.html';const SH=__dirname+'/../r2tmp/';fs.mkdirSync(SH,{recursive:true});
const DANA='u_test000000000000000002';
async function prep(p,errs){p.on('pageerror',e=>errs.push(e.message));
 await p.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(LIBS).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(LIBS[k])})});
 await p.addInitScript(()=>{window.__clip=[];try{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.__clip.push(t);return Promise.resolve()}}})}catch(e){}})}
// a second project with work from Dana, and a summary written before a due date passed
const seed=p=>p.evaluate(async DANA=>{const T=__T,S=T.S(),ME=T.ME().id;const now=Date.now(),day=864e5;const ex=S.mats.find(m=>/case study/.test(m.name))||S.mats[0];const d=n=>new Date(now+n*day).toISOString().slice(0,10);
 const pid='q4'+Math.random().toString(36).slice(2,8);
 const mk=(name,o)=>Object.assign(JSON.parse(JSON.stringify(ex)),{id:'m'+Math.random().toString(36).slice(2,10),name,createdBy:ME,assigneeId:ME,status:'draft',review:{},exported:{},due:d(20),statusAt:now-day,createdAt:now-10*day,updatedAt:now-day},o);
 const ms=[mk('Novagen brief 4',{status:'review',assigneeId:DANA,createdBy:DANA,review:{a:{kind:'status',to:'review',by:DANA,at:now-2*3600e3}},statusAt:now-2*3600e3}),
  mk('Novagen brief 14',{status:'approved',review:{a:{kind:'status',to:'approved',by:DANA,at:now-3600e3}},statusAt:now-3600e3}),
  mk('Novagen case study',{status:'draft',assigneeId:DANA,due:d(-3),statusAt:now-9*day}),
  mk('Novagen brief 2',{status:'changes',review:{a:{kind:'status',to:'changes',by:DANA,at:now-5*3600e3}},statusAt:now-5*3600e3})];
 const pr={id:pid,name:'Q4 Life Sciences campaign',client:'Novagen Bio',brand:S.projects[0].brand,ownerId:ME,reviewers:[],kit:['letter'],due:d(10),createdAt:now-12*day,updatedAt:now,
  activity:[{t:now-3600e3,by:DANA,text:'moved “Novagen brief 14” to Approved'},{t:now-1800e3,by:DANA,text:'left a note on “Novagen brief 4”'},{t:now-1700e3,by:DANA,text:'left a note on “Novagen brief 2”'},{t:now-1600e3,by:ME,text:'moved “Mine” to Delivered'}]};
 await T.Store.setProject(pr);for(const m of ms)await T.Store.setMaterial(pid,m);
 const sm=T.normSummary(T.summarize(ms));sm.overdue=0;await T.Store.patchProject(pid,{summary:sm});
 return {pid,mids:ms.map(m=>m.id),names:ms.map(m=>m.name)}},DANA);
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const errs=[];
const p=await ctx.newPage();await prep(p,errs);
await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
const ex=await p.evaluate(()=>({pid:__T.S().pid,mats:__T.S().mats.map(m=>({id:m.id,name:m.name,status:m.status}))}));
const sd=await seed(p);await p.waitForTimeout(600);
/* ---------- 7. tab titles; 1. addresses ---------- */
ok('the tab title names the project',/^(\(\d+\) )?Example: Fernwood & Vale spring launch · ELEMENT$/.test(await p.title()),await p.title());
ok('a project has an address',await p.evaluate(pid=>location.hash==='#p='+pid,ex.pid),await p.evaluate(()=>location.hash));
const cs=ex.mats.find(m=>/case study/.test(m.name));
await p.click('.mcard:has-text("'+cs.name+'")');await p.waitForTimeout(1500);
ok('a material has an address: #m=<project>/<material>',await p.evaluate(()=>location.hash)==='#m='+ex.pid+'/'+cs.id,await p.evaluate(()=>location.hash));
ok('the tab title names the material, keeping the For you count',/^\(\d+\) Fernwood & Vale case study · ELEMENT$/.test(await p.title()),await p.title());
const hlen=await p.evaluate(()=>history.length);
await p.goBack();await p.waitForTimeout(1200);
ok('Back still returns to the board, and the address follows',await p.evaluate(()=>__T.S().view)==='project'&&await p.evaluate(()=>location.hash)==='#p='+ex.pid,await p.evaluate(()=>location.hash));
await p.goForward();await p.waitForTimeout(1200);ok('Forward reopens the material',await p.evaluate(()=>[__T.S().view,__T.S().mid].join())==='editor,'+cs.id);
await p.evaluate(()=>__T.go('library',null,null));await p.waitForTimeout(600);ok('other views: “Library · ELEMENT”, no material address',/Library · ELEMENT$/.test(await p.title())&&!(await p.evaluate(()=>location.hash)),await p.title());
await p.evaluate(()=>__T.go('about',null,null));await p.waitForTimeout(600);ok('Get started has its title',/Get started · ELEMENT$/.test(await p.title()),await p.title());
// the address changing opens what it names
await p.evaluate(s=>{location.hash='#m='+s.pid+'/'+s.mids[1]},sd);await p.waitForTimeout(1500);
ok('changing the address opens that material',await p.evaluate(()=>[__T.S().view,__T.S().mat&&__T.S().mat.name].join())==='editor,Novagen brief 14',await p.evaluate(()=>[__T.S().view,__T.S().mat&&__T.S().mat.name].join()));
// a link opened in a new tab (new session) goes straight there, and other parameters survive
const p2=await ctx.newPage();await prep(p2,errs);await p2.goto(url+'#nosample&m='+ex.pid+'/'+cs.id);await p2.waitForTimeout(2500);
ok('opening a link goes straight to the material',await p2.evaluate(()=>[__T.S().view,__T.S().mid].join())==='editor,'+cs.id,await p2.evaluate(()=>[__T.S().view,__T.S().mid].join()));
ok('other address parameters are kept',await p2.evaluate(()=>location.hash)==='#nosample&m='+ex.pid+'/'+cs.id,await p2.evaluate(()=>location.hash));
await p2.close();
/* ---------- Copy link, Open a link ---------- */
await p.evaluate(s=>__T.go('editor',s.pid,s.mids[0]),{pid:ex.pid,mids:[cs.id]});await p.waitForTimeout(1500);
await p.click('#u2-ed-more');await p.waitForTimeout(200);ok('the editor has a More menu with Copy link and Duplicate',await p.isVisible('#u2-ed-link')&&await p.isVisible('#u2-ed-dup'));
await p.screenshot({path:SH+'r2-ed-more.png'});
await p.click('#u2-ed-link');await p.waitForTimeout(400);
const clip=await p.evaluate(()=>window.__clip.slice(-1)[0]||'');
ok('Copy link copies the ELEMENT link with the material and project names',clip.includes('https://claude.ai/artifact/7WXARzAhxXMfoJppmzkDSs#m='+ex.pid+'/'+cs.id)&&clip.includes('“Fernwood & Vale case study” in Example: Fernwood & Vale spring launch')&&/Open a link/.test(clip),clip);
ok('the message says what was copied',/Copied a link to “Fernwood & Vale case study”/.test(await p.textContent('#toast')),await p.textContent('#toast'));
await p.evaluate(()=>__T.go('about',null,null));await p.waitForTimeout(800);
await p.click('#u2-open-link');await p.waitForTimeout(300);await p.fill('#u2-paste','hello, see this');await p.click('#u2-paste-go');await p.waitForTimeout(200);
ok('Open a link says when it finds nothing',/couldn't find a material/.test(await p.textContent('#u2-paste-err')),await p.textContent('#u2-paste-err'));
await p.waitForTimeout(900);await p.fill('#u2-paste',clip);await p.click('#u2-paste-go');await p.waitForTimeout(1500);
ok('Open a link opens the pasted link',await p.evaluate(()=>[__T.S().view,__T.S().mid].join())==='editor,'+cs.id);
await p.evaluate(()=>__T.go('about',null,null));await p.waitForTimeout(600);await p.click('#u2-open-link');await p.waitForTimeout(200);
await p.fill('#u2-paste','Can you look at “Novagen brief 2” in Q4 Life Sciences campaign? The link didn’t work.');await p.click('#u2-paste-go');await p.waitForTimeout(1500);
ok('… or finds the material by the name and project in the message',await p.evaluate(()=>__T.S().mat&&__T.S().mat.name)==='Novagen brief 2',await p.evaluate(()=>__T.S().mat&&__T.S().mat.name));
/* ---------- 9 + 1: submit dialog names the reviewer, and offers Notify by email ---------- */
const brief=ex.mats.find(m=>m.status==='draft');
await p.evaluate(pid=>__T.Store.patchProject(pid,{reviewers:['u_test000000000000000002']}),ex.pid);await p.waitForTimeout(400);
await p.evaluate(()=>{const P=__T.U2().profiles();delete P['u_test000000000000000002']});
await p.evaluate(s=>__T.go('editor',s.pid,s.id),{pid:ex.pid,id:brief.id});await p.waitForTimeout(1500);
await p.evaluate(()=>{const P=__T.U2().profiles();delete P['u_test000000000000000002']});
await p.click('.rtabs button >> nth=2');await p.waitForTimeout(300);await p.fill('#rv-note','Ready for legal too.');
await p.click('.edbar button:has-text("Submit for review")');await p.waitForTimeout(900);
const md=await p.textContent('.modal').catch(()=>'');
ok('the submit dialog names the reviewer (not “Teammate”) once names load',/Reviewers: Dana Reyes/.test(md)&&!/Teammate/.test(md),md.slice(0,160));
ok('it offers Notify by email and Copy link',await p.isVisible('.modal #u2-mail')&&await p.isVisible('.modal .u2-copy'));
await p.evaluate(()=>{__T.U2().profiles()['u_test000000000000000002'].email='dana@example.com'});
await p.hover('.modal #u2-mail');await p.waitForTimeout(100);
const mt=decodeURIComponent(await p.getAttribute('.modal #u2-mail','href'));
ok('the email goes to the reviewer, with subject, note, due date and the link',mt.startsWith('mailto:dana@example.com?subject=Ready for your review: Fernwood & Vale launch brief (Example: Fernwood & Vale spring launch)')&&/Note: Ready for legal too\./.test(mt)&&/Due \w+, \w+ \d+, \d{4}\./.test(mt)&&mt.includes('#m='+ex.pid+'/'+brief.id),mt.slice(0,260));
await p.screenshot({path:SH+'r2-submit.png'});
await p.click('#confirm-stage');await p.waitForTimeout(1500);
ok('submitting from the dialog doesn\'t add a second “tell them” panel',!(await p.$('#u2-panel')));
/* Request changes: no dialog, so a panel says who to tell */
await p.click('.rtabs button >> nth=2').catch(()=>{});await p.waitForTimeout(300);
await p.fill('#rv-note','Shorten the title.');await p.click('.rbody button:has-text("Request changes")');await p.waitForTimeout(1500);
ok('after Request changes a panel offers Notify by email and Copy link',/Changes requested/.test(await p.textContent('#u2-panel').catch(()=>''))&&await p.isVisible('#u2-panel #u2-mail'),await p.textContent('#u2-panel').catch(()=>'none'));
const mt2=decodeURIComponent(await p.getAttribute('#u2-panel #u2-mail','href'));ok('… and its email carries the request',/^mailto:\?subject=Changes requested: /.test(mt2)&&/Note: Shorten the title\./.test(mt2),mt2.slice(0,200));
await p.click('#u2-panel .u2-x');
/* ---------- 2. duplicate ---------- */
const src=await p.evaluate(()=>JSON.parse(JSON.stringify(__T.mat())));
await p.click('#u2-ed-more');await p.click('#u2-ed-dup');await p.waitForTimeout(500);
ok('Duplicate asks for a name and a due date',await p.inputValue('#u2-dup-name')==='Fernwood & Vale launch brief (copy)'&&!!(await p.$('#u2-dup-due')));
await p.evaluate(()=>{const d=document.getElementById('u2-dup-due');d.value='2026-12-01';d.dispatchEvent(new Event('change',{bubbles:true}))});
await p.click('#u2-dup-go');await p.waitForTimeout(1800);
const cp=await p.evaluate(()=>JSON.parse(JSON.stringify(__T.mat())));
ok('the copy opens, named “<name> (copy)”',cp.name==='Fernwood & Vale launch brief (copy)'&&cp.id!==src.id,cp.name);
ok('it keeps the modules, sizes, brand and language',JSON.stringify(cp.modules)===JSON.stringify(src.modules)&&JSON.stringify(cp.formats)===JSON.stringify(src.formats)&&(cp.brand||'')===(src.brand||'')&&(cp.lang||'en')===(src.lang||'en'));
const rl=Object.values(cp.review||{});
ok('it starts again: Draft, no review history, no exports, the new due date',cp.status==='draft'&&rl.length===1&&!Object.keys(cp.exported||{}).length&&cp.due==='2026-12-01',JSON.stringify([cp.status,rl.length,cp.exported,cp.due]));
ok('and no versions',(await p.evaluate(async c=>(await __T.Store.versions(c.pid,c.id)).length,{pid:ex.pid,id:cp.id}))===0);
// board card menu
await p.evaluate(pid=>__T.go('project',pid),ex.pid);await p.waitForTimeout(1200);
await p.click('.mcard:has-text("eBrochure") .u2-cardmenu');await p.waitForTimeout(300);
ok('a board card has a menu: Open, Duplicate, Copy link',await p.isVisible('#u2-cm-open')&&await p.isVisible('#u2-cm-dup')&&await p.isVisible('#u2-cm-link'));
await p.keyboard.press('Escape');await p.waitForTimeout(200);ok('Escape closes it and gives focus back',!(await p.$('.u2-pop'))&&await p.evaluate(()=>document.activeElement.classList.contains('u2-cardmenu')));
ok('the menu button doesn\'t open the card',await p.evaluate(()=>__T.S().view)==='project');
// table: Duplicate to project…
await p.click('.vol-view button[data-view=table]');await p.waitForTimeout(600);
const two=await p.$$eval('table.vt tbody tr',x=>x.slice(0,2).map(e=>e.dataset.mid));for(const id of two)await p.click('#vt-cb-'+id);
await p.click('#vt-bulk-dup');await p.waitForTimeout(400);
await p.evaluate(pid=>{const s=document.getElementById('u2-dup-proj');s.value=pid;s.dispatchEvent(new Event('change',{bubbles:true}))},sd.pid);
await p.click('#u2-dup-go');await p.waitForTimeout(2500);
const inQ4=await p.evaluate(pid=>{const d=JSON.parse(localStorage.getItem('mockdb'));return Object.keys(d).filter(k=>k.startsWith('projects/'+pid+'/materials/')).map(k=>d[k]).filter(m=>/\(copy\)$/.test(m.name)).map(m=>m.status+':'+m.name)},sd.pid);
ok('the table selection duplicates into another project, as drafts',inQ4.length===2&&inQ4.every(x=>x.startsWith('draft:')),inQ4.join(', '));
ok('the message offers to open that project',/Duplicated 2 materials into “Q4 Life Sciences campaign”/.test(await p.textContent('#toast')),await p.textContent('#toast'));
// New material: start from recent work
await p.click('#vt-bulk-clear');await p.click('#view button:has-text("New material")');await p.waitForTimeout(600);
const rec=await p.$$eval('.u2-rec b',x=>x.map(e=>e.textContent));
ok('New material offers your recent work, across projects',rec.length>=3&&rec.length<=6&&rec.includes('Novagen brief 2'),rec.join(' | '));
await p.screenshot({path:SH+'r2-newmat.png'});
await p.click('.u2-rec:has-text("Novagen brief 2")');await p.waitForTimeout(800);
ok('picking one duplicates it into this project',/Duplicate “Novagen brief 2”/.test(await p.textContent('.modal h3'))&&!(await p.$('#u2-dup-proj')));
await p.click('#u2-dup-go');await p.waitForTimeout(2000);
ok('… and opens the copy here',await p.evaluate(pid=>__T.S().pid===pid&&__T.mat()&&__T.mat().name==='Novagen brief 2 (copy)',ex.pid));
/* ---------- 6. after an export ---------- */
const ebro=ex.mats.find(m=>/eBrochure/.test(m.name));
await p.evaluate(s=>__T.go('editor',s.pid,s.id),{pid:ex.pid,id:ebro.id});await p.waitForTimeout(1500);
await p.evaluate(()=>__T.exportOne(__T.fmtById('letter'),'png'));await p.waitForFunction(()=>document.getElementById('u2-panel'),null,{timeout:30000});await p.waitForTimeout(300);
const fin=await p.textContent('#u2-panel');
ok('after an export a panel says where the file went',/US Letter exported/.test(fin)&&/Saved “fernwood-vale-ebrochure-letter[^”]*\.png”.*downloads folder/.test(fin),fin.slice(0,200));
ok('… with Mark delivered (approved), language versions and duplicate for the next client',await p.isVisible('#u2-fin-deliver')&&await p.isVisible('#u2-fin-langs')&&await p.isVisible('#u2-fin-dup'));
await p.screenshot({path:SH+'r2-finish.png'});
await p.click('#u2-fin-deliver');await p.waitForTimeout(500);ok('Mark delivered asks first, as the header button does',/Mark delivered “Fernwood & Vale eBrochure”/.test(await p.textContent('.modal h3').catch(()=>'')));
await p.keyboard.press('Escape');await p.waitForTimeout(300);
await p.evaluate(()=>__T.go('library'));await p.waitForTimeout(400);ok('the panel goes when you leave the material',!(await p.$('#u2-panel')));
/* ---------- 4. live overdue, Monday view ---------- */
await p.evaluate(()=>__T.go('home',null,null));await p.waitForTimeout(800);
const q4row=await p.textContent('.job:has-text("Q4 Life Sciences campaign")').catch(()=>'');
ok('Projects works overdue out from due dates, not the stored figure',/1 overdue/.test(q4row),q4row.slice(0,160));
await p.evaluate(pid=>__T.go('project',pid),sd.pid);await p.waitForTimeout(1200);
if(!(await p.isVisible('table.vt')))await p.click('.vol-view button[data-view=table]');await p.waitForTimeout(500);
const cols=await p.$$eval('table.vt thead th .vt-sort span:first-child',x=>x.map(e=>e.textContent));
ok('the table has Waiting on and In stage',cols.includes('Waiting on')&&cols.includes('In stage'),cols.join(','));
await p.click('#vt-sort-name');await p.waitForTimeout(300);
const nm=(await p.$$eval('table.vt tbody tr .vt-open',x=>x.map(e=>e.textContent))).filter(n=>/^Novagen brief \d+$/.test(n));
ok('names sort naturally: brief 2, 4, 14',nm.join('|')==='Novagen brief 2|Novagen brief 4|Novagen brief 14',nm.join('|'));
await p.click('#vt-sort-status');await p.waitForTimeout(300);
const stg=await p.$$eval('table.vt tbody tr .vt-status',x=>x.map(e=>e.textContent.trim()));const ord=['Draft','In review','Changes requested','Approved','Delivered'];
ok('Stage sorts in workflow order',stg.every((s,i)=>!i||ord.indexOf(stg[i-1])<=ord.indexOf(s)),stg.join(','));
const rowOf=async n=>p.$eval('table.vt tbody tr:has(.vt-open:text-is("'+n+'"))',e=>[e.querySelector('.vt-wait').textContent,e.querySelector('.vt-age').textContent]);
const cRow=await rowOf('Novagen case study');ok('Waiting on names the assignee, In stage counts the days',cRow[0]==='Dana Reyes'&&cRow[1]==='9 days',cRow.join(' / '));
const rRow=await rowOf('Novagen brief 4');ok('in review it waits on the reviewers (the owner when none are set)',rRow[0]==='You',rRow.join(' / '));
await p.click('#vt-sort-age');await p.waitForTimeout(300);ok('In stage sorts, longest first',(await p.$eval('table.vt tbody tr .vt-open',e=>e.textContent))==='Novagen case study');
await p.screenshot({path:SH+'r2-table.png'});
/* ---------- 8. Download all; bulk undo ---------- */
const sel=await p.$$eval('table.vt tbody tr',x=>x.slice(0,2).map(e=>e.dataset.mid));for(const id of sel)await p.click('#vt-cb-'+id);
await p.click('#dl-all');await p.waitForTimeout(500);
const picked=await p.$$eval('.bulk-mats input:checked',x=>x.map(e=>e.value));
ok('Download all opened while rows are ticked starts from those rows',picked.length===2&&sel.every(i=>picked.includes(i)),picked.length);
const box=await p.$eval('.modal',e=>{const r=e.getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom)]});
ok('the dialog fits a 900 px window and scrolls inside',box[1]<=900&&await p.$eval('.modal>div:not(.mact)',e=>getComputedStyle(e).overflowY==='auto'),box.join('-'));
await p.check('#bulk-docx');await p.uncheck('#bulk-pptx').catch(()=>{});await p.click('#bulk-cancel');await p.waitForTimeout(300);
await p.click('#vt-bulk-clear');await p.click('#dl-all');await p.waitForTimeout(500);
ok('Cancel keeps your file types for next time',await p.isChecked('#bulk-docx')&&!(await p.isChecked('#bulk-pptx')));
await p.click('.bulk-mhead button:has-text("None")');await p.check('#bulk-m-'+sd.mids[0]);await p.click('#bulk-cancel');await p.waitForTimeout(300);
await p.click('#dl-all');await p.waitForTimeout(500);ok('… and the materials you picked',JSON.stringify(await p.$$eval('.bulk-mats input:checked',x=>x.map(e=>e.value)))===JSON.stringify([sd.mids[0]]));
await p.click('#bulk-cancel');await p.waitForTimeout(300);
// bulk stage change, then undo
const drafts=await p.evaluate(()=>__T.S().mats.filter(m=>m.status==='draft').map(m=>m.id));
for(const id of drafts)await p.click('#vt-cb-'+id);
await p.click('#vt-bulk-status');await p.waitForTimeout(300);await p.check('#vb-st-review');await p.click('#vb-apply');await p.waitForSelector('#vol-done',{timeout:20000});await p.waitForTimeout(600);
const movedN=await p.evaluate(ids=>ids.filter(id=>__T.S().mats.find(m=>m.id===id).status==='review').length,drafts);
ok('a bulk stage change offers Undo in its result and its message',movedN>0&&await p.isVisible('#vol-undo')&&/Undo/.test(await p.textContent('#toast')),movedN+' moved; '+await p.textContent('#toast'));
await p.keyboard.press('Control+z');await p.waitForTimeout(2000);
const back=await p.evaluate(ids=>ids.map(id=>__T.S().mats.find(m=>m.id===id).status),drafts);
ok('Ctrl+Z right after puts them back through the usual rules',back.every(s=>s==='draft')&&/back/.test(await p.textContent('#toast')),back.join(',')+' / '+await p.textContent('#toast'));
/* ---------- 3. For you ---------- */
await p.evaluate(()=>__T.go('about',null,null));await p.waitForTimeout(1000);
const fy=await p.evaluate(()=>__T.forYou().map(x=>x.cls+':'+x.m.n));
ok('For you lists approved work to export and deliver',fy.includes('ship:Novagen brief 14'),fy.join(', '));
ok('… with its own label',await p.isVisible('.u-fy-item.u-ship:has-text("Approved — export and deliver")'));
const nb=await p.$eval('.u-fy-item:has-text("Novagen brief 4")',e=>[e.classList.contains('u2-is-new'),e.textContent]).catch(()=>[false,'']);
ok('items others moved are new, and say who acted',nb[0]&&/Dana Reyes sent it for review/.test(nb[1]),nb[1]);
const mineNew=await p.evaluate(()=>__T.forYou().filter(x=>x.m.by===__T.ME().id).some(x=>__T.U2().isNew(x)));ok('your own actions are never new',!mineNew);
ok('the team section counts overdue, waiting on review and in stage over 5 days',/Overdue\s*1/.test(await p.textContent('.u2-team-sum').catch(()=>''))&&/Waiting on review/.test(await p.textContent('.u2-team-sum').catch(()=>''))&&/In stage over 5 days/.test(await p.textContent('.u2-team-sum').catch(()=>'')),await p.textContent('.u2-team-sum').catch(()=>'none'));
ok('… with the items, and who they wait on',/Novagen case study/.test(await p.textContent('#u2-team-panel'))&&/Waiting on Dana Reyes/.test(await p.textContent('#u2-team-panel')),await p.textContent('#u2-team-panel'));
await p.waitForTimeout(4500);await p.evaluate(()=>__T.go('library'));await p.waitForTimeout(300);await p.evaluate(()=>__T.go('about'));await p.waitForTimeout(800);
ok('looking at Get started doesn\'t clear “new” (no timer)',await p.$eval('.u-fy-item:has-text("Novagen brief 4")',e=>e.classList.contains('u2-is-new')).catch(()=>false));
await p.click('.u-fy-item:has-text("Novagen brief 4")');await p.waitForTimeout(1500);await p.evaluate(()=>__T.go('about'));await p.waitForTimeout(800);
ok('opening an item marks it seen',!(await p.$eval('.u-fy-item:has-text("Novagen brief 4")',e=>e.classList.contains('u2-is-new')).catch(()=>true)));
await p.screenshot({path:SH+'r2-foryou.png',fullPage:true});
/* ---------- 5. coming back ---------- */
await p.evaluate(s=>__T.go('editor',s.pid,s.mid),{pid:sd.pid,mid:sd.mids[3]});await p.waitForTimeout(1500);
await p.reload();await p.waitForTimeout(2200);
ok('a reload in the same tab stays where you were',await p.evaluate(()=>[__T.S().view,__T.S().mid].join())==='editor,'+sd.mids[3]);
await p.evaluate(()=>{history.replaceState(null,'',location.href.replace(/#.*$/,''))});
await p.close();
// back five days later, in a new tab
const ME=await (async()=>{const t=await ctx.newPage();await t.goto('about:blank');await t.close();return 'u_test000000000000000001'})();
const q=await ctx.newPage();await prep(q,errs);
await q.addInitScript(me=>{if(!sessionStorage.getItem('__t')){sessionStorage.setItem('__t','1');localStorage.setItem('el-visit-'+me,String(Date.now()-5*864e5))}},ME);
await q.goto(url);await q.waitForTimeout(2600);
ok('after a few days away, opening ELEMENT lands on Get started',await q.evaluate(()=>__T.S().view)==='about',await q.evaluate(()=>__T.S().view));
const since=await q.textContent('.u2-since').catch(()=>'');
ok('“Since your last visit” counts approvals and notes from others, not yours',/Since your last visit \(5 days ago\): 1 approval, 2 notes from others\./.test(since),since);
ok('… and offers to continue where you were',/Continue with “Novagen brief 2”/.test(since));
ok('returning visitors with work see the introduction folded, the four ways to start kept',await q.evaluate(()=>document.querySelector('.lp.sp').classList.contains('u2-mini'))&&await q.isVisible('#u2-intro')&&!(await q.isVisible('.sp-stack')));
await q.click('#u2-intro');await q.waitForTimeout(300);ok('“Show the introduction” opens it',await q.isVisible('.sp-stack')&&(await q.textContent('#u2-intro'))==='Hide the introduction');
await q.click('#u2-intro');await q.waitForTimeout(200);
await q.click('#u2-continue');await q.waitForTimeout(1500);ok('Continue opens the material you had open',await q.evaluate(()=>[__T.S().view,__T.S().mid].join())==='editor,'+sd.mids[3]);
await q.close();
// a new tab a moment later with nothing waiting last time: if something is waiting now, Get started first
const r=await ctx.newPage();await prep(r,errs);
await r.addInitScript(me=>{if(!sessionStorage.getItem('__t')){sessionStorage.setItem('__t','1');localStorage.setItem('el-fy-n-'+me,'0');localStorage.setItem('el-visit-'+me,String(Date.now()-60000))}},ME);
await r.goto(url);await r.waitForTimeout(2600);
ok('with something waiting, a new visit opens Get started, not the last editor',await r.evaluate(()=>__T.S().view)==='about'&&await r.evaluate(()=>__T.forYou().length)>0,await r.evaluate(()=>__T.S().view));
await r.evaluate(()=>{const S=__T.S();S.projects.forEach(p=>{if(p.summary)p.summary.q=[]})});
await r.close();
// nothing waiting: the last place reopens
const s=await ctx.newPage();await prep(s,errs);await s.addInitScript(w=>{window.__want=w},{view:'editor',pid:sd.pid,mid:sd.mids[3],fmt:'letter'});
await s.addInitScript(me=>{if(!sessionStorage.getItem('__t')){sessionStorage.setItem('__t','1');localStorage.setItem('el-fy-n-'+me,'0');localStorage.setItem('el-visit-'+me,String(Date.now()-60000));localStorage.setItem('gl-ws-view',JSON.stringify(window.__want));
  const d=JSON.parse(localStorage.getItem('mockdb')||'{}');Object.keys(d).forEach(k=>{if(/^projects\/[^/]+$/.test(k)&&d[k].summary){d[k].summary.q=[];d[k].ownerId='someone-else'}});localStorage.setItem('mockdb',JSON.stringify(d))}},ME);
await s.goto(url);await s.waitForTimeout(2800);
ok('with nothing waiting, a new visit reopens where you were',await s.evaluate(()=>[__T.S().view,__T.S().mid].join())==='editor,'+sd.mids[3],await s.evaluate(()=>[__T.S().view,__T.S().mid,__T.forYou().length].join()));
await s.close();
/* ---------- phone ---------- */
const ph=await ctx.newPage();await ph.setViewportSize({width:390,height:844});await prep(ph,errs);await ph.goto(url+'#p='+ex.pid);await ph.waitForTimeout(2500);
if(await ph.isVisible('.vol-view button[data-view=board]'))await ph.click('.vol-view button[data-view=board]');await ph.waitForTimeout(500);
await ph.click('.mcard >> nth=0 >> .u2-cardmenu');await ph.waitForTimeout(300);
const pop=await ph.$eval('.u2-pop',e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=390}).catch(()=>false);
ok('on a phone the card menu fits the screen',pop);await ph.screenshot({path:SH+'r2-phone-menu.png'});await ph.keyboard.press('Escape');
await ph.evaluate(()=>__T.go('about'));await ph.waitForTimeout(900);
ok('on a phone Get started has no sideways scroll',await ph.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await ph.screenshot({path:SH+'r2-phone-about.png',fullPage:true});
await ph.close();
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
R.forEach(x=>console.log(x));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log(f?f+' FAILED':'ALL PASS');await b.close()})();
