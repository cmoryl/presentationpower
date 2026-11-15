/* Print, Spectrum: (1) nothing sits over a hero picture with a straight lower edge; a module may only overlap a
   picture that fades out. (2) A one-page sheet with room to spare shares it between the hero and the spacers,
   instead of bunching the content under the hero and leaving one hole above the closing band. */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:1300}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('text=Open the example project');await p.waitForTimeout(1200);await p.click('.mcard:has-text("launch brief")');await p.waitForTimeout(1500);
const draw=async(id,over)=>{const r=await p.evaluate(({id,over})=>{const pc=__T.ELIB.find(q=>q.id===id);const s=__T.S();s.mat.tight=0;const lay=__T.pieceLayout(pc);const pr=s.projects.find(q=>q.id===s.pid);pr.brand=pc.brand;const m=s.mat;m.modules=__T.pageParts(JSON.parse(JSON.stringify(lay.modules)))[0];if(over&&m.modules[0]&&m.modules[0].type==='hero')Object.assign(m.modules[0].data,over);m.tight=lay.tight||0;m.look='spectrum';m.rebuiltFrom={id:pc.id,kind:pc.kind,title:pc.title||''};m.name=pc.title||pc.id;s.fmt='letter';__T.redraw();return {pages:lay.modules.filter(x=>x.type==='pagebreak').length+1}},{id,over:over||null});await p.waitForTimeout(350);
 const g=await p.evaluate(()=>{const pg=document.querySelector('#stage .page');const z=pg.getBoundingClientRect().width/816;const R=e=>{const q=e.getBoundingClientRect();return {t:(q.top-pg.getBoundingClientRect().top)/z,b:(q.bottom-pg.getBoundingClientRect().top)/z,h:q.height/z}};
  const mods=[...pg.querySelectorAll('.mod')];const hero=pg.querySelector('.m-hero');const hp=hero&&hero.querySelector('.hp');const next=mods[1];
  // the first thing drawn in the next module (an icon tile, a card, a line of text)
  let firstTop=null;if(next){const els=[...next.querySelectorAll('*')].filter(e=>!e.closest('.modtag')&&e.getBoundingClientRect().height>4&&(e.tagName==='svg'||e.tagName==='IMG'||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||/\b(tile|card)\b/.test(String(e.className.baseVal||e.className))));if(els.length)firstTop=Math.min(...els.map(e=>R(e).t))}
  const tucked=!!(next&&next.querySelector('.overlap'));
  const gaps=[...pg.querySelectorAll('.pp-gap')].map(e=>Math.round(R(e).h));
  return {tucked,layout:hero?(/hl-(\w+)/.exec(hero.className)||[])[1]:null,heroH:hero?Math.round(R(hero).h):0,photoB:hp?Math.round(R(hp).b):null,nextTop:firstTop==null?null:Math.round(firstTop),grow:!!(mods[0]&&mods[0].classList.contains('pp-grow')),gaps,pageH:Math.round(R(pg).h),over:Math.round(pg.scrollHeight/1-pg.clientHeight)}});
 return Object.assign(r,g)};
/* the library sets every hero full width (its picture fades out), so the straight-edged picture is tried on a spread of
   pieces by switching their hero to it */
const STRAIGHT={layout:'fade',panel:'none',overlay:'none',scheme:'light',textColor:'dark',accent:'cobalt',height:'tall'};
/* a library hero is one of two things: the picture full width with the words on it, or the picture fading into the
   page with the words beside it, in ink. Never a card dropped on the photo. */
const heroKinds=await p.evaluate(()=>{const n={full:0,fade:0,other:[],card:[]};__T.ELIB.forEach(pc=>{const h=__T.pieceLayout(pc).modules[0];if(!h||h.type!=='hero')return n.other.push(pc.id);
 if(h.data.panel==='card')n.card.push(pc.id);
 if(h.data.layout==='full')n.full++;else if(h.data.layout==='fade')n.fade++;else n.other.push(pc.id+':'+h.data.layout)});return n});
ok('every library hero is a full-width picture or one that fades into the page',!heroKinds.other.length,heroKinds.full+' full, '+heroKinds.fade+' fading'+(heroKinds.other.length?' — '+heroKinds.other.slice(0,3).join(', '):''));
ok('no library hero puts its words in a card on the photo',!heroKinds.card.length,heroKinds.card.slice(0,3).join(', ')||'none');
const fades=await p.evaluate(()=>__T.ELIB.filter(pc=>!__T.pieceIsMulti(pc)).filter((x,i)=>i%22===0).map(x=>x.id));
ok('a spread of pieces to try the straight-edged picture on',fades.length>=10,fades.length);
const bad=[];let ex=null;for(const id of fades){const g=await draw(id,STRAIGHT);if(!ex&&g.pages===1&&g.gaps.length>=2&&g.gaps[0]>=8)ex=Object.assign({id},g);if(g.photoB==null||g.nextTop==null||g.nextTop<g.photoB-1||g.tucked)bad.push(id+' '+g.nextTop+'<'+g.photoB+(g.tucked?' tucked':''))}
ok('nothing sits over a straight-edged hero picture (every such piece)',bad.length===0,bad.slice(0,4).join(' | ')||fades.length+' pieces');
ok('a brief with a straight-edged picture: the next module starts below it',!!ex&&ex.layout==='fade'&&ex.nextTop>=ex.photoB,JSON.stringify(ex&&{id:ex.id,next:ex.nextTop,photo:ex.photoB}));
ok('…and has a spacer after the hero like the other modules',!!ex&&ex.gaps[0]>=8,ex?ex.gaps.join(','):'none found');
const softId=await p.evaluate(()=>{const x=__T.ELIB.find(pc=>{try{const m=__T.pieceLayout(pc).modules;return m[0]&&m[0].type==='hero'&&/^(right|left|full)$/.test(m[0].data.layout)&&m[1]&&m[1].type==='kpis'&&/^(cards|tiles)$/.test(m[1].data.variant)}catch(e){return false}});return x&&x.id});
const soft=await draw(softId,{words:'',overlay:'none',textColor:'dark',panel:'none'});
const onPic=await draw(softId);ok('cards tuck up under a hero that carries its words on the picture (it fades into the page)',onPic.tucked,JSON.stringify({tucked:onPic.tucked,next:onPic.nextTop,photo:onPic.photoB}));
ok('cards may still tuck up under a hero whose picture fades out',/^(right|left|full)$/.test(soft.layout)&&soft.tucked,JSON.stringify({id:softId,l:soft.layout,tucked:soft.tucked}));
// room to spare
for(const id of ['kb-gl-share-secure-file-sharing','kb-enterprise-sas-thai-localization-spotlight','kb-gl-western-digital-spotlight']){const g=await draw(id);
 const big=Math.max(...g.gaps);ok(id+': the hero takes its share of the spare room',g.grow&&g.heroH>=300,'hero '+g.heroH+' px');
 ok(id+': no single hole takes the page',big<=Math.round(g.pageH*0.2),'largest gap '+big+' px of '+g.pageH)}
const full=await draw('legal-accelerated-doj-second-request');
ok('a full page is left alone (no page runs past its sheet)',full.over<=1,JSON.stringify({over:full.over,hero:full.heroH}));
ok('no page errors',errs.length===0,errs.join(' | ').slice(0,200));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
