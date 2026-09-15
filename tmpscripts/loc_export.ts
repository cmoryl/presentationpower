import { agendaDefault, type AgendaConfig } from "@/lib/next-agenda";
import { buildAgendaVectorPdf } from "@/lib/agenda-vector-pdf";
import { buildAgendaPptx } from "@/lib/next-agenda-pptx";
import { writeFileSync } from "node:fs";

const base: AgendaConfig = { ...agendaDefault("globallink"), rowStyle: "card", locationLine: "Fleming 3rd Floor" };
const cases: Array<[string, Partial<AgendaConfig>]> = [
  ["right", { locationAlign: "right", locationIcon: "pin", locationSize: "standard" }],
  ["centre", { locationAlign: "centre", locationIcon: "stairs", locationSize: "hero", locationCaps: false, locationInk: "aqua" }],
  ["left", { locationAlign: "left", locationIcon: "diamond", locationIconInk: "yellow", locationSize: "large", locationWeight: "regular" }],
];
for (const [name, over] of cases) {
  const cfg = { ...base, ...over } as AgendaConfig;
  const pdf = await buildAgendaVectorPdf(cfg);
  const pdfBytes = pdf.bytes;
  writeFileSync(`/tmp/loc-${name}.pdf`, pdfBytes);
  const pptx = await buildAgendaPptx(cfg);
  writeFileSync(`/tmp/loc-${name}.pptx`, new Uint8Array(await (pptx as any).blob.arrayBuffer()));
  console.log(name, "ok", pdfBytes.byteLength);
}
