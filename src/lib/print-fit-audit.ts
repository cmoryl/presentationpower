// PRINT FIT AUDIT — measurement-driven correction pipeline
// ---------------------------------------------------------------------------
// Everything here reads the LIVE rendered page (never a predictive model) and
// turns those measurements into (a) a plain-language report and (b) concrete
// correction options the editor can apply with one click.
//
// Measurements are quantised on purpose: raw sub-pixel reflow numbers cause
// state churn (and therefore visible flicker) when they feed React state.

import type { PrintDensity, PrintPageSize } from "@/lib/print-assets.types";
import type { PrintFitKnobs } from "@/lib/print-content-fit";
import { pagePreset } from "@/lib/print-page-presets";

export type PrintFitOffender = {
  label: string;
  /** px past the trim edge (rendered canvas px). */
  pastPx: number;
};

export type PrintFitMeasurement = {
  /** Rendered page box in canvas px. */
  pageW: number;
  pageH: number;
  /** Full content height (may exceed pageH). */
  contentH: number;
  overflowPx: number;
  overflowFrac: number;
  /** Smallest rendered font size found in visible text, in canvas px. */
  minFontPx: number;
  /** Elements whose box sits outside the live side margins. */
  marginBreaches: number;
  /** Overlapping section modules (measured, not guessed). */
  collisions: number;
  /** Live side margin in canvas px (read from the page padding). */
  sideMarginPx: number;
  /** Worst three things falling past the trim. */
  offenders: PrintFitOffender[];
  /** Knobs in effect while measuring. */
  knobs: PrintFitKnobs;
};

export type PrintFitFix = {
  id: string;
  label: string;
  detail: string;
  /** Declarative payload — the editor decides how to persist each one. */
  scale?: number;
  pad?: number;
  heroHeightPct?: number;
  enableAutoFit?: boolean;
  threshold?: number;
  density?: PrintDensity;
  advisory?: boolean;
};

export type PrintFitFinding = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  fixes: PrintFitFix[];
};

export type PrintFitAuditInput = {
  hasHero: boolean;
  heroHeightPct: number;
  autoFitEnabled: boolean;
  minScale: number;
  minPad: number;
  pageSize: PrintPageSize;
  moduleCount: number;
};

const EMPTY_KNOBS: PrintFitKnobs = { scale: 1, pad: 1 };

function q(n: number, step = 2): number {
  return Math.round(n / step) * step;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));
}

function labelFor(el: HTMLElement): string {
  const mod = el.closest<HTMLElement>("[data-print-module]");
  if (mod?.dataset["printModule"]) return mod.dataset["printModule"];
  const sec = el.closest<HTMLElement>("[data-print-section]");
  if (sec?.dataset["printSection"]) return sec.dataset["printSection"];
  const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  if (text) return text.slice(0, 42) + (text.length > 42 ? "…" : "");
  return el.tagName.toLowerCase();
}

/** Read the live page and produce a stable, quantised measurement. */
export function measurePrintPage(
  host: HTMLElement | null,
  knobs: PrintFitKnobs = EMPTY_KNOBS,
): PrintFitMeasurement | null {
  if (!host) return null;
  const page = host.querySelector<HTMLElement>("[data-print-page]");
  if (!page) return null;

  const pageRect = page.getBoundingClientRect();
  const pageH = Math.round(page.clientHeight);
  const pageW = Math.round(page.clientWidth);
  if (pageH <= 0 || pageW <= 0) return null;

  const cs = getComputedStyle(page);
  const sideMarginPx = Math.round(
    (parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0")) / 2,
  );

  let worst = Math.max(0, page.scrollHeight - page.clientHeight);
  let minFontPx = Number.POSITIVE_INFINITY;
  let marginBreaches = 0;
  const offenders: PrintFitOffender[] = [];
  const boxes: Array<{ el: HTMLElement; top: number; bottom: number; label: string }> = [];

  const leftLimit = pageRect.left + sideMarginPx - 1.5;
  const rightLimit = pageRect.right - sideMarginPx + 1.5;

  for (const el of Array.from(page.querySelectorAll<HTMLElement>("*"))) {
    if (el.dataset["exportIgnore"] === "true") continue;
    const rect = el.getBoundingClientRect();
    if (rect.height < 1) continue;

    const past = rect.bottom - pageRect.bottom;
    if (past > 2) {
      worst = Math.max(worst, past);
      offenders.push({ label: labelFor(el), pastPx: Math.round(past) });
    }

    const style = getComputedStyle(el);
    const hasOwnText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 1,
    );
    if (hasOwnText) {
      const fs = parseFloat(style.fontSize || "0");
      if (fs > 0) minFontPx = Math.min(minFontPx, fs);
      const bleed = el.closest("[data-print-bleed]");
      if (!bleed && (rect.left < leftLimit || rect.right > rightLimit)) marginBreaches += 1;
    }

    if (el.dataset["printModule"]) {
      boxes.push({ el, top: rect.top, bottom: rect.bottom, label: labelFor(el) });
    }
  }

  // Measured collisions between sibling modules in the same flow.
  let collisions = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlap > 3) collisions += 1;
    }
  }

  offenders.sort((a, b) => b.pastPx - a.pastPx);
  const overflowPx = q(worst, 4);

  return {
    pageW,
    pageH,
    contentH: pageH + overflowPx,
    overflowPx,
    overflowFrac: pageH > 0 ? overflowPx / pageH : 0,
    minFontPx: Number.isFinite(minFontPx) ? Math.round(minFontPx * 10) / 10 : 0,
    marginBreaches,
    collisions,
    sideMarginPx,
    offenders: offenders.slice(0, 3),
    knobs,
  };
}

/** Uniform scale that would make the measured content fit exactly, with slack. */
export function scaleToFit(m: PrintFitMeasurement, floor = 0.6): number {
  if (m.contentH <= 0) return 1;
  const needed = (m.pageH / m.contentH) * m.knobs.scale;
  return clamp(Math.floor(needed * 100) / 100 - 0.01, floor, 1);
}

/** px → inches for the current page format (uses the measured page width). */
export function pxToInches(px: number, m: PrintFitMeasurement, size: PrintPageSize): number {
  const inches = pagePreset(size).widthIn;
  return m.pageW > 0 ? (px / m.pageW) * inches : 0;
}

export function formatInches(px: number, m: PrintFitMeasurement, size: PrintPageSize): string {
  return `${pxToInches(px, m, size).toFixed(2)}in`;
}

/** Turn a measurement into findings, each carrying ranked correction options. */
export function auditPrintPage(
  m: PrintFitMeasurement,
  input: PrintFitAuditInput,
): PrintFitFinding[] {
  const findings: PrintFitFinding[] = [];
  const pct = Math.round(m.overflowFrac * 100);

  if (m.overflowPx > 6) {
    const fixes: PrintFitFix[] = [];
    if (!input.autoFitEnabled) {
      fixes.push({
        id: "enable-autofit",
        label: "Turn on auto-fit",
        detail: "Let the page recover space automatically as copy grows.",
        enableAutoFit: true,
        threshold: 0.05,
      });
    }
    const needed = scaleToFit(m, input.minScale);
    if (needed < m.knobs.scale - 0.005) {
      fixes.push({
        id: "scale-to-fit",
        label: `Scale type & icons to ${Math.round(needed * 100)}%`,
        detail: "Measured shrink that clears the trim edge in one step.",
        scale: needed,
      });
    }
    if (m.knobs.pad > input.minPad + 0.005) {
      const pad = clamp(m.knobs.pad - 0.12, input.minPad, 1);
      fixes.push({
        id: "margin-relief",
        label: `Pull side margins to ${Math.round(pad * 100)}%`,
        detail: "Widens the measure so long paragraphs need fewer lines.",
        pad,
      });
    }
    if (input.hasHero && input.heroHeightPct > 24) {
      const next = Math.max(22, Math.round(input.heroHeightPct - pct - 2));
      if (next < input.heroHeightPct) {
        fixes.push({
          id: "hero-shrink",
          label: `Shrink hero to ${next}%`,
          detail: `Hero is ${Math.round(input.heroHeightPct)}% of the page — the cheapest space to reclaim.`,
          heroHeightPct: next,
        });
      }
    }
    if (input.moduleCount > 3) {
      fixes.push({
        id: "cut-copy",
        label: "Remove a module or trim copy",
        detail: `${input.moduleCount} modules on one page. Cutting one keeps type at full size.`,
        advisory: true,
      });
    }
    findings.push({
      id: "overflow",
      severity: pct >= 12 ? "critical" : "warning",
      title: `${pct}% of the page (${m.overflowPx}px) falls past the trim`,
      detail: m.offenders.length
        ? `Worst offender: ${m.offenders[0]!.label} (${m.offenders[0]!.pastPx}px past).`
        : "Content is clipped at the page edge and will not print.",
      fixes,
    });
  }

  if (m.collisions > 0) {
    findings.push({
      id: "collisions",
      severity: "warning",
      title: `${m.collisions} overlapping module${m.collisions > 1 ? "s" : ""}`,
      detail: "Two sections occupy the same vertical band, so text sits on top of text.",
      fixes: [
        {
          id: "collision-scale",
          label: `Scale to ${Math.round(clamp(m.knobs.scale - 0.06, input.minScale, 1) * 100)}%`,
          detail: "Reclaims vertical rhythm so stacked sections separate again.",
          scale: clamp(m.knobs.scale - 0.06, input.minScale, 1),
        },
        {
          id: "collision-density",
          label: "Set density to airy",
          detail: "Restores full section spacing.",
          density: "airy",
        },
      ],
    });
  }

  if (m.marginBreaches > 0) {
    findings.push({
      id: "margins",
      severity: "warning",
      title: `${m.marginBreaches} text block${m.marginBreaches > 1 ? "s" : ""} outside the live margin`,
      detail: `Live side margin measures ${formatInches(m.sideMarginPx, m, input.pageSize)}. Text this close to the trim can be cut by the guillotine.`,
      fixes: [
        {
          id: "margin-restore",
          label: "Restore full side margins",
          detail: "Sets the margin knob back to 100% and re-fits with type instead.",
          pad: 1,
        },
      ],
    });
  }

  if (m.minFontPx > 0 && m.minFontPx < 7.2) {
    findings.push({
      id: "tiny-type",
      severity: m.minFontPx < 6 ? "critical" : "warning",
      title: `Smallest type measures ${m.minFontPx}px (~${(pxToInches(m.minFontPx, m, input.pageSize) * 72).toFixed(1)}pt)`,
      detail: "Below roughly 7pt, print body copy stops being comfortably readable.",
      fixes: [
        {
          id: "tiny-type-reset",
          label: "Reset scale to 100%",
          detail: "Removes shrink relief; cut copy or add a page instead.",
          scale: 1,
        },
      ],
    });
  }

  if (!findings.length) {
    findings.push({
      id: "clean",
      severity: "info",
      title: "Page measures clean",
      detail: `Content fills ${Math.round((m.contentH / m.pageH) * 100)}% of the trim with no clipping, collisions, or margin breaches.`,
      fixes: [],
    });
  }

  return findings;
}

export function fitSummary(m: PrintFitMeasurement | null): string {
  if (!m) return "Not measured yet";
  if (m.overflowPx > 6) return `${Math.round(m.overflowFrac * 100)}% over`;
  return `${Math.round((m.contentH / m.pageH) * 100)}% of page used`;
}
