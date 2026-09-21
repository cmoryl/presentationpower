import { PDFDocument } from "pdf-lib";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "/tmp/a4pdf/pack";
const OUT = "/tmp/a4pdf/a4-final";
mkdirSync(OUT, { recursive: true });

for (const name of readdirSync(SRC).filter((f) => f.endsWith(".pdf"))) {
  const doc = await PDFDocument.load(readFileSync(`${SRC}/${name}`));
  for (const page of doc.getPages()) {
    const t = page.getTrimBox();
    // Cut the sheet to its own trim marks: a handout file is a finished A4
    // page, not a press file with bleed and slug around it.
    page.setMediaBox(t.x, t.y, t.width, t.height);
    page.setCropBox(t.x, t.y, t.width, t.height);
    page.setBleedBox(t.x, t.y, t.width, t.height);
    page.setTrimBox(t.x, t.y, t.width, t.height);
    page.setArtBox(t.x, t.y, t.width, t.height);
  }
  const bytes = await doc.save();
  writeFileSync(`${OUT}/${name}`, bytes);
  console.log(name, doc.getPageCount(), "pages");
}
