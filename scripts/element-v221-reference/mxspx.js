// Modules page: every module section also shows its variations in the Spectrum look, with a Look control
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('button:has-text("Open the example project")');await p.waitForTimeout(1200);
await p.evaluate(()=>__T.go('modules'));await p.waitForTimeout(2000);
const a=await p.evaluate(()=>({mods:document.querySelectorAll('.mx-mod:not(.mx-batch)').length,figs:document.querySelectorAll('.mx-mod:not(.mx-batch) .mx-spxv').length,look:!!document.querySelector('.mx-look'),pairs:document.querySelectorAll('.mx-pairs').length,plainShown:[...document.querySelectorAll('.mx-mod:not(.mx-batch) .mx-vars:not(.mx-spx-vars)')].filter(x=>getComputedStyle(x).display!=='none').length}));
ok('every module section shows its designs in Spectrum only, with no old-versus-new switch',a.mods>=37&&a.figs>=185&&!a.look&&a.pairs===0&&a.plainShown===0,JSON.stringify(a));
await p.fill('#mx-q','capability grid');await p.waitForTimeout(900);
await p.evaluate(()=>window.scrollTo(0,400));await p.waitForTimeout(3500);
const d=await p.evaluate(()=>{const f=[...document.querySelectorAll('.mx-spxv')];const th=f.map(x=>x.querySelector('.lp-thumb')).filter(Boolean);return {n:f.length,drawn:th.length,spx:th.filter(t=>/\bspx\b/.test(t.innerHTML)).length,grad:th.some(t=>/background-clip|gradient/.test(t.innerHTML))}});
ok('the Spectrum pictures draw, with the look applied',d.n===5&&d.drawn===5&&d.spx===5,JSON.stringify(d));
await p.click('.mx-spxv .mx-pic >> nth=1');await p.waitForTimeout(900);
const big=await p.evaluate(()=>{const m=document.querySelector('.mx-modal');return m?{spx:/\bspx\b/.test(m.innerHTML)}:null});
ok('a Spectrum picture opens larger in Spectrum',big&&big.spx,JSON.stringify(big));
await p.keyboard.press('ArrowRight');await p.waitForTimeout(500);
ok('arrow keys keep the look',await p.evaluate(()=>/\bspx\b/.test(document.querySelector('.mx-modal').innerHTML)));
await p.keyboard.press('Escape');await p.waitForTimeout(400);
await p.keyboard.press('Escape');await p.waitForTimeout(400);
const cut=await p.evaluate(()=>[...document.querySelectorAll('.mx-var')].map(f=>f.querySelector('.lp-thumb')).filter(Boolean).filter(t=>{const pg=t.querySelector('.pvpage');const k=t.getBoundingClientRect().width/816;return !pg||(t.getBoundingClientRect().height<(pg.scrollHeight*k)-1)}).length);
ok('no picture is shorter than what is drawn in it',cut===0,String(cut));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
