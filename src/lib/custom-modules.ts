// Custom modules — admin-authored slide modules published into the module
// library for end users.
//
// A custom module is deliberately NOT a new renderer: it is a *preset* made of
//   • a base module variant (an existing MV-* render, or the blank canvas), and
//   • seeded content for that variant, plus
//   • free-canvas blocks layered on top (text, shapes, icons, imagery, SVG).
//
// Because that is exactly the shape a normal deck slide already has, every
// downstream surface — the editor, present/share, PDF, PNG and the layered
// PPTX export — works with custom modules with no extra code paths.

import type { CanvasBlock, DeckSlide, SlideContent } from "@/lib/deck-store";
import { MODULE_VARIANTS, byId, type ModuleVariant } from "@/lib/taxonomy";
import { repairBlocks } from "@/lib/canvas-repair";

/** Base variant used when an admin starts from an empty stage. */
export const BLANK_VARIANT_ID = "MV-CANVAS-BLANK";

/** Family every custom module belongs to (MF-08 "Custom & Canvas"). */
export const CUSTOM_FAMILY_ID = "MF-08";

export type CustomModuleStatus = "draft" | "published" | "archived";

export type CustomModuleRow = {
  id: string;
  module_key: string;
  name: string;
  description: string;
  base_variant_id: string;
  family_id: string;
  section_id: string | null;
  brand_mode: string | null;
  tags: string[];
  content: Record<string, unknown>;
  canvas_blocks: unknown;
  notes: string | null;
  thumbnail_url: string | null;
  status: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

/** Stable, human-readable key: "CM-PROCESS-LOOP". */
export function customModuleKey(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase()
    .slice(0, 32);
  return `CM-${slug || "MODULE"}`;
}

/** Coerce stored JSON into canvas blocks, dropping anything malformed. */
export function normalizeCanvasBlocks(raw: unknown): CanvasBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: CanvasBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const b = item as Record<string, unknown>;
    const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
    const kind = String(b.kind ?? "body");
    if (!["heading", "body", "caption", "image", "shape"].includes(kind)) continue;
    out.push({
      ...(b as unknown as CanvasBlock),
      id: String(b.id ?? `cb-${out.length}`),
      kind: kind as CanvasBlock["kind"],
      x: num(b.x, 0),
      y: num(b.y, 0),
      w: num(b.w, 320),
      h: num(b.h, 120),
      text: typeof b.text === "string" ? b.text : "",
    });
  }
  // Heal geometry measured on an unscaled stage so a library module renders
  // and exports exactly like a deck slide (see canvas-repair.ts).
  return repairBlocks(out) as CanvasBlock[];
}

/** The variant a custom module renders through. */
export function baseVariantFor(row: Pick<CustomModuleRow, "base_variant_id">): ModuleVariant | undefined {
  return byId(MODULE_VARIANTS, row.base_variant_id);
}

/**
 * Build a preview / insertable slide for a custom module. Used by the studio
 * stage, the library cards and the "Add slide" gallery so what an admin
 * publishes is byte-for-byte what an end user inserts.
 */
export function customModuleSlide(
  row: CustomModuleRow,
  opts?: { id?: string; sectionId?: string },
): { slide: DeckSlide; variant: ModuleVariant } | null {
  const variant = baseVariantFor(row);
  if (!variant) return null;
  return {
    variant,
    slide: {
      id: opts?.id ?? `custom-${row.id}`,
      position: 0,
      sectionId: opts?.sectionId ?? row.section_id ?? "SEC-01",
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0] ?? "LF-01",
      content: (row.content ?? {}) as SlideContent,
      changes: [],
      canvasBlocks: normalizeCanvasBlocks(row.canvas_blocks),
    },
  };
}

export type CustomModuleIssue = { level: "error" | "warning"; message: string };

/**
 * Pre-publish checks. Deliberately deterministic so the studio can gate the
 * "Publish" button and explain exactly what is missing.
 */
export function validateCustomModule(input: {
  name: string;
  description: string;
  baseVariantId: string;
  blocks: readonly CanvasBlock[];
  content: Record<string, unknown>;
}): CustomModuleIssue[] {
  const issues: CustomModuleIssue[] = [];
  if (input.name.trim().length < 3) {
    issues.push({ level: "error", message: "Give the module a name of at least 3 characters." });
  }
  if (!byId(MODULE_VARIANTS, input.baseVariantId)) {
    issues.push({ level: "error", message: `Base module “${input.baseVariantId}” no longer exists.` });
  }
  const visible = input.blocks.filter((b) => !b.hidden);
  const isBlankBase = input.baseVariantId === BLANK_VARIANT_ID;
  if (isBlankBase && visible.length === 0) {
    issues.push({
      level: "error",
      message: "A blank base needs at least one canvas object — add text, a shape or an image.",
    });
  }
  if (input.description.trim().length < 10) {
    issues.push({
      level: "warning",
      message: "Add a short description so builders know when to use this module.",
    });
  }
  for (const b of visible) {
    if (b.x < 0 || b.y < 0 || b.x + b.w > 1920 || b.y + b.h > 1080) {
      issues.push({
        level: "warning",
        message: `“${b.text?.slice(0, 24) || b.kind}” sits partly off the 1920×1080 stage.`,
      });
      break;
    }
  }
  if (visible.some((b) => b.kind === "image" && !b.src)) {
    issues.push({ level: "error", message: "An image object has no artwork — upload or remove it." });
  }
  return issues;
}

export function canPublish(issues: readonly CustomModuleIssue[]): boolean {
  return !issues.some((i) => i.level === "error");
}
