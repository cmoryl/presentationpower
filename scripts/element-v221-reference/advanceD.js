// design advancements, batch D: every module offers five designs that differ in layout, not only in background
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950}});const errs=[];const url='file://'+__dirname+'/test.html';
await ctx.route(/cdn\.jsdelivr\.net/,r=>r.abort());await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1800);
const render=(k,o)=>p.evaluate(([k,o])=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);const raw=T.pageHTML([{id:'t'+Math.random().toString(36).slice(2,8),type:k,data:Object.assign(T.MODULES[k].def(),o||{})}],{w:816,h:0,print:true},false,null);host.innerHTML=raw;const probe=window.__probe?window.__probe(host):null;host.remove();return {html:raw,probe}},[k,o||{}]);
// 1. five designs per module, distinct names, distinct structure (not only a background class)
const all=await p.evaluate(()=>{const T=__T;return Object.keys(T.MODULES).filter(k=>k!=='pagebreak').map(k=>{const vs=T.libVariants(k);const htmls=vs.map(v=>{try{return T.pageHTML([{id:'d'+k,type:k,data:Object.assign(T.MODULES[k].def(),v[1]||{})}],{w:816,h:0,print:true},false,null).replace(/ sf-(tint|band|card|accent)/g,'').replace(/m[a-z0-9]{8}/g,'')}catch(e){return 'ERR '+e.message}});
 return {k,n:vs.length,names:vs.map(v=>v[0]),distinctNames:new Set(vs.map(v=>v[0])).size,distinctHtml:new Set(htmls).size,err:htmls.filter(h=>/^ERR/.test(h)),surfaces:vs.filter(v=>v[1]&&v[1].surface).length}})});
ok('every module offers five designs with distinct names',all.every(m=>m.n>=5&&m.distinctNames===m.n),JSON.stringify(all.filter(m=>!(m.n>=5&&m.distinctNames===m.n)).map(m=>m.k+':'+m.n)));
ok('the five differ in structure once background classes are ignored, and none is a background-only variation',all.every(m=>m.distinctHtml===m.n&&m.surfaces===0),JSON.stringify(all.filter(m=>!(m.distinctHtml===m.n&&m.surfaces===0)).map(m=>m.k+':'+m.distinctHtml+'/'+m.surfaces)));
ok('every design renders without throwing',all.every(m=>!m.err.length),JSON.stringify(all.filter(m=>m.err.length).map(m=>m.k+' '+m.err[0])));
ok('the module examples page counts 185 variations (37 modules × 5)',await p.evaluate(()=>{const T=__T;let n=0;Object.keys(T.MODULES).filter(k=>k!=='pagebreak').forEach(k=>{n+=T.libVariants(k).length});return n>=185}));
// 2. the schema keeps every design's values
ok('the schema keeps every design value (they are real options, not previews)',await p.evaluate(()=>{const T=__T;return Object.keys(T.MODULES).filter(k=>k!=='pagebreak').every(k=>T.libVariants(k).every(v=>{const o=v[1]||{};const m=T.cleanMods([{id:'s'+k,type:k,data:Object.assign(T.MODULES[k].def(),JSON.parse(JSON.stringify(o)))}])[0];return Object.keys(o).every(key=>m.data[key]===o[key])}))}));
// 3. a sample of the new layouts: the markup each promises
const C=[['kpis',{variant:'stacked'},/ly-kstack/],['kpis',{variant:'tiles'},/ly-ktiles[^>]*--n:3/],['stats',{variant:'ledger'},/ly-ledger/],['capabilities',{variant:'numbered'},/cn-n">01</],['capabilities',{variant:'columns'},/ly-capcols/],['capabilities',{variant:'strip'},/cs-chip/],
 ['features',{layout:'stack'},/ly-fstack/],['features',{layout:'tiles'},/ly-ftiles/],['features',{layout:'dark'},/ly-dark fd-band/],['features',{layout:'chips'},/class="fc">/],
 ['storyRows',{variant:'timeline'},/stl-it end/],['storyRows',{variant:'split'},/ss-n">01</],['storyColumns',{layout:'open'},/ly-sc-open/],['storyColumns',{layout:'stacked'},/ly-scstack/],['storyColumns',{layout:'banded'},/sc-band tone-teal/],['storyColumns',{layout:'numbered'},/sc-num">03</],
 ['quote',{side:'chips'},/qc-chip/],['quoteStats',{layout:'quoteFirst'},/ly-qs-first/],['quoteStats',{layout:'stacked'},/qs-row[^>]*--n:4/],['quoteStats',{layout:'band'},/ly-dark qs-band/],['quoteStats',{layout:'ledger'},/qs-ledger/],
 ['expert',{layout:'cardLeft'},/ly-ex-left"><div class="ex-card/],['expert',{layout:'stacked'},/ex-bar ly-dark/],['expert',{layout:'navy'},/ex-card card ly-dark/],['expert',{layout:'open'},/ex-ledger/],
 ['cta',{layout:'centered'},/cta cta-center/],['footer',{style:'band'},/foot foot-band ly-dark/],['footer',{style:'centered'},/foot foot-centered/],
 ['numbersGrid',{variant:'dark'},/ly-dark nd/],['numbersGrid',{variant:'inline'},/ni-row/],['numbersGrid',{variant:'ledger'},/nl-list/],
 ['stages',{variant:'steps'},/<ol class="chev"/],['stages',{variant:'vertical'},/<ol class="sv">/],['stages',{variant:'cards'},/scd tone-/],
 ['footprint',{variant:'headline'},/fp-headline/],['footprint',{variant:'dark'},/fp-dark ly-dark/],['footprint',{variant:'compact'},/fp-compact/],
 ['bigMetric',{layout:'centered'},/bm-centered/],['bigMetric',{layout:'band'},/bm-band/],['bigMetric',{layout:'split'},/bm-split/],['bigMetric',{layout:'ring'},/bm-ring"><svg[\s\S]*?<circle class="bm-track/],
 ['pillars',{layout:'magazine'},/pl-magazine/],['pillars',{layout:'cards'},/pl-cards/],['pillars',{layout:'text'},/pt-n">01</],['pillars',{layout:'rows'},/pl-rows/],
 ['hub',{layout:'curved'},/hub-c/],['hub',{layout:'dark'},/hb-dark ly-dark/],['hub',{layout:'list'},/hb-list/],['hub',{layout:'compact'},/hb-compact/],
 ['pipeline',{layout:'bands'},/dk-bands/],['pipeline',{layout:'chevrons'},/<ol class="pchev"/],['pipeline',{layout:'vertical'},/pp-vertical/],['pipeline',{layout:'dark'},/pp-dark ly-dark/],
 ['logoWall',{tone:'white'},/lw-dark/],['dataChart',{kind:'hbar'},/chart-hbar/],['dataChart',{kind:'lollipop'},/ch-stem/],
 ['comparison',{layout:'cards'},/cpc hi/],['comparison',{layout:'dark'},/cp-dark/],['comparison',{layout:'pairs'},/cpp-v/],['comparison',{layout:'arrows'},/cpa-arrow/],
 ['timeline',{direction:'cards'},/tl-cards/],['timeline',{direction:'alternate'},/dk-timeline down ly tl-alternate/],['timeline',{direction:'numbered'},/tln-n">04</],
 ['testimonials',{layout:'featured'},/te-featured/],['team',{layout:'wide'},/tm-wide/],['tiers',{layout:'stacked'},/ti-stacked/],['checklist',{cols:'tiles'},/ckt-grid/],['checklist',{cols:'numbered'},/<ol class="ckn"/],['checklist',{cols:'band'},/ly-dark ckb/]];
const miss=[];for(const c of C){const h=(await render(c[0],c[1])).html;if(!c[2].test(h))miss.push(c[0]+'/'+JSON.stringify(c[1]))}
ok(C.length+' new layouts draw the markup they promise',!miss.length,miss.join(', '));
// 4. horizontal bars follow the numbers; lollipops end where their bar would
const hb=(await render('dataChart',{kind:'hbar'})).html;const ws=[...hb.matchAll(/class="ch-bar[^"]*" x="150" y="[\d.]+" width="([\d.]+)"/g)].map(m=>+m[1]);
ok('horizontal bars shrink with the numbers and the last is highlighted',ws.length===4&&ws[0]>ws[1]&&ws[1]>ws[2]&&ws[2]>ws[3]&&/ch-bar last/.test(hb),ws.join(','));
// 5. badges and rings still work inside the new layouts
const kd=(await render('kpis',{variant:'stacked',items:[{icon:'clock',value:'10 Days',caption:'a',delta:'↓ 89%'},{icon:'coins',value:'33%',caption:'b'},{icon:'check-circle-2',value:'On Time',caption:'c'}]})).html;
ok('a change badge follows its figure in the stacked KPI layout',/<div class="t-stat[^"]*">10(?:[ \u00a0]|&nbsp;)Days<span class="delta">/.test(kd));
// 6. nothing changes for saved materials: every default renders without a batch-D class, and old values keep their old markup
ok('every module default renders without any batch-D layout class',await p.evaluate(()=>{const T=__T;return Object.keys(T.MODULES).filter(k=>k!=='pagebreak'&&!['agenda','divider','typeDesign','news','kpiTrend','funnel','heatmap','bullet','seriesChart','cover'].includes(k)).every(k=>!/class="[^"]*\bly\b/.test(T.pageHTML([{id:'d'+k,type:k,data:T.MODULES[k].def()}],{w:816,h:0,print:true},false,null)))}));
const old=(await render('features',{})).html;ok('a feature row saved before Batch D draws exactly as it did (icon columns)',/feat-h/.test(old)&&!/ly-/.test(old));
ok('the example material still renders its modules in their saved styles',await p.evaluate(()=>{const T=__T;const h=T.pageHTML(T.mat().modules,T.fmtById('letter'),false);return !/class="sec ly /.test(h)&&/class="mod/.test(h)}));
// 7. the inspector lists the new options on the module's select
await p.evaluate(()=>{const m=__T.mat();m.modules.splice(1,0,{id:'mfeatxx',type:'features',data:__T.MODULES.features.def()});__T.redraw()});await p.waitForTimeout(500);
await p.click('#stage .mod[data-id="mfeatxx"]');await p.waitForTimeout(400);
const opts=await p.evaluate(()=>{const head=document.getElementById('insp-head');const panel=head&&head.closest('.rbody, #rpane');return panel?[...panel.querySelectorAll('select option')].map(o=>o.textContent):[]});
ok('the Icon feature row inspector offers its five layouts',['Icon columns','Stacked list','Tinted tiles','Navy band','Chip line'].every(x=>opts.includes(x)),opts.join('|').slice(0,200));
await p.evaluate(()=>{const m=__T.mat();m.modules=m.modules.filter(x=>x.id!=='mfeatxx');__T.redraw()});
// 8. the library shows five pictures per module, all different
const lib=await p.evaluate(()=>Object.keys(__T.MODULES).filter(k=>k!=='pagebreak').map(k=>{const s=new Set();for(let i=0;i<5;i++)s.add(__T.libPreviewHTML(k+'@'+i).replace(/m[a-z0-9]{8}/g,''));return [k,s.size]}).filter(x=>x[1]!==5));
ok('the library previews five different pictures for every module',lib.length===0,JSON.stringify(lib));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
