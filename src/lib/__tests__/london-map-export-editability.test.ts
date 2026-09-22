/**
 * London (QEII) map exports — editability audit.
 *
 * Every rebuilt floor is exported through the REAL builders and graded on the
 * only question that matters to the crew: can they retype a room and move a wall
 * in the file we hand them?
 *
 *   SVG  — plan as <path> vectors, every room name as live <text>, no raster
 *          plate; the only <image> allowed is a linked division lockup.
 *   .ai  — live PDF path operators, room names as live text runs (Tj), named
 *          layers, and NO image XObject anywhere.
 *   PPTX — plan as custom-geometry shapes (no picture at all) + one editable
 *          text box per name/use line/key row.
 *   DOCX — plan as a group of Word custom-geometry shapes (no picture) + every
 *          room name as live Word text.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { qeiiPlanSvg, qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import { qeiiColourKey } from "@/lib/next-london-qeii-rooms";
import { buildQeiiPlanAi, qeiiPdfCopy } from "@/lib/next-london-qeii-ai";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

// A 1×1 PNG stands in for the print-resolution plan raster: the Office builders
// need a canvas, which no test environment has. Everything graded below is the
// editable layer that sits on top of it.
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";

vi.mock("@/lib/next-london-qeii-pdf", () => ({
  inlineSvgImages: async (svg: string) => ({ svg, dropped: [] }),
  qeiiRasteriseSvg: async () => ({ dataUrl: PNG, w: 4960, h: 3508 }),
  qeiiRasteriseLockup: async () => ({ dataUrl: PNG, w: 170, h: 100 }),
}));

/** How many division lockups the plan sets on a floor. */
function markCount(floor: QeiiFloorVector): number {
  return qeiiPlanLayout(floor, { showUse: true }).blocks.reduce((n, b) => n + b.marks.length, 0);
}

const FLOORS: QeiiFloorVector[] = LONDON_VENUE_SHEETS.map((s) => qeiiPlanState(s.id))
  .filter((s): s is NonNullable<typeof s> => Boolean(s?.rebuilt))
  .map((s) => s.floor);

/** Every word the plan sets on a floor: name lines, use lines, key rows. */
function copyOf(floor: QeiiFloorVector) {
  const layout = qeiiPlanLayout(floor, { showUse: true });
  const names = layout.blocks.flatMap((b) => b.lines);
  const uses = layout.blocks.map((b) => b.use).filter((u): u is string => Boolean(u));
  const key = qeiiColourKey(floor, {}, {}).map((r) => r.label);
  return { names, uses, key, lines: [...names, ...uses, ...key] };
}

beforeAll(() => {
  expect(FLOORS.length).toBeGreaterThan(0);
});

describe("London map exports are editable", () => {
  it.each(FLOORS.map((f) => [f.title, f] as const))("%s — SVG is live vector art", (_t, floor) => {
    const svg = qeiiPlanSvg(floor, { showUse: true });
    const paths = svg.match(/<path /g)?.length ?? 0;
    const texts = svg.match(/<text /g)?.length ?? 0;
    const copy = copyOf(floor);

    expect(paths).toBeGreaterThanOrEqual(20);
    expect(texts).toBeGreaterThanOrEqual(copy.lines.length);
    // No rasterised plate: the only picture allowed is a linked lockup.
    expect(svg).not.toMatch(/data:image\/(png|jpe?g)/);
    for (const href of [...svg.matchAll(/<image[^>]*href="([^"]+)"/g)].map((m) => m[1]!)) {
      expect(href).toMatch(/brand-logos|logos|lockup/i);
    }
    for (const line of copy.lines) {
      expect(svg).toContain(`>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}<`);
    }
  });

  it.each(FLOORS.map((f) => [f.title, f] as const))(
    "%s — Illustrator file keeps paths and live text",
    (_t, floor) => {
      const res = buildQeiiPlanAi(floor, { showUse: true });
      const pdf = new TextDecoder("latin1").decode(res.bytes);
      const copy = copyOf(floor);

      // Live vector: real path operators, not one placed picture.
      expect(pdf).not.toContain("/Subtype /Image");
      expect(pdf).not.toContain("/XObject");
      expect((pdf.match(/ c\n| c | l /g)?.length ?? 0) + (pdf.match(/ re /g)?.length ?? 0)).toBeGreaterThan(50);
      // Live text, one run per line, in named layers.
      expect(pdf.match(/ Tj/g)?.length ?? 0).toBeGreaterThanOrEqual(copy.lines.length);
      for (const name of ["Plan artwork", "Room names", "Colour key"]) {
        expect(pdf).toContain(`/Name (${name})`);
      }
      for (const line of copy.lines) {
        // Curly quotes and dashes must survive as printable WinAnsi bytes.
        expect(pdf).toContain(`(${qeiiPdfCopy(line)}) Tj`);
      }

      expect(res.notes.join(" ")).toMatch(/editable text/i);
    },
  );

  it.each(FLOORS.map((f) => [f.title, f] as const))(
    "%s — PowerPoint carries every word as its own text box",
    async (_t, floor) => {
      const { buildQeiiPlanPptx } = await import("@/lib/next-london-qeii-office");
      const res = await buildQeiiPlanPptx(floor, { showUse: true });
      const zip = await JSZip.loadAsync(await res.blob.arrayBuffer());
      const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
      const copy = copyOf(floor);

      // The plan is live shapes; the only pictures are the approved division
      // lockups, which are placed artwork by definition.
      expect(xml.match(/<p:pic>/g)?.length ?? 0).toBe(markCount(floor));
      expect(xml.match(/<a:custGeom>/g)?.length ?? 0).toBeGreaterThanOrEqual(20);
      // Every line is a real editable run.
      expect(xml.match(/<a:t>/g)?.length ?? 0).toBeGreaterThanOrEqual(copy.lines.length);
      for (const line of copy.lines) {
        expect(xml).toContain(`<a:t>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a:t>`);
      }
      expect(res.notes.join(" ")).toMatch(/live PowerPoint shapes/i);
    },
    120_000,
  );

  it.each(FLOORS.map((f) => [f.title, f] as const))(
    "%s — Word carries every room name as live text",
    async (_t, floor) => {
      const { buildQeiiPlanDocx } = await import("@/lib/next-london-qeii-office");
      const res = await buildQeiiPlanDocx(floor, { showUse: true });
      const zip = await JSZip.loadAsync(await res.blob.arrayBuffer());
      const xml = await zip.file("word/document.xml")!.async("string");
      const copy = copyOf(floor);

      expect(xml.match(/<w:drawing>/g)?.length ?? 0).toBe(1);
      // The plan itself is a group of editable Word shapes, not a picture.
      expect(xml).toContain("<wpg:wgp>");
      expect(xml.match(/<a:custGeom>/g)?.length ?? 0).toBeGreaterThanOrEqual(20);
      // Only the approved division lockups arrive as pictures.
      expect(xml.match(/<pic:pic>/g)?.length ?? 0).toBe(markCount(floor));
      for (const line of [...copy.names, ...copy.key]) {
        expect(xml).toContain(line.replace(/&/g, "&amp;").replace(/</g, "&lt;"));
      }
      expect(zip.file("word/media/plan.png")).toBeNull();
      expect(zip.file(/word\/media\/lockup-\d+\.png/).length).toBe(markCount(floor));
      expect(res.notes.join(" ")).toMatch(/editable group of Word shapes/i);
    },
    120_000,
  );
});
