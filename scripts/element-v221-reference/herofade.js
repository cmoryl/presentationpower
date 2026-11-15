const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1800,height:1200}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.waitForTimeout(1200);
const photo='data:image/jpeg;base64,'+fs.readFileSync(__dirname+'/photo.jpg').toString('base64');
const r=await p.evaluate(async(photo)=>{await document.fonts.ready;const T=window.__T;[...document.body.children].forEach(e=>{if(e.tagName!=='STYLE'&&e.tagName!=='SCRIPT')e.remove()});document.body.style.cssText='background:#ccd;margin:0;padding:12px;display:flex;gap:12px;align-items:flex-start';
 const f=T.FORMATS.find(x=>x.id==='letter');const cases=[['auto','auto','kpis'],['soft','standard','quote'],['long','deep','kpis'],['none','none','kpis']];const out=[];
 for(const [fade,ov,next] of cases){const hero=T.MODULES.hero.def();hero.layout='full';hero.photo={data:photo,fx:50,fy:40,zoom:100};hero.fadeBottom=fade;hero.overlap=ov;hero.valign='top';
  const mods=[{id:'h',type:'hero',data:hero},{id:'n',type:next,data:T.MODULES[next].def()},{id:'c',type:'cta',data:T.MODULES.cta.def()}];
  const w=document.createElement('div');w.style.cssText='width:'+(f.w*.4)+'px;height:'+(560)+'px;overflow:hidden;position:relative;background:#fff';const inner=document.createElement('div');inner.style.cssText='transform:scale(.4);transform-origin:0 0';inner.innerHTML=T.pageHTML(mods,f,false);w.appendChild(inner);
  const lab=document.createElement('div');lab.textContent='fade='+fade+' overlap='+ov+' next='+next;lab.style.cssText='position:absolute;left:0;bottom:0;background:#000;color:#fff;font:11px sans-serif;padding:2px 4px';w.appendChild(lab);document.body.appendChild(w);
  const hs=inner.querySelector('.m-hero').getBoundingClientRect(),ns=inner.querySelectorAll('.mod')[1].getBoundingClientRect();out.push({fade,ov,overlapPx:Math.round((hs.bottom-ns.top)/.4),hasFade:!!inner.querySelector('.hfade')})}
 return out},photo);
console.log(JSON.stringify(r));console.log(errs);await p.screenshot({path:'herofade.png'});await b.close()})();
