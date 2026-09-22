// Diagnostic: are the cut room cells clean vector outlines, and are the lockups
// placed at their own aspect? Run: bun scripts/qeii-cell-quality.ts
import { QEII_FLOOR_VECTORS } from "../src/lib/next-london-qeii-vectors";
import { qeiiColourPaint, QEII_ROOM_PALETTE, qeiiRoomShapes } from "../src/lib/next-london-qeii-rooms";

function pts(d: string): [number, number][][] {
  const rings: [number, number][][] = [];
  let cur: [number, number][] = [];
  const toks = d.match(/[MLZmlz]|-?\d+(?:\.\d+)?/g) ?? [];
  for (let i = 0; i < toks.length; ) {
    const t = toks[i]!;
    if (/^[A-Za-z]$/.test(t)) {
      if (/[MmZz]/.test(t) && cur.length > 2) {
        rings.push(cur);
        cur = [];
      }
      i += 1;
      continue;
    }
    cur.push([Number(toks[i]), Number(toks[i + 1])]);
    i += 2;
  }
  if (cur.length > 2) rings.push(cur);
  return rings;
}

let cells = 0;
let curveCells = 0;
let spikes = 0;
let shortSegs = 0;
let dupes = 0;
const angles = new Set<string>();

for (const floor of QEII_FLOOR_VECTORS) {
  const rooms = qeiiRoomShapes(floor).map((r) => r.room);
  const colours: Record<string, string> = {};
  rooms.forEach((n, i) => (colours[n] = QEII_ROOM_PALETTE[i % QEII_ROOM_PALETTE.length]!.hex));
  const paint = qeiiColourPaint(floor, colours);
  for (const cell of paint.cells) {
    cells += 1;
    if (/[CcQqSsTtAa]/.test(cell.d)) curveCells += 1;
    for (const ring of pts(cell.d)) {
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[(i - 1 + ring.length) % ring.length]!;
        const b = ring[i]!;
        const c = ring[(i + 1) % ring.length]!;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len === 0) dupes += 1;
        else if (len < 0.15) shortSegs += 1;
        const v1 = [b[0] - a[0], b[1] - a[1]];
        const v2 = [c[0] - b[0], c[1] - b[1]];
        const n1 = Math.hypot(v1[0]!, v1[1]!);
        const n2 = Math.hypot(v2[0]!, v2[1]!);
        if (n1 > 0.2 && n2 > 0.2) {
          const cosang = (v1[0]! * v2[0]! + v1[1]! * v2[1]!) / (n1 * n2);
          const deg = (Math.acos(Math.max(-1, Math.min(1, cosang))) * 180) / Math.PI;
          if (deg > 170) spikes += 1;
          angles.add(String(Math.round(deg / 5) * 5));
        }
      }
    }
  }
}
console.log({ cells, curveCells, spikes, shortSegs, dupes });
console.log("turn angles seen (deg buckets):", [...angles].map(Number).sort((a, b) => a - b).join(","));

// per-cell detail
import { QEII_FLOOR_VECTORS as FV } from "../src/lib/next-london-qeii-vectors";
for (const floor of FV) {
  const rs = qeiiRoomShapes(floor).map((r) => r.room);
  const colours: Record<string, string> = {};
  rs.forEach((n, i) => (colours[n] = QEII_ROOM_PALETTE[i % QEII_ROOM_PALETTE.length]!.hex));
  for (const cell of qeiiColourPaint(floor, colours).cells) {
    const rings = pts(cell.d);
    const n = rings.reduce((a, r) => a + r.length, 0);
    const lens: number[] = [];
    for (const r of rings)
      for (let i = 0; i < r.length; i += 1) {
        const a = r[i]!, b = r[(i + 1) % r.length]!;
        lens.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
      }
    lens.sort((a, b) => a - b);
    console.log(floor.id, cell.room, "rings", rings.length, "pts", n, "minSeg", lens[0]?.toFixed(4), "median", lens[Math.floor(lens.length / 2)]?.toFixed(3), "max", lens.at(-1)?.toFixed(1));
  }
}
