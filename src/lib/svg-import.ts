// -----------------------------------------------------------------------------
// SVG upload → canvas-ready vector artwork
// -----------------------------------------------------------------------------
// Users bring their own marks (client logos, custom pictograms, diagram parts).
// An uploaded SVG must become an ordinary canvas object: vector on screen AND
// vector in PPTX, which the export pipeline already handles for `data:image/
// svg+xml` sources (see pptx-raster-fallback: PNG blip + asvg:svgBlip).
//
// Uploaded markup is untrusted, so it is parsed and scrubbed before it is ever
// handed to an <img>: scripts, event handlers, external references and embedded
// HTML (foreignObject) are removed, and the root is given explicit dimensions
// plus a viewBox so the natural aspect is knowable.
// -----------------------------------------------------------------------------

export type ImportedSvg = {
  /** Sanitised, self-contained `data:image/svg+xml` URL. */
  src: string;
  /** Natural width / height from the viewBox (or width/height attributes). */
  aspect: number;
  /** Filename-derived label used for alt text. */
  alt: string;
};

const EVENT_ATTR = /^on/i;
const URL_ATTR = new Set(["href", "xlink:href", "src"]);
const BANNED_TAGS = new Set([
  "script",
  "foreignobject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "animate",
  "set",
  "handler",
]);

/** Remove anything executable or externally-referencing from parsed SVG markup. */
function scrub(root: Element) {
  for (const el of [...root.querySelectorAll("*"), root]) {
    if (BANNED_TAGS.has(el.tagName.toLowerCase())) {
      el.remove();
      continue;
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (EVENT_ATTR.test(name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      // Keep only in-document fragment refs (#gradient, #clip) — never http(s),
      // data: or javascript: pulls, which would phone out or execute on render.
      if (URL_ATTR.has(name) && !value.startsWith("#")) el.removeAttribute(attr.name);
      if (/url\(\s*['"]?(?!#)/i.test(value)) el.removeAttribute(attr.name);
      if (/javascript:/i.test(value)) el.removeAttribute(attr.name);
    }
  }
}

const num = (v: string | null) => {
  const n = Number.parseFloat((v ?? "").replace(/[a-z%]+$/i, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Turn raw SVG text into canvas-ready artwork. Returns null when the payload is
 * not parseable SVG, so callers can report a clean error instead of inserting a
 * broken picture.
 */
export function importSvgMarkup(markup: string, label: string): ImportedSvg | null {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml");
  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) return null;

  scrub(svg);

  const vb = (svg.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  let w = vb.length === 4 && vb[2] > 0 ? vb[2] : num(svg.getAttribute("width")) ?? 100;
  let h = vb.length === 4 && vb[3] > 0 ? vb[3] : num(svg.getAttribute("height")) ?? 100;
  if (!(w > 0) || !(h > 0)) {
    w = 100;
    h = 100;
  }

  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (vb.length !== 4) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  // Explicit pixel size keeps <img> and the PPTX raster fallback in agreement.
  svg.setAttribute("width", String(Math.round(w)));
  svg.setAttribute("height", String(Math.round(h)));
  svg.removeAttribute("style");

  const xml = new XMLSerializer().serializeToString(svg);
  return {
    src: `data:image/svg+xml;utf8,${encodeURIComponent(xml)}`,
    aspect: w / h,
    alt: `${label.replace(/\.svg$/i, "").replace(/[-_]+/g, " ").trim() || "Uploaded"} graphic`,
  };
}

/** Read + sanitise an uploaded `.svg` file. */
export async function importSvgFile(file: File): Promise<ImportedSvg | null> {
  if (!/svg/i.test(file.type) && !/\.svg$/i.test(file.name)) return null;
  return importSvgMarkup(await file.text(), file.name);
}
