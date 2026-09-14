import { londonCmykBuild } from "@/lib/next-london-cmyk";
import { londonCmykSignOff } from "@/lib/next-london-cmyk-signoff";

// naive device round-trip, the way an uncalibrated RIP/preview shows it
const back = (b: { c: number; m: number; y: number; k: number }) => [
  255 * (1 - Math.min(1, b.c + b.k)),
  255 * (1 - Math.min(1, b.m + b.k)),
  255 * (1 - Math.min(1, b.y + b.k)),
];
const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = ([r, g, b]: number[]) => 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
const chroma = ([r, g, b]: number[]) => Math.max(r!, g!, b!) - Math.min(r!, g!, b!);

for (const vib of [1, 1.06, 1.12]) {
  let dl = 0, dc = 0, worstL = 0, worstName = "", n = 0;
  for (const s of londonCmykSignOff(1).stops) {
    const src = hexToRgb(s.hex);
    const out = back(londonCmykBuild(s.hex, vib));
    const l = lum(out) - lum(src);
    const c = chroma(out) - chroma(src);
    dl += l; dc += c; n++;
    if (Math.abs(l) > Math.abs(worstL)) { worstL = l; worstName = s.hex; }
  }
  console.log(
    `vibrance ${vib}: mean brightness ${(dl / n).toFixed(1)}/255, mean chroma ${(dc / n).toFixed(1)}/255, worst ${worstName} ${worstL.toFixed(1)}`,
  );
}
