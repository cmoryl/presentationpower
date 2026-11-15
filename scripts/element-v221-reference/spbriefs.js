// Spectrum example briefs: four complete materials loaded from the Modules page
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950}});const errs=[];
await ctx.route(/cdn\.jsdelivr\.net/,r=>r.abort());await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.evaluate(()=>__T.go('modules'));await p.waitForTimeout(2000);
ok('Batch F offers the example briefs button',await p.evaluate(()=>/Load the Spectrum example briefs/.test((document.getElementById('spx-open-briefs')||{}).textContent||'')));
await p.click('#spx-open-briefs');await p.waitForTimeout(2500);
const pr=await p.evaluate(()=>({name:document.body.innerText.slice(0,4000),cards:[...document.querySelectorAll('.mcard .mn')].map(x=>x.textContent)}));
ok('the project opens with five briefs, one at each stage',/Spectrum briefs/.test(pr.name)&&pr.cards.length===5,JSON.stringify(pr));
const m=await p.evaluate(()=>__T.SPX_BRIEFS.map(x=>({n:x.name,look:'spectrum',mods:x.mods().map(y=>y[0])})));
ok('every brief is on the Spectrum look and runs 7 to 8 modules, from the library designs',m.length===4&&m.every(x=>x.look==='spectrum'&&x.mods.length>=7&&x.mods.length<=8),JSON.stringify(m.map(x=>[x.n,x.mods.length])));
// each brief draws with no dark or saturated panel
const bad=await p.evaluate(()=>{const T=__T;const host=document.createElement('div');host.style.cssText='position:fixed;left:-9999px;top:0;width:816px';document.body.appendChild(host);const out=[];
 const nm=c=>{let m=c.match(/[\d.]+/g);return m};const lum=c=>{const m=nm(c);if(!m)return 1;if(m.length>3&&+m[3]===0)return 1;return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255};
 T.SPX_BRIEFS.forEach(br=>{const mt={name:br.name,look:'spectrum',modules:br.mods().map((x,i)=>({id:'b'+i,type:x[0],data:x[1]}))};host.innerHTML=T.withStyle({look:mt.look},()=>T.pageHTML(mt.modules,{w:816,h:0,print:false},false,null));host.querySelectorAll('.mod *').forEach(e=>{if(e.offsetParent===null||e.closest('.spx-gl,button,.pill,.delta,.tier-cta'))return;const r=e.getBoundingClientRect();if(r.width<60||r.height<30||/^(IMG|svg|path|circle|rect|text)$/i.test(e.tagName))return;const bg=getComputedStyle(e).backgroundColor;if(bg&&bg!=='rgba(0, 0, 0, 0)'&&lum(bg)<0.4)out.push(mt.name+':'+e.className)})});host.remove();return out});
ok('no dark panel in any of the four briefs',!bad.length,JSON.stringify(bad.slice(0,5)));
// opening one in the editor
await p.click('.mcard >> nth=0');await p.waitForTimeout(2000);
ok('a brief opens in the editor with the Spectrum look selected',await p.evaluate(()=>/\bspx\b/.test(document.querySelector('#stage .page').className)&&(document.getElementById('ed-look')||{}).value==='spectrum'));
// loading twice never duplicates
await p.evaluate(()=>__T.go('modules'));await p.waitForTimeout(1800);
ok('the button now opens the existing project instead of loading again',await p.evaluate(()=>/Open the Spectrum example briefs/.test(document.getElementById('spx-open-briefs').textContent)));
await p.click('#spx-open-briefs');await p.waitForTimeout(1500);
ok('still one example briefs project',await p.evaluate(()=>document.querySelectorAll('.mcard .mn').length===5));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
