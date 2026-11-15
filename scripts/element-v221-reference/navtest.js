const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
const nav=()=>p.evaluate(()=>[...document.querySelectorAll('#appnav button')].map(b=>(b.querySelector('.nav-t')||b).textContent+(b.getAttribute('aria-current')==='page'?'*':'')).join('|'));
const crumbs=()=>p.evaluate(()=>[...document.querySelectorAll('#crumbs .bc-t')].map(x=>x.textContent).join(' › '));
const view=()=>p.evaluate(()=>__T.S().view);
ok('header has the seven sections in order',(await nav()).replace(/\*/g,'')==='Get started|Agent|Projects|Library|Modules|Templates|Help',await nav());
const seen={};
for(const [cls,v,name] of [['.nav-proj','home','Projects'],['.nav-lib','library','Library'],['.nav-mx','modules','Modules'],['.nav-spx','spectrum','Templates'],['.nav-help','help','Help'],['.nav-ov','about','Get started']]){
 await p.click('#appnav '+cls);await p.waitForTimeout(700);const n=await nav();const c=await crumbs();
 seen[name]=(await view())===v&&n.split('|').filter(x=>x.endsWith('*')).length===1&&n.includes(name+'*')&&c.startsWith(name);
 ok(name+' opens from the header, is the one marked current, and starts the breadcrumb',seen[name],n+' / '+c+' / '+(await view()));}
// a project and a material count as Projects
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
ok('inside a project, Projects is the current section',(await nav()).includes('Projects*'),await nav());
await p.evaluate(()=>{const S=__T.S();__T.go('editor',S.pid,S.mats[0].id)});await p.waitForTimeout(1500);
ok('in the editor, Projects is the current section',(await nav()).includes('Projects*'),await nav());
await p.click('#appnav .nav-help');await p.waitForTimeout(700);
ok('Help offers the way back to the material',/Back to /.test(await p.textContent('#view'))&&!(/Back to Projects/.test(await p.textContent('#view'))));
await p.goBack();await p.waitForTimeout(1200);ok('browser Back from Help returns to the editor',(await view())==='editor');
// library: Back steps through folder and piece
await p.click('#appnav .nav-lib');await p.waitForTimeout(800);await p.click('.el-folder >> nth=2');await p.waitForTimeout(400);
const folder=await crumbs();await p.click('.el-card >> nth=0');await p.waitForTimeout(500);const piece=await crumbs();
await p.goBack();await p.waitForTimeout(700);ok('Back from a Library piece returns to its folder',(await crumbs())===folder,folder+' vs '+(await crumbs()));
await p.goBack();await p.waitForTimeout(700);ok('Back again returns to the whole Library',(await crumbs())==='Library',await crumbs());
await p.goForward();await p.waitForTimeout(700);ok('Forward goes to the folder again',(await crumbs())===folder);
// clicking the current section goes to its top
await p.click('.el-card >> nth=0');await p.waitForTimeout(500);await p.click('#appnav .nav-lib');await p.waitForTimeout(600);
ok('clicking Library while in it goes to the top of the Library',(await crumbs())==='Library',await crumbs());
// reload keeps the section
await p.click('.el-folder >> nth=2');await p.waitForTimeout(400);await p.reload();await p.waitForTimeout(2000);
ok('a reload stays in the Library folder you were in',(await view())==='library'&&(await crumbs())===folder,(await view())+' '+(await crumbs()));
await p.click('#appnav .nav-mx');await p.waitForTimeout(600);await p.reload();await p.waitForTimeout(2000);
ok('a reload stays on Modules',(await view())==='modules');
await p.click('#logoBtn');await p.waitForTimeout(600);ok('the logo goes to Get started',(await view())==='about');
await p.setViewportSize({width:390,height:844});await p.waitForTimeout(500);
const fit=await p.evaluate(()=>{const n=document.querySelector('#appnav');return n.scrollWidth<=n.clientWidth+1&&document.documentElement.scrollWidth<=391});
ok('all five sections fit on a phone without scrolling sideways',fit);
ok('no script errors',!errs.length,errs.slice(0,2).join(' | '));
R.forEach(x=>console.log(x));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log(f?f+' FAILED':'ALL PASS');await b.close()})();
