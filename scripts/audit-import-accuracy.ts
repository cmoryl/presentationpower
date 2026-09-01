import { readFileSync } from "node:fs";
import { parsePptxBuffer } from "../src/lib/pptx-import";
import { mapParsedSlide } from "../src/lib/pptx-mapping";
import { baselineReinterpretation } from "../src/lib/reinterpret-plan";
import { scoreSlideAccuracy, scoreDeckAccuracy } from "../src/lib/reinterpret-accuracy";
import { buildSlideEvidence } from "../src/lib/reinterpret-evidence";

const file = process.argv[2];
const buf = readFileSync(file);
const parsed = await parsePptxBuffer(buf, file.split("/").pop()!);
console.log("slides parsed:", parsed.slides.length);
const mapped = parsed.slides.map((s) => mapParsedSlide(s, parsed.slides.length));
let ev = 0;
for (const m of mapped) { try { const e = buildSlideEvidence(m.source as any); ev += e ? 1 : 0; } catch (err) { console.log("evidence fail", m.source.index, (err as Error).message); } }
console.log("deep-read evidence built:", ev, "/", mapped.length);
const designed = baselineReinterpretation(mapped);
const roll = scoreDeckAccuracy(designed);
console.log("deck accuracy:", roll);
const drops: any[] = [];
for (const s of designed) {
  const a = scoreSlideAccuracy(s);
  if (a.missing.length) drops.push({ i: s.source.index + 1, score: a.score, band: a.band, variant: s.variantId, cont: s.continuations?.length ?? 0, missing: a.missing.slice(0, 4) });
}
console.log("slides still dropping lines:", drops.length);
console.log(JSON.stringify(drops, null, 1));

const low = designed.map((s) => ({ s, a: scoreSlideAccuracy(s) })).filter((x) => x.a.band !== "high");
console.log("\n--- non-high slides:", low.length);
for (const { s, a } of low) {
  console.log(`#${s.source.index + 1} ${a.score} ${s.variantId} :: ` + a.facets.map((f) => `${f.id}=${Math.round(f.score * 100)}`).join(" ") + (a.missing.length ? ` | missing ${a.missing.length}` : ""));
}
