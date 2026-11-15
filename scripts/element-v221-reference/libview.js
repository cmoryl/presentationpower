/* Library: an opened piece. The piece is shown large; the original document and its words are folded away; the
   view can be walked with the arrows and closed three ways, and gives focus back to the card it came from. */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const errs=[];
const open=async(vw,vh,hash)=>{const p=await b.newPage({viewport:{width:vw,height:vh}});p.on('pageerror',e=>errs.push(e.message.slice(0,160)));await p.goto('file://'+__dirname+'/test.html'+(hash||''));await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);await p.evaluate(()=>__T.go('library',null,null));await p.waitForTimeout(1200);return p};
const state=p=>p.evaluate(()=>{const d=document.getElementById('el-detail');if(!d)return null;const r=e=>{if(!e)return null;const q=e.getBoundingClientRect();return {x:Math.round(q.left),y:Math.round(q.top),w:Math.round(q.width),h:Math.round(q.height)}};const th=d.querySelector('#elv-stage .lp-thumb');
 return {cls:d.className,stage:r(d.querySelector('#elv-stage')),thumb:r(th),pages:d.querySelectorAll('#elv-stage .spx-full-pg').length,title:(d.querySelector('.elv-head h2')||{}).textContent,pos:(d.querySelector('.elv-pos')||{}).textContent,
 accs:[...d.querySelectorAll('details.elv-acc')].map(x=>x.id+':'+(x.open?'open':'closed')),rebuild:!!d.querySelector('#el-rebuild'),compare:!!d.querySelector('#elv-compare'),nav:r(d.querySelector('.elv-nav')),bars:Math.round((document.getElementById('bcbar')||document.querySelector('.app > .top')).getBoundingClientRect().bottom),
 recIn:!!d.querySelector('#elv-orig .el-rec'),wordsIn:!!d.querySelector('#elv-words .el-body'),scrim:!!document.getElementById('elv-scrim'),btt:(()=>{const t=document.querySelector('.btt');return !!t&&getComputedStyle(t).display!=='none'})(),hs:document.documentElement.scrollWidth>innerWidth+1,focusIn:d.contains(document.activeElement)}});
// ---- desktop
let p=await open(1440,900);
const PID='legal-end-to-end-digital-forensics';
const card=await p.$(`.el-card[data-id="${PID}"]`);await card.scrollIntoViewIfNeeded();await p.waitForTimeout(900);const y0=await p.evaluate(()=>scrollY);await card.click();await p.waitForTimeout(1500);
let s=await state(p);
ok('a card opens the piece view',!!s&&/el-view/.test(s.cls)&&s.scrim,s&&s.cls);
ok('the piece is drawn large (at least 700 px wide on a desktop)',s.thumb&&s.thumb.w>=700,JSON.stringify(s.thumb));
const wantPages=await p.evaluate((id)=>__T.pageParts(JSON.parse(JSON.stringify(__T.pieceLayout(__T.ELIB.find(x=>x.id===id)).modules))).length,PID);ok('every page of the piece is there',s.pages===wantPages&&wantPages>=1,s.pages+' of '+wantPages);
ok('the piece takes most of the view',s.stage.w>=s.thumb.w&&s.stage.w>800,JSON.stringify(s.stage));
ok('the title and the Rebuild button sit beside it',/End-to-End Digital Forensics/.test(s.title)&&s.rebuild,s.title);
ok('the original document and its words start folded away',s.accs.length===2&&s.accs.every(a=>/closed$/.test(a)),s.accs.join(' '));
ok('what came back from the original is inside its own section',s.recIn&&s.wordsIn);
ok('focus moves into the view',s.focusIn);
const y1=await p.evaluate(()=>scrollY);ok('the grid behind does not jump',Math.abs(y1-y0)<4,y0+' -> '+y1);
ok('the back-to-top button stays out of the way',!s.btt);
await p.click('#elv-orig summary');await p.waitForTimeout(300);
const o=await p.evaluate(()=>{const d=document.querySelector('#elv-orig');const i=d.querySelector('.el-rec-page img');return {open:d.open,vis:!!i&&i.getBoundingClientRect().height>40,yr:(d.querySelector('.el-yr')||{}).textContent||''}});
ok('opening “The original document” shows its pages and where the year came from',o.open&&o.vis&&/Year \d{4}/.test(o.yr),JSON.stringify(o));
await p.click('#elv-words summary');await p.waitForTimeout(300);
ok('opening “The original’s words” shows them',await p.evaluate(()=>{const d=document.querySelector('#elv-words');return d.open&&d.querySelectorAll('.el-sec').length>2&&d.querySelector('.el-sec').getBoundingClientRect().height>10}));
ok('“See the original” is one tap away',s.compare);
await p.click('#elv-compare');await p.waitForTimeout(600);
ok('it opens the original pages large, over the piece',await p.evaluate(()=>!!document.querySelector('.scrim .og-page img')&&!!document.getElementById('el-detail')));
await p.keyboard.press('Escape');await p.waitForTimeout(500);
let after=await p.evaluate(()=>({modal:!!document.querySelector('.scrim'),det:!!document.getElementById('el-detail')}));
if(after.modal){await p.click('.scrim .modal button:has-text("Close")');await p.waitForTimeout(400);after=await p.evaluate(()=>({modal:!!document.querySelector('.scrim'),det:!!document.getElementById('el-detail')}))}
ok('closing the original leaves the piece open',!after.modal&&after.det,JSON.stringify(after));
// walking the list
await p.evaluate(()=>document.getElementById('el-detail').focus());
const pos0=s.pos;await p.keyboard.press('ArrowRight');await p.waitForTimeout(1200);let s2=await state(p);
const n0=+pos0.split(' ')[0],n1=+s2.pos.split(' ')[0];
ok('the right arrow opens the next piece',n1===n0+1&&s2.title!==s.title,pos0+' -> '+s2.pos);
ok('the next piece opens folded too',s2.accs.every(a=>/closed$/.test(a)),s2.accs.join(' '));
ok('focus stays in the view',s2.focusIn);
await p.click('#elv-prev');await p.waitForTimeout(1200);let s3=await state(p);
ok('Previous goes back',s3.pos===pos0&&s3.title===s.title,s3.pos);
ok('the breadcrumb names the open piece',/End-to-End Digital Forensics/.test(await p.textContent('#crumbs')));
// first piece: nothing before it
await p.evaluate(()=>document.getElementById('el-detail').focus());await p.keyboard.press('Escape');await p.waitForTimeout(700);
ok('closing leaves the grid where it was',Math.abs((await p.evaluate(()=>scrollY))-y0)<12,String(await p.evaluate(()=>scrollY)));
ok('Escape closes the view',!(await p.$('#el-detail'))&&!(await p.$('#elv-scrim')));
ok('focus goes back to the card it came from',await p.evaluate((id)=>document.activeElement&&document.activeElement.getAttribute('data-id')===id,PID));
await p.evaluate(()=>scrollTo(0,0));await p.click('.el-card >> nth=0');await p.waitForTimeout(1200);
ok('the first piece has no Previous',await p.evaluate(()=>document.getElementById('elv-prev').disabled&&!document.getElementById('elv-next').disabled&&/^1 of /.test(document.querySelector('.elv-pos').textContent)));
await p.mouse.click(20,400);await p.waitForTimeout(700);
ok('a click outside closes the view',!(await p.$('#el-detail')));
await p.click('.el-card >> nth=0');await p.waitForTimeout(1000);await p.click('#el-detail .el-x');await p.waitForTimeout(600);
ok('the close button closes the view',!(await p.$('#el-detail')));
// a filtered list is what the arrows walk
await p.fill('#el-q, .el-bar input[type=search], .el-bar input','forensics');await p.waitForTimeout(900);
const nCards=await p.evaluate(()=>document.querySelectorAll('.el-card').length);await p.click('.el-card >> nth=0');await p.waitForTimeout(1000);
const fp=await p.evaluate(()=>document.querySelector('.elv-pos').textContent);
ok('the count follows the search',fp==='1 of '+nCards,fp+' / '+nCards+' cards');
await p.close();
// ---- phone
p=await open(390,800);await p.click('.el-card >> nth=0');await p.waitForTimeout(1500);s=await state(p);
ok('phone: the view fills the screen under the app bars',s.nav.y>=s.bars-1&&s.nav.y<=s.bars+2,JSON.stringify({nav:s.nav,bars:s.bars}));
ok('phone: the piece fits the screen width',s.thumb.w<=390&&s.thumb.w>=320&&!s.hs,JSON.stringify(s.thumb));
ok('phone: the title and actions come before the piece',await p.evaluate(()=>document.querySelector('.elv-head').getBoundingClientRect().top<document.querySelector('#elv-stage').getBoundingClientRect().top));
await p.screenshot({path:'/tmp/shots/lvt_m.png'});await p.evaluate(()=>{document.getElementById('el-detail').scrollTop=900});await p.waitForTimeout(300);
ok('phone: Close stays on screen while reading',await p.evaluate(()=>{const r=document.querySelector('#el-detail .el-x').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.width>20}));
await p.close();
// ---- someone who can only look
p=await open(1440,900,'#as=dana&level=interact');await p.click('.el-card >> nth=0');await p.waitForTimeout(1500);s=await state(p);
ok('view-only: the piece opens large, with no Rebuild',!!s&&s.thumb.w>=700&&!s.rebuild,JSON.stringify(s&&{w:s.thumb.w,rebuild:s.rebuild}));
await p.close();
ok('no page errors',errs.length===0,errs.join(' | ').slice(0,300));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
