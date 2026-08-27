import { stylePackById, resolvedPack } from "../src/lib/style-packs";
for (const id of ["skin-s01"]) {
  const p = resolvedPack(stylePackById(id)!);
  console.log(id, p.name, JSON.stringify(p.type, null, 1));
}
