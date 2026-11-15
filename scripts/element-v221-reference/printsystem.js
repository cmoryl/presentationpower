// Print system (99v-print-system.js + the "print system" block in canvas.css): division colours, hero overlap,
// typographic modules, unreadable graphics, contact lines, figures in RTL, brand words, one-page fit.
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
await p.evaluate(()=>{
 window.__host=function(){let h=document.getElementById('ps-host');if(!h){h=document.createElement('div');h.id='ps-host';h.style.cssText='position:absolute;left:0;top:0;z-index:99999;background:#fff';document.body.appendChild(h)}return h};
 window.__pg=function(mods,o){o=o||{};const T=__T;const f=o.fmt?T.fmtById(o.fmt):{w:816,h:0,print:true};const h=__host();
  h.innerHTML=T.withLang(o.lang||'en',()=>T.withBrand(T.brandById(o.brand||'bm-division'),()=>T.pageHTML(JSON.parse(JSON.stringify(mods)),f,!!o.editing,null)));return h.firstElementChild};
 // a library piece rebuilt as the app does, drawn on its sheet (optionally with its words changed first)
 window.__piece=async function(id,o){o=o||{};const T=__T,S=T.S();const pc=T.ELIB.find(x=>x.id===id);const lay=T.pieceLayout(pc);const mods=JSON.parse(JSON.stringify(lay.modules));if(o.edit)o.edit(mods);
  const keep=[S.mat,S.view];S.mat={id:'ps',brand:pc.brand,modules:mods,tight:lay.tight,formats:['letter'],lang:o.lang||'en',rebuiltFrom:{id}};S.view='editor';
  const f=T.fmtById(o.fmt||'letter');const h=__host();h.innerHTML=T.withLang(o.lang||'en',()=>T.fmtHTML(JSON.parse(JSON.stringify(mods)),f,!!o.editing));S.mat=keep[0];S.view=keep[1];
  const pg=h.firstElementChild;await document.fonts.ready;await Promise.all([...pg.querySelectorAll('img')].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));return {pg,lay,mods}};
 window.__lum=function(c){const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 window.__cr=function(a,b){const x=__lum(a),y=__lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
});

/* 1. the module after a hero starts below it unless it draws an opaque surface (legal-cross-border-clarity's columns sat on the photo) */
const lg=await p.evaluate(async()=>{const {pg}=await __piece('legal-cross-border-clarity');const hero=pg.querySelector('.m-hero').getBoundingClientRect();const next=pg.querySelector('.m-hero').closest('.mod').nextElementSibling;const s=next.querySelector('.sec')||next;return {heroBottom:Math.round(hero.bottom),nextTop:Math.round(s.getBoundingClientRect().top),cls:s.className}});
ok('legal-cross-border-clarity: the three columns start below the hero photo',lg.nextTop>=lg.heroBottom,JSON.stringify(lg));
const ov=await p.evaluate(()=>{const T=__T;const bad=[],over=[];Object.keys(T.MODULES).forEach(k=>{if(k==='hero'||k==='pagebreak'||k==='footer')return;(T.libVariants(k).length?T.libVariants(k):[['d',null]]).forEach(v=>{
  const hero=T.mk('hero',{layout:'fade',photo:null});const pg=__pg([hero,T.mk(k,v[1]?JSON.parse(JSON.stringify(v[1])):undefined)],{brand:'bm-tp-legal'});const hb=pg.querySelector('.m-hero').getBoundingClientRect().bottom;const m=pg.querySelectorAll(':scope>.mod')[1];const s=m.querySelector('.sec,.foot');if(!s)return;
  if(s.getBoundingClientRect().top<hb-1){over.push(k);const sf=v[1]&&v[1].surface;if(['kpis','capabilities','row','quote','cta','numbersGrid','bigMetric','footprint'].indexOf(k)<0&&!/^(tint|band|card)$/.test(sf||''))bad.push(k+'/'+v[0])}})});return {bad,over:[...new Set(over)]}});
ok('only modules with an opaque surface (KPI cards, capability tray, row pieces, a tinted or boxed background) may overlap a hero',ov.bad.length===0&&ov.over.indexOf('kpis')>=0,JSON.stringify(ov));
const dense=await p.evaluate(()=>{const T=__T;const pg=__pg([T.mk('hero'),T.mk('capabilities'),T.mk('footer')],{brand:'bm-tp-legal'});pg.setAttribute('data-tight','24');return 1});
const capDense=await p.evaluate(()=>{const T=__T,S=T.S();const keep=S.mat;S.mat={tight:24,modules:[]};const prevV=S.view;S.view='editor';const pg=__pg([T.mk('hero'),T.mk('capabilities'),T.mk('footer')],{brand:'bm-tp-legal',fmt:'letter'});S.mat=keep;S.view=prevV;const hb=pg.querySelector('.m-hero').getBoundingClientRect().bottom;return {dense:pg.classList.contains('pp-dense'),top:pg.querySelector('.tray').closest('.sec').getBoundingClientRect().top-hb}});
ok('on a dense page (cards dropped) the capability grid no longer overlaps the hero',capDense.dense&&capDense.top>=0,JSON.stringify(capDense));

const exp=await p.evaluate(()=>{const T=__T;const r={};['storyColumns','storyRows','quote'].forEach(k=>{const pg=__pg([T.mk('hero',{overlap:'standard'}),T.mk(k)],{brand:'bm-tp-legal'});const hb=pg.querySelector('.m-hero').getBoundingClientRect().bottom;r[k]=Math.round(pg.querySelectorAll(':scope>.mod')[1].querySelector('.sec').getBoundingClientRect().top-hb)});return r});
ok('a chosen overlap is kept for an opaque module (quote band) and refused for text on the page',exp.quote<0&&exp.storyColumns>=0&&exp.storyRows>=0,JSON.stringify(exp));

/* 2. print uses the division's brand mode: flat figures in the accent darkened for white, primary CTA band and hero wash */
const DIV={'bm-division':['#246BFF','#130F4D'],'bm-tp-media':['#E31673','#03002C'],'bm-tp-lifesci':['#2C860B','#002981'],'bm-trial-interactive':['#158387','#002981'],'bm-tp-legal':['#28827C','#002673'],'bm-tp-games':['#198841','#0A1230'],'bm-tp-digital':['#8A4FFF','#002981']};
const col=await p.evaluate(DIV=>{const T=__T;const hex=c=>'#'+c.match(/\d+/g).slice(0,3).map(x=>(+x).toString(16).padStart(2,'0')).join('').toUpperCase();const out={};Object.keys(DIV).forEach(br=>{const pg=__pg([T.mk('hero'),T.mk('kpis'),T.mk('stats'),T.mk('cta'),T.mk('footer')],{brand:br});
  const st=[...pg.querySelectorAll('.t-stat')].map(e=>getComputedStyle(e));const cta=getComputedStyle(pg.querySelector('.cta'));const hero=getComputedStyle(pg.querySelector('.m-hero'));
  out[br]={div:pg.classList.contains('pv-div'),num:[...new Set(st.map(s=>hex(s.color)))],clip:st.some(s=>s.backgroundClip==='text'||s.webkitBackgroundClip==='text'),cr:__cr(st[0].color,'rgb(255,255,255)'),cta:hex(cta.backgroundColor),ctaImg:cta.backgroundImage,hero:hero.backgroundImage}});return out},DIV);
Object.keys(DIV).forEach(br=>{const c=col[br];ok(br+': figures flat in '+DIV[br][0]+' (≥4.5:1 on white), CTA band '+DIV[br][1],c.div&&c.num.length===1&&c.num[0]===DIV[br][0]&&!c.clip&&c.cr>=4.5&&c.cta===DIV[br][1]&&c.ctaImg==='none',JSON.stringify(c))});
ok('the hero wash starts from the division primary',col['bm-tp-legal'].hero.indexOf('rgb(0, 38, 115)')>=0&&col['bm-tp-media'].hero.indexOf('rgb(3, 0, 44)')>=0,col['bm-tp-legal'].hero.slice(0,90));
const own=await p.evaluate(()=>{const T=__T;const r={};['bm-enterprise','bm-product','bm-cobrand','bm-element'].forEach(br=>{const pg=__pg([T.mk('kpis'),T.mk('numbersGrid'),T.mk('bigMetric'),T.mk('cta',{fill:'gradient'})],{brand:br});const g=[...pg.querySelectorAll('.t-stat,.dk-grad,.dk-big,.dk-mega')].filter(e=>getComputedStyle(e).backgroundClip==='text').length;r[br]={div:pg.classList.contains('pv-div'),grad:g,cta:getComputedStyle(pg.querySelector('.cta')).backgroundImage}});return r});
ok('Enterprise, DataForce, Co-brand and ELEMENT keep their own colours, with flat figures and blocks too',Object.values(own).every(x=>!x.div&&x.grad===0&&x.cta==='none'),JSON.stringify(own));
const sw=await p.evaluate(()=>{const T=__T;T.pvSet(false);const pg=__pg([T.mk('kpis'),T.mk('cta')],{brand:'bm-tp-media'});const r={div:pg.classList.contains('pv-div'),num:getComputedStyle(pg.querySelector('.t-stat')).color};T.pvSet(true);return r});
ok('one switch (PRINT_DIVISION_COLOURS) puts divisions back on the shared enterprise colours',!sw.div&&sw.num==='rgb(42, 99, 214)',JSON.stringify(sw));

/* 3. the catalogue reads as one designed system: no gradient text, no icon tiles on figures or story rows, flat corporate blocks */
const cat=await p.evaluate(()=>{const T=__T;const bad={grad:[],tile:[],overflow:[],shadow:[]};let n=0;['bm-tp-media','bm-tp-legal','bm-tp-lifesci'].forEach(br=>Object.keys(T.MODULES).forEach(k=>{if(k==='pagebreak')return;(T.libVariants(k).length?T.libVariants(k):[['d',null]]).forEach(v=>{n++;
  const pg=__pg([T.mk(k,v[1]?JSON.parse(JSON.stringify(v[1])):undefined)],{brand:br});const W=pg.getBoundingClientRect();const id=br+'/'+k+'/'+v[0];
  const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
  if([...pg.querySelectorAll('*')].some(e=>vis(e)&&getComputedStyle(e).backgroundClip==='text'))bad.grad.push(id);
  if([...pg.querySelectorAll('.kpi .disc,.stat .disc,.srow .tile,.scol .disc,.scol .tile,.dk-chip')].some(vis))bad.tile.push(id);
  if([...pg.querySelectorAll('.sec *,.foot *')].some(e=>{const r=e.getBoundingClientRect();return vis(e)&&getComputedStyle(e).position!=='absolute'&&(r.right>W.right+.5||r.bottom>W.bottom+.5)}))bad.overflow.push(id);
  if([...pg.querySelectorAll('.dk-orb,.dk-pcard,.dk-pil,.dk-pl li.end .dk-dot,.kdark')].some(e=>getComputedStyle(e).backgroundImage!=='none'||/rgba\(\d+, \d+, \d+, 0\.[1-9]/.test(getComputedStyle(e).boxShadow)))bad.shadow.push(id)})}));return {n,bad}});
ok('all '+cat.n+' module variants in three divisions: no gradient-filled text',cat.bad.grad.length===0,cat.bad.grad.slice(0,5).join(', '));
ok('no icon tiles on figures or story rows, no 01 02 03 chips on pillars',cat.bad.tile.length===0,cat.bad.tile.slice(0,5).join(', '));
ok('nothing spills past the module (pipeline labels included)',cat.bad.overflow.length===0,cat.bad.overflow.slice(0,5).join(', '));
ok('hub disc, platform card, pillars, pipeline end and navy cards are flat colour without glow',cat.bad.shadow.length===0,cat.bad.shadow.slice(0,5).join(', '));
const icons=await p.evaluate(()=>{const T=__T;const pg=__pg([T.mk('capabilities'),T.mk('features')],{brand:'bm-tp-legal'});const ds=[...pg.querySelectorAll('.cap .disc,.colstat .disc')];return {n:ds.length,shown:ds.filter(d=>d.getBoundingClientRect().width>0).length}});
ok('icons stay where they carry meaning (capability grid, feature row)',icons.n>0&&icons.shown===icons.n,JSON.stringify(icons));
const pick=await p.evaluate(()=>{const T=__T;const pg=__pg([T.mk('features',{items:[{icon:'clock',text:'Strict privacy and security'},{icon:'coins',text:'Reduced costs'},{icon:'gauge',text:'Zebra stripes'}]})]);const sh=T.MODULES.features.render({label:'',items:[{icon:'shield-check',text:'x'}]}).match(/ d="([^"]+)"/)[1];return [...pg.querySelectorAll('.colstat')].map(c=>c.querySelector('svg path').getAttribute('d')===sh)});
ok('a fallback icon is chosen again by its words (a clock on "privacy and security" becomes a shield)',pick[0]===true&&pick[2]===false,JSON.stringify(pick));
const one=await p.evaluate(()=>{const T=__T;const pg=__pg([T.mk('features',{label:'Why Legal',items:[{icon:'timer',text:'On-time Delivery'}]})]);const d=pg.querySelector('.colstat .disc');return getComputedStyle(d).display});
ok('a one-item "Why" row is a line of type, without an orphan icon',one==='none',one);

/* 4. graphics from originals too small to read are left off the page (kept in the material, noted in the editor).
      A small original (under 600 px wide) is no longer placed on a rebuilt page at all; a person can still add one
      from the Library's recovered pictures, and then the same rule applies. */
const fig=await p.evaluate(async()=>{const r={};const addFig=(id,h)=>m=>{const at=m.findIndex(x=>x.type==='cta');m.splice(at<0?m.length:at,0,{id:'figfigfigfig',type:'row',data:{layout:'1',align:'start',fromOriginal:true,slots:[{kind:'image',data:{photo:{elib:'img/'+id+'-vis1.jpg',fx:50,fy:50,zoom:100},fit:'contain',height:h,corners:'square',tone:'white',caption:''}}]}})};window.__addFig=addFig;
 for(const id of ['media-crunchyroll-anime-localization','legal-defense-industry-99-percent-data-reduction']){const plain=await __piece(id);const {pg,mods}=await __piece(id,{edit:addFig(id,160)});const e=await __piece(id,{edit:addFig(id,160),editing:true});
  r[id]={auto:plain.mods.some(m=>m.type==='row'&&m.data.fromOriginal),inMaterial:mods.some(m=>m.type==='row'&&m.data.fromOriginal),printed:pg.querySelectorAll('.imgarea').length,note:[...e.pg.querySelectorAll('.pv-hidden')].map(x=>x.textContent).join('|'),noteShown:e.pg.querySelector('.pv-hidden')?getComputedStyle(e.pg.querySelector('.pv-hidden')).display:'-',printNote:pg.querySelectorAll('.pv-hidden').length}}return r});
Object.keys(fig).forEach(id=>{const f=fig[id];ok(id+': a small original is not put on the rebuilt page; added by hand it stays in the material, is not printed, and the editor says why',!f.auto&&f.inMaterial&&f.printed===0&&f.printNote===0&&/too small to read/.test(f.note)&&f.noteShown!=='none',JSON.stringify(f))});
const big=await p.evaluate(async()=>{const id='media-crunchyroll-anime-localization';const {pg}=await __piece(id,{edit:__addFig(id,400)});const ia=pg.querySelector('.imgarea');return ia?{w:Math.round(ia.getBoundingClientRect().width),pair:!!pg.querySelector('.pp-pair')}:null});
ok('set 360 px or taller, the graphic prints as a full-width proof block, not a margin thumbnail',big&&big.w>=700&&!big.pair,JSON.stringify(big));
const rv=await p.evaluate(()=>{const T=__T;const rows=[];T.ELIB.forEach(pc=>{let m;try{m=T.pieceToModules(pc)}catch(e){return}m.forEach(x=>{if(x.type==='row'&&x.data.fromOriginal)x.data.slots.forEach(s=>rows.push((s.data.photo||{}).elib||''))})});return rows});
ok('no navigation strip or cut-off crop from an original is placed on a rebuilt page',rv.length>=10&&rv.length<=30&&!rv.some(f=>/glweb-ebro-.*-vis1|gdpr-compliance-vis|reef-review-vis|reef-enterprise-vis1/.test(f)),rv.length+' graphics placed');

/* 5. every critique piece fills exactly one sheet, Letter and A4 (Legal with numbers ran 1086 px, Japanese 1089 px) */
const JA=m=>m.forEach(x=>{const d=x.data;if(x.type==='hero'){d.title='アジア太平洋地域の医療従事者エンゲージメントを多言語で強化';d.short='';d.eyebrow='事例紹介'}if(x.type==='cta'){d.button='お問い合わせ';d.title='トランスパーフェクト・ライフサイエンスに相談する'}if(x.type==='storyRows')(d.items||[]).forEach((it,i)=>{it.heading=['課題','解決策','成果'][i];it.text=['バクスターはアジア太平洋の各市場で医療従事者向けコンテンツを迅速かつ一貫して展開する必要がありました。','当社チームは翻訳メモリと専門レビュアーを組み合わせたワークフローを構築しました。','全市場で同時公開を実現し、レビュー期間を大幅に短縮しました。'][i]})});
const heights=await p.evaluate(async JAs=>{const JA=eval(JAs);const out={};for(const id of ['media-crunchyroll-anime-localization','lifesci-baxter-hcp-engagement-apac','legal-defense-industry-99-percent-data-reduction','legal-cross-border-clarity','dataforce-zerog-jet-engine-blade-annotation','kb-gl-gewiss-aem-spotlight','games-team17-global-localization','deck-cs-digital-ecommerce','kb-enterprise-general-brief','deck-cs-cobrand-partnership'])for(const fm of ['letter','a4']){const {pg}=await __piece(id,{fmt:fm});const sh=[...pg.querySelectorAll(':scope>.sheet')];const sheets=sh.length?sh:[pg];sheets.forEach(s=>{s.style.minHeight='0';s.style.height='auto'});out[id.slice(0,18)+'/'+fm]=Math.max(...sheets.map(s=>Math.max(s.offsetHeight,s.scrollHeight)))}
  const T=__T,S=T.S();const pc=T.ELIB.find(x=>x.id==='lifesci-baxter-hcp-engagement-apac');const lay=T.pieceLayout(pc);const mods=JSON.parse(JSON.stringify(lay.modules));JA(mods);
  for(const fm of ['letter','a4']){const f=T.fmtById(fm);out['japanese/'+fm]=T.measureAt(mods,f,lay.tight)}return out},JA.toString());
const tall=Object.keys(heights).filter(k=>heights[k]>(/a4/.test(k)?1123:1056));
ok('every critique piece fits its sheet exactly (no 1086 / 1089 px pages)',tall.length===0,tall.map(k=>k+'='+heights[k]).join(', ')||JSON.stringify(heights).slice(0,160));

/* 6. a one-page piece that stops fitting (translated, or more words) tightens again instead of running off the sheet */
await p.evaluate(()=>{const h=document.getElementById('ps-host');if(h)h.remove()});await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1200);
await p.click('button:has-text("New material")');await p.waitForTimeout(600);await p.keyboard.type('Print system');await p.click('.modal .btn.primary');await p.waitForTimeout(1200);
const refit=await p.evaluate(async JAs=>{const JA=eval(JAs);const T=__T;const pc=T.ELIB.find(x=>x.id==='lifesci-baxter-hcp-engagement-apac');const lay=T.pieceLayout(pc);const m=T.mat();m.modules=JSON.parse(JSON.stringify(lay.modules));m.brand=pc.brand;m.tight=lay.tight;m.rebuiltFrom={id:pc.id};T.setFmt('letter');
  m.lang='ja';JA(m.modules);m.modules.forEach(x=>{if(x.type==='storyRows')x.data.items.forEach(it=>it.text=Array(9).fill(it.text).join(""))});const t0=m.tight;T.redraw();await new Promise(r=>setTimeout(r,300));
  const f=T.fmtById('letter');return {t0,t1:m.tight,h:T.measureAt(m.modules,f,m.tight),fh:f.h}},JA.toString());
ok('a rebuilt one-page piece that grows sets its type smaller again and still fits its sheet',refit.t1>refit.t0&&refit.h<=refit.fh,JSON.stringify(refit));

/* 7. contact details print once: lines the footer already carries are not repeated above it */
const ct=await p.evaluate(async()=>{const id='media-crunchyroll-anime-localization';const {pg,mods}=await __piece(id);const t=pg.innerText;const foot=mods.filter(m=>m.type==='footer')[0].data;
 const note=m=>{const sc=JSON.parse(JSON.stringify(m.filter(x=>x.type==='storyColumns')[0]));sc.id='ctnoteaaaaaa';delete sc.data.title;sc.data.items=[{icon:'mail',heading:'',text:'media@transperfect.com\nmedia.transperfect.com',bullets:''}];m.splice(m.length-2,0,sc)};
 const k=await __piece(id,{edit:note});const kept=k.pg.innerText.split('media@transperfect.com').length-1;const e=await __piece(id,{edit:note,editing:true});
 return {count:t.split('media@transperfect.com').length-1,note:mods.some(m=>m.type==='storyColumns'&&/media@/.test(JSON.stringify(m.data))),extra:foot.extra||'',kept,edit:[...e.pg.querySelectorAll('.pv-hidden')].map(x=>x.textContent).join('|')}});
ok('the media piece prints its contact email once, in the footer, with its second address beside it; a contact note added above the footer is not printed twice',ct.count===1&&!ct.note&&/transperfect\.com\/media/.test(ct.extra)&&ct.kept===1&&/already in the footer/.test(ct.edit),JSON.stringify(ct));
const keepH=await p.evaluate(async()=>{const {pg}=await __piece('legal-cross-border-clarity');return /@transperfectlegal/.test(pg.innerText)});
ok('lines the footer doesn’t carry (social handles) stay on the page',keepH);

/* 8. type details: figures in Arabic read 10M+, brand words never hyphenate, buttons carry no "»", Japanese breaks at phrases */
const ar=await p.evaluate(()=>{const T=__T;const pg=__pg([T.mk('kpis',{items:[{icon:'clock',value:'10M+',caption:'مشاهد'},{icon:'clock',value:'23',caption:'عنوانًا'}]}),T.mk('cta',{button:'ابدأ محادثة'})],{lang:'ar',brand:'bm-tp-media'});const v=pg.querySelector('.t-stat');const bd=v.querySelector('bdi');
  const r=document.createRange();r.selectNodeContents(bd);const rects=[...bd.childNodes[0].textContent].map((ch,i)=>{r.setStart(bd.childNodes[0],i);r.setEnd(bd.childNodes[0],i+1);return [ch,r.getBoundingClientRect().left]});const plus=rects.find(x=>x[0]==='+')[1],one=rects.find(x=>x[0]==='1')[1];
  return {dir:pg.getAttribute('dir'),bdi:!!bd&&bd.getAttribute('dir'),plusRight:plus>one,pill:getComputedStyle(pg.querySelector('.pill'),'::after').content}});
ok('Arabic print: figures sit in a left-to-right run ("10M+", not "+10M")',ar.dir==='rtl'&&ar.bdi==='ltr'&&ar.plusRight,JSON.stringify(ar));
const arz=await p.evaluate(()=>{const T=__T;const hero=T.mk('hero',{layout:'fade',title:'تقديم الأنمي إلى المعجبين حول العالم',eyebrow:'دراسة حالة',photo:{elib:'img/media-cs-crunchyroll.jpg',fx:50,fy:50,zoom:100}});const cta=T.mk('cta',{title:'تحدث إلى ترانس بيرفكت',sub:'Localization, dubbing and subtitling for global content.',button:'ابدأ محادثة'});
  const out={};for(const lang of ['ar','en']){const pg=__pg([hero,cta],{lang,brand:'bm-tp-media'});const hp=pg.querySelector('.hp-fade').getBoundingClientRect(),hc=pg.querySelector('.hcopy').getBoundingClientRect(),pr=pg.getBoundingClientRect();const sub=pg.querySelector('.m-cta .t-body,.m-cta .sub,.cta p');const bdi=[...pg.querySelectorAll('bdi[dir=ltr]')].find(b=>/Localization/.test(b.textContent));
   out[lang]={hpR:Math.round(hp.right-pr.left),hpL:Math.round(hp.left-pr.left),hcL:Math.round(hc.left-pr.left),hcR:Math.round(hc.right-pr.left),bdi:!!bdi}}
  return out});
ok('Arabic hero: the headline column and the photo box are both laid out',arz.ar.hcR>arz.ar.hcL&&arz.ar.hpR>arz.ar.hpL,JSON.stringify(arz.ar));
ok('Arabic page: an English CTA line is its own left-to-right run, so its full stop stays at its end',arz.ar.bdi,JSON.stringify(arz.ar));
ok('English hero with the same photo: the copy stays left of the logo, photo box untouched, no bdi added',arz.en.hcR<=arz.en.hpL+300&&!arz.en.bdi&&arz.en.hpR>=800,JSON.stringify(arz.en));
ok('print buttons carry the words only, no "»" (RTL included)',ar.pill==='none'||ar.pill==='normal',ar.pill);
const hy=await p.evaluate(()=>{const T=__T;const pg=__pg([T.mk('hero',{title:'TransPerfect GlobalLink DataForce solutions for global business',highlight:''})],{fmt:'letter'});const s=[...pg.querySelectorAll('h1 .pv-nohy')];return {n:s.length,hy:s.map(x=>getComputedStyle(x).hyphens),txt:pg.querySelector('h1').textContent}});
ok('brand names in a headline never break with a hyphen (and the words are unchanged)',hy.n===3&&hy.hy.every(h=>h==='manual'||h==='none')&&hy.txt==='TransPerfect GlobalLink DataForce solutions for global business',JSON.stringify(hy));
const ja=await p.evaluate(()=>{const T=__T;const pg=__pg([T.mk('hero',{layout:'fade',title:'アジア太平洋地域の医療従事者エンゲージメントを多言語で強化',highlight:''})],{lang:'ja',fmt:'letter'});const h=pg.querySelector('h1');const r=document.createRange();const w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT);const tops=[];let tx='';let t;while((t=w.nextNode())){for(let i=0;i<t.length;i++){r.setStart(t,i);r.setEnd(t,i+1);tops.push(Math.round(r.getBoundingClientRect().top));tx+=t.data[i]}}
  const lines=[];let cur='';for(let i=0;i<tx.length;i++){if(i&&tops[i]!==tops[i-1]){lines.push(cur);cur=''}cur+=tx[i]}lines.push(cur);return {wb:getComputedStyle(h).wordBreak,lines}});
ok('Japanese headline breaks between phrases (エンゲージメント stays whole)',ja.wb==='auto-phrase'&&ja.lines.some(l=>l.indexOf('エンゲージメント')>=0),JSON.stringify(ja));

/* 9. brand marks: Enterprise and Co-brand footers use the current wordmark family; the band footer keeps the page margin */
const lk=await p.evaluate(()=>{const T=__T;const cur=T.BRAND_LOGOS['tp-current'].light,old=T.BRAND_LOGOS['tp-classic'].light;const r={};['bm-enterprise','bm-cobrand'].forEach(br=>{const pg=__pg([T.mk('footer')],{brand:br});const src=pg.querySelector('.foot img').getAttribute('src');r[br]=src===cur?'current':src===old?'legacy':'other'});
  const pg=__pg([T.mk('footer',{surface:'band'})],{brand:'bm-tp-legal'});const img=pg.querySelector('.foot img').getBoundingClientRect(),pr=pg.getBoundingClientRect();r.inset=Math.round(img.left-pr.left);return r});
ok('Enterprise and Co-brand footers carry the current TransPerfect wordmark, not the legacy icon lockup',lk['bm-enterprise']==='current'&&lk['bm-cobrand']==='current',JSON.stringify(lk));
ok('a full-width footer band keeps its lockup at the page margin, off the edge',lk.inset>=30,lk.inset);

/* 10. print copy hygiene: headings carry no full stop, long capitals are sentence case, addresses are lower case, an attribution prints once */
const hg=await p.evaluate(()=>{const T=__T;const q=(pg,sel)=>[...pg.querySelectorAll(sel)].map(e=>e.textContent.trim());
  const pg=__pg([T.mk('hero',{layout:'text',title:'Multilingual SEO lifted organic revenue 41% in six months.',eyebrow:'Case study',lead:'THE GLOBAL LEADER IN AI AND LEGAL TECHNOLOGY FROM TRANSPERFECT'}),
   T.mk('storyColumns',{items:[{icon:'search',heading:'At a Glance.',text:'Body text stays as written.',bullets:''}]}),
   T.mk('storyColumns',{items:[{icon:'languages',heading:'',text:'Stefano Bianchi\nCorporate Marketing Director\nGEWISS',bullets:''}]}),
   T.mk('quote',{quote:'A quote.',attribution:'- Stefano Bianchi, Corporate Marketing Director, GEWISS',side:'none',proof:[]}),
   T.mk('footer',{url:'WWW.TRANSPERFECT.COM',email:'GLLive@TRANSPERFECT.COM'})],{brand:'bm-tp-legal'});
  const txt=pg.textContent;return {h1:q(pg,'h1')[0],lead:q(pg,'.t-lead')[0],glance:/At a Glance(?!\.)/.test(txt)&&!/At a Glance\./.test(txt),attr:(txt.match(/Stefano Bianchi/g)||[]).length,url:/www\.transperfect\.com/.test(txt)&&!/WWW\./.test(txt),email:/GLLive@transperfect\.com/.test(txt),body:/Body text stays as written\./.test(txt)}});
ok('a printed headline has no trailing full stop; a body sentence keeps its own',hg.h1.replace(/[\u00ad\u200b\s]+/g,' ').trim()==='Multilingual SEO lifted organic revenue 41% in six months'&&hg.body,JSON.stringify(hg));
ok('a section heading "At a Glance." prints without its full stop',hg.glance,JSON.stringify(hg));
ok('a capitalised subtitle is set in sentence case, keeping AI and TransPerfect',hg.lead==='The global leader in AI and legal technology from TransPerfect',hg.lead);
ok('a name and role already in the quote attribution print once',hg.attr===1,hg.attr);
ok('the footer web address and e-mail domain keep lower case',hg.url&&hg.email,JSON.stringify(hg));
const lc=await p.evaluate(()=>{const T=__T;const t=(mods)=>{const pg=__pg(mods,{brand:'bm-tp-legal'});return {h1:pg.querySelector('h1').textContent.replace(/\s+/g,' ').trim(),lead:(pg.querySelector('.t-lead')||{textContent:''}).textContent.trim(),caps:/is-caps/.test(pg.querySelector('h1').className)}};
  return {lib:t([T.mk('hero',{layout:'text',title:'LANGUAGE AND TECHNOLOGY SOLUTIONS FOR GLOBAL BUSINESS',lead:'One sentence lead.'})]),own:t([T.mk('hero',{layout:'text',title:'A PERSON TYPED THIS HEADLINE IN CAPITALS ALONE',lead:'First sentence. Second sentence.'})]),ell:t([T.mk('hero',{layout:'text',title:'Plain title',lead:'Trailing off...'})]),abbr:t([T.mk('hero',{layout:'text',title:'Plain title',lead:'Offices in the U.S., Canada etc.'})])}});
ok('a capitals headline that is library text prints in sentence case; one a person typed keeps its letters',lc.lib.h1==='Language and technology solutions for global business'&&!lc.lib.caps&&lc.own.h1==='A PERSON TYPED THIS HEADLINE IN CAPITALS ALONE'&&lc.own.caps,JSON.stringify(lc));
ok('a one-sentence subtitle prints without its closing full stop; a second sentence, an ellipsis and an abbreviation keep theirs',lc.lib.lead==='One sentence lead'&&lc.own.lead==='First sentence. Second sentence.'&&lc.ell.lead==='Trailing off...'&&/etc\.$/.test(lc.abbr.lead),JSON.stringify(lc));
ok('no page errors',errs.length===0,errs.slice(0,3).join(' | '));
R.forEach(x=>console.log(x));console.log(R.filter(x=>x.startsWith('FAIL')).length?'FAILURES':'no errors');await b.close()})();
