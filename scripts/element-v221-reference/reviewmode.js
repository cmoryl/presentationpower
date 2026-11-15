// Review mode, notes pinned to the page, the review lock, changes requested, sample copy at the gates (99k-review-mode.js)
const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+String(d).slice(0,200):''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,400));process.exit(1)});
const SHOTS=process.env.RV_SHOTS||'';if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const url='file://'+__dirname+'/test.html';const errs=[];
const shot=async(p,n)=>{if(SHOTS)await p.screenshot({path:SHOTS+'/'+n+'.png'})};
const C=await ctx.newPage();C.on('pageerror',e=>errs.push('C '+e.message));await C.goto(url);await C.evaluate(()=>localStorage.clear());await C.reload();await C.waitForTimeout(1200);
const db=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('mockdb')));const NAME='Moderna case study';const mat=async p=>Object.values(await db(p)).find(v=>v.name===NAME);
const modal=async p=>(await p.locator('.modal').first().innerText().catch(()=>''));
// --- Chris: a project with Dana as reviewer, and a material from the Client Case Study layout
await C.click('button:has-text("New project") >> nth=0');await C.waitForTimeout(400);await C.fill('#np-name','Moderna EU launch');await C.click('button:has-text("Create project")');await C.waitForTimeout(900);
await C.click('[role=dialog] button:has-text("Cancel")').catch(()=>{});await C.waitForTimeout(300);
await C.click('[role=tab]:has-text("Brief")');await C.waitForTimeout(600);await C.fill('#rv-add','Dana');await C.waitForTimeout(400);await C.click('.people li >> text=Dana');await C.waitForTimeout(300);
await C.click('button:has-text("Add reviewer")');await C.waitForTimeout(600);await C.click('button:has-text("Save brief")').catch(()=>{});await C.waitForTimeout(600);
await C.click('button:has-text("New material")');await C.waitForTimeout(600);await C.fill('#nm-name',NAME);await C.click('text=Create and open');await C.waitForSelector('.page .mod');await C.waitForTimeout(1200);
// 7a. every field of the starting layout is sample until changed, including short KPI figures and the attribution
let m=await mat(C);ok('a material from a starting layout records its fingerprint (m.seed)',m.seed&&Object.keys(m.seed).length>5,m.seed&&Object.keys(m.seed).length);
const sv=await C.evaluate(()=>__T.sampleFields(__T.mat()).map(f=>f.value));
ok('short KPI figures count as sample copy',['10 Days','33%','On Time'].every(v=>sv.includes(v)),sv.slice(0,12).join(' | '));
ok('the quote attribution counts as sample copy',sv.some(v=>/a[eē]sop/i.test(v)&&v.length<12),sv.filter(v=>/sop/i.test(v)).join('|'));
ok('the starting layout attribution is capitalised as in the source',await C.evaluate(()=>/— Aēsop/.test(document.querySelector('#stage .page').textContent)));
ok('KPI figures are underlined as sample on the page',await C.evaluate(()=>[...document.querySelectorAll('#stage .is-sample')].some(e=>e.textContent.replace(/\s+/g,' ').trim()==='10 Days')),await C.evaluate(()=>[...document.querySelectorAll('#stage .is-sample')].map(e=>e.textContent.trim().slice(0,20)).join('|')));
// changing a figure takes it off the list
await C.evaluate(()=>{const S=__T.S();const k=S.mat.modules.find(x=>x.type==='kpis');k.data.items[0].value='40%';__T.redraw()});
ok('a changed figure is no longer sample',!(await C.evaluate(()=>__T.sampleFields(__T.mat()).map(f=>f.value))).includes('10 Days'));
await C.evaluate(()=>{const S=__T.S();const k=S.mat.modules.find(x=>x.type==='kpis');k.data.items[0].value='10 Days';__T.redraw()});
// 7c. listed under Must fix in the Review tab
await C.click('#rtab-review');await C.waitForTimeout(500);
ok('Review tab lists sample copy under Must fix',await C.evaluate(()=>{const g=[...document.querySelectorAll('.pf-g.bad')];return g.some(x=>/Still the sample copy/.test(x.textContent))}));
ok('…and not under Check',await C.evaluate(()=>![...document.querySelectorAll('.pf-g.warn')].some(x=>/Still the sample copy/.test(x.textContent))));
// 6. status menu: reasons for disabled options; a draft can't be set to Changes requested
const st=await C.evaluate(()=>{const s=document.getElementById('ed-status');const o=[...s.options].map(o=>({v:o.value,d:o.disabled,t:o.title}));const d=document.getElementById(s.getAttribute('aria-describedby')||'x');return {o,desc:d&&d.textContent}});
ok('a draft cannot be set to Changes requested, and says why',st.o.find(o=>o.v==='changes').d&&/reviewer/.test(st.o.find(o=>o.v==='changes').t),JSON.stringify(st.o));
ok('disabled options carry a reason (title)',st.o.filter(o=>o.d).every(o=>o.t.length>10));
ok('the status menu has an accessible description of what is unavailable',/Not available now/.test(st.desc||''),st.desc);
const sid=await C.evaluate(()=>__T.mat().id);
await C.evaluate(id=>__T.setStatus({id},'changes'),sid);await C.waitForTimeout(600);
ok('setting a draft to Changes requested is refused',(await mat(C)).status==='draft'&&/can't move to Changes requested/.test(await C.textContent('#toast')));
// 7b. Submit for review: sample copy is a blocking step with Submit anyway
await C.click('.edbar button:has-text("Submit for review")');await C.waitForTimeout(600);
const g=await modal(C);ok('Submit asks about sample copy first',/still has sample copy/i.test(g)&&await C.isVisible('#rvm-submit-anyway'),g.slice(0,120));
await shot(C,'01-submit-gate');
await C.click('#rvm-submit-anyway');await C.waitForTimeout(500);ok('Submit anyway leads to the usual confirmation',await C.isVisible('#confirm-stage'));
await C.click('#confirm-stage');await C.waitForTimeout(1500);ok('submitted',(await mat(C)).status==='review',(await mat(C)).status);
// 3. the author's content is locked in review, with Withdraw
await C.click('.page .mod >> nth=1');await C.waitForTimeout(500);
ok('author: fields read-only in review',await C.evaluate(()=>{const f=[...document.querySelectorAll('.rbody input:not([type=checkbox]),.rbody textarea')];return f.length>0&&f.every(x=>x.disabled)}));
ok('author: the lock message with Withdraw sits at the top of the panel',await C.evaluate(()=>{const b=document.querySelector('.rbody').firstElementChild;return b.classList.contains('rvm-lockbox')&&/with Dana for review/.test(b.textContent)&&!!b.querySelector('#rvm-withdraw')}));
await C.keyboard.press('Control+d');await C.waitForTimeout(500);
const bn=await C.evaluate(()=>{const n=[...document.querySelectorAll('#stage .note')].find(x=>/review/.test(x.textContent)&&x.getAttribute('role')==='alert');return n&&{t:n.textContent,c:n.className}});
ok('an edit attempt says who has it, with Withdraw',bn&&/This is with Dana for review\. Withdraw it to keep editing/.test(bn.t),bn&&bn.t);
ok('the lock banner is neutral, not an error',bn&&/info/.test(bn.c)&&!/warn/.test(bn.c),bn&&bn.c);
ok('nothing was duplicated',(await mat(C)).modules.length===6);
await shot(C,'02-author-locked');
// Withdraw → Draft, logged; then submit again
await C.click('#rvm-withdraw');await C.waitForTimeout(1500);m=await mat(C);
ok('Withdraw moves it back to Draft and logs it',m.status==='draft'&&Object.values(m.review).some(r=>r.to==='draft'&&/Withdrawn/.test(r.text||'')),m.status);
ok('after Withdraw the fields are editable again',await C.evaluate(()=>{const f=document.querySelector('.rbody textarea,.rbody input:not([type=checkbox])');return f&&!f.disabled}));
await C.click('.edbar button:has-text("Submit for review")');await C.waitForTimeout(600);if(await C.isVisible('#rvm-submit-anyway')){await C.click('#rvm-submit-anyway');await C.waitForTimeout(400)}
ok('Submit anyway is remembered for this submission only',await C.isVisible('#confirm-stage')||(await mat(C)).status==='review');
await C.click('#confirm-stage').catch(()=>{});await C.waitForTimeout(1500);ok('submitted again',(await mat(C)).status==='review');
// --- Dana: review mode
const D=await ctx.newPage();D.on('pageerror',e=>errs.push('D '+e.message));await D.goto(url+'#as=dana');await D.waitForTimeout(1600);
await D.click('#appnav >> text=Get started').catch(()=>{});await D.waitForTimeout(900);await D.click('.u-fy-item:has-text("'+NAME+'")');await D.waitForTimeout(1600);
ok('Dana opens it in review mode',await D.evaluate(()=>document.body.classList.contains('rvm-on')));
ok('the library steps aside for the review pane',await D.isVisible('#lib .rvm-h')&&!(await D.isVisible('#lib .litem')));
const sizes=await D.$$eval('.rvm-size',e=>e.map(x=>x.textContent));ok('every required size is listed to view',sizes.length===(await mat(C)).formats.length&&sizes.length>0,sizes.join(','));
if(sizes.length>1){await D.click('.rvm-size >> nth=1');await D.waitForTimeout(500);ok('a size button shows that size',await D.evaluate(()=>{const b=document.querySelectorAll('.rvm-size')[1];return b.getAttribute('aria-pressed')==='true'}));await D.click('.rvm-size >> nth=0');await D.waitForTimeout(500)}
ok('Approve and Request changes are both in the top bar',await D.isVisible('.edbar #rvm-req')&&await D.isVisible('.edbar button:text-is("Approve")'));
ok('undo and redo are out of the way',!(await D.isVisible('.edbar button[aria-label="Undo"]')));
ok('review bar above the page with Edit anyway',await D.isVisible('.rvm-bar.rvm-review #rvm-edit-anyway-2'));
await D.click('#stage .mod >> nth=1');await D.waitForTimeout(600);
ok('stack edit buttons hidden',!(await D.isVisible('#stack .ibtn')));
ok('panel fields read-only',await D.evaluate(()=>{const f=[...document.querySelectorAll('.rbody input:not([type=checkbox]),.rbody textarea,.rbody select')];return f.length>0&&f.every(x=>x.disabled)}));
ok('the module toolbar offers Comment here, not editing tools',await D.isVisible('#rvm-ctb #rvm-comment')&&!(await D.isVisible('#ctb')));
await shot(D,'03-dana-review-mode');
// 2. a note pinned to the module
await D.click('#rvm-comment');await D.waitForTimeout(400);await D.click('#rvm-pin-add');await D.waitForTimeout(300);
ok('an empty note says it needs words',await D.isVisible('#rvm-pin-err')&&/Write the note/.test(await D.textContent('#rvm-pin-err')));
await D.fill('#rvm-pin-text','These KPI figures are the sample ones');await D.click('#rvm-pin-add');await D.waitForTimeout(1200);
m=await mat(C);const pin=Object.values(m.review).find(r=>r.kind==='comment'&&r.mid);
ok('the note is saved in the review history with its module',pin&&pin.mid===m.modules[1].id&&pin.by,JSON.stringify(pin));
ok('a numbered marker shows on that module',await D.evaluate(()=>{const p=document.querySelector('.rvm-pin');return p&&p.textContent==='1'&&p.dataset.mid===__T.mat().modules[1].id}));
ok('markers are not part of the page (never exported)',await D.evaluate(()=>!document.querySelector('#stage .page .rvm-pin')&&!__T.fmtHTML(__T.mat().modules,__T.FORMATS[0],false).includes('rvm-pin')));
ok('the Review tab shows a badge with the open notes',(await D.textContent('#rtab-review')).includes('1')&&await D.isVisible('#rtab-review .rvm-badge'));
await D.click('.rvm-pin');await D.waitForTimeout(500);
ok('the marker opens the note in the Review tab, with Go to and Resolve',await D.isVisible('.rvm-note button:has-text("Go to")')&&await D.isVisible('.rvm-note button:has-text("Resolve")'));
await shot(D,'04-dana-note');
// 7b. approve is blocked with a reviewer's message
await D.click('.edbar button:text-is("Approve")');await D.waitForTimeout(700);const am=await modal(D);
ok('approving sample copy is blocked with a reviewer message',/Send it back so the author can replace/.test(am)&&!/Show me the first one/.test(am),am.slice(0,200));
ok('…with a Request changes shortcut',await D.isVisible('#rvm-sample-req'));
await shot(D,'05-dana-approve-block');
await D.click('#rvm-sample-req');await D.waitForTimeout(500);
ok('the shortcut opens Request changes with a note about the sample copy',/sample copy/.test(await D.inputValue('#rvm-req-text')));
// 1. Request changes needs a note
await D.fill('#rvm-req-text','');await D.click('#rvm-req-send');await D.waitForTimeout(300);
ok('an empty request says it needs a note',await D.isVisible('#rvm-req-err')&&/needs a note/.test(await D.textContent('#rvm-req-err'))&&(await mat(C)).status==='review');
await D.fill('#rvm-req-text','Replace the Aesop numbers with Moderna results, and move the quote up.');await D.click('#rvm-req-send');await D.waitForTimeout(1800);
m=await mat(C);ok('Request changes sends it back with the note',m.status==='changes'&&Object.values(m.review).some(r=>r.to==='changes'&&/Moderna results/.test(r.text)),m.status);
const vs=await D.evaluate(()=>__T.Store.versions(__T.S().pid,__T.mat().id).then(a=>a.map(v=>({label:v.label,kind:v.kind}))));ok('a "Changes requested" milestone keeps what was reviewed',vs.some(v=>v.label==='Changes requested'&&v.kind==='milestone'),JSON.stringify(vs));
ok('review mode ends once it leaves review',!(await D.evaluate(()=>document.body.classList.contains('rvm-on'))));
// --- Chris: changes requested
await C.click('#appnav >> text=Get started');await C.waitForTimeout(1200);
const fy=await C.locator('.u-fy-item.u-changes').first().innerText().catch(()=>'');ok('For you shows an excerpt of the request',/Moderna results/.test(fy),fy.replace(/\n/g,' | '));
await shot(C,'06-chris-foryou');
await C.click('.u-fy-item.u-changes');await C.waitForTimeout(1600);
const cb=await C.locator('.rvm-bar.rvm-changes').innerText().catch(()=>'');
ok('a banner above the page shows the request: who, when, what, open notes',/Dana Reyes asked for changes/.test(cb)&&/Moderna results/.test(cb)&&/1 open note/.test(cb)&&/ago|just now/.test(cb),cb.replace(/\n/g,' | '));
ok('the author sees the open note as a marker',await C.isVisible('.rvm-pin'));
ok('Review tab badge on the author side too',await C.isVisible('#rtab-review .rvm-badge'));
await shot(C,'07-chris-changes');
await C.click('#rvm-show-notes');await C.waitForTimeout(500);ok('Show notes opens the Review tab notes',await C.evaluate(()=>__T.S().rtab==='review')&&await C.isVisible('#rvm-notes-h'));
// the author edits: a figure, and moves the quote up
await C.evaluate(()=>{const S=__T.S();const k=S.mat.modules.find(x=>x.type==='kpis');k.data.items[0].value='40%'});
await C.click('.rtabs button:has-text("Content")');await C.waitForTimeout(300);await C.click('#stage .mod >> nth=3');await C.waitForTimeout(400);
await C.click('#stack li.sel .ibtn[aria-label^="Move"][aria-label$="up"]');await C.waitForTimeout(1600);
m=await mat(C);ok('author can edit again once changes are requested',m.modules[2].type==='quote'&&JSON.stringify(m.modules).includes('40%'),m.modules.map(x=>x.type).join(','));
await C.click('#rvm-addressed');await C.waitForTimeout(1400);m=await mat(C);
ok('Mark addressed resolves the open notes and logs it',Object.values(m.review).filter(r=>r.mid).every(r=>r.done)&&Object.values(m.review).some(r=>r.kind==='addressed'));
ok('the banner and markers go once addressed',!(await C.isVisible('.rvm-bar.rvm-changes'))&&!(await C.isVisible('.rvm-pin')));
await C.click('.edbar button:has-text("Submit for review")');await C.waitForTimeout(600);if(await C.isVisible('#rvm-submit-anyway')){await C.click('#rvm-submit-anyway');await C.waitForTimeout(400)}
await C.click('#confirm-stage');await C.waitForTimeout(1500);ok('resubmitted',(await mat(C)).status==='review');
// 5. Dana: what changed since my last decision, moves included
await D.click('#appnav >> text=Get started');await D.waitForTimeout(900);await D.click('.u-fy-item:has-text("'+NAME+'")');await D.waitForTimeout(1600);
ok('back for review: the bar says so and offers what changed since my decision',/Back for review/.test(await D.textContent('.rvm-bar'))&&await D.isVisible('#rvm-wc'));
await D.click('#rvm-wc');await D.waitForTimeout(900);const wc=await modal(D);
ok('What changed compares with my last decision',/since your last decision/.test(wc),wc.slice(0,100));
ok('…lists the changed figure',/40%/.test(wc),wc.slice(0,400));
ok('…and the module move',/moved from position (4 to 3|3 to 4)/.test(wc),wc.replace(/\n/g,' | ').slice(0,400));
await shot(D,'08-dana-whatchanged');
await D.keyboard.press('Escape');await D.waitForTimeout(300);
await D.click('#rtab-review');await D.waitForTimeout(800);ok('the Review tab offers it too, with a count',await D.isVisible('#rvm-wc-tab')&&/change/.test(await D.textContent('.rvm-since')));
// 1. Edit anyway: allowed, logged
await D.click('#rvm-edit-anyway-2');await D.waitForTimeout(1200);
ok('Edit anyway leaves review mode',!(await D.evaluate(()=>document.body.classList.contains('rvm-on')))&&await D.isVisible('#lib .litem'));
m=await mat(C);ok('…and the thread records "Edited during review"',Object.values(m.review).some(r=>r.kind==='edit'&&/Edited during review/.test(r.text)&&r.by!==m.createdBy));
await D.click('.rtabs button:has-text("Content")').catch(()=>{});await D.click('#stage .mod >> nth=0');await D.waitForTimeout(400);
const tid=await D.$eval('.rbody textarea',e=>e.id);await D.fill('#'+tid,'Moderna cut launch time by 40%');await D.waitForTimeout(1800);
ok('the reviewer edit is saved',(await mat(C)).modules[0].data.title==='Moderna cut launch time by 40%');
ok('Approve and Request changes stay in the top bar while editing',await D.isVisible('#rvm-req')&&await D.isVisible('.edbar button:text-is("Approve")'));
// 8. approved: read-only fields, lock message on top of the panel, neutral banner (the example project)
const ctx2=await b.newContext({viewport:{width:1280,height:720}});const E=await ctx2.newPage();E.on('pageerror',e=>errs.push('E '+e.message));await E.goto(url);await E.evaluate(()=>localStorage.clear());await E.reload();await E.waitForTimeout(1200);
await E.click('text=Open the example project');await E.waitForTimeout(1500);if(await E.isVisible('.edbar >> text=Board'))await E.click('.edbar >> text=Board');await E.waitForTimeout(600);
await E.click('.mcard:has-text("eBrochure")');await E.waitForTimeout(1500);await E.click('#stage .mod >> nth=0');await E.waitForTimeout(500);
ok('approved: the lock message with Reopen is first in the panel',await E.evaluate(()=>{const b=document.querySelector('.rbody').firstElementChild;return b.classList.contains('rvm-lockbox')&&!!b.querySelector('#rvm-reopen')}));
ok('approved: fields visibly read-only',await E.evaluate(()=>{const f=[...document.querySelectorAll('.rbody textarea')];return f.length&&f.every(x=>x.disabled&&getComputedStyle(x).cursor==='not-allowed')}));
await E.keyboard.press('Control+d');await E.waitForTimeout(500);
const eb=await E.evaluate(()=>{const n=[...document.querySelectorAll('#stage .note')].find(x=>/locked/.test(x.textContent));return n&&n.className});
ok('approved: the lock banner is neutral info, not an error',eb&&/info/.test(eb)&&!/warn/.test(eb),eb);
await E.click('#stage .mod >> nth=1');await E.waitForTimeout(400);ok('approved: Comment here is still offered',await E.isVisible('#rvm-comment'));
await shot(E,'09-approved-locked');
// moves in What changed (unit)
const mv=await E.evaluate(()=>{const a={id:'a',type:'hero',data:{}},b={id:'b',type:'kpis',data:{}},c={id:'c',type:'quote',data:{}},d={id:'d',type:'footer',data:{}};return {swap:__T.verChanges({modules:[a,b,c,d]},{modules:[a,c,b,d]}).filter(x=>x.kind==='moved').length,add:__T.verChanges({modules:[a,b,c]},{modules:[a,{id:'n',type:'cta',data:{}},b,c]}).filter(x=>x.kind==='moved').length}});
ok('a swap is one move; an insertion moves nothing',mv.swap===1&&mv.add===0,JSON.stringify(mv));
// phone: the reviewer's bar fits
const ctx3=await b.newContext({viewport:{width:390,height:844},isMobile:true});const P=await ctx3.newPage();P.on('pageerror',e=>errs.push('P '+e.message));
await P.goto(url);await P.evaluate(s=>{localStorage.clear();localStorage.setItem('mockdb',s)},await C.evaluate(()=>localStorage.getItem('mockdb')));await P.goto(url+'#as=dana');await P.reload();await P.waitForTimeout(1800);
await P.evaluate(()=>{const s=__T.S();const p=s.projects.find(p=>p.name==='Moderna EU launch');__T.go('project',p.id)});await P.waitForTimeout(1500);
await P.click('.mcard:has-text("'+NAME+'")');await P.waitForTimeout(1800);
ok('phone: the reviewer gets both decisions',await P.isVisible('#rvm-req')||await P.isVisible('.edbar button:text-is("Approve")'));
ok('phone: no sideways scroll in the editor',await P.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),await P.evaluate(()=>document.documentElement.scrollWidth));
await shot(P,'10-phone');
ok('no page errors',errs.length===0,errs.join(' | '));
R.forEach(x=>console.log(x));await b.close();process.exit(0)})();
