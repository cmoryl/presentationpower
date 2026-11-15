// Library conversions follow the curated designs: untouched ones are re-laid, edited / in-review ones are left alone.
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:1000}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1000);
await p.click('text=Open the example project');await p.waitForTimeout(1300);
const pid=(await p.evaluate(()=>location.hash)).match(/p=([a-z0-9]+)/)[1];
const piece=await p.evaluate(()=>{const pc=__T.ELIB.find(x=>x.kind==='case-study'&&x.heroFile&&(x.stats||[]).length>=2);return {id:pc.id,kind:pc.kind,title:pc.title}});
await p.evaluate(([pid,piece])=>{const d=JSON.parse(localStorage.getItem('mockdb'));const hero=()=>({id:Math.random().toString(36).slice(2,10),type:'hero',data:Object.assign(__T.MODULES.hero.def(),{title:'OLD LAYOUT',photo:{elib:__T.ELIB.find(x=>x.id===piece.id).heroFile,fx:11,fy:22,zoom:130}})});
 const base=(over)=>Object.assign({name:piece.title,layout:'Client Case Study',lang:'en',look:'spectrum',modules:[hero()],tight:0,status:'draft',formats:['letter'],exported:{},review:{},rebuiltFrom:piece,contentAt:1,contentTab:'curated',createdAt:1,createdBy:'u_test000000000000000001',updatedAt:1,updatedBy:'u_test000000000000000001'},over);
 d['projects/'+pid+'/materials/curstale0001']=base({});
 d['projects/'+pid+'/materials/curedited001']=base({contentTab:'tab-someone',contentAt:600000});
 /* rebuilt before rebuilds were stamped and never touched: its words were written as it was made */
 d['projects/'+pid+'/materials/curlegacy001']=base({contentTab:'tab-maker',contentAt:900});
 /* a copy of an edited rebuild is stamped as new when it is made: it must never be laid over */
 d['projects/'+pid+'/materials/curcopy00001']=base({contentTab:'tab-maker',contentAt:900,copiedFrom:{pid:pid,mid:'curedited001'}});
 /* a language version made from a rebuild */
 d['projects/'+pid+'/materials/curlang00001']=base({source:'curstale0001',family:'curstale0001',lang:'de'});
 /* stamped when rebuilt (today's rebuilds): untouched, then edited */
 d['projects/'+pid+'/materials/curstamp0001']=base({contentTab:'tab-maker',contentAt:5,curatedAt:5,curV:2});
 d['projects/'+pid+'/materials/curstamp0002']=base({contentTab:'tab-maker',contentAt:700000,curatedAt:5,curV:2});
 d['projects/'+pid+'/materials/curchecked01']=base({contentTab:'tab-maker',contentAt:900,checkedAt:950});
 d['projects/'+pid+'/materials/curreview001']=base({status:'review'});
 d['projects/'+pid+'/materials/curfresh0001']=base({curV:99});
 localStorage.setItem('mockdb',JSON.stringify(d))},[pid,piece]);
await p.reload();await p.waitForTimeout(1500);
if(await p.isVisible('.edbar >> text=Board').catch(()=>false))await p.click('.edbar >> text=Board');
if(!(await p.evaluate(()=>__T.S().view==='project'))){await p.evaluate(pid=>__T.go('project',pid,null),pid)}
await p.waitForTimeout(5000);
const d=await p.evaluate(()=>JSON.parse(localStorage.getItem('mockdb')));const g=k=>d['projects/'+pid+'/materials/'+k];
const st=g('curstale0001');
ok('an untouched conversion is laid out again on the curated designs',st.modules.length>3&&st.curV>=2&&st.contentTab==='curated'&&!JSON.stringify(st.modules).includes('OLD LAYOUT'),st.modules.length+' modules, curV '+st.curV);
const h=st.modules.find(m=>m.type==='hero');ok('the picture framing a person set is kept',h&&h.data.photo&&h.data.photo.fx===11&&h.data.photo.zoom===130,JSON.stringify(h&&h.data.photo).slice(0,80));
ok('its page fits the sheet',await p.evaluate(m=>{const f=__T.fmtById('letter');return __T.withStyle({look:'spectrum'},()=>Math.max(...__T.pageParts(JSON.parse(JSON.stringify(m.modules))).map(pt=>__T.measureAt(pt,f,m.tight||0))))<=f.h+1},st));
ok('a conversion someone edited is left alone',JSON.stringify(g('curedited001').modules).includes('OLD LAYOUT')&&!g('curedited001').curV);
const kept=k=>JSON.stringify(g(k).modules).includes('OLD LAYOUT');
ok('an untouched rebuild from before rebuilds were stamped is laid out again',!kept('curlegacy001')&&g('curlegacy001').contentTab==='curated');
ok('a copy of a rebuild is left alone (it carries the edits of the one it was made from)',kept('curcopy00001'));
ok('a language version of a rebuild is left alone',kept('curlang00001'));
ok('a stamped rebuild nobody touched is laid out again',!kept('curstamp0001'));
ok('a stamped rebuild someone edited is left alone',kept('curstamp0002'));
ok('a rebuild someone checked is left alone',kept('curchecked01'));
ok('a conversion in review is left alone',JSON.stringify(g('curreview001').modules).includes('OLD LAYOUT'));
ok('one already on the current designs is not rewritten',JSON.stringify(g('curfresh0001').modules).includes('OLD LAYOUT')&&g('curfresh0001').curV===99);
ok('no page errors',errs.length===0,errs.join(' | '));
R.forEach(x=>console.log(x));await b.close();process.exit(R.some(x=>x.startsWith('FAIL'))?1:0)})();
