/* Spectrum is the only look: the project page no longer offers a per-project Look switch (it stays in the code,
   hidden, for materials made before). This suite used to drive that dialog; it now checks it stays out of the way. */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('button:has-text("Open the example project")');await p.waitForTimeout(2000);
const st=await p.evaluate(()=>{const e=document.getElementById('spx-proj');return {shown:!!e&&getComputedStyle(e).display!=='none',acts:[...document.querySelectorAll('.phead button')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.textContent.trim())}});
ok('the project page has no Look switch',!st.shown,JSON.stringify(st.acts));
ok('the project actions are still there',st.acts.some(t=>/New material/.test(t))&&st.acts.some(t=>/Edit project/.test(t)),JSON.stringify(st.acts));
await p.click('.mcard >> nth=0');await p.waitForTimeout(1500);
const ed=await p.evaluate(()=>{const l=document.querySelector('.lookbox');return {look:!!l&&getComputedStyle(l).display!=='none',spx:!!document.querySelector('#stage .gl.spx')}});
ok('the editor draws on Spectrum and offers no look chooser',ed.spx&&!ed.look,JSON.stringify(ed));
ok('no page errors',errs.length===0,errs.join('|').slice(0,200));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
