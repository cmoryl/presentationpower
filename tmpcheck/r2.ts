import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "../src/lib/next-london-qeii-plan";
const f = QEII_FLOOR_VECTORS.find((v) => v.id === "second")!;
await Bun.write("/tmp/second.svg", qeiiPlanSvg(f, { roomColours: { Victoria: "#FFEB66", Albert: "#EC388A", Redgrave:"#A6FA87", Burton:"#FF9B70", Olivier:"#C2A3FF", Gielgud:"#A1FBF9" } }));
