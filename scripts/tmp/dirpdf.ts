import { writeFileSync } from "node:fs";
import { buildLondonDirectoryPdf } from "@/lib/london-directory-pdf";
const doc = buildLondonDirectoryPdf();
writeFileSync("/tmp/dir.pdf", Buffer.from(doc.output("arraybuffer")));
console.log("pages", doc.getNumberOfPages());
