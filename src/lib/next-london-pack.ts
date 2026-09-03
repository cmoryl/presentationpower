// TransPerfect NEXT 2026 — London signage PACK BUILDER.
//
// Turns a set of panels into the deliverable the venue printer expects: one
// `.svg` master and one `.ai` master per panel, foldered by floor, plus a
// manifest listing trim, bleed, style, lockup and placement for every item.

import JSZip from "jszip";
import { LONDON_FLOORS, type LondonPanel } from "@/lib/next-london-signage";
import { brandingSummary, londonBrandingPlan } from "@/lib/next-london-branding";
import { nextLogoFamily } from "@/lib/next-logo-vectors";
import {
  buildLondonPanelAi,
  buildLondonPanelSvg,
  londonAiBytes,
  londonPanelFileBase,
  londonPanelStops,
  type LondonColorSpace,
} from "@/lib/next-london-revise";
import { cmykLabel, londonCmykBuild } from "@/lib/next-london-cmyk";

export type LondonPackFile = {
  path: string;
  panelId: string;
  kind: "svg" | "ai";
};

export type LondonPackResult = {
  blob: Blob;
  files: LondonPackFile[];
  manifest: string;
};

function floorLabel(id: string): string {
  return LONDON_FLOORS.find((f) => f.id === id)?.label ?? id;
}

function slug(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/** Build the full signage pack for the given panels as a downloadable zip. */
export async function buildLondonSignagePack(
  panels: LondonPanel[],
  options: {
    revision?: number;
    /** "rgb" (default, RIP separates) or "cmyk" print masters with vibrant correction. */
    colorSpace?: LondonColorSpace;
    vibrance?: number;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<LondonPackResult> {
  const rev = options.revision ?? 1;
  const colorSpace: LondonColorSpace = options.colorSpace ?? "rgb";
  const art = { colorSpace, vibrance: options.vibrance ?? 1 };
  const zip = new JSZip();
  const files: LondonPackFile[] = [];
  const rows: string[] = [
    "panel_id,name,floor,room,style,trim_mm,bleed_mm,bleed_edge_mm,lockup,colourway,family,copy,logo_x_mm,logo_y_mm,logo_w_mm,nudge_dx,nudge_dy,scale,colour_space,ground_builds",
  ];

  for (const [index, panel] of panels.entries()) {
    const plan = londonBrandingPlan(panel);
    const dir = `${slug(floorLabel(panel.floor))}`;
    const base = londonPanelFileBase(panel, rev, colorSpace);
    const svgPath = `${dir}/${base}.svg`;
    const aiPath = `${dir}/${base}.ai`;

    zip.file(svgPath, buildLondonPanelSvg(panel, art));
    zip.file(aiPath, londonAiBytes(buildLondonPanelAi(panel, art)));
    files.push({ path: svgPath, panelId: panel.id, kind: "svg" });
    files.push({ path: aiPath, panelId: panel.id, kind: "ai" });


    rows.push(
      [
        panel.id,
        `"${panel.name.replace(/"/g, "'")}"`,
        panel.floor,
        `"${panel.room.replace(/"/g, "'")}"`,
        panel.style,
        `${panel.trimW}x${panel.trimH}`,
        `${panel.bleedW}x${panel.bleedH}`,
        panel.bleedEdge,
        plan.orientation,
        plan.colourway,
        plan.familyId,
        `"${plan.copy ?? ""}"`,
        plan.logo.x.toFixed(2),
        plan.logo.y.toFixed(2),
        plan.logo.w.toFixed(2),
        plan.placement.dx.toFixed(4),
        plan.placement.dy.toFixed(4),
        plan.placement.scale.toFixed(3),
        colorSpace,
        `"${
          colorSpace === "cmyk"
            ? londonPanelStops(panel)
                .map((hex) => cmykLabel(londonCmykBuild(hex, art.vibrance)))
                .join(" | ")
            : londonPanelStops(panel).join(" ")
        }"`,
      ].join(","),
    );


    options.onProgress?.(index + 1, panels.length);
    // Yield to the browser so a 95-panel pack never blocks the UI thread.
    if (index % 4 === 3) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const manifest = rows.join("\n");
  zip.file("manifest.csv", manifest);
  zip.file(
    "README.txt",
    [
      "TransPerfect NEXT 2026 — London signage pack",
      `Panels: ${panels.length} · files: ${files.length} · revision r${rev}`,
      `Colour space: ${
        colorSpace === "cmyk"
          ? `DeviceCMYK — vibrant-corrected print masters (vibrance ${art.vibrance}). ` +
            "Brand colours with a signed-off CMYK build use it verbatim; everything else is " +
            "converted with skeletal black (no black under saturated colour) and a 300% TAC " +
            "ceiling. Copy prints 100K / 0-0-0-0 knockout. Per-stop builds are in manifest.csv."
          : "DeviceRGB — brand RGB is shipped untouched so the RIP performs the separation. " +
            "Request the -cmyk pack if you need press-ready separations from us."
      }`,
      "",

      "Each panel ships twice:",
      "  .svg — master geometry, live gradient ground, editable lockup outlines",
      "  .ai  — Illustrator-native (PDF compatible): live gradient, editable lockup paths, live Geist Bold copy",
      "",
      "Layers, top to bottom: Hero lockup · Copy · Ground. The hero lockup is the",
      "first layer in both formats. Colourway per panel is recorded in manifest.csv.",
      "",
      "Artboards are full bleed. Trim origin and bleed per edge are recorded in the",
      "SVG metadata and in manifest.csv. Body copy prints 100K; use only the approved",
      "lockup colourways shipped here and never place them on complex artwork.",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, files, manifest };
}

/** One-line human description of a panel's lockup, for the UI. */
export function londonPanelLockupLine(panel: LondonPanel): string {
  const plan = londonBrandingPlan(panel);
  return brandingSummary(plan, nextLogoFamily(plan.familyId)?.label ?? "TransPerfect");
}
