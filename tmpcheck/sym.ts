import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiRepeatedSymbolShapes } from "../src/lib/next-london-qeii-symbols";
for (const f of QEII_FLOOR_VECTORS) console.log(f.id, f.shapes.length, "hidden", qeiiRepeatedSymbolShapes(f).size);
