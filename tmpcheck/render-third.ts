import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "../src/lib/next-london-qeii-plan";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "third")!;
await Bun.write("/tmp/third.svg", qeiiPlanSvg(f, { roomColours: { "West Room": "#FFEB66", Whittle: "#EC388A", Fleming: "#A6FA87" } }));
