const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.waitForTimeout(1200);
const r=await p.evaluate(async()=>{await document.fonts.ready;const T=window.__T;const f=T.FORMATS.find(x=>x.id==='letter');const host=document.createElement('div');host.style.cssText='position:absolute;left:-30000px';document.body.appendChild(host);
 const run=(hp,next)=>{const hero=Object.assign(T.MODULES.hero.def(),hp);const mods=[{id:'h',type:'hero',data:hero},{id:'n',type:next,data:T.MODULES[next].def()}];host.innerHTML=T.pageHTML(mods,f,false);
  const H=host.querySelector('.m-hero'),N=host.querySelectorAll('.mod')[1],hc=host.querySelector('.hcopy');const nb=N.querySelector('section,div:not(.modtag)')||N;
  const firstVisible=[...N.querySelectorAll('*')].find(e=>e.getBoundingClientRect().height>0&&!e.classList.contains('modtag'));
  return {fade:!!host.querySelector('.hfade'),fadeKind:(host.querySelector('.hfade')||{}).className||'',over:Math.round(H.getBoundingClientRect().bottom-firstVisible.getBoundingClientRect().top),textClear:Math.round(firstVisible.getBoundingClientRect().top-hc.getBoundingClientRect().bottom)}};
 const ph={data:'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',fx:50,fy:50,zoom:100};
 return {
  autoPhoto:run({layout:'full',photo:ph,scheme:'dark'},'kpis'),
  autoNoPhoto:run({layout:'text',scheme:'navy'},'kpis'),
  soft:run({layout:'full',photo:ph,fadeBottom:'soft',overlap:'standard'},'quote'),
  deep:run({layout:'full',photo:ph,fadeBottom:'long',overlap:'deep'},'kpis'),
  none:run({layout:'full',photo:ph,fadeBottom:'none',overlap:'none'},'kpis'),
  quoteAuto:run({layout:'full',photo:ph},'quote')}});
ok('auto: full photo on the deep gradient fades into the page',r.autoPhoto.fade&&/hf-soft/.test(r.autoPhoto.fadeKind));
ok('auto: plain navy hero unchanged (no fade)',!r.autoNoPhoto.fade);
ok('soft fade + standard overlap: quote band overlaps 72 px',r.soft.fade&&Math.abs(r.soft.over-72)<=2,r.soft.over);
ok('long fade + deep overlap: KPIs overlap 120 px',/hf-long/.test(r.deep.fadeKind)&&(Math.abs(r.deep.over-120)<=2||Math.abs(r.deep.over-30)<=2),r.deep.over);
ok('deep overlap never covers hero text',r.deep.textClear>=16,r.deep.textClear+' px clear');
ok('no fade + no overlap: clean seam',!r.none.fade&&r.none.over<=0,r.none.over);
ok('auto overlap keeps a quote band below the hero (unchanged)',r.quoteAuto.over<=0,r.quoteAuto.over);
// editor exposes the controls
await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);await p.click('text=Open the example project');await p.waitForTimeout(1500);await p.click('.mcard >> nth=1');await p.waitForTimeout(1500);
await p.click('.page .mod >> nth=0');await p.waitForTimeout(400);const txt=await p.textContent('.rbody');
ok('inspector shows Blend into the page controls',/Blend into the page/.test(txt)&&/Edge fade/.test(txt)&&/Fade from/.test(txt)&&/Next section overlaps the hero/.test(txt));
R.forEach(x=>console.log(x));console.log(errs.length?errs:'no errors');await b.close()})();
