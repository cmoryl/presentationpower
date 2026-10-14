// -----------------------------------------------------------------------------
// Print preflight — runs before a press PDF is rasterised. Pure scoring in
// `scorePrintPreflight` (testable), DOM measurement in `measurePrintPages`.
//
// fail  → blocks the press download (low-res image, missing bleed, font not
//         loaded). warn → shown, does not block (thin strokes, RGB-only).
// RGB is the house colour space; we never convert, we only state it.
// -----------------------------------------------------------------------------

export type PrintPreflightLevel = "fail" | "warn" | "pass";

export interface PrintPreflightIssue {
  id: string;
  level: PrintPreflightLevel;
  title: string;
  detail: string;
  page?: number;
}

export interface MeasuredImage {
  page: number;
  src: string;
  naturalW: number;
  naturalH: number;
  /** Rendered size as a fraction of the page width/height (0–1). */
  fracW: number;
  fracH: number;
}

export interface PrintPreflightInput {
  format: "press" | "press-x4" | "digital";
  trimWidthIn: number;
  trimHeightIn: number;
  bleedIn: number;
  images: MeasuredImage[];
  /** Font families used on the pages that the browser has not loaded. */
  missingFonts: string[];
  /** Thinnest visible stroke/border found, in points, if any. */
  thinnestStrokePt?: number;
}

/** Below this an image prints soft; offset standard is 300. */
export const MIN_PRINT_PPI = 150;
export const MIN_BLEED_IN = 0.125;
export const MIN_STROKE_PT = 0.25;

export function scorePrintPreflight(input: PrintPreflightInput): PrintPreflightIssue[] {
  const out: PrintPreflightIssue[] = [];
  if (input.format === "digital") return out;

  if (input.bleedIn < MIN_BLEED_IN) {
    out.push({
      id: "bleed",
      level: "fail",
      title: "No bleed",
      detail: `Press files need at least ${MIN_BLEED_IN} in bleed on every edge. Choose ⅛ in bleed or a digital download.`,
    });
  }

  for (const img of input.images) {
    const wIn = img.fracW * input.trimWidthIn;
    const hIn = img.fracH * input.trimHeightIn;
    if (wIn < 0.25 || hIn < 0.25 || !img.naturalW) continue;
    const ppi = Math.min(img.naturalW / wIn, img.naturalH / hIn);
    if (ppi < MIN_PRINT_PPI) {
      const name = decodeURIComponent(img.src.split("?")[0].split("/").pop() || "image");
      out.push({
        id: `lowres-${img.page}-${name}`,
        level: "fail",
        page: img.page,
        title: `Low-resolution image on page ${img.page + 1}`,
        detail: `${name.slice(0, 60)} prints at about ${Math.round(ppi)} ppi (needs ${MIN_PRINT_PPI}+, ideally 300). Replace it with a larger file or make it smaller on the page.`,
      });
    }
  }

  for (const f of input.missingFonts) {
    out.push({
      id: `font-${f}`,
      level: "fail",
      title: `Font not loaded: ${f}`,
      detail: "The file would print in a substitute font. Reload the page and try again.",
    });
  }

  if (input.thinnestStrokePt !== undefined && input.thinnestStrokePt < MIN_STROKE_PT) {
    out.push({
      id: "thin-stroke",
      level: "warn",
      title: "Very thin lines",
      detail: `A line is about ${input.thinnestStrokePt.toFixed(2)} pt; under ${MIN_STROKE_PT} pt may not hold on press.`,
    });
  }

  out.push({
    id: "rgb",
    level: "warn",
    title: "RGB colour",
    detail: "This file is in the house RGB colour space. Your printer converts it; nothing is converted here.",
  });

  if (!out.some((i) => i.level === "fail")) {
    out.unshift({ id: "ok", level: "pass", title: "Ready for press", detail: "Images, bleed and fonts passed." });
  }
  return out;
}

/** Measure images, fonts and strokes on the live page nodes (browser only). */
export function measurePrintPages(
  pages: HTMLElement[],
  trimWidthIn: number,
): Pick<PrintPreflightInput, "images" | "missingFonts" | "thinnestStrokePt"> {
  const images: MeasuredImage[] = [];
  const families = new Set<string>();
  let thinnest: number | undefined;

  pages.forEach((page, pi) => {
    const box = page.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const ptPerPx = (trimWidthIn * 72) / box.width;
    page.querySelectorAll("img").forEach((img) => {
      if (img.closest('[data-export-ignore="true"]')) return;
      const r = img.getBoundingClientRect();
      if (!r.width || !r.height) return;
      images.push({
        page: pi,
        src: img.currentSrc || img.src,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        fracW: r.width / box.width,
        fracH: r.height / box.height,
      });
    });
    page.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (el.closest('[data-export-ignore="true"]')) return;
      const cs = getComputedStyle(el);
      if (el.childNodes.length && el.textContent?.trim()) {
        const fam = cs.fontFamily.split(",")[0]?.replace(/["']/g, "").trim();
        if (fam) families.add(`${cs.fontWeight} 12px "${fam}"`);
      }
      const bw = parseFloat(cs.borderTopWidth);
      if (bw > 0 && cs.borderTopStyle !== "none") {
        const pt = bw * ptPerPx;
        if (thinnest === undefined || pt < thinnest) thinnest = pt;
      }
    });
  });

  const missingFonts: string[] = [];
  const generic = /^(sans-serif|serif|monospace|system-ui|ui-sans-serif|-apple-system|inherit)$/i;
  if (typeof document !== "undefined" && document.fonts) {
    for (const spec of families) {
      const fam = spec.match(/"(.+)"/)?.[1] ?? "";
      if (generic.test(fam)) continue;
      try {
        if (!document.fonts.check(spec)) missingFonts.push(fam);
      } catch {
        /* unparseable spec — skip */
      }
    }
  }
  return { images, missingFonts: [...new Set(missingFonts)], thinnestStrokePt: thinnest };
}

export class PrintPreflightError extends Error {
  issues: PrintPreflightIssue[];
  constructor(issues: PrintPreflightIssue[]) {
    const fails = issues.filter((i) => i.level === "fail");
    super(`Print check failed: ${fails.map((f) => f.title).join("; ")}`);
    this.issues = issues;
  }
}
