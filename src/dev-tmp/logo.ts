import { pillarDivision } from "../lib/next-pillar-masters";
const d = pillarDivision("city-series");
console.log(d.whiteUrl, d.colorUrl, d.ratio);
const t = await (await fetch(d.whiteUrl)).text();
console.log(t.length);
console.log(t.slice(0, 1200));
console.log("tags:", [...t.matchAll(/<([a-z]+)/g)].map(m=>m[1]).reduce((a:any,k)=>(a[k]=(a[k]||0)+1,a),{}));
