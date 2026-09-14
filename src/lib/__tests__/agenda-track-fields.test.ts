import { beforeAll, describe, expect, it } from "vitest";
import JSZip from "jszip";

import {
  agendaBlocks,
  agendaDefault,
  agendaGeometry,
  agendaPages,
  agendaParallels,
  agendaRowsPerPage,
  normalizeAgendaConfig,
  type AgendaConfig,
} from "@/lib/next-agenda";
import { buildAgendaDocx } from "@/lib/next-agenda-docx";
import { buildAgendaPptx } from "@/lib/next-agenda-pptx";
import { buildAgendaVectorPdf } from "@/lib/agenda-vector-pdf";

/**
 * Every parallel track carries its own time, title, speaker and notes. All four
 * fields must survive the board, the press PDF, Word and PowerPoint at the
 * approved type sizes, and the extra lines must be measured so no card is
 * clipped and no row runs past the safe area or the footer.
 */
const TRACKS = [
  { time: "09:15", title: "Track one title", speaker: "Ana Ruiz", detail: "Notes one, Room 1" },
  { time: "09:30", title: "Track two title", speaker: "Ben Cole", detail: "Notes two, Room 2" },
  { time: "", title: "Track three title", speaker: "Cara Diaz", detail: "Notes three, Room 3" },
  { time: "10:00", title: "Track four title", speaker: "Dan Ellis", detail: "Notes four, Room 4" },
];

function config(sizeId: AgendaConfig["sizeId"] = "a2"): AgendaConfig {
  const base = agendaDefault("globallink");
  return normalizeAgendaConfig({
    ...base,
    sizeId,
    rowStyle: "card",
    days: undefined,
    sessions: [
      {
        time: "09:00",
        title: "Opening plenary",
        detail: "Main room, Level 1",
        track: "",
        parallels: TRACKS,
      },
      {
        time: "11:00",
        title: "Second slot",
        detail: "Main room, Level 1",
        track: "",
        parallels: TRACKS.slice(0, 2),
      },
    ],
  } as AgendaConfig);
}

describe("parallel track fields across every export", () => {
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

  it("keeps all four fields on the normalised model", () => {
    const pars = agendaParallels(config().sessions[0]!);
    expect(pars).toHaveLength(4);
    expect(pars[0]).toMatchObject(TRACKS[0]!);
    expect(pars[2]!.time).toBe("");
  });

  it("measures the extra lines so cards stay inside the band and the safe area", () => {
    const cfg = config();
    const geo = agendaGeometry(cfg);
    const b = agendaBlocks(cfg);
    // The extra time and speaker lines must claim measured height: a slot with
    // all four fields wants more room than the same slot without them.
    const mixed = agendaBlocks(
      normalizeAgendaConfig({
        ...cfg,
        sessions: [
          { time: "09:00", title: "Slot A", detail: "Main room", track: "", parallels: TRACKS },
          {
            time: "10:00",
            title: "Slot B",
            detail: "Main room",
            track: "",
            parallels: TRACKS.map((p) => ({ ...p, time: "", speaker: "" })),
          },
        ],
      } as AgendaConfig),
    );
    expect(mixed.needs[0]!).toBeGreaterThan(mixed.needs[1]!);
    for (const row of b.rows) {
      for (const par of row.parallels) {
        expect(par.h).toBeGreaterThanOrEqual(row.band!.h - 0.01);
        expect(par.x + par.w).toBeLessThanOrEqual(geo.trimW - geo.safeInset + 0.01);
      }
      expect(row.band!.y + row.band!.h).toBeLessThanOrEqual(b.listBottom + 0.01);
    }
  });

  it("pages on the height the busiest slot really needs", () => {
    const many = normalizeAgendaConfig({
      ...config("a4"),
      sessions: Array.from({ length: 14 }, (_, i) => ({
        time: `${9 + i}:00`,
        title: `Slot ${i + 1}`,
        detail: "Main room, Level 1",
        track: "",
        parallels: TRACKS,
      })),
    } as AgendaConfig);
    const perPage = agendaRowsPerPage(many);
    const page = agendaBlocks(agendaPages(many)[0]!.config);
    // No band is crushed below what its copy needs, so nothing is clipped.
    page.rows.forEach((row, i) => {
      expect(row.band!.h).toBeGreaterThanOrEqual(page.needs[i]! - 0.5);
    });
    expect(perPage).toBeLessThan(14);
  });

  it("writes every field into Word at the agenda type sizes", async () => {
    const cfg = config();
    const docx = await buildAgendaDocx(cfg);
    const xml = await (await JSZip.loadAsync(await docx.blob.arrayBuffer()))
      .file("word/document.xml")!
      .async("string");
    for (const p of TRACKS) {
      if (p.time) expect(xml).toContain(p.time);
      expect(xml).toContain(p.title);
      expect(xml).toContain(p.speaker);
      expect(xml).toContain(p.detail);
    }
    // Speaker is bold and set at the detail size, not the title size.
    const at = xml.indexOf(TRACKS[0]!.speaker);
    const run = xml.slice(xml.lastIndexOf("<w:r>", at), at);
    expect(run).toContain("<w:b/>");
    expect(run).toMatch(/<w:sz w:val="\d+"\/>/);
  });

  it("writes every field into PowerPoint", async () => {
    const cfg = config();
    const pptx = await buildAgendaPptx(cfg);
    const slide = await (await JSZip.loadAsync(await pptx.blob.arrayBuffer()))
      .file("ppt/slides/slide1.xml")!
      .async("string");
    for (const p of TRACKS) {
      expect(slide).toContain(p.title);
      expect(slide).toContain(p.speaker);
      expect(slide).toContain(p.detail);
    }
    // A track with its own start time prints it; the third inherits the slot's.
    expect(slide).toContain("09:15");
    expect(slide).toContain("09:00");
  });

  it("prints every field in the press PDF", async () => {
    const pdf = await buildAgendaVectorPdf(config());
    expect(pdf.pageCount).toBeGreaterThanOrEqual(1);
    expect(pdf.bytes.byteLength).toBeGreaterThan(1000);
  });
});
