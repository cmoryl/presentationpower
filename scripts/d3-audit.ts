import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";

const rec = (QEII_FLOOR_VECTORS as any)["3"] ?? (QEII_FLOOR_VECTORS as any)[3];
const lens: number[] = [];
for (const s of rec.shapes) {
  const nums = (s.d as string).match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  for (let i = 2; i + 1 < nums.length; i += 2) {
    lens.push(Math.hypot(nums[i] - nums[i - 2], nums[i + 1] - nums[i - 1]));
  }
}
lens.sort((a, b) => a - b);
const q = (p: number) => lens[Math.floor(lens.length * p)].toFixed(3);
console.log("segments", lens.length, "p10", q(0.1), "median", q(0.5), "p90", q(0.9), "max", lens.at(-1)?.toFixed(2));
console.log("under 0.5:", lens.filter((l) => l < 0.5).length, "under 1:", lens.filter((l) => l < 1).length);
