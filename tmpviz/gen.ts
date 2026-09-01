import PptxGenJS from "pptxgenjs";
import { writeFileSync } from "node:fs";
import { NATIVE_VIZ_VARIANT_IDS, vizNativeChartPlan } from "@/lib/infographics/native-chart";
import { sampleDatasetFor } from "@/lib/infographics/sample-data";
import { vizKindForVariant } from "@/lib/infographics/variant-kinds";

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "W", width: 13.333, height: 7.5 });
pptx.layout = "W";
for (const id of NATIVE_VIZ_VARIANT_IDS) {
  const kind = vizKindForVariant(id);
  const ds = sampleDatasetFor(kind)!;
  const plan = vizNativeChartPlan({
    id, kind,
    data: { rows: ds.rows, columns: ds.columns, source: ds.source },
    encoding: ds.encoding,
    theme: { mode: "light", accent: "#A1FBF9", primary: "#003FC7", ink: "#03002C", surface: "#FFFFFF" },
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg" },
  } as never)!;
  const s = pptx.addSlide();
  s.addText(id, { x: 0.667, y: 0.5, w: 12, h: 0.6, fontSize: 24, bold: true });
  const box = { x: 0.667, y: 1.6, w: 12, h: 4.42 };
  for (const ch of plan.charts) {
    s.addChart(ch.type as never, ch.data as never, {
      x: box.x + ch.box.x * box.w, y: box.y + ch.box.y * box.h,
      w: ch.box.w * box.w, h: ch.box.h * box.h,
      chartColors: ch.colors.map((c) => (c === "primary" ? "003FC7" : c === "accent" ? "A1FBF9" : c === "series2" ? "7F9FE3" : c === "series3" ? "6B79A8" : c === "surface" ? "FFFFFF" : "9AA6CF")),
      valAxisOrientation: ch.invertValueAxis ? "maxMin" : "minMax",
      barDir: ch.barDir ?? "col", barGrouping: ch.stacked ? "stacked" : "clustered",
      holeSize: ch.holeSize, showLegend: plan.legend.length > 1, legendPos: "b", showTitle: false,
    } as never);
  }
}
const b64 = (await pptx.write({ outputType: "base64" })) as string;
writeFileSync("/tmp/vizchk/viz-native.pptx", Buffer.from(b64, "base64"));
console.log("ok");
