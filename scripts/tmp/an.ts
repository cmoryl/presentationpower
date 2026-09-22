import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiTracedSymbolShapes } from "@/lib/next-london-qeii-symbols";
const f = qeiiFloorVector("third")!;
const drop = qeiiTracedSymbolShapes(f);
function box(d:string){const n=d.match(/-?\d+(\.\d+)?/g)!.map(Number);const xs:number[]=[],ys:number[]=[];n.forEach((v,i)=>i%2?ys.push(v):xs.push(v));return{x0:Math.min(...xs),y0:Math.min(...ys),x1:Math.max(...xs),y1:Math.max(...ys)};}
let small=0;
f.shapes.forEach((s,i)=>{ if(drop.has(i))return; const b=box(s.d); const w=b.x1-b.x0,h=b.y1-b.y0; const size=Math.max(w,h);
 if(size<=26){ small++; if(small<40) console.log(i, s.stroke?"stroke":"fill", s.fill, s.stroke, "w",w.toFixed(1),"h",h.toFixed(1),"at",b.x0.toFixed(0),b.y0.toFixed(0), "pts", (s.d.match(/[MLC]/g)||[]).length); } });
console.log("total shapes",f.shapes.length,"dropped",drop.size,"remaining small",small, "sheet",f.w,f.h);
