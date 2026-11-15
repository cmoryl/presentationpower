/* Rebuild in ELEMENT: a library piece opened in the editor holds only its own words. An optional line the curator left
   empty (a statement's sub-line, number and gradient words) used to be filled again with the module's sample words
   when the material was opened. */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
await p.click('button:has-text("New project")');await p.waitForTimeout(400);await p.fill('#np-name','Rebuild test');await p.click('button:has-text("Create project")');await p.waitForTimeout(1300);
await p.click('.lay-card[data-layout="Multi-page Brief"]');await p.click('button:has-text("Create and open")');await p.waitForTimeout(2000);
// three pieces whose layout has a statement divider (the hero's line, or a single proof point)
const ids=await p.evaluate(()=>{const out=[];for(const pc of __T.ELIB){if(out.length>=3)break;const m=__T.pieceToSpectrum(pc);if(m.some(x=>x.type==='divider'&&!x.data.sub)&&!__T.pieceIsMulti(pc))out.push(pc.id)}return out});
ok('pieces with a statement to try',ids.length===3,ids.join(', '));
for(const id of ids){
 await p.click('#appnav button:has-text("Library")');await p.waitForTimeout(800);await p.fill('input[type=search]',await p.evaluate(id=>__T.ELIB.find(e=>e.id===id).title,id));await p.waitForTimeout(700);
 await p.click('.el-card >> nth=0');await p.waitForTimeout(500);await p.click('#el-rebuild');await p.waitForTimeout(500);await p.click('#rb-go');await p.waitForTimeout(2500);
 const r=await p.evaluate((id)=>{const pc=__T.ELIB.find(q=>q.id===id);const own=JSON.stringify(pc);const SAMPLE={};Object.keys(__T.MODULES).forEach(k=>{try{const walk=v=>{if(typeof v==='string'){if(v.length>=14&&/\s/.test(v))SAMPLE[v]=k}else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)};walk(__T.MODULES[k].def())}catch(e){}});
  const leaks=[];__T.mat().modules.forEach(m=>{if(m.type==='cta'||m.type==='footer')return;const walk=v=>{if(typeof v==='string'){if(SAMPLE[v]&&own.indexOf(v)<0)leaks.push(m.type+': '+v.slice(0,40))}else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)};walk(m.data)});
  const dv=__T.mat().modules.filter(m=>m.type==='divider'&&!m.data.eyebrow.match(/section|part/i));
  const norm=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();const ownN=norm(own);const st=__T.mat().modules.filter(m=>m.type==='divider'&&!m.data.num&&!m.data.eyebrow);
  return {leaks,strange:[...document.querySelectorAll('#stage .dv-sub')].map(e=>e.textContent).filter(t=>ownN.indexOf(norm(t))<0).map(t=>t.slice(0,40)),statements:st.length,stSub:st.map(m=>m.data.sub||'').join('')}},id);
 ok(id+': opened in the editor, no module holds sample words',r.leaks.length===0,r.leaks.slice(0,2).join(' | ')||'clean');
 ok(id+': every line under a divider is the piece\'s own',r.statements>0&&r.strange.length===0,JSON.stringify({statements:r.statements,strange:r.strange}));
}
ok('no page errors',errs.length===0,errs.join(' | ').slice(0,200));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
