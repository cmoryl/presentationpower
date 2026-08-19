import { PRINT_LIBRARY_ITEMS } from "../src/lib/print-library/catalog";
import { toEditableContent } from "../src/lib/print-library/editable";
let nulls: string[] = [];
let thin: string[] = [];
for (const it of PRINT_LIBRARY_ITEMS) {
  if (it.source !== "curated") continue;
  const c = toEditableContent(it as any);
  if (!c) { nulls.push(it.id); continue; }
  const keys = Object.keys(c).filter((k)=> (c as any)[k]!=null);
  if (keys.length < 4) thin.push(it.id + ":" + keys.join(","));
}
console.log("total", PRINT_LIBRARY_ITEMS.length, "nulls", nulls.length, nulls.slice(0,20));
console.log("thin", thin.length, thin.slice(0,20));
