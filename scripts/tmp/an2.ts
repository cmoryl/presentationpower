import { qeiiFloorVector } from "@/lib/next-london-qeii-vectors";

const f = qeiiFloorVector("third")!;
function box(d: string) {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const xs: number[] = [], ys: number[] = [];
  n.forEach((v, i) => (i % 2 ? ys.push(v) : xs.push(v)));
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
const MAX = 26, REACH = 34, MIN_MEMBERS = 3;
const cands: { i: number; cx: number; cy: number }[] = [];
f.shapes.forEach((s, i) => {
  const b = box(s.d);
  const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
  if (size <= MAX) cands.push({ i, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 });
});
const seen = new Set<number>();
const clusters: typeof cands[] = [];
cands.forEach((c, k) => {
  if (seen.has(k)) return;
  const cl = [c];
  seen.add(k);
  let grew = true;
  while (grew) {
    grew = false;
    cands.forEach((o, j) => {
      if (seen.has(j)) return;
      if (cl.some((m) => Math.hypot(m.cx - o.cx, m.cy - o.cy) <= REACH)) { cl.push(o); seen.add(j); grew = true; }
    });
  }
  clusters.push(cl);
});
clusters.filter((c) => c.length >= MIN_MEMBERS).forEach((c) =>
  console.log("cluster", c.length, "at", Math.round(c[0]!.cx), Math.round(c[0]!.cy)));
console.log("candidates", cands.length, "clusters", clusters.length, "loners", clusters.filter(c=>c.length<MIN_MEMBERS).length);
