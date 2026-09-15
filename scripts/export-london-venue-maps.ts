// Render the real QEII Centre venue map sheets (install + attendee) as SVG,
// using the shared text-fitting rules, and zip them for the event pack.
// Run: bun scripts/export-london-venue-maps.ts [out.zip]
import JSZip from "jszip";
import { mkdir, writeFile } from "node:fs/promises";

import { DEFAULT_MAP_DESIGN } from "@/lib/next-london-floormap-design";
import { floorMapSheetSize, floorMapSvg } from "@/lib/next-london-floormap-svg";
import { LONDON_FLOORS, LONDON_PANELS, LONDON_VENUE } from "@/lib/next-london-signage";

const OUT = process.argv[2] ?? "/mnt/documents/TP-NEXT-2026-London-venue-maps-svg.zip";

function slug(v: string) {
  return v
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function main() {
  const zip = new JSZip();
  const rows = ["file,floor,sheet,width_px,height_px,pins"];
  const design = { ...DEFAULT_MAP_DESIGN, venueName: LONDON_VENUE.name };

  for (const floor of LONDON_FLOORS) {
    const pins = LONDON_PANELS.filter((p) => p.floor === floor.id);
    const sheets = [
      { key: "install", opts: { panels: LONDON_PANELS, labels: true, design } },
      { key: "attendee", opts: { panels: LONDON_PANELS, roomsOnly: true, design } },
    ] as const;

    for (const sheet of sheets) {
      const svg = floorMapSvg(floor.id, sheet.opts);
      if (!svg) {
        console.warn("no plan for", floor.id);
        continue;
      }
      const size = floorMapSheetSize(floor.id, sheet.opts);
      const path = `${slug(floor.label)}/next-2026-london-${slug(floor.label)}-${sheet.key}.svg`;
      zip.file(path, svg);
      rows.push([path, floor.id, sheet.key, size.w, size.h, pins.length].join(","));
      console.log("built", path, `${size.w}×${size.h}`);
      // Frame check: nothing may be drawn outside the sheet box.
      if (size.w <= 0 || size.h <= 0) throw new Error(`bad sheet size for ${path}`);
      if (!svg.includes(`viewBox="0 0 ${size.w} ${size.h}"`)) {
        throw new Error(`sheet box mismatch in ${path}`);
      }
    }
  }

  zip.file("manifest.csv", rows.join("\n"));
  zip.file(
    "README.txt",
    [
      `TransPerfect NEXT 2026 — ${LONDON_VENUE.name} venue maps`,
      `${LONDON_FLOORS.length} floors · install sheet (numbered signage index) + attendee guide`,
      "",
      "Vector SVG at sheet scale. All copy is fitted by the shared map text rules:",
      "type shrinks to its floor before it trims, and no label, key chip, title,",
      "footer credit or door tab crosses its frame.",
    ].join("\n"),
  );

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await mkdir(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(OUT, buf);
  console.log(`\n${OUT} · ${(buf.byteLength / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
