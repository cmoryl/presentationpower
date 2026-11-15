// Sequences: LinkedIn and Instagram carousels, story sequences, rotating display ads (99p-sequences.js)
const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js','pptxgenjs':L+'pptxgenjs-3.12.0/package/dist/pptxgen.bundle.js','docx@':L+'docx-8.5.0/package/build/index.umd.js'};
await p.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])})});
await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);
const IDS=['seq-li','seq-li-sq','seq-ig','seq-story','seq-mrec','seq-leaderboard','seq-billboard','seq-halfpage'];

// ---- the size bar and the filmstrip ----
const bar=await p.$$eval('#stage .fmtbar .seq-b .fmt-n',b=>b.map(x=>x.textContent));
ok('the size bar has a Sequences group with all eight sequences',bar.length===8&&!!(await p.$('#stage .fmtbar .seq-gsep')),bar.join(', '));
await p.click('#stage .fmtbar .seq-b:has-text("IG")');await p.waitForTimeout(900);
const cards=await p.$$eval('.seq-card',c=>c.map(x=>x.getAttribute('data-id')));
ok('Instagram carousel: hook, challenge, solution, result, quote, call to action',cards.join()==='hook,challenge,solution,result,quote,cta',cards.join());
ok('each frame shows its n/N marker',(await p.$$eval('.seq-card .sq-mark',m=>m.map(x=>x.textContent))).join()==='1/6,2/6,3/6,4/6,5/6,6/6');
ok('frames show side by side in a scrolling strip',await p.$eval('.seq-film',e=>e.scrollWidth>e.clientWidth&&getComputedStyle(e).overflowX==='auto'));
const w=await p.$eval('.seq-card .seq-fr',e=>e.getBoundingClientRect().width);ok('each frame shows at a readable size',w>=250,Math.round(w)+' px wide');
ok('nothing in the Fernwood frames overflows',await p.evaluate(()=>!document.querySelector('.seq-film .seqf[data-over]')));
ok('no sideways scroll on the page',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
// leave a frame out, reorder, the floor of three
await p.uncheck('#seq-inc-quote');await p.waitForTimeout(600);
let seq=await p.evaluate(()=>__T.mat().seq&&__T.mat().seq['seq-ig']);
ok('leaving a frame out is stored on the material',seq&&seq.off.join()==='quote',JSON.stringify(seq));
ok('the markers count only the frames that ship',(await p.$$eval('.seq-card:not(.is-off) .sq-mark',m=>m.map(x=>x.textContent))).join()==='1/5,2/5,3/5,4/5,5/5');
ok('a frame left out stays in the strip, dimmed, with its toggle',await p.$eval('.seq-card[data-id="quote"]',c=>c.classList.contains('is-off')&&!c.querySelector('input').checked));
await p.click('#seq-mv-r-challenge');await p.waitForTimeout(600);
seq=await p.evaluate(()=>__T.mat().seq['seq-ig']);
ok('Move later reorders the frames and keeps focus on the control',seq.frames.slice(0,3).join()==='hook,solution,challenge'&&await p.evaluate(()=>/^seq-mv-/.test(document.activeElement.id)),seq.frames.join());
for(const id of ['solution','challenge'])await p.uncheck('#seq-inc-'+id),await p.waitForTimeout(500);
await p.click('#seq-inc-result');await p.waitForTimeout(500);
ok('a sequence never drops below three frames',await p.isChecked('#seq-inc-result')&&(await p.$$('.seq-card:not(.is-off)')).length===3);
// stored choices survive a save and reopen, and are sanitized
const before=JSON.stringify(await p.evaluate(()=>__T.mat().seq['seq-ig']));
await p.waitForTimeout(1200);await p.evaluate(()=>__T.go('project',__T.S().pid));await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);
seq=await p.evaluate(()=>__T.mat().seq&&__T.mat().seq['seq-ig']);
ok('the order and the frames left out are saved with the material',JSON.stringify(seq)===before,JSON.stringify(seq));
const clean=await p.evaluate(()=>__T.SEQ.clean({'seq-ig':{frames:['hook','hook','<img>',7,'cta'],off:'x'},'evil':{frames:['a']},'seq-nope':{frames:[]},'__proto__':{}}));
ok('stored choices are sanitized: known sequences, short ids, no repeats',JSON.stringify(clean)==='{"seq-ig":{"frames":["hook","cta"],"off":[]}}',JSON.stringify(clean));
await p.evaluate(()=>{delete __T.mat().seq;__T.redraw()});

// ---- rotating ads: frames, logo and button on each, play preview ----
await p.evaluate(()=>{__T.setFmt('seq-mrec');__T.redraw()});await p.waitForTimeout(800);
const ad=await p.$$eval('.seq-card',c=>c.map(x=>x.getAttribute('data-id')));
ok('a rotating ad: hook, lead number, other numbers, end frame',ad.join()==='hook,num,nums,end',ad.join());
ok('the logo and the button are on every ad frame',await p.$$eval('.seq-film .seqf',fs=>fs.every(f=>f.querySelector('[data-logo]')&&f.querySelector('.sq-pill'))));
ok('each ad frame says when it shows',(await p.$$eval('.seq-t',t=>t.map(x=>x.textContent))).join('|')==='0 to 3 s|3 to 6 s|6 to 9 s|end frame, from 9 s');
await p.click('.seq-play');await p.waitForTimeout(300);
ok('Play preview shows the ad at its real size',await p.$eval('.seq-pv',e=>Math.round(e.getBoundingClientRect().width))===300);
ok('the preview says which frame is showing',/Frame 1 of 4/.test(await p.textContent('.seq-pcap')));
await p.click('.seq-pbar button:has-text("Close preview")');
ok('Close preview returns focus to the Play button',await p.evaluate(()=>document.activeElement.classList.contains('seq-play')));

// ---- every frame fits for the library pieces, long lines, no photo, no numbers, Arabic ----
await p.evaluate(()=>__T.go('project',__T.S().pid));await p.waitForTimeout(1500);
await p.click('button:has-text("New material")');await p.waitForTimeout(800);await p.keyboard.type('Sequence pieces');await p.click('.modal .btn.primary');await p.waitForTimeout(2000);
const MID=await p.evaluate(()=>__T.mat().id);
const fit=await p.evaluate(ids=>{const out={};['media-crunchyroll-anime-localization','kb-gl-gewiss-aem-spotlight','lifesci-baxter-hcp-engagement-apac'].forEach(id=>{const T=__T;const pc=T.ELIB.find(x=>x.id===id);const lay=T.pieceLayout(pc);const m=T.mat();m.modules=JSON.parse(JSON.stringify(lay.modules));m.brand=pc.brand;m.client=pc.client;
  ids.forEach(f=>{const mt=T.SEQ.mount(m,f);out[id.slice(0,12)+':'+f]=[mt.nodes.length,mt.nodes.filter(x=>x.over).map(x=>x.fr.id).join('+'),mt.nodes.map(x=>x.fr.id).join(',')];mt.host.remove()})});return out},IDS);
const bad=Object.keys(fit).filter(k=>fit[k][1]||fit[k][0]<3);
ok('Crunchyroll, GEWISS and Baxter: every frame of every sequence fits, at least three each',!bad.length,bad.map(k=>k+' '+fit[k][1]).join('; ')||Object.keys(fit).length+' sequences');
ok('GEWISS (no numbers, 107-character headline) still makes its carousel and ads',fit['kb-gl-gewiss:seq-ig'][2]==='hook,challenge,solution,result,quote,cta'&&fit['kb-gl-gewiss:seq-mrec'][2]==='hook,result,end',fit['kb-gl-gewiss:seq-ig'][2]+' / '+fit['kb-gl-gewiss:seq-mrec'][2]);
const hookFs=await p.evaluate(()=>{const T=__T;const pc=T.ELIB.find(x=>x.id==='kb-gl-gewiss-aem-spotlight');const m=T.mat();const mt=T.SEQ.mount(m,'seq-ig');const hl=mt.nodes[0].node.querySelector('.sq-hl');const r=[parseFloat(hl.style.fontSize),hl.scrollWidth<=hl.clientWidth];mt.host.remove();return r});
ok('a long headline shrinks but stays above its floor (56 px on a 1080 frame)',hookFs[0]>=56&&hookFs[1],hookFs[0]+' px');
const ph=await p.evaluate(()=>{const m=__T.mat();const mt=__T.SEQ.mount(m,'seq-ig');const n=mt.nodes[0].node;const r=[!!n.querySelector('.sq-img'),n.querySelectorAll('.sq-img').length,mt.nodes.slice(1).every(x=>!x.node.querySelector('.sq-img'))];mt.host.remove();return r});
// (S5: the challenge page carries the next part of the same photo)
const ph2=await p.evaluate(()=>{const m=__T.mat();const mt=__T.SEQ.mount(m,'seq-ig');const r=mt.nodes.filter(x=>x.node.querySelector('.sq-img')).map(x=>x.fr.id).join();mt.host.remove();return r});
ok('the photo is on the cover and the challenge page only',ph[0]&&ph[1]===1&&/^hook(,challenge)?$/.test(ph2),ph2);
const pos=await p.evaluate(()=>__T.SEQ.photoPos({fx:50,fy:95,w:1000,h:2000},1080,800,.6));
// a higher object-position shows more of the photo's bottom, so the subject rises in the frame
ok('a subject low in the photo is lifted clear of the words',pos.y>95,JSON.stringify(pos));
// a short material: no photo, no numbers, no story
const thin=await p.evaluate(()=>{const m={id:'x',name:'Thin',modules:[__T.mk('hero'),__T.mk('cta'),__T.mk('footer')]};m.modules[0].data.layout='text';return [__T.SEQ.plan(m,'seq-ig').ok,__T.SEQ.plan(m,'seq-ig').on.map(x=>x.id).join(),__T.SEQ.plan(m,'seq-mrec').on.map(x=>x.id).join()]});
ok('a material with only a hero and CTA still gets three frames from its own words',thin[0]&&thin[1].split(',').length>=3,thin[1]+' / '+thin[2]);
// Arabic: mirrored, figures keep their order
const ar=await p.evaluate(()=>{const m=__T.mat();m.lang='ar';const h=m.modules.find(x=>x.type==='hero');h.data.title='إطلاق في ١٤ سوقًا في نصف الوقت';h.data.short=h.data.title;
  const mt=__T.SEQ.mount(m,'seq-billboard');const n=mt.nodes[0].node;const pill=n.querySelector('.sq-pill').getBoundingClientRect(),z=n.querySelector('.sq-z').getBoundingClientRect();
  const r=[n.getAttribute('dir'),pill.left<z.left,mt.nodes.filter(x=>x.over).length];mt.host.remove();m.lang='en';return r});
ok('Arabic frames are right to left and mirrored (button and logo on the left)',ar[0]==='rtl'&&ar[1],JSON.stringify(ar));
ok('Arabic frames fit',ar[2]===0);
const cjk=await p.evaluate(()=>{const m=__T.mat();m.lang='ja';const h=m.modules.find(x=>x.type==='hero');h.data.title='グローバルLinkで14の市場に半分の時間で同時展開し、製品名の表記ゆれをなくした方法';h.data.short=h.data.title;
  const out=['seq-ig','seq-mrec','seq-leaderboard'].map(f=>{const mt=__T.SEQ.mount(m,f);const o=mt.nodes[0].over;mt.host.remove();return o});m.lang='en';return out});
ok('a long Japanese headline fits the carousel, MREC and leaderboard',cjk.every(x=>!x),JSON.stringify(cjk));

// ---- exports ----
await p.evaluate(()=>{const T=__T;const pc=T.ELIB.find(x=>x.id==='media-crunchyroll-anime-localization');const lay=T.pieceLayout(pc);const m=T.mat();m.modules=JSON.parse(JSON.stringify(lay.modules));m.brand=pc.brand;m.client=pc.client;m.name='Crunchyroll';
  // a photo the exporter can read in this local page (file:// URLs can't be fetched)
  const c=document.createElement('canvas');c.width=1200;c.height=800;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,1200,800);gr.addColorStop(0,'#f80');gr.addColorStop(1,'#08c');g.fillStyle=gr;g.fillRect(0,0,1200,800);g.fillStyle='#fff';g.beginPath();g.arc(600,300,140,0,7);g.fill();
  m.modules.find(x=>x.type==='hero').data.photo={data:c.toDataURL('image/jpeg',.85),fx:50,fy:38,zoom:100,w:1200,h:800};__T.setFmt('seq-billboard');__T.redraw()});
await p.waitForTimeout(800);
const grab=async(label)=>{await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});await p.click('button:has-text("Export")');await p.waitForTimeout(300);await p.click('.pop button:has-text("'+label+'")');
 await p.waitForFunction(()=>(window.__saved||[]).length>0,null,{timeout:90000});await p.waitForTimeout(300);
 return p.evaluate(async()=>{const out=[];for(let i=0;i<window.__saved.length;i++){const a=new Uint8Array(await window.__blobs[i].arrayBuffer());let s='';for(let j=0;j<a.length;j+=32768)s+=String.fromCharCode.apply(null,a.subarray(j,j+32768));out.push([window.__saved[i],btoa(s)])}return out})};
await p.click('button:has-text("Export")');await p.waitForTimeout(300);
const menu=await p.$$eval('.menu .pop button',b=>b.map(x=>x.textContent));
ok('on a rotating ad, Export offers the GIF, the HTML5 ad and the frames',/^Animated GIF/.test(menu[0])&&/^HTML5 ad/.test(menu[1])&&/^Frames as PNGs/.test(menu[2]),menu.map(x=>x.slice(0,22)).join(' | '));
await p.keyboard.press('Escape');
const gif=(await grab('Animated GIF'))[0];const G=Buffer.from(gif[1],'base64');
ok('GIF name says what it is and its size',/^crunchyroll-billboard-rotating-970x250\.gif$/.test(gif[0]),gif[0]);
ok('GIF is under 150 KB',G.length<=150*1024,Math.round(G.length/1024)+' KB');
// walk the GIF's blocks: screen size, loop count, frames and their delays
const walk=(B)=>{let i=13;const W=B.readUInt16LE(6),H=B.readUInt16LE(8);if(B[10]&0x80)i+=3*(1<<((B[10]&7)+1));const d=[];let loop=null,frames=0;
 while(i<B.length){const t=B[i];if(t===0x3b)break;if(t===0x21){const lab=B[i+1];if(lab===0xff&&B.slice(i+3,i+14).toString()==='NETSCAPE2.0')loop=B.readUInt16LE(i+16);if(lab===0xf9)d.push(B.readUInt16LE(i+4));i+=2;while(B[i]){i+=B[i]+1}i++}
  else if(t===0x2c){frames++;const pk=B[i+9];i+=10;if(pk&0x80)i+=3*(1<<((pk&7)+1));i++;while(B[i]){i+=B[i]+1}i++}else return null}return {W,H,loop,frames,d,end:B[i]===0x3b}};
const gw=walk(G);
ok('GIF: 970 × 250, four frames, 3 s each, the end frame holds 4 s',gw&&gw.W===970&&gw.H===250&&gw.frames===4&&gw.d.join()==='300,300,300,400'&&gw.end,JSON.stringify(gw));
ok('GIF plays twice, then stops on the end frame',gw&&gw.loop===1);
const h5=(await grab('HTML5 ad'))[0];
ok('HTML5 zip is under 150 KB',Buffer.from(h5[1],'base64').length<=150*1024,h5[0]+' '+Math.round(Buffer.from(h5[1],'base64').length/1024)+' KB');
const z=await p.evaluate(async b64=>{const zz=await window.JSZip.loadAsync(b64,{base64:true});const names=Object.keys(zz.files);const idx=await zz.file('index.html').async('string');const bk=await zz.file('backup.png').async('uint8array');return [names,idx,[bk[0],bk[1],bk[2],bk[3]],String.fromCharCode.apply(null,bk.subarray(12,16))]},h5[1]);
ok('HTML5 zip: index.html, a PNG per frame and backup.png',z[0].join()==='index.html,frame-1.png,frame-2.png,frame-3.png,frame-4.png,backup.png',z[0].join());
ok('index.html declares clickTag and the ad size, animates in CSS twice and respects reduced motion',/var clickTag = "https?:/.test(z[1])&&/ad\.size" content="width=970,height=250"/.test(z[1])&&/animation-iteration-count:2/.test(z[1])&&/prefers-reduced-motion/.test(z[1])&&/window\.open\(window\.clickTag/.test(z[1])&&!/<script src/.test(z[1]));
ok('backup.png is a real PNG',z[2].join()==='137,80,78,71'&&z[3]==='IHDR');
ok('the last ad export sizes are kept for preflight',await p.evaluate(()=>{const l=__T.SEQ.last[__T.mat().id+':seq-billboard'];return !!(l&&l.gif&&l.html5)}));
await p.evaluate(()=>{__T.setFmt('seq-ig');__T.redraw()});await p.waitForTimeout(800);
const pz=(await grab('Instagram carousel as PNGs'))[0];
const pn=await p.evaluate(async b64=>{const zz=await window.JSZip.loadAsync(b64,{base64:true});const names=Object.keys(zz.files);const a=await zz.file(names[0]).async('uint8array');let ph=-1;for(let i=8;i<a.length-8;i++){if(a[i]===112&&a[i+1]===72&&a[i+2]===89&&a[i+3]===115){ph=(a[i+4]<<24|a[i+5]<<16|a[i+6]<<8|a[i+7])>>>0;break}}const dv=new DataView(a.buffer,a.byteOffset);return [names,dv.getUint32(16),dv.getUint32(20),ph]},pz[1]);
ok('Instagram carousel: numbered PNGs 01 to 05 in a zip',/crunchyroll-carousel-1080x1350\.zip$/.test(pz[0])&&pn[0].join()===[1,2,3,4,5].map(i=>'crunchyroll-carousel-0'+i+'-of-05-1080x1350.png').join(),pz[0]+': '+pn[0].join(', '));
ok('each PNG is 1080 × 1350 at 72 ppi, like the other screen exports',pn[1]===1080&&pn[2]===1350&&pn[3]===2835,pn.slice(1).join(' '));
await p.evaluate(()=>{__T.setFmt('seq-li');__T.redraw()});await p.waitForTimeout(800);
const pdf=(await grab('LinkedIn carousel, 4:5 pages as PDF'))[0];const P=Buffer.from(pdf[1],'base64').toString('latin1');
ok('LinkedIn carousel: one PDF, a page per frame',/crunchyroll-linkedin-carousel-1080x1350\.pdf$/.test(pdf[0])&&(P.match(/\/Type \/Page\b(?!s)/g)||[]).length===5,pdf[0]+' '+(P.match(/\/Type \/Page\b(?!s)/g)||[]).length+' pages');
ok('exporting marks the size exported',await p.evaluate(()=>!!(__T.mat().exported||{})['seq-li']));

// ---- required sizes, the Sizes tab, preflight, Download all ----
await p.click('.rtabs button:has-text("Sizes")');await p.waitForTimeout(800);
ok('the Sizes tab lists the sequences',(await p.$$('.seq-sizes .seq-size')).length===8);
await p.check('#sz-seq-mrec');await p.waitForTimeout(500);
ok('a sequence can be a required size',await p.evaluate(()=>__T.mat().formats.indexOf('seq-mrec')>=0));
const pf=await p.evaluate(()=>{const m=__T.mat();const h=m.modules.find(x=>x.type==='hero');const keep=[h.data.short,h.data.title];h.data.short=h.data.title='Supercalifragilisticexpialidociousness'.repeat(3);const r=__T.preflight(m).list.filter(x=>/Rotating medium rectangle/.test(x[1])).map(x=>x[1]);h.data.short=keep[0];h.data.title=keep[1];return r});
ok('preflight checks every frame of a required sequence',pf.some(x=>/frame 1 \(hook\)/.test(x)),pf.join(' | ').slice(0,200));
// a checklist of sequences only (single-frame sizes have their own photo guard dialog)
await p.evaluate(()=>{__T.mat().formats=['seq-mrec','seq-ig'];__T.redraw()});
await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});
await p.click('button:has-text("Export")');await p.waitForTimeout(300);await p.click('.pop button:has-text("Required sizes")');
await p.waitForFunction(()=>(window.__saved||[]).some(n=>/sizes\.zip$/.test(n)),null,{timeout:120000});
const rz=await p.evaluate(async()=>{const i=window.__saved.findIndex(n=>/sizes\.zip$/.test(n));const zz=await window.JSZip.loadAsync(window.__blobs[i]);return Object.keys(zz.files)});
ok('Required sizes (.zip) includes the rotating ad as GIF and HTML5',rz.some(n=>/mrec-rotating-300x250\.gif$/.test(n))&&rz.some(n=>/mrec-html5-300x250\.zip$/.test(n)),rz.filter(n=>/mrec/.test(n)).join(', '));
// Download all on the board
await p.evaluate(()=>{const m=__T.mat();__T.S().mats.forEach(x=>{if(x.id===m.id)x.formats=m.formats.slice()})});
await p.waitForTimeout(1200);await p.evaluate(()=>__T.go('project',__T.S().pid));await p.waitForTimeout(1500);
await p.click('#dl-all');await p.waitForTimeout(400);
ok('Download all offers the sequence sizes the materials need',!!(await p.$('#bulk-size-seq-mrec')));
await p.uncheck('#bulk-size-print');await p.check('#bulk-size-seq-mrec');
await p.evaluate(()=>{const ms=__T.S().mats;[...document.querySelectorAll('.bulk-mats input')].forEach(c=>{const m=ms.find(x=>x.id===c.value);if(c.checked!==((m.formats||[]).indexOf('seq-mrec')>=0))c.click()})});
const est=await p.textContent('#bulk-est');ok('one file set per material and sequence, whatever file types are ticked',/1 file to write/.test(est),est);
await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});await p.click('#bulk-go');
await p.waitForFunction(()=>(window.__saved||[]).some(x=>/editable-files\.zip$/.test(x)),null,{timeout:120000});
const bz=await p.evaluate(async()=>{const i=window.__saved.findIndex(x=>/editable-files\.zip$/.test(x));const zz=await window.JSZip.loadAsync(window.__blobs[i]);return Object.keys(zz.files).filter(n=>!n.endsWith('/'))});
ok('Download all writes the GIF and HTML5 ad into a Sequences folder',bz.some(n=>/\/Sequences\/.*mrec-rotating-300x250\.gif$/.test(n))&&bz.some(n=>/\/Sequences\/.*mrec-html5-300x250\.zip$/.test(n)),bz.join(', '));

// ---- phone, 1280 × 720 ----
await p.keyboard.press('Escape').catch(()=>{});await p.waitForTimeout(500);
await p.evaluate(mid=>__T.go('editor',__T.S().pid,mid),MID);await p.waitForTimeout(1800);
for(const [W,H] of [[1280,720],[390,844]]){await p.setViewportSize({width:W,height:H});await p.waitForTimeout(800);
 await p.evaluate(()=>{__T.setFmt('seq-story');__T.redraw()});await p.waitForTimeout(900);
 ok(W+' px: the filmstrip shows, the page does not scroll sideways',(await p.$$('.seq-card')).length>=3&&await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),await p.evaluate(()=>document.documentElement.scrollWidth+' / '+innerWidth));}
ok('story frames show the platform safe areas',(await p.$$('.seq-card .seq-safe i')).length>=6);
ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));
R.forEach(x=>console.log(x));await b.close()})();
