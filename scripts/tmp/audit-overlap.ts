import { LONDON_PANELS } from "../../src/lib/next-london-signage";
import { londonBrandingPlan } from "../../src/lib/next-london-branding";
import { loadLondonSignageFace } from "../../src/lib/next-london-text-outline";

await loadLondonSignageFace();
let n = 0;
for (const p of LONDON_PANELS) {
  const b = londonBrandingPlan(p);
  const issues: string[] = [];
  const lx = b.logo.x, ly = b.logo.y, lw = b.logo.w, lh = b.logo.h;
  if (b.copy && !b.copyVertical && b.lockupOn) {
    const top = b.copyBaselineMm - b.copySizeMm;
    const bot = b.copyBaselineMm + b.copySizeMm * 0.25;
    const cx0 = b.copyCentreMm - b.copyRunMm / 2, cx1 = b.copyCentreMm + b.copyRunMm / 2;
    if (top < ly + lh && bot > ly && cx1 > lx && cx0 < lx + lw) issues.push(`copy×lockup gap=${(top - (ly + lh)).toFixed(1)}mm`);
    if (b.copyRunMm > p.trimW) issues.push(`copy run ${b.copyRunMm.toFixed(0)} > trim ${p.trimW}`);
  }
  if (b.sub && b.copy && !b.copyVertical) {
    if (b.subBaselineMm - b.subSizeMm < b.copyBaselineMm + 0.1) issues.push("sub×copy");
  }
  if (b.qr && b.lockupOn) {
    const q = b.qr;
    if (q.y < ly + lh && q.y + q.size > ly && q.x < lx + lw && q.x + q.size > lx) issues.push("qr×lockup");
  }
  if (issues.length) { n++; console.log(`${p.id} ${p.name} :: ${issues.join(" | ")}`); }
}
console.log(`overlapping panels: ${n}/${LONDON_PANELS.length}`);
