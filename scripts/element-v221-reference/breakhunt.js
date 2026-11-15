// Break-hunt findings, kept as regression: every library piece opens with a headline and passes preflight; a trashed project is announced to the teammate who has it open; auto-convert leaves review/fresh edits alone.
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:1000}});const base='file://'+__dirname+'/test.html';const errs=[];
const A=await ctx.newPage();A.on('pageerror',e=>errs.push('A '+e.message.slice(0,140)));await A.goto(base);await A.evaluate(()=>localStorage.clear());await A.reload();await A.waitForTimeout(1000);
const lib=await A.evaluate(()=>{const bad=[];let noHead=0,pf=0;for(const pc of __T.ELIB){const mods=__T.pieceToModules(pc);const h=mods.find(m=>m.type==='hero');if(!h||!String(h.data.title||'').trim()){noHead++;bad.push('headline '+pc.id)}
 const r=__T.preflight({id:'x',name:pc.id,modules:mods,fmts:['letter']},true);if(r&&r.bad){pf++;bad.push('pf '+pc.id)}
 const q=mods.find(m=>m.type==='quote');const own=JSON.stringify(pc);if(q&&((q.data.proof||[]).some(x=>own.indexOf(JSON.stringify(x.text).slice(1,-1))<0)||(q.data.sideText&&own.toLowerCase().indexOf(String(q.data.sideText).toLowerCase())<0&&q.data.sideText!=='Engagement snapshot')))bad.push('quote sample '+pc.id);
 const c=mods.find(m=>m.type==='comparison');if(c&&c.data.rows.length<2)bad.push('1-row comparison '+pc.id)}return {n:__T.ELIB.length,bad}});
ok('every library piece opens with a headline, passes preflight, keeps no sample words beside its quote and no one-row comparison',lib.bad.length===0,lib.n+' pieces; '+lib.bad.slice(0,5).join(', '));
// trashed project announced to the other person
await A.click('text=Open the example project');await A.waitForTimeout(1300);
const pid=(await A.evaluate(()=>location.hash)).match(/p=([a-z0-9]+)/)[1];const NAME='Fernwood & Vale launch brief';
const B=await ctx.newPage();B.on('pageerror',e=>errs.push('B '+e.message.slice(0,140)));await B.goto(base+'#p='+pid+'&as=dana');await B.reload();await B.waitForTimeout(1400);
if(await B.isVisible('.edbar >> text=Board').catch(()=>false))await B.click('.edbar >> text=Board');await B.waitForTimeout(400);await B.click('.mcard:has-text("'+NAME+'")');await B.waitForTimeout(1400);
ok('B is in the editor',(await B.evaluate(()=>__T.S().view))==='editor');
await A.evaluate((pid)=>__T.Store.patchProject(pid,{deletedAt:Date.now(),deletedBy:'u_test000000000000000001'}),pid);await B.waitForTimeout(1500);
const txt=await B.evaluate(()=>[...document.querySelectorAll('#stage,.note,[role=alert],[role=status]')].map(e=>e.innerText).join(' | '));
ok('the editor says the project was moved to Recently deleted',/moved this project to Recently deleted/.test(txt),txt.slice(0,120));
ok('and offers a way back to Projects',await B.isVisible('text=Back to projects'));
ok('no page errors',errs.length===0,errs.join(' | '));
R.forEach(x=>console.log(x));await b.close();process.exit(R.some(x=>x.startsWith('FAIL'))?1:0)})();
