import { setLondonLogoPlacement } from "./lib/next-london-logo-placement";
import { LONDON_BOOTH_PANELS } from "./lib/next-london-signage";
import { loadLondonSignageFace } from "./lib/next-london-text-outline";
const mod = await import("./lib/next-london-revise");
await loadLondonSignageFace();
const p = LONDON_BOOTH_PANELS[0]!;
setLondonLogoPlacement(p.id, { text: "GLOBALLINK LIVE", sub: "Human-verified AI translation" });
const fns = Object.keys(mod).filter((k) => /svg|Svg|ai|Ai/.test(k));
console.log(fns.join(", "));
