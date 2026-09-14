import { beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildAgendaPptx } from "@/lib/next-agenda-pptx";
import { agendaBlocks, agendaDefault } from "@/lib/next-agenda";

/**
 * The PowerPoint export must keep the printed spacing: every header block owns
 * its measured band with the line pitch set to that band (otherwise Word-style
 * reflow pushed the headline onto the date line), rows carry no cell padding so
 * the columns stay on the printed grid, and the brand face travels with the file
 * instead of being substituted on the opening machine.
 */
describe("agenda PowerPoint export layout", () => {
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
        toDataURL: () => "data:image/png;base64,AA==",
        toBlob: (cb: (b: Blob) => void) => cb(new Blob([new Uint8Array([1])])),
      }),
    };
  });

  it("sets an explicit line pitch and zero cell padding on the printed grid", async () => {
    const cfg = agendaDefault();
    const b = agendaBlocks(cfg);
    const { blob, slideCount } = await buildAgendaPptx(cfg);
    expect(slideCount).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(await new Response(blob as BlobPart).arrayBuffer());
    const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");

    // Explicit line spacing everywhere text sits in a measured band.
    expect(slide).toContain("<a:lnSpc>");
    // Header blocks and table cells carry no inset.
    expect(slide).toMatch(/lIns="0"/);
    // Every session lands on the slide.
    for (const { session } of b.rows) {
      if ((session.title ?? "").trim()) {
        expect(slide).toContain((session.title ?? "").slice(0, 12));
      }
    }
  });

  it("asks for the brand face and keeps the package openable in Office", async () => {
    const { blob } = await buildAgendaPptx(agendaDefault());
    const zip = await JSZip.loadAsync(await new Response(blob as BlobPart).arrayBuffer());
    const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slide).toContain("Geist");

    // ECMA-376 sequence: embeddedFontLst must be the LAST child of p:presentation.
    const pres = await zip.file("ppt/presentation.xml")!.async("string");
    if (pres.includes("<p:embeddedFontLst")) {
      expect(pres.indexOf("<p:embeddedFontLst")).toBeGreaterThan(pres.indexOf("<p:sldIdLst"));
      expect(pres.trim().endsWith("</p:presentation>")).toBe(true);
    }
  });
});
