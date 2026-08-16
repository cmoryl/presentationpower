/**
 * CUSTOM TEMPLATES — admin-authored looks that render through the exact same
 * pipeline as the catalog skins.
 *
 * A row in `public.custom_templates` is translated into a `DesignSkin`, then
 * into a `StylePack` through `stylePackFromSkin`. The template's *base* code
 * (an S/R catalog code) supplies geometry, motif family and layout traits; the
 * row supplies palette, type character, surface treatment, imagery and density.
 * Nothing forks: every preview, deck render and PPTX export path already knows
 * how to dress a pack.
 */

import type { DesignSkin } from "./design-skins";
import { stylePackFromSkin } from "./design-skin-pack";
import type { StylePack } from "./style-packs";

export interface CustomTemplate {
  id: string;
  code: string;
  name: string;
  reference: string;
  description: string;
  bestFit: string;
  mode: "light" | "dark";
  /** Five stops: page field, ink, accent, accent alt, support. */
  palette: string[];
  typography: string;
  surfaceNote: string;
  imagery: string;
  density: string;
  /** Catalog code the geometry/motif is inherited from, e.g. "S02". */
  baseSkinCode: string | null;
  spec: string;
  status: "draft" | "published";
  notes: string;
  updatedAt?: string;
}

export const TEMPLATE_PACK_PREFIX = "tpl-";

/** Stable pack id for a custom template code, e.g. "tpl-c01". */
export function templatePackId(code: string): string {
  return `${TEMPLATE_PACK_PREFIX}${code.trim().toLowerCase()}`;
}

export function isTemplatePackId(id: string | null | undefined): boolean {
  return Boolean(id && id.startsWith(TEMPLATE_PACK_PREFIX));
}

export function templateCodeFromPackId(id: string): string {
  return id.replace(new RegExp(`^${TEMPLATE_PACK_PREFIX}`), "").toUpperCase();
}

/** The template as a catalog skin. Geometry follows the base code. */
export function templateToSkin(t: CustomTemplate): DesignSkin {
  return {
    code: (t.baseSkinCode ?? "S01").toUpperCase(),
    name: t.name,
    reference: t.reference,
    description: t.description,
    bestFit: t.bestFit,
    mode: t.mode,
    palette: t.palette,
    typography: t.typography,
    surfaceNote: t.surfaceNote,
    imagery: t.imagery,
    density: t.density,
    spec: t.spec,
  };
}

/** Renderable pack for a template — identity comes from the template, not the base. */
export function templateToPack(t: CustomTemplate): StylePack {
  const pack = stylePackFromSkin(templateToSkin(t));
  return {
    ...pack,
    id: templatePackId(t.code) as StylePack["id"],
    label: t.name,
    tagline: t.description || `Custom template ${t.code.toUpperCase()}`,
    reference: t.reference || "Custom template",
  };
}
