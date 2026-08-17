import { exportDeckToPptx } from "@/lib/pptx-export";
import { BRAND_MODES } from "@/lib/taxonomy";
import { setAssetBaseUrl } from "@/lib/asset-base-url";
setAssetBaseUrl("http://localhost:8080");
const deck: any = {
  id: "t1", createdAt: new Date().toISOString(), title: "Headless Test",
  briefId: "b", brandModeId: BRAND_MODES[0].id, archetypeId: "",
  slides: [
    { id: "s1", position: 0, sectionId: "cover", variantId: "MV-COVER-1", layoutId: "LF-01", content: { title: "Hello", subtitle: "World" }, changes: [] },
    { id: "s2", position: 1, sectionId: "proof", variantId: "MV-STATS-1", layoutId: "LF-01", content: { title: "Stats", stats: [{ value: "62%", label: "Faster" }] }, changes: [] },
  ],
};
const r = await exportDeckToPptx(deck, BRAND_MODES[0], { output: "blob", fidelity: "editable", embedFonts: true });
console.log("blob bytes", r.blob ? (await r.blob.arrayBuffer()).byteLength : 0, "failed", r.failedSlides, "warnings", (r.warnings||[]).slice(0,5));
