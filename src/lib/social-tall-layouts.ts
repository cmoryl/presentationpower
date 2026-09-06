/**
 * SOCIAL TALL LAYOUTS
 * ---------------------------------------------------------------------------
 * A handful of library modules are intrinsically thin strips: an inline quote,
 * a credential pill row, an icon strip, a CTA band, an expert card. Their
 * height is a function of their width, so no amount of enlarging or padding
 * (the growth / air ladders in `social-module-fit.ts`) can make them fill a
 * square, portrait or story frame — they simply sit as a band in the middle.
 *
 * This file gives each of those strips a designed tall counterpart: the same
 * section kind and the same copy, re-composed on a variant that stacks
 * vertically. Because every module in a family shares one section type, the
 * swap is a variant change plus a field merge — the author's edits survive,
 * and any field the tall variant needs but the strip never had is filled from
 * the tall variant's own defaults.
 *
 * Pure functions only. The frame decides when to apply this (tall aspect
 * classes), this file decides what the tall composition is.
 */

import type { PrintSection } from "@/lib/print-assets.types";
import type { AspectClass } from "@/lib/social-formats";
import { PRINT_SECTION_MODULES } from "@/lib/print-library/section-modules";

export type SocialTallPlan = {
  /** Variant id of the thin strip. */
  from: string;
  /** Variant id of the tall composition it becomes. */
  to: string;
  /** Why, in the studio's own words. */
  note: string;
};

/** Aspect classes that need a stacked composition rather than a strip. */
export const SOCIAL_TALL_CLASSES: AspectClass[] = ["square", "portrait", "portrait-tall"];

export function isTallAspect(cls: AspectClass): boolean {
  return SOCIAL_TALL_CLASSES.includes(cls);
}

/**
 * Thin strip → tall composition. Each pair stays inside its own family so the
 * copy, tone and export path are unchanged.
 */
export const SOCIAL_TALL_PLANS: SocialTallPlan[] = [
  {
    from: "quote-inline-compact",
    to: "quote-attribution-card",
    note: "Inline quote restacked as an attribution card so the voice fills the frame",
  },
  {
    from: "expertise-credential-pills",
    to: "expertise-checklist",
    note: "Credential pills restacked as a ruled credential column",
  },
  {
    from: "expertise-icon-strip",
    to: "expertise-checklist",
    note: "Icon strip restacked as a vertical capability list",
  },
  {
    from: "contact-cta-band",
    to: "contact-global-panel",
    note: "CTA band restacked as a full closing panel",
  },
  {
    from: "contact-expert-card",
    to: "contact-global-panel",
    note: "Expert card restacked as a contact panel with a region rail",
  },
  {
    from: "logo-row-portrait",
    to: "logo-grid-portrait",
    note: "Logo row rewrapped as a grid so the roster reads down the frame",
  },
  {
    from: "stat-callout-row-portrait",
    to: "stat-bento-portrait",
    note: "Stat row restacked as a bento with a lead figure",
  },
  {
    from: "table-scale-rail",
    to: "table-spec-rows",
    note: "Scale rail restacked as ruled value rows down the frame",
  },
];

export function tallPlanFor(variantId: string | undefined): SocialTallPlan | undefined {
  if (!variantId) return undefined;
  return SOCIAL_TALL_PLANS.find((p) => p.from === variantId);
}

type Loose = Record<string, unknown>;

function baseSectionFor(variantId: string): PrintSection | undefined {
  const mod = PRINT_SECTION_MODULES.find((m) => m.variantId === variantId);
  return mod?.make();
}

function meaningful(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Re-compose a thin strip section on its tall counterpart. The strip's own
 * fields win; anything the tall variant needs and the strip never carried is
 * taken from the tall variant's defaults.
 */
export function applyTallPlan(section: PrintSection, plan: SocialTallPlan): PrintSection {
  const base = baseSectionFor(plan.to);
  if (!base) return section;
  const src = section as unknown as Loose;
  const out = { ...(base as unknown as Loose) } as Loose;
  for (const [k, v] of Object.entries(src)) {
    if (k === "variantId") continue;
    if (!meaningful(v)) continue;
    // Only carry a field the tall variant can actually render.
    if (!(k in out) && k !== "id" && k !== "kind") continue;
    out[k] = v;
  }
  out.id = src.id ?? out.id;
  out.kind = src.kind ?? out.kind;
  out.variantId = plan.to;
  return out as unknown as PrintSection;
}

export type SocialTallResult = {
  section: PrintSection;
  plan?: SocialTallPlan;
};

/**
 * The section a social frame should actually render for a given aspect class.
 * Tall frames get the stacked composition; landscape frames keep the strip,
 * which is exactly what a banner wants.
 */
export function socialTallSection(section: PrintSection, cls: AspectClass): SocialTallResult {
  if (!isTallAspect(cls)) return { section };
  const plan = tallPlanFor((section as unknown as Loose).variantId as string | undefined);
  if (!plan) return { section };
  return { section: applyTallPlan(section, plan), plan };
}

/* -------------------------------------------------------------------------
 * TALL SHELL
 * -------------------------------------------------------------------------
 * A restacked variant is still a card, and a card is still shorter than a
 * story frame. So on tall aspects the composition itself changes: the module
 * sits on a raised panel that spans the safe rect, with an accent rule above
 * it and a spec rail below. That is a designed tall layout — the module is
 * never stretched, it is given furniture that legitimately fills the frame.
 */

export type SocialTallShellGeometry = {
  /** Height of the accent rule band above the panel. */
  headHeight: number;
  /** Height of the spec rail below the panel. */
  railHeight: number;
  /** Outer height of the raised panel. */
  panelHeight: number;
  /** Padding inside the panel. */
  panelPad: number;
  /** Vertical space the module itself may use. */
  contentHeight: number;
  /** Total composed height (head + panel + rail). */
  composedHeight: number;
  /** Panel corner radius. */
  radius: number;
};

/**
 * Collapse the shell around the module's real rendered height: an empty white
 * panel is not a design. The panel hugs its content and the space it gives back
 * is handed to the head band (which then carries a display stack) and the spec
 * rail, so the frame is filled with typography rather than void.
 */
export function tallShellFit(
  base: SocialTallShellGeometry,
  safe: { width: number; height: number },
  renderedHeight: number,
): SocialTallShellGeometry {
  if (!(renderedHeight > 0)) return base;
  const gap = Math.round(safe.height * 0.025);
  const content = Math.min(base.contentHeight, renderedHeight);
  const panelHeight = Math.max(120, Math.round(content + base.panelPad * 2));
  const spare = Math.max(0, base.panelHeight - panelHeight);
  return {
    ...base,
    panelHeight,
    contentHeight: content,
    headHeight: base.headHeight + Math.round(spare * 0.66),
    railHeight: base.railHeight + (spare - Math.round(spare * 0.66)),
    composedHeight: base.headHeight + Math.round(spare * 0.66) + gap * 2 + panelHeight +
      base.railHeight + (spare - Math.round(spare * 0.66)),
  };
}

/** Shell geometry for a safe rect, in frame px. */
export function tallShellGeometry(safe: { width: number; height: number }): SocialTallShellGeometry {
  const headHeight = Math.round(safe.height * 0.07);
  const railHeight = Math.round(safe.height * 0.11);
  const gap = Math.round(safe.height * 0.025);
  const panelHeight = Math.max(160, safe.height - headHeight - railHeight - gap * 2);
  const panelPad = Math.round(safe.width * 0.07);
  return {
    headHeight,
    railHeight,
    panelHeight,
    panelPad,
    contentHeight: Math.max(80, panelHeight - panelPad * 2),
    composedHeight: headHeight + gap * 2 + panelHeight + railHeight,
    radius: Math.round(safe.width * 0.045),
  };
}
