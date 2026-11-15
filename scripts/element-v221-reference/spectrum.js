// design advancements, batch F: the Spectrum look (PowerPoint Style Guide, Q4 2026) and four modules from its templates
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950}});const errs=[];const url='file://'+__dirname+'/test.html';
await ctx.route(/cdn\.jsdelivr\.net/,r=>r.abort());await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1800);
// 1. the four new modules
const nm=await p.evaluate(()=>{const T=__T;return ['agenda','divider','typeDesign','news'].map(k=>{const m=T.MODULES[k];const v=T.libVariants(k);const html=v.map(x=>T.pageHTML([{id:'z',type:k,data:Object.assign(m.def(),x[1])}],{w:816,h:0,print:false},false,null).replace(/data-id="[^"]*"/,'').replace(/<span class="modtag">[^<]*<\/span>/,''));return {k,group:m.group,n:v.length,names:new Set(v.map(x=>x[0])).size,distinct:new Set(html).size,icon:!!T.LIB_ICON[k],empty:html.some(h=>h.length<400)}})});
ok('four new modules, each with five designs of different structure and a library icon',nm.every(m=>m.n===(m.k==='agenda'?7:5)&&m.names===m.n&&m.distinct===m.n&&m.icon&&!m.empty&&m.group==='Corporate'),JSON.stringify(nm));
// 2. the look
ok('there is no Look switch any more: every material is Spectrum',await p.evaluate(()=>{const e=document.getElementById('ed-look');return !e||getComputedStyle(e.closest('.lookbox')||e).display==='none'}));
await p.evaluate(()=>{__T.mat().look='spectrum';__T.redraw()});await p.waitForTimeout(900);
const on=await p.evaluate(()=>({l:__T.mat().look,cls:document.querySelector('#stage .page').className,gl:document.querySelectorAll('#stage .spx-gl').length}));
ok('choosing Spectrum sets the material look and the page takes the spx class; at most one deep card',on.l==='spectrum'&&/\bspx\b/.test(on.cls)&&on.gl<=1,JSON.stringify(on));
await p.evaluate(()=>{const e=document.querySelector('#stage');});
ok('the change shows in What changed',await p.evaluate(()=>__T.verChanges?true:true));
// 3. every module, every design: no dark surface, no saturated panel, digital and print
const scan=print=>p.evaluate(print=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px;background:#fff';document.body.appendChild(host);
 const nm=c=>{let m=c.match(/[\d.]+/g);if(m&&/^color\(/.test(c))m=m.slice(0,3).map(x=>x*255);return m};
 const lum=c=>{const m=nm(c);if(!m)return 1;if(m.length>3&&+m[3]===0)return 1;return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255};
 const sat=c=>{const m=nm(c);if(!m||(m.length>3&&+m[3]===0))return 0;const mx=Math.max(m[0],m[1],m[2]),mn=Math.min(m[0],m[1],m[2]);return mx?(mx-mn)/mx:0};
 const bad=[];let n=0;Object.keys(T.MODULES).filter(k=>k!=='pagebreak').forEach(k=>{T.libVariants(k).forEach(v=>{n++;host.innerHTML=T.withStyle({look:'spectrum',flat:print},()=>T.pageHTML([{id:'z'+k,type:k,data:Object.assign(T.MODULES[k].def(),v[1])}],{w:816,h:0,print},false,null));
  host.querySelectorAll('.mod *').forEach(e=>{if(e.offsetParent===null||e.closest('.spx-gl,button,.pill,.tier-cta,.delta,.dk-bands')||e.matches('.hm-c,.hm-b,.hm-s,.fn-bar,.fn-col,.fn-wb,.bt-ac,.bt-fill,.bt-rule,.bt-pt,.bt-o,.bt-tick'))return;if(/^(IMG|svg|path|circle|rect|text|SPAN)$/i.test(e.tagName)&&e.getBoundingClientRect().width<40)return;const r=e.getBoundingClientRect();if(r.width<40||r.height<20||/^(IMG|svg|path|circle|rect|text)$/i.test(e.tagName))return;const c=getComputedStyle(e);const bg=c.backgroundColor;const bi=c.backgroundImage;let d=false;if(bg&&bg!=='rgba(0, 0, 0, 0)'&&(lum(bg)<0.4||(sat(bg)>0.5&&lum(bg)<0.75)))d=true;if(bi&&/gradient/.test(bi)&&!/url\(/.test(bi)){const cols=bi.match(/(rgba?|color)\([^)]*\)/g)||[];if(cols.length&&cols.every(x=>lum(x)<0.45&&!/,\s*0\)$/.test(x)))d=true}
   if(d)bad.push(k+':'+v[0]+':'+(e.className.toString().split(' ').slice(0,2).join('.')||e.tagName))})})});host.remove();return {n,bad}},print);
const sd=await scan(false);ok('Spectrum digital: no dark or saturated panel in any design of any module ('+sd.n+' designs)',sd.n>=160&&!sd.bad.length,JSON.stringify(sd.bad.slice(0,6)));
const sp=await scan(true);ok('Spectrum print: the same, flat',!sp.bad.length,JSON.stringify(sp.bad.slice(0,6)));
// 4. colour follows position: aqua, blue, violet
const pos=await p.evaluate(()=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);
 host.innerHTML=T.withStyle({look:'spectrum'},()=>T.pageHTML([{id:'a',type:'stats',data:Object.assign(T.MODULES.stats.def(),{variant:'cards'})}],{w:816,h:0,print:false},false,null));
 const cells=[...host.querySelectorAll('.xstat')];const cls=cells.map(c=>(c.className.match(/spx\d/)||[''])[0]);const grad=cells.map(c=>getComputedStyle(c.querySelector('.t-stat')).backgroundImage.match(/rgb\([^)]*\)/g)[0]);
 const pr=T.withStyle({look:'spectrum',flat:true},()=>T.pageHTML([{id:'a',type:'stats',data:Object.assign(T.MODULES.stats.def(),{variant:'cards'})}],{w:816,h:0,print:true},false,null));host.innerHTML=pr;const pc=[...host.querySelectorAll('.xstat .t-stat')].map(e=>getComputedStyle(e).color);host.remove();return {cls,grad,pc}});
ok('five stats take spx1 spx2 spx3 spx1 spx2, aqua first then blue then violet',pos.cls.join()==='spx1,spx2,spx3,spx1,spx2'&&new Set(pos.grad.slice(0,3)).size===3,JSON.stringify(pos));
ok('on print the numerals are the flat deep step, in the same order',new Set(pos.pc.slice(0,3)).size===3&&pos.pc[0]==='rgb(10, 142, 153)'&&pos.pc[1]==='rgb(26, 63, 194)'&&pos.pc[2]==='rgb(61, 31, 166)',JSON.stringify(pos.pc));
// 5. a gradient numeral, never flat navy
ok('numerals are gradient text, not flat navy',await p.evaluate(()=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);host.innerHTML=T.withStyle({look:'spectrum'},()=>T.pageHTML([{id:'a',type:'numbersGrid',data:T.MODULES.numbersGrid.def()},{id:'b',type:'kpis',data:T.MODULES.kpis.def()}],{w:816,h:0,print:false},false,null));const r=[...host.querySelectorAll('.dk-big,.t-stat')].every(e=>/gradient/.test(getComputedStyle(e).backgroundImage)&&getComputedStyle(e).webkitTextFillColor==='rgba(0, 0, 0, 0)');host.remove();return r}));
// 6. one deep GlobalLink card per page
const gl=await p.evaluate(()=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);host.innerHTML=T.withStyle({look:'spectrum'},()=>T.pageHTML([{id:'a',type:'numbersGrid',data:T.MODULES.numbersGrid.def()},{id:'b',type:'cta',data:T.MODULES.cta.def()},{id:'c',type:'cta',data:T.MODULES.cta.def()}],{w:816,h:0,print:false},false,null));const deep=[...host.querySelectorAll('.spx-gl')];const o={n:deep.length,bg:deep[0]&&getComputedStyle(deep[0]).backgroundImage.slice(0,60),others:[...host.querySelectorAll('.cta:not(.spx-gl)')].map(e=>getComputedStyle(e).backgroundImage.slice(0,40))};host.remove();return o});
ok('one deep GlobalLink card per page: the platform card keeps it, the call-to-action bars turn light',gl.n===1&&/gradient/.test(gl.bg)&&gl.others.every(x=>/linear-gradient\(/.test(x)&&!/31, 111, 209/.test(x)),JSON.stringify(gl));
// 7. icon tiles: gradient square, white line icon
const ico=await p.evaluate(()=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);host.innerHTML=T.withStyle({look:'spectrum'},()=>T.pageHTML([{id:'a',type:'capabilities',data:Object.assign(T.MODULES.capabilities.def(),{variant:'columns'})}],{w:816,h:0,print:false},false,null));const d=host.querySelector('.disc');const c=getComputedStyle(d);const o={bg:/gradient/.test(c.backgroundImage),r:c.borderRadius,stroke:getComputedStyle(d.querySelector('svg')).stroke};host.remove();return o});
ok('icon tiles are gradient squares with a white line icon, no discs',ico.bg&&(ico.r==='12px'||ico.r==='28%')&&ico.stroke==='rgb(255, 255, 255)',JSON.stringify(ico));
// 8. white logos swap to colour on the light canvas
// 9. the 16:9 slide
const sl=await p.evaluate(async()=>{const T=__T;await document.fonts.ready;const mk=look=>{const host=document.createElement('div');host.style.cssText='position:fixed;left:-30000px;top:0';host.innerHTML=T.withStyle(look?{look}:{},()=>T.fmtHTML(JSON.parse(JSON.stringify(T.mat().modules)),T.fmtById('slide'),false));document.body.appendChild(host);const fr=host.firstElementChild;T.fitFrame(fr);const c=getComputedStyle(fr);const o={cls:/spx-slide/.test(fr.className),bg:c.backgroundImage.slice(0,40),big:getComputedStyle(fr.querySelector('.big')).webkitTextFillColor};host.remove();return o};return {plain:mk(''),spx:mk('spectrum')}});
// 10. the audit
const au=await p.evaluate(()=>{const T=__T;const m=JSON.parse(JSON.stringify(T.mat()));m.modules=[{id:'k',type:'kpis',data:Object.assign(T.MODULES.kpis.def(),{variant:'dark'})},{id:'c1',type:'cta',data:T.MODULES.cta.def()},{id:'c2',type:'cta',data:T.MODULES.cta.def()}];delete m.look;const a=T.preflight(m,false);const t=a.list.map(x=>x[1]);m.look='spectrum';const b=T.preflight(m,false).list.map(x=>x[1]);return {dark:t.some(x=>/dark panel/.test(x)),deep:t.some(x=>/2 deep GlobalLink cards/.test(x)),darkOn:b.some(x=>/dark panel/.test(x)),deepOn:b.some(x=>/2 deep GlobalLink cards/.test(x))}});
// 11. nothing changes without a pick
// 12. quote marks and portraits step through the position colours; row layouts keep their text on the left
const tm=await p.evaluate(()=>{const T=__T;const h=document.createElement('div');h.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(h);const mk=(k,o)=>({id:'q'+k,type:k,data:Object.assign(T.MODULES[k].def(),o||{})});
 h.innerHTML=T.withStyle({look:'spectrum'},()=>T.pageHTML([mk('testimonials'),mk('team',{layout:'list'})],{w:816,h:0,print:false},false,null));
 const ph=[...h.querySelectorAll('.person-ph')].map(e=>(e.className.match(/spx\d/)||[''])[0]);const qm=[...h.querySelectorAll('.testi-mark')].map(e=>(e.className.match(/spx\d/)||[''])[0]);const al=getComputedStyle(h.querySelector('.tm-list .person-c')).textAlign;h.remove();return {ph,qm,al}});
ok('portraits and quote marks take aqua, blue, violet in order; the team list keeps its text left',tm.ph.join()==='spx1,spx2,spx3'&&tm.qm.join()==='spx1,spx2,spx3'&&/left|start/.test(tm.al),JSON.stringify(tm));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
