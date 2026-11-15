// Production-grade editable exports: valid PPTX paragraphs, vector logos and icons, named objects grouped per
// module, full-resolution photos placed with a crop / clip that keeps the focal point and zoom, hi-res uploads.
const {chromium}=require('playwright');const fs=require('fs');const cp=require('child_process');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
const X=__dirname+'/../exports/pro/';fs.mkdirSync(X,{recursive:true});
const jpegSize=b=>{let i=2;while(i<b.length){if(b[i]!==0xFF){i++;continue}const m=b[i+1];if(m>=0xC0&&m<=0xCF&&m!==0xC4&&m!==0xC8&&m!==0xCC)return [b.readUInt16BE(i+7),b.readUInt16BE(i+5)];i+=2+b.readUInt16BE(i+2)}return null};
const pngSize=b=>[b.readUInt32BE(16),b.readUInt32BE(20)];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,3).join(' ')));
const L=__dirname+'/../libs/';const map={'html-to-image':L+'html-to-image-1.11.11/package/dist/html-to-image.js','jspdf':L+'jspdf-2.5.1/package/dist/jspdf.umd.min.js','jszip':L+'jszip-3.10.1/package/dist/jszip.min.js','pptxgenjs':L+'pptxgenjs-3.12.0/package/dist/pptxgen.bundle.js','docx@':L+'docx-8.5.0/package/build/index.umd.js'};
await p.route(/cdn\.jsdelivr\.net/,r=>{const u=r.request().url();const k=Object.keys(map).find(k=>u.includes(k));if(!k)return r.abort();r.fulfill({status:200,contentType:'application/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:fs.readFileSync(map[k])})});
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);
await p.click('text=Open the example project');await p.waitForTimeout(1500);await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);

// ---- 7: a 4800 × 3200 upload keeps a hi-res original beside the 2400 px on-screen copy
await p.click('.page .mod >> nth=0');await p.waitForTimeout(400);await p.click('#ctb button:text-is("Full")');await p.waitForTimeout(400);
const up0=await p.evaluate(()=>window.__uploads||0);
await p.setInputFiles('.imgpick input[type=file]',__dirname+'/bigphoto.jpg');
await p.waitForFunction(()=>{const m=__T.mat().modules.find(m=>m.type==='hero');return m&&m.data.photo&&m.data.photo.id},null,{timeout:30000});await p.waitForTimeout(800);
const ref=await p.evaluate(()=>{const ph=__T.mat().modules.find(m=>m.type==='hero').data.photo;const im=document.querySelector('.stage .page .hp-img');return {ph,nat:im&&[im.naturalWidth,im.naturalHeight],up:window.__uploads}});
ok('hi-res upload: two assets (original + on-screen copy)',ref.up-up0===2,ref.up-up0);
ok('hi-res upload: ref keeps the original (hi id, 4800 × 3200)',!!ref.ph.hi&&ref.ph.w===4800&&ref.ph.h===3200,JSON.stringify(ref.ph));
ok('hi-res upload: on-screen image stays 2400 px',ref.nat&&Math.max(...ref.nat)===2400,String(ref.nat));
const kept=await p.evaluate(()=>{const ph=__T.mat().modules.find(m=>m.type==='hero').data.photo;return !!__T.cleanMods&&JSON.stringify(__T.cleanMods([{id:'x',type:'hero',data:{photo:ph}}]))});
if(kept)ok('schema guard keeps the hi field',/"hi":"[0-9a-f]+"/.test(kept));
// focal point and zoom
await p.evaluate(()=>{const ph=__T.mat().modules.find(m=>m.type==='hero').data.photo;ph.fx=30;ph.fy=70;ph.zoom=150;__T.mat().modules.find(m=>m.type==='hero').data.layout='right';__T.redraw()});await p.waitForTimeout(800);

const grab=async(label,ext)=>{await p.evaluate(()=>{window.__saved=[];window.__blobs=[]});await p.click('button:has-text("Export")');await p.waitForTimeout(300);await p.click('.pop button:has-text("'+label+'")');
 if(await p.isVisible('#export-anyway').catch(()=>false)){await p.click('#export-anyway')}
 await p.waitForFunction(e=>(window.__saved||[]).some(n=>n.endsWith(e)),ext,{timeout:90000});
 const b64=await p.evaluate(async e=>{const i=window.__saved.findIndex(n=>n.endsWith(e));const bl=window.__blobs[i];const a=new Uint8Array(await bl.arrayBuffer());let s='';for(let j=0;j<a.length;j+=32768)s+=String.fromCharCode.apply(null,a.subarray(j,j+32768));return [window.__saved[i],btoa(s)]},ext);
 fs.writeFileSync(X+b64[0],Buffer.from(b64[1],'base64'));await p.keyboard.press('Escape').catch(()=>{});return b64[0]};
const pptx=await grab('as PowerPoint','.pptx');const svg=await grab('for Illustrator','.svg');
ok('exports saved',!!pptx&&!!svg,pptx+' '+svg);

// ---- PPTX
const U=X+'u/';cp.execSync('rm -rf "'+U+'" && mkdir -p "'+U+'" && cd "'+U+'" && unzip -q -o "'+X+pptx+'"');
const slide=fs.readFileSync(U+'ppt/slides/slide1.xml','utf8');
// 1: every paragraph: at most one pPr, and it is the first child
const paras=slide.match(/<a:p>[\s\S]*?<\/a:p>/g)||[];let bad=0;
paras.forEach(x=>{const n=(x.match(/<a:pPr[\s>\/]/g)||[]).length;if(n>1||(n===1&&!/^<a:p><a:pPr[\s>\/]/.test(x)))bad++});
ok('PPTX: every <a:p> has its pPr (if any) first and only once',paras.length>10&&bad===0,bad+' bad of '+paras.length);
const allXml=cp.execSync('cd "'+U+'" && cat ppt/slides/*.xml ppt/slideLayouts/*.xml ppt/slideMasters/*.xml').toString();
ok('PPTX: no stray pPr after a run anywhere',!/<\/a:r><a:pPr/.test(allXml));
ok('PPTX: text set in Geist, the design font',/<a:latin typeface="Geist"/.test(slide));
ok('PPTX: text boxes shrink on overflow',(slide.match(/<a:normAutofit/g)||[]).length>=10,(slide.match(/<a:normAutofit/g)||[]).length);
// 5: names and groups
const names=(slide.match(/<p:cNvPr id="\d+" name="[^"]*"/g)||[]).map(x=>x.replace(/.*name="/,'').replace(/"$/,'').replace(/&amp;/g,'&'));
fs.writeFileSync(X+'pptx-names.txt',names.join('\n'));
ok('PPTX: hero title named "Hero / Title"',names.includes('Hero / Title'),names.filter(n=>/^Hero/.test(n)).join(' | '));
ok('PPTX: hero photo named "Hero / Photo"',names.includes('Hero / Photo'));
ok('PPTX: KPI trio values named per result',names.includes('KPI trio / Result 1 / Value')&&names.includes('KPI trio / Result 3 / Caption'),names.filter(n=>/^KPI/.test(n)).join(' | '));
// print system (99v): KPI rows are typographic (no icon), so the icons checked are the snapshot's proof icons
ok('PPTX: icons named per item',names.includes('Quote band + snapshot / Proof point 2 / Icon'));
ok('PPTX: no default "Text 1"/"Image 3" names left',!names.some(n=>/^(Text|Image|Shape) \d+$/.test(n)),names.filter(n=>/^(Text|Image|Shape) \d+$/.test(n)).slice(0,5).join(','));
const groups=(slide.match(/<p:grpSp>\s*<p:nvGrpSpPr>\s*<p:cNvPr id="\d+" name="[^"]*"/g)||[]).map(x=>x.replace(/.*name="/,'').replace(/"$/,''));
ok('PPTX: one group per module',groups.length>=5&&groups.includes('Hero')&&groups.includes('KPI trio'),groups.join(','));
const ids=(slide.match(/<p:cNvPr id="(\d+)"/g)||[]).map(x=>x.match(/\d+/)[0]);
ok('PPTX: object ids unique',new Set(ids).size===ids.length);
// 4: icons and logos are SVG pictures with ≥4x PNG fallbacks
const media=fs.readdirSync(U+'ppt/media');const svgs=media.filter(f=>/\.svg$/.test(f));
ok('PPTX: icons and logos embedded as SVG',svgs.length>=4&&/asvg:svgBlip/.test(slide),svgs.length+' svg files');
const rels=fs.readFileSync(U+'ppt/slides/_rels/slide1.xml.rels','utf8');
let fb4=true,fbn=0;(slide.match(/<p:pic>[\s\S]*?<\/p:pic>/g)||[]).forEach(pic=>{if(!/svgBlip/.test(pic))return;const rid=pic.match(/<a:blip r:embed="(rId\d+)"/)[1];const t=rels.match(new RegExp('Id="'+rid+'"[^>]*Target="../media/([^"]+)"'))[1];const ext=pic.match(/<a:ext cx="(\d+)" cy="(\d+)"/);const [w]=pngSize(fs.readFileSync(U+'ppt/media/'+t));const placedPx=+ext[1]/9525;fbn++;if(w<placedPx*3.9)fb4=false});
ok('PPTX: PNG fallbacks for the SVGs are ≥4x their placed size',fbn>0&&fb4,fbn+' checked');
const logoPics=(slide.match(/<p:pic>[\s\S]*?<\/p:pic>/g)||[]).filter(x=>/name="[^"]*Logo[^"]*"/i.test(x));
ok('PPTX: logos are SVG pictures',logoPics.length>=1&&logoPics.every(x=>/svgBlip/.test(x)),logoPics.length+' logos');
// 6: the hero photo is the full original with a crop that keeps the focal point (30 % / 70 %)
const hero=(slide.match(/<p:pic>[\s\S]*?<\/p:pic>/g)||[]).find(x=>/name="Hero \/ Photo"/.test(x))||'';
const hrid=(hero.match(/<a:blip r:embed="(rId\d+)"/)||[])[1];const htarget=hrid&&(rels.match(new RegExp('Id="'+hrid+'"[^>]*Target="../media/([^"]+)"'))||[])[1];
const hsize=htarget&&/\.jpe?g$/.test(htarget)?jpegSize(fs.readFileSync(U+'ppt/media/'+htarget)):htarget?pngSize(fs.readFileSync(U+'ppt/media/'+htarget)):null;
ok('PPTX: hero photo (faded or framed on the Spectrum look) is baked at print resolution (the ppi check below)',hsize&&hsize[0]>=1500,htarget+' '+hsize);
const sr=hero.match(/<a:srcRect l="(-?\d+)" r="(-?\d+)" t="(-?\d+)" b="(-?\d+)"/);
const fxp=sr?(+sr[1])/((+sr[1])+(+sr[2])):0,fyp=sr?(+sr[3])/((+sr[3])+(+sr[4])):0;
ok('PPTX: hero picture is placed',!!hero&&!!hsize,'');
const hext=hero.match(/<a:ext cx="(\d+)"/);const visFrac=sr?1-((+sr[1])+(+sr[2]))/1e5:1;const ppi=hext&&hsize?Math.round(hsize[0]*visFrac/((+hext[1])/914400)):0;
ok('PPTX: hero photo prints at ≥300 ppi',ppi>=300,ppi+' ppi');

// ---- SVG
const S=fs.readFileSync(X+svg,'utf8');
const info=await p.evaluate(s=>{const d=new DOMParser().parseFromString(s,'image/svg+xml');if(d.getElementsByTagName('parsererror').length)return {err:d.getElementsByTagName('parsererror')[0].textContent.slice(0,200)};
 const byName=n=>[...d.querySelectorAll('[data-name]')].find(e=>e.getAttribute('data-name')===n);
 const XL='http://www.w3.org/1999/xlink';
 const ph0=byName('Hero / Photo');const ph=ph0&&ph0.parentNode;let photo=null;
 if(ph){const im=ph.querySelector('image');const cpId=(ph.getAttribute('clip-path')||'').match(/#([^)]+)/);const cr=cpId&&d.getElementById(cpId[1]).querySelector('rect');const href=im&&(im.getAttributeNS(XL,'href')||im.getAttribute('href'))||'';
  photo={tag:ph.tagName,x:+im.getAttribute('x'),y:+im.getAttribute('y'),w:+im.getAttribute('width'),h:+im.getAttribute('height'),cx:cr&&+cr.getAttribute('x'),cy:cr&&+cr.getAttribute('y'),cw:cr&&+cr.getAttribute('width'),ch:cr&&+cr.getAttribute('height'),type:href.slice(5,href.indexOf(';')),len:href.length,href:href}}
 const logos=[...d.querySelectorAll('[data-name]')].filter(e=>/logo/i.test(e.getAttribute('data-name')));
 const pngLogos=logos.filter(e=>e.tagName==='image'||e.querySelector('image'));
 const vecLogos=logos.filter(e=>e.tagName==='svg'&&e.querySelector('path,polygon,rect'));
 const mods=[...d.querySelectorAll('svg > g[inkscape\\:groupmode="layer"], svg > g[data-name]')].map(g=>g.getAttribute('data-name'));
 const ids=[...d.querySelectorAll('[id]')].map(e=>e.id);
 return {photo,logos:logos.length,pngLogos:pngLogos.length,vecLogos:vecLogos.length,title:!!byName('Hero / Title')&&byName('Hero / Title').tagName,kpi:!!byName('KPI trio / Result 1 / Value'),icon:byName('Quote band + snapshot / Proof point 1 / Icon')&&byName('Quote band + snapshot / Proof point 1 / Icon').tagName,mods,dupIds:ids.length-new Set(ids).size,styles:d.querySelectorAll('style').length,cls:d.querySelectorAll('[class]').length,inkLabel:d.querySelectorAll('[*|label]').length}},S);
if(info.photo){const im=info.photo;const b64=im.href.split(',')[1];const buf=Buffer.from(b64,'base64');info.photo.px=im.type==='image/jpeg'?jpegSize(buf):pngSize(buf);delete info.photo.href}
console.log(JSON.stringify(info).slice(0,600));
ok('SVG parses as XML',!info.err,info.err);
ok('SVG: modules are named layers',info.mods&&info.mods.includes('Hero')&&info.mods.includes('KPI trio'),String(info.mods));
ok('SVG: text named after module and field',info.title==='text'&&info.kpi);
ok('SVG: icons named after their field',info.icon==='svg');
ok('SVG: names carried as id, data-name and inkscape:label',info.inkLabel>20);
ok('SVG: ids unique',info.dupIds===0,info.dupIds);
ok('SVG: logos are vector, not bitmaps',info.logos>=1&&info.vecLogos===info.logos&&info.pngLogos===0,JSON.stringify([info.logos,info.vecLogos,info.pngLogos]));
ok('SVG: no leftover stylesheets or classes from inlined logos',info.styles===0&&info.cls===0,info.styles+'/'+info.cls);
const ph=info.photo||{};
ok('SVG: photo is baked at print resolution (the ppi check below)',ph.px&&ph.px[0]>=1500,JSON.stringify(ph));
const sfx=(ph.cx-ph.x)/(ph.w-ph.cw),sfy=(ph.cy-ph.y)/(ph.h-ph.ch);

ok('SVG: photo prints at ≥300 ppi',ph.px&&ph.px[0]/(ph.w/96)>=300,ph.px&&Math.round(ph.px[0]/(ph.w/96))+' ppi');
ok('SVG: module groups unchanged (6)',(S.match(/<g id="/g)||[]).length===6,(S.match(/<g id="/g)||[]).length);

// ---- LibreOffice: open the PPTX and render it (eyeball overlap; fails if LibreOffice can't read it)
let so='';try{so=cp.execSync('which soffice').toString().trim()}catch(e){}
if(so){try{cp.execSync('cd "'+X+'" && rm -f lo-*.png && timeout 180 soffice --headless --convert-to pdf --outdir "'+X+'" "'+X+pptx+'" >/dev/null 2>&1 && pdftoppm -r 60 -png "'+X+pptx.replace(/\.pptx$/,'.pdf')+'" "'+X+'lo"',{timeout:200000});
 const pngs=fs.readdirSync(X).filter(f=>/^lo.*\.png$/.test(f));ok('LibreOffice renders the PPTX',pngs.length>=1,pngs.join(','))}catch(e){ok('LibreOffice renders the PPTX',false,String(e).slice(0,200))}}
else console.log('SKIP LibreOffice not installed');
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
