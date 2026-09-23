import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
import { qeiiPlanSvg } from "@/lib/next-london-qeii-plan";

it("render", () => {
  const f = QEII_FLOOR_VECTORS.find((v) => v.id === "first")!;
  const svg = qeiiPlanSvg(f, { face: "studio", roomColours: { Pickwick: "#A6FA87", "Churchill Gallery": "#C2A3FF" } });
  writeFileSync("/tmp/browser/first.svg", svg);
  console.log("green count", (svg.match(/#A6FA87/gi) ?? []).length, "lav", (svg.match(/#C2A3FF/gi) ?? []).length);
});
