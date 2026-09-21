// -----------------------------------------------------------------------------
// NEXT agenda — master pack.
//
// One zip holding every division agenda in every file format we can build
// without a rendered board on screen:
//
//   <division>/pdf/<name>.pdf     layered press file (PDF/X-4)
//   <division>/ai/<name>.ai       the same layered artwork for Illustrator
//   <division>/word/<name>.docx   editable Word version
//   <division>/powerpoint/<name>.pptx  editable deck, one slide per page
//   READ-ME.txt                   what is inside, and what is not
//
// No proof PNG: a proof is rasterised from the board on screen, and only the
// agenda open in the studio has one. Anything that fails to build is named in
// the READ-ME rather than quietly dropped.
// -----------------------------------------------------------------------------

import JSZip from "jszip";

import { buildAgendaVectorPdf } from "./agenda-vector-pdf";
import { buildAgendaDocx } from "./next-agenda-docx";
import { buildAgendaPptx } from "./next-agenda-pptx";
import {
  AGENDA_DIVISIONS,
  AGENDA_SPEC,
  agendaDefault,
  agendaDivision,
  agendaName,
  agendaPages,
  agendaSlug,
  type AgendaConfig,
} from "./next-agenda";

export type AgendaMasterProgress = {
  /** 1-based index of the board being built. */
  index: number;
  total: number;
  label: string;
};

export type AgendaMasterEntry = {
  divisionId: string;
  divisionName: string;
  slug: string;
  sessions: number;
  pages: number;
  formats: string[];
  problems: string[];
};

export type AgendaMasterResult = {
  blob: Blob;
  filename: string;
  boards: number;
  files: number;
  entries: AgendaMasterEntry[];
};

function sessionCount(config: AgendaConfig): number {
  return agendaPages(config).reduce((n, p) => n + p.config.sessions.length, 0);
}

/**
 * Every division board to include. A caller can pass saved live boards; any
 * division without one falls back to its approved default programme.
 */
export function agendaMasterConfigs(saved: AgendaConfig[] = []): AgendaConfig[] {
  return AGENDA_DIVISIONS.map((div) => {
    const live = saved.find((c) => c.divisionId === div.id);
    return live ?? agendaDefault(div.id);
  }).filter((config) => sessionCount(config) > 0);
}

export async function buildAgendaMasterZip(opts: {
  configs: AgendaConfig[];
  onProgress?: (p: AgendaMasterProgress) => void;
}): Promise<AgendaMasterResult> {
  const { configs } = opts;
  if (configs.length === 0) throw new Error("No division agendas with a programme to export.");

  const zip = new JSZip();
  const entries: AgendaMasterEntry[] = [];
  let files = 0;

  for (let i = 0; i < configs.length; i += 1) {
    const config = configs[i]!;
    const div = agendaDivision(config.divisionId);
    const slug = agendaSlug(config);
    const folder = slug;
    const formats: string[] = [];
    const problems: string[] = [];
    const step = (label: string) =>
      opts.onProgress?.({ index: i + 1, total: configs.length, label });

    step(`${div.name} — layered press file`);
    let pages = 0;
    try {
      const vector = await buildAgendaVectorPdf(config);
      const bytes = vector.bytes.buffer.slice(
        vector.bytes.byteOffset,
        vector.bytes.byteOffset + vector.bytes.byteLength,
      ) as ArrayBuffer;
      zip.file(`${folder}/pdf/${slug}.pdf`, bytes);
      zip.file(`${folder}/ai/${slug}.ai`, bytes);
      formats.push("PDF", "AI");
      files += 2;
      pages = vector.pageCount;
    } catch (e) {
      problems.push(`press PDF / Illustrator file: ${(e as Error).message}`);
    }

    step(`${div.name} — editable Word file`);
    try {
      const word = await buildAgendaDocx(config);
      zip.file(`${folder}/word/${slug}.docx`, await word.blob.arrayBuffer());
      formats.push("DOCX");
      files += 1;
    } catch (e) {
      problems.push(`Word file: ${(e as Error).message}`);
    }

    step(`${div.name} — editable PowerPoint deck`);
    try {
      const deck = await buildAgendaPptx(config);
      zip.file(`${folder}/powerpoint/${slug}.pptx`, await deck.blob.arrayBuffer());
      formats.push("PPTX");
      files += 1;
    } catch (e) {
      problems.push(`PowerPoint deck: ${(e as Error).message}`);
    }

    entries.push({
      divisionId: div.id,
      divisionName: div.name,
      slug,
      sessions: sessionCount(config),
      pages,
      formats,
      problems,
    });
  }

  opts.onProgress?.({ index: configs.length, total: configs.length, label: "Packaging the zip" });
  zip.file("READ-ME.txt", masterReadme(configs, entries, files));

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    filename: `next-agendas-master-pack.zip`,
    boards: entries.length,
    files,
    entries,
  };
}

function masterReadme(
  configs: AgendaConfig[],
  entries: AgendaMasterEntry[],
  files: number,
): string {
  const event = configs.find((c) => (c.eventLabel ?? "").trim())?.eventLabel ?? "not assigned";
  const failed = entries.filter((e) => e.problems.length);

  return [
    `TransPerfect NEXT — division agendas, master pack`,
    `Event:      ${event}`,
    `Boards:     ${entries.length}`,
    `Files:      ${files}`,
    `Colour:     convert to ${AGENDA_SPEC.colorMode} at output; body text 100K`,
    `Standard:   PDF/X-4 press files, TrimBox / BleedBox set for preflight`,
    ``,
    `One folder per division area:`,
    `  pdf/         layered press file — art to the bleed edge, crop marks in the slug`,
    `  ai/          the same layered artwork with an .ai extension for Illustrator`,
    `  word/        editable Microsoft Word version, live text on the approved ground`,
    `  powerpoint/  editable deck, one slide per programme page`,
    ``,
    `Proof PNGs are not in this pack: a proof is rendered from the board on`,
    `screen, so export the single-division print package for one.`,
    ``,
    `Boards included:`,
    ...entries.map(
      (e) =>
        `  ${e.divisionName} — ${agendaName({ ...agendaDefault(e.divisionId) })} · ${e.sessions} rows · ${e.pages || "?"} page(s) · ${e.formats.join(", ") || "nothing built"}`,
    ),
    ``,
    ...(failed.length
      ? [
          `Not built (please re-export these individually):`,
          ...failed.flatMap((e) => e.problems.map((p) => `  ${e.divisionName} — ${p}`)),
          ``,
        ]
      : [`Every board built in every format.`, ``]),
    `Palette and geometry are fixed across every NEXT division area — only the`,
    `approved division lockup and the programme copy change.`,
  ].join("\n");
}
