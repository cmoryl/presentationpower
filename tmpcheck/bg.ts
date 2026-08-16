import { DESIGN_SKINS } from "../src/lib/design-skins";
import { stylePackFromSkin } from "../src/lib/design-skin-pack";
import { packField, packGroundPaint, packLayoutLayers, minimalPackLayers } from "../src/lib/style-packs";
import { packGroundDamp } from "../src/lib/pack-readability";
import { SKIN_SCENES } from "../src/lib/skin-backgrounds";
const picks = DESIGN_SKINS.slice(0, 12);
let cells = "";
for (const skin of picks) {
  const pack = stylePackFromSkin(skin);
  for (const scene of ["cover", "data", "process"]) {
    const seed = scene;
    cells += `<div class="cell"><div class="sheet" style="background-color:${packField(pack)}">
      <div class="pl" style="background:${packGroundPaint(pack, seed).join(", ")};opacity:${packGroundDamp(pack, seed)}"></div>
      <div class="pl" style="background:${minimalPackLayers(packLayoutLayers(pack, "editorial", seed)).join(", ")}"></div>
      </div><div class="cap">${skin.code} · ${scene}</div></div>`;
  }
}
const html = `<html><head><style>body{margin:0;background:#111;font:11px system-ui;color:#bbb;padding:16px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.sheet{position:relative;aspect-ratio:16/9;overflow:hidden}
.pl{position:absolute;inset:0}.cap{padding:4px 0}</style></head><body><div class="grid">${cells}</div></body></html>`;
await Bun.write("/tmp/browser/skins/bg.html", html);
console.log("scenes", SKIN_SCENES.join(","));
