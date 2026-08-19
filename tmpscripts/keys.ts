import { PRINT_LIBRARY_ITEMS } from "@/lib/print-library/catalog";
const counts = new Map<string, number>();
const samples = new Map<string, unknown>();
for (const it of PRINT_LIBRARY_ITEMS) {
  const c = (it.content ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(c)) {
    counts.set(k, (counts.get(k) ?? 0) + 1);
    if (!samples.has(k)) samples.set(k, c[k]);
  }
}
for (const [k, n] of [...counts].sort((a,b)=>b[1]-a[1])) {
  console.log(n, k, JSON.stringify(samples.get(k)).slice(0, 160));
}
