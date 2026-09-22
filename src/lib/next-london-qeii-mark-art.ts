// -----------------------------------------------------------------------------
// QEII Centre floor plan — division lockups as live vector artwork.
//
// The plan links each approved lockup by URL (`<image href>`), which nothing
// downstream can follow: Illustrator opens an empty frame, Office skips it
// entirely, and the exported SVG only works while the site is reachable. This
// reads the approved lockup file itself and hands back its outlines, so the
// lockup can be written into an export as real vector paths — editable artwork,
// not a placed picture and not a raster stand-in.
//
// Honest limits, reported by the caller rather than hidden:
// - Only the approved artwork is used. A lockup file we cannot read, or one that
//   carries live type instead of outlines, is reported and left off; nothing is
//   ever redrawn or substituted.
// - The lockup's own colours are kept exactly as the approved file sets them.
// -----------------------------------------------------------------------------

import { NEXT_APP_ORIGIN } from "@/lib/next-event";
import { qeiiPlanLayout } from "@/lib/next-london-qeii-layout";
import {
  qeiiMarkUrl,
  type QeiiMarkVariant,
  type QeiiPlanOptions,
} from "@/lib/next-london-qeii-plan";
import { qeiiColourPaint, qeiiRoomTextInk } from "@/lib/next-london-qeii-rooms";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";
import { parseSvgArtwork, type PlacedArtPath } from "@/lib/next-london-placed-art";
import { parseSvgPathCmds } from "@/lib/export-clip-geom";
import type { QeiiDrawShape, QeiiSeg } from "@/lib/next-london-qeii-draw";

/** One lockup, placed on the plan in plan units. */
export type QeiiMarkBox = {
  /** Division name, used for the layer name and the alt text. */
  name: string;
  /** Approved lockup file for the variant this room needs. */
  url: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Rotation the plan gives the room's label row, in degrees. */
  angle: number;
};

/** An approved lockup read as outlines, in its own user space (y down). */
export type QeiiMarkArt = { w: number; h: number; paths: PlacedArtPath[] };

/**
 * Where every division lockup sits on this floor.
 *
 * Shared by the Illustrator, PowerPoint, Word and SVG exports so one plan never
 * places a lockup in a different spot from another.
 */
export function qeiiMarkBoxes(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): QeiiMarkBox[] {
  if ((options.showLabels ?? true) === false) return [];
  const roomColours = options.roomColours ?? {};
  const paint = qeiiColourPaint(floor, roomColours);
  const layout = qeiiPlanLayout(floor, {
    labelScale: options.labelScale ?? 1,
    showUse: options.showUse,
    showMarks: options.showMarks,
    markScale: options.markScale,
    edits: options.edits,
  });
  const out: QeiiMarkBox[] = [];
  for (const block of layout.blocks) {
    if (!block.marks.length) continue;
    const tag = paint.tags.get(block.room) ?? roomColours[block.room];
    const ink = tag ? qeiiRoomTextInk(tag) : "#FFFFFF";
    // A light room fill would swallow the reverse lockup, exactly as on screen.
    const variant: QeiiMarkVariant =
      ink === "#03002C" && (options.markVariant ?? "reverse") === "reverse"
        ? "colour"
        : (options.markVariant ?? "reverse");
    const nameTop = block.y - ((block.lines.length - 1) * block.size * 1.05) / 2;
    const row =
      block.marks.reduce((w, m) => w + block.markH * m.ratio + block.size * 0.35, 0) -
      block.size * 0.35;
    let markX = block.x - row / 2;
    for (const m of block.marks) {
      const w = block.markH * m.ratio;
      const x = markX;
      markX += w + block.size * 0.35;
      out.push({
        name: m.name,
        url: qeiiMarkUrl(m, variant),
        cx: x + w / 2,
        cy: nameTop - block.size * 0.7 - block.markH / 2,
        w,
        h: block.markH,
        angle: block.angle,
      });
    }
  }
  return out;
}

/**
 * Fold class-based fills into attributes.
 *
 * The approved lockups are Illustrator SVG exports, which colour every shape
 * through a `<style>` block (`.st0 { fill: #1590ef }`). A path-level reader sees
 * no fill at all and would paint the whole lockup black, so the stylesheet is
 * resolved onto the shapes first.
 */
export function qeiiInlineSvgClassFills(source: string): string {
  const doc =
    typeof DOMParser === "undefined"
      ? null
      : new DOMParser().parseFromString(source, "image/svg+xml");
  if (!doc) return inlineClassFillsByText(source);
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") return source;
  const rules = new Map<string, Record<string, string>>();
  for (const style of Array.from(root.getElementsByTagName("style"))) {
    const css = style.textContent ?? "";
    for (const rule of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const decls: Record<string, string> = {};
      for (const decl of rule[2]!.split(";")) {
        const at = decl.indexOf(":");
        if (at <= 0) continue;
        decls[decl.slice(0, at).trim().toLowerCase()] = decl.slice(at + 1).trim();
      }
      for (const selector of rule[1]!.split(",")) {
        const hit = /^\s*\.([A-Za-z0-9_-]+)\s*$/.exec(selector);
        if (!hit) continue;
        rules.set(hit[1]!, { ...(rules.get(hit[1]!) ?? {}), ...decls });
      }
    }
  }
  if (!rules.size) return source;
  const props = ["fill", "fill-opacity", "fill-rule", "opacity", "stroke"];
  for (const el of Array.from(root.getElementsByTagName("*"))) {
    const classes = el.getAttribute("class");
    if (!classes) continue;
    for (const name of classes.split(/\s+/)) {
      const decls = rules.get(name);
      if (!decls) continue;
      for (const prop of props) {
        const value = decls[prop];
        // An attribute already on the shape wins, as the browser would paint it.
        if (value && !el.getAttribute(prop)) el.setAttribute(prop, value);
      }
    }
  }
  return new XMLSerializer().serializeToString(root);
}

/**
 * The same fold, done on the text.
 *
 * Used where no document parser exists, so an export never quietly loses the
 * lockup's colours and paints it black.
 */
function inlineClassFillsByText(source: string): string {
  const rules = new Map<string, string>();
  for (const rule of source.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const fill = /(?:^|;)\s*fill\s*:\s*([^;]+)/.exec(rule[2]!)?.[1]?.trim();
    if (!fill) continue;
    for (const selector of rule[1]!.split(",")) {
      const hit = /^\s*\.([A-Za-z0-9_-]+)\s*$/.exec(selector);
      if (hit) rules.set(hit[1]!, fill);
    }
  }
  if (!rules.size) return source;
  return source.replace(/<(path|polygon|polyline|rect|circle|ellipse)\b([^>]*)>/g, (tag, name, attrs) => {
    if (/\bfill\s*=/.test(attrs)) return tag;
    const classes = /class="([^"]*)"/.exec(attrs)?.[1];
    if (!classes) return tag;
    for (const cls of classes.split(/\s+/)) {
      const fill = rules.get(cls);
      if (fill) return `<${name}${attrs} fill="${fill}">`;
    }
    return tag;
  });
}

/** Read one approved lockup file as outlines, or say honestly that we cannot. */
export function qeiiLockupArtFromSvg(source: string, name: string): QeiiMarkArt | null {
  try {
    const { art } = parseSvgArtwork(qeiiInlineSvgClassFills(source), name);
    if (!art.paths.length) return null;
    return { w: art.w, h: art.h, paths: art.paths };
  } catch {
    // A lockup with live type, an embedded photo or unreadable geometry is left
    // off and reported by the caller — never approximated.
    return null;
  }
}

const artCache = new Map<string, QeiiMarkArt | null>();

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`${res.status}`);
  return await res.text();
}

/**
 * Fetch and read the approved lockup at this URL.
 *
 * The plan links a lockup by its full site URL so a handed-on file still finds
 * it; inside this app the same file sits on our own origin, which is the only
 * place a browser will let us read the bytes from, so that is tried first.
 */
export async function qeiiFetchMarkArt(url: string, name: string): Promise<QeiiMarkArt | null> {
  if (artCache.has(url)) return artCache.get(url) ?? null;
  const candidates = [url];
  if (url.startsWith(NEXT_APP_ORIGIN)) candidates.unshift(url.slice(NEXT_APP_ORIGIN.length));
  let art: QeiiMarkArt | null = null;
  for (const candidate of candidates) {
    try {
      art = qeiiLockupArtFromSvg(await fetchText(candidate), name);
      if (art) break;
    } catch {
      // Try the next candidate; a total failure is reported by the caller.
    }
  }
  artCache.set(url, art);
  return art;
}

/** One lockup ready to write into an export, with its outlines attached. */
export type QeiiMarkPlacement = QeiiMarkBox & { art: QeiiMarkArt };

/**
 * Every lockup on this floor, as vector artwork.
 *
 * `dropped` names the lockups whose approved file could not be read as
 * outlines, so the caller can say so rather than print a gap.
 */
export async function qeiiMarkVectors(
  floor: QeiiFloorVector,
  options: QeiiPlanOptions = {},
): Promise<{ placements: QeiiMarkPlacement[]; dropped: string[] }> {
  const boxes = qeiiMarkBoxes(floor, options);
  const placements: QeiiMarkPlacement[] = [];
  const dropped: string[] = [];
  for (const box of boxes) {
    const art = await qeiiFetchMarkArt(box.url, box.name);
    if (!art) {
      dropped.push(box.name);
      continue;
    }
    placements.push({ ...box, art });
  }
  return { placements, dropped };
}

/**
 * Every lockup on this floor as plan-unit shapes, for the Office exports.
 *
 * Office cannot follow a linked image and a pasted PNG is not editable, so each
 * lockup outline is transformed into the plan's own coordinate space — artwork
 * matrix, fit, rotation and placement all baked in — and handed back as plain
 * segment lists PowerPoint and Word rebuild as their own shapes.
 *
 * `unsupported` names any lockup whose outlines use a path command this cannot
 * read, so the caller reports it instead of printing a gap.
 */
export function qeiiMarkPlanShapes(placements: QeiiMarkPlacement[]): {
  shapes: QeiiDrawShape[];
  placed: string[];
  unsupported: string[];
} {
  const shapes: QeiiDrawShape[] = [];
  const placed: string[] = [];
  const unsupported: string[] = [];
  for (const mark of placements) {
    const fit = Math.min(mark.w / mark.art.w, mark.h / mark.art.h);
    const rad = (mark.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const at = (px: number, py: number, m: PlacedArtPath["m"]) => {
      const ax = m[0] * px + m[2] * py + m[4];
      const ay = m[1] * px + m[3] * py + m[5];
      const bx = (ax - mark.art.w / 2) * fit;
      const by = (ay - mark.art.h / 2) * fit;
      return { x: mark.cx + bx * cos - by * sin, y: mark.cy + bx * sin + by * cos };
    };
    const markShapes: QeiiDrawShape[] = [];
    let failed = false;
    for (const path of mark.art.paths) {
      const cmds = parseSvgPathCmds(path.d);
      if (!cmds) {
        failed = true;
        break;
      }
      const segs: QeiiSeg[] = [];
      for (const cmd of cmds) {
        if (cmd.c === "M") {
          if (segs.length) segs.push({ k: "Z" });
          const p = at(cmd.x, cmd.y, path.m);
          segs.push({ k: "M", x: p.x, y: p.y });
        } else if (cmd.c === "L") {
          const p = at(cmd.x, cmd.y, path.m);
          segs.push({ k: "L", x: p.x, y: p.y });
        } else {
          const c1 = at(cmd.x1, cmd.y1, path.m);
          const c2 = at(cmd.x2, cmd.y2, path.m);
          const p = at(cmd.x, cmd.y, path.m);
          segs.push({ k: "C", x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, x: p.x, y: p.y });
        }
      }
      if (segs.length) segs.push({ k: "Z" });
      const fill = (path.fill ?? "").trim();
      const painted = /^#[0-9a-f]{6}$/i.test(fill) ? fill : null;
      if (segs.length > 1 && painted) markShapes.push({ segs, fill: painted, strokeW: 0 });
    }
    if (failed || !markShapes.length) {
      unsupported.push(mark.name);
      continue;
    }
    shapes.push(...markShapes);
    placed.push(mark.name);
  }
  return { shapes, placed, unsupported };
}

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Swap every linked lockup in an exported plan SVG for its own outlines.
 *
 * A handed-on SVG then carries the approved artwork inside it: live vector
 * shapes that open in Illustrator, print without the site being reachable, and
 * never show a broken-image frame.
 */
export async function qeiiVectoriseSvgLockups(
  svg: string,
): Promise<{ svg: string; placed: number; dropped: string[] }> {
  const tags = [...svg.matchAll(/<image\b[^>]*\/>/g)].map((m) => m[0]);
  const dropped: string[] = [];
  let placed = 0;
  for (const tag of tags) {
    const href = /href="([^"]+)"/.exec(tag)?.[1];
    if (!href || href.startsWith("data:")) continue;
    const attr = (name: string) => Number(new RegExp(`${name}="([-\\d.]+)"`).exec(tag)?.[1] ?? NaN);
    const x = attr("x");
    const y = attr("y");
    const w = attr("width");
    const h = attr("height");
    const transform = /transform="([^"]+)"/.exec(tag)?.[1];
    const name = href.split("/").pop() ?? "lockup";
    const art = [x, y, w, h].every((n) => Number.isFinite(n))
      ? await qeiiFetchMarkArt(href, name)
      : null;
    if (!art) {
      dropped.push(name);
      continue;
    }
    // The lockup is fitted the way the plan places it: centred inside its box at
    // the artwork's own aspect, exactly as preserveAspectRatio="xMidYMid meet".
    const k = Math.min(w / art.w, h / art.h);
    const ox = x + (w - art.w * k) / 2;
    const oy = y + (h - art.h * k) / 2;
    const body = art.paths
      .map((path) => {
        const m = path.m;
        const tx =
          m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0
            ? ""
            : ` transform="matrix(${m.map((n) => Number(n.toFixed(6))).join(" ")})"`;
        const rule = path.fillRule === "evenodd" ? ` fill-rule="evenodd"` : "";
        const alpha = path.alpha !== undefined ? ` fill-opacity="${path.alpha.toFixed(3)}"` : "";
        return `<path d="${xml(path.d)}" fill="${path.fill}"${rule}${alpha}${tx}/>`;
      })
      .join("");
    const group =
      `<g data-layer="division-lockup" data-artwork="${xml(name)}"` +
      `${transform ? ` transform="${xml(transform)} translate(${ox} ${oy}) scale(${k})"` : ` transform="translate(${ox} ${oy}) scale(${k})"`}>` +
      `${body}</g>`;
    svg = svg.split(tag).join(group);
    placed += 1;
  }
  return { svg, placed, dropped };
}
