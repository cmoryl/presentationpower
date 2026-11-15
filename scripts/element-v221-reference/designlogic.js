/* Design logic of the library briefs, judged by the app's own full preflight and by the page as drawn:
   no blocking errors, no module below the count it is designed for, no module repeated back to back, no line of body
   copy over the 90-character guide, no hero lead down a thin column, no headline over five lines, and a grid never
   leaves one item alone on its last row. Run on a spread of 90 pieces. */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
const ids=await p.evaluate(()=>{const h=s=>{let x=0;for(let i=0;i<s.length;i++)x=(x*31+s.charCodeAt(i))>>>0;return x};return __T.ELIB.slice().sort((a,b)=>h(a.id+'dl')-h(b.id+'dl')).slice(0,90).map(x=>x.id)});
const rows=[];
for(let i=0;i<ids.length;i+=5){rows.push(...await p.evaluate((chunk)=>chunk.map(id=>{const pc=__T.ELIB.find(q=>q.id===id);const br=__T.brandById(pc.brand);const lay=__T.pieceLayout(pc);const f=Object.assign({},__T.fmtById('letter'));
 const pf=__T.withBrand(br,()=>__T.withStyle({look:'spectrum'},()=>__T.preflightAt({id:'x',name:pc.title||id,brand:pc.brand,modules:lay.modules,formats:['letter'],look:'spectrum',tight:lay.tight||0,lang:'en',rebuiltFrom:{id}},lay.tight||0)));
 const list=(pf.list||[]).filter(x=>x[0]==='warn'||x[0]==='bad').map(x=>x[0]+': '+x[1]);
 let leadLines=0,headLines=0,alone=0;
 __T.pageParts(JSON.parse(JSON.stringify(lay.modules))).forEach(pt=>{const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0';host.innerHTML=__T.withBrand(br,()=>__T.withStyle({look:'spectrum',modules:pt,tight:lay.tight||0},()=>__T.pageHTMLAt(pt,f,lay.tight||0)));document.body.appendChild(host);const pg=host.firstElementChild;const pr=pg.getBoundingClientRect();
  const lead=pg.querySelector('.m-hero .t-lead');if(lead){leadLines=Math.max(leadLines,Math.round(lead.getBoundingClientRect().height/(parseFloat(getComputedStyle(lead).lineHeight)||16)))}
  const h1=pg.querySelector('.m-hero h1');if(h1){headLines=Math.max(headLines,Math.round(h1.getBoundingClientRect().height/(parseFloat(getComputedStyle(h1).lineHeight)||30)))}
  [...pg.querySelectorAll('.mod')].forEach(mod=>{[...mod.querySelectorAll('*')].filter(e=>e.children.length>=4&&e.children.length<=12).forEach(g=>{const cs=getComputedStyle(g);if((cs.display!=='grid'&&cs.display!=='flex')||cs.flexWrap==='wrap')return;const kids=[...g.children].filter(c=>c.getBoundingClientRect().height>20);if(kids.length<4)return;const tops={};kids.forEach(c=>{const t=Math.round(c.getBoundingClientRect().top/6);tops[t]=(tops[t]||0)+1});const r=Object.keys(tops).sort((a,b)=>a-b).map(t=>tops[t]);if(r.length>=2&&r[0]>=3&&r[r.length-1]===1&&kids.every(c=>c.getBoundingClientRect().width<pr.width*0.45))alone++})});host.remove()});
 return {id,bad:list.filter(x=>/^bad/.test(x)),list,leadLines,headLines,alone}}),ids.slice(i,i+5)))}
const has=(rx)=>rows.filter(r=>r.list.some(l=>rx.test(l)));
const bad=rows.filter(r=>r.bad.length);const lowres=bad.filter(r=>r.bad.every(x=>/^Photo in Hero prints at \d+ ppi/.test(x)));const other=bad.filter(r=>lowres.indexOf(r)<0);
ok('no brief has a blocking preflight error (bar a hero photo whose original is too small for the full width)',other.length===0&&lowres.length<=5,other.slice(0,3).map(r=>r.id+': '+r.bad[0].slice(0,70)).join(' | ')||lowres.length+' small originals');
const cnt=has(/has \d+ of the \d+ .* it's designed for/);ok('no module holds fewer items than it is designed for',cnt.length===0,cnt.slice(0,3).map(r=>r.id).join(', ')||'none');
const twice=has(/^warn: Two .* modules in a row/);ok('no module is repeated back to back (a list too long for one module, carried on in a second, is one list)',twice.length===0,twice.slice(0,3).map(r=>r.id+' ['+r.list.find(l=>/Two .* modules in a row/.test(l)).slice(6,60)+']').join(' | ')||'none');
const long=has(/Lines in .* run about \d+ characters/);ok('no body copy runs over the 90-character line',long.length===0,long.slice(0,3).map(r=>r.id).join(', ')||'none');
const contrast=has(/Hero text may be unreadable/);ok('no hero is flagged for words on a photo (the wash carries white words on any photo)',contrast.length===0,contrast.slice(0,3).map(r=>r.id).join(', ')||'none');
const sample=has(/sample proof points/);ok('no quote carries sample proof points',sample.length===0);
const lead=rows.filter(r=>r.leadLines>9);ok('no hero lead runs down a thin column (9 lines at most)',lead.length===0,lead.slice(0,3).map(r=>r.id+' '+r.leadLines).join(', ')||'longest '+Math.max(...rows.map(r=>r.leadLines)));
const head=rows.filter(r=>r.headLines>5);ok('no headline runs over five lines',head.length===0,head.slice(0,3).map(r=>r.id+' '+r.headLines).join(', ')||'longest '+Math.max(...rows.map(r=>r.headLines)));
const al=rows.filter(r=>r.alone);ok('no grid leaves one item alone on its last row',al.length===0,al.slice(0,3).map(r=>r.id).join(', ')||'none');
// rules of the curator itself, on every piece
const dat=await p.evaluate(()=>{let icons=0,punct=0,dup=0,thin=0,strip=0;const ex=[];__T.ELIB.forEach(pc=>{const mods=__T.pieceToSpectrum(pc);const hero=mods[0].data;
  if(hero.layout!=='full'&&hero.layout!=='fade'){strip++;ex.push('hero '+pc.id+' '+hero.layout)}
  if(hero.panel==='card'){strip++;ex.push('card hero '+pc.id)}
  if(String(hero.lead||'').trim()||(hero.words!=='over'&&hero.words!=='beside')){thin++;ex.push('lead '+pc.id)}
  mods.forEach(m=>{const its=Array.isArray(m.data.items)?m.data.items.filter(x=>x&&typeof x==='object'&&x.icon):[];if(its.length>=2&&its.length<=12&&new Set(its.map(x=>x.icon)).size<its.length){icons++;ex.push('icon '+pc.id+' '+m.type)}
   const hs=[];if(m.type!=='hero'&&m.type!=='cta'&&m.data.title)hs.push(m.data.title);(Array.isArray(m.data.items)?m.data.items:[]).forEach(it=>{if(it&&it.heading)hs.push(it.heading)});hs.forEach(h=>{if(/:$/.test(String(h).trim())){punct++;ex.push('colon '+pc.id+' '+h)}});
   // running text in two columns may carry a sub-heading that recurs ("How we can help" under each topic); side by side in a row or a grid it may not
   if(its.length>=2&&!(m.type==='storyColumns'&&m.data.layout==='flow')){const k=its.map(x=>String(x.heading||'').trim().toLowerCase()).filter(Boolean);if(new Set(k).size<k.length){dup++;ex.push('heading twice in one module '+pc.id)}}})});return {icons,punct,dup,thin,strip,ex:ex.slice(0,4)}});
ok('every item in a module has its own icon (all 299)',dat.icons===0,dat.icons+' '+dat.ex.join(' | '));
ok('no heading ends in a colon (all 299)',dat.punct===0,String(dat.punct));
ok('the same heading never sits twice side by side in one module (all 299)',dat.dup===0,String(dat.dup));
ok('a library hero carries its label and headline, and the line under it opens the story (all 299)',dat.thin===0,String(dat.thin));
ok('every library hero is a full-width picture or one that fades into the page (all 299)',dat.strip===0,String(dat.strip));
// social and ad sizes: the accent frame clears the words at every size, and the rule above the close ends at the content edge
const fr=await p.evaluate(()=>{const bad=[];const ids=['kb-gl-forrester-tei-managed-services-infographic','kb-gl-live-cop29','legal-parallel-sec-doj-investigations'];ids.forEach(id=>{const pc=__T.ELIB.find(q=>q.id===id);const mods=__T.pieceLayout(pc).modules.filter(m=>m.type!=='pagebreak');['mrec','halfpage','square','portrait','linkedin'].forEach(fid=>{const f=__T.fmtById(fid);const h=document.createElement('div');h.style.cssText='position:absolute;left:0;top:0';document.body.appendChild(h);h.innerHTML=__T.withBrand(__T.brandById(pc.brand),()=>__T.withStyle({look:'spectrum',modules:mods},()=>__T.fmtHTML(mods,f,false)));__T.fitAll(h);const g=h.querySelector('.gl');const R=g.getBoundingClientRect();const inset=parseFloat(getComputedStyle(g,'::before').left)||0;
  let minL=1e9;[...g.querySelectorAll('.fz-panel *')].forEach(e=>{if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return;const rg=document.createRange();rg.selectNodeContents(e);const q=rg.getBoundingClientRect();if(q.width>2)minL=Math.min(minL,q.left-R.left)});
  const tl=g.querySelector('.sig-tl');const sh=tl?getComputedStyle(tl).boxShadow:'none';
  if(minL<1e8&&minL<inset+4)bad.push(id+' '+fid+' words '+Math.round(minL)+' frame '+Math.round(inset));if(tl&&sh!=='none')bad.push(id+' '+fid+' rule runs out');h.remove()})});return bad});
ok('in the social and ad sizes the accent frame clears the words and the rule ends at the content edge',fr.length===0,fr.slice(0,3).join(' | ')||'15 frames');
// the thirteen Spectrum templates: the same hero as the Library, every page fits with room between its modules, preflight clean
const tp=await p.evaluate(()=>{const out=[];const f=__T.fmtById('letter');__T.spxlTemplates().filter(Boolean).forEach(t=>{const mods=__T.spxlMods(t);const tg=__T.spxlTight(t);const hero=mods.find(m=>m.type==='hero');
 if(hero&&!(hero.data.layout==='full'&&hero.data.words==='over'))out.push(t.key+' hero '+hero.data.layout);
 const pf=__T.withStyle({look:'spectrum'},()=>__T.preflight({id:'x',name:t.name,modules:mods,formats:['letter'],look:'spectrum',tight:tg,lang:'en'},false));(pf.list||[]).filter(x=>x[0]==='bad').forEach(x=>out.push(t.key+' '+x[1].slice(0,60)));
 __T.pageParts(JSON.parse(JSON.stringify(mods))).forEach((pt,i)=>{const h=document.createElement('div');h.style.cssText='position:absolute;left:0;top:0;width:816px';document.body.appendChild(h);h.innerHTML=__T.withStyle({look:'spectrum'},()=>__T.pageHTMLAt(pt,f,tg));const pg=h.firstElementChild;pg.style.minHeight='0';if(pg.offsetHeight>f.h+1)out.push(t.key+' p'+(i+1)+' runs '+(pg.offsetHeight-f.h)+' px over');pg.style.minHeight=f.h+'px';const gs=[...pg.querySelectorAll('.pp-gap')].map(e=>e.getBoundingClientRect().height);if(gs.length&&Math.min(...gs)<8)out.push(t.key+' p'+(i+1)+' modules '+Math.round(Math.min(...gs))+' px apart');h.remove()})});return out});
ok('the Spectrum templates: words on the picture, every page fits with room between modules, preflight clean',tp.length===0,tp.slice(0,4).join(' | ')||'13 templates');
ok('no page errors',errs.length===0,errs.join(' | ').slice(0,200));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
