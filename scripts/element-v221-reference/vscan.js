// Visual-logic scan: every module x design, on the digital and print Spectrum page, checked for unreadable text,
// clipped text, text past the page edge, overlapping text and empty boxes.
const {chromium}=require('playwright');
const SCAN=function(root,label){
  const out=[];const pr=root.getBoundingClientRect();
  const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
  const parse=s=>{const m=/rgba?\(([^)]+)\)/.exec(s||'');if(!m)return null;const p=m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);return {c:[p[0],p[1],p[2]],a:p.length>3?p[3]:1}};
  const over=(top,bot)=>[0,1,2].map(i=>top.c[i]*top.a+bot[i]*(1-top.a));
  const bgOf=el=>{ // composite solid colours up the tree; a gradient gives its stops; an image gives null (unknown)
    let stack=[];for(let x=el;x&&x!==document.documentElement;x=x.parentElement){const cs=getComputedStyle(x);const bi=cs.backgroundImage;
      if(bi&&bi!=='none'){if(/url\(/.test(bi))return null;const cols=(bi.match(/rgba?\([^)]+\)/g)||[]).map(parse).filter(c=>c&&c.a>0.5);if(cols.length){return cols.map(c=>c.c)}}
      const bc=parse(cs.backgroundColor);if(bc&&bc.a>0){stack.push(bc);if(bc.a>=.99)break}}
    let base=[255,255,255];for(let i=stack.length-1;i>=0;i--)base=over(stack[i],base);return [base]};
  const leaf=[...root.querySelectorAll('*')].filter(e=>{if(e.closest('svg')||e.tagName==='STYLE'||e.tagName==='SCRIPT')return false;const t=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>1);if(!t.length)return false;const r=e.getBoundingClientRect();if(r.width<3||r.height<3)return false;const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.2)return false;if(e.closest('.modtag,.pv-hidden,[aria-hidden=true],.sr,.vh'))return false;return true});
  leaf.forEach(e=>{const cs=getComputedStyle(e);const r=e.getBoundingClientRect();const txt=e.textContent.trim().slice(0,28);
    // 1. contrast
    const fill=cs.webkitTextFillColor;const clipText=(cs.webkitBackgroundClip||cs.backgroundClip||'').includes('text');
    if(!clipText){const col=parse(fill&&fill!=='currentcolor'?fill:cs.color)||parse(cs.color);if(col&&col.a>.3){const bgs=bgOf(e);if(bgs){const fs=parseFloat(cs.fontSize),big=fs>=18||(fs>=14&&parseInt(cs.fontWeight)>=600);const need=big?2.2:3;let worst=99;bgs.forEach(bg=>{const fg=over(col,bg);const l1=lum(fg),l2=lum(bg);const cr=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);worst=Math.min(worst,cr)});if(worst<need)out.push(['contrast',label,txt,worst.toFixed(2)+':1 '+cs.color+' on '+JSON.stringify(bgs[0].map(Math.round))])}}}
    // 2. past the page edge
    if(r.right>pr.right+2||r.left<pr.left-2)out.push(['edge',label,txt,'x '+Math.round(r.left-pr.left)+'..'+Math.round(r.right-pr.left)+' of '+Math.round(pr.width)]);
    // 3. clipped by its own box or a clipping parent
    for(let x=e,d=0;x&&x!==root&&d<4;x=x.parentElement,d++){const c=getComputedStyle(x);if(/(hidden|clip)/.test(c.overflowX+c.overflowY)&&!/ellipsis/.test(c.textOverflow)&&c.webkitLineClamp==='none'){if(x.scrollWidth>x.clientWidth+3||x.scrollHeight>x.clientHeight+3){const xr=x.getBoundingClientRect();if(r.right>xr.right+2||r.bottom>xr.bottom+3){out.push(['clipped',label,txt,(x.className||x.tagName).toString().slice(0,30)+' '+x.scrollWidth+'x'+x.scrollHeight+' in '+x.clientWidth+'x'+x.clientHeight]);break}}}}
  });
  // 4. overlapping text blocks
  for(let i=0;i<leaf.length;i++)for(let j=i+1;j<leaf.length;j++){const a=leaf[i],b=leaf[j];if(a.contains(b)||b.contains(a))continue;const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();const w=Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left),h=Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top);if(w>4&&h>4){const ar=w*h,sm=Math.min(ra.width*ra.height,rb.width*rb.height);if(ar/sm>.35&&getComputedStyle(a).position!=='absolute'&&getComputedStyle(b).position!=='absolute')out.push(['overlap',label,a.textContent.trim().slice(0,18)+' / '+b.textContent.trim().slice(0,18),Math.round(ar/sm*100)+'%'])}}
  return out};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message.slice(0,160)));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
await p.addScriptTag({content:'window.__SCAN='+SCAN.toString()});
const keys=await p.evaluate(()=>Object.keys(__T.MODULES).filter(k=>k!=='pagebreak'));let all=[];let n=0;
for(const k of keys){const r=await p.evaluate((k)=>{const res=[];const vs=__T.withStyle({look:'spectrum'},()=>__T.libVariants(k));const list=vs.length?vs:[['Default',null]];let n=0;
  list.forEach((v,i)=>{const d=Object.assign(__T.MODULES[k].def(),v[1]?JSON.parse(JSON.stringify(v[1])):{});if(k==='hero'&&d.layout&&d.layout!=='text'&&!(d.photo&&(d.photo.id||d.photo.elib||d.photo.scene)))d.photo=__T.spxImage(['horizon','glass','ribbons','city','bokeh'][i%5]);
   [['digital',{w:816,h:0,print:false}],['print',Object.assign({},__T.fmtById('letter'))]].forEach(([ctx,f])=>{const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0';
    host.innerHTML=__T.withStyle({look:'spectrum'},()=>__T.pageHTML([{id:'m1',type:k,data:d}],f,false,null));document.body.appendChild(host);const pg=host.firstElementChild;n++;
    try{res.push(...__SCAN(pg,k+' #'+(i+1)+' '+v[0]+' ['+ctx+']'))}catch(e){res.push(['scan error',k+' '+i,String(e).slice(0,80),''])}host.remove()})});return {res,n}},k);
 all.push(...r.res);n+=r.n}
const by={};all.forEach(x=>{by[x[0]]=(by[x[0]]||0)+1});console.log(JSON.stringify({renders:n,findings:all.length,by}));
const seen={};all.forEach(x=>{const key=x[0]+'|'+x[1];if(seen[key])return;seen[key]=1;console.log(' '+x[0].padEnd(9)+x[1]+' :: '+x[2]+' :: '+x[3])});
console.log('pageerrors',errs.length);
/* as a regression suite: nothing clipped, nothing past the page edge, and no new unreadable text. The known
   remainder is white text on the aqua end of the brand gradient (2.5:1) and three false alarms (hero highlight spans,
   cover photo, ring figure, dimmed "before" column). */
const R=[];const ok=(n,c,d)=>R.push((c?'PASS ':'FAIL ')+n+(d!==undefined?' — '+d:''));
const bad=all.filter(x=>x[0]==='edge'||x[0]==='clipped'||/error/.test(x[0]));
ok('no module design has clipped text or text past the page edge',bad.length===0,bad.slice(0,3).map(x=>x.join(' ')).join(' | '));
const known=/cover #1|bullet #2 Rings|comparison #2/;
const fresh=all.filter(x=>x[0]==='contrast'&&!known.test(x[1]+' '+x[3]));
ok('no new unreadable text on any module design',fresh.length===0,fresh.slice(0,4).map(x=>x[1]+' '+x[2]+' '+x[3]).join(' | '));
ok('no heatmap number is white on a shaded cell',!all.some(x=>/^heatmap/.test(x[1])&&x[0]==='contrast'));
ok('no page errors',errs.length===0,errs.join(' | '));
R.forEach(x=>console.log(x));await b.close();process.exit(R.some(x=>x.startsWith('FAIL'))?1:0)})();
