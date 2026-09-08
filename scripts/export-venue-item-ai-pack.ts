// Build a zip of live .ai masters for every QEII venue-template signage item
// (the "List Signage QEII" issue). Run with: bun scripts/export-venue-item-ai-pack.ts
import JSZip from "jszip";
import { writeFile, mkdir } from "node:fs/promises";

import { loadLondonSignageFace } from "@/lib/next-london-text-outline";
import {
  LONDON_FLOORS,
  LONDON_VENUE_ITEM_PANELS,
  LONDON_VENUE_ITEM_META,
} from "@/lib/next-london-signage";
import {
  buildLondonPanelAiAsync,
  londonAiBytes,
  londonPanelFileBase,
} from "@/lib/next-london-revise";

const OUT = process.argv[2] ?? "/mnt/documents/TP-NEXT-2026-London-venue-signage-ai.zip";
const rev = 1;

function slug(v: string) {
  return v
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function main() {
  await loadLondonSignageFace();
  const zip = new JSZip();
  const rows = ["file,item,floor,room,trim_mm,bleed_mm,bleed_edge_mm,style,venue_template,note"];

  for (const panel of LONDON_VENUE_ITEM_PANELS) {
    const meta = LONDON_VENUE_ITEM_META[panel.id]!;
    const floor = LONDON_FLOORS.find((f) => f.id === panel.floor)?.label ?? panel.floor;
    const base = londonPanelFileBase(panel, rev, "rgb");
    const path = `${slug(floor)}/${base}.ai`;
    const art = { colorSpace: "rgb" as const, vibrance: 1 };
    zip.file(path, londonAiBytes(await buildLondonPanelAiAsync(panel, art)));
    rows.push(
      [
        path,
        `"${panel.name}"`,
        panel.floor,
        `"${panel.room}"`,
        `${panel.trimW}x${panel.trimH}`,
        `${panel.bleedW}x${panel.bleedH}`,
        panel.bleedEdge,
        panel.style,
        `"${meta.template}"`,
        `"${meta.note.replace(/"/g, "'")}"`,
      ].join(","),
    );
    console.log("built", path);
  }

  zip.file("manifest.csv", rows.join("\n"));
  zip.file(
    "README.txt",
    [
      "TransPerfect NEXT 2026 — London (QEII Centre) venue template signage",
      `Items: ${LONDON_VENUE_ITEM_PANELS.length} live .ai masters · revision r${rev} · DeviceRGB`,
      "",
      "Each .ai is Illustrator-native (PDF compatible): live gradient ground,",
      "editable lockup paths and outlined Geist Bold copy. Artboards are full",
      "bleed; trim and per-edge bleed are recorded in manifest.csv.",
      "Body copy prints 100K. Use only the approved lockup colourways.",
    ].join("\n"),
  );

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await mkdir(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(OUT, buf);
  console.log(`\n${OUT} · ${(buf.byteLength / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
