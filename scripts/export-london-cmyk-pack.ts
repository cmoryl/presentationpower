// Build the explicit CMYK master pack for the NEXT 2026 London signage kit:
// one DeviceCMYK .ai and one print-ready CMYK PDF per panel, each audited by the
// colourspace-aware print QA gate, plus the printer sign-off sheet listing every
// colour build as approved or machine-converted.
//
// Run: bun scripts/export-london-cmyk-pack.ts [out.zip]
import JSZip from "jszip";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  auditAi,
  auditPrintPdf,
  failedChecks,
  qaReportCsv,
  rollup,
  type LondonQaReport,
} from "@/lib/london-signage-qa";
import { cmykShort } from "@/lib/next-london-cmyk";
import {
  londonCmykPanels,
  londonCmykSignOffCsv,
  londonCmykSummary,
  londonPanelCmykStatus,
} from "@/lib/next-london-cmyk-signoff";
import { LONDON_FLOORS } from "@/lib/next-london-signage";
import {
  LONDON_MARKS_MARGIN_MM,
  buildLondonPanelAiAsync,
  buildLondonPanelPrintPdfAsync,
  londonAiBytes,
  londonPanelFileBase,
} from "@/lib/next-london-revise";
import { loadLondonSignageFace } from "@/lib/next-london-text-outline";

const OUT = process.argv[2] ?? "/mnt/documents/TP-NEXT-2026-London-signage-CMYK.zip";
const rev = 1;
const art = { colorSpace: "cmyk" as const, vibrance: 1 };

const slug = (v: string) =>
  v
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

async function main() {
  await loadLondonSignageFace();
  const zip = new JSZip();
  const reports: LondonQaReport[] = [];
  const rows = [
    "file,panel_id,panel,floor,room,trim_mm,bleed_edge_mm,style,colour_builds,approved_builds,converted_builds,qa",
  ];
  const panels = londonCmykPanels();

  for (const panel of panels) {
    const floor = LONDON_FLOORS.find((f) => f.id === panel.floor)?.label ?? panel.floor;
    const base = londonPanelFileBase(panel, rev, "cmyk");
    const dir = slug(floor);
    const status = londonPanelCmykStatus(panel, art.vibrance);

    const ai = await buildLondonPanelAiAsync(panel, art);
    const aiQa = auditAi(panel, ai, art);
    const pdf = await buildLondonPanelPrintPdfAsync(panel, art);
    const pdfQa = auditPrintPdf(panel, pdf, LONDON_MARKS_MARGIN_MM, art);
    reports.push(aiQa, pdfQa);

    // Honest gate: a file whose bytes disagree with the spec is not shipped.
    const bad = [aiQa, pdfQa].filter((r) => r.status === "fail");
    if (bad.length) {
      console.error(`FAIL ${base}: ${failedChecks(bad[0]!)[0]?.label}`);
      continue;
    }
    zip.file(`${dir}/${base}.ai`, londonAiBytes(ai));
    zip.file(`${dir}/${base}-print.pdf`, londonAiBytes(pdf));

    rows.push(
      [
        `${dir}/${base}.ai`,
        panel.id,
        `"${panel.name}"`,
        `"${floor}"`,
        `"${panel.room}"`,
        `${panel.trimW}x${panel.trimH}`,
        String(panel.bleedEdge),
        panel.style,
        `"${status.stops.map((s) => `${s.hex.toUpperCase()} ${cmykShort(s.build)}`).join("; ")}"`,
        String(status.approved),
        String(status.converted),
        [aiQa.status, pdfQa.status].includes("warn") ? "warn" : "pass",
      ].join(","),
    );
    console.log("built", base, `${status.approved}/${status.total} approved builds`);
  }

  zip.file("manifest.csv", rows.join("\n"));
  zip.file("printer-colour-sign-off.csv", londonCmykSignOffCsv(art.vibrance));
  zip.file("qa-report.csv", qaReportCsv(reports));
  // Measured ink-vs-screen appearance, so nobody is surprised on press day.
  try {
    execFileSync("bun", ["scripts/london-cmyk-gamut-check.ts"], { stdio: "ignore" });
    zip.file("colour-gamut-check.csv", await readFile("/tmp/london-cmyk-gamut.csv", "utf8"));
  } catch {
    console.warn("gamut check unavailable — pack ships without colour-gamut-check.csv");
  }
  const roll = rollup(reports);
  zip.file(
    "README.txt",
    [
      "TransPerfect NEXT 2026 — London (QEII Centre) signage · CMYK MASTERS",
      `Panels: ${panels.length} · files: ${roll.total} audited (${roll.pass} pass, ${roll.warn} warn, ${roll.fail} fail) · revision r${rev}`,
      "",
      "COLOUR STATUS — READ FIRST",
      londonCmykSummary(art.vibrance),
      "Approved builds come from the TransPerfect brand and NEXT 2026 division",
      "registry and are used verbatim. Every other build is a machine conversion:",
      "chroma-preserving, skeletal black, 300% TAC ceiling, body copy 100K — but",
      "NOT brand-approved. Those colours must be proofed and signed off by the",
      "print house before a run. printer-colour-sign-off.csv is that sheet: one",
      "row per colour, with an empty approval column to sign against.",
      "",
      "WHAT IS IN HERE",
      "  <floor>/<panel>-cmyk.ai         Illustrator-native, DeviceCMYK live gradients,",
      "                                  editable lockup paths, outlined Geist Bold copy.",
      "  <floor>/<panel>-cmyk-print.pdf  The same sheet inside a marks margin with",
      "                                  crop/bleed/registration marks, TrimBox and BleedBox set.",
      "  manifest.csv                    Per-file trim, bleed, style and colour builds.",
      "  qa-report.csv                   Every automated print check on every file.",
      "  colour-gamut-check.csv          Measured brightness and saturation of each colour as",
      "                                  ink against the same colour as light.",
      "",
      "SCREEN BRIGHTNESS VS INK",
      "Vector art, live gradients and outlined copy are identical to the RGB pack —",
      "nothing is rasterised or downsampled, and supplied photography is embedded",
      "verbatim at its full supplied resolution in its own colour space.",
      "Colour, however, cannot be identical: ink on paper has a smaller gamut than",
      "a screen. Every unapproved build here is solved rather than converted by",
      "formula: a press model for a coated commercial sheet (Neugebauer primaries,",
      "dot gain, ink overprint) predicts what each candidate build will print as,",
      "and the build chosen is the one whose predicted print sits closest to the",
      "brand colour, with saturation and hue weighted above lightness and hue held",
      "steady along each gradient so the ramp cannot seam. Measured against the",
      "previous formula that recovers most of the vividness the ramps were losing.",
      "It does not remove the gap: brightness still drops around 7% on average,",
      "the deep navy still prints a shade flatter, and a handful of the palest",
      "teals stay softer than the screen. See colour-gamut-check.csv for the",
      "per-colour figures — and it is still why every conversion needs a wet or",
      "calibrated proof signed off before the run.",

      "",
      "SUPPLIED VENDOR AND VENUE MASTERS",
      "Panels whose artwork was supplied to us (vendor booth walls, hand-finished",
      "venue masters, the uploaded live files) are handed on exactly as supplied in",
      "their own colour space. Where such artwork is placed in a panel here, the",
      "placed art is untouched and only the surrounding TransPerfect ground and",
      "copy carry the CMYK builds above.",
      "",
      "The RGB pack remains the house default: it ships DeviceRGB and the RIP",
      "separates. Use these CMYK masters only when your printer asks for them.",
    ].join("\n"),
  );

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await mkdir(OUT.replace(/\/[^/]+$/, ""), { recursive: true });
  await writeFile(OUT, buf);
  console.log(`\n${OUT} · ${(buf.byteLength / 1024 / 1024).toFixed(1)} MB`);
  console.log(londonCmykSummary(art.vibrance));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
