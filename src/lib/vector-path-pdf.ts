// SVG path data → PDF content-stream path operators.
//
// Used when a logo lockup has to be drawn into a generated `.ai` (which is
// PDF-compatible): the same outline geometry that ships in the .eps/.svg
// masters is written as live PDF path objects, so the lockup opens in
// Illustrator as editable vector art rather than a placed raster.

export type PdfPathTransform = {
  /** Scale applied to the path's own units. */
  scale: number;
  /** Translation in PDF points, applied after scaling. */
  x: number;
  y: number;
  /** Height of the artwork box, in path units — used to flip SVG's y-down axis. */
  artHeight: number;
};

type Point = { x: number; y: number };

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

function tokenize(d: string): (string | number)[] {
  const out: (string | number)[] = [];
  const source = d.replace(/[\s\n\r\t]+/g, " ");
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;
    if (/[MLHVCSZmlhvcsz]/.test(ch)) {
      out.push(ch);
      i += 1;
      continue;
    }
    if (/[\s,]/.test(ch)) {
      i += 1;
      continue;
    }
    NUM.lastIndex = i;
    const m = NUM.exec(source);
    if (!m || m.index !== i) {
      i += 1;
      continue;
    }
    out.push(Number(m[0]));
    i = m.index + m[0].length;
  }
  return out;
}

/**
 * Convert one SVG path to PDF operators. Supports the command set Illustrator
 * writes for logo outlines: M/L/H/V/C/S/Z in both absolute and relative form.
 */
export function svgPathToPdfOps(d: string, t: PdfPathTransform): string {
  const tokens = tokenize(d);
  const ops: string[] = [];
  const map = (p: Point): Point => ({
    x: t.x + p.x * t.scale,
    y: t.y + (t.artHeight - p.y) * t.scale,
  });
  const f = (n: number) => (Math.round(n * 1000) / 1000).toString();
  const moveTo = (p: Point) => {
    const q = map(p);
    ops.push(`${f(q.x)} ${f(q.y)} m`);
  };
  const lineTo = (p: Point) => {
    const q = map(p);
    ops.push(`${f(q.x)} ${f(q.y)} l`);
  };
  const curveTo = (c1: Point, c2: Point, p: Point) => {
    const a = map(c1);
    const b = map(c2);
    const q = map(p);
    ops.push(`${f(a.x)} ${f(a.y)} ${f(b.x)} ${f(b.y)} ${f(q.x)} ${f(q.y)} c`);
  };

  let cursor: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let lastControl: Point | null = null;
  let command = "";
  let i = 0;

  const num = () => {
    const v = tokens[i];
    i += 1;
    return typeof v === "number" ? v : 0;
  };

  while (i < tokens.length) {
    const token = tokens[i];
    if (typeof token === "string") {
      command = token;
      i += 1;
      if (command === "Z" || command === "z") {
        ops.push("h");
        cursor = { ...start };
        lastControl = null;
        continue;
      }
    }
    if (typeof tokens[i] !== "number" && command !== "Z" && command !== "z") {
      i += 1;
      continue;
    }
    const rel = command === command.toLowerCase();
    const base = rel ? cursor : { x: 0, y: 0 };
    switch (command.toUpperCase()) {
      case "M": {
        const p = { x: base.x + num(), y: base.y + num() };
        moveTo(p);
        cursor = p;
        start = p;
        lastControl = null;
        command = rel ? "l" : "L";
        break;
      }
      case "L": {
        const p = { x: base.x + num(), y: base.y + num() };
        lineTo(p);
        cursor = p;
        lastControl = null;
        break;
      }
      case "H": {
        const p = { x: base.x + num(), y: cursor.y };
        lineTo(p);
        cursor = p;
        lastControl = null;
        break;
      }
      case "V": {
        const p = { x: cursor.x, y: base.y + num() };
        lineTo(p);
        cursor = p;
        lastControl = null;
        break;
      }
      case "C": {
        const c1 = { x: base.x + num(), y: base.y + num() };
        const c2 = { x: base.x + num(), y: base.y + num() };
        const p = { x: base.x + num(), y: base.y + num() };
        curveTo(c1, c2, p);
        cursor = p;
        lastControl = c2;
        break;
      }
      case "S": {
        const c2 = { x: base.x + num(), y: base.y + num() };
        const p = { x: base.x + num(), y: base.y + num() };
        const c1 = lastControl
          ? { x: 2 * cursor.x - lastControl.x, y: 2 * cursor.y - lastControl.y }
          : { ...cursor };
        curveTo(c1, c2, p);
        cursor = p;
        lastControl = c2;
        break;
      }
      default:
        i += 1;
        break;
    }
  }
  return ops.join(" ");
}

/** Bounding box of a path in its own units — used for sanity checks and QA. */
export function svgPathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const tokens = tokenize(d).filter((t) => typeof t === "number") as number[];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    minX = Math.min(minX, tokens[i]!);
    maxX = Math.max(maxX, tokens[i]!);
    minY = Math.min(minY, tokens[i + 1]!);
    maxY = Math.max(maxY, tokens[i + 1]!);
  }
  return { minX, minY, maxX, maxY };
}
