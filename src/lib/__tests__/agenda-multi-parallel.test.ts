import { beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";

import {
  AGENDA_MAX_PARALLEL,
  agendaBlocks,
  agendaDefault,
  agendaGeometry,
  agendaParallels,
  agendaSplitWidths,
  normalizeAgendaConfig,
  type AgendaConfig,
} from "@/lib/next-agenda";
import { buildAgendaDocx } from "@/lib/next-agenda-docx";
import { buildAgendaPptx } from "@/lib/next-agenda-pptx";

/**
 * A slot can run several tracks at once. Every parallel track must reach the
 * board and every export as its own card: never merged, never clipped, never
 * silently dropped past the fourth.
 */
function config(counts: number[]): AgendaConfig {
  const base = agendaDefault("globallink");
  return normalizeAgendaConfig({
    ...base,
    rowStyle: "card",
    days: undefined,
    sessions: counts.map((n, i) => ({
      time: `0${9 + i}:00`,
      title: `Session ${i + 1}`,
      detail: "Main room, Level 1",
      track: "",
      parallels: Array.from({ length: n }, (_, j) => ({
        title: `Track ${j + 1} of slot ${i + 1}`,
        detail: `Speaker ${j + 1}, Room ${j + 1}`,
      })),
    })),
  } as AgendaConfig);
}

describe("multiple parallel tracks per slot", () => {
  beforeAll(() => {
    const ctx = new Proxy({}, { get: () => () => ({ addColorStop: () => undefined }) });
    (globalThis as Record<string, unknown>)["document"] = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ctx,
        toDataURL: () => "data:image/png;base64,AA==",
        toBlob: (cb: (b: Blob) => void) => cb(new Blob([new Uint8Array([1])])),
      }),
    };
  });

  it("keeps a single track on the approved 45.5 / 54.5 split", () => {
    const cfg = config([1]);
    const b = agendaBlocks(cfg);
    const split = agendaSplitWidths(b.layout.contentW, b.layout.bandGap, 1);
    expect(split.leftW).toBeCloseTo(b.layout.splitLeftW, 3);
    expect(b.rows[0]!.parallels).toHaveLength(1);
    expect(b.rows[0]!.parallels[0]!.w).toBeCloseTo(
      b.layout.contentW - b.layout.splitLeftW - b.layout.bandGap,
      3,
    );
  });

  it("lays one card per track inside the safe area without overlap", () => {
    const cfg = config([0, 1, 2, 3, 4]);
    const geo = agendaGeometry(cfg);
    const b = agendaBlocks(cfg);
    b.rows.forEach((row, i) => {
      expect(row.parallels).toHaveLength(i);
      let cursor = row.band!.x + row.band!.w;
      for (const par of row.parallels) {
        expect(par.x).toBeGreaterThanOrEqual(cursor - 0.01);
        expect(par.w).toBeGreaterThan(2);
        expect(par.x + par.w).toBeLessThanOrEqual(geo.trimW - geo.safeInset + 0.01);
        cursor = par.x + par.w;
      }
    });
  });

  it("caps the tracks a slot can carry", () => {
    const cfg = config([6]);
    expect(agendaParallels(cfg.sessions[0]!)).toHaveLength(AGENDA_MAX_PARALLEL);
  });

  it("writes every track into the Word and PowerPoint files", async () => {
    const cfg = config([3, 1]);
    const docx = await buildAgendaDocx(cfg);
    const docXml = await (await JSZip.loadAsync(await docx.blob.arrayBuffer()))
      .file("word/document.xml")!
      .async("string");
    for (const par of agendaParallels(cfg.sessions[0]!)) {
      expect(docXml).toContain(par.title);
    }
    // Busiest slot sets the grid: time + body + four... here three track columns.
    const firstGrid = docXml.slice(docXml.indexOf("<w:tblGrid>"), docXml.indexOf("</w:tblGrid>"));
    expect((firstGrid.match(/<w:gridCol /g) ?? []).length).toBe(5);

    const pptx = await buildAgendaPptx(cfg);
    const slide = await (await JSZip.loadAsync(await pptx.blob.arrayBuffer()))
      .file("ppt/slides/slide1.xml")!
      .async("string");
    for (const par of agendaParallels(cfg.sessions[0]!)) {
      expect(slide).toContain(par.title);
    }
    expect(slide).toContain("Parallel session 1.3");
  });
});
