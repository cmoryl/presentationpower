import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRings, qeiiRingArea, qeiiRingBox } from "../src/lib/next-london-qeii-geometry";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "third")!;
console.log("shapes", f.shapes.length, "stroked", f.shapes.filter(s=>s.stroke).length, "filled", f.shapes.filter(s=>s.fill).length);
const b = f.shapes[141]!;
console.log("shape141", b.fill, b.stroke, b.d.slice(0,200));
console.log("rings", qeiiRings(b.d).map(r=>({a:Math.round(qeiiRingArea(r)),box:qeiiRingBox(r)})));
