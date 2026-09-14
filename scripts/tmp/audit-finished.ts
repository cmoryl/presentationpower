import { LONDON_PANELS } from "../../src/lib/next-london-signage";
import { londonBrandingPlan } from "../../src/lib/next-london-branding";
import { setLondonLiveFiles } from "../../src/lib/next-london-live-files";
import { setLondonLiveLayers, setLondonLayerRebuilt } from "../../src/lib/next-london-live-layers";

const p = LONDON_PANELS.find((x) => x.id === "ldn-26")!;
setLondonLiveFiles([{ id: "a", panelId: p.id, version: 2, filename: "britten-p04.ai", note: null, issued: "2026-09-12", trimW: null, trimH: null, masterUrl: "https://x/a.ai", proofUrl: "https://x/a.jpg" }]);
setLondonLiveLayers(p.id, "britten-p04.ai@2", [{ name: "Layer 1", kind: "other" }]);
let b = londonBrandingPlan(p);
console.log("unnamed layers  ->", { lockupOn: b.lockupOn, copy: b.copy });
setLondonLiveLayers(p.id, "britten-p04.ai@2", [{ name: "Ground", kind: "ground" }, { name: "Headline", kind: "copy" }]);
b = londonBrandingPlan(p);
console.log("named layers    ->", { lockupOn: b.lockupOn, copy: b.copy });
setLondonLayerRebuilt(p.id, "Headline", true);
b = londonBrandingPlan(p);
console.log("copy handed back->", { lockupOn: b.lockupOn, copy: b.copy });
