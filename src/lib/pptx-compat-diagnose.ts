/**
 * Compatibility diagnosis for an imported PowerPoint deck.
 *
 * Every issue in here is derived from data the importer actually recovered —
 * there are no sampled or invented findings. Each issue carries:
 *
 *   • a `severity` for triage (blocker → info)
 *   • a `category` matching the audit filter chips
 *   • a `slideIndex` + `elementRef` so the UI can jump to and highlight the object
 *   • a `fix` descriptor: `safe` fixes may be applied in bulk, `review` fixes
 *     need explicit approval, `manual` fixes need a human in the repair workspace
 *
 * Scores are computed from counts, never hard-coded.
 */

import type { ImportLayerDescriptor, LayoutShape, ParsedDeck, ParsedSlide } from "./pptx-import";
import type { PackageValidation } from "./pptx-package-validate";
import { isExternalRelationshipTarget } from "./pptx-package-validate";
import type { SourceFingerprint } from "./pptx-source-detect";
import { contrastRatio } from "./wcag";

export type IssueSeverity = "blocker" | "high" | "medium" | "low" | "info";

export type IssueCategory =
  | "fonts"
  | "text"
  | "layout"
  | "imagery"
  | "charts"
  | "media"
  | "links"
  | "accessibility"
  | "brand"
  | "masters"
  | "integrity";

export type FixKind = "safe" | "review" | "manual";

export type CompatIssue = {
  /** Stable id: `${code}:${slideIndex}:${elementRef ?? "-"}:${n}`. */
  id: string;
  code: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  detail: string;
  /** 0-based slide index, or null for deck-level findings. */
  slideIndex: number | null;
  /** Shape name / layer name to highlight on the slide. */
  elementRef?: string;
  /** Shape index within the slide's recovered layout, for direct selection. */
  shapeIndex?: number;
  /** What kind of intervention the fix needs. */
  fix: FixKind;
  /** Short description of what the fix would do. Always reversible. */
  fixLabel?: string;
};

export type CompatScores = {
  /** 0-100 overall, weighted by severity against the object count. */
  compatibility: number;
  /** Percentage of recovered objects that are editable (not visual fallbacks). */
  editablePercent: number;
  /** 0-100 confidence that the rendering matches the source appearance. */
  visualFidelity: number;
};

export type CompatReport = {
  scores: CompatScores;
  issues: CompatIssue[];
  totals: {
    bySeverity: Record<IssueSeverity, number>;
    byCategory: Record<IssueCategory, number>;
    /** slideIndex → issue count (deck-level issues under key -1). */
    bySlide: Record<number, number>;
  };
  objects: {
    /** Objects counted in the source slide XML. */
    source: number;
    /** Objects the importer reconstructed. */
    recovered: number;
    /** Recovered objects that are editable. */
    editable: number;
    /** Recovered objects kept as visual fallbacks. */
    fallback: number;
  };
  /** Fonts referenced by the deck that are not available for rendering. */
  substitutedFonts: string[];
  source: SourceFingerprint | null;
};

const SEVERITY_WEIGHT: Record<IssueSeverity, number> = {
  blocker: 24,
  high: 8,
  medium: 3,
  low: 1,
  info: 0,
};

/** Fonts the app can render (brand stack + the standard Office web-safe set). */
export const DEFAULT_AVAILABLE_FONTS = [
  "geist",
  "geist sans",
  "geist mono",
  "arial",
  "helvetica",
  "helvetica neue",
  "calibri",
  "cambria",
  "georgia",
  "times new roman",
  "verdana",
  "tahoma",
  "trebuchet ms",
  "courier new",
  "segoe ui",
  "roboto",
  "open sans",
  "lato",
  "montserrat",
  "inter",
  "+mn-lt",
  "+mj-lt",
];

const SAFE_MEDIA_MIME = /^(video\/mp4|audio\/mpeg|audio\/mp4|audio\/wav|audio\/x-wav|video\/quicktime)$/i;
const STANDARD_SIZE = { w: 13.333, h: 7.5 };

export type DiagnoseOptions = {
  availableFonts?: string[];
  packageValidation?: PackageValidation | null;
  source?: SourceFingerprint | null;
  /** Slide size the app renders at. Defaults to 16:9 13.333×7.5in. */
  targetSize?: { w: number; h: number };
};

function shapeName(layers: ImportLayerDescriptor[] | undefined, index: number, shape: LayoutShape) {
  return layers?.[index]?.name ?? `${shape.kind} ${index + 1}`;
}

/** Rough single-line height in inches for a run size in points. */
function lineHeightIn(sizePt: number, mult = 1.2) {
  return (sizePt * mult) / 72;
}

/** Estimated rendered text height for a text body inside a frame width. */
function estimateTextHeightIn(shape: Extract<LayoutShape, { kind: "text" }>): number {
  const insets = shape.text.insets ?? { l: 0.1, t: 0.05, r: 0.1, b: 0.05 };
  const usableW = Math.max(0.2, shape.frame.w - insets.l - insets.r);
  const scale = shape.text.fontScale ?? 1;
  let total = insets.t + insets.b;
  for (const para of shape.text.paras) {
    const text = para.runs.map((r) => r.text).join("");
    const sizePt = (para.runs.find((r) => r.sizePt)?.sizePt ?? 18) * scale;
    // ~0.5em average advance width is a close enough proxy for wrap counting.
    const charsPerLine = Math.max(4, Math.floor(usableW / ((sizePt * 0.5) / 72)));
    const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
    const mult =
      para.lineSpacing && "mult" in para.lineSpacing ? para.lineSpacing.mult : 1.2;
    total += lines * lineHeightIn(sizePt, mult);
    total += (para.spcBeforePt ?? 0) / 72 + (para.spcAfterPt ?? 0) / 72;
  }
  return total;
}

function collectFonts(slide: ParsedSlide): string[] {
  const out = new Set<string>();
  for (const sh of slide.layout?.shapes ?? []) {
    if (sh.kind !== "text") continue;
    for (const para of sh.text.paras) {
      for (const run of para.runs) {
        if (run.font) out.add(run.font);
      }
      if (para.bulletFont) out.add(para.bulletFont);
    }
  }
  return [...out];
}

/**
 * Produce the full compatibility report for a parsed deck.
 * Pure and synchronous so it runs on the server during ingest and again in the
 * browser when a slide is re-analysed after repairs.
 */
export function diagnoseImportedDeck(deck: ParsedDeck, options: DiagnoseOptions = {}): CompatReport {
  const available = new Set(
    (options.availableFonts ?? DEFAULT_AVAILABLE_FONTS).map((f) => f.toLowerCase()),
  );
  const target = options.targetSize ?? STANDARD_SIZE;
  const issues: CompatIssue[] = [];
  const substituted = new Set<string>();
  let seq = 0;

  const push = (issue: Omit<CompatIssue, "id">) => {
    issues.push({
      ...issue,
      id: `${issue.code}:${issue.slideIndex ?? "deck"}:${issue.elementRef ?? "-"}:${seq++}`,
    });
  };

  // ---- Package / integrity level -----------------------------------------
  for (const risk of options.packageValidation?.risks ?? []) {
    push({
      code: `package-${risk.code}`,
      severity: risk.severity === "blocker" ? "blocker" : risk.severity === "warning" ? "medium" : "info",
      category: risk.code === "macros-present" || risk.code === "ole-embed-present" ? "media" : "integrity",
      title:
        risk.code === "macros-present"
          ? "Macros present (not executed)"
          : risk.code === "ole-embed-present"
            ? "Embedded objects present"
            : "Package integrity",
      detail: risk.message,
      slideIndex: null,
      ...(risk.path ? { elementRef: risk.path } : {}),
      fix: "manual",
    });
  }

  // ---- Deck level ---------------------------------------------------------
  const firstSize = deck.slides[0]?.layout?.size;
  if (firstSize && (Math.abs(firstSize.w - target.w) > 0.05 || Math.abs(firstSize.h - target.h) > 0.05)) {
    push({
      code: "slide-size-mismatch",
      severity: "high",
      category: "layout",
      title: "Slide size differs from the deck standard",
      detail: `Source slides are ${firstSize.w.toFixed(2)}×${firstSize.h.toFixed(2)}in; this deck renders at ${target.w}×${target.h}in. Content will be rescaled unless you keep the source size.`,
      slideIndex: null,
      fix: "review",
      fixLabel: "Rescale slides to the deck size",
    });
  }

  if (deck.templates.masters.length === 0) {
    push({
      code: "missing-master",
      severity: "high",
      category: "masters",
      title: "No slide master recovered",
      detail: "The package declares no readable slide master, so inherited backgrounds and placeholder geometry are unavailable.",
      slideIndex: null,
      fix: "manual",
    });
  }
  const unusedMasters = deck.templates.masters.filter((m) => m.usedBySlides.length === 0);
  if (unusedMasters.length > 0) {
    push({
      code: "unused-master",
      severity: "low",
      category: "masters",
      title: `${unusedMasters.length} unused master${unusedMasters.length === 1 ? "" : "s"}`,
      detail: `Not referenced by any slide: ${unusedMasters.map((m) => m.name ?? m.path).join(", ")}. Consolidating is optional and never automatic.`,
      slideIndex: null,
      fix: "review",
      fixLabel: "Consolidate unused masters",
    });
  }
  const layoutPathsUsed = new Set(
    deck.slides.map((s) => s.layout?.source?.layoutPath).filter(Boolean) as string[],
  );
  const knownLayoutPaths = new Set(deck.templates.layouts.map((l) => l.path));
  for (const used of layoutPathsUsed) {
    if (!knownLayoutPaths.has(used)) {
      push({
        code: "missing-layout",
        severity: "medium",
        category: "masters",
        title: "Slide references a layout that is missing",
        detail: `Layout part ${used} is referenced but not present in the package.`,
        slideIndex: null,
        elementRef: used,
        fix: "manual",
      });
    }
  }
  if (deck.theme.accents.filter(Boolean).length < 6) {
    push({
      code: "incomplete-theme-colors",
      severity: "low",
      category: "brand",
      title: "Theme colour set is incomplete",
      detail: `Only ${deck.theme.accents.filter(Boolean).length} of 6 accent slots resolved, so scheme colour references may fall back to defaults.`,
      slideIndex: null,
      fix: "review",
      fixLabel: "Map theme colours to brand tokens",
    });
  }
  if (deck.imagesTruncated) {
    push({
      code: "images-truncated",
      severity: "high",
      category: "imagery",
      title: "Some images exceeded the import budget",
      detail: "The original file keeps every asset untouched, but some large images were not inlined for editing. Re-import a slimmer file, or relink those images.",
      slideIndex: null,
      fix: "manual",
    });
  }

  // ---- Slide level -------------------------------------------------------
  let sourceObjects = 0;
  let recoveredObjects = 0;
  let editableObjects = 0;
  let fallbackObjects = 0;

  deck.slides.forEach((slide, slideIndex) => {
    const layout = slide.layout;
    const shapes = layout?.shapes ?? [];
    const layers = slide.audit?.sourceLayers;
    const size = layout?.size ?? target;
    sourceObjects += slide.audit?.source.total ?? shapes.length;
    recoveredObjects += shapes.length;

    if ((slide.audit?.missing ?? 0) > 0) {
      push({
        code: "objects-not-recovered",
        severity: "blocker",
        category: "integrity",
        title: `${slide.audit!.missing} object${slide.audit!.missing === 1 ? "" : "s"} not reconstructed`,
        detail: `The slide XML declares ${slide.audit!.source.total} objects but only ${slide.audit!.recovered.slide} were rebuilt. Nothing was deleted — the original slide is preserved for comparison and rebuild.`,
        slideIndex,
        fix: "manual",
      });
    }

    // Fonts.
    for (const font of collectFonts(slide)) {
      if (!available.has(font.toLowerCase())) {
        substituted.add(font);
      }
    }

    // Animations / transitions.
    if (slide.hasAnimation) {
      push({
        code: "animation-lost",
        severity: "low",
        category: "media",
        title: "Animations are not carried over",
        detail: "This slide declares an animation timeline. Build order and effects are not reconstructed; the end state is what you see.",
        slideIndex,
        fix: "manual",
      });
    }
    if (slide.transition) {
      push({
        code: "transition-mapped",
        severity: "info",
        category: "media",
        title: `Source transition "${slide.transition}"`,
        detail: "Mapped to the closest supported deck transition on export.",
        slideIndex,
        fix: "safe",
        fixLabel: "Map to the nearest supported transition",
      });
    }

    // Media.
    for (const media of slide.media) {
      if (!media.dataUrl) {
        push({
          code: "missing-linked-media",
          severity: "high",
          category: "media",
          title: "Linked media is missing",
          detail: `${media.path} is referenced but its data is not inside the package — it was linked from the author's machine.`,
          slideIndex,
          elementRef: media.path,
          fix: "manual",
        });
      } else if (media.kind === "ole") {
        fallbackObjects += 1;
        push({
          code: "ole-object",
          severity: "medium",
          category: "media",
          title: "Embedded object kept as a visual fallback",
          detail: "OLE embeds cannot be edited here. The appearance and the original data are both preserved, and you can rebuild it as editable objects.",
          slideIndex,
          elementRef: media.path,
          fix: "manual",
        });
      } else if (!SAFE_MEDIA_MIME.test(media.mime)) {
        push({
          code: "unsupported-codec",
          severity: "medium",
          category: "media",
          title: "Media format may not play everywhere",
          detail: `${media.mime || "unknown format"} is not universally supported by PowerPoint. Convert to MP4/H.264 or MP3 for reliable playback.`,
          slideIndex,
          elementRef: media.path,
          fix: "review",
          fixLabel: "Transcode to MP4 / MP3",
        });
      }
    }

    // Links.
    for (const link of slide.hyperlinks) {
      if (!link.target.trim()) {
        push({
          code: "broken-link",
          severity: "medium",
          category: "links",
          title: "Hyperlink has no target",
          detail: `Relationship ${link.rId} resolves to an empty target.`,
          slideIndex,
          elementRef: link.rId,
          fix: "safe",
          fixLabel: "Remove the empty hyperlink",
        });
      } else if (link.external && !isExternalRelationshipTarget(link.target) && !/^mailto:/i.test(link.target)) {
        push({
          code: "broken-link",
          severity: "medium",
          category: "links",
          title: "Hyperlink points at a local file",
          detail: `"${link.target}" is a path on the author's machine, so it will not resolve for anyone else.`,
          slideIndex,
          elementRef: link.rId,
          fix: "review",
          fixLabel: "Clear or replace the link target",
        });
      }
    }

    // Comments are informational, but worth surfacing so nothing looks lost.
    if (slide.comments.length > 0) {
      push({
        code: "comments-present",
        severity: "info",
        category: "text",
        title: `${slide.comments.length} source comment${slide.comments.length === 1 ? "" : "s"}`,
        detail: "Comments are preserved as read-only notes on the imported slide.",
        slideIndex,
        fix: "safe",
        fixLabel: "Keep comments as slide notes",
      });
    }

    // Shape-level checks.
    const groupCounts = new Map<string, number>();
    shapes.forEach((shape) => {
      if (shape.groupId) groupCounts.set(shape.groupId, (groupCounts.get(shape.groupId) ?? 0) + 1);
    });

    shapes.forEach((shape, shapeIndex) => {
      const name = shapeName(layers, shapeIndex, shape);
      const ref = { slideIndex, elementRef: name, shapeIndex };
      const editable = shape.kind !== "diagram" || !("fallbackReason" in shape && shape.fallbackReason);
      if (editable) editableObjects += 1;
      else fallbackObjects += 1;

      // Off-canvas / out-of-bounds.
      const outLeft = shape.frame.x + shape.frame.w <= 0.01;
      const outTop = shape.frame.y + shape.frame.h <= 0.01;
      const outRight = shape.frame.x >= size.w - 0.01;
      const outBottom = shape.frame.y >= size.h - 0.01;
      if (outLeft || outTop || outRight || outBottom) {
        push({
          ...ref,
          code: "off-canvas",
          severity: "medium",
          category: "layout",
          title: "Object sits completely off the slide",
          detail: `"${name}" is positioned outside the slide area (${shape.frame.x.toFixed(2)}, ${shape.frame.y.toFixed(2)}in). It is kept, not deleted.`,
          fix: "review",
          fixLabel: "Move onto the slide",
        });
      } else if (
        shape.frame.x < -0.05 ||
        shape.frame.y < -0.05 ||
        shape.frame.x + shape.frame.w > size.w + 0.05 ||
        shape.frame.y + shape.frame.h > size.h + 0.05
      ) {
        push({
          ...ref,
          code: "overhangs-canvas",
          severity: "low",
          category: "layout",
          title: "Object overhangs the slide edge",
          detail: `"${name}" extends past the slide boundary and will be clipped when presenting.`,
          fix: "review",
          fixLabel: "Nudge inside the slide",
        });
      }

      if (shape.groupId && (groupCounts.get(shape.groupId) ?? 0) === 1) {
        push({
          ...ref,
          code: "broken-group",
          severity: "low",
          category: "layout",
          title: "Group has a single surviving member",
          detail: `"${name}" was inside group "${shape.groupName ?? shape.groupId}" but is the only member recovered, so the group transform may not match the source.`,
          fix: "review",
          fixLabel: "Ungroup this object",
        });
      }

      if (shape.kind === "text") {
        const textHeight = estimateTextHeightIn(shape);
        if (!shape.text.spAutoFit && textHeight > shape.frame.h * 1.15 && shape.frame.h > 0.1) {
          push({
            ...ref,
            code: "text-overflow",
            severity: "high",
            category: "text",
            title: "Text likely overflows its box",
            detail: `"${name}" needs about ${textHeight.toFixed(2)}in but the box is ${shape.frame.h.toFixed(2)}in tall. Line wrapping differs from the source.`,
            fix: "safe",
            fixLabel: "Shrink text to fit the box",
          });
        }
        if (shape.effect?.reflection || shape.effect?.glow) {
          push({
            ...ref,
            code: "unsupported-text-effect",
            severity: "low",
            category: "text",
            title: "Text effect is approximated",
            detail: `"${name}" uses ${shape.effect.reflection ? "a reflection" : "a glow"}, which is rendered approximately and may differ on export.`,
            fix: "manual",
          });
        }
        // Contrast against the resolved shape or slide background.
        const bg =
          shape.fill?.kind === "solid"
            ? shape.fill.color
            : layout?.background?.kind === "solid"
              ? layout.background.color
              : null;
        const fg = shape.text.paras.flatMap((p) => p.runs).find((r) => r.color)?.color;
        if (bg && fg) {
          const ratio = contrastRatio(fg, bg);
          if (ratio < 4.5) {
            push({
              ...ref,
              code: "low-contrast",
              severity: ratio < 3 ? "high" : "medium",
              category: "accessibility",
              title: `Text contrast ${ratio.toFixed(2)}:1`
                ,
              detail: `"${name}" falls below the 4.5:1 minimum for body text against its background.`,
              fix: "review",
              fixLabel: "Apply a readable brand colour pair",
            });
          }
        }
      }

      if (shape.kind === "image") {
        if (!shape.path && !shape.embedId) {
          push({
            ...ref,
            code: "missing-image",
            severity: "high",
            category: "imagery",
            title: "Image data is missing",
            detail: `"${name}" has no resolvable image part, so a placeholder is shown. Relink it to restore the picture.`,
            fix: "manual",
          });
        }
        if (shape.srcRect) {
          const cropped =
            shape.srcRect.l > 0.001 ||
            shape.srcRect.t > 0.001 ||
            shape.srcRect.r > 0.001 ||
            shape.srcRect.b > 0.001;
          if (cropped) {
            push({
              ...ref,
              code: "image-crop-preserved",
              severity: "info",
              category: "imagery",
              title: "Image crop preserved",
              detail: `"${name}" carries a source crop. It is kept through resizing and export — check the framing after any layout change.`,
              fix: "safe",
              fixLabel: "Keep the source crop",
            });
          }
        }
        if (/logo/i.test(name)) {
          push({
            ...ref,
            code: "possible-logo",
            severity: "medium",
            category: "brand",
            title: "Possible logo — needs asset matching",
            detail: `"${name}" looks like a logo. Match it to the approved LogoHub asset; logos are never recoloured, redrawn, cropped or stretched.`,
            fix: "review",
            fixLabel: "Match to a LogoHub asset",
          });
        }
      }

      if (shape.kind === "diagram") {
        push({
          ...ref,
          code: "smartart-conversion",
          severity: "fallbackReason" in shape && shape.fallbackReason ? "high" : "medium",
          category: "charts",
          title:
            "fallbackReason" in shape && shape.fallbackReason
              ? "SmartArt could not be reconstructed"
              : "SmartArt rebuilt as shapes",
          detail:
            "fallbackReason" in shape && shape.fallbackReason
              ? `"${name}" imported as a visual fallback (${shape.fallbackReason}). The original data is retained so it can be rebuilt as editable objects.`
              : `"${name}" was rebuilt from its drawing geometry. Text and shapes are editable; the SmartArt engine itself is not.`,
          fix: "manual",
        });
      }

      if (shape.kind === "chart" && !shape.chart) {
        push({
          ...ref,
          code: "chart-data-lost",
          severity: "high",
          category: "charts",
          title: "Chart data could not be read",
          detail: `"${name}" is kept as a visual fallback because its chart part could not be parsed. The original remains available.`,
          fix: "manual",
        });
      }
    });

    // Flattened slide detection.
    const imageShapes = shapes.filter((s) => s.kind === "image");
    const textShapes = shapes.filter(
      (s) => s.kind === "text" && s.text.paras.some((p) => p.runs.some((r) => r.text.trim())),
    );
    const fullBleed = imageShapes.find(
      (s) => s.frame.w >= size.w * 0.97 && s.frame.h >= size.h * 0.97,
    );
    if (fullBleed && textShapes.length === 0 && shapes.length <= 2) {
      push({
        code: "flattened-slide",
        severity: "high",
        category: "imagery",
        title: "Slide is a flattened image",
        detail: "The whole slide arrived as one picture with no live text, so nothing on it is editable yet. Convert to an OnDeck module to rebuild it as real objects.",
        slideIndex,
        fix: "manual",
      });
    }

    // Accessibility: alt text + reading order.
    (layers ?? []).forEach((layer, i) => {
      const needsAlt = layer.node === "pic" || layer.role === "Chart / SmartArt" || layer.role === "Table";
      if (needsAlt && !layer.altText) {
        push({
          code: "missing-alt-text",
          severity: "medium",
          category: "accessibility",
          title: "Missing alt text",
          detail: `"${layer.name}" has no alternative text, so screen readers announce nothing for it.`,
          slideIndex,
          elementRef: layer.name,
          shapeIndex: i,
          fix: "review",
          fixLabel: "Generate alt text for review",
        });
      }
    });
    const titleFirst = (layers ?? []).findIndex((l) => l.placeholder === "title" || l.placeholder === "ctrTitle");
    if (titleFirst > 0) {
      push({
        code: "reading-order",
        severity: "low",
        category: "accessibility",
        title: "Title is not first in reading order",
        detail: `The title placeholder is object ${titleFirst + 1} in the slide's z-order, so assistive tech reads other content first.`,
        slideIndex,
        fix: "review",
        fixLabel: "Move the title first in reading order",
      });
    }
  });

  // Font substitution is deck-level.
  if (substituted.size > 0) {
    push({
      code: "font-substitution",
      severity: "high",
      category: "fonts",
      title: `${substituted.size} font${substituted.size === 1 ? "" : "s"} will be substituted`,
      detail: `Not available for rendering or export: ${[...substituted].join(", ")}. Line breaks and text width may shift. Embed the fonts, or remap them to the brand stack.`,
      slideIndex: null,
      fix: "review",
      fixLabel: "Remap to the brand type stack",
    });
  }

  const embeddedTypefaces = new Set(deck.embeddedFonts.map((f) => f.typeface.toLowerCase()));
  for (const font of substituted) {
    if (embeddedTypefaces.has(font.toLowerCase())) {
      push({
        code: "font-embedded-available",
        severity: "info",
        category: "fonts",
        title: `"${font}" is embedded in the source`,
        detail: "The typeface travels inside the original file, so exporting with font embedding keeps the source appearance.",
        slideIndex: null,
        fix: "safe",
        fixLabel: "Embed the source font on export",
      });
    }
  }

  // ---- Totals + scores ---------------------------------------------------
  const bySeverity: Record<IssueSeverity, number> = { blocker: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byCategory: Record<IssueCategory, number> = {
    fonts: 0,
    text: 0,
    layout: 0,
    imagery: 0,
    charts: 0,
    media: 0,
    links: 0,
    accessibility: 0,
    brand: 0,
    masters: 0,
    integrity: 0,
  };
  const bySlide: Record<number, number> = {};
  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
    byCategory[issue.category] += 1;
    const key = issue.slideIndex ?? -1;
    bySlide[key] = (bySlide[key] ?? 0) + 1;
  }

  const objectBase = Math.max(1, recoveredObjects);
  const penalty = issues.reduce((n, i) => n + SEVERITY_WEIGHT[i.severity], 0);
  // Normalize the penalty against deck size so a 60-slide deck is not punished
  // simply for having more objects than a 3-slide deck.
  const normalized = penalty / Math.max(6, Math.sqrt(objectBase) * 3);
  const compatibility = Math.max(0, Math.min(100, Math.round(100 - normalized)));
  const editablePercent = Math.round((editableObjects / objectBase) * 100);
  const recoveryRatio = sourceObjects > 0 ? Math.min(1, recoveredObjects / sourceObjects) : 1;
  const fidelityPenalty =
    bySeverity.blocker * 10 + bySeverity.high * 3 + bySeverity.medium * 1 + fallbackObjects * 0.5;
  const visualFidelity = Math.max(
    0,
    Math.min(100, Math.round(recoveryRatio * 100 - fidelityPenalty / Math.max(1, deck.slides.length))),
  );

  return {
    scores: { compatibility, editablePercent, visualFidelity },
    issues,
    totals: { bySeverity, byCategory, bySlide },
    objects: {
      source: sourceObjects,
      recovered: recoveredObjects,
      editable: editableObjects,
      fallback: fallbackObjects,
    },
    substitutedFonts: [...substituted],
    source: options.source ?? null,
  };
}

/** Issues that may be applied in bulk without changing design intent. */
export function safeFixes(report: CompatReport): CompatIssue[] {
  return report.issues.filter((i) => i.fix === "safe");
}

/** Issues that need explicit approval or hands-on work. */
export function reviewQueue(report: CompatReport): CompatIssue[] {
  return report.issues.filter((i) => i.fix !== "safe");
}
