const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1300,height:1000}});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+__dirname+'/test.html');await p.evaluate(()=>localStorage.clear());await p.reload();await p.waitForTimeout(1500);
await p.click('.sp-hero button:has-text("Open the example project")');await p.waitForTimeout(1500);await p.click('button:has-text("New material")');await p.waitForTimeout(800);await p.keyboard.type('Aud');await p.click('.modal .btn.primary');await p.waitForTimeout(2000);
const layouts=(process.argv[2]||'text,right,left,fade,full').split(',');const img=process.argv[3]||'city';
for(const L of layouts){await p.evaluate(([L,img])=>{const m=__T.mat();m.look='spectrum';const h=m.modules.find(x=>x.type==='hero').data;h.layout=L;h.chip='';h.photo=__T.spxImage(img);__T.redraw()},[L,img]);await p.waitForTimeout(900);
const el=await p.$('.page .m-hero');await el.scrollIntoViewIfNeeded();await el.screenshot({path:`/tmp/a_${L}.png`})}
await b.close()})();
