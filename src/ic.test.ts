import { test } from "vitest";
import { seedContent, } from "@/lib/deck-store";
import { contentFromSlide } from "@/lib/cross-format-adapt";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
test("icons", () => {
  let n = 0; const ids: string[] = [];
  for (const v of (MODULE_VARIANTS as any[])) { try { const c = contentFromSlide({ content: seedContent(v.id, {} as any, "") as any }); if (c.pointIcons) { n++; ids.push(v.id);} } catch {} }
  console.log("with icons", n, ids.slice(0, 12).join(","));
});
