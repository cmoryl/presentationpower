import { MODULE_VARIANTS } from "../src/lib/taxonomy";
import { sceneFromSeed } from "../src/lib/skin-backgrounds";
const counts: Record<string, number> = {};
const secs: string[] = [];
for (const v of MODULE_VARIANTS) {
  const s = sceneFromSeed(`${v.id} ${v.name} ${v.familyId}`);
  counts[s] = (counts[s] ?? 0) + 1;
  if (s === "section") secs.push(`${v.id} — ${v.name}`);
}
console.log(MODULE_VARIANTS.length, counts);
console.log(secs.slice(0, 40).join("\n"));
