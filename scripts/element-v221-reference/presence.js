// who is here: two people on the same material see each other; the board marks open cards; no room = nothing shown
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1440,height:900}});const errs=[];const url='file://'+__dirname+'/test.html';
await ctx.route(/cdn\.jsdelivr\.net/,r=>r.abort());await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
const C=await ctx.newPage();C.on('pageerror',e=>errs.push('C '+e.message));await C.goto(url);await C.evaluate(()=>localStorage.clear());await C.reload();await C.waitForTimeout(1000);
await C.click('.sp-hero button:has-text("Open the example project")');await C.waitForTimeout(1200);
await C.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await C.waitForTimeout(1200);
const mid=await C.evaluate(()=>__T.mat().id);
ok('alone: no presence chips in the editor',!(await C.$('#ed-presence')));
// Dana opens the same material in another tab
const D=await ctx.newPage();D.on('pageerror',e=>errs.push('D '+e.message));await D.goto(url+'#as=dana');await D.waitForTimeout(1500);
await D.evaluate(()=>{const p=__T.S().projects[0];__T.go('project',p.id)});await D.waitForTimeout(1200);
const dot=await D.evaluate(mid=>{const el=document.querySelector('#view [data-mid="'+mid+'"] .pres-dot');return el?el.getAttribute('title'):null},mid);
ok('the board marks the card Chris has open (green = editing)',/Chris Moryl has this open now/.test(dot||''),dot);
const hd=await D.textContent('#proj-presence').catch(()=>null);
ok('the project header says who is on the project',/Chris is here/.test(hd||''),hd);
await D.evaluate(mid=>__T.go('editor',__T.S().pid,mid),mid);await D.waitForTimeout(1500);
const chipC=await C.evaluate(()=>{const e=document.getElementById('ed-presence');return e?{txt:e.textContent,aria:e.getAttribute('aria-label'),editing:!!e.querySelector('.pres-chip.editing')}:null});
const chipD=await D.evaluate(()=>{const e=document.getElementById('ed-presence');return e?{txt:e.textContent,aria:e.getAttribute('aria-label'),editing:!!e.querySelector('.pres-chip.editing')}:null});
ok('Chris sees Dana editing the same material',chipC&&/Dana/.test(chipC.txt)&&chipC.editing&&/Dana Reyes is editing/.test(chipC.aria),JSON.stringify(chipC));
ok('Dana sees Chris editing it',chipD&&/Chris/.test(chipD.txt)&&chipD.editing,JSON.stringify(chipD));
ok('my own other tabs are not listed as someone else',chipC&&!/Chris/.test(chipC.txt));
// Dana goes back to the board: the chip leaves Chris's editor
await D.evaluate(()=>__T.go('project'));await D.waitForTimeout(1200);
ok('the chip goes when they leave',!(await C.$('#ed-presence')));
// no room at all: nothing breaks, nothing shown
const N=await ctx.newPage();N.on('pageerror',e=>errs.push('N '+e.message));await N.goto(url+'#noroom=1');await N.waitForTimeout(1500);
await N.evaluate(mid=>__T.go('editor',__T.S().pid||__T.S().projects[0].id,mid),mid);await N.waitForTimeout(1200);
ok('without a room the editor shows no presence and no errors',!(await N.$('#ed-presence')));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
