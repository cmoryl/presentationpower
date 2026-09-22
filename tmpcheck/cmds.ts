import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiStrokeRuns } from "../src/lib/next-london-qeii-cells";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "second")!;
const s = f.shapes[69]!;
console.log(new Set(s.d.match(/[A-Za-z]/g)));
const runs = qeiiStrokeRuns(s.d);
console.log("runs", runs.length, "pts", runs.reduce((a,r)=>a+r.length,0));
// runs crossing the Redgrave/Burton block
const near = runs.filter(r=>r.some(([x,y])=>x>232&&x<377&&y>428&&y<539));
console.log("near runs", near.length, near.slice(0,6).map(r=>r.map(p=>p.map(n=>+n.toFixed(1)).join(","))));
