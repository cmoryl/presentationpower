import { LONDON_PANELS } from "../src/lib/next-london-signage";
const m = new Map<string, number>();
for (const p of LONDON_PANELS) {
  const k = `${p.floor} | ${p.room}`;
  m.set(k, (m.get(k) ?? 0) + 1);
}
for (const [k, v] of [...m.entries()].sort()) console.log(k, "→", v);
