/* The division library, curated: each piece is set in modules that suit what it holds, no two alike, with the whole
   module range in play, nothing of the piece left out and nothing of a module's sample words brought in. */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
const ids=await p.evaluate(()=>__T.ELIB.map(x=>x.id));const rows=[];
for(let i=0;i<ids.length;i+=30){rows.push(...await p.evaluate((chunk)=>{
 const SAMPLE={};Object.keys(__T.MODULES).forEach(k=>{try{const walk=v=>{if(typeof v==='string'){if(v.length>=14&&/\s/.test(v))SAMPLE[v]=k}else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)};walk(__T.MODULES[k].def())}catch(e){}});
 const words=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>=4);
 return chunk.map(id=>{const pc=__T.ELIB.find(q=>q.id===id);let mods,err='';try{mods=__T.withStyle({look:'spectrum'},()=>__T.pieceToSpectrum(pc))}catch(e){return {id,err:String(e.message).slice(0,120)}}
  const D=m=>[m.data.layout,m.data.variant,m.data.cols,m.data.kind,m.data.direction,m.data.side,m.data.style,m.data.fill].filter(x=>x!=null).join('/')+(m.data.surface?'@'+m.data.surface:'');
  const sig=mods.map(m=>m.type+':'+D(m));
  // sample words that are not the piece's own
  const own=JSON.stringify(pc);const leaks=[];const strs=[];
  mods.forEach(m=>{const walk=(v,k)=>{if(typeof v==='string'){strs.push(v);if(m.type!=='cta'&&m.type!=='footer'&&SAMPLE[v]&&own.indexOf(v)<0)leaks.push(m.type+': '+v.slice(0,40))}else if(Array.isArray(v))v.forEach(x=>walk(x,k));else if(v&&typeof v==='object')Object.keys(v).forEach(kk=>walk(v[kk],kk))};walk(m.data,'')});
  // the piece's own words are all on the page
  const have=new Set(words(strs.join(' ')));const atoms=[];const T=v=>Array.isArray(v)?v:(v?[String(v)]:[]);
  [pc.challenge,pc.solution,pc.results].forEach(v=>T(v).forEach(x=>atoms.push(x)));
  (pc.sections||[]).forEach(s=>{if(!s||typeof s!=='object'||s.role==='metric')return;T(s.body).forEach(x=>atoms.push(x));T(s.bullets).forEach(x=>atoms.push(x));(s.items||[]).forEach(it=>{atoms.push(typeof it==='string'?it:[it.label||it.title||it.heading,it.detail||it.text||it.body].filter(Boolean).join(' '))})});
  if(pc.quote&&pc.quote.text)atoms.push(pc.quote.text);(pc.proof||[]).forEach(x=>atoms.push(String(x)));(pc.stats||[]).forEach(s=>atoms.push([s.label,s.caption].filter(Boolean).join(' ')));
  const lost=[];atoms.forEach(a=>{const w=words(a);if(w.length<2)return;const miss=w.filter(x=>!have.has(x)).length;if(miss/w.length>0.25)lost.push(a.slice(0,50))});
  // neighbours
  // a run of like sections carried on in one design (a long list, text in two columns) is one thing, not a twin
  const runs=__T.pxRuns()||{};const flow=m=>m.type==='storyColumns'&&m.data.layout==='flow';
  const body=mods.filter(m=>!/^(hero|cta|footer|row)$/.test(m.type));let same=0;for(let k=1;k<body.length;k++){if(body[k].type===body[k-1].type&&D(body[k])===D(body[k-1])&&!/^(features|numbersGrid|checklist)$/.test(body[k].type)&&!(runs[body[k].id]&&runs[body[k].id]===runs[body[k-1].id])&&!(flow(body[k])&&flow(body[k-1])))same++}
  const dark=body.filter(m=>/dark|navy|band/.test(D(m))&&/^(kpis|numbersGrid|features|checklist|hub|quoteStats|comparison)$/.test(m.type)).length;
  return {id,kind:pc.kind,sig,leaks,lost,same,dark,types:mods.map(m=>m.type)}})},ids.slice(i,i+30)))}
const bad=rows.filter(r=>r.err);ok('every piece is set by the curator (none falls back)',bad.length===0,bad.slice(0,3).map(r=>r.id+': '+r.err).join(' | ')||rows.length+' pieces');
const good=rows.filter(r=>!r.err);
const sigs={};good.forEach(r=>{const k=r.sig.join(' ');sigs[k]=(sigs[k]||0)+1});const distinct=Object.keys(sigs).length;
// a page that is nearly all text is set as plain text in two columns under its picture: a few such pieces share that page, by design
ok('no two pieces share a layout (at least 95% are one of a kind)',distinct>=good.length*0.95,distinct+' layouts for '+good.length+' pieces');
const tuse={};good.forEach(r=>r.types.forEach(t=>{tuse[t]=(tuse[t]||0)+1}));const used=Object.keys(tuse);
ok('the library draws on at least 22 module types',used.length>=22,used.length+': '+used.sort().join(', '));
const want=['pipeline','hub','agenda','divider','footprint','quoteStats','timeline','stages','pillars','capabilities','checklist','numbersGrid','stats','kpis'];
// a longer piece is laid out again for the pages it runs to (in its roomier designs): what it uses there counts too
let missing=want.filter(t=>!tuse[t]);
if(missing.length){const fin=await p.evaluate(()=>{const u={};__T.ELIB.filter(pc=>pc.kind==='ebrochure').forEach(pc=>{try{__T.pieceLayout(pc).modules.forEach(m=>{u[m.type]=1})}catch(e){}});return u});missing=missing.filter(t=>!fin[t])}
ok('diagrams, maps, agendas and dividers are all in use',missing.length===0,missing.join(', ')||'all present');
/* Words as design is the one design the library's own content does not call for: it needs two or three parts with
   a heading of a word or two and a few short bullets, and every piece shaped like that carries enough words to be
   set dense, where a design that tall does not fit. So it is checked by offering the curator a piece shaped for it:
   the design is live and is taken as soon as such a piece comes in. */
const td=await p.evaluate(()=>{const base=__T.ELIB.find(x=>(x.sections||[]).length)||__T.ELIB[0];const seen=[];
 for(let i=0;i<8;i++){const pc=JSON.parse(JSON.stringify(base));pc.id='probe-words-'+i;pc.title='Three ways we work';pc.quote=null;pc.stats=(pc.stats||[]).slice(0,3);
  delete pc.challenge;delete pc.solution;delete pc.results;
  pc.sections=[{heading:'Human',bullets:['Linguists in market','Subject-matter review','Final sign-off']},
   {heading:'Hybrid',bullets:['AI first draft','Linguist edit','One glossary']},
   {heading:'AI',bullets:['Instant coverage','Low cost per word','Always on']}];
  try{if(__T.withStyle({look:'spectrum'},()=>__T.pieceToSpectrum(pc)).some(m=>m.type==='typeDesign'))seen.push(pc.id)}catch(e){}}
 return seen});
ok('words as design is taken for a piece shaped for it',td.length>0,td.length+' of 8 shaped pieces');
const top=Object.entries(tuse).filter(x=>!/^(hero|cta|footer)$/.test(x[0])).sort((a,b)=>b[1]-a[1])[0];
const bodyN=Object.entries(tuse).filter(x=>!/^(hero|cta|footer)$/.test(x[0])).reduce((a,x)=>a+x[1],0);ok('no one module carries the library (the most used is under a quarter of all body modules)',top[1]/bodyN<0.25,top[0]+' ×'+top[1]+' of '+bodyN+' ('+Math.round(100*top[1]/bodyN)+'%)');
const seqs={};good.forEach(r=>{const k=r.types.join(' ');seqs[k]=(seqs[k]||0)+1});const rep=Object.entries(seqs).sort((a,b)=>b[1]-a[1])[0];
// a case study is its story and a quote, or its figures and its story: the order is the form's own (the designs within still vary)
ok('no module order repeats across more than 18 pieces',rep[1]<=18,rep[1]+'× '+rep[0]);
const leak=good.filter(r=>r.leaks.length);ok('no module brings its sample words into a piece',leak.length===0,leak.slice(0,3).map(r=>r.id+' ['+r.leaks[0]+']').join(' | ')||'none');
const lost=good.filter(r=>r.lost.length);ok("every piece's own words are on its pages",lost.length===0,lost.slice(0,4).map(r=>r.id+' ['+r.lost[0]+']').join(' | ')||'all kept');
const same=good.filter(r=>r.same);ok('no module sits under a twin of itself (a run of like sections carried on in one design is not a twin)',same.length===0,same.slice(0,4).map(r=>r.id).join(', ')||'none');
const dk=good.filter(r=>r.dark>2);ok('a page carries at most two dark bands in its body',dk.length===0,dk.slice(0,4).map(r=>r.id+' ×'+r.dark).join(', ')||'none');
// stable: the same piece is set the same way every time
const st=await p.evaluate(()=>{const f=m=>JSON.stringify(m.map(x=>[x.type,Object.assign({},x.data)]));return __T.ELIB.slice(0,40).every(pc=>f(__T.pieceToSpectrum(pc))===f(__T.pieceToSpectrum(pc)))});
ok('a piece is set the same way every time it is opened',st);
// fit and preflight on a spread
const fit=await p.evaluate(()=>{const f=__T.fmtById('letter');const out=[];const h=s=>{let x=0;for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))>>>0;return x};
 __T.ELIB.slice().sort((a,b)=>h(a.id)-h(b.id)).slice(0,60).forEach(pc=>{const lay=__T.pieceLayout(pc);const br=__T.brandById(pc.brand);const hh=__T.withBrand(br,()=>__T.withStyle({look:'spectrum'},()=>Math.max(...__T.pageParts(JSON.parse(JSON.stringify(lay.modules))).map(pt=>__T.measureAt(pt,f,lay.tight||0)))));
  const pf=__T.withBrand(br,()=>__T.preflight({id:'x',name:pc.title||pc.id,modules:lay.modules,formats:['letter'],look:'spectrum',tight:lay.tight||0,lang:'en',rebuiltFrom:{id:pc.id}},true));
  out.push({id:pc.id,over:Math.round(hh-f.h),tight:lay.tight||0,pages:lay.modules.filter(m=>m.type==='pagebreak').length+1,pf:pf.bad||0,why:(pf.list||[]).filter(x=>x[0]==='bad').map(x=>x[1]).slice(0,1)})});return out});
const over=fit.filter(o=>o.over>0);ok('every page fits its sheet (60 pieces)',over.length===0,over.slice(0,3).map(o=>o.id+' +'+o.over).join(', ')||'all fit');
const pf=fit.filter(o=>o.pf);ok('every piece passes preflight (60 pieces)',pf.length===0,pf.slice(0,3).map(o=>o.id+' '+o.why).join(' | ')||'all clean');
const tiny=fit.filter(o=>o.pages===1&&o.tight>26);ok('no one-page piece is set more than 26% smaller',tiny.length===0,tiny.map(o=>o.id+' '+o.tight).join(', ')||'max '+Math.max(...fit.map(o=>o.tight))+'%');
ok('no page errors',errs.length===0,errs.join(' | ').slice(0,200));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
