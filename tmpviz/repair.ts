import { readFileSync, writeFileSync } from "node:fs";
import JSZip from "jszip";
import { repairChartXml } from "@/lib/pptx-chart-repair";
const zip = await JSZip.loadAsync(readFileSync("/tmp/vizchk/viz-native.pptx"));
for (const name of Object.keys(zip.files)) {
  if (/^ppt\/charts\/chart\d+\.xml$/.test(name)) {
    const xml = await zip.file(name)!.async("string");
    zip.file(name, repairChartXml(xml));
  }
}
const buf = await zip.generateAsync({ type: "nodebuffer" });
writeFileSync("/tmp/vizchk/viz-native-repaired.pptx", buf);
console.log("repaired");
