const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:1000}});const url='file://'+__dirname+'/test.html';
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);
await p.click('text=Open the example project');await p.waitForTimeout(1500);await p.click('.mcard >> text=Fernwood & Vale case study');await p.waitForTimeout(1500);
await p.click('.page .mod >> nth=0');await p.waitForTimeout(300);await p.click('#ctb button:text-is("Full")');await p.waitForTimeout(300);
await p.setInputFiles('.imgpick input[type=file]',__dirname+'/pa.jpg');await p.waitForTimeout(2200);
await p.click('.rtabs button >> nth=2');await p.waitForTimeout(500);
ok('content check offered in Review',await p.isVisible('#cr-run'));
await p.click('#cr-run');await p.waitForTimeout(2500);
const calls=await p.evaluate(()=>window.__sampleCalls);
ok('one call, with the brief and proof points in the prompt',calls.length===1&&calls[0].hasProof,JSON.stringify(calls));
ok('placed photo sent for an imagery verdict',calls[0].images===1,calls[0].images);
const t=await p.textContent('.cr-out');
ok('summary and 4 scores shown',/buries the result/.test(t)&&(await p.$$('.cr-s')).length===4);
ok('issues, unsupported claims, imagery and medium advice rendered',/What to fix/.test(t)&&/Claims the brief doesn't back/.test(t)&&/doesn't fit/.test(t)&&/By medium/.test(t));
ok('script in Claude\'s reply is shown as text, never run',await p.evaluate(()=>window.__pwn===undefined)&&t.includes('<img src=x'));
ok('no Apply for a field that does not exist',(await p.$$('.cr-i.sev-low button:text-is("Apply")')).length===0);
await p.click('.cr-i.sev-high button:text-is("Apply")');await p.waitForTimeout(1600);
const title=()=>p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('mockdb'))).find(v=>v.name==='Fernwood & Vale case study').modules[0].data);
ok('Apply rewrites the field and saves',(await title()).title==='Aēsop cut localization time from 3 months to 10 days',(await title()).title);
await p.click('[aria-label=Undo]');await p.waitForTimeout(1600);ok('Apply is undoable',(await title()).title!=='Aēsop cut localization time from 3 months to 10 days');
await p.click('.rtabs button >> nth=2');await p.waitForTimeout(400);
await p.click('button:text-is("Use as short title")');await p.waitForTimeout(1600);ok('medium advice can set the short title',(await title()).short==='10 days, not 3 months');
const saved=await p.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('mockdb'))).find(v=>v.name==='Fernwood & Vale case study').aiReview);
ok('review stored on the material for the team',saved&&saved.result&&saved.result.scores.proof===91);
await p.reload();await p.waitForTimeout(1800);await p.click('.rtabs button >> nth=2');await p.waitForTimeout(500);
ok('stored review shown after reload, marked out of date after edits',/The copy has changed since/.test(await p.textContent('.cr-out')));
// errors and absence
const q=await ctx.newPage();await q.goto(url+'#samplefail=rate_limited');await q.waitForTimeout(1500);if(await q.evaluate(()=>__T.S().view)==='about'){await q.evaluate(()=>{const S=__T.S();__T.go('project',S.projects[0].id,null)});await q.waitForTimeout(1200)} // a new tab with work waiting opens Get started (retention round 2)
if(!(await q.isVisible('.rtabs')))await q.click('.mcard >> nth=1').catch(()=>{});await q.waitForTimeout(1200);
await q.click('.rtabs button >> nth=2');await q.waitForTimeout(300);await q.click('#cr-run');await q.waitForTimeout(1500);
ok('rate limit explained in plain words',/Wait a minute and try again/.test(await q.textContent('.cr-out')));
const n=await ctx.newPage();await n.goto(url+'#nosample');await n.waitForTimeout(1500);if(await n.evaluate(()=>__T.S().view)==='about'){await n.evaluate(()=>{const S=__T.S();__T.go('project',S.projects[0].id,null)});await n.waitForTimeout(1200)}if(!(await n.isVisible('.rtabs')))await n.click('.mcard >> nth=1').catch(()=>{});await n.waitForTimeout(1200);
await n.click('.rtabs button >> nth=2');await n.waitForTimeout(300);
const ct=await n.textContent('.creview').catch(e=>'ERR '+e.message.slice(0,80));ok('without Claude: feature explained, no dead button',!(await n.isVisible('#cr-run'))&&/opened in Claude/.test(ct),ct+' btn='+(await n.isVisible('#cr-run')));
R.forEach(x=>console.log(x));console.log(errs.length?errs:'no errors');await b.close()})();
