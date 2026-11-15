const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:900}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(900);
await p.evaluate(()=>{window.__bl=[];const O=Blob;window.Blob=function(a,o){window.__bl.push([o&&o.type,(a[0]&&a[0].length)||0]);return new O(a,o)};window.Blob.prototype=O.prototype});
for(const k of ['teamtrio','stats','hero','pipeline']){const keys=await p.evaluate(()=>Object.keys(__T.MODULES||{}));if(k==='teamtrio'){console.log(keys.length)}}
const r=await p.evaluate(async()=>{const out=[];for(const k of Object.keys(__T.MODULES).filter(k=>k!=='pagebreak').slice(0,2)){try{window.__bl.length=0;await __T.spxlExportModule(k,0,'svg');const t=document.querySelector('.toast,#toast,[role=status]');out.push(k+':'+(window.__bl.filter(x=>x[0]==='image/svg+xml').map(x=>x[1]).join(','))+' '+(t?t.textContent.slice(0,160):''))}catch(e){out.push(k+' ERR '+e.message)}}return out});
console.log(r.join('\n'));console.log(errs.slice(0,3));await b.close()})();
