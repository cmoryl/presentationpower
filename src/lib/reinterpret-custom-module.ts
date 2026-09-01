// AI-authored custom modules for imports with no matching native layout.
//
// When the reinterpretation engine can't build ANY native module from a slide's
// copy (title-only pages, odd hybrids of pictures + fragments, exotic diagrams),
// the reviewer used to be left with the divider fallback. This module closes the
// gap: it authors a *new* module deterministically from the source slide's own
// geometry-free signals — a blank base variant plus free-canvas blocks — which is
// exactly the shape a custom module already has (see custom-modules.ts), so the
// editor, present/share, PDF, PNG and layered PPTX export all handle it with no
// new code paths.
//
// Pure + deterministic: every string comes from the source slide; nothing is
// invented. Publishing is admin-gated and happens as a *draft*.

import type { CanvasBlock, SlideContent } from "@/lib/deck-store";
import { BLANK_VARIANT_ID, CUSTOM_FAMILY_ID, customModuleKey } from "@/lib/custom-modules";
import type { MappedSlide } from "@/lib/pptx-mapping";

const STAGE_W = 1920;
const STAGE_H = 1080;
const M = 140; // stage margin

export type CustomModuleProposal = {
  moduleKey: string;
  name: string;
  description: string;
  baseVariantId: string;
  familyId: string;
  sectionId: string | null;
  tags: string[];
  content: SlideContent;
  canvasBlocks: CanvasBlock[];
  notes: string;
  /** Human-readable summary of what was authored, shown in the review row. */
  rationale: string;
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 48);
}

/** Name the module after the slide's intent, not its slide number. */
function proposalName(title: string, imageCount: number, bulletCount: number): string {
  const base = title.trim();
  if (base.length >= 4) return `${titleCase(base)} — Custom`;
  if (imageCount >= 4) return "Image Wall — Custom";
  if (bulletCount >= 5) return "Long List — Custom";
  return "Imported Slide — Custom";
}

function block(b: Partial<CanvasBlock> & Pick<CanvasBlock, "kind" | "x" | "y" | "w" | "h">, i: number): CanvasBlock {
  return {
    id: `cm-${i}`,
    text: "",
    z: i,
    ...b,
  } as CanvasBlock;
}

/**
 * Author a custom module from an unmatched imported slide.
 *
 * Layout rules (deliberately simple + predictable, so the result is editable
 * rather than a pixel trace of the original):
 *   • title band across the top
 *   • copy in one column (≤4 lines) or two columns (5+)
 *   • imagery in a right-hand column, or a full-width grid when there is no copy
 */
export function proposeCustomModule(
  m: MappedSlide,
  opts: { divisionId?: string } = {},
): CustomModuleProposal {
  const src = m.source;
  const title = (src.title || "").trim();
  const bullets = (src.bullets ?? []).map((b) => (b ?? "").trim()).filter(Boolean);
  const images = (src.images ?? []).filter(Boolean).slice(0, 12);
  const notes = (src.notes ?? "").trim();

  const blocks: CanvasBlock[] = [];
  let i = 0;
  let y = M;

  if (title) {
    blocks.push(
      block({ kind: "heading", x: M, y, w: STAGE_W - M * 2, h: 150, text: title, size: 84, weight: 600 }, i++),
    );
    y += 190;
  }

  const hasCopy = bullets.length > 0;
  const imageOnly = !hasCopy && images.length > 0;

  if (imageOnly) {
    // Full-width picture grid — the "logo/screenshot wall" shape.
    const cols = images.length <= 4 ? images.length : images.length <= 8 ? 4 : 4;
    const rows = Math.ceil(images.length / cols);
    const gap = 32;
    const cw = (STAGE_W - M * 2 - gap * (cols - 1)) / cols;
    const availH = STAGE_H - y - M;
    const ch = Math.min(280, (availH - gap * (rows - 1)) / rows);
    images.forEach((srcUrl, n) => {
      const c = n % cols;
      const r = Math.floor(n / cols);
      blocks.push(
        block(
          {
            kind: "image",
            x: M + c * (cw + gap),
            y: y + r * (ch + gap),
            w: cw,
            h: ch,
            src: srcUrl,
            fit: "contain",
            alt: title || "Imported image",
          },
          i++,
        ),
      );
    });
  } else if (hasCopy) {
    const withArt = images.length > 0;
    const copyW = withArt ? Math.round((STAGE_W - M * 2) * 0.52) : STAGE_W - M * 2;
    const lines = bullets.slice(0, 10);
    const twoCol = !withArt && lines.length >= 5;
    const colW = twoCol ? (copyW - 64) / 2 : copyW;
    const perCol = twoCol ? Math.ceil(lines.length / 2) : lines.length;
    const rowH = Math.min(120, Math.max(72, (STAGE_H - y - M) / perCol));

    lines.forEach((text, n) => {
      const c = twoCol && n >= perCol ? 1 : 0;
      const r = twoCol ? n % perCol : n;
      blocks.push(
        block(
          {
            kind: "body",
            x: M + c * (colW + 64),
            y: y + r * rowH,
            w: colW,
            h: rowH - 16,
            text,
            size: 34,
            weight: 400,
          },
          i++,
        ),
      );
    });

    if (withArt) {
      const artX = M + copyW + 64;
      const artW = STAGE_W - artX - M;
      const shown = images.slice(0, 4);
      const gap = 24;
      const rows = shown.length <= 1 ? 1 : 2;
      const cols = shown.length <= 2 ? 1 : 2;
      const availH = STAGE_H - y - M;
      const ih = (availH - gap * (rows - 1)) / rows;
      const iw = (artW - gap * (cols - 1)) / cols;
      shown.forEach((srcUrl, n) => {
        const c = n % cols;
        const r = Math.floor(n / cols);
        blocks.push(
          block(
            {
              kind: "image",
              x: artX + c * (iw + gap),
              y: y + r * (ih + gap),
              w: iw,
              h: ih,
              src: srcUrl,
              fit: "cover",
              alt: title || "Imported image",
            },
            i++,
          ),
        );
      });
    }
  } else if (notes) {
    blocks.push(
      block(
        {
          kind: "body",
          x: M,
          y,
          w: STAGE_W - M * 2,
          h: Math.min(520, STAGE_H - y - M),
          text: notes.slice(0, 600),
          size: 34,
        },
        i++,
      ),
    );
  }

  const name = proposalName(title, images.length, bullets.length);
  const shape = imageOnly
    ? `${images.length}-image wall`
    : bullets.length
      ? `${Math.min(10, bullets.length)}-line copy${images.length ? ` + ${Math.min(4, images.length)} image${images.length === 1 ? "" : "s"}` : ""}`
      : "title + narrative";

  return {
    moduleKey: customModuleKey(name),
    name,
    description: `Authored from an imported slide no native module could hold — ${shape}. Edit freely; every object is a native canvas block.`,
    baseVariantId: BLANK_VARIANT_ID,
    familyId: CUSTOM_FAMILY_ID,
    sectionId: m.sectionId ?? null,
    tags: [
      "ai-authored",
      "import-gap",
      imageOnly ? "imagery" : "copy",
      ...(opts.divisionId ? [opts.divisionId] : []),
    ],
    content: { title: title || undefined } as SlideContent,
    canvasBlocks: blocks,
    notes: notes || "",
    rationale: `AI-authored custom module — ${name} (${shape})`,
  };
}

/** Apply a proposal to a mapped slide so previews/exports use the new module. */
export function applyCustomModuleProposal(
  m: MappedSlide,
  p: CustomModuleProposal,
): MappedSlide & { canvasBlocks: CanvasBlock[] } {
  return {
    ...m,
    variantId: p.baseVariantId,
    layoutId: "LF-01",
    content: p.content,
    canvasBlocks: p.canvasBlocks,
    rationale: p.rationale,
  };
}

/** True when no native module could hold this slide (the gap this closes). */
export function needsCustomModule(designed: MappedSlide | undefined, wantedVariantId: string) {
  return Boolean(designed && designed.variantId !== wantedVariantId);
}
