const {chromium}=require('playwright');process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:1000}});const url='file://'+__dirname+'/test.html';const errs=[];
const C=await ctx.newPage();C.on('pageerror',e=>errs.push('C '+e.message));await C.goto(url);await C.evaluate(()=>localStorage.clear());await C.reload();await C.waitForTimeout(900);
await C.click('text=Open the example project');await C.waitForTimeout(1500);
const db=(p)=>p.evaluate(()=>JSON.parse(localStorage.getItem('mockdb')));const mat=async(p,n)=>Object.values(await db(p)).find(v=>v.name===n);const NAME='Fernwood & Vale case study';
const projUrl=await C.evaluate(()=>location.href);
// Dana: editor (not owner, not reviewer)
const D=await ctx.newPage();D.on('pageerror',e=>errs.push('D '+e.message));await D.goto(url+'#as=dana');await D.waitForTimeout(1500);
if(await D.isVisible('.edbar >> text=Board'))await D.click('.edbar >> text=Board');
if(!(await D.isVisible('.mcard'))){await D.click('.job:not(.job-h) >> nth=0').catch(()=>{});}await D.waitForTimeout(1200);
ok('editor sees the board',await D.isVisible('.mcard'));
ok('editor: Delete project not offered',!(await D.isVisible('text=Delete project')));
await D.dragAndDrop('.mcard:has-text("'+NAME+'")','.col >> nth=3');await D.waitForTimeout(1200);
ok('editor cannot approve by drag',(await mat(C,NAME)).status==='review',(await mat(C,NAME)).status);
ok('editor told why',(await D.textContent('body')).includes('Only the project owner or a reviewer'));
await D.click('.mcard:has-text("'+NAME+'")');await D.waitForTimeout(1500);
ok('editor sees "Waiting for a reviewer" instead of Approve',await D.isVisible('text=Waiting for a reviewer')&&!(await D.isVisible('.edbar button:text-is("Approve")')));
ok('editor: Approved option disabled in status menu',await D.$eval('#ed-status option[value=approved]',o=>o.disabled));
await D.click('.page .mod >> nth=0');await D.waitForTimeout(300);const tid=await D.$eval('.rbody textarea',e=>e.id);// content is locked while in review (99k-review-mode.js): the fields are read-only and Withdraw is offered
ok('editor: content locked while in review',await D.$eval('#'+tid,e=>e.disabled)&&await D.isVisible('#rvm-withdraw'));
await D.click('.rtabs button >> nth=2');await D.waitForTimeout(300);ok('editor: Delete material hidden (not creator)',!(await D.isVisible('text=Delete material')));
// Chris adds Dana as reviewer
await C.reload();await C.waitForTimeout(1500);if(await C.isVisible('.edbar >> text=Board'))await C.click('.edbar >> text=Board');await C.waitForTimeout(600);
await C.click('text=Brief');await C.waitForTimeout(500);await C.fill('#rv-add','Dana');await C.waitForTimeout(500);await C.click('.people li button:has-text("Dana")');await C.click('text=Add reviewer');await C.waitForTimeout(1200);
const p=Object.values(await db(C)).find(v=>v.reviewers);ok('owner adds reviewer',p&&p.reviewers.length===1,JSON.stringify(p&&p.reviewers));
await D.waitForTimeout(800);await D.click('.edbar >> text=Board');await D.waitForTimeout(800);await D.click('.mcard:has-text("'+NAME+'")');await D.waitForTimeout(1200);
ok('reviewer now sees Approve',await D.isVisible('.edbar button:text-is("Approve")'));await D.waitForTimeout(1300);await D.click('.edbar button:text-is("Approve")',{timeout:3000}).catch(()=>{});await D.click('#confirm-stage',{timeout:3000}).catch(()=>{});console.log('D ids', await D.evaluate(()=>JSON.parse(localStorage.getItem('mockdb'))) .then(d=>JSON.stringify(Object.values(d).filter(v=>v.ownerId).map(v=>[v.ownerId,v.reviewers]))));await D.waitForTimeout(1500);
ok('reviewer can approve',(await mat(C,NAME)).status==='approved',(await mat(C,NAME)).status);
// view-only
const V=await ctx.newPage();V.on('pageerror',e=>errs.push('V '+e.message));await V.goto(url+'#level=interact');await V.waitForTimeout(1800);
if(await V.isVisible('.edbar >> text=Board'))await V.click('.edbar >> text=Board');await V.waitForTimeout(600);if(!(await V.isVisible('.mcard'))){await V.click('.job:not(.job-h) >> nth=0').catch(()=>{});await V.waitForTimeout(1200)}
ok('view-only banner shown',await V.isVisible('#robar'));
await V.click('.mcard:has-text("'+NAME+'")');await V.waitForTimeout(1500);await V.click('.page .mod >> nth=0');await V.waitForTimeout(300);
const before=JSON.stringify((await mat(C,NAME)).modules);
await V.evaluate(()=>{const t=document.querySelector('.rbody textarea');t.value='Viewer typed';t.dispatchEvent(new Event('input',{bubbles:true}))});await V.waitForTimeout(1500);
ok('view-only: edit reverted locally',!(await V.textContent('.page')).includes('Viewer typed'));
ok('view-only: nothing written',JSON.stringify((await mat(C,NAME)).modules)===before);
ok('view-only: no write even attempted (server never had to refuse)',await V.evaluate(()=>window.__denied)===0);
ok('view-only: status menu locked, no next action',await V.$eval('#ed-status',s=>s.disabled)&&!(await V.isVisible('.edbar .btn.primary')));
await V.dragAndDrop('.edbar >> text=Board','.edbar >> text=Board').catch(()=>{});
// server rule backstop: force a write past the UI
const forced=await V.evaluate(async()=>{const d=await window.claude.use('db');try{await d.doc('projects/x').set({a:1});return 'written'}catch(e){return e.code}});
ok('server rule refuses a forced write',forced==='permission_denied',forced);
R.forEach(x=>console.log(x));console.log(errs.length?errs:'no errors');await b.close()})();
