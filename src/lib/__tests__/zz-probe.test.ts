import { describe, it } from "vitest";
import JSZip from "jszip";
import { BRAND_MODES, byId, MODULE_VARIANTS } from "@/lib/taxonomy";
import { seedContent } from "@/lib/deck-store";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { packToneBrand, stylePackById } from "@/lib/style-packs";
describe("probe", () => {
  it("hexes", async () => {
    for (const id of ["bm-product","bm-enterprise"]) {
      const brand = byId(BRAND_MODES, id)!;
      console.log(id, "toned", packToneBrand(brand, stylePackById("skin-r03")!).tokens);
      const variants = MODULE_VARIANTS.slice(0,3);
      const deck: any = { id:"p", createdAt:new Date(0).toISOString(), title:"p", briefId:"b", brandModeId:id, archetypeId:"ar-overview", context:{stylePackId:"skin-r03"}, slides: variants.map((v,i)=>({id:`s-${i}`,sectionId:"sec-overview",variantId:v.id,layoutId:v.layoutId??"",content:seedContent(v.id,{} as never,"Overview"),notes:""})) };
      const res = await exportDeckToPptx(deck, brand, { output:"blob", pack:"skin-r03", fidelity:"editable", embedFonts:false });
      const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
      const names = Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));
      const xml = (await Promise.all(names.map(n=>zip.files[n]!.async("string")))).join("\n").toUpperCase();
      const counts: Record<string,number> = {};
      for (const m of xml.matchAll(/[0-9A-F]{6}/g)) counts[m[0]] = (counts[m[0]]??0)+1;
      console.log(id, Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12));
    }
  }, 200000);
});
