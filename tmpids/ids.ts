import { PRINT_LIBRARY_ITEMS } from "../src/lib/print-library/catalog";
const q = process.argv.slice(2);
for (const it of PRINT_LIBRARY_ITEMS) {
  const s = `${it.id} | ${it.kind} | ${it.divisionId ?? "-"} | ${it.title}`;
  if (!q.length || q.some((k) => s.toLowerCase().includes(k))) console.log(s);
}
console.log("total", PRINT_LIBRARY_ITEMS.length);
