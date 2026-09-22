import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiRepeatedSymbolShapes } from "@/lib/next-london-qeii-symbols";
const f = qeiiFloorVector("third")!;
const drop = qeiiRepeatedSymbolShapes(f);
function box(d:string){const n=d.match(/-?\d+(\.\d+)?/g)!.map(Number);const xs:number[]=[],ys:number[]=[];n.forEach((v,i)=>i%2?ys.push(v):xs.push(v));return{x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys)};}
const kept = f.shapes.map((s,i)=>({s,i,b:box(s.d)})).filter(x=>!drop.has(x.i));
kept.forEach(({s,i,b})=>{const w=b.x1-b.x0,h=b.y1-b.y0;const size=Math.max(w,h);
 if(size<=60) console.log(i,s.stroke?"stroke "+s.stroke:"fill "+s.fill,"w",w.toFixed(1),"h",h.toFixed(1),"at",b.x0.toFixed(0),b.y0.toFixed(0),"pts",(s.d.match(/[MLC]/g)||[]).length);});
console.log("kept",kept.length);
console.log("--- dark kept ---");
kept.filter(x=>x.s.fill?.toLowerCase()==="#251b5b").forEach(({s,i,b})=>console.log(i,"w",(b.x1-b.x0).toFixed(1),"h",(b.y1-b.y0).toFixed(1),"at",b.x0.toFixed(0),b.y0.toFixed(0),"pts",(s.d.match(/[MLC]/g)||[]).length));
console.log("--- wiggly small (span<=60, pts>=20) ---");
kept.filter(x=>{const sp=Math.max(x.b.x1-x.b.x0,x.b.y1-x.b.y0);return sp<=60 && (x.s.d.match(/[MLC]/g)||[]).length>=20;}).forEach(x=>console.log(x.i,x.s.fill||x.s.stroke,(x.b.x1-x.b.x0).toFixed(0)+"x"+(x.b.y1-x.b.y0).toFixed(0),"at",x.b.x0.toFixed(0),x.b.y0.toFixed(0)));
