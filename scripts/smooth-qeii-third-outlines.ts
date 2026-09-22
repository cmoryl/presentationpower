/**
 * Straighten the third-floor traced outlines.
 *
 * Every other QEII floor imports as drawn artwork. The third floor is a placed
 * picture in the issued design, so it was traced back into outlines — and a
 * trace writes long straight walls as dozens of one-pixel steps, which is what
 * reads as poor artwork on screen and in the exports.
 *
 * This pass runs a corner-preserving simplify over each closed ring: a point is
 * only dropped when it sits within TOLERANCE of the straight line between the
 * points that are kept either side of it, so every true corner and every angled
 * wall run stays exactly where the trace put it. Nothing is moved, no ring is
 * removed, and no shape changes colour or paint order.
 *
 * Run: bun scripts/smooth-qeii-third-outlines.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "src/lib/next-london-qeii-vectors.ts";
const FLOOR_KEY = `id: "third"`;
const TOLERANCE = 0.45; // units on a ~600-unit sheet: below a hairline in print

type Pt = [number, number];

function simplify(ring: Pt[], tol: number): Pt[] {
  if (ring.length < 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    if (b - a < 2) continue;
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let worst = -1;
    let worstAt = -1;
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = ring[i];
      const dist = Math.abs((px - ax) * dy - (py - ay) * dx) / len;
      if (dist > worst) {
        worst = dist;
        worstAt = i;
      }
    }
    if (worst > tol && worstAt > 0) {
      keep[worstAt] = 1;
      stack.push([a, worstAt], [worstAt, b]);
    }
  }
  return ring.filter((_, i) => keep[i] === 1);
}

function num(v: number): string {
  const s = v.toFixed(2);
  return s.replace(/\.?0+$/, "") || "0";
}

const src = readFileSync(FILE, "utf8");
const keyAt = src.indexOf(FLOOR_KEY);
if (keyAt < 0) throw new Error("third floor record not found");
const nextKey = src.indexOf(`id: "fourth"`, keyAt);
const end = nextKey > 0 ? nextKey : src.length;
const block = src.slice(keyAt, end);

let before = 0;
let after = 0;
let rings = 0;

const rewritten = block.replace(/d:\s*"([^"]+)"/g, (whole, d: string) => {
  if (/[CcQqSsTtAa]/.test(d)) return whole;
  const subs = d.split(/(?=M)/).filter((s) => s.trim().length > 0);
  const out: string[] = [];
  for (const sub of subs) {
    const closed = /[Zz]\s*$/.test(sub);
    const nums = sub.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const ring: Pt[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) ring.push([nums[i], nums[i + 1]]);
    if (ring.length < 2) {
      out.push(sub.trim());
      continue;
    }
    before += ring.length;
    rings += 1;
    let kept: Pt[];
    if (closed && ring.length > 3) {
      // A closed ring has no start and no end, so it is cut at two points that
      // are certainly corners — the first traced point and the point farthest
      // from it — and each half is simplified as an open run.
      const open = ring.slice();
      const [fx, fy] = open[0];
      const last = open[open.length - 1];
      if (Math.hypot(last[0] - fx, last[1] - fy) < 1e-6 && open.length > 2) open.pop();
      let far = 0;
      let farDist = -1;
      open.forEach(([x, y], i) => {
        const dist = Math.hypot(x - fx, y - fy);
        if (dist > farDist) {
          farDist = dist;
          far = i;
        }
      });
      const front = simplify(open.slice(0, far + 1), TOLERANCE);
      const back = simplify([...open.slice(far), open[0]], TOLERANCE);
      kept = [...front, ...back.slice(1, -1)];
    } else {
      kept = simplify(ring, TOLERANCE);
    }

    after += kept.length;
    const body = kept
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${num(x)} ${num(y)}`)
      .join(" ");
    out.push(closed ? `${body} Z` : body);
  }
  return `d: "${out.join(" ")}"`;
});

writeFileSync(FILE, src.slice(0, keyAt) + rewritten + src.slice(end));
console.log(`rings ${rings}  points ${before} -> ${after}  (${((1 - after / before) * 100).toFixed(1)}% fewer)`);
