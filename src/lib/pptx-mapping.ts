// Heuristic mapping from parsed pptx slides → TransPerfect module variants.
// Text + imagery: when a source slide has embedded images we route it onto
// an image-forward variant and attach the extracted data-URL via `mediaUrl`
// so the renderer preserves the original picture. Theme colors are surfaced
// separately and applied at the deck level.

import type { ParsedSlide, ParsedTheme, ParsedChart, ParsedTable, ParsedDiagram } from "./pptx-import";
import { MODULE_VARIANTS, byId } from "./taxonomy";
import type { SlideContent } from "./deck-store";
import { variantSupportsImagery, normalizeSlideMedia } from "./variant-media";

export type MappedSlide = {
  sectionId: string;
  variantId: string;
  layoutId: string;
  content: SlideContent;
  source: ParsedSlide;
  rationale: string;
};

export type MapOptions = {
  theme?: ParsedTheme;
};

export function mapParsedSlide(
  s: ParsedSlide,
  total: number,
  _opts: MapOptions = {},
): MappedSlide {
  const isFirst = s.index === 0;
  const isLast = s.index === total - 1;
  const title = (s.title || `Slide ${s.index + 1}`).trim();
  const lowTitle = title.toLowerCase();
  const bullets = s.bullets.filter(Boolean);
  const images = s.images ?? [];
  const hasImages = images.length > 0;
  const primaryImage = images[0];
  const charts = s.charts ?? [];
  const tables = s.tables ?? [];
  const diagrams = s.diagrams ?? [];

  let sectionId = "SF-05";
  let variantId = "MV-INS-CALLOUT";
  let content: SlideContent = { title };
  let rationale = "Narrative callout";

  // ── Graphical-intelligence pass ───────────────────────────────────────
  // When the source slide contains a real chart, table, or SmartArt diagram
  // we re-author onto a native TransPerfect data/process variant instead of
  // collapsing to a text-only callout. This runs before the text heuristics
  // so structured graphics always take precedence.
  const graphical = mapFromGraphics({ title, bullets, notes: s.notes, charts, tables, diagrams });
  if (graphical) {
    sectionId = graphical.sectionId;
    variantId = graphical.variantId;
    content = graphical.content;
    rationale = graphical.rationale;
    // Continue to the media-attachment tail below; skip text heuristics.
    const variant = byId(MODULE_VARIANTS, variantId) ?? MODULE_VARIANTS[0];
    const layoutId = variant.permittedLayoutIds[0];
    const safeContent = normalizeSlideMedia(variant.id, content as Record<string, unknown>) as SlideContent;
    return {
      sectionId,
      variantId: variant.id,
      layoutId,
      content: safeContent,
      source: s,
      rationale,
    };
  }

  if (isFirst || /^(cover|title)\b/i.test(title)) {
    // Cover: prefer a media-forward cover when we have a hero image.
    sectionId = "SF-01";
    if (hasImages) {
      variantId = "MV-OP-COVER-MEDIA";
      content = {
        title,
        subtitle: bullets[0] ?? "",
        clientName: "",
        date: new Date().toLocaleDateString(),
        mediaUrl: primaryImage,
      };
      rationale = "Cover — first slide, hero image preserved";
    } else {
      variantId = "MV-OP-COVER";
      content = {
        title,
        subtitle: bullets[0] ?? "",
        date: new Date().toLocaleDateString(),
      };
      rationale = "Cover — first slide";
    }
  } else if (/agenda|contents|overview|what.?we.?ll cover/i.test(lowTitle) && bullets.length >= 2) {
    sectionId = "SF-01";
    variantId = "MV-OP-AGENDA";
    content = {
      title,
      items: bullets.slice(0, 6).map((b) => ({ label: b, body: "" })),
    };
    rationale = "Agenda — title + list of sections";
  } else if (/thank\s*you|thanks/i.test(lowTitle)) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-THANKS";
    content = { title, subtitle: bullets.join(" · ") };
    rationale = "Close — thanks";
  } else if (/q\s*&\s*a|questions\??$/i.test(lowTitle)) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-QNA";
    content = { title, subtitle: bullets[0] ?? "" };
    rationale = "Close — Q&A";
  } else if (/contact|get in touch/i.test(lowTitle)) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-CONTACT";
    content = { title, subtitle: bullets.join(" · ") };
    rationale = "Close — contact";
  } else if (
    bullets.length === 1 &&
    bullets[0].length > 60 &&
    /["“”"„]/.test(bullets[0])
  ) {
    // Quote — use a photographic quote background when an image exists.
    sectionId = "SF-05";
    if (hasImages) {
      variantId = "MV-IMG-QUOTE-BG";
      content = {
        quote: bullets[0].replace(/^["“”"„]+|["“”"„]+$/g, ""),
        attribution: "",
        role: "",
        mediaUrl: primaryImage,
      };
      rationale = "Quote — with source image as backdrop";
    } else {
      variantId = "MV-INS-QUOTE";
      content = {
        title,
        quote: bullets[0].replace(/^["“”"„]+|["“”"„]+$/g, ""),
        attribution: "",
        role: "",
      };
      rationale = "Quote — long body with quotation marks";
    }
  } else if (hasImages && bullets.length <= 3) {
    // Image-forward: full-bleed hero when body is light; split when we have
    // supporting bullets.
    if (bullets.length === 0) {
      sectionId = "SF-05";
      variantId = "MV-IMG-FULL-BLEED";
      content = {
        kicker: "",
        title,
        body: s.notes ? "" : "",
        mediaUrl: primaryImage,
      };
      rationale = "Image-forward — full-bleed (source picture preserved)";
    } else {
      sectionId = "SF-06";
      variantId = "MV-IMG-SPLIT";
      content = {
        title,
        body: bullets.join(" ") ,
        caption: "",
        mediaUrl: primaryImage,
      };
      rationale = "Image-forward — split (source picture preserved)";
    }
  } else if (bullets.length >= 2 && bullets.length <= 5 && bullets.every((b) => b.length < 180)) {
    const n = bullets.length;
    const pillar =
      n <= 2 ? "MV-SOL-PILLARS-2" :
      n === 3 ? "MV-SOL-PILLARS-3" :
      n === 4 ? "MV-SOL-PILLARS-4" : "MV-SOL-PILLARS-5";
    sectionId = "SF-06";
    variantId = pillar;
    content = {
      title,
      items: bullets.map((b) => {
        const m = b.split(/\s*[—–:-]\s+/);
        const head = (m[0] ?? b).slice(0, 80);
        const rest = m.slice(1).join(" — ").slice(0, 240);
        return { title: head, body: rest || head };
      }),
    };
    rationale = `Pillars — ${n} short bullets`;
  } else if (bullets.length >= 6) {
    sectionId = "SF-07";
    variantId = "MV-SOL-FEATURE-LIST";
    content = {
      title,
      items: bullets.slice(0, 10).map((b) => ({ label: b, body: "" })),
    };
    rationale = "Feature list — many bullets";
  } else if (bullets.length === 0) {
    sectionId = "SF-05";
    variantId = "MV-INS-BIG-IDEA";
    content = { title, idea: title, narrative: s.notes };
    rationale = "Big idea — title only";
  } else {
    sectionId = "SF-05";
    variantId = "MV-INS-CALLOUT";
    content = {
      title,
      insight: bullets[0],
      narrative: bullets.slice(1).join(" "),
    };
    rationale = "Callout — headline + supporting text";
  }

  // Only attach `mediaUrl` when the resolved variant actually renders a
  // slide-level photograph. For non-image variants we still preserve the
  // extracted images in `extraImages` so a user can swap into an image
  // variant later, but never leave an orphan `mediaUrl` pointing at a
  // slot the renderer will not draw.
  if (hasImages) {
    if (variantSupportsImagery(variantId) && !("mediaUrl" in content)) {
      content = { ...content, mediaUrl: primaryImage, extraImages: images.slice(1) };
    } else if (!variantSupportsImagery(variantId)) {
      content = normalizeSlideMedia(variantId, { ...content, extraImages: images });
    } else if (images.length > 1) {
      content = { ...content, extraImages: images.slice(1) };
    }
  }


  if (isLast && !/^SF-16$/.test(sectionId) && bullets.length === 0 && !hasImages) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-THANKS";
    content = { title, subtitle: "" };
    rationale = "Close — final slide";
  }

  const variant = byId(MODULE_VARIANTS, variantId) ?? MODULE_VARIANTS[0];
  const layoutId = variant.permittedLayoutIds[0];
  // Final safety net: if any earlier branch left a slide-level media
  // reference on a content record whose final variant does not render
  // imagery, strip it here so exporters and renderers stay consistent.
  const safeContent = normalizeSlideMedia(variant.id, content as Record<string, unknown>) as SlideContent;
  return {
    sectionId,
    variantId: variant.id,
    layoutId,
    content: safeContent,
    source: s,
    rationale,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Graphical-intelligence mapping
// ─────────────────────────────────────────────────────────────────────────
// Given the structured graphics extracted from a source slide (charts,
// tables, SmartArt diagrams / grouped shape families), route the slide onto
// a native TransPerfect data / process variant and populate its structured
// content fields. Returns null when the slide has no re-authorable
// graphics, so the text heuristic pipeline stays in charge.

type GraphicMap = {
  sectionId: string;
  variantId: string;
  content: SlideContent;
  rationale: string;
};

function mapFromGraphics(args: {
  title: string;
  bullets: string[];
  notes: string;
  charts: ParsedChart[];
  tables: ParsedTable[];
  diagrams: ParsedDiagram[];
}): GraphicMap | null {
  const { title, bullets, charts, tables, diagrams } = args;

  // Charts take precedence — they carry real quantitative data.
  if (charts.length > 0) {
    const c = charts[0];
    return mapChartToVariant(title, c, bullets);
  }

  // Tables → comparison table or feature list.
  if (tables.length > 0) {
    const t = tables[0];
    return mapTableToVariant(title, t);
  }

  // Diagrams (SmartArt or grouped shape families) → process / journey /
  // pyramid depending on shape count and hierarchy.
  if (diagrams.length > 0) {
    const d = diagrams[0];
    return mapDiagramToVariant(title, d, bullets);
  }
  return null;
}

function mapChartToVariant(title: string, c: ParsedChart, bullets: string[]): GraphicMap {
  const series0 = c.series[0];
  const cats = c.categories.length ? c.categories : series0.values.map((_, i) => `Item ${i + 1}`);
  // Prefer the unit inferred from the chart's declared number format
  // (e.g. "0%" → "%", "$#,##0" → "$"); fall back to the title keyword hint.
  const unit = c.unit ?? (/%|percent/i.test(c.title ?? title) ? "%" : "");
  const headline = c.title ?? bullets[0] ?? "";

  // Source metadata — colors, legend, axis titles, and typography carried
  // from the original chart so the renderer/exporter can honor them without
  // affecting the variant's editableFields.
  const seriesColors = c.series.map((s) => s.color).filter((x): x is string => Boolean(x));
  const source: Record<string, unknown> = {
    kind: c.kind,
    stacked: !!c.stacked,
    numberFormat: c.numberFormat,
    unit: c.unit,
    legend: c.legend,
    axis: c.axis,
    font: c.font,
    palette: seriesColors,
    seriesColors: c.series.map((s) => s.color ?? null),
    pointColors: series0.pointColors ?? null,
  };
  const withSource = <T extends object>(content: T) =>
    ({ ...content, _source: source } as unknown as SlideContent);

  // Multi-series line/area
  if ((c.kind === "line" || c.kind === "area" || c.kind === "scatter") && c.series.length >= 2) {
    return {
      sectionId: "SF-08",
      variantId: c.kind === "area" ? "MV-GRAPH-AREA-STACK" : "MV-GRAPH-LINE-MULTI",
      content: withSource({
        title,
        kicker: c.title ?? "",
        headline,
        unit,
        axisLabel: c.axis?.value ?? "",
        series: c.series.slice(0, 3).map((s) => ({
          label: s.label,
          color: s.color,
          points: s.values.slice(0, cats.length).map((v, i) => ({ x: cats[i] ?? `${i + 1}`, y: v })),
        })),
      }),
      rationale: `${c.kind} chart · ${c.series.length} series · colors + legend preserved`,
    };
  }

  // Single-series line / area → decade area
  if (c.kind === "line" || c.kind === "area") {
    return {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-DECADE-AREA",
      content: withSource({
        title,
        kicker: c.title ?? "",
        headline,
        color: series0.color,
        series: series0.values.slice(0, 12).map((v, i) => ({ label: cats[i] ?? `${i + 1}`, value: v })),
      }),
      rationale: `${c.kind} chart · single series · source color preserved`,
    };
  }

  // Pie / doughnut
  if (c.kind === "pie" || c.kind === "doughnut") {
    const segColors = series0.pointColors ?? [];
    const items = cats.map((label, i) => ({
      label,
      value: series0.values[i] ?? 0,
      color: segColors[i] ?? undefined,
    }));
    if (items.length === 2) {
      return {
        sectionId: "SF-08",
        variantId: "MV-GRAPH-DUAL-DONUT",
        content: withSource({
          title,
          items: items.map((it) => ({
            label: it.label,
            value: `${Math.round(it.value)}${unit}`,
            body: "",
            meta: "",
            color: it.color,
          })),
        }),
        rationale: `${c.kind} chart · dual donut · segment colors preserved`,
      };
    }
    return {
      sectionId: "SF-08",
      variantId: "MV-INFO-DONUT",
      content: withSource({
        title,
        headline,
        items: items.slice(0, 6).map((it) => ({
          label: it.label,
          value: `${Math.round(it.value)}${unit}`,
          color: it.color,
        })),
      }),
      rationale: `${c.kind} chart · segment breakdown · colors preserved`,
    };
  }

  // Stacked bar/column
  if ((c.kind === "bar" || c.kind === "column") && c.stacked && c.series.length >= 2) {
    return {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-STACKED-BAR",
      content: withSource({
        title,
        unit,
        segments: c.series.map((s) => ({ label: s.label, color: s.color })),
        columns: cats.map((label, i) => ({
          label,
          values: c.series.map((s) => s.values[i] ?? 0),
        })),
      }),
      rationale: `${c.kind} chart · stacked · segment colors preserved`,
    };
  }

  // Bar (horizontal) → category bars
  if (c.kind === "bar") {
    return {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-CATEGORY-BARS",
      content: withSource({
        title,
        items: cats.slice(0, 6).map((label, i) => ({
          label,
          value: `${Math.round(series0.values[i] ?? 0)}`,
          unit,
          color: (series0.pointColors ?? [])[i] ?? series0.color,
        })),
        stat: { value: "", unit: "", label: "" },
      }),
      rationale: "bar chart · category bars · source colors preserved",
    };
  }

  // Column (vertical) → axis bars, with the largest month highlighted.
  const maxIdx = series0.values.reduce((best, v, i, arr) => (v > (arr[best] ?? -Infinity) ? i : best), 0);
  return {
    sectionId: "SF-08",
    variantId: "MV-GRAPH-AXIS-BARS",
    content: withSource({
      title,
      unit,
      bars: cats.slice(0, 12).map((label, i) => ({
        label,
        value: series0.values[i] ?? 0,
        color: (series0.pointColors ?? [])[i] ?? series0.color,
      })),
      highlight: cats[maxIdx] ?? "",
      legend: c.legend?.visible ? (series0.label ?? "") : "",
    }),
    rationale: "column chart · axis bars · source palette + legend preserved",
  };
}


function mapTableToVariant(title: string, t: ParsedTable): GraphicMap {
  // Compare table if 2–3 columns of comparable data.
  if (t.header.length >= 2 && t.header.length <= 4 && t.rows.length <= 8) {
    return {
      sectionId: "SF-09",
      variantId: "MV-DEC-COMPARE-TABLE",
      content: {
        title,
        columns: t.header,
        rows: t.rows.slice(0, 8),
      } as unknown as SlideContent,
      rationale: `table · ${t.header.length}×${t.rows.length} preserved`,
    };
  }
  // Otherwise → feature list keyed on first column.
  return {
    sectionId: "SF-07",
    variantId: "MV-SOL-FEATURE-LIST",
    content: {
      title,
      items: t.rows.slice(0, 10).map((r) => ({
        label: r[0] ?? "",
        body: r.slice(1).filter(Boolean).join(" · "),
      })),
    } as unknown as SlideContent,
    rationale: "table · projected to feature list",
  };
}

function mapDiagramToVariant(title: string, d: ParsedDiagram, bullets: string[]): GraphicMap {
  const nodes = d.nodes.filter((n) => n.text.trim().length > 0);
  const n = nodes.length;
  const palette = nodes.map((node) => node.color).filter((c): c is string => Boolean(c));
  const source = {
    kind: d.kind,
    layoutHint: d.layoutHint,
    palette,
    nodeColors: nodes.map((node) => node.color ?? null),
    connectorStyle: d.connectorStyle,
    connectors: d.connectors,
  } as Record<string, unknown>;
  const withSource = <T extends object>(content: T) =>
    ({ ...content, _source: source } as unknown as SlideContent);

  // Prefer the structural layoutHint extracted from the SmartArt layoutDef
  // (or inferred from the dominant prstGeom in a grouped shape family) over
  // fragile title keyword heuristics. Falls back to keyword + hierarchy
  // detection when no hint is present.
  const hint = d.layoutHint;
  const journeyRe = /journey|roadmap|process|flow|steps|stages|phases|timeline/i;

  // ── Timeline ─────────────────────────────────────────────────────────
  if (hint === "timeline" || (n >= 3 && /timeline|roadmap|quarterly|calendar/i.test(title))) {
    // Route quarterly/annual roadmaps onto the quarters variant when we
    // can detect a Q1/Q2… or year pattern in the node labels.
    const quarters = nodes.filter((node) => /^q[1-4]\b|^quarter\s*[1-4]|20\d\d/i.test(node.text));
    if (quarters.length >= 3) {
      return {
        sectionId: "SF-13",
        variantId: "MV-ROADMAP-QUARTERS",
        content: withSource({
          title,
          quarters: nodes.slice(0, 4).map((node, i) => ({
            label: node.text.slice(0, 40),
            body: bullets[i] ?? "",
            color: node.color,
          })),
        }),
        rationale: `SmartArt · ${n} nodes → quarterly roadmap`,
      };
    }
    return {
      sectionId: "SF-07",
      variantId: "MV-TIMELINE-VERTICAL",
      content: withSource({
        title,
        events: nodes.slice(0, 6).map((node, i) => ({
          date: `${i + 1}`,
          label: node.text.slice(0, 80),
          body: bullets[i] ?? "",
          color: node.color,
        })),
      }),
      rationale: `SmartArt · ${n} nodes → vertical timeline · colors preserved`,
    };
  }

  // ── Process / journey / phases ───────────────────────────────────────
  if (hint === "process" || (!hint && journeyRe.test(title) && n >= 3)) {
    // 3-6 phases → PROC-PHASES (native phased process); otherwise journey map.
    if (n >= 3 && n <= 6) {
      return {
        sectionId: "SF-07",
        variantId: "MV-PROC-PHASES",
        content: withSource({
          title,
          phases: nodes.slice(0, 6).map((node, i) => ({
            step: `${i + 1}`,
            label: node.text.slice(0, 60),
            body: bullets[i] ?? "",
            color: node.color,
          })),
        }),
        rationale: `SmartArt · ${n} nodes → phased process · colors preserved`,
      };
    }
    return {
      sectionId: "SF-07",
      variantId: "MV-JOURNEY-MAP",
      content: withSource({
        title,
        stages: nodes.slice(0, 6).map((node, i) => ({
          label: node.text,
          step: `${i + 1}`,
          body: bullets[i] ?? "",
          color: node.color,
        })),
      }),
      rationale: `SmartArt · ${n} nodes → journey · node colors preserved`,
    };
  }

  // ── Funnel ───────────────────────────────────────────────────────────
  if (hint === "funnel" || (/funnel|convert|pipeline/i.test(title) && n >= 3 && n <= 6)) {
    return {
      sectionId: "SF-08",
      variantId: "MV-FUNNEL",
      content: withSource({
        title,
        stages: nodes.slice(0, 6).map((node) => ({ label: node.text, value: "", color: node.color })),
      }),
      rationale: `SmartArt · ${n} nodes → funnel · colors preserved`,
    };
  }

  // ── Cycle / flywheel ─────────────────────────────────────────────────
  if (hint === "cycle" || hint === "radial" || /cycle|loop|flywheel|continuous/i.test(title)) {
    // 3-6 nodes fits the flywheel variant nicely.
    if (n >= 3 && n <= 6) {
      return {
        sectionId: "SF-08",
        variantId: "MV-FLYWHEEL",
        content: withSource({
          title,
          nodes: nodes.slice(0, 6).map((node) => ({ label: node.text.slice(0, 60), color: node.color })),
        }),
        rationale: `SmartArt · ${n} nodes → flywheel · colors preserved`,
      };
    }
    return {
      sectionId: "SF-08",
      variantId: "MV-INFO-CIRCULAR-FLOW",
      content: withSource({
        title,
        items: nodes.slice(0, 8).map((node) => ({ label: node.text.slice(0, 60), color: node.color })),
      }),
      rationale: `SmartArt · ${n} nodes → circular flow · colors preserved`,
    };
  }

  // ── Hierarchy / org chart ────────────────────────────────────────────
  if (hint === "hierarchy" || nodes.some((node) => node.level > 0)) {
    const root = nodes.find((node) => node.level === 0) ?? nodes[0];
    const children = nodes.filter((node) => node !== root);
    return {
      sectionId: "SF-06",
      variantId: "MV-SOL-ARCHITECTURE",
      content: withSource({
        title,
        root: { label: root.text.slice(0, 80), color: root.color },
        branches: children.slice(0, 6).map((node, i) => ({
          label: node.text.slice(0, 60),
          body: bullets[i] ?? "",
          level: node.level,
          color: node.color,
        })),
      }),
      rationale: `SmartArt · ${n} nodes → org / architecture · hierarchy preserved`,
    };
  }

  // ── Pyramid ──────────────────────────────────────────────────────────
  if (hint === "pyramid" || /pyramid|maslow|hierarchy/i.test(title)) {
    return {
      sectionId: "SF-08",
      variantId: "MV-INFO-PYRAMID",
      content: withSource({
        title,
        levels: nodes.slice(0, 5).map((node) => ({ label: node.text.slice(0, 80), color: node.color })),
      }),
      rationale: `SmartArt · ${n} nodes → pyramid · colors preserved`,
    };
  }

  // ── Venn ─────────────────────────────────────────────────────────────
  if (hint === "venn" || /venn|overlap|intersection/i.test(title)) {
    return {
      sectionId: "SF-08",
      variantId: "MV-INFO-VENN",
      content: withSource({
        title,
        circles: nodes.slice(0, 3).map((node) => ({ label: node.text.slice(0, 40), color: node.color })),
      }),
      rationale: `SmartArt · ${n} nodes → venn · colors preserved`,
    };
  }

  // ── Matrix ───────────────────────────────────────────────────────────
  if (hint === "matrix" || /matrix|quadrant/i.test(title)) {
    return {
      sectionId: "SF-09",
      variantId: "MV-MATRIX-2X2",
      content: withSource({
        title,
        quadrants: nodes.slice(0, 4).map((node) => ({ label: node.text.slice(0, 60), color: node.color })),
      }),
      rationale: `SmartArt · ${n} nodes → 2×2 matrix · colors preserved`,
    };
  }

  // ── Default: n nodes → N-pillar layout, capped at 5. ─────────────────
  const pillar =
    n <= 2 ? "MV-SOL-PILLARS-2" :
    n === 3 ? "MV-SOL-PILLARS-3" :
    n === 4 ? "MV-SOL-PILLARS-4" : "MV-SOL-PILLARS-5";
  return {
    sectionId: "SF-06",
    variantId: pillar,
    content: withSource({
      title,
      items: nodes.slice(0, 5).map((node, i) => ({
        title: node.text.slice(0, 80),
        body: bullets[i] ?? "",
        color: node.color,
      })),
    }),
    rationale: `${d.kind === "smartart" ? "SmartArt" : "grouped shapes"} · ${n} nodes → pillars · colors preserved`,
  };
}



