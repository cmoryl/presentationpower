import { packById, packCssVars } from "../src/lib/style-packs";
const p = packById("skin-s01")!;
console.log(p.id, JSON.stringify(p.type, null, 1));
const v = packCssVars(p) as Record<string,string>;
for (const [k,val] of Object.entries(v)) if (/display|body|emphasis|kicker|mono/.test(k)) console.log(k, "=", val);
