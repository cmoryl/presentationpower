const {chromium}=require('playwright');const fs=require('fs');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message+' @ '+(e.stack||'').split('\n')[1]));
const html=fs.readFileSync(__dirname+'/module-builder.html','utf8');
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);
await p.click('.lp-start button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1500);
await p.click('.nav-help');await p.waitForTimeout(800);
ok('Help opens from the header, even mid-edit',await p.isVisible('h1:text-is("Help")'));
ok('it offers the way back to the material',(await p.textContent('.hp-back'))==='Back to Fernwood & Vale case study');
// guides and their on-screen words
const guides=await p.$$eval('.hp-guide h2',x=>x.map(e=>e.textContent));ok('how-to guides are listed',guides.length>=15,guides.length);
const labels=await p.evaluate(()=>{const s=new Set();__T.helpGuides().forEach(g=>g.ui.forEach(l=>s.add(l)));return [...s]});
const missing=labels.filter(l=>!html.includes('"'+l+'"')&&!html.includes('>'+l+'<')&&!html.includes(l+'<')&&!html.includes('"'+l));
ok('every button a guide names exists in the app ('+labels.length+' labels)',!missing.length,missing.join(', '));
const toc=await p.$$eval('.hp-toc a',x=>x.length);ok('guides have a contents list',toc===guides.length);
// generated lists track the build
const live=await p.evaluate(()=>{const t=document.querySelector('.hp-guides').textContent;const M=__T.MODULES;return {logos:t.includes(__T.LOGO_LIB.length+' client logos'),langs:t.includes(__T.LANGS_N()+' languages')}});
ok('logo and language counts come from the build',live.logos&&live.langs,JSON.stringify(live));
await p.click('#hp-tab-ref');await p.waitForTimeout(400);
const ref=await p.evaluate(()=>{const n=Object.keys(__T.MODULES).length;const rows=document.querySelectorAll('.hp-table')[0].querySelectorAll('tbody tr').length;const sz=[...document.querySelectorAll('.hp-h2')].find(e=>/^Sizes/.test(e.textContent)).nextElementSibling.querySelectorAll('tbody tr').length;return [n,rows,__T.FORMATS.filter(f=>!f.custom).length,sz]});
ok('reference lists every module',ref[0]===ref[1],JSON.stringify(ref));ok('reference lists every size',ref[2]===ref[3]);
// a module added later appears without touching Help
await p.evaluate(()=>{__T.MODULES.zzTest={name:'Test module',group:'Proof',desc:'Added after Help was written',fields:[],def:()=>({}),render:()=>'<section></section>'}});
await p.click('#hp-tab-faq');await p.click('#hp-tab-ref');await p.waitForTimeout(300);
ok('a new module shows up in Help automatically',(await p.textContent('.hp-panel')).includes('Added after Help was written'));
await p.evaluate(()=>{delete __T.MODULES.zzTest});
// export options match the Export menu
await p.click('.hp-back');await p.waitForTimeout(1500);
ok('Back returns to the material',await p.evaluate(()=>!!__T.mat()&&__T.mat().name==='Fernwood & Vale case study'));
await p.click('button:has-text("Export")');await p.waitForTimeout(300);
const menu=await p.textContent('.pop');const ex=await p.evaluate(()=>__T.EXPORT_DOCS.map(x=>x[0]));
const exMissing=ex.filter(x=>!menu.includes(x));ok('every export option in Help is in the Export menu',!exMissing.length,exMissing.join(', '));
await p.keyboard.press('Escape');
// search and FAQ
await p.click('.nav-help');await p.waitForTimeout(600);await p.click('#hp-tab-faq');await p.fill('#hp-q','printer');await p.waitForTimeout(300);
const fq=await p.$$eval('.hp-faq',x=>x.map(d=>[d.querySelector('summary').textContent,d.open]));ok('FAQ search finds the print question, opened',fq.length===1&&fq[0][1]&&/printer/.test(fq[0][0]),JSON.stringify(fq));
ok('search keeps focus while typing',await p.evaluate(()=>document.activeElement.id==='hp-q'));
await p.fill('#hp-q','');await p.click('#hp-tab-howto');await p.focus('#hp-tab-howto');await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
ok('tabs work with arrow keys',await p.evaluate(()=>document.activeElement.id==='hp-tab-faq'));
await p.screenshot({path:__dirname+'/../journey/help-faq.png'});await p.click('#hp-tab-howto');await p.waitForTimeout(300);await p.screenshot({path:__dirname+'/../journey/help-howto.png'});
await p.click('#hp-tab-ref');await p.waitForTimeout(300);await p.screenshot({path:__dirname+'/../journey/help-ref.png'});
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);
ok('no sideways page scroll on a phone',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
