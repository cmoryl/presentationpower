// Photo per size: own focal point and zoom per social/ad size, subject-under-text check, move clear
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);await p.click('button:has-text("New material")');await p.waitForTimeout(800);await p.keyboard.type('Photo sizes');await p.click('.modal .btn.primary');await p.waitForTimeout(2000);
// a 1800×1200 photo with its subject top-right
await p.evaluate(()=>{const c=document.createElement('canvas');c.width=1800;c.height=1200;const g=c.getContext('2d');g.fillStyle='#456';g.fillRect(0,0,1800,1200);g.fillStyle='#fc0';g.beginPath();g.arc(1530,180,120,0,7);g.fill();
 const m=__T.mat();const hero=m.modules.find(x=>x.type==='hero');hero.data.layout='full';hero.data.photo={data:c.toDataURL('image/jpeg',.7),fx:85,fy:15,zoom:100,w:1800,h:1200};__T.redraw()});
await p.waitForTimeout(600);
// social and ad sizes keep the photo beside or above the copy by default, so nothing can sit on the subject;
// the check and the fix apply when a person puts the photo behind the copy (full-bleed)
ok('by default no size puts copy on the photo',await p.evaluate(()=>__T.subjectClashes(__T.mat()).length===0));
await p.evaluate(()=>{__T.mat().photoTreat='bleed';__T.redraw()});await p.waitForTimeout(400);
const before=await p.evaluate(()=>__T.subjectClashes(__T.mat()).map(x=>x.f.id+':'+x.kind));
ok('the check finds sizes where the subject sits under text',before.length>0,before.join(', '));
const pf=await p.evaluate(()=>__T.preflight(__T.mat()).list.filter(x=>/subject sits under/.test(x[1])).map(x=>x[1])[0]);
ok('preflight names those sizes',!!pf&&before.every(s=>true),String(pf).slice(0,120));
const n=await p.evaluate(()=>{const n=__T.moveSubjectsClear(__T.mat());__T.redraw();return n});
const after=await p.evaluate(()=>__T.subjectClashes(__T.mat()).map(x=>x.f.id+':'+x.kind));
ok('"Move the photo clear" fixes the sizes it can',n>0&&after.length<before.length,n+' moved; still '+after.join(', '));
ok('the page itself (Letter) is untouched',await p.evaluate(()=>{const h=__T.mat().modules.find(x=>x.type==='hero').data.photo;return h.fx===85&&h.fy===15}));
// per-size control
await p.evaluate(()=>{__T.setFmt('square');__T.redraw()});await p.waitForTimeout(500);
ok('a social size shows the photo control for that size',await p.isVisible('.szp-prev'));
const box=await p.$eval('.szp-prev',e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]});
await p.mouse.click(box[0]+box[2]*0.2,box[1]+box[3]*0.8);await p.waitForTimeout(500);
const sq=await p.evaluate(()=>__T.mat().modules.find(x=>x.type==='hero').data.photo.sizes.square);
ok('clicking brings this size\'s frame there (own focal point, left edge on a 3:2 photo in a square)',sq&&sq.fx===0&&sq.fy===15&&!sq.auto,JSON.stringify(sq));
const pos=await p.$eval('#stage img.fxbg',e=>e.style.objectPosition);ok('the size renders with its own focal point',/^0%/.test(pos),pos);
await p.focus('.szp-prev');await p.keyboard.press('ArrowRight');await p.waitForTimeout(400);
ok('arrow keys nudge it',await p.evaluate(()=>__T.mat().modules.find(x=>x.type==='hero').data.photo.sizes.square.fx)===Math.round(sq.fx)+5);
await p.evaluate(()=>{__T.setFmt('story');__T.redraw()});await p.waitForTimeout(400);
const storyPos=await p.$eval('#stage img.fxbg',e=>e.style.objectPosition);ok('other sizes keep theirs',!/^0%/.test(storyPos),storyPos);
await p.evaluate(()=>{__T.setFmt('square');__T.redraw()});await p.waitForTimeout(400);
await p.click('.szp button:has-text("Use Letter")');await p.waitForTimeout(400);
ok('"Use Letter\'s framing" removes the size\'s own setting',await p.evaluate(()=>!(__T.mat().modules.find(x=>x.type==='hero').data.photo.sizes||{}).square));
await p.click('[aria-label=Undo]');await p.waitForTimeout(400);
ok('undo brings it back',await p.evaluate(()=>!!(__T.mat().modules.find(x=>x.type==='hero').data.photo.sizes||{}).square));
await p.waitForTimeout(1500);
const saved=await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('mockdb'));const m=Object.values(d).find(v=>v&&v.name==='Photo sizes'&&v.modules);return m&&JSON.stringify((m.modules.find(x=>x.type==='hero').data.photo||{}).sizes||{})});
ok('per-size framing is saved with the material',/square/.test(saved||''),saved&&saved.slice(0,80));
// zooming a size's photo never shrinks its type
await p.evaluate(()=>{__T.setFmt('square');__T.redraw()});await p.waitForTimeout(400);
const fs0=await p.$eval('#stage .gl.fx h1',e=>getComputedStyle(e).fontSize);
await p.evaluate(()=>{const ph=__T.mat().modules.find(x=>x.type==='hero').data.photo;ph.sizes=ph.sizes||{};ph.sizes.square={fx:50,fy:50,zoom:180};__T.redraw()});await p.waitForTimeout(400);
const fs1=await p.$eval('#stage .gl.fx h1',e=>getComputedStyle(e).fontSize);ok('zooming the photo keeps the type size',fs0===fs1,fs0+' → '+fs1);
// exporting a size with the subject under the copy asks first
// (signature crop rule, 99u: a subject the photo can move is put on the upper thirds line, clear of the copy; the gate
// is checked with one it can't lift: low in a photo that has no room to move up)
await p.evaluate(()=>{const ph=__T.mat().modules.find(x=>x.type==='hero').data.photo;ph.fx=50;ph.fy=72;ph.sizes={};__T.redraw()});await p.waitForTimeout(300);
const clashNow=await p.evaluate(()=>__T.subjectClashes(__T.mat()).map(x=>x.f.id));
// the gate is asked of a size where the subject really is under the copy (which sizes those are depends on each
// size's own layout, so the suite reads them rather than naming one)
ok('a size still has the subject under its copy',clashNow.length>0,clashNow.join(', '));
await p.evaluate(fid=>{__T.exportOne(__T.fmtById(fid))},clashNow[0]||'square');await p.waitForTimeout(800);
const gm=await p.evaluate(()=>{const m=document.querySelector('.modal');return m?m.textContent:''});
if(/sample copy/.test(gm)){await p.click('#u-export-anyway');await p.waitForTimeout(800)}
const gm2=await p.evaluate(()=>{const m=document.querySelector('.modal');return m?m.textContent:''});
ok('exporting with the subject under the copy asks first',/subject is under the copy/.test(gm2),gm2.slice(0,80));
ok('no script errors',!errs.length,errs.slice(0,2).join(' | '));
R.forEach(x=>console.log(x));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log(f?f+' FAILED':'ALL PASS');await b.close()})();
