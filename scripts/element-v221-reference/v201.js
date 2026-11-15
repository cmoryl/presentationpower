/* v201: no kind label above the headline, and a first look at a project board.
   - a hero draws its headline only: no rule and "Case study" / "Solution brief" above it, on the page or on any
     other size, whatever the material's data says; the hero has no label field and the label is not counted as
     the material's text;
   - the first time an example project's board is opened, a welcome names the five areas of the page and offers a
     look around; each area is lit in turn with a card beside it; it is remembered once seen, opens again from
     "How this board works", closes for a dialog or a change of page, and puts the board back as it was;
   - at phone width the card is a sheet along the bottom with the lit area above it. */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e&&e.stack||e).slice(0,400));process.exit(1)});
const KIND=/^(example |client |customer |product )?(case study|solution brief|client spotlight|spotlight|ebrochure( light)?|adaptor brief|multi-page brief)$/i;
(async()=>{const b=await chromium.launch();
const open=async(vp,opts)=>{const ctx=await b.newContext(Object.assign({viewport:vp},opts||{}));await ctx.route(/cdn\.jsdelivr\.net/,r=>r.abort());const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
  await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1200);return {ctx,p,errs}};
const openExample=async(p,auto)=>{await p.evaluate((auto)=>{window.__NOTOUR=!auto;const x=[...document.querySelectorAll('button')].find(q=>/Open the example project/.test(q.textContent));x.click()},auto);await p.waitForSelector('.mcard',{timeout:15000})};
const state=(p)=>p.evaluate(()=>{const t=document.getElementById('tour');if(!t)return null;const c=t.querySelector('.tour-card'),hEl=t.querySelector('.tour-hole');const cr=c.getBoundingClientRect(),hr=hEl.getBoundingClientRect();const box=r=>({l:Math.round(r.left),t:Math.round(r.top),r:Math.round(r.right),b:Math.round(r.bottom)});
  return {title:(t.querySelector('.tour-t').textContent||'').trim(),n:(t.querySelector('.tour-t .tour-n')||{}).textContent||'',text:(t.querySelector('.tour-b').textContent||'').replace(/\s+/g,' ').trim(),count:(t.querySelector('.tour-f .sr-only')||{}).textContent||'',card:box(cr),hole:box(hr),on:hEl.classList.contains('on'),side:c.getAttribute('data-side')||'',sheet:t.classList.contains('sheet'),center:c.classList.contains('center'),
   back:!t.querySelector('.tour-back').hidden?t.querySelector('.tour-back').textContent:'',next:t.querySelector('.tour-next').textContent,dots:[...t.querySelectorAll('.tour-dots i')].map(i=>i.className==='on'?1:0).join(''),inert:!!document.querySelector('.app').inert,focusIn:c.contains(document.activeElement),vw:document.documentElement.clientWidth,vh:innerHeight,sw:document.documentElement.scrollWidth}});
const rectOf=(p,sels)=>p.evaluate((sels)=>{let r=null;sels.forEach(s=>{const e=document.querySelector('#view '+s);if(!e)return;const q=e.getBoundingClientRect();if(!q.width&&!q.height)return;if(!r)r={l:q.left,t:q.top,r:q.right,b:q.bottom};else{r.l=Math.min(r.l,q.left);r.t=Math.min(r.t,q.top);r.r=Math.max(r.r,q.right);r.b=Math.max(r.b,q.bottom)}});return r&&{l:Math.round(r.l),t:Math.round(r.t),r:Math.round(r.r),b:Math.round(r.b)}},sels);
const apart=(a,h)=>a.r<=h.l||a.l>=h.r||a.b<=h.t||a.t>=h.b; // two boxes that do not overlap
const press=async(p,sel)=>{await p.click(sel);await p.waitForTimeout(480)};

/* ================= 1. no kind label above the headline ================= */
{const {ctx,p,errs}=await open({width:1300,height:1000});await p.evaluate(()=>document.fonts.ready);
const hero=await p.evaluate((KINDS)=>{const KIND=new RegExp(KINDS,'i');const f=__T.fmtById('letter');const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0;width:816px';document.body.appendChild(host);const bad=[];let n=0,first=0;
 const look=(html,id)=>{host.innerHTML=html;const hs=host.querySelectorAll('.m-hero');hs.forEach(h=>{n++;if(h.querySelector('.t-eyebrow,.epill,.lockup'))bad.push(id+': label element');const c=h.querySelector('.hcopy');if(c&&c.firstElementChild&&/^H1$/.test(c.firstElementChild.tagName))first++;[...h.querySelectorAll('*')].forEach(e=>{if(!e.children.length&&KIND.test((e.textContent||'').trim()))bad.push(id+': “'+e.textContent.trim()+'”')})})};
 const ids=__T.ELIB.filter((x,i)=>i%6===0).map(x=>x.id);
 ids.forEach(id=>{const pc=__T.ELIB.find(x=>x.id===id);const lay=__T.pieceLayout(pc);look(__T.withBrand(__T.brandById(pc.brand),()=>__T.withStyle({look:'spectrum',modules:lay.modules,tight:lay.tight||0},()=>__T.pageHTMLAt(__T.pageParts(JSON.parse(JSON.stringify(lay.modules)))[0],f,lay.tight||0))),id)});
 const lib=n;
 __T.spxlTemplates().filter(Boolean).forEach((t,i)=>{const mods=__T.spxlMods(t);look(__T.withStyle({look:'spectrum',modules:mods},()=>__T.pageHTMLAt(__T.pageParts(JSON.parse(JSON.stringify(mods)))[0],f,0)),'template '+i)});
 const tpl=n-lib;
 // whatever a saved material says: a label and each of the three old styles
 const kept=[];['plain','pill','lockup'].forEach(st=>{['text','right','full'].forEach(L=>{const d=Object.assign({},__T.MODULES.hero.def(),{layout:L,eyebrowStyle:st,eyebrow:'Solution brief',variant:st==='lockup'?'lockup':undefined});host.innerHTML=__T.withStyle({look:'spectrum'},()=>__T.pageHTMLAt([{id:'h1aaaaaaaaaa',type:'hero',data:d}],{w:f.w,h:0,print:true},0));const h=host.querySelector('.m-hero');if(!h||/solution brief/i.test(h.textContent)||h.querySelector('.t-eyebrow,.epill,.lockup'))kept.push(st+'/'+L)})});
 host.remove();
 const fields=__T.MODULES.hero.fields.filter(x=>x.k).map(x=>x.k);
 const txt=__T.moduleText({id:'h1aaaaaaaaaa',type:'hero',data:Object.assign({},__T.MODULES.hero.def(),{eyebrow:'Solution brief'})});
 const other=__T.moduleText({id:'d1aaaaaaaaaa',type:'divider',data:Object.assign({},__T.MODULES.divider.def(),{eyebrow:'Part one'})});
 return {bad,n,lib,tpl,first,kept,fields,heroKeys:Object.keys(txt),otherHas:'eyebrow' in other||Object.keys(other).length>0}},KIND.source);
ok('no hero on a Library page or a template carries a rule and a kind label ("Case study", "Solution brief")',hero.lib>=40&&hero.tpl>=10&&hero.bad.length===0,hero.bad.slice(0,4).join(' | ')||hero.lib+' Library pages, '+hero.tpl+' templates');
ok('the headline is the first thing in every hero',hero.first===hero.n,hero.first+'/'+hero.n);
ok('a material saved with a label draws none, in any of the three old label styles',hero.kept.length===0,hero.kept.join(', ')||'3 styles × 3 layouts');
ok('the hero has no label field in the editor',hero.fields.indexOf('eyebrow')<0&&hero.fields.indexOf('eyebrowStyle')<0&&hero.fields.indexOf('title')>=0,hero.fields.slice(0,6).join(','));
ok('a label left in a hero\'s data is not part of the material\'s words (review, translation, limits)',hero.heroKeys.indexOf('eyebrow')<0&&hero.heroKeys.indexOf('title')>=0,hero.heroKeys.join(','));

/* every other size */
const sizes=await p.evaluate((KINDS)=>{const KIND=new RegExp(KINDS,'i');const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0';document.body.appendChild(host);const bad=[];let n=0,ey=0;
 const ids=__T.FORMATS.map(f=>f.id).filter(id=>id!=='letter'&&id!=='a4');
 ['legal-accelerating-document-review-genai','games-team17-global-localization','kb-gl-web-rogers-corporation-spotlight','kb-dataforce-bpo-services','glweb-ebro-retail-brands-engage-audiences'].forEach(pid=>{const pc=__T.ELIB.find(q=>q.id===pid);if(!pc)return;const mods=__T.pieceLayout(pc).modules.filter(m=>m.type!=='pagebreak');
  ids.forEach(id=>{const f=__T.fmtById(id);host.innerHTML=__T.withBrand(__T.brandById(pc.brand),()=>__T.withStyle({look:'spectrum',modules:mods},()=>__T.fmtHTML(mods,f,false)));__T.fitAll(host);n++;
   [...host.querySelectorAll('*')].forEach(e=>{if(!e.children.length&&KIND.test((e.textContent||'').trim()))bad.push(pid.slice(0,14)+' '+id+': “'+e.textContent.trim()+'”')});
   [...host.querySelectorAll('.ey')].forEach(e=>{ey++;if(e.getAttribute('data-rung')!=='client')bad.push(pid.slice(0,14)+' '+id+': a line that is not the client');const c=getComputedStyle(e,'::before').content;if(c&&c!=='none'&&c!=='normal')bad.push(pid.slice(0,14)+' '+id+': rule before the line')})})});
 host.remove();return {bad,n,ey}},KIND.source);
ok('no social, ad, slide or email size says the kind of piece above its headline',sizes.n>=50&&sizes.bad.length===0,sizes.bad.slice(0,4).join(' | ')||sizes.n+' sizes');
ok('no page errors (hero and sizes)',errs.length===0,errs.slice(0,2).join(' | '));
await ctx.close()}

/* the example in the editor: every size, with a client to name */
{const {ctx,p,errs}=await open({width:1600,height:1000});await openExample(p,false);await p.waitForTimeout(1500);
await p.click('.mcard:has-text("case study")');await p.waitForTimeout(2500);
await p.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(q=>/^All\s*All sizes$/.test((q.textContent||'').trim()));if(x)x.click()});await p.waitForTimeout(2500);
await p.evaluate(()=>{const x=[...document.querySelectorAll('label,input')].find(q=>/Every size/.test(q.textContent||q.getAttribute('aria-label')||''));if(x)x.click()});await p.waitForTimeout(6000);
const ex=await p.evaluate(()=>{const fr=[...document.querySelectorAll('#stage .gl.fam')];const bad=[];let client=0;fr.forEach(g=>{const cls=(String(g.className).match(/fam-[a-z]+/)||['?'])[0];if(/example case study/i.test(g.textContent))bad.push(cls+': says the kind');[...g.querySelectorAll('.ey')].forEach(e=>{if(e.closest('[data-off]'))return;const t=(e.textContent||'').trim();if(/Fernwood/.test(t))client++;else bad.push(cls+': “'+t+'”');const c=getComputedStyle(e,'::before').content;if(c&&c!=='none'&&c!=='normal')bad.push(cls+': a rule before “'+t+'”')})});
 const pages=[...document.querySelectorAll('#stage .gl.page .m-hero')];pages.forEach(h=>{if(/example case study/i.test(h.textContent))bad.push('page hero says the kind')});return {n:fr.length,pages:pages.length,bad,client}});
ok('the example case study: no size and no page says "Example case study"; a line above a headline only ever names the client, with no rule before it',ex.n>=8&&ex.pages>=1&&ex.bad.length===0,ex.bad.slice(0,4).join(' | ')||ex.n+' sizes, '+ex.pages+' pages, the client on '+ex.client+' lines');
ok('no page errors (editor, every size)',errs.length===0,errs.slice(0,2).join(' | '));
await ctx.close()}

/* ================= 2. the look around, at desktop width ================= */
{const {ctx,p,errs}=await open({width:1440,height:900});
await openExample(p,true);
await p.waitForSelector('#tour',{timeout:6000}).catch(()=>{});await p.waitForTimeout(500);
let s=await state(p);
ok('the first time an example project is opened, a welcome opens by itself',!!s&&s.title==='This is an example project',JSON.stringify(s&&s.title));
const wel=await p.evaluate(()=>{const t=document.getElementById('tour');if(!t)return {};const c=t.querySelector('.tour-card');return {role:c.getAttribute('role'),modal:c.getAttribute('aria-modal'),lab:c.getAttribute('aria-labelledby'),desc:c.getAttribute('aria-describedby'),hasLab:!!document.getElementById(c.getAttribute('aria-labelledby')||'x'),areas:[...t.querySelectorAll('.tour-areas li')].map(l=>l.textContent.trim()),nums:[...t.querySelectorAll('.tour-areas .tour-n')].map(l=>l.textContent).join(''),map:!!t.querySelector('svg.tour-map[role="img"][aria-label]'),marks:[...t.querySelectorAll('.tour-map .mk text')].map(x=>x.textContent).join(''),made:/made-up client/.test(t.textContent),live:!!t.querySelector('[aria-live="polite"] .tour-t')}});
ok('it is a dialog with a name and a description, and says the example is made up',wel.role==='dialog'&&wel.modal==='true'&&wel.hasLab&&!!wel.desc&&wel.made&&wel.live,JSON.stringify(wel).slice(0,200));
ok('it names the five areas of the page in order, beside a sketch of the page with the same numbers',(wel.areas||[]).join('|')==='1The project|2Board, Brief and Activity|3Find and arrange|4The five stages|5A material card'&&wel.map&&wel.marks==='12345',JSON.stringify([wel.areas,wel.marks]));
ok('the page behind is inert, the keyboard is in the card and nothing is lit yet',s.inert&&s.focusIn&&!s.on&&s.center,JSON.stringify({inert:s.inert,focusIn:s.focusIn,on:s.on}));
ok('the welcome offers "Show me around" and "Not now", and fits the window',s.next==='Show me around'&&s.back==='Not now'&&s.card.t>=0&&s.card.b<=s.vh&&s.card.l>=0&&s.card.r<=s.vw,JSON.stringify([s.next,s.back,s.card]));
// the five areas
const want=[['The project',['.phead']],['Board, Brief and Activity',['.tabs']],['Find and arrange',['.vol-bar','.board-org']],['The five stages',['.board']],['A material card',['.board .mwrap']]];
const seen=[];
for(let i=0;i<5;i++){await press(p,'.tour-next');s=await state(p);const tr=await rectOf(p,want[i][1]);seen.push({i,s,tr})}
ok('each press of Next moves on one area, in order',seen.map(x=>x.s&&x.s.title).join('|')===want.map((w,i)=>(i+1)+w[0]).join('|'),seen.map(x=>x.s&&x.s.title).join('|'));
ok('each step says which of the five it is, and the bars fill as it goes',seen.every(x=>x.s.count==='Step '+(x.i+1)+' of 5'&&x.s.dots==='1'.repeat(x.i+1)+'0'.repeat(4-x.i)),seen.map(x=>x.s.count+' '+x.s.dots).join(', '));
const lit=seen.filter(x=>!(x.s.on&&x.tr&&x.s.hole.l<=x.tr.l+1&&x.s.hole.t<=x.tr.t+1&&x.s.hole.r>=Math.min(x.tr.r,x.s.vw-4)-1&&x.s.hole.b>=Math.min(x.tr.b,x.s.vh-4)-1));
ok('the lit area is the area the card is about (the whole of it, as far as the window shows)',lit.length===0,lit.map(x=>x.s.title+' hole '+JSON.stringify(x.s.hole)+' area '+JSON.stringify(x.tr)).join(' | ')||seen.map(x=>x.s.hole.r-x.s.hole.l+'×'+(x.s.hole.b-x.s.hole.t)).join(', '));
const over=seen.filter(x=>!apart(x.s.card,x.s.hole)||x.s.card.t<0||x.s.card.l<0||x.s.card.r>x.s.vw||x.s.card.b>x.s.vh||!x.s.side);
ok('the card sits beside the lit area, never over it, inside the window, with its pointer on the side that faces it',over.length===0,over.map(x=>x.s.title+' card '+JSON.stringify(x.s.card)+' hole '+JSON.stringify(x.s.hole)+' side '+x.s.side).join(' | ')||seen.map(x=>x.s.side).join(', '));
ok('every card says something in whole sentences, and the last one says Done',seen.every(x=>x.s.text.length>80&&/\.$/.test(x.s.text))&&seen[4].s.next==='Done'&&seen[0].s.next==='Next',seen.map(x=>x.s.text.length).join(','));
// what the stage and card steps say
await press(p,'.tour-back');
const stg=await p.evaluate(()=>{const t=document.getElementById('tour');return {title:t.querySelector('.tour-t').textContent,chips:[...t.querySelectorAll('.tour-key dt .chip')].map(c=>c.textContent.trim()),says:[...t.querySelectorAll('.tour-key dd')].map(d=>d.textContent.trim()),cols:[...document.querySelectorAll('#view .board .col')].map(c=>c.getAttribute('aria-label'))}});
ok('Back goes back one area; the stages card lists the five stages by the names on the columns, each with what it means',/The five stages/.test(stg.title)&&stg.chips.join('|')==='Draft|In review|Changes requested|Approved|Delivered'&&stg.chips.join('|')===stg.cols.join('|')&&stg.says.every(x=>x.length>12),JSON.stringify([stg.chips,stg.says.map(x=>x.length)]));
await p.keyboard.press('ArrowRight');await p.waitForTimeout(420);
const crd=await p.evaluate(()=>{const t=document.getElementById('tour');const c=document.querySelector('#view .board .mwrap .mcard')||document.querySelector('#view .board .mcard');return {title:t.querySelector('.tour-t').textContent,key:[...t.querySelectorAll('.tour-key dt')].map(c=>c.textContent.trim()),says:[...t.querySelectorAll('.tour-key dd')].map(d=>d.textContent.trim()),flags:[...c.querySelectorAll('.flags > .flag')].map(f=>f.textContent.trim()),text:t.querySelector('.tour-b').textContent}});
ok('the right arrow key moves on; the card step explains the chips on the very card that is lit',/A material card/.test(crd.title)&&crd.key.length>=2&&crd.key.join('|')===crd.flags.join('|')&&crd.says.every(x=>x.length>20)&&/open it in the editor/.test(crd.text),JSON.stringify([crd.key,crd.flags]));
await p.keyboard.press('ArrowLeft');await p.waitForTimeout(420);await p.keyboard.press('ArrowLeft');await p.waitForTimeout(420);
s=await state(p);ok('the left arrow key moves back',s.title==='3Find and arrange',s.title);
// the keyboard stays in the card
const tabs=[];for(let i=0;i<7;i++){await p.keyboard.press('Tab');tabs.push(await p.evaluate(()=>{const a=document.activeElement;return a&&a.closest('.tour-card')?(a.className.match(/tour-(x|back|next)/)||['?'])[0]:'OUT'}))}
ok('Tab goes round the card\'s own buttons and never out to the page',tabs.indexOf('OUT')<0&&tabs.indexOf('?')<0&&new Set(tabs).size===3,tabs.join(' '));
await p.keyboard.press('/');await p.keyboard.press('?');await p.waitForTimeout(250);
ok('the page\'s own shortcuts wait while it is up',await p.evaluate(()=>!document.getElementById('scrim')&&document.activeElement.id!=='vol-q'&&!!document.getElementById('tour')));
// a double-click is one step; quick single clicks each count
await p.evaluate(()=>{const n=document.querySelector('.tour-next');n.click();n.click()});await p.waitForTimeout(450);
s=await state(p);ok('a double-click on Next moves one area, not two',s.title==='4The five stages',s.title);
await p.click('.tour-back');await p.waitForTimeout(300);await p.click('.tour-back');await p.waitForTimeout(300);await p.click('.tour-back');await p.waitForTimeout(300);
s=await state(p);ok('presses a third of a second apart each count (the page\'s repeat-click guard does not swallow them)',s.title==='1The project',s.title);
await press(p,'.tour-back');s=await state(p);ok('Back from the first area returns to the welcome',s.title==='This is an example project'&&!s.on,s.title);
// the board is drawn again under it
await press(p,'.tour-next');await press(p,'.tour-next');await press(p,'.tour-next');await press(p,'.tour-next');
const before=await p.evaluate(()=>{const e=document.querySelector('#view .board');e.setAttribute('data-old','1');return true});
await p.evaluate(()=>{__T.S().mats[0].name=__T.S().mats[0].name+' ';__T.renderProject()});await p.waitForTimeout(400);
s=await state(p);const br=await rectOf(p,['.board']);const fresh=await p.evaluate(()=>!document.querySelector('#view .board').hasAttribute('data-old'));
ok('when the board is drawn again under it, it stays up and the same area is lit on the new board',fresh&&!!s&&s.title==='4The five stages'&&s.on&&Math.abs(s.hole.t-(br.t-7))<=2&&s.inert,JSON.stringify({fresh,title:s&&s.title,hole:s&&s.hole,br}));
// reduced motion
await p.emulateMedia({reducedMotion:'reduce'});await press(p,'.tour-next');
const rm=await p.evaluate(()=>{const t=document.getElementById('tour');return {moving:t.classList.contains('moving'),dur:getComputedStyle(t.querySelector('.tour-hole')).transitionDuration,anim:getComputedStyle(t.querySelector('.tour-card')).animationName}});
ok('with reduced motion on, nothing glides or fades',/^0s(, 0s)*$/.test(rm.dur)&&rm.anim==='none',JSON.stringify(rm));
await p.emulateMedia({reducedMotion:'no-preference'});
// Done
await press(p,'.tour-next');await p.waitForTimeout(300);
const done=await p.evaluate(()=>({tour:!!document.getElementById('tour'),inert:!!document.querySelector('.app').inert,seen:localStorage.getItem('el-board-tour'),toast:document.getElementById('toast').textContent,focus:document.activeElement.id,btn:(document.getElementById('vol-tour')||{}).textContent||''}));
ok('Done closes it, gives the page back and remembers it was seen',!done.tour&&!done.inert&&!!done.seen,JSON.stringify(done));
ok('…and says where to find it again, with the keyboard on that button',/How this board works/.test(done.toast)&&done.focus==='vol-tour'&&/How this board works/.test(done.btn),JSON.stringify([done.toast,done.focus]));
// not a second time
await p.evaluate(()=>__T.go('home'));await p.waitForTimeout(700);
await p.evaluate(()=>{const S=__T.S();const pr=S.projects.find(x=>x.example);__T.go('project',pr.id)});await p.waitForSelector('.mcard');await p.waitForTimeout(1800);
ok('it does not open by itself a second time',await p.evaluate(()=>!document.getElementById('tour')));
// again, from the button: no welcome
await p.click('#vol-tour');await p.waitForTimeout(500);s=await state(p);
ok('"How this board works" opens it again at the first area, without the welcome or a Back button',!!s&&s.title==='1The project'&&s.back===''&&s.on&&s.count==='Step 1 of 5',JSON.stringify(s&&[s.title,s.back,s.count]));
await p.keyboard.press('Escape');await p.waitForTimeout(300);
ok('Esc closes it',await p.evaluate(()=>!document.getElementById('tour')&&!document.querySelector('.app').inert&&document.activeElement.id==='vol-tour'));
// the board as it was: table view, a search and a grouping are put back
await p.click('.vol-view button[data-view="table"]');await p.waitForTimeout(400);await p.fill('#vol-q','case');await p.waitForTimeout(500);
const pre=await p.evaluate(()=>({table:!!document.querySelector('#view table'),q:document.getElementById('vol-q').value,cards:document.querySelectorAll('#view .mcard').length,n:document.getElementById('vol-n').textContent}));
await p.click('#vol-tour');await p.waitForTimeout(600);
const mid=await p.evaluate(()=>({tour:!!document.getElementById('tour'),board:!!document.querySelector('#view .board'),cols:document.querySelectorAll('#view .board .col').length,cards:document.querySelectorAll('#view .board .mcard').length,q:document.getElementById('vol-q').value,pressed:(document.querySelector('.vol-view button[aria-pressed="true"]')||{}).textContent}));
ok('opened from a table with a search on, the board is shown whole for the look around (by stage, nothing filtered)',pre.table&&pre.q==='case'&&mid.tour&&mid.board&&mid.cols===5&&mid.cards===5&&mid.q===''&&mid.pressed==='Board',JSON.stringify([pre,mid]));
for(let i=0;i<4;i++)await press(p,'.tour-next');s=await state(p);
ok('…and the card step still finds a card to light',s.title==='5A material card'&&s.on,JSON.stringify([s.title,s.on]));
await press(p,'.tour-next');await p.waitForTimeout(300);
const post=await p.evaluate(()=>({tour:!!document.getElementById('tour'),table:!!document.querySelector('#view table'),q:document.getElementById('vol-q').value,n:document.getElementById('vol-n').textContent,pressed:(document.querySelector('.vol-view button[aria-pressed="true"]')||{}).textContent,stored:localStorage.getItem('el-proj-view')}));
ok('when it closes, the table, the search and the count are back as they were',!post.tour&&post.table&&post.q==='case'&&post.n===pre.n&&post.pressed==='Table'&&post.stored==='table',JSON.stringify([pre,post]));
await p.fill('#vol-q','');await p.click('.vol-view button[data-view="board"]');await p.waitForTimeout(400);
// a dialog wins
await p.click('#vol-tour');await p.waitForTimeout(500);
await p.evaluate(()=>document.getElementById('dl-all').click());await p.waitForTimeout(600);
const dlg=await p.evaluate(()=>({tour:!!document.getElementById('tour'),scrim:!!document.getElementById('scrim'),inert:!!document.querySelector('.app').inert}));
ok('a dialog that opens while it is up closes it and opens on the page as it was',!dlg.tour&&dlg.scrim&&dlg.inert,JSON.stringify(dlg));
await p.keyboard.press('Escape');await p.waitForTimeout(300);
ok('…and closing that dialog gives the page back',await p.evaluate(()=>!document.getElementById('scrim')&&!document.querySelector('.app').inert));
// it never opens over a dialog
await p.evaluate(()=>document.getElementById('dl-all').click());await p.waitForTimeout(400);await p.evaluate(()=>__T.tourStart(false));await p.waitForTimeout(300);
ok('it never opens over a dialog',await p.evaluate(()=>!document.getElementById('tour')&&!!document.getElementById('scrim')));
await p.keyboard.press('Escape');await p.waitForTimeout(300);
// leaving the page closes it
await p.click('#vol-tour');await p.waitForTimeout(500);await p.evaluate(()=>__T.go('home'));await p.waitForTimeout(600);
ok('leaving the board closes it and gives the page back',await p.evaluate(()=>!document.getElementById('tour')&&!document.querySelector('.app').inert));
await p.evaluate(()=>{const S=__T.S();__T.go('project',S.projects.find(x=>x.example).id)});await p.waitForSelector('#vol-tour');await p.waitForTimeout(500);
await p.click('#vol-tour');await p.waitForTimeout(500);const upB=await p.evaluate(()=>!!document.getElementById('tour'));
await p.goBack();await p.waitForTimeout(700);
const bk=await p.evaluate(()=>({tour:!!document.getElementById('tour'),inert:!!document.querySelector('.app').inert,view:__T.S().view}));
ok('the browser\'s Back button closes it too',upB&&!bk.tour&&!bk.inert&&bk.view!=='project',JSON.stringify(bk));
// a project that is not an example: the button, but never by itself
await p.evaluate(()=>{localStorage.removeItem('el-board-tour');const S=__T.S();const pr=S.projects.find(x=>x.example);pr.example=false;window.__pid=pr.id;__T.go('project',pr.id)});await p.waitForSelector('.mcard');await p.waitForTimeout(1800);
const plain=await p.evaluate(()=>({tour:!!document.getElementById('tour'),btn:!!document.getElementById('vol-tour')}));
ok('on a project that is not an example it never opens by itself, and "How this board works" is there',!plain.tour&&plain.btn,JSON.stringify(plain));
// "Not now" on the welcome counts as seen
await p.evaluate(()=>{const S=__T.S();S.projects.find(x=>x.id===window.__pid).example=true;__T.go('home')});await p.waitForTimeout(500);
await p.evaluate(()=>__T.go('project',window.__pid));await p.waitForSelector('#tour',{timeout:6000}).catch(()=>{});await p.waitForTimeout(400);
s=await state(p);const again=!!s&&s.title==='This is an example project';
if(again)await press(p,'.tour-back');
const nn=await p.evaluate(()=>({tour:!!document.getElementById('tour'),seen:!!localStorage.getItem('el-board-tour'),inert:!!document.querySelector('.app').inert}));
ok('until it has been seen it offers itself on the next visit; "Not now" closes it and counts as seen',again&&!nn.tour&&nn.seen&&!nn.inert,JSON.stringify([again,nn]));
// someone in the middle of something is left alone: it waits for the board, not a dialog
await p.evaluate(()=>{localStorage.removeItem('el-board-tour');__T.go('home')});await p.waitForTimeout(400);
await p.evaluate(()=>{__T.go('project',window.__pid)});await p.waitForSelector('#dl-all');await p.evaluate(()=>document.getElementById('dl-all').click());await p.waitForTimeout(1800);
ok('it does not open over a dialog someone opened first',await p.evaluate(()=>!document.getElementById('tour')&&!!document.getElementById('scrim')));
await p.keyboard.press('Escape');await p.waitForTimeout(200);
// the Brief tab is not the board
await p.evaluate(()=>{const t=[...document.querySelectorAll('#view .tabs button')].find(x=>x.textContent==='Brief');t.click()});await p.waitForTimeout(1500);
ok('it does not open on the Brief or Activity tab',await p.evaluate(()=>!document.getElementById('tour')));
ok('no page errors (look around)',errs.length===0,errs.slice(0,2).join(' | '));
await ctx.close()}

/* ================= 3. at phone width ================= */
{const {ctx,p,errs}=await open({width:390,height:800});await openExample(p,true);
await p.waitForSelector('#tour',{timeout:6000}).catch(()=>{});await p.waitForTimeout(500);
let s=await state(p);
{const sk=await p.evaluate(()=>{const m=document.querySelector('#tour .tour-map');return m?{ph:m.classList.contains('tour-map-ph'),label:m.getAttribute('aria-label'),marks:[...m.querySelectorAll('.mk text')].map(x=>x.textContent).join(''),cols:[...m.querySelectorAll('.colm')].map(x=>x.getAttribute('x')).join(',')}:{}});ok('phone: the welcome sketch is the page as a phone shows it (one column, stages one under another)',sk.ph&&/on a phone/.test(sk.label)&&sk.marks==='12345'&&new Set((sk.cols||'').split(',')).size===1,JSON.stringify(sk))}
ok('phone: the welcome opens, fits the window and does not make the page scroll sideways',!!s&&s.title==='This is an example project'&&s.card.l>=0&&s.card.r<=390&&s.card.t>=0&&s.card.b<=800&&s.sw<=390,JSON.stringify(s&&[s.card,s.sw]));
const seen=[];for(let i=0;i<5;i++){await press(p,'.tour-next');s=await state(p);seen.push(s)}
ok('phone: the card is a sheet along the bottom of the window',seen.every(x=>x.sheet&&x.card.b<=800&&x.card.b>=780&&x.card.l>=0&&x.card.r<=390&&x.card.t>=300),seen.map(x=>JSON.stringify(x.card)).join(' '));
ok('phone: every area is lit above the sheet, clear of the bars at the top',seen.every(x=>x.on&&x.hole.b<=x.card.t-4&&x.hole.t>=100&&x.hole.b-x.hole.t>=40&&x.hole.l>=0&&x.hole.r<=390),seen.map(x=>JSON.stringify(x.hole)).join(' '));
ok('phone: the stages card speaks of blocks and the menu (the columns are stacked and cards do not drag)',/Each block is a stage/.test(seen[3].text)&&/use the menu under it/.test(seen[3].text)&&!/drag/.test(seen[3].text),seen[3].text.slice(0,90));
ok('phone: every card says what a phone shows (buttons under the name, filters under the search box, tap, scroll for the other stages)',/Under the name, New material/.test(seen[0].text)&&!/On the right/.test(seen[0].text)&&/filters under the search box/.test(seen[2].text)&&!/Show as/.test(seen[2].text)&&/Tap a card to open it/.test(seen[4].text)&&/Scroll down for the other stages/.test(seen[4].text),seen[0].text.slice(60,130));
{const cover=await p.evaluate(()=>{const t=document.getElementById('wa-tab');const to=document.querySelector('.toast');const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&!e.hidden;return {tab:vis(t),toast:vis(to)}});ok('phone: nothing else sits over the card (no Agent button, no toast)',!cover.tab&&!cover.toast,JSON.stringify(cover))}
const tap=await p.evaluate(()=>[...document.querySelectorAll('.tour-card button')].filter(x=>!x.hidden).map(x=>{const r=x.getBoundingClientRect();return Math.round(Math.min(r.width,r.height))}));
ok('phone: every button on the card is at least 40 px to press',tap.every(x=>x>=40),tap.join(','));
ok('phone: no sideways scroll at any step',seen.every(x=>x.sw<=390),seen.map(x=>x.sw).join(','));
await press(p,'.tour-next');ok('phone: Done closes it',await p.evaluate(()=>!document.getElementById('tour')&&!document.querySelector('.app').inert));
const btn=await p.evaluate(()=>{const b=document.getElementById('vol-tour');const r=b.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(r.right),sw:document.documentElement.scrollWidth}});
ok('phone: "How this board works" sits on the count line without pushing the page wider',btn.l>=0&&btn.r<=390&&btn.sw<=390,JSON.stringify(btn));
ok('no page errors (phone)',errs.length===0,errs.slice(0,2).join(' | '));
await ctx.close()}

/* ================= 4. a short window, and the test build ================= */
{const {ctx,p,errs}=await open({width:1180,height:640});await openExample(p,true);
await p.waitForSelector('#tour',{timeout:6000}).catch(()=>{});await p.waitForTimeout(500);
let s=await state(p);ok('a short window: the welcome still fits (it scrolls inside itself if it has to)',!!s&&s.card.t>=0&&s.card.b<=640,JSON.stringify(s&&s.card));
const seen=[];for(let i=0;i<5;i++){await press(p,'.tour-next');s=await state(p);seen.push(s)}
const off=seen.filter(x=>x.card.t<0||x.card.b>640||x.card.l<0||x.card.r>1180||!x.on||x.hole.b-x.hole.t<40);
ok('a short window: every area is lit and every card is inside the window',off.length===0,off.map(x=>x.title+' card '+JSON.stringify(x.card)+' hole '+JSON.stringify(x.hole)).join(' | ')||seen.map(x=>x.side||'over').join(', '));
const cov=seen.filter(x=>!apart(x.card,x.hole));
ok('a short window: the card is beside the lit area wherever there is room (over its corner only when there is none)',cov.length<=1,cov.map(x=>x.title).join(', ')||'beside it at all five');
await p.keyboard.press('Escape');await ctx.close()}
{const {ctx,p,errs}=await open({width:1300,height:900});
await p.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(q=>/Open the example project/.test(q.textContent));x.click()});await p.waitForSelector('.mcard');await p.waitForTimeout(2200);
ok('in the test build it never opens by itself (the other suites are left alone)',await p.evaluate(()=>window.__NOTOUR===true&&!document.getElementById('tour')&&!localStorage.getItem('el-board-tour')));
// Help says where it is
await p.click('.nav-help');await p.waitForTimeout(600);await p.click('#hp-tab-faq');await p.fill('#hp-q','areas of a project board');await p.waitForTimeout(400);
const fq=await p.$$eval('.hp-faq',x=>x.map(d=>d.textContent));
ok('Help answers "what are the areas of a project board" and points to How this board works',fq.length>=1&&/How this board works/.test(fq.join(' ')),String(fq.length));
ok('no page errors (test build, Help)',errs.length===0,errs.slice(0,2).join(' | '));
await ctx.close()}
R.forEach(x=>console.log(x));console.log(R.filter(x=>x.startsWith('FAIL')).length?'SOME FAILED':'ALL PASS '+R.length);await b.close()})();
