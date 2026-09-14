// Measure, rather than assume, how much brightness and saturation each London
// signage ground colour loses when it is printed as ink instead of shown as light.
//
// Method: write one PDF holding a DeviceRGB patch and a DeviceCMYK patch per
// colour, render it through a standard CMYK preview transform (poppler), and
// compare the two patches pixel for pixel. Writes /tmp/london-cmyk-gamut.csv.
//
// Run: bun scripts/london-cmyk-gamut-check.ts
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { cmykShort, londonCmykBuild } from "@/lib/next-london-cmyk";
import { londonCmykSignOff } from "@/lib/next-london-cmyk-signoff";

const stops = londonCmykSignOff(1).stops;
const cell = 24; // pt per patch
const cols = 8;
const rows = Math.ceil(stops.length / cols);
const W = cols * cell * 2;
const H = rows * cell;

const f3 = (n: number) => n.toFixed(3);
let ops = "";
stops.forEach((s, i) => {
  const cx = (i % cols) * cell * 2;
  const cy = H - (Math.floor(i / cols) + 1) * cell;
  const r = parseInt(s.hex.slice(1, 3), 16) / 255;
  const g = parseInt(s.hex.slice(3, 5), 16) / 255;
  const b = parseInt(s.hex.slice(5, 7), 16) / 255;
  const k = s.build;
  ops += `${f3(r)} ${f3(g)} ${f3(b)} rg ${cx} ${cy} ${cell} ${cell} re f\n`;
  ops += `${f3(k.c)} ${f3(k.m)} ${f3(k.y)} ${f3(k.k)} k ${cx + cell} ${cy} ${cell} ${cell} re f\n`;
});

const objs = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R >>`,
  `<< /Length ${ops.length} >>\nstream\n${ops}endstream`,
];
let pdf = "%PDF-1.5\n";
const offsets: number[] = [];
objs.forEach((o, i) => {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const start = pdf.length;
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
writeFileSync("/tmp/london-gamut.pdf", pdf, "latin1");

execFileSync("pdftoppm", ["-png", "-r", "72", "-singlefile", "/tmp/london-gamut.pdf", "/tmp/london-gamut"]);
const py = `
from PIL import Image
im = Image.open('/tmp/london-gamut.png').convert('RGB')
W,H = im.size
sx, sy = W/${W}, H/${H}
out=[]
for i in range(${stops.length}):
    cx=(i%${cols})*${cell}*2; cy=${H}-(i//${cols}+1)*${cell}
    def mid(x,y): return im.getpixel((int((x+${cell}/2)*sx), int((${H}-y-${cell}/2)*sy)))
    a=mid(cx,cy); b=mid(cx+${cell},cy)
    def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
    def sat(p): return (max(p)-min(p))/max(1,max(p))
    out.append('%d,%.1f,%.1f,%.3f,%.3f'%(i, lum(a), lum(b), sat(a), sat(b)))
print('\\n'.join(out))
`;
const measured = execFileSync("python3", ["-c", py], { encoding: "utf8" }).trim().split("\n");

const rowsOut = [
  "source_rgb,cmyk_build,status,screen_brightness,ink_brightness,brightness_loss_pct,screen_saturation,ink_saturation,saturation_loss_pct,panels_using",
];
const losses: { hex: string; sat: number; lum: number }[] = [];
for (const line of measured) {
  const [i, lumA, lumB, satA, satB] = line.split(",");
  const s = stops[Number(i)]!;
  const la = Number(lumA), lb = Number(lumB), sa = Number(satA), sb = Number(satB);
  const lumLoss = la > 0 ? ((la - lb) / la) * 100 : 0;
  const satLoss = sa > 0.02 ? ((sa - sb) / sa) * 100 : 0;
  losses.push({ hex: s.hex, sat: satLoss, lum: lumLoss });
  rowsOut.push(
    [
      s.hex.toUpperCase(),
      cmykShort(londonCmykBuild(s.hex, 1)),
      s.build.approved ? "approved brand build" : "machine conversion — needs sign-off",
      la.toFixed(1),
      lb.toFixed(1),
      lumLoss.toFixed(1),
      sa.toFixed(3),
      sb.toFixed(3),
      satLoss.toFixed(1),
      String(s.panels),
    ].join(","),
  );
}
writeFileSync("/tmp/london-cmyk-gamut.csv", rowsOut.join("\n"));

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
console.log(`colours measured: ${losses.length}`);
console.log(`mean brightness loss ${mean(losses.map((l) => l.lum)).toFixed(1)}%`);
console.log(`mean saturation loss ${mean(losses.map((l) => l.sat)).toFixed(1)}%`);
console.log("worst saturation losses:");
for (const l of [...losses].sort((a, b) => b.sat - a.sat).slice(0, 8)) {
  console.log(`  ${l.hex.toUpperCase()}  -${l.sat.toFixed(0)}% saturation, -${l.lum.toFixed(0)}% brightness`);
}
