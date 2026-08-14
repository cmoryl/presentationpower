/**
 * Paragraph-property ordering repair.
 *
 * pptxgenjs emits one `<a:pPr>` per text run when several runs in the same
 * paragraph carry paragraph-level options (align / lineSpacing / bullet). The
 * DrawingML schema allows exactly one `<a:pPr>`, and it must be the first child
 * of `<a:p>`. PowerPoint reacts to the extra mid-paragraph blocks by dropping
 * the whole shape ("PowerPoint couldn't read some content … and removed it"),
 * while LibreOffice and Graph silently tolerate them — which is why this only
 * ever surfaced in real PowerPoint.
 *
 * The repair keeps the first `<a:pPr>` of each paragraph, hoists it to the
 * front, and deletes the duplicates.
 */

/** Returns the end index (exclusive) of the element starting at `start`. */
function elementEnd(xml: string, start: number, tag: string): number {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let i = start;
  let depth = 0;
  while (i < xml.length) {
    const nextOpen = xml.indexOf(open, i);
    const nextClose = xml.indexOf(close, i);
    if (nextOpen >= 0 && (nextClose < 0 || nextOpen < nextClose)) {
      const gt = xml.indexOf(">", nextOpen);
      if (gt < 0) return xml.length;
      const selfClosing = xml[gt - 1] === "/";
      if (!selfClosing) depth += 1;
      else if (depth === 0) return gt + 1;
      i = gt + 1;
      continue;
    }
    if (nextClose < 0) return xml.length;
    depth -= 1;
    i = nextClose + close.length;
    if (depth <= 0) return i;
  }
  return xml.length;
}

export function withParagraphOrder(xml: string): string {
  if (!xml.includes("<a:pPr")) return xml;
  let out = "";
  let cursor = 0;
  while (true) {
    const pStart = xml.indexOf("<a:p>", cursor);
    if (pStart < 0) break;
    const pEnd = xml.indexOf("</a:p>", pStart);
    if (pEnd < 0) break;
    const inner = xml.slice(pStart + "<a:p>".length, pEnd);

    const blocks: string[] = [];
    let body = "";
    let i = 0;
    while (i < inner.length) {
      const at = inner.indexOf("<a:pPr", i);
      if (at < 0 || !/[\s/>]/.test(inner[at + 6] ?? "")) {
        body += inner.slice(i);
        break;
      }
      body += inner.slice(i, at);
      const end = elementEnd(inner, at, "a:pPr");
      blocks.push(inner.slice(at, end));
      i = end;
    }

    if (blocks.length === 0) {
      out += xml.slice(cursor, pEnd + "</a:p>".length);
    } else {
      out +=
        xml.slice(cursor, pStart) + "<a:p>" + blocks[0] + body + "</a:p>";
    }
    cursor = pEnd + "</a:p>".length;
  }
  return out + xml.slice(cursor);
}
