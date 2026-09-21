import { buildAgendaVectorPdf } from "@/lib/agenda-vector-pdf";
import { AGENDA_DIVISIONS, agendaDefault, normalizeAgendaConfig } from "@/lib/next-agenda";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "/tmp/a4pdf/pack";
mkdirSync(OUT, { recursive: true });

const lines: string[] = [];
for (const div of AGENDA_DIVISIONS) {
  const cfg = normalizeAgendaConfig({
    ...agendaDefault(div.id),
    sizeId: "a4",
    trimW: 210,
    trimH: 297,
  } as never);
  try {
    const out = await buildAgendaVectorPdf(cfg, { guides: false } as never);
    const buf = Buffer.from(out.bytes);
    writeFileSync(`${OUT}/${div.id}-agenda-a4.pdf`, buf);
    lines.push(`${div.id}\tOK\t${buf.length} bytes`);
    console.log("ok", div.id, buf.length);
  } catch (e) {
    lines.push(`${div.id}\tFAILED\t${(e as Error).message}`);
    console.log("FAIL", div.id, (e as Error).message);
  }
}
writeFileSync(`${OUT}/BUILD-LOG.txt`, lines.join("\n") + "\n");
