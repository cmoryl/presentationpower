/* Several people, every role, every area. Five people share one workspace: the owner (Chris), a reviewer (Dana),
   two editors (Priya, Yuki) and a viewer (Sam, view access only). Each tries the same things:
   1. every stage change, from every stage (the full matrix), checked against the rules: one stage at a time; only the
      owner or a reviewer approves, asks for changes, delivers or reopens approved work; a viewer changes nothing
   2. editing words, on a draft and on work in review
   3. the areas of the app: Projects, a project's board, the Library, Spectrum templates, Modules, Help
   4. two editors at once on one material
   5. approvals: who signed, and whether the page still matches what was signed, as each other person sees it */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e&&e.stack||e).slice(0,500));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:1000}});const url='file://'+__dirname+'/test.html';const errs=[];
const open=async(who)=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(who+' '+e.message.slice(0,90)+' @ '+String(e.stack||'').split('\n').slice(1,4).map(l=>l.trim().replace(/file:.*test.html/,'')).join(' < ')));await p.goto(url+(who==='chris'?'':'#as='+who));return p};
const C=await open('chris');await C.evaluate(()=>localStorage.clear());await C.reload();await C.waitForTimeout(1000);
await C.click('.sp-hero button:has-text("Open the example project")');await C.waitForTimeout(1600);
const pid=await C.evaluate(()=>__T.S().pid);const NAME='Fernwood & Vale case study';
const IDS={chris:'u_test000000000000000001',dana:'u_test000000000000000002',priya:'u_test000000000000000003',sam:'u_test000000000000000005',yuki:'u_test000000000000000006'};
const dbAll=()=>C.evaluate(()=>JSON.parse(localStorage.getItem('mockdb')));
const matKey=async()=>{const d=await dbAll();return Object.keys(d).find(k=>d[k].name===NAME)};const MK=await matKey();const mid=MK.split('/').pop();
const mat=async()=>(await dbAll())[MK];
/* (the change is made under the store's own lock: written bare, it was lost whenever another page's write was in
   flight at that instant, and the next "from draft" try then ran against a material still in review) */
const poke=(fn,arg)=>C.evaluate(({k,fn,arg})=>{const run=()=>{const d=JSON.parse(localStorage.getItem('mockdb'));(new Function('m','arg',fn))(d[k],arg);localStorage.setItem('mockdb',JSON.stringify(d))};return navigator.locks&&navigator.locks.request?navigator.locks.request('mockdb',run):run()},{k:MK,fn,arg});
// the owner names Dana a reviewer
await C.evaluate(({pid,dana})=>__T.Store.patchProject(pid,{reviewers:[dana]}),{pid,dana:IDS.dana});await C.waitForTimeout(600);
const proj=Object.values(await dbAll()).find(v=>v.reviewers);ok('the owner names a reviewer',proj&&proj.reviewers[0]===IDS.dana&&proj.ownerId===IDS.chris);
const P={chris:C};for(const w of ['dana','priya','sam','yuki']){P[w]=await open(w)}
const enter=async(p)=>{await p.reload();await p.waitForTimeout(650);await p.evaluate((pid)=>__T.go('project',pid,null),pid);await p.waitForTimeout(500)};
const ROLE={chris:'owner',dana:'reviewer',priya:'editor',sam:'viewer'};
for(const w of Object.keys(ROLE)){await enter(P[w])}
const roles={};for(const w of Object.keys(ROLE)){roles[w]=await P[w].evaluate(()=>({role:__T.roleIn(__T.S().projects.find(x=>x.id===__T.S().pid)),ro:document.body.classList.contains('ro'),bar:!!document.getElementById('robar')}))}
ok('each person is who the project says: owner, reviewer, editor',roles.chris.role==='owner'&&roles.dana.role==='reviewer'&&roles.priya.role==='editor',JSON.stringify(roles));
ok('the viewer is told the page is view only; nobody else is',roles.sam.ro&&roles.sam.bar&&!roles.chris.ro&&!roles.dana.ro&&!roles.priya.ro);

/* ---- 1. the stage matrix ---- */
const STAGES=['draft','review','changes','approved','delivered'];const NEXT={draft:['review'],review:['changes','approved'],changes:['review'],approved:['delivered'],delivered:[]};const RANK={draft:0,changes:0,review:1,approved:2,delivered:3};const GATED=['approved','delivered','changes'];
const expect=(role,from,to)=>{if(role==='viewer')return false;if(from===to)return false;if(RANK[to]>RANK[from]&&NEXT[from].indexOf(to)<0)return false;if(from==='draft'&&to==='changes')return false;/* changes are asked for once work is in review */const needs=GATED.indexOf(to)>=0||from==='approved'||from==='delivered';if(needs&&role==='editor')return false;return true};
const wrong=[];let cells=0,allowed=0,fresh='';
for(const w of Object.keys(ROLE)){for(const from of STAGES){for(const to of STAGES){if(from===to)continue;cells++;
 const p=P[w];
 /* the material is put back (and the person's page reloaded) only when the last try changed something */
 if(fresh!==w+from){await poke("m.status=arg;m.contentBy='u_someone_else';m.updatedAt=Date.now()",from);await enter(p);fresh=w+from}
 await p.evaluate(async({mid,to})=>{const S=__T.S();const m=S.mats.find(x=>x.id===mid);try{await __T.setStatus(m,to)}catch(e){}},{mid,to});await p.waitForTimeout(350);
 // a confirmation may be asked for a gated move
 if(await p.isVisible('#confirm-stage').catch(()=>false)){await p.click('#confirm-stage').catch(()=>{});await p.waitForTimeout(400)}
 const got=(await mat()).status===to;const want=expect(ROLE[w],from,to);if(got){allowed++;fresh=''}if(got!==want)wrong.push(ROLE[w]+' '+from+'>'+to+' '+(got?'went through':'was refused'));
 await p.keyboard.press('Escape').catch(()=>{})}}}
ok('every stage change by every role follows the rules ('+cells+' combinations, '+allowed+' allowed)',wrong.length===0,wrong.slice(0,8).join(' | ')||'all as expected');
const denied=await P.sam.evaluate(()=>window.__denied);ok('the viewer never even tried a write the server would refuse',denied===0,String(denied));

/* ---- 2. editing words ---- */
const typeIn=async(p,text)=>{await p.evaluate((mid)=>__T.go('editor',__T.S().pid,mid),mid);await p.waitForTimeout(1300);await p.click('.page .mod >> nth=0').catch(()=>{});await p.waitForTimeout(350);
 return p.evaluate((text)=>{const t=document.querySelector('.rbody textarea');if(!t)return 'no field';if(t.disabled||t.readOnly)return 'locked';t.value=text;t.dispatchEvent(new Event('input',{bubbles:true}));return 'typed'},text)};
const has=async(text)=>JSON.stringify((await mat()).modules).includes(text);
await poke("m.status='draft'");
for(const [w,exp] of [['priya',true],['dana',true],['chris',true],['sam',false]]){await enter(P[w]);const r=await typeIn(P[w],'Words by '+w);await P[w].waitForTimeout(1600);const saved=await has('Words by '+w);ok('a draft: '+ROLE[w]+(exp?' edits the words and they are saved':' cannot change the words'),saved===exp,r+' saved='+saved)}
await poke("m.status='review';m.contentBy='u_someone_else'");await enter(P.priya);const lockR=await typeIn(P.priya,'Edit during review');await P.priya.waitForTimeout(1200);
ok('in review: an editor finds the words locked',lockR==='locked'&&!(await has('Edit during review')),lockR);

/* ---- 3. the areas ---- */
const area=async(p)=>{const o={};await p.evaluate(()=>__T.go('home'));await p.waitForTimeout(900);o.newProject=await p.evaluate(()=>{const b=[...document.querySelectorAll('#view button')].find(x=>/New project/.test(x.textContent));return !!b&&!b.disabled&&b.offsetParent!==null});
 await p.evaluate((pid)=>__T.go('project',pid,null),pid);await p.waitForTimeout(900);o.board=await p.locator('.mcard').count();o.newMaterial=await p.evaluate(()=>{const b=[...document.querySelectorAll('#view button')].find(x=>/New material/.test(x.textContent));return !!b&&!b.disabled&&b.offsetParent!==null});
 await p.click('#view button:has-text("Edit project")').catch(()=>{});await p.waitForTimeout(500);o.deleteProject=await p.isVisible('text=Delete project').catch(()=>false);await p.keyboard.press('Escape');await p.waitForTimeout(200);if(await p.isVisible('.modal button:has-text("Cancel")').catch(()=>false))await p.click('.modal button:has-text("Cancel")').catch(()=>{});
 await p.click('#appnav button[data-sec="library"]');await p.waitForTimeout(1500);o.libCards=await p.locator('.el-card').count();await p.click('.el-card >> nth=0');await p.waitForTimeout(700);o.rebuild=await p.isVisible('#el-rebuild').catch(()=>false);await p.keyboard.press('Escape');await p.waitForTimeout(300);
 await p.click('#appnav button[data-sec="spectrum"]');await p.waitForTimeout(1500);o.templates=await p.evaluate(()=>document.querySelectorAll('#view .gl').length);
 await p.click('#appnav button[data-sec="modules"]');await p.waitForTimeout(1500);o.modules=await p.evaluate(()=>document.querySelectorAll('#view .gl').length);
 await p.click('#appnav button[data-sec="help"]');await p.waitForTimeout(900);o.help=await p.evaluate(()=>document.querySelector('#view').textContent.length>500);return o};
const A={};for(const w of Object.keys(ROLE)){A[w]=await area(P[w])}
const everyone=Object.keys(ROLE);
ok('everyone can read every area: board, Library, Spectrum templates, Modules, Help',everyone.every(w=>A[w].board>=4&&A[w].libCards>10&&A[w].templates>=10&&A[w].modules>=8&&A[w].help),JSON.stringify(Object.fromEntries(everyone.map(w=>[ROLE[w],[A[w].board,A[w].libCards,A[w].templates,A[w].modules,A[w].help]]))));
ok('only the owner is offered Delete project',A.chris.deleteProject&&!A.dana.deleteProject&&!A.priya.deleteProject&&!A.sam.deleteProject,JSON.stringify(everyone.map(w=>A[w].deleteProject)));
ok('owner, reviewer and editor can start projects and materials and rebuild from the Library',['chris','dana','priya'].every(w=>A[w].newProject&&A[w].newMaterial&&A[w].rebuild),JSON.stringify(['chris','dana','priya'].map(w=>[A[w].newProject,A[w].newMaterial,A[w].rebuild])));
ok('the viewer is not offered a Library rebuild',!A.sam.rebuild,JSON.stringify(A.sam));
// the viewer pressing "New project" or "New material" writes nothing
const before=Object.keys(await dbAll()).length;
await P.sam.evaluate(()=>__T.go('home'));await P.sam.waitForTimeout(700);await P.sam.click('#view button:has-text("New project")',{timeout:1500}).catch(()=>{});await P.sam.waitForTimeout(500);
if(await P.sam.isVisible('#np-name').catch(()=>false)){await P.sam.fill('#np-name','Viewer project');await P.sam.click('button:has-text("Create project")').catch(()=>{});await P.sam.waitForTimeout(900)}
await P.sam.keyboard.press('Escape');
ok('a viewer who tries to start a project creates nothing',Object.keys(await dbAll()).length===before&&!Object.values(await dbAll()).some(v=>v.name==='Viewer project'),(Object.keys(await dbAll()).length-before)+' new records');

/* ---- 4. two editors at once ---- */
await poke("m.status='draft'");await enter(P.priya);await enter(P.yuki);
const edit=async(p,nth,text)=>{await p.evaluate((mid)=>__T.go('editor',__T.S().pid,mid),mid);await p.waitForTimeout(1300);return p.evaluate(({nth,text})=>{const m=__T.mat();const mods=m.modules.filter(x=>x.type!=='pagebreak');const t=mods[nth];const k=['title','lead','caption','text'].find(k=>typeof t.data[k]==='string')||Object.keys(t.data).find(k=>typeof t.data[k]==='string'&&t.data[k].length>8);t.data[k]=text;return __T.Store.patchMaterial(__T.S().pid,m.id,{modules:m.modules,contentAt:Date.now(),contentBy:'x'}).then(()=>t.type+'.'+k,e=>'ERR '+(e&&e.message))},{nth,text})};
await P.priya.evaluate((mid)=>__T.go('editor',__T.S().pid,mid),mid);await P.yuki.evaluate((mid)=>__T.go('editor',__T.S().pid,mid),mid);await P.priya.waitForTimeout(1400);
// each types in a different module through the editor, a moment apart
const typeMod=async(p,nth,text)=>{await p.click('.page .mod >> nth='+nth).catch(()=>{});await p.waitForTimeout(350);return p.evaluate((text)=>{const t=document.querySelector('.rbody textarea');if(!t||t.disabled)return 'locked';t.value=text;t.dispatchEvent(new Event('input',{bubbles:true}));return 'typed'},text)};
const r1=await typeMod(P.priya,0,'Priya wrote the headline');const r2=await typeMod(P.yuki,2,'Yuki wrote this part');await P.priya.waitForTimeout(2600);
const both=[await has('Priya wrote the headline'),await has('Yuki wrote this part')];
ok('two editors in different modules at once: both changes are kept',both[0]&&both[1],r1+'/'+r2+' kept='+JSON.stringify(both));
await P.priya.waitForTimeout(1200);
const seen=await P.priya.evaluate(()=>JSON.stringify(__T.mat().modules).includes('Yuki wrote this part'));
ok('…and each sees the other\'s change without reloading',seen);

// the same field at once: the second person is asked, nothing is overwritten silently
const c1=await typeMod(P.priya,0,'Priya headline two');const c2=await typeMod(P.yuki,0,'Yuki headline two');await P.priya.waitForTimeout(2600);
const asked=await P.yuki.evaluate(()=>/saved changes to this material while you were editing/.test(document.querySelector('#stage').textContent)&&[...document.querySelectorAll('#stage button')].some(b=>/Merge both/.test(b.textContent)));
ok('two editors in the same field at once: the second is asked what to keep, and the first one\'s words stay saved',asked&&await has('Priya headline two')&&!(await has('Yuki headline two')),c1+'/'+c2+' asked='+asked);
await P.yuki.evaluate(()=>{const b=[...document.querySelectorAll('#stage button')].find(b=>/Load their version/.test(b.textContent));if(b)b.click()});await P.yuki.waitForTimeout(800);

/* ---- notes and deleting ---- */
for(const w of ['chris','dana','priya','sam']){await enter(P[w])}
const note=async(p,w,fn)=>p.evaluate(async({mid,w,fn})=>{const m=__T.S().mats.find(x=>x.id===mid);try{await __T[fn](m,'Note from '+w);return 'ok'}catch(e){return 'refused'}},{mid,w,fn});
const nr={priya:await note(P.priya,'priya','addNote'),dana:await note(P.dana,'dana','addNote'),sam:await note(P.sam,'sam','postComment')};await C.waitForTimeout(900);await enter(C);await C.waitForTimeout(600);
const thread=await C.evaluate((mid)=>__T.reviewList(__T.S().mats.find(x=>x.id===mid)).map(x=>x.text||'').join(' | '),mid);
ok('editor, reviewer and viewer can each leave a note, and the owner sees all three',/Note from priya/.test(thread)&&/Note from dana/.test(thread)&&/Note from sam/.test(thread),JSON.stringify(nr)+' :: '+thread.slice(-120));
ok('the viewer\'s note was the only thing the viewer wrote',await P.sam.evaluate(()=>window.__denied)===0);
const del={};for(const w of ['chris','dana','priya','sam']){del[w]=await P[w].evaluate((mid)=>__T.canDeleteMat(__T.S().mats.find(x=>x.id===mid)),mid)}
ok('only the owner may delete a material someone else made',del.chris===true&&!del.dana&&!del.priya&&!del.sam,JSON.stringify(del));

/* ---- 5. approvals, as each other person sees them ---- */
const flag=async(p)=>{await enter(p);await p.waitForTimeout(1500);return p.evaluate((mid)=>{const f=document.querySelector('.mcard[data-mid="'+mid+'"] .so-flag');return f?f.textContent:''},mid)};
await poke("m.status='review';m.contentBy='u_someone_else'");await enter(P.dana);
await P.dana.evaluate(async({mid})=>{const S=__T.S();await __T.setStatus(S.mats.find(x=>x.id===mid),'approved')},{mid});await P.dana.waitForTimeout(500);if(await P.dana.isVisible('#confirm-stage').catch(()=>false)){await P.dana.click('#confirm-stage');}await P.dana.waitForTimeout(900);
ok('the reviewer approves',(await mat()).status==='approved');
const so=await C.evaluate(async({k})=>{const s=await __T.Store.raw().doc(k).get();return s.exists?s.data():null},{k:'signoffs/'+IDS.dana+'/items/'+mid});
ok('the approval is signed under the reviewer\'s own name, with a fingerprint',!!so&&!!so.hash&&so.status==='approved',JSON.stringify(so&&{s:so.status,h:!!so.hash}));
const f1=[await flag(C),await flag(P.priya),await flag(P.sam)];ok('owner, editor and viewer all see a clean approval',f1.every(x=>x===''),JSON.stringify(f1));
// someone changes the words behind the approval's back
await poke("m.modules[0].data.title='Changed after sign-off'");
const f2=[await flag(C),await flag(P.dana),await flag(P.sam)];ok('words changed after approval: everyone is told, the viewer included',f2.every(x=>/Changed after approval/.test(x)),JSON.stringify(f2));
// an editor marks work approved without the right to
await poke("m.status='approved';m.review=m.review||{};m.review['zz'+Date.now()]={kind:'status',to:'approved',by:arg,at:Date.now()}",IDS.priya);
const f3=[await flag(C),await flag(P.dana)];ok('an approval recorded by someone who cannot approve is flagged',f3.every(x=>x!==''),JSON.stringify(f3));
ok('no page errors for anyone',errs.length===0,errs.slice(0,3).join(' | '));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
