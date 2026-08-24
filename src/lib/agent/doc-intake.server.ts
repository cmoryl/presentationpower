// OOXML text extraction (Word / PowerPoint / Excel) using JSZip. Pure JS so it
// runs inside the Worker runtime.
import JSZip from "jszip";

function stripXml(xml: string, paraTags: RegExp): string {
  return xml
    .replace(/<\/(w:p|a:p|w:tr|row)>/g, "\n")
    .replace(/<w:br[^>]*\/?>/g, "\n")
    .replace(/<a:br[^>]*\/?>/g, "\n")
    .replace(paraTags, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractOfficeText(
  bytes: Uint8Array,
  ext: "docx" | "pptx" | "xlsx",
): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files);
  const targets =
    ext === "docx"
      ? names.filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))
      : ext === "pptx"
        ? names
            .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
            .sort(
              (a, b) =>
                Number(a.match(/(\d+)/)?.[1] ?? 0) - Number(b.match(/(\d+)/)?.[1] ?? 0),
            )
        : names.filter((n) => /^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(n));

  const chunks: string[] = [];
  for (const name of targets) {
    const file = zip.file(name);
    if (!file) continue;
    const xml = await file.async("string");
    const text = stripXml(xml, /<\/?[a-z]+:?[a-zA-Z]*[^>]*>/g);
    if (text) chunks.push(text);
  }
  return chunks.join("\n\n").trim();
}
