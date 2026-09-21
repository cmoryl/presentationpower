import { buildAgendaVectorPdf } from "../src/lib/agenda-vector-pdf";
import { agendaDefault, normalizeAgendaConfig } from "../src/lib/next-agenda";
import { LONDON_2026_PROGRAMMES } from "../src/lib/next-agenda-london-2026";
import { writeFileSync } from "node:fs";

const p = LONDON_2026_PROGRAMMES["legal"]!;
const cfg = normalizeAgendaConfig({ ...agendaDefault("legal"), ...p, sizeId: "a4" } as never);
const out = await buildAgendaVectorPdf(cfg, { guides: false } as never);
const buf = Buffer.from(await (out.blob ?? out).arrayBuffer());
writeFileSync("/tmp/a4pdf/legal.pdf", buf);
console.log("bytes", buf.length);
