// Negative-control harness: inject each defect class into a known-clean package
// and assert the audit reports the matching rule.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import JSZip from "jszip";
import path from "node:path";

const SRC = "/tmp/chart-parity-JAIglE/MV-DASH-REGION-STATS@light/cell.pptx";
const OUT = "/tmp/ooxml-fixtures";
await mkdir(OUT, { recursive: true });

const CASES = {
  "sp-geometry": (x) =>
    x.replace(/(<p:sp>[\s\S]*?)<a:prstGeom\b[^>]*>[\s\S]*?<\/a:prstGeom>/, "$1"),
  "prst-known": (x) => x.replace(/(<p:sp>[\s\S]*?<a:prstGeom[^>]*prst=")[a-zA-Z0-9]+/, "$1wobblyBlob"),
  "ext-positive": (x) => x.replace(/(<p:sp>[\s\S]*?<a:ext cx=")\d+(" cy=")\d+/, "$10$20"),
  "id-valid": (x) => x.replace(/<p:cNvPr id="(\d+)" name="Text 0"/, '<p:cNvPr id="0" name="Text 0"'),
  "name-present": (x) => x.replace(' name="Text 0"', ""),
  "off-slide": (x) => x.replace(/(<p:sp>[\s\S]*?<a:off x=")\d+(" y=")\d+/, "$199999999$299999999"),
  "blip-rel": (x) => x.replace('r:embed="rId1"', 'r:embed="rId999"'),
  // A baked line layout is a body with a measured pitch (<a:lnSpc><a:spcPts>)
  // or explicit <a:br> breaks; flipping its wrap back to "square" hands layout
  // to PowerPoint and must be flagged.
  "wrap-contract": (x) =>
    x.replace(/<a:bodyPr wrap="none"/, "<a:bodyPr wrap=\"square\"").replace(
      /<\/a:p><\/p:txBody>/,
      "</a:p><a:p><a:pPr><a:lnSpc><a:spcPts val=\"1800\"/></a:lnSpc></a:pPr><a:r><a:rPr lang=\"en-US\" sz=\"1800\"><a:latin typeface=\"Geist\"/></a:rPr><a:t>second baked line</a:t></a:r></a:p></p:txBody>",
    ),

  "empty-run": (x) =>
    x.replace(/<\/a:p><\/p:txBody>/, "</a:p><a:p><a:r><a:rPr lang=\"en-US\"><a:latin typeface=\"Geist\"/></a:rPr><a:t></a:t></a:r></a:p></p:txBody>"),
  "font-unset": (x) => x.replace(/<a:latin typeface="[^"]+"[^/]*\/>/, ""),
  "cxn-visible": (x) =>
    x.replace(
      "</p:spTree>",
      '<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="900" name="Bad Connector"/><p:cNvCxnSpPr><a:stCxn id="777" idx="0"/><a:endCxn id="777" idx="2"/></p:cNvCxnSpPr><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="100" y="100"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></p:spPr></p:cxnSp></p:spTree>',
    ),
};
const CXN_EXTRA = ["cxn-zero-length", "cxn-endpoint", "cxn-self", "cxn-geometry"];

const run = (args) =>
  new Promise((res) => execFile("node", args, { maxBuffer: 1 << 26 }, (e, so) => res(so ?? "")));

let fails = 0;
for (const [rule, mutate] of Object.entries(CASES)) {
  const zip = await JSZip.loadAsync(await readFile(SRC));
  const name = "ppt/slides/slide1.xml";
  const xml = await zip.file(name).async("string");
  const next = mutate(xml);
  if (next === xml) {
    console.log(`? ${rule}: mutation did not apply`);
    fails += 1;
    continue;
  }
  zip.file(name, next);
  const out = path.join(OUT, `${rule}.pptx`);
  await writeFile(out, await zip.generateAsync({ type: "nodebuffer" }));
  const log = await run(["/dev-server/scripts/infographic-ooxml-audit.mjs", out]);
  const expected = rule === "cxn-visible" ? [rule, ...CXN_EXTRA] : [rule];
  // Advisory rules print with a "·" marker, fatal/render with "✗".
  const hit = expected.filter((r) => log.includes(`✗ ${r} [`) || log.includes(`· ${r} [`));

  if (hit.length) console.log(`✓ ${rule} detected (${hit.join(", ")})`);
  else {
    fails += 1;
    console.log(`✗ ${rule} NOT detected\n${log.split("\n").slice(1, 8).join("\n")}`);
  }
}
console.log(fails ? `\n${fails} undetected defect class(es)` : "\nall injected defects detected");
