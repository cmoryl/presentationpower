// visual review: All sizes side by side, Present full-window, Compare a version with now
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:950}});const errs=[];const url='file://'+__dirname+'/test.html';
await ctx.route(/cdn\.jsdelivr\.net/,r=>r.abort());await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
await p.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await p.waitForTimeout(1800);
// All sizes
ok('the size bar starts with All',await p.evaluate(()=>{const b=document.querySelector('.fmtbar button');return b&&b.id==='fmt-all'}));
await p.click('#fmt-all');await p.waitForTimeout(2500);
const req=await p.evaluate(()=>__T.mat().formats.filter(id=>!__T.fmtById(id).sequence).length);
const tiles=await p.locator('.gal-tile').count();
ok('All lays out one tile per required size',tiles===req&&tiles>=3,tiles+' tiles, '+req+' required');
ok('the single page is gone and the tiles are live pages inside one width',await p.evaluate(()=>{const ts=[...document.querySelectorAll('.gal-tile .vis-box')];const ws=ts.map(t=>parseFloat(t.style.width));return !document.querySelector('.canvasWrap')&&ts.every(t=>t.firstChild.children.length>0&&t.textContent.trim().length>20)&&Math.max(...ws)<=360&&Math.min(...ws)>=120}));
ok('tiles say which size and whether it is required',/US Letter/.test(await p.textContent('.gal-tile >> nth=0'))&&/required/.test(await p.textContent('.gal-tile >> nth=0')));
await p.check('#gal-every');await p.waitForTimeout(2500);
ok('Every size widens it to all formats',(await p.locator('.gal-tile').count())>tiles,await p.locator('.gal-tile').count());
// on a wide window the tiles are narrower than a third of the row: each preview stays inside its own tile
{const vp=p.viewportSize();await p.setViewportSize({width:1750,height:1200});await p.uncheck('#gal-every');await p.waitForTimeout(800);await p.check('#gal-every');await p.waitForTimeout(2500);
 const g=await p.evaluate(()=>{const ts=[...document.querySelectorAll('.gal-tile')];const rs=ts.map(t=>t.getBoundingClientRect());let out=0,lap=0;ts.forEach((t,i)=>{const bx=t.querySelector('.vis-box').getBoundingClientRect();if(bx.left<rs[i].left-1||bx.right>rs[i].right+1)out++});for(let i=0;i<rs.length;i++)for(let j=i+1;j<rs.length;j++){const a=rs[i],c=rs[j];if(a.left<c.right-1&&c.left<a.right-1&&a.top<c.bottom-1&&c.top<a.bottom-1)lap++}return {n:ts.length,out,lap}});
 ok('on a wide window no preview runs out of its tile or over a neighbour',g.n>3&&g.out===0&&g.lap===0,JSON.stringify(g));await p.setViewportSize(vp)}
await p.uncheck('#gal-every');await p.waitForTimeout(2000);
await p.click('.gal-tile >> nth=1');await p.waitForTimeout(1500);
ok('a tile opens that size on the stage',await p.evaluate(()=>__T.S().fmt)==='a4'&&!(await p.$('#gallery'))&&!!(await p.$('.canvasWrap')));
await p.click('.fmtbar button:has-text("Letter")');await p.waitForTimeout(1200);
ok('picking a size from the bar keeps the gallery closed',!(await p.$('#gallery')));
// Present
await p.click('#u2-ed-more');await p.waitForTimeout(300);ok('More offers All sizes and Present',await p.isVisible('#u2-ed-all')&&await p.isVisible('#u2-ed-present'));
await p.click('#u2-ed-present');await p.waitForTimeout(1500);
ok('Present fills the window with the current size',await p.isVisible('#present')&&/US Letter · 1 of/.test(await p.textContent('.pr-cap')),await p.textContent('.pr-cap'));
ok('the slide is scaled to fit the window',await p.evaluate(()=>{const b=document.querySelector('#present .vis-box');const r=b.getBoundingClientRect();return r.height<=innerHeight-100&&r.width<=innerWidth-100&&r.height>400}));
await p.keyboard.press('ArrowRight');await p.waitForTimeout(1200);ok('arrow keys move',/2 of/.test(await p.textContent('.pr-cap')));
await p.keyboard.press('End');await p.waitForTimeout(1200);ok('End goes to the last size and Next is off',await p.$eval('#pr-next',b=>b.disabled));
await p.keyboard.press('Home');await p.waitForTimeout(800);ok('Home returns to the first',/1 of/.test(await p.textContent('.pr-cap')));
ok('focus is inside the presentation',await p.evaluate(()=>document.activeElement&&!!document.activeElement.closest('#present')));
await p.keyboard.press('Escape');await p.waitForTimeout(500);ok('Esc leaves it and the editor is as it was',!(await p.$('#present'))&&!!(await p.$('.canvasWrap'))&&await p.evaluate(()=>!document.body.classList.contains('presenting')));
// Compare
await p.click('.rtabs >> text=Review');await p.waitForTimeout(800);
await p.fill('.rbody input[placeholder*="Label"]','Sent to client');await p.click('.rbody .btn:has-text("Save")');await p.waitForTimeout(1500);
await p.click('#stage .mod >> nth=0');await p.waitForTimeout(300);const tid=await p.$eval('.rbody textarea',e=>e.id);await p.fill('#'+tid,'A different headline for the compare');await p.waitForTimeout(1500);
await p.click('.rtabs >> text=Review');await p.waitForTimeout(1000);
await p.click('.ver:has-text("Sent to client") .mini:has-text("Compare")');await p.waitForTimeout(1800);
ok('Compare opens side by side at one scale',await p.isVisible('#compare')&&(await p.locator('#compare .cmp-col').count())===2&&await p.evaluate(()=>{const b=[...document.querySelectorAll('#compare .vis-box')];return b.length===2&&b[0].style.width===b[1].style.width}));
ok('the bar says who saved it and how many changes',/1 change since/.test(await p.textContent('.cmp-meta')),await p.textContent('.cmp-meta'));
const thenT=await p.textContent('#compare .cmp-col >> nth=0'),nowT=await p.textContent('#compare .cmp-col >> nth=1');
ok('then shows the old headline, now the new one',/Fernwood & Vale launched/.test(thenT)&&/different headline for the compare/.test(nowT)&&!/different headline/.test(thenT));
await p.click('#cmp-swipe');await p.waitForTimeout(1200);
ok('Swipe stacks them with a handle',await p.isVisible('#cmp-slider')&&!!(await p.$('.cmp-stack'))&&!!(await p.$('#cmp-line')));
await p.fill('#cmp-slider','30');await p.dispatchEvent('#cmp-slider','input');await p.waitForTimeout(200);
ok('the slider clips the Now layer',/30%/.test(await p.$eval('#cmp-over',e=>e.style.clipPath))&&/30%/.test(await p.$eval('#cmp-line',e=>e.style.left)));
const st=await p.$('.cmp-stack');const bb=await st.boundingBox();await p.mouse.move(bb.x+bb.width*0.8,bb.y+200);await p.mouse.down();await p.mouse.up();await p.waitForTimeout(200);
ok('dragging on the page moves the handle',Math.abs(parseFloat(await p.inputValue('#cmp-slider'))-80)<3,await p.inputValue('#cmp-slider'));
ok('Restore and What changed are at hand',await p.isVisible('#cmp-restore')&&await p.isVisible('#cmp-changes'));
await p.keyboard.press('Escape');await p.waitForTimeout(400);ok('Esc closes Compare',!(await p.$('#compare')));
// view-only user: present works, no restore
const v=await ctx.newPage();v.on('pageerror',e=>errs.push('V '+e.message));await v.goto(url+'#as=sam');await v.waitForTimeout(1500);
await v.evaluate(()=>{const S=__T.S();const pr=S.projects[0];__T.go('project',pr.id)});await v.waitForTimeout(1200);await v.click('.mcard:has(.mn:text-is("Fernwood & Vale case study"))');await v.waitForTimeout(1800);
await v.click('#fmt-all');await v.waitForTimeout(2500);ok('a viewer can use All sizes',(await v.locator('.gal-tile').count())>=3);
await v.click('#gal-present');await v.waitForTimeout(1200);ok('and Present',await v.isVisible('#present'));await v.keyboard.press('Escape');
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));await b.close()})();
