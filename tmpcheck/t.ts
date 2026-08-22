import { stylePackById, ALL_STYLE_PACKS } from "../src/lib/style-packs";
console.log(ALL_STYLE_PACKS.filter(p=>/r2[0-4]/i.test(p.id)).map(p=>p.id));
const p = stylePackById("skin-r22");
console.log(!!p, p?.id);
for (const s of ["cover","stats","chart","closing","timeline"]) console.log(s, JSON.stringify(p?.ground(`scene:${s} lp-x`)).slice(0,320));
