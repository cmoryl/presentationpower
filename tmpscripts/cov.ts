import { PRINT_SECTION_MODULES } from "@/lib/print-library/section-modules";
import { printModuleExampleIndex } from "@/lib/print-library/module-examples";
const idx = printModuleExampleIndex();
for (const m of PRINT_SECTION_MODULES) console.log(m.id, m.variantId, (idx.get(m.variantId)??[]).length);
console.log("index keys", [...idx.keys()]);
