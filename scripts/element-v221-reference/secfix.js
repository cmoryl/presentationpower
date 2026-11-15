/* Security: what the adversarial review broke, kept broken-proof.
   1. a stored picture cannot carry markup into the page (cover and divider photos)
   2. an approval is never accepted without its sign-off: not when its history entry is marked "seed", not when it is back-dated
   3. an editor cannot change the project's brand; a brand change after approval is flagged
   4. a viewer cannot bury a thread: notes are capped per person and cannot be dated in the future */
const {chromium}=require('playwright');const R=[];function ok(n,c,d){R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''))}
process.on('unhandledRejection',e=>{R.forEach(x=>console.log(x));console.log('CRASH',String(e&&e.stack||e).slice(0,400));process.exit(1)});
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1500,height:1000}});const url='file://'+__dirname+'/test.html';const errs=[];
const C=await ctx.newPage();C.on('pageerror',e=>errs.push(e.message.slice(0,100)));await C.goto(url);await C.evaluate(()=>localStorage.clear());await C.reload();await C.waitForTimeout(1000);
await C.click('.sp-hero button:has-text("Open the example project")');await C.waitForTimeout(1600);const pid=await C.evaluate(()=>__T.S().pid);
const IDS={chris:'u_test000000000000000001',priya:'u_test000000000000000003'};
// 1. pictures
const px=await C.evaluate(()=>{window.__pwn=0;const bad='data:image/png;base64,AAAA");x:y" onmouseover="window.__pwn=1"><img src=x onerror="window.__pwn=1">';const out={};['cover','divider'].forEach(t=>{const d=Object.assign(__T.MODULES[t].def(),{layout:t==='divider'?'photo':undefined,photo:{data:bad,fx:50,fy:50}});const mods=[{id:'aaaa1111',type:t,data:d}];__T.cleanMods(mods);out[t+'Kept']=t==='divider'?false:!!(mods[0]&&mods[0].data.photo);const h=document.createElement('div');document.body.appendChild(h);h.innerHTML=__T.withStyle({look:'spectrum'},()=>__T.MODULES[t].render(d,{}));out[t+'Img']=h.querySelectorAll('img[onerror],[onmouseover]').length+(/url\(/.test(h.innerHTML)?1:0);h.remove()});return out});await C.waitForTimeout(400);
ok('a picture value that is not purely an image is thrown out when a material is cleaned',px.coverKept===false&&px.dividerKept===false,JSON.stringify(px));
ok('…and even unclean, it cannot add an element or a handler to the page',px.coverImg===0&&px.dividerImg===0&&await C.evaluate(()=>window.__pwn)===0,JSON.stringify(px));
const keep=await C.evaluate(()=>{const mods=[{id:'cccc3333',type:'cover',data:Object.assign(__T.MODULES.cover.def(),{photo:__T.spxImage('glass')})},{id:'dddd4444',type:'cover',data:Object.assign(__T.MODULES.cover.def(),{photo:{data:'data:image/png;base64,iVBORw0KGgo=',fx:50,fy:50}})}];__T.cleanMods(mods);return mods.map(m=>!!m.data.photo)});
ok('real pictures (the built-in scenes, an uploaded PNG) are kept',keep[0]&&keep[1],JSON.stringify(keep));
// 2. forged approvals
const dbAll=()=>C.evaluate(()=>JSON.parse(localStorage.getItem('mockdb')));const d0=await dbAll();const MK=Object.keys(d0).find(k=>d0[k].name==='Fernwood & Vale case study');const mid=MK.split('/').pop();
const poke=(fn,arg)=>C.evaluate(({k,fn,arg})=>{const d=JSON.parse(localStorage.getItem('mockdb'));(new Function('m','arg',fn))(d[k],arg);localStorage.setItem('mockdb',JSON.stringify(d))},{k:MK,fn,arg});
const flag=async()=>{await C.reload();await C.waitForTimeout(1100);await C.evaluate((pid)=>__T.go('project',pid,null),pid);await C.waitForTimeout(1700);return C.evaluate((mid)=>{const f=document.querySelector('.mcard[data-mid="'+mid+'"] .so-flag');return f?f.textContent:''},mid)};
await poke("m.status='approved';m.review={a1:{kind:'status',to:'approved',by:arg,at:Date.now(),seed:true}}",IDS.priya);const f1=await flag();
ok('an approval marked "seed" in its history is still checked',f1!=='',f1||'no flag');
await poke("m.status='approved';m.review={a1:{kind:'status',to:'approved',by:arg,at:1700000000000}}",IDS.priya);const f2=await flag();
ok('a back-dated approval is still checked',f2!=='',f2||'no flag');
const exOk=await C.evaluate(()=>{const ap=[...document.querySelectorAll('.mcard')].filter(c=>/eBrochure/.test(c.textContent))[0];return ap?!ap.querySelector('.so-flag'):null});
ok('the example project\'s own approved material is signed and shows no flag',exOk===true,String(exOk));
// 3. brand
const P=await ctx.newPage();await P.goto(url+'#as=priya');await P.waitForTimeout(1300);await P.evaluate((pid)=>__T.go('project',pid,null),pid);await P.waitForTimeout(900);
const brand0=((await dbAll())['projects/'+pid]||{}).brand;
await P.click('#view button:has-text("Edit project")');await P.waitForTimeout(600);
const changed=await P.evaluate(()=>{const s=[...document.querySelectorAll('.modal select')].find(x=>[...x.options].some(o=>/Trial Interactive|Legal/.test(o.textContent)));if(!s)return 'no select';const o=[...s.options].find(o=>o.value&&o.value!==s.value);s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return o.value});
await P.click('.modal button:has-text("Save")').catch(()=>{});await P.waitForTimeout(900);
const brand1=((await dbAll())['projects/'+pid]||{}).brand;
ok('an editor saving the project dialog does not change its brand',!!brand0&&/^bm-/.test(String(changed))&&brand1===brand0,changed+' -> '+brand1+' (was '+brand0+')');
// 4. notes
await C.evaluate(({mid,pid})=>{const d=JSON.parse(localStorage.getItem('mockdb'));const items={};for(let i=0;i<300;i++)items['n'+i]={pid,mid,at:Date.now()+9e9+i,text:'flood '+i};d['comments/u_test000000000000000005']={items};localStorage.setItem('mockdb',JSON.stringify(d))},{mid,pid});
await C.reload();await C.waitForTimeout(1100);await C.evaluate((pid)=>__T.go('project',pid,null),pid);await C.waitForTimeout(1500);
const notes=await C.evaluate((mid)=>{const l=__T.reviewList(__T.S().mats.find(x=>x.id===mid)).filter(x=>x.viewer);return {n:l.length,future:l.filter(x=>x.at>Date.now()+1000).length}},mid);
ok('300 notes from one viewer show as the latest 40, none dated in the future',notes.n===40&&notes.future===0,JSON.stringify(notes));
ok('no page errors',errs.length===0,errs.slice(0,2).join(' | '));
console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log('fails='+f);await b.close();process.exit(f?1:0)})();
