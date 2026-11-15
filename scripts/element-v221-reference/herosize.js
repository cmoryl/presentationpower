const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);
await p.click('text=Open the example project');await p.waitForTimeout(1500);await p.click('.mcard:has(.mn:text-is("Client spotlight"))').catch(async()=>{await p.click('.mcard >> nth=0')});await p.waitForTimeout(1500);
await p.click('.page .mod >> nth=0');await p.waitForTimeout(500);
ok('selected hero shows a height grip',await p.isVisible('#stage .hero-grip'));
const hh=()=>p.$eval('#stage .mod.sel section.m-hero',e=>Math.round(e.offsetHeight));const h0=await hh();
const g=await p.$('#stage .hero-grip');const bb=await g.boundingBox();const sc=await p.evaluate(()=>+document.querySelector('#stage .scaler').style.transform.match(/scale\(([\d.]+)\)/)[1]);
await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await p.mouse.down();
await p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2+60*sc,{steps:6});
const live=await hh();const tag=await p.textContent('#stage .hero-grip-tag');
ok('hero grows live while dragging',live>=h0+50,h0+' → '+live);
ok('readout shows height and page fit',/\d+ px, page (fits|runs)/.test(tag),tag);
await p.mouse.up();await p.waitForTimeout(800);
const d=await p.evaluate(()=>{const m=Object.values(JSON.parse(localStorage.getItem('mockdb'))).find(v=>v.modules&&v.modules[0]&&v.modules[0].type==='hero'&&v.modules[0].data.height==='custom');return m&&m.modules[0].data});
await p.waitForTimeout(1500);const d2=await p.evaluate(()=>{const m=Object.values(JSON.parse(localStorage.getItem('mockdb'))).find(v=>v.modules&&v.modules[0]&&v.modules[0].data&&v.modules[0].data.height==='custom');return m&&m.modules[0].data});
ok('release saves a custom height',d2&&d2.height==='custom'&&Math.abs(d2.heightPx-(h0+60))<=8,d2&&d2.heightPx);
ok('inspector shows the custom height slider',await p.isVisible('.rbody input[type=range]'));
// keyboard
await p.focus('#stage .hero-grip');await p.keyboard.press('ArrowDown');await p.waitForTimeout(600);
ok('arrow key grows by 8 px',Math.abs((await hh())-(d2.heightPx+8))<=1,await hh());
ok('grip keeps focus after a key step',await p.evaluate(()=>document.activeElement&&document.activeElement.classList.contains('hero-grip')));
await p.keyboard.press('Control+z');await p.waitForTimeout(600);ok('undo restores the previous height',Math.abs((await hh())-d2.heightPx)<=1,await hh());
// double-click resets
const g2=await p.$('#stage .hero-grip');await g2.dblclick();await p.waitForTimeout(700);
ok('double-click returns to Standard',await p.$eval('#stage .mod.sel section.m-hero',e=>e.classList.contains('hh-standard')));
// export uses the custom height (page HTML carries it)
const fz=await p.evaluate(()=>{const T=window.__T;const r={};['bottom','top','topbottom','sides','left','right','all'].forEach(e=>{const d=T.MODULES.hero.def();d.fadeBottom='soft';d.fadeEdge=e;const h=T.pageHTML([{id:'h',type:'hero',data:d}],T.FORMATS[0],false);r[e]=(h.match(/class="hfade[^"]*"/g)||[]).map(x=>x.match(/fe-(\w)/)[1]).join('')});return r});
ok('fade edges: bottom, top, top+bottom, sides, left, right, all',fz.bottom==='b'&&fz.top==='t'&&fz.topbottom==='tb'&&fz.sides==='lr'&&fz.left==='l'&&fz.right==='r'&&fz.all==='trbl',JSON.stringify(fz));
const wash=await p.evaluate(()=>{const T=window.__T;const d=T.MODULES.hero.def();d.layout='full';d.photo={data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='};d.fadeBottom='soft';d.fadeEdge='left';d.align='left';return T.preflight({modules:[{id:'h',type:'hero',data:d},{id:'f',type:'footer',data:T.MODULES.footer.def()}],formats:['letter']}).list.some(x=>/wash out/.test(x[1]))});
ok('preflight warns when a fade sits under light text',wash);
ok('no page errors',!errs.length,errs.join(' | ').slice(0,200));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
