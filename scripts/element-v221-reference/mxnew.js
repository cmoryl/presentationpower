// Modules page: the "What's new" section lists the design-advancement batches with live pictures
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('button:has-text("Open the example project")');await p.waitForTimeout(1200);
await p.evaluate(()=>__T.go('modules'));await p.waitForTimeout(2000);
const all=await p.evaluate(()=>({sec:!!document.querySelector('#mx-new'),first:document.querySelector('.mx-body').firstElementChild.id,batches:[...document.querySelectorAll('.mx-batch > .mx-head h3')].map(x=>x.textContent),figs:document.querySelectorAll('.mx-new .mx-var').length,chip:!!document.querySelector('.mx-chip-new')}));
ok('with All selected the What\'s new section opens the page, three sections (the first batches retired), 48 examples',all.sec&&all.first==='mx-new'&&all.batches.length===3&&/PowerPoint style guide/.test(all.batches[0])&&/Data visualization/.test(all.batches[1])&&/More modules, in Spectrum/.test(all.batches[2])&&all.figs===48&&all.chip,JSON.stringify(all));
await p.click('.mx-chip-new');await p.waitForTimeout(3500);await p.mouse.wheel(0,1200);await p.waitForTimeout(2500);await p.mouse.wheel(0,1400);await p.waitForTimeout(2500);await p.mouse.wheel(0,1400);await p.waitForTimeout(3000);await p.mouse.wheel(0,1400);await p.waitForTimeout(3000);
const only=await p.evaluate(()=>({mods:document.querySelectorAll('.mx-mod:not(.mx-batch)').length,empty:!!document.querySelector('.mx-body .empty'),drawn:document.querySelectorAll('.mx-new .mx-pic .lp-thumb').length,none:document.querySelectorAll('.mx-new .mx-none').length,pressed:document.querySelector('.mx-chip-new').getAttribute('aria-pressed'),crumb:document.querySelector('#crumbs')?document.querySelector('#crumbs').textContent:''}));
ok('the What\'s new chip shows only the batches; every picture draws',only.mods===0&&!only.empty&&only.drawn===48&&only.none===0&&only.pressed==='true'&&/What's new/.test(only.crumb),JSON.stringify(only));
const pics=await p.evaluate(()=>[...document.querySelectorAll('.mx-new .mx-pic .lp-thumb')].map(t=>t.getBoundingClientRect().height));
ok('pictures have real height (nothing collapsed)',pics.every(h=>h>30),JSON.stringify(pics.filter(h=>h<=30)));
const has=await p.evaluate(()=>{const q=s=>!!document.querySelector('.mx-new '+s);return {qr:q('.qr-tile svg.qr'),curved:q('.hub-c'),chart:q('svg.chart'),cmp:q('.cmp-t'),chev:q('.chev'),ring:q('.bm-ring')}});
ok('the examples carry the options they advertise (QR, curves, chart, table, chevrons, ring)',Object.keys(has).every(k=>has[k]),JSON.stringify(has));
await p.click('.mx-new .mx-pic >> nth=1');await p.waitForTimeout(800);
const big=await p.evaluate(()=>{const d=document.querySelector('.mx-modal');return d?{title:d.querySelector('.mx-big-d').textContent,cap:d.querySelector('.mx-big-cap').textContent,pic:!!d.querySelector('.lp-thumb'),delta:!!d.querySelector('.delta')}:null});
ok('a picture opens larger with its caption',big&&/Capability grid/.test(big.title)&&/2 of 8/.test(big.cap)&&big.pic,JSON.stringify(big));
await p.keyboard.press('ArrowRight');await p.waitForTimeout(600);
ok('arrow keys step through the batch',/3 of 8/.test(await p.textContent('.mx-modal .mx-big-cap')));
await p.keyboard.press('Escape');await p.waitForTimeout(400);
await p.click('.mx-groups .seg:has-text("Proof")');await p.waitForTimeout(800);
ok('a group chip hides the What\'s new section and lists that group',await p.evaluate(()=>!document.querySelector('#mx-new')&&document.querySelectorAll('.mx-mod:not(.mx-batch)').length===11));
await p.click('.mx-groups .seg >> nth=0');await p.waitForTimeout(600);await p.fill('#mx-q','chart');await p.waitForTimeout(800);
ok('a search hides it too',await p.evaluate(()=>!document.querySelector('#mx-new')&&document.querySelectorAll('.mx-mod:not(.mx-batch)').length===2));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
