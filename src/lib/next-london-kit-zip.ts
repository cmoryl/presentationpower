// Master ZIP for the London scenic kit: every panel's live vector master and
// print-ready PDF, filed under Floor/Room folders, with a manifest that records
// exactly what went in and anything that could not be built.
//
// The builders are injected so the route owns edit/revision resolution and this
// module stays testable without the artwork pack or the signage face.
import JSZip from "jszip";
import type { LondonPanel } from "@/lib/next-london-signage";

export type LondonKitZipBuilders = {
  /** Live vector master bytes (.ai, PDF-compatible) for one panel. */
  ai: (panel: LondonPanel) => Promise<Uint8Array>;
  /** Print-ready PDF bytes (bleed, trim, crop marks) for one panel. */
  printPdf: (panel: LondonPanel) => Promise<Uint8Array>;
  /** Supplied vendor master, served verbatim when the design team hand-finished one. */
  supplied?: (panel: LondonPanel) => Promise<{
    filename: string;
    bytes: Uint8Array;
    /** Print-ready PDF handed back with the master, served verbatim too. */
    print?: { filename: string; bytes: Uint8Array };
  } | null>;

  /** File stem for a panel, already stamped with the revision or `rdraft-`. */
  fileBase: (panel: LondonPanel) => string;
  /** Human floor name for the folder, e.g. "Level 2 — Britten". */
  floorLabel: (panel: LondonPanel) => string;
};

export type LondonKitZipOptions = {
  /** Revision in force, used for the root folder name. */
  revLabel: string;
  /** Print schedule CSV placed at the root of the zip. */
  scheduleCsv?: string;
  /** Called after each panel so the UI can show progress. */
  onProgress?: (done: number, total: number, panel: LondonPanel) => void;
};

export type LondonKitZipResult = {
  blob: Blob;
  filename: string;
  files: number;
  skipped: { panel: string; reason: string }[];
};

/** Folder-safe segment: keeps it readable, drops anything a filesystem hates. */
export function zipSafeSegment(input: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");
  return cleaned || "Unsorted";
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Build the master zip. A panel that fails to build is recorded in the manifest
 * and in SKIPPED.txt rather than taking the whole download down — an honest
 * partial pack beats no pack at all.
 */
export async function buildLondonKitZip(
  panels: LondonPanel[],
  builders: LondonKitZipBuilders,
  options: LondonKitZipOptions,
): Promise<LondonKitZipResult> {
  const zip = new JSZip();
  const root = `NEXT-London-kit-${options.revLabel}`;
  const folder = zip.folder(root)!;
  const rows: string[][] = [];
  const skipped: { panel: string; reason: string }[] = [];
  let files = 0;

  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i]!;
    const dir = `${zipSafeSegment(builders.floorLabel(panel))}/${zipSafeSegment(panel.room)}`;
    const base = builders.fileBase(panel);
    const written: string[] = [];
    try {
      const ai = await builders.ai(panel);
      folder.file(`${dir}/live-ai/${base}.ai`, ai);
      written.push(`${dir}/live-ai/${base}.ai`);
      const pdf = await builders.printPdf(panel);
      folder.file(`${dir}/print-pdf/${base}-print.pdf`, pdf);
      written.push(`${dir}/print-pdf/${base}-print.pdf`);
      const supplied = builders.supplied ? await builders.supplied(panel) : null;
      if (supplied) {
        folder.file(`${dir}/supplied-master/${supplied.filename}`, supplied.bytes);
        written.push(`${dir}/supplied-master/${supplied.filename}`);
      }
      files += written.length;
      rows.push([
        builders.floorLabel(panel),
        panel.room,
        panel.name,
        `${panel.trimW}x${panel.trimH}mm`,
        written.join(" | "),
        "included",
      ]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Build failed";
      skipped.push({ panel: panel.name, reason });
      rows.push([
        builders.floorLabel(panel),
        panel.room,
        panel.name,
        `${panel.trimW}x${panel.trimH}mm`,
        written.join(" | "),
        `SKIPPED — ${reason}`,
      ]);
    }
    options.onProgress?.(i + 1, panels.length, panel);
  }

  const manifest = [
    ["Floor", "Room", "Sign", "Trim", "Files", "Status"],
    ...rows,
  ]
    .map((r) => r.map(csvCell).join(","))
    .join("\n");
  folder.file("manifest.csv", manifest);
  if (options.scheduleCsv) folder.file("print-schedule.csv", options.scheduleCsv);
  if (skipped.length) {
    folder.file(
      "SKIPPED.txt",
      [
        "These signs could not be built into this pack. Do not assume they are approved —",
        "open each one in the kit, fix the reported problem and download it again.",
        "",
        ...skipped.map((s) => `- ${s.panel}: ${s.reason}`),
      ].join("\n"),
    );
  }
  folder.file(
    "README.txt",
    [
      `NEXT 2026 London — scenic panel kit (${options.revLabel})`,
      "",
      "Folders follow the venue: Floor / Room.",
      "  live-ai/        Illustrator-compatible vector masters — editable, no live text.",
      "  print-pdf/      Print-ready PDFs with bleed, trim, crop marks and registration.",
      "  supplied-master/ The design team's hand-finished file, verbatim, where one exists.",
      "",
      "manifest.csv lists every file in this pack. print-schedule.csv is the run sheet.",
      skipped.length ? "SKIPPED.txt lists signs missing from this pack." : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, filename: `${root}.zip`, files, skipped };
}
