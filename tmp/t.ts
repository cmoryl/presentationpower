import { MODULE_VARIANTS } from "../src/lib/taxonomy";
import { autoFixQa } from "../src/lib/qa-autofix";
const v = MODULE_VARIANTS.find((m) => m.capacity.items && m.capacity.items.max <= 4)!;
const items = Array.from({ length: v.capacity.items!.max + 3 }, (_, i) => ({ title: `T${i}`, body: `Body ${i}`, label: `L${i}`, value: `${i}%` }));
const slide: any = { id: "s1", position: 0, sectionId: v.permittedSectionIds?.[0] ?? "SF-01", variantId: v.id, layoutId: v.permittedLayoutIds[0], content: { title: "Long ".repeat(40), items }, changes: [] };
const r = autoFixQa([slide], { newId: (() => { let n = 0; return () => `new${++n}`; })() });
console.log(v.id, r.slides.length, r.slides.map((s) => (s.content.items as any[]).length), r.fixes.map((f) => f.kind + ":" + f.code), r.unresolved.map((u) => u.code));
