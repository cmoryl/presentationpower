import { test } from "vitest";
import { seedContent } from "@/lib/deck-store";
import { chartFrom } from "@/lib/cross-format-adapt";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
const numy = (v: unknown): boolean => Array.isArray(v) ? v.length>=2 && v.some(x=>typeof x==="number"||(x&&typeof x==="object"&&Object.values(x).some(y=>typeof y==="number"||Array.isArray(y)))) : !!v && typeof v==="object" && Object.values(v as any).some(numy);
test("c", () => {
  const miss: string[] = []; let hit=0;
  for (const v of MODULE_VARIANTS as any[]) { let c: any; try { c = seedContent(v.id, {} as any, ""); } catch { miss.push("SEEDFAIL "+v.id); continue; } if (chartFrom(c)) { hit++; continue; }
    const keys = Object.keys(c).filter(k=>numy(c[k])); if (keys.length) miss.push(v.id+":"+keys.map(k=>k+"="+String(JSON.stringify(c[k])).slice(0,110)).join(" | ")); }
  console.log("HIT",hit); console.log(miss.join("\n"));
});
