import { describe, it } from "vitest";
import JSZip from "jszip";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
const brand = byId(BRAND_MODES, "bm-enterprise")!;
describe("dbg", () => { it("xml", async () => {
  const deck: any = { id: "d", createdAt: new Date(0).toISOString(), title: "t", briefId: "b", brandModeId: "bm-enterprise", archetypeId: "AR-PITCH", slides: [{ id: "s", sectionId: "SF-04", variantId: "MV-PROC-STAGE-ORBITS", layoutId: "LF-14", content: { title: "How a program runs", stages: [{ stepNumber: "1", label: "Pre-flight", mediaSeed: "a", items: [{ label: "Timeline construction", icon: "Calendar" }] }] }, notes: "" }] };
  const res = await exportDeckToPptx(deck, brand, { output: "blob", forceMode: "light" });
  const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
  const xml = await zip.files["ppt/slides/slide1.xml"].async("string");
  console.log(xml.slice(0, 3000));
  console.log("NAMES", [...xml.matchAll(/name="([^"]*)"/g)].map(m=>m[1]).join(" | "));
}, 60000); });
