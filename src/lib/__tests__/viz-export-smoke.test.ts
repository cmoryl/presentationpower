// Export smoke test: renders every MV-VIZ-* module end-to-end and proves the
// export pipeline emits real PNG and PDF bytes (not empty or truncated files).
//
// Chart SVG is produced with the same option builder the app/PPTX pipeline
// uses (buildEchartsBase + buildEchartsOption), rendered through ECharts'
// server-side SVG mode, then rasterized/printed with rsvg-convert — the same
// vector path the PDF master export relies on.
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as echarts from "echarts";

import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { seedContent } from "@/lib/deck-store";
import { vizKindForVariant } from "@/lib/infographics/variant-kinds";
import { buildEchartsBase } from "@/lib/infographics/echarts-theme";
import { buildEchartsOption } from "@/lib/infographics/echarts-options";
import { ensureA11y } from "@/lib/infographics/a11y";
import type { InfographicSpec } from "@/lib/infographics/spec";

const WIDTH = 1600;
const HEIGHT = 900;

const vizVariants = MODULE_VARIANTS.filter((v) => v.id.startsWith("MV-VIZ-"));

let outDir = "";

function has(bin: string): boolean {
  try {
    execFileSync("which", [bin], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const k of Object.keys(b)) {
    const av = out[k];
    const bv = b[k];
    if (
      av &&
      bv &&
      typeof av === "object" &&
      typeof bv === "object" &&
      !Array.isArray(av) &&
      !Array.isArray(bv)
    ) {
      out[k] = deepMerge(av as Record<string, unknown>, bv as Record<string, unknown>);
    } else {
      out[k] = bv;
    }
  }
  return out;
}

function specForVariant(variantId: string, mode: "light" | "dark"): InfographicSpec {
  const content = (seedContent(variantId, {} as never, "Overview") ?? {}) as Record<
    string,
    unknown
  >;
  const declared = content.spec as Record<string, unknown> | undefined;
  const rows =
    ((declared?.data as Record<string, unknown> | undefined)?.rows as unknown[]) ??
    (content.rows as unknown[]) ??
    [];
  const encoding =
    (declared?.encoding as Record<string, unknown>) ??
    (content.encoding as Record<string, unknown>) ??
    {};
  return ensureA11y({
    id: `${variantId}-smoke`,
    kind: vizKindForVariant(variantId),
    title: typeof content.title === "string" ? content.title : variantId,
    data: { rows: rows as never },
    encoding: encoding as never,
    theme: {
      mode,
      accent: "#003FC7",
      primary: "#03002C",
      ink: mode === "dark" ? "#FFFFFF" : "#03002C",
      surface: mode === "dark" ? "#03002C" : "#FFFFFF",
    },
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg", rasterFallback: true },
  } as never);
}

/** Render a spec to a standalone SVG string via ECharts SSR (no DOM needed). */
function renderSvg(spec: InfographicSpec): string {
  const chart = echarts.init(null as never, undefined, {
    renderer: "svg",
    ssr: true,
    width: WIDTH,
    height: HEIGHT,
  });
  try {
    const option = deepMerge(
      buildEchartsBase(spec.theme) as unknown as Record<string, unknown>,
      buildEchartsOption(spec),
    );
    chart.setOption(option);
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "viz-export-smoke-"));
});

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

describe("MV-VIZ-* export smoke test", () => {
  it("discovers viz modules to render", () => {
    expect(vizVariants.length).toBeGreaterThan(0);
  });

  it("has a vector rasterizer available", () => {
    expect(has("rsvg-convert")).toBe(true);
  });

  for (const variant of vizVariants) {
    for (const mode of ["light", "dark"] as const)
      it(`${variant.id} (${mode}) exports non-empty SVG, PNG and PDF`, () => {
        const spec = specForVariant(variant.id, mode);
        const svg = renderSvg(spec);

        // SVG must contain real geometry, not just an empty root element.
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg.length).toBeGreaterThan(2000);
        expect(/<(path|rect|circle|text|polygon|g)\b/.test(svg)).toBe(true);

        const base = `${variant.id}-${mode}`;
        const svgPath = join(outDir, `${base}.svg`);
        const pngPath = join(outDir, `${base}.png`);
        const pdfPath = join(outDir, `${base}.pdf`);
        writeFileSync(svgPath, svg, "utf8");

        execFileSync("rsvg-convert", [
          "-f",
          "png",
          "-w",
          String(WIDTH),
          "-h",
          String(HEIGHT),
          "-o",
          pngPath,
          svgPath,
        ]);
        execFileSync("rsvg-convert", ["-f", "pdf", "-o", pdfPath, svgPath]);

        // PNG: non-trivial size + valid signature.
        expect(statSync(pngPath).size).toBeGreaterThan(5000);
        expect(readFileSync(pngPath).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");

        // PDF: non-trivial size + %PDF header and EOF marker.
        const pdf = readFileSync(pdfPath);
        expect(pdf.length).toBeGreaterThan(2000);
        expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
        expect(pdf.subarray(-1024).toString("latin1")).toContain("%%EOF");
      }, 30000);
  }
});
