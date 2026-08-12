// -----------------------------------------------------------------------------
// Native grouping (p:grpSp) for exported PPTX files
// -----------------------------------------------------------------------------
// pptxgenjs has no grouping API: every tile, card, KPI block or badge it writes
// lands as a pile of independent shapes, so a composite "card" cannot be moved
// or resized as one unit in PowerPoint and comes back as loose confetti on
// re-import.
//
// The exporter therefore *tags* the objects that belong together by prefixing
// their objectName with `[g:<id>|<label>]` (see `groupScope` in pptx-export.ts),
// and this module rewrites the finished slide XML: every run of tagged siblings
// inside p:spTree is wrapped in a real <p:grpSp> whose xfrm is the bounding box
// of its children, with chOff/chExt mirroring off/ext so child coordinates stay
// valid untouched. The tag itself is stripped from the visible object names.
//
// Failure is always non-fatal: callers fall back to the untouched XML.
// -----------------------------------------------------------------------------

/** Prefix written into `objectName` by the exporter for grouped objects. */
export const GROUP_TAG_RE = /^\[g:([^|\]]+)(?:\|([^\]]*))?\]\s*/;

/** Build the objectName prefix that marks an object as part of a group. */
export function groupTag(id: string, label?: string): string {
  return label ? `[g:${id}|${label}]` : `[g:${id}]`;
}

/** Remove any group tag from an object name (used for the visible name). */
export function stripGroupTag(name: string): string {
  return name.replace(GROUP_TAG_RE, "").trim();
}

type Segment =
  | { kind: "other"; xml: string }
  | { kind: "shape"; xml: string; groupId?: string; groupLabel?: string };

const SHAPE_TAGS = ["p:sp", "p:pic", "p:graphicFrame", "p:cxnSp", "p:grpSp"] as const;
const SHAPE_TAG_RE = new RegExp(
  // (?![A-Za-z]) not \\b: "p:grpSp" would otherwise also match "p:grpSpPr".
  `<(/?)(${SHAPE_TAGS.join("|")})(?![A-Za-z])([^>]*?)(/?)>`,
  "g",
);

/** Split spTree contents into top-level shape elements and everything else. */
function splitTopLevel(inner: string): Segment[] {
  const out: Segment[] = [];
  let depth = 0;
  let start = -1;
  let cursor = 0;
  SHAPE_TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SHAPE_TAG_RE.exec(inner))) {
    const closing = m[1] === "/";
    const selfClosing = m[4] === "/";
    if (!closing && !selfClosing) {
      if (depth === 0) {
        if (m.index > cursor) out.push({ kind: "other", xml: inner.slice(cursor, m.index) });
        start = m.index;
      }
      depth += 1;
    } else if (selfClosing) {
      if (depth === 0) {
        if (m.index > cursor) out.push({ kind: "other", xml: inner.slice(cursor, m.index) });
        out.push({ kind: "shape", xml: inner.slice(m.index, m.index + m[0].length) });
        cursor = m.index + m[0].length;
      }
    } else {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const end = m.index + m[0].length;
        out.push({ kind: "shape", xml: inner.slice(start, end) });
        cursor = end;
        start = -1;
      }
      if (depth < 0) depth = 0;
    }
  }
  if (cursor < inner.length) out.push({ kind: "other", xml: inner.slice(cursor) });
  return out;
}

interface Rect {
  x: number;
  y: number;
  cx: number;
  cy: number;
}

/** The shape's own offset/extent in EMU (first xfrm in its markup). */
function rectOf(xml: string): Rect | null {
  const off = /<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"\s*\/?>/.exec(xml);
  const ext = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\s*\/?>/.exec(xml);
  if (!off || !ext) return null;
  return { x: Number(off[1]), y: Number(off[2]), cx: Number(ext[1]), cy: Number(ext[2]) };
}

function unionOf(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.cx));
  const bottom = Math.max(...rects.map((r) => r.y + r.cy));
  return { x, y, cx: Math.max(1, right - x), cy: Math.max(1, bottom - y) };
}

function attrEscape(value: string): string {
  return value
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

/** Read the first cNvPr name of a shape element and pull out its group tag. */
function tagOf(xml: string): { groupId?: string; groupLabel?: string } {
  const name = /<p:cNvPr\b[^>]*\bname="([^"]*)"/.exec(xml)?.[1];
  if (!name) return {};
  const m = GROUP_TAG_RE.exec(name);
  if (!m) return {};
  return { groupId: m[1], groupLabel: m[2] };
}

/** Strip group tags from every cNvPr name in a fragment. */
function stripTags(xml: string): string {
  return xml.replace(/(<p:cNvPr\b[^>]*\bname=")([^"]*)(")/g, (_all, pre, name: string, post) => {
    const cleaned = stripGroupTag(name);
    return `${pre}${attrEscape(cleaned || "Object")}${post}`;
  });
}

function maxShapeId(xml: string): number {
  let max = 1;
  const re = /<p:cNvPr\b[^>]*\bid="(\d+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) max = Math.max(max, Number(m[1]));
  return max;
}

function grpSp(id: number, name: string, box: Rect, children: string): string {
  return (
    "<p:grpSp>" +
    `<p:nvGrpSpPr><p:cNvPr id="${id}" name="${attrEscape(name)}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>` +
    "<p:grpSpPr><a:xfrm>" +
    `<a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.cx}" cy="${box.cy}"/>` +
    `<a:chOff x="${box.x}" y="${box.y}"/><a:chExt cx="${box.cx}" cy="${box.cy}"/>` +
    "</a:xfrm></p:grpSpPr>" +
    children +
    "</p:grpSp>"
  );
}

/**
 * Wrap every tagged run of siblings inside p:spTree in a native p:grpSp so the
 * composite reads (and moves/resizes) as one object in PowerPoint. Objects that
 * carry no tag, and groups of fewer than two members, are left alone — a group
 * of one adds a selection level for no benefit.
 */
export function withGroups(xml: string): string {
  const open = xml.indexOf("<p:spTree");
  if (open < 0) return stripTags(xml);
  const bodyStart = xml.indexOf(">", open);
  const close = xml.lastIndexOf("</p:spTree>");
  if (bodyStart < 0 || close < 0 || close < bodyStart) return stripTags(xml);

  const head = xml.slice(0, bodyStart + 1);
  const inner = xml.slice(bodyStart + 1, close);
  const tail = xml.slice(close);

  const segments = splitTopLevel(inner).map((seg) =>
    seg.kind === "shape" ? { ...seg, ...tagOf(seg.xml) } : seg,
  ) as Segment[];

  const counts = new Map<string, number>();
  for (const seg of segments) {
    if (seg.kind === "shape" && seg.groupId) {
      counts.set(seg.groupId, (counts.get(seg.groupId) ?? 0) + 1);
    }
  }
  const groupable = new Set([...counts].filter(([, n]) => n >= 2).map(([id]) => id));
  if (groupable.size === 0) return stripTags(xml);

  let nextId = maxShapeId(xml) + 1;
  // Collect members per group; the group is emitted where its first member sat,
  // preserving z-order relative to ungrouped neighbours.
  const members = new Map<string, { xml: string[]; rects: Rect[]; label?: string }>();
  const order: string[] = [];
  const pieces: Array<{ kind: "xml"; xml: string } | { kind: "group"; id: string }> = [];

  for (const seg of segments) {
    if (seg.kind === "shape" && seg.groupId && groupable.has(seg.groupId)) {
      const id = seg.groupId;
      let bucket = members.get(id);
      if (!bucket) {
        bucket = { xml: [], rects: [], label: seg.groupLabel };
        members.set(id, bucket);
        order.push(id);
        pieces.push({ kind: "group", id });
      }
      bucket.xml.push(seg.xml);
      const r = rectOf(seg.xml);
      if (r) bucket.rects.push(r);
    } else {
      pieces.push({ kind: "xml", xml: seg.xml });
    }
  }

  const rendered = pieces
    .map((piece) => {
      if (piece.kind === "xml") return piece.xml;
      const bucket = members.get(piece.id)!;
      const children = bucket.xml.join("");
      if (bucket.rects.length === 0) return children; // no geometry → cannot box it
      const box = unionOf(bucket.rects);
      return grpSp(nextId++, bucket.label || `Group ${piece.id}`, box, children);
    })
    .join("");

  void order;
  return stripTags(`${head}${rendered}${tail}`);
}
