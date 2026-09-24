// -----------------------------------------------------------------------------
// Booklet preflight — the checks a print producer runs before a file goes to
// press, made deterministic so the builder can show them live.
//
// Levels: "fail" blocks a sensible press send, "warn" needs a human decision,
// "info" states a fact about the file (never a silent fallback), "pass" = OK.
// -----------------------------------------------------------------------------

import {
  bookletMaster,
  bookletNotesPages,
  type BookletConfig,
  type BookletPlanPage,
} from "./next-booklet";

export type PreflightLevel = "fail" | "warn" | "info" | "pass";

export type PreflightFix = { kind: "pad-notes"; pages: number };

export interface PreflightCheck {
  id: string;
  level: PreflightLevel;
  title: string;
  detail: string;
  /** Page index (0-based, running order) the check is about, when there is one. */
  page?: number;
  fix?: PreflightFix;
}

export interface PreflightInput {
  config: BookletConfig;
  plan: BookletPlanPage[];
  agendaSwapped: boolean;
  /** True when no saved agenda is picked and the demo programme prints. */
  agendaIsDemo: boolean;
  geo: { trimW: number; trimH: number; bleedEdge: number; safeInset: number };
}

/** Cover copy caps — what the printed cover holds at trim. */
export const COVER_CAPS = { eyebrow: 40, title: 60, subtitle: 96, footnote: 120 } as const;

/** Blank pages needed to reach the next multiple of 4 (saddle stitch). */
export function padToFour(count: number): number {
  return count <= 0 ? 0 : (4 - (count % 4)) % 4;
}

const ORDER: Record<PreflightLevel, number> = { fail: 0, warn: 1, info: 2, pass: 3 };

export function bookletPreflight(input: PreflightInput): PreflightCheck[] {
  const { config, plan, geo } = input;
  const out: PreflightCheck[] = [];
  const idx = (kind: BookletPlanPage["kind"]) => plan.findIndex((p) => p.kind === kind);

  if (!plan.length) {
    out.push({
      id: "empty",
      level: "fail",
      title: "No pages",
      detail: "Turn on the cover, agenda or maps, or add a chart page.",
    });
    return out;
  }

  // ── imposition ─────────────────────────────────────────────────────────
  const pad = padToFour(plan.length);
  if (pad) {
    out.push({
      id: "imposition",
      level: "warn",
      title: `${plan.length} pages — not a multiple of 4`,
      detail: `A saddle-stitched booklet folds in sheets of 4. Add ${pad} notes page${pad === 1 ? "" : "s"}, or remove pages.`,
      fix: { kind: "pad-notes", pages: bookletNotesPages(config) + pad },
    });
  } else {
    out.push({
      id: "imposition",
      level: "pass",
      title: `${plan.length} pages — saddle-stitch ready`,
      detail: "The page count folds evenly into sheets of 4.",
    });
  }

  // ── geometry ───────────────────────────────────────────────────────────
  out.push({
    id: "geometry",
    level: geo.bleedEdge >= 3 ? "pass" : "fail",
    title: `Trim ${geo.trimW} × ${geo.trimH} mm · ${geo.bleedEdge} mm bleed`,
    detail: `${Math.round(geo.safeInset)} mm safe margin on every page. Crop marks and slug are added to the press PDF.`,
  });

  // ── cover ──────────────────────────────────────────────────────────────
  if (config.includeCover) {
    const c = config.cover;
    const page = idx("cover");
    if (!c.title.trim()) {
      out.push({ id: "cover-title", level: "warn", page, title: "Cover has no title", detail: "Add the event title to the cover." });
    }
    for (const key of Object.keys(COVER_CAPS) as (keyof typeof COVER_CAPS)[]) {
      const len = (c[key] ?? "").length;
      if (len > COVER_CAPS[key] - 10) {
        out.push({
          id: `cover-${key}-length`,
          level: len > COVER_CAPS[key] ? "fail" : "warn",
          page,
          title: `Cover ${key} is near its limit`,
          detail: `${len} of ${COVER_CAPS[key]} characters — the printed cover holds no more.`,
        });
      }
    }
  }

  // ── agenda ─────────────────────────────────────────────────────────────
  if (config.includeAgenda) {
    const page = idx("agenda");
    if (input.agendaSwapped) {
      out.push({
        id: "agenda-swapped",
        level: "warn",
        page,
        title: "Saved agenda replaced",
        detail: "The saved agenda was built on an older programme, so the approved programme prints instead. Re-save it in the agenda studio to print your version.",
      });
    } else if (input.agendaIsDemo) {
      out.push({
        id: "agenda-demo",
        level: "warn",
        page,
        title: "Demo programme",
        detail: "No saved agenda is picked, so the demo city-series programme prints.",
      });
    } else {
      out.push({ id: "agenda", level: "pass", page, title: "Agenda is vector artwork", detail: "Copied from the approved press file with live type." });
    }
  }

  // ── maps ───────────────────────────────────────────────────────────────
  if (config.includeMap && !config.mapFloors.length) {
    out.push({ id: "maps-empty", level: "warn", title: "Maps on, no floors picked", detail: "Pick at least one floor or turn venue maps off." });
  }

  // ── charts ─────────────────────────────────────────────────────────────
  config.charts.forEach((ch) => {
    const page = plan.findIndex((p) => p.kind === "chart" && p.label === (ch.title || `Chart · ${ch.kind}`));
    out.push({
      id: `chart-${ch.id}-sample`,
      level: "warn",
      page,
      title: `${ch.title || "Chart page"} uses sample figures`,
      detail: "The page is labelled as sample data. Replace the figures before this goes to delegates.",
    });
    if (!ch.title.trim()) {
      out.push({ id: `chart-${ch.id}-title`, level: "warn", page, title: "Chart page has no title", detail: "Give the chart a running head." });
    }
  });

  // ── provenance ─────────────────────────────────────────────────────────
  if (plan.some((p) => p.kind === "map" || p.kind === "chart")) {
    out.push({
      id: "raster",
      level: "info",
      title: "Map and chart pages are rendered artwork",
      detail: "Placed at 300 ppi with a printed credit line. Only the agenda and cover type are vector.",
    });
  }

  const master = bookletMaster(config);
  if (master.folios || master.runningFoot.trim()) {
    out.push({
      id: "master-formats",
      level: "info",
      title: "Folios and running foot print in the press PDF",
      detail: "Word and PowerPoint files carry the pages without the master furniture.",
    });
  }
  if (bookletNotesPages(config)) {
    out.push({
      id: "notes-formats",
      level: "info",
      title: "Notes pages print in the press PDF",
      detail: "Word and PowerPoint files leave the ruled notes pages out.",
    });
  }

  out.push({
    id: "colour",
    level: "info",
    title: "RGB house colour space",
    detail: "Nothing is converted to CMYK automatically. Body type prints in ink on paper.",
  });

  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}

export function preflightSummary(checks: PreflightCheck[]) {
  return {
    fail: checks.filter((c) => c.level === "fail").length,
    warn: checks.filter((c) => c.level === "warn").length,
  };
}
