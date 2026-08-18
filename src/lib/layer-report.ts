// -----------------------------------------------------------------------------
// Per-slide layering report.
//
// Reads a single `ppt/slides/slideN.xml` part and classifies every top-level
// object on the slide (text frames, photos, icons, logos, vector shapes and the
// rasterized design plate) so the export-verify page can state, object by
// object, whether the export is genuinely layered and editable in PowerPoint.
//
// Classification uses the `objectName` tags the exporter writes (see
// pptx-export.ts) and falls back to geometry heuristics for untagged objects.
// -----------------------------------------------------------------------------

const EMU_PER_IN = 914400;

export type LayerObjectType = "text" | "image" | "icon" | "logo" | "shape" | "plate";

export interface LayerObject {
  /** Drawing id from p:cNvPr. */
  id: string;
  /** PowerPoint object name, when the exporter tagged it. */
  name: string;
  type: LayerObjectType;
  /** Editable in PowerPoint: text can be retyped, shapes/pictures restyled. */
  editable: boolean;
  /** Independently selectable object rather than baked into the plate. */
  layered: boolean;
  /** Normalized 0..1 slide-space rect. */
  rect: { x: number; y: number; w: number; h: number };
  /** First line of copy for text objects (truncated). */
  text?: string;
  /** Why this object is not editable, when applicable. */
  note?: string;
}

export interface LayerReport {
  objects: LayerObject[];
  counts: Record<LayerObjectType, number>;
  /** Objects that are independently selectable. */
  layeredCount: number;
  /** Objects a user can retype or restyle in PowerPoint. */
  editableCount: number;
  /** True when the slide is one flat picture with nothing on top. */
  flattened: boolean;
  problems: string[];
}

export function parseSlideSizeEmu(presentationXml: string): { cx: number; cy: number } {
  const m = /<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(presentationXml);
  if (!m) return { cx: 13.333 * EMU_PER_IN, cy: 7.5 * EMU_PER_IN };
  return { cx: Number(m[1]), cy: Number(m[2]) };
}

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const EMPTY_COUNTS = (): Record<LayerObjectType, number> => ({
  text: 0,
  image: 0,
  icon: 0,
  logo: 0,
  shape: 0,
  plate: 0,
});

function isFullBleed(r: LayerObject["rect"]): boolean {
  return r.w >= 0.96 && r.h >= 0.96 && r.x <= 0.03 && r.y <= 0.03;
}

function classify(
  kind: "sp" | "pic",
  name: string,
  rect: LayerObject["rect"],
  hasText: boolean,
  slideInches: { w: number; h: number },
): { type: LayerObjectType; editable: boolean; note?: string } {
  const lower = name.toLowerCase();
  if (kind === "pic") {
    if (lower.includes("plate") || (isFullBleed(rect) && !lower.includes("photo"))) {
      return {
        type: "plate",
        editable: false,
        note: "rasterized design plate (CSS-only decor); content sits above it",
      };
    }
    if (lower.includes("logo")) return { type: "logo", editable: true };
    if (lower.includes("icon")) return { type: "icon", editable: true };
    if (lower.includes("photo")) return { type: "image", editable: true };
    // Untagged pictures: small squares read as icons, everything else as art.
    const wIn = rect.w * slideInches.w;
    const hIn = rect.h * slideInches.h;
    const square = Math.abs(wIn - hIn) < 0.18;
    if (square && wIn <= 1.1) return { type: "icon", editable: true };
    if (wIn <= 2.6 && hIn <= 1.1) return { type: "logo", editable: true };
    return { type: "image", editable: true };
  }
  if (hasText) return { type: "text", editable: true };
  return { type: "shape", editable: true };
}

/**
 * Classify every object on one slide part. `presentationXml` supplies the slide
 * size so rects normalize correctly for non-16:9 decks.
 */
export function buildLayerReport(slideXml: string, presentationXml: string): LayerReport {
  const size = parseSlideSizeEmu(presentationXml);
  const slideInches = { w: size.cx / EMU_PER_IN, h: size.cy / EMU_PER_IN };
  const objects: LayerObject[] = [];

  // Chart geometry is frequently emitted inside <p:grpSp> wrappers. Those group
  // children carry their own <a:off>/<a:ext>, so matching them the same way as
  // top-level shapes is enough — but the group wrapper itself must be stripped
  // first, otherwise its own frame would be counted as an extra object.
  const slideBody = slideXml.replace(/<p:grpSpPr\b[\s\S]*?<\/p:grpSpPr>/g, "");

  const blocks: Array<["sp" | "pic", RegExp]> = [
    ["sp", /<p:sp\b[\s\S]*?<\/p:sp>/g],
    ["pic", /<p:pic\b[\s\S]*?<\/p:pic>/g],
  ];

  for (const [kind, re] of blocks) {
    for (const block of slideBody.match(re) ?? []) {
      const off = /<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/.exec(block);
      const ext = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/.exec(block);
      const cn = /<p:cNvPr[^>]*\bid="(\d+)"[^>]*\bname="([^"]*)"/.exec(block);
      const runs = [...block.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1]));
      const rect = off && ext
        ? {
            x: Number(off[1]) / size.cx,
            y: Number(off[2]) / size.cy,
            w: Number(ext[1]) / size.cx,
            h: Number(ext[2]) / size.cy,
          }
        : { x: 0, y: 0, w: 0, h: 0 };
      const name = cn?.[2] ?? "";
      const hasText = runs.some((t) => t.trim().length > 0);
      const { type, editable, note } = classify(kind, name, rect, hasText, slideInches);
      objects.push({
        id: cn?.[1] ?? String(objects.length + 1),
        name,
        type,
        editable,
        layered: true,
        rect,
        text: hasText ? runs.join(" ").trim().slice(0, 80) : undefined,
        note,
      });
    }
  }

  objects.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);

  const counts = EMPTY_COUNTS();
  for (const o of objects) counts[o.type] += 1;

  const contentObjects = objects.filter((o) => o.type !== "plate");
  const problems: string[] = [];
  if (objects.length === 0) problems.push("slide has no objects at all");
  if (counts.text === 0) problems.push("no editable text objects");
  if (contentObjects.length === 0) problems.push("slide is a single flattened picture");
  if (counts.shape === 0 && counts.image === 0 && counts.icon === 0)
    problems.push("no native shapes, icons or pictures above the plate");

  return {
    objects,
    counts,
    layeredCount: objects.filter((o) => o.layered).length,
    editableCount: objects.filter((o) => o.editable).length,
    flattened: contentObjects.length === 0,
    problems,
  };
}
