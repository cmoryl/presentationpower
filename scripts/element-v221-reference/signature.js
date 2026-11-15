// Signature moves for social, ad and sequence sizes (99u-signature.js): translation line, number-first, photo
// grade and crop rule with a marked logo zone, partner lockup, carousel arc, division signatures, statViz rules.
const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js','pptxgenjs':L+'pptxgenjs-3.12.0/package/dist/pptxgen.bundle.js','docx@':L+'docx-8.5.0/package/build/index.umd.js'};
await p.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])})});
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);
// a piece from the library, rebuilt into the open material
const load=(id,extra)=>p.evaluate(([id,extra])=>{const T=__T;const pc=T.ELIB.find(x=>x.id===id);const lay=T.pieceLayout(pc);const m=T.mat();m.modules=JSON.parse(JSON.stringify(lay.modules));m.brand=pc.brand;m.client=pc.client;m.lang='en';m.rebuiltFrom={id};if(extra)eval(extra);T.redraw()},[id,extra||'']).then(()=>p.evaluate(()=>__T.SIG.prep())).then(()=>p.waitForTimeout(400));
// one size drawn and fitted off screen; returns what the checks read
const frame=(id,lang)=>p.evaluate(async([id,lang])=>{const T=__T;const f=T.fmtById(id);const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0';document.body.appendChild(host);
 host.innerHTML=T.withLang(lang||'en',()=>T.fmtHTML(JSON.parse(JSON.stringify(T.mat().modules)),f,false));const fr=host.firstElementChild;await document.fonts.ready;T.fitFrame(fr);
 const vis=e=>e&&e.getBoundingClientRect().width>0&&!e.closest('[data-off]');const R0=fr.getBoundingClientRect();const r=e=>{const q=e.getBoundingClientRect();return {x:q.left-R0.left,y:q.top-R0.top,w:q.width,h:q.height}};
 const bigs=[...fr.querySelectorAll('.big')].filter(vis);const tl=fr.querySelector('.sig-tl');const lock=fr.querySelector('.sig-lock');const tp=lock&&lock.querySelector('.sig-tp');
 const texts=[...fr.querySelectorAll('[data-r]')].filter(e=>vis(e)&&e.tagName!=='IMG'&&!e.classList.contains('sig-lock')&&e.textContent.trim()).map(e=>({r:e.getAttribute('data-r'),fs:parseFloat(getComputedStyle(e).fontSize)}));
 const pill=fr.querySelector('.pill');
 const o={sig:fr.getAttribute('data-sig'),brand:fr.getAttribute('data-brand'),treat:(fr.className.match(/treat-(\w+)/)||[])[1],over:!!fr.dataset.over,bigs:bigs.length,leadFs:bigs[0]?parseFloat(bigs[0].style.fontSize):0,leadBox:bigs[0]?r(bigs[0]):null,
  stats:[...fr.querySelectorAll('[data-rung="stats"]')].some(vis),tl:!!(tl&&vis(tl)),tlBox:tl?r(tl):null,edge:!!fr.querySelector('.sig-edge'),
  lock:lock?(lock.textContent.trim()+[...lock.querySelectorAll('img[alt]')].map(i=>' '+i.alt).join('')):null,lockDiv:!!(lock&&lock.querySelector('.sig-div')),tpW:tp?tp.getBoundingClientRect().width:0,tpPlain:tp?tp.classList.contains('sig-plain'):null,clImg:!!(lock&&lock.querySelector('.sig-cl')),
  clFilter:lock&&lock.querySelector('.sig-cn,.sig-cl')?getComputedStyle(lock.querySelector('.sig-cn,.sig-cl')).filter:'none',
  arrow:pill?getComputedStyle(pill,'::after').content:'',minFs:Math.min(...texts.map(t=>t.fs)),texts,
  duo:!!fr.querySelector('.sig-duo'),graded:!!fr.querySelector('img.sig-graded'),clip:fr.querySelector('.fz-photo')?getComputedStyle(fr.querySelector('.fz-photo')).clipPath:'',
  objPos:(fr.querySelector('img.fxbg')||{style:{}}).style.objectPosition||'',html:fr.innerHTML.length<2e6?fr.innerHTML:''};
 host.remove();return o},[id,lang]);

// ---- S2 number-first, S1 translation line, S4 lockup: Crunchyroll (Media) ----
await load('media-crunchyroll-anime-localization');
await p.evaluate(()=>{__T.mat().photoGrade='duotone'});const sq=await frame('square'),sl=await frame('slide'),st=await frame('story'),lb=await frame('leaderboard'),bb=await frame('billboard'),mr=await frame('mrec');
ok('S2: one figure in the Square, Story and Billboard, no row of other numbers',sq.bigs===1&&st.bigs===1&&bb.bigs===1&&!sq.stats&&!st.stats,[sq.bigs,st.bigs,bb.bigs,sq.stats].join());
ok('S2: the lead number is the largest type in the Square (≥ 150 px on 1080)',sq.leadFs>=150&&sq.leadFs>=Math.max(...sq.texts.filter(t=>t.r!=='lead').map(t=>t.fs))*1.6,sq.leadFs);
ok('S2: the 16:9 slide keeps its other numbers',sl.stats&&sl.bigs>=2,sl.bigs);
ok('S1: the translation line sits under the lead number and runs to the frame edge',sq.tl&&sq.tlBox.y>=sq.leadBox.y+sq.leadBox.h-2&&sq.tlBox.y-(sq.leadBox.y+sq.leadBox.h)<80,JSON.stringify([sq.leadBox,sq.tlBox]));
ok('S1: strips and banners carry the line along the bottom edge',lb.edge&&bb.edge);
ok('S4: client | division lockup with a hairline, the same in Square, Story, LinkedIn and Billboard',[sq,st,bb].every(x=>/Crunchyroll/.test(x.lock)&&x.lockDiv),[sq.lock,st.lock,bb.lock].join(' / '));
ok('S4: the division logo is at least 180 px wide on a 1080 px frame',sq.tpW>=179&&st.tpW>=179,sq.tpW+' / '+st.tpW);
ok('S4: the descriptor reads where it is seen; a 300 px ad uses the wordmark alone',sq.tpPlain===false&&mr.tpPlain===true,[sq.tpPlain,mr.tpPlain].join());
ok('buttons never carry »',!/»/.test(sq.arrow),sq.arrow);
ok('Media signature: Square and Story are full-bleed, the copy on the darkened lower part',sq.treat==='bleed'&&st.treat==='bleed'&&sq.leadBox.y>1080*0.45,sq.treat+' '+st.treat+' '+Math.round(sq.leadBox.y));
ok('Story: the lead number sits in the lower third, inside the safe area',st.leadBox.y>1920*0.5&&st.leadBox.y+st.leadBox.h<1920-340,JSON.stringify(st.leadBox));
ok('legibility: 18 px or more on a 1080 frame, nothing flagged',sq.minFs>=18&&st.minFs>=18&&!sq.over&&!st.over,sq.minFs+' / '+st.minFs);
ok('S3: the photo carries the division duotone (blend layers on a page opened from disk)',sq.duo||sq.graded);

// ---- S3 crop rule and the marked zone ----
const crop=await p.evaluate(()=>{const S=__T.SIG;const p={data:'x',fx:50,fy:50,zoom:100,w:1600,h:900,zone:{x:51,y:32,w:45,h:17}};S.dims;const out=[];
 for(const [bw,bh] of [[787,1080],[1080,443],[490,627],[262,250],[970,250]]){const c=__T.SIG.crop(p,bw,bh,{});const k=Math.max(bw/1600,bh/900),sw=1600*k,sh=900*k;
  const zl=S.land(51,c.ax,bw,sw,c.z),zr=S.land(96,c.ax,bw,sw,c.z),zt=S.land(32,c.ay,bh,sh,c.z),zb=S.land(49,c.ay,bh,sh,c.z);
  const inside=zl>=-.5&&zr<=bw+.5&&zt>=-.5&&zb<=bh+.5,out2=zr<=.5||zl>=bw-.5||zb<=.5||zt>=bh-.5;out.push(inside||out2)}
 const subj=__T.SIG.crop({data:'y',fx:30,fy:30,zoom:100,w:1600,h:900},500,1000,{});const k=Math.max(500/1600,1000/900);const lx=S.land(30,subj.ax,500,1600*k,subj.z);
 return {zone:out,third:Math.abs(lx-500/3)<500*0.06||Math.abs(lx-1000/3)<500*0.06,lx}});
ok('S3: a marked logo is either whole or left out in every crop shape',crop.zone.every(Boolean),crop.zone.join());
ok('S3: the subject lands on a thirds line where the photo can move',crop.third,crop.lx);
const gp=await p.evaluate(()=>{const d=new Uint8ClampedArray([0,0,0,255,255,255,255,255]);__T.SIG.gradePixels(d,{s:'#002673',h:'#e6f6f4',mix:1});return [...d]});
ok('S3: the grade maps black to the division shadow and white near the highlight',gp[0]===0&&gp[1]===38&&gp[2]===115&&gp[4]>220&&gp[6]>230,gp.join());
const zs=await p.evaluate(()=>{const g=window.__T.SIG.clean;return g?[g({data:'data:image/png;base64,AAAA',zone:{x:10,y:20,w:30,h:15}}),g({data:'data:image/png;base64,AAAA',zone:{x:'<b>',y:2,w:3,h:4}}),g({data:'data:image/png;base64,AAAA',zone:{x:90,y:0,w:50,h:200}})]:null});
ok('schema guard: a zone keeps four numbers inside the photo, anything else is dropped',zs&&JSON.stringify(zs[0].zone)==='{"x":10,"y":20,"w":30,"h":15}'&&!zs[1].zone&&zs[2].zone.w===10&&zs[2].zone.h===100,JSON.stringify(zs&&zs.map(x=>x.zone)));

// ---- the marking tool in the per-size photo panel ----
await p.evaluate(()=>{const m=__T.mat();const c=document.createElement('canvas');c.width=800;c.height=450;const g=c.getContext('2d');g.fillStyle='#f80';g.fillRect(0,0,800,450);g.fillStyle='#fff';g.fillRect(420,150,330,60);
 m.modules.find(x=>x.type==='hero').data.photo={data:c.toDataURL('image/jpeg',.9),fx:50,fy:50,zoom:100,w:800,h:450};__T.setFmt('square');__T.redraw()});
await p.waitForTimeout(900);
const hasBtn=await p.isVisible('#szp-mark');ok('the photo panel offers "Mark the logo or text in this photo"',hasBtn&&/Mark the logo or text in this photo/.test(await p.textContent('#szp-mark')));
await p.click('#szp-mark');await p.waitForTimeout(150);
const pr=await p.$eval('.szp-prev',e=>{const r=e.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}});
const imgK=Math.min(pr.w/800,pr.h/450),ox=pr.x+(pr.w-800*imgK)/2,oy=pr.y+(pr.h-450*imgK)/2;
await p.mouse.move(ox+420*imgK,oy+150*imgK);await p.mouse.down();await p.mouse.move(ox+600*imgK,oy+180*imgK,{steps:4});await p.mouse.move(ox+750*imgK,oy+210*imgK,{steps:4});await p.mouse.up();await p.waitForTimeout(500);
const zone=await p.evaluate(()=>__T.mat().modules.find(x=>x.type==='hero').data.photo.zone);
ok('dragging a box stores the zone on the photo, in percent of the photo',zone&&Math.abs(zone.x-52.5)<4&&Math.abs(zone.w-41)<5&&Math.abs(zone.y-33)<5,JSON.stringify(zone));
const fz=await p.evaluate(()=>__T.photoFor?__T.mat().modules.find(x=>x.type==='hero').data.photo.fx:null);
ok('marking does not move the focal point',fz===50,fz);
const ex=await p.evaluate(async()=>{__T.mat().photoGrade='duotone';await __T.SIG.prep();await new Promise(r=>setTimeout(r,300));const f=__T.fmtById('linkedin');const h=__T.fmtHTML(__T.mat().modules,f,false);return {graded:/sig-graded/.test(h),blob:/src="blob:/.test(h)}});
ok('S3: a photo the page can read is baked to the graded file (exports read it as one picture)',ex.graded&&ex.blob,JSON.stringify(ex));
ok('the zone has a "Clear the mark" button once set',await p.isVisible('#szp-unmark'));
await p.click('#szp-mark');await p.waitForTimeout(100);await p.focus('#szp-mark');ok('the marking button takes keyboard focus',await p.evaluate(()=>document.activeElement.id==='szp-mark'));

// ---- Team17 (Games): the client's name in type, never a whitened raster; diagonal photo edge ----
await load('games-team17-global-localization');
const gm=await frame('linkedin');
ok('Team17: no white blob — the client is named in type (no one-colour library file ships)',/Team17/.test(gm.lock)&&!gm.clImg&&gm.clFilter==='none',gm.lock+' '+gm.clFilter);
ok('Games signature: a diagonal edge where the photo meets the panel',/polygon/.test(gm.clip),gm.clip);
const games=await p.evaluate(()=>{const b=__T.brandById('bm-tp-games');return [b.name,b.short,b.ctaTitle]});
ok('brand data says TransPerfect Games, like the logo and the call to action',games.join('|')==='TransPerfect Games|Games|Talk to TransPerfect Games',games.join('|'));
const pq=await p.evaluate(()=>{const pl=__T.SEQ.plan(__T.mat(),'seq-ig');const q=pl.on.find(x=>x.id==='quote');return q?q.alts[0]:null});
ok('S5: the carousel quote is a whole sentence of 15 words or fewer',pq&&pq.split(/\s+/).length<=15&&/swiftness and flexibility of their team\.$/.test(pq),pq);

// ---- division signatures and palettes ----
const sigs={};for(const [k,id] of [['legal','legal-defense-industry-99-percent-data-reduction'],['lifesci','lifesci-baxter-hcp-engagement-apac'],['gl','kb-gl-gewiss-aem-spotlight'],['digital','deck-cs-digital-ecommerce'],['cobrand','deck-cs-cobrand-partnership']]){await load(id);sigs[k]=await frame('linkedin')}
ok('each division draws its own signature',sigs.legal.sig==='legal'&&sigs.lifesci.sig==='lifesci'&&sigs.gl.sig==='gl'&&sigs.digital.sig==='digital'&&sigs.cobrand.sig==='cobrand',Object.values(sigs).map(x=>x.sig).join());
const lg=await p.evaluate(()=>{const f=__T.fmtById('linkedin');const host=document.createElement('div');host.innerHTML=__T.fmtHTML(__T.mat().modules,f,false);document.body.appendChild(host);const z=host.querySelector('.fm-fzone');const r=getComputedStyle(z).borderInlineStartWidth;host.remove();return r});
const cb=await p.evaluate(()=>{const f=__T.fmtById('linkedin');const host=document.createElement('div');host.innerHTML=__T.fmtHTML(__T.mat().modules,f,false);document.body.appendChild(host);const ph=host.querySelector('.fz-photo');const w=ph?ph.getBoundingClientRect().width:0;host.remove();return w});
ok('co-brand: half photo, half copy',Math.abs(cb-600)<2,cb);
const pf=await p.evaluate(()=>__T.preflight(__T.mat()).list.filter(x=>/co-brand/i.test(x[1])).length);ok('co-brand without a partner name says how to add one',pf===1);
await load('legal-defense-industry-99-percent-data-reduction');
const lgz=await p.evaluate(()=>{const f=__T.fmtById('linkedin');const host=document.createElement('div');host.innerHTML=__T.fmtHTML(__T.mat().modules,f,false);document.body.appendChild(host);const z=host.querySelector('.fm-fzone');const r=parseFloat(getComputedStyle(z).borderInlineStartWidth);host.remove();return r});
ok('Legal signature: a left accent rule along the text column',lgz>=2,lgz);

// ---- statViz: rings for shares, pictograms for ten things or fewer ----
const kinds=await p.evaluate(()=>[['+54%','organic sessions'],['98%','quality score'],['23','titles'],['4','joint QBRs / year'],['5','languages'],['120%','of target']].map(([v,c])=>__T.statVizKind({value:v,caption:c})));
ok('a ring only for a share of a whole; pictograms only for ten things or fewer',kinds.join()==='null,ring,null,tiles,chips,null'.replace(/null/g,''),kinds.join());

// ---- sequences: progress line, one number, photo continuity, lockup ----
await load('media-crunchyroll-anime-localization');
const sq2=await p.evaluate(()=>{const mt=__T.SEQ.mount(__T.mat(),'seq-ig');const o=mt.nodes.map(x=>({id:x.fr.id,prog:(x.node.querySelector('.sig-prog i')||{style:{}}).style.width,img:!!x.node.querySelector('.sq-img'),k:x.node.querySelectorAll('.sq-k').length,lock:!!x.node.querySelector('.sig-lock'),over:x.over}));mt.host.remove();return o});
ok('carousel: the progress line fills page by page',sq2.map(x=>parseFloat(x.prog)).every((v,i,a)=>!i||v>a[i-1])&&parseFloat(sq2[sq2.length-1].prog)===100,sq2.map(x=>x.prog).join());
ok('S5: the cover and the challenge page share the photo; the others are type',sq2[0].img&&sq2.find(x=>x.id==='challenge').img&&sq2.filter(x=>x.img).length===2,sq2.map(x=>x.id+':'+x.img).join());
ok('S5: the result page shows one number',sq2.find(x=>x.id==='result').k===1);
ok('carousel frames sign off with the partner lockup, nothing overflows',sq2.every(x=>x.lock&&!x.over),sq2.map(x=>x.id+':'+x.lock+':'+x.over).join());
const ad=await p.evaluate(()=>{const mt=__T.SEQ.mount(__T.mat(),'seq-billboard');const o=mt.nodes.map(x=>({id:x.fr.id,k:x.node.querySelectorAll('.sq-k').length,edge:!!x.node.querySelector('.sig-edge')}));mt.host.remove();return o});
ok('rotating ads: one number per frame, the line along the bottom edge',ad.every(x=>x.k<=1&&x.edge),JSON.stringify(ad));
const arK=await p.evaluate(()=>{const m=__T.mat();m.lang='ar';const mt=__T.SEQ.mount(m,'seq-billboard');const h=mt.nodes[1].node.querySelector('.sq-k').innerHTML;mt.host.remove();m.lang='en';return h});
ok('Arabic: figures in a left-to-right isolate',/<bdi dir="ltr">10M\+<\/bdi>/.test(arK),arK);
const arA=await frame('square','ar');ok('Arabic: the button never carries a » arrow',!/»/.test(arA.arrow),arA.arrow);

// ---- Japanese: breaks between words, never inside one ----
const ja=await p.evaluate(()=>{const m=__T.mat();m.modules.find(x=>x.type==='hero').data.title='アジア太平洋地域の医療従事者エンゲージメントを多言語で強化';m.modules.find(x=>x.type==='hero').data.short='';const h=__T.withLang('ja',()=>__T.fmtHTML(m.modules,__T.fmtById('x'),false));return h.match(/<h1[^>]*>(.*?)<\/h1>/)[1]});
ok('Japanese: a break opportunity between words only (エンゲージメント stays whole, を stays with it)',/<wbr>/.test(ja)&&/エンゲージメントを/.test(ja),ja);

ok('no script errors',!errs.length,errs.slice(0,3).join(' | '));
R.forEach(x=>console.log(x));console.log(R.filter(x=>x.startsWith('PASS')).length+'/'+R.length+' passed');await b.close()})();
