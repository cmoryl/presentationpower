// Sign-offs: approvals are recorded per approver and checked against what's on the page.
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
// approve the in-review material
const mid=await p.evaluate(()=>__T.S().mats.find(m=>m.status==='review').id);
await p.click('.mcard[data-mid="'+mid+'"]');await p.waitForTimeout(1500);
await p.evaluate(()=>{const m=__T.mat();m.modules.forEach(x=>{});});
// clear sample-copy etc: force approve through setStatus (preflight may block); use the API with a clean content
const r=await p.evaluate(async()=>{const S=__T.S();S.mat.pfBad=0;const ok=await __T.setStatus(S.mat,'approved');return ok});
await p.waitForTimeout(800);
const st=await p.evaluate(()=>__T.mat().status);
ok('approval goes through',st==='approved',st);
const so=await p.evaluate(async(mid)=>{const d=__T.Store.raw();const me=__T.S();const uid=document.querySelector('#who').textContent;const snap=await d.collection('signoffs').get().catch(()=>null);return null},mid);
const doc=await p.evaluate(async(mid)=>{const d=__T.Store.raw();const S=__T.S();const ap=Object.values(S.mat.review).filter(x=>x.to==='approved').pop();const s=await d.doc('signoffs/'+ap.by+'/items/'+mid).get();return s.exists?s.data():null},mid);
ok('a sign-off is written under the approver, with a fingerprint',doc&&doc.hash&&doc.status==='approved',JSON.stringify(doc));
await p.evaluate(()=>__T.go('project'));await p.waitForTimeout(2500);
console.log('FLAG',await p.evaluate((mid)=>{const f=document.querySelector('.mcard[data-mid="'+mid+'"] .so-flag');return f?f.textContent+' / '+f.title:null},mid));ok('a signed approval shows no warning on the board',!(await p.$('.mcard[data-mid="'+mid+'"] .so-flag')));
// tamper: change the words straight in the database
await p.evaluate(async([mid])=>{const S=__T.S();const m=S.mats.find(x=>x.id===mid);const mods=JSON.parse(JSON.stringify(m.modules));mods[0].data.title='Edited behind the lock';const locked=await __T.Store.patchMaterial(S.pid,mid,{modules:mods}).then(()=>false,e=>e&&e.code==='locked');window.__lockRefused=locked;const db=await window.claude.use('db');await db.doc('projects/'+S.pid+'/materials/'+mid).update({modules:mods})},[mid]);
ok('the data layer refuses new content on an approved material',await p.evaluate(()=>window.__lockRefused===true));
await p.waitForTimeout(1500);await p.evaluate(()=>__T.rerender());await p.waitForTimeout(800);
ok('the board flags work changed after approval',/Changed after approval/.test(await p.textContent('.mcard[data-mid="'+mid+'"]')));
await p.click('.mcard[data-mid="'+mid+'"]');await p.waitForTimeout(1500);
ok('the editor says what happened',/Changed after it was approved/.test(await p.textContent('#stage')));
ok('the review lists it as something to fix',await p.evaluate(()=>__T.preflight(__T.mat()).list.some(x=>x[0]==='bad'&&/sign-off/.test(x[1]))));
// forged: status set to approved by a non-approver straight in the db, with no sign-off
await p.evaluate(()=>__T.go('project'));await p.waitForTimeout(600);
const mid2=await p.evaluate(()=>__T.S().mats.find(m=>m.status==='draft').id);
await p.evaluate(async(mid2)=>{const S=__T.S();await __T.Store.patchMaterial(S.pid,mid2,{status:'approved',review:{forge:{at:Date.now(),by:'u_intruder',kind:'status',to:'approved'}}})},mid2);
await p.waitForTimeout(1500);await p.evaluate(()=>__T.rerender());await p.waitForTimeout(1000);
ok('an approval with no sign-off is flagged',/Approval not signed/.test(await p.textContent('.mcard[data-mid="'+mid2+'"]')));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
