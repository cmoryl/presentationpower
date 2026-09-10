import { auditSvg, auditAi, rollup } from "../src/lib/london-signage-qa";
import { buildLondonPanelSvg, buildLondonPanelAi } from "../src/lib/next-london-revise";
import { LONDON_PANELS } from "../src/lib/next-london-signage";
import { loadLondonSignageFace } from "../src/lib/next-london-text-outline";
await loadLondonSignageFace?.();
const reports:any[] = [];
for (const p of LONDON_PANELS) {
  reports.push(auditSvg(p, buildLondonPanelSvg(p)), auditAi(p, buildLondonPanelAi(p)));
}
console.log(JSON.stringify(rollup(reports)));
for (const r of reports) for (const c of r.checks) if (c.status==="fail") console.log("FAIL", r.file, r.kind, c.id, c.label, "expected", c.expected, "got", c.actual);
const warnIds: Record<string,number> = {};
for (const r of reports) for (const c of r.checks) if (c.status==="warn") warnIds[c.id]=(warnIds[c.id]??0)+1;
console.log(warnIds);
