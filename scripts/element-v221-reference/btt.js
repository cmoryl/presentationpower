// Back to top button.
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
const vis=()=>p.evaluate(()=>{const e=document.getElementById('back-to-top');return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'});
const pane=()=>p.evaluate(()=>{const c=[document.scrollingElement,...document.querySelectorAll('*')].filter(e=>e&&e.scrollHeight>e.clientHeight*1.6&&e.clientHeight>240&&(e===document.scrollingElement||/(auto|scroll)/.test(getComputedStyle(e).overflowY)));return c.length?(c[0]===document.scrollingElement?'DOC':(c[0].id||c[0].className)):''});
const down=()=>p.evaluate(()=>{const c=[document.scrollingElement,...document.querySelectorAll('*')].filter(e=>e&&e.scrollHeight>e.clientHeight*1.6&&e.clientHeight>240&&(e===document.scrollingElement||/(auto|scroll)/.test(getComputedStyle(e).overflowY)));c[0].scrollTop=1500});
const top=()=>p.evaluate(()=>[document.scrollingElement,...document.querySelectorAll('*')].every(e=>!e||e.scrollTop<5));
ok('button exists with a label',await p.evaluate(()=>{const e=document.getElementById('back-to-top');return !!e&&e.getAttribute('aria-label')==='Back to top'}));
ok('hidden at the top',!(await vis()));
for(const pg of ['landing','library','modules']){
  await p.evaluate(g=>{try{__T.go(g)}catch(e){}},pg==='landing'?'start':pg);await p.waitForTimeout(700);
  const pn=await pane();
  if(!pn){ok(pg+': nothing long enough to scroll (skipped)',true);continue}
  await p.waitForTimeout(500);await down();await p.waitForTimeout(500);
  ok(pg+': shows after scrolling ('+pn+')',await vis());
  await p.click('#back-to-top');await p.waitForTimeout(1300);
  ok(pg+': click returns to top',await top());
  ok(pg+': hides again',!(await vis()));
}
ok('no page errors',errs.length===0,errs.join('|'));
R.forEach(x=>console.log(x));await b.close();process.exit(R.some(x=>x.startsWith('FAIL'))?1:0)})();
