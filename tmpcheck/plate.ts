import { APPROVED_STYLE_PACKS, packLayoutLayers } from "../src/lib/style-packs";
for (const p of APPROVED_STYLE_PACKS.slice(0, 4)) {
  const l = packLayoutLayers(p, "editorial", "MV-BENTO-6");
  console.log(p.id, l.length, l.join(" | ").slice(0, 140));
}
