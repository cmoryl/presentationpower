import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiRepeatedSymbolShapes } from "@/lib/next-london-qeii-symbols";
const f = qeiiFloorVector("third")!;
const drop = qeiiRepeatedSymbolShapes(f);
function box(d:string){const n=d.match(/-?\d+(\.\d+)?/g)!.map(Number);const xs:number[]=[],ys:number[]=[];n.forEach((v,i)=>i%2?ys.push(v):xs.push(v));return{x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys)};}
const kept = f.shapes.map((s,i)=>({s,i,b:box(s.d)})).filter(x=>!drop.has(x.i));
kept.forEach(({s,i,b})=>{const w=b.x1-b.x0,h=b.y1-b.y0;const size=Math.max(w,h);
 if(size<=60) console.log(i,s.stroke?"stroke "+s.stroke:"fill "+s.fill,"w",w.toFixed(1),"h",h.toFixed(1),"at",b.x0.toFixed(0),b.y0.toFixed(0),"pts",(s.d.match(/[MLC]/g)||[]).length);});
console.log("kept",kept.length);
