import { ALL_STYLE_PACKS } from "../src/lib/style-packs";
import { dashLook } from "../src/lib/dash-look";
const ids = ["MV-DASH-DONUT-TRIO","MV-DASH-GAUGE-ROW","MV-DASH-SALES-CHART","MV-DASH-SUMMARY"];
const seen = new Set<string>();
for (const p of ALL_STYLE_PACKS.slice(0,8)) {
  console.log(p.id, ids.map(i=>{const d=dashLook(p,i); return `${i.replace("MV-DASH-","")}:${d.flow}/${d.chart}`}).join("  "));
}
for (const p of ALL_STYLE_PACKS) seen.add(ids.map(i=>{const d=dashLook(p,i);return d.flow+d.chart}).join("|"));
console.log("packs", ALL_STYLE_PACKS.length, "distinct signatures", seen.size);
