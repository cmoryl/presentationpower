import { MODULE_VARIANTS } from "../src/lib/taxonomy";
const ids = MODULE_VARIANTS.map((v) => v.id);
console.log("total", ids.length);
for (const n of [67, 68, 80, 98, 150]) console.log(n, ids[n - 1]);
