// Get started (first screen) and breadcrumbs.
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e).slice(0,300));process.exit(1)});
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
const crumbs=()=>p.$$eval('#crumbs li',x=>x.map(e=>e.textContent.trim()));
const here=()=>p.$eval('#crumbs [aria-current=page]',e=>e.textContent.trim()).catch(()=>'');
/* first visit */
ok('a first visit opens Get started',await p.isVisible('.sp-hero h1'));
ok('it says what ELEMENT is in one sentence and one heading',(await p.textContent('.sp-h1')).includes('every size')&&await p.$$eval('h1',x=>x.filter(e=>!e.closest('[aria-hidden=true]')).length)===1);
ok('two actions in the hero: start, or look at an example',await p.isVisible('.sp-hero button:has-text("New project")')&&await p.isVisible('.sp-hero button:has-text("Open the example project")'));
ok('the hero shows one material in five sizes',await p.$$eval('.sp-stack .lp-fig',x=>x.length)===5);
const paths=await p.$$eval('.sp-path h3',x=>x.map(e=>e.textContent));
ok('four ways in, by what people came to do',paths.join('|')==='Make something new|Reuse earlier work|Review and approve|Look around first',paths.join('|'));
ok('each way in has a live fact',(await p.textContent('.sp-reuse .sp-meta')).match(/\d+ pieces/)&&/review/.test(await p.textContent('.sp-review .sp-meta')));
ok('how it works is three steps',await p.$$eval('.sp-steps>li',x=>x.length)===3);
ok('questions are answered in place',await p.$$eval('.sp-q',x=>x.length)>=5);
await p.click('.sp-q >> nth=0');ok('an answer opens on click',await p.isVisible('.sp-q[open] p'));
ok('nothing on Get started looks like the working page',await p.$$eval('.page, .mod',x=>x.length)===0);
ok('modules and sizes wait behind one disclosure',!(await p.$('.sp-deep .lp-mod')));
await p.click('.sp-deep summary');await p.waitForTimeout(400);
await p.evaluate(()=>document.querySelector('.sp-deep .lp-lib').scrollIntoView());await p.waitForTimeout(900);
ok('opened, every module and size is there',await p.$$eval('.sp-deep .lp-mod',x=>x.length)>=20&&await p.$$eval('.sp-deep .lp-kit li',x=>x.length)===22); // 14 single-frame sizes + 8 sequences (99p-sequences.js)
ok('Get started is named in the header and marked current',(await p.textContent('.nav-ov'))==='Get started'&&await p.getAttribute('.nav-ov','aria-current')==='page');
ok('the breadcrumb says where you are',(await here())==='Get started');
/* paths go where they say */
await p.evaluate(()=>window.scrollTo(0,0));
await p.click('.sp-path [data-path="reuse"]');await p.waitForTimeout(800);
ok('Reuse earlier work opens the Library',await p.evaluate(()=>__T.S().view)==='library');
ok('library breadcrumb',(await crumbs()).join('>')==='Library');
await p.click('.el-folder:has-text("Legal")').catch(()=>{});await p.waitForTimeout(300);await p.click('.el-card >> nth=0');await p.waitForTimeout(400);
const lc=await crumbs();ok('library breadcrumb follows the brand and the piece',lc.length===3&&lc[0]==='Library',lc.join(' > '));
await p.click('#crumbs button:has-text("Library")');await p.waitForTimeout(400);
ok('a breadcrumb step goes back to that place',(await crumbs()).length===1&&await p.evaluate(()=>__T.S().elFolder)==='all');
/* after a first visit, Projects is home */
await p.click('.nav-ov');await p.waitForTimeout(500);await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);
const pc=await crumbs();ok('project breadcrumb: Projects, the project, the tab',pc.length===3&&pc[0]==='Projects'&&/Board$/.test(pc[2]),pc.join(' > '));
ok('the project carries its brand in the trail',!!(await p.$('#crumbs .bc-brand')));
await p.reload();await p.waitForTimeout(1500);
ok('next visit goes straight to work, not Get started',!(await p.$('.sp-hero')));
await p.click('#logoBtn');await p.waitForTimeout(700);
ok('the ELEMENT logo opens Get started',await p.isVisible('.sp-hero'));
await p.evaluate(()=>__T.go('home',null,null));await p.waitForTimeout(500);await p.reload();await p.waitForTimeout(1500);
ok('Get started is the index page: opening ELEMENT from the projects list lands there',await p.isVisible('.sp-hero'));
/* editor trail */
await p.evaluate(()=>__T.go('home',null,null));await p.waitForTimeout(600);
await p.click('.prow >> nth=0').catch(async()=>{await p.click('text=Example: Fernwood & Vale spring launch')});await p.waitForTimeout(1200);
await p.click('.mcard >> nth=0');await p.waitForTimeout(1500);
let ec=await crumbs();ok('editor breadcrumb: project, material with its stage, size',ec.length===4&&/US Letter$/.test(ec[3])&&!!(await p.$('#crumbs .bc-stage')),ec.join(' > '));
await p.click('#stage .mod >> nth=1');await p.waitForTimeout(500);
ec=await crumbs();ok('selecting a module adds it to the trail',ec.length===5&&(await here())===ec[4],ec.join(' > '));
await p.click('#crumbs button.bc-a >> nth=2');await p.waitForTimeout(400);
ok('the material step deselects the module',await p.evaluate(()=>!__T.S().sel)&&(await crumbs()).length===4);
await p.click('#crumbs button:has-text("Projects")');await p.waitForTimeout(600);
ok('Projects step returns to the list',await p.isVisible('h1:text-is("Projects")'));
await p.click('.filters button:has-text("Needs review")');await p.waitForTimeout(300);
ok('a filter shows in the trail',(await crumbs()).join('>')==='Projects>Needs review');
/* phone */
await p.setViewportSize({width:390,height:844});
await p.evaluate(()=>__T.go('home',null,null));await p.waitForTimeout(400);await p.click('text=Example: Fernwood & Vale spring launch').catch(()=>{});await p.waitForTimeout(1000);await p.click('.mcard >> nth=0');await p.waitForTimeout(1200);
await p.click('#stage .mod >> nth=1').catch(()=>{});await p.waitForTimeout(400);
ok('on a phone the middle steps fold into …',!!(await p.$('#crumbs .bc-more')));
await p.click('#crumbs .bc-more');await p.waitForTimeout(200);
ok('… opens them',!(await p.$('#crumbs .bc-more')));
await p.click('.nav-ov').catch(()=>{});await p.waitForTimeout(700);
ok('no sideways scroll on a phone',await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),await p.evaluate(()=>document.documentElement.scrollWidth));
await p.screenshot({path:__dirname+'/../journey/lp-phone.png'});
ok('no page errors',!errs.length,errs.join(' | ').slice(0,300));
R.forEach(x=>console.log(x));console.log(R.some(x=>x.startsWith('FAIL'))?'':'no errors');await b.close()})();
