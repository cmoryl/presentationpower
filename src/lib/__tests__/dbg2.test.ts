import { it } from "vitest";
import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { qeiiColourPaint } from "@/lib/next-london-qeii-rooms";
it("dbg", () => {
  const paint = qeiiColourPaint(qeiiFloorVector("second")!, { Victoria: "#FFEB66" });
  console.log(JSON.stringify(paint.cells.map((c) => [c.room, c.hex])));
});
