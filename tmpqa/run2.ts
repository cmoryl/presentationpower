import { auditSvg, auditAi, rollup } from "../src/lib/london-signage-qa";
import { resolveLondonArtwork } from "../src/lib/next-london-revise";
import { LONDON_PANELS } from "../src/lib/next-london-signage";
import { loadLondonSignageFace } from "../src/lib/next-london-text-outline";
import asset from "../src/assets/next-london-signage-artwork.json.asset.json";
await loadLondonSignageFace();
const pack = await (await fetch("http://localhost:8080" + asset.url)).json();
const reports:any[] = [];
for (const p of LONDON_PANELS) {
  const art = resolveLondonArtwork(p, pack as any, {});
  reports.push(auditSvg(p, art.svg), auditAi(p, art.ai));
}
console.log(JSON.stringify(rollup(reports)));
for (const r of reports) for (const c of r.checks) if (c.status==="fail") console.log("FAIL", r.file, r.kind, c.id, "| expected:", c.expected, "| got:", c.actual);
const w:Record<string,number>={};
for (const r of reports) for (const c of r.checks) if (c.status==="warn") w[c.id]=(w[c.id]??0)+1;
console.log(w);
