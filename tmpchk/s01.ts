import { packById } from "../src/lib/style-packs";
const p = packById("skin-s01")!;
console.log(p.id, p.name, JSON.stringify(p.type, null, 1));
