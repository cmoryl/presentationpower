import { beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildAgendaDocx } from "@/lib/next-agenda-docx";
import { agendaDefault } from "@/lib/next-agenda";

/**
 * The Word export must keep the printed spacing: measured bands, exact spacers,
 * one page per day, and no clipped session titles.
 */
describe("agenda Word export layout", () => {
  beforeAll(() => {
    // Node has no canvas: the flattened ground is not what this test checks.
    const ctx = new Proxy(
      {},
      { get: () => () => ({ addColorStop: () => undefined }) },
    ) as unknown as CanvasRenderingContext2D;
    (globalThis as Record<string, unknown>)["document"] = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ctx,
        toBlob: (cb: (b: Blob) => void) => cb(new Blob([new Uint8Array([1])])),
      }),
    };
  });

  it("drives spacing from measured bands and keeps rows unclipped", async () => {
    const cfg = agendaDefault();
    const blob = await buildAgendaDocx(cfg);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const doc = await zip.file("word/document.xml")!.async("string");

    // Rows use the printed band as a minimum, never a hard cut.
    expect(doc).toContain('w:hRule="atLeast"');
    expect(doc).not.toContain('w:hRule="exact"');
    // Measured gaps are exact spacers, so Word cannot re-flow the header.
    expect(doc).toContain('w:lineRule="exact"');
    // Rows cannot break across pages.
    expect(doc).toContain("<w:cantSplit/>");
    // Font substitution table ships so Geist falls back with matching metrics.
    expect(zip.file("word/fontTable.xml")).toBeTruthy();
    expect(zip.file("word/settings.xml")).toBeTruthy();
    // Every session lands in the table.
    for (const session of cfg.sessions) {
      expect(doc).toContain(session.time);
    }
  });
});
