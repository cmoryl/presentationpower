import { describe, expect, it } from "vitest";

import {
  auditAi,
  auditPng,
  auditSvg,
  qaReportCsv,
  readPngHeader,
  rollup,
} from "@/lib/london-signage-qa";
import { buildLondonPanelAi, buildLondonPanelSvg } from "@/lib/next-london-revise";
import { LONDON_PANELS, rasterSizeFor, type LondonPanel } from "@/lib/next-london-signage";

const panel: LondonPanel = LONDON_PANELS[0]!;

/** Minimal 8-bit RGBA PNG header for a given pixel size. */
function fakePng(w: number, h: number, bytes = 4096): Uint8Array {
  const out = new Uint8Array(Math.max(64, bytes));
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  out.set([0, 0, 0, 13], 8);
  out.set([0x49, 0x48, 0x44, 0x52], 12);
  const put = (o: number, n: number) =>
    out.set([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255], o);
  put(16, w);
  put(20, h);
  out[24] = 8; // bit depth
  out[25] = 6; // RGBA
  return out;
}

describe("London signage QA", () => {
  it("passes the generated vector masters for every panel", () => {
    for (const p of LONDON_PANELS) {
      const svg = auditSvg(p, buildLondonPanelSvg(p));
      const ai = auditAi(p, buildLondonPanelAi(p));
      expect(svg.status, `${p.name} svg`).not.toBe("fail");
      expect(ai.status, `${p.name} ai`).not.toBe("fail");
    }
  });

  it("fails a vector whose artboard is not sized to bleed", () => {
    const bad = buildLondonPanelSvg(panel).replace(
      `width="${panel.bleedW}mm"`,
      `width="${panel.bleedW - 40}mm"`,
    );
    const report = auditSvg(panel, bad);
    expect(report.status).toBe("fail");
    expect(report.checks.find((c) => c.id === "svg-artboard")?.status).toBe("fail");
  });

  it("fails a vector with an embedded raster ground", () => {
    const bad = buildLondonPanelSvg(panel).replace("</svg>", '<image href="x.png"/></svg>');
    expect(auditSvg(panel, bad).checks.find((c) => c.id === "svg-live-gradient")?.status).toBe(
      "fail",
    );
  });

  it("fails an .ai whose TrimBox does not match trim", () => {
    const text = Array.from(buildLondonPanelAi(panel), (b) => String.fromCharCode(b)).join("");
    const bad = text.replace(/\/TrimBox \[[^\]]+\]/, "/TrimBox [0 0 10 10]");
    const report = auditAi(panel, bad);
    expect(report.status).toBe("fail");
    expect(report.checks.find((c) => c.id === "ai-trimbox")?.status).toBe("fail");
  });

  it("reads PNG headers and accepts a correctly sized raster", () => {
    const size = rasterSizeFor(panel, panel.rasterPpi);
    expect(readPngHeader(fakePng(size.w, size.h))).toMatchObject({ w: size.w, h: size.h });
    const report = auditPng(panel, panel.rasterPpi, fakePng(size.w, size.h, 2_000_000));
    expect(report.checks.find((c) => c.id === "png-pixels")?.status).toBe("pass");
    expect(report.status).not.toBe("fail");
  });

  it("fails a raster rendered at the wrong pixel count", () => {
    const size = rasterSizeFor(panel, panel.rasterPpi);
    const report = auditPng(panel, panel.rasterPpi, fakePng(size.w - 200, size.h, 2_000_000));
    expect(report.status).toBe("fail");
    expect(report.checks.find((c) => c.id === "png-pixels")?.status).toBe("fail");
  });

  it("rolls up and serialises a CSV audit trail", () => {
    const reports = [auditSvg(panel, buildLondonPanelSvg(panel))];
    expect(rollup(reports)).toMatchObject({ total: 1, fail: 0 });
    const csv = qaReportCsv(reports);
    expect(csv.split("\n")[0]).toContain("file,panel,kind");
    expect(csv.split("\n").length).toBeGreaterThan(3);
  });
});
