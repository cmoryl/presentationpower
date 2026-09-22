// Build one zip holding the live Illustrator (.ai) master of every rebuilt
// QEII Centre floor plan. Run: bun scripts/export-london-floor-ai-pack.ts [out.zip]
import JSZip from "jszip";
import { mkdir, writeFile } from "node:fs/promises";

import { buildQeiiPlanAi } from "@/lib/next-london-qeii-ai";
import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";

const OUT = process.argv[2] ?? "/mnt/documents/TP-NEXT-2026-London-QEII-floor-plans-ai.zip";

// The lockups are site-relative paths the browser resolves against the origin.
// Off the browser they resolve off disk, so the artwork still goes in as
// outlines rather than being dropped from the file.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : String(input?.url ?? input);
  if (url.startsWith("/")) {
    const { readFile } = await import("node:fs/promises");
    try {
      const body = await readFile(`public${url}`, "utf8");
      return new Response(body, { headers: { "content-type": "image/svg+xml" } });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }
  return realFetch(input, init);
}) as typeof fetch;

async function main() {
  const zip = new JSZip();
  const rows = ["file,floor,bytes,notes"];
  const skipped: string[] = [];

  for (const sheet of LONDON_VENUE_SHEETS) {
    const state = qeiiPlanState(sheet.id);
    if (!state) continue;
    if (!state.rebuilt) {
      skipped.push(`${sheet.title}: ${state.reason ?? "not rebuilt as native artwork"}`);
      continue;
    }
    const res = await buildQeiiPlanAi(state.floor, { showUse: true, showMarks: true });
    zip.file(res.filename, res.bytes);
    rows.push(
      [res.filename, `"${sheet.title}"`, res.bytes.byteLength, `"${res.notes.join(" ").replace(/"/g, "'")}"`].join(","),
    );
    console.log("built", res.filename, `${(res.bytes.byteLength / 1024).toFixed(0)} KB`);
  }

  zip.file("manifest.csv", rows.join("\n"));
  if (skipped.length) zip.file("SKIPPED.txt", skipped.join("\n"));
  zip.file(
    "README.txt",
    [
      "TransPerfect NEXT 2026 — London (QEII Centre) floor plans, Illustrator masters",
      "",
      "One .ai per natively rebuilt floor. Each file is live vector art: walls,",
      "room fills and venue symbols are real paths, room names / use lines / key",
      "rows are live text, and division lockups sit on their own layer as vector",
      "outlines from the approved artwork.",
      "",
      "Type is written with the PDF base face, so Illustrator asks for Geist on",
      "open; the copy stays editable. These are working map files, not press",
      "masters (press masters carry outlined Geist paths).",
      skipped.length ? "\nSKIPPED.txt lists floors the issued design places as a picture." : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await mkdir(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(OUT, buf);
  console.log(`\n${OUT} · ${(buf.byteLength / 1024 / 1024).toFixed(2)} MB`);
  if (skipped.length) console.log("skipped:\n" + skipped.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
