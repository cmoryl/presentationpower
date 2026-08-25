// Structure-preserving OOXML extraction (Word / PowerPoint / Excel) using
// JSZip. Pure JS so it runs inside the Worker runtime.
//
// Instead of flattening every tag away, we walk the document in order and emit
// lightweight Markdown: headings become `#`/`##`, list paragraphs become `-`
// bullets (indented by level), and tables become pipe rows with a header
// separator. Agents read that structure far better than a wall of text.

import JSZip from "jszip";

// ---------------------------------------------------------------- primitives

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m?.[1] ?? null;
}

/** Inner XML of the first `<tag ...>…</tag>`, nesting-aware. */
function firstBlock(
  xml: string,
  tag: string,
): { inner: string; start: number; end: number } | null {
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g");
  const m = open.exec(xml);
  if (!m) return null;
  const end = matchingClose(xml, tag, m.index + m[0].length);
  return { inner: xml.slice(m.index + m[0].length, end), start: m.index, end };
}

/** Index of the closing tag matching an already-consumed open tag. */
function matchingClose(xml: string, tag: string, from: number): number {
  const re = new RegExp(`<(/?)${tag}(?:\\s[^>]*)?(/?)>`, "g");
  re.lastIndex = from;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[2] === "/") continue; // self-closing
    depth += m[1] === "/" ? -1 : 1;
    if (depth === 0) return m.index;
  }
  return xml.length;
}

/** All top-level `<tag>` blocks inside `xml`, nesting-aware and in order. */
function blocks(xml: string, tag: string): string[] {
  const out: string[] = [];
  const open = new RegExp(`<${tag}(?:\\s[^>]*)?>`, "g");
  let m: RegExpExecArray | null;
  let cursor = 0;
  while ((m = open.exec(xml))) {
    if (m.index < cursor) continue;
    const bodyStart = m.index + m[0].length;
    const end = matchingClose(xml, tag, bodyStart);
    out.push(xml.slice(bodyStart, end));
    cursor = end;
    open.lastIndex = end;
  }
  return out;
}

function collapse(s: string): string {
  return s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function tidy(s: string): string {
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------- Word

/** Visible text of a `<w:p>` (or a `<w:tc>`), keeping tabs and line breaks. */
function wordRunText(inner: string): string {
  let out = "";
  const re = /<w:(t|tab|br|cr)(\s[^>]*)?(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    const tag = m[1];
    if (tag === "tab") {
      out += "\t";
      continue;
    }
    if (tag === "br" || tag === "cr") {
      out += "\n";
      continue;
    }
    if (m[3] === "/") continue;
    const close = inner.indexOf("</w:t>", re.lastIndex);
    if (close < 0) break;
    out += decodeEntities(inner.slice(re.lastIndex, close));
    re.lastIndex = close + 6;
  }
  return out;
}

function headingLevel(style: string | null): number | null {
  if (!style) return null;
  if (/^title$/i.test(style)) return 1;
  if (/^subtitle$/i.test(style)) return 2;
  const m = style.match(/^heading[ _-]?(\d)$/i);
  if (m) return Math.min(6, Number(m[1]));
  return null;
}

function wordParagraph(inner: string): string {
  const pPr = firstBlock(inner, "w:pPr")?.inner ?? "";
  const styleTag = pPr.match(/<w:pStyle\s[^>]*\/?>/)?.[0] ?? "";
  const style = attr(styleTag, "w:val");
  const text = collapse(wordRunText(inner));
  if (!text) return "";

  const level = headingLevel(style);
  if (level) return `${"#".repeat(level)} ${text}`;

  const numPr = firstBlock(pPr, "w:numPr")?.inner ?? "";
  if (numPr) {
    const ilvl = Number(attr(numPr.match(/<w:ilvl\s[^>]*\/?>/)?.[0] ?? "", "w:val") ?? 0);
    return `${"  ".repeat(Math.max(0, Math.min(5, ilvl)))}- ${text}`;
  }
  if (/<w:numPr/.test(pPr)) return `- ${text}`;
  return text;
}

function cellText(inner: string): string {
  return collapse(
    blocks(inner, "w:p")
      .map((p) => collapse(wordRunText(p)))
      .filter(Boolean)
      .join(" / "),
  ).replace(/\|/g, "\\|");
}

function markdownTable(rows: string[][]): string {
  const width = rows.reduce((n, r) => Math.max(n, r.length), 0);
  if (!width) return "";
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const [head, ...rest] = rows;
  const lines = [
    `| ${pad(head ?? []).join(" | ")} |`,
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...rest.map((r) => `| ${pad(r).join(" | ")} |`),
  ];
  return lines.join("\n");
}

function wordTable(inner: string): string {
  const rows = blocks(inner, "w:tr").map((tr) => blocks(tr, "w:tc").map(cellText));
  return markdownTable(rows.filter((r) => r.some((c) => c)));
}

/** Walks a `<w:body>`-ish fragment in order, emitting paragraphs and tables. */
function wordBody(xml: string): string {
  const out: string[] = [];
  const re = /<w:(p|tbl)(?:\s[^>]*)?(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    if (m[2] === "/") continue;
    const tag = `w:${m[1]}`;
    const bodyStart = m.index + m[0].length;
    const end = matchingClose(xml, tag, bodyStart);
    const inner = xml.slice(bodyStart, end);
    const text = tag === "w:tbl" ? wordTable(inner) : wordParagraph(inner);
    if (text) out.push(text);
    re.lastIndex = end;
  }
  return tidy(out.join("\n\n"));
}

// ---------------------------------------------------------------- PowerPoint

function drawingParaText(inner: string): string {
  let out = "";
  const re = /<a:(t|br)(?:\s[^>]*)?(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    if (m[1] === "br") {
      out += " ";
      continue;
    }
    if (m[2] === "/") continue;
    const close = inner.indexOf("</a:t>", re.lastIndex);
    if (close < 0) break;
    out += decodeEntities(inner.slice(re.lastIndex, close));
    re.lastIndex = close + 6;
  }
  return collapse(out);
}

function drawingTable(inner: string): string {
  const rows = blocks(inner, "a:tr").map((tr) =>
    blocks(tr, "a:tc").map((tc) =>
      collapse(blocks(tc, "a:p").map(drawingParaText).filter(Boolean).join(" / ")).replace(
        /\|/g,
        "\\|",
      ),
    ),
  );
  return markdownTable(rows.filter((r) => r.some((c) => c)));
}

type ShapeText = { title: boolean; lines: string[] };

function slideShapes(xml: string): { shapes: ShapeText[]; tables: string[] } {
  const shapes: ShapeText[] = [];
  const tables: string[] = [];

  for (const sp of blocks(xml, "p:sp")) {
    const phTag = sp.match(/<p:ph\s[^>]*\/?>/)?.[0] ?? "";
    const phType = attr(phTag, "type");
    const isTitle = phType === "title" || phType === "ctrTitle";
    const lines: string[] = [];
    for (const p of blocks(sp, "a:p")) {
      const text = drawingParaText(p);
      if (!text) continue;
      const pPr = p.match(/<a:pPr\s[^>]*\/?>/)?.[0] ?? "";
      const lvl = Number(attr(pPr, "lvl") ?? 0);
      lines.push(isTitle ? text : `${"  ".repeat(Math.min(4, lvl))}- ${text}`);
    }
    if (lines.length) shapes.push({ title: isTitle, lines });
  }

  for (const frame of blocks(xml, "p:graphicFrame")) {
    const tbl = firstBlock(frame, "a:tbl");
    if (!tbl) continue;
    const md = drawingTable(tbl.inner);
    if (md) tables.push(md);
  }

  return { shapes, tables };
}

function slideText(xml: string, index: number, notes: string): string {
  const { shapes, tables } = slideShapes(xml);
  const title = shapes.find((s) => s.title)?.lines.join(" — ") ?? "";
  const out: string[] = [`## Slide ${index}${title ? `: ${title}` : ""}`];
  shapes.filter((s) => !s.title).forEach((s) => out.push(s.lines.join("\n")));
  tables.forEach((t) => out.push(t));
  if (notes) out.push(`Speaker notes: ${notes}`);
  return out.length > 1 ? tidy(out.join("\n\n")) : "";
}

// --------------------------------------------------------------------- Excel

function sharedStrings(xml: string): string[] {
  return blocks(xml, "si").map((si) =>
    collapse(
      [...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeEntities(m[1])).join(""),
    ),
  );
}

function sheetRows(xml: string, strings: string[]): string[][] {
  return blocks(xml, "row").map((row) => {
    const cells: string[] = [];
    const re = /<c(\s[^>]*)?(\/?)>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(row))) {
      const tag = m[0];
      if (m[2] === "/") {
        cells.push("");
        continue;
      }
      const end = matchingClose(row, "c", re.lastIndex);
      const inner = row.slice(re.lastIndex, end);
      re.lastIndex = end;
      const type = attr(tag, "t");
      const raw = inner.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1] ?? "";
      if (type === "s") cells.push(strings[Number(raw)] ?? "");
      else if (type === "inlineStr")
        cells.push(
          collapse(
            [...inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
              .map((x) => decodeEntities(x[1]))
              .join(""),
          ),
        );
      else cells.push(decodeEntities(raw));
    }
    return cells;
  });
}

// -------------------------------------------------------------------- public

export async function extractOfficeText(
  bytes: Uint8Array,
  ext: "docx" | "pptx" | "xlsx",
): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files);
  const read = async (name: string) => {
    const file = zip.file(name);
    return file ? await file.async("string") : "";
  };
  const numeric = (n: string) => Number(n.match(/(\d+)/)?.[1] ?? 0);

  if (ext === "docx") {
    const chunks: string[] = [];
    const main = await read("word/document.xml");
    if (main) chunks.push(wordBody(firstBlock(main, "w:body")?.inner ?? main));
    for (const name of names
      .filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n))
      .sort((a, b) => a.localeCompare(b))) {
      const text = wordBody(await read(name));
      if (text) chunks.push(`> ${/header/.test(name) ? "Header" : "Footer"}: ${text}`);
    }
    return tidy(chunks.filter(Boolean).join("\n\n"));
  }

  if (ext === "pptx") {
    const slides = names
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => numeric(a) - numeric(b));
    const chunks: string[] = [];
    for (let i = 0; i < slides.length; i += 1) {
      const name = slides[i];
      const notesName = `ppt/notesSlides/notesSlide${numeric(name)}.xml`;
      const notesXml = names.includes(notesName) ? await read(notesName) : "";
      const notes = notesXml
        ? collapse(blocks(notesXml, "a:p").map(drawingParaText).filter(Boolean).join(" "))
        : "";
      const text = slideText(await read(name), i + 1, notes);
      if (text) chunks.push(text);
    }
    return tidy(chunks.join("\n\n"));
  }

  const strings = sharedStrings(await read("xl/sharedStrings.xml"));
  const workbook = await read("xl/workbook.xml");
  const sheetNames = [...workbook.matchAll(/<sheet\s[^>]*\/?>/g)].map(
    (m) => decodeEntities(attr(m[0], "name") ?? "") || "Sheet",
  );
  const sheets = names
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => numeric(a) - numeric(b));
  const chunks: string[] = [];
  for (let i = 0; i < sheets.length; i += 1) {
    const rows = sheetRows(await read(sheets[i]), strings).filter((r) => r.some((c) => c));
    if (!rows.length) continue;
    chunks.push([`## ${sheetNames[i] ?? `Sheet ${i + 1}`}`, markdownTable(rows)].join("\n\n"));
  }
  return tidy(chunks.join("\n\n"));
}
