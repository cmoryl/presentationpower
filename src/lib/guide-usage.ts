/**
 * GUIDE USAGE — what a division actually uses, read back from finished work.
 *
 * Brand guides are authored documents: nothing on a guide page is ever changed
 * by this module. It only reports, so a brand lead can see the looks and
 * grounds real slides, print and social are being built in, and confirm or
 * correct the written guide themselves.
 *
 * Pure shaping + drift detection; the counting happens in
 * `guide-usage.functions.ts`.
 */

import { skinByCode } from "@/lib/skin-backdrop-prompt";
import { stylePackFromSkin } from "@/lib/design-skin-pack";
import { stylePackById } from "@/lib/style-packs";
import { SKIN_MOTIF, MOTIF_LABEL } from "@/lib/skin-backgrounds";
import type { BrandGuide } from "@/lib/brand-guides";

export interface GuideUsageSurfaces {
  decks: number;
  print: number;
  social: number;
}

export interface GuideUsageLook {
  /** Look code, e.g. "S06", "R22". */
  code: string;
  count: number;
  surfaces: GuideUsageSurfaces;
  lastUsed: string | null;
  /** Reviewer outcomes credited to this look on this division's work. */
  approved: number;
  sentBack: number;
}

export interface GuideUsage {
  divisionId: string;
  /** Pieces of finished work counted (all surfaces). */
  total: number;
  /** Pieces built on the approved brand system, with no separate look. */
  brandSystem: number;
  looks: GuideUsageLook[];
  lastUsed: string | null;
}

export interface GuideUsageLookView extends GuideUsageLook {
  name: string;
  motif: string | null;
  accent: string | null;
  surface: string | null;
  mode: "light" | "dark" | null;
}

function packForCode(code: string) {
  const skin = skinByCode(code.toUpperCase());
  if (skin) return stylePackFromSkin(skin);
  const lower = code.toLowerCase();
  return stylePackById(`skin-${lower}`) ?? stylePackById(`tpl-${lower}`) ?? null;
}

/** Look name as the library calls it — never invented. */
export function lookName(code: string): string {
  const skin = skinByCode(code.toUpperCase());
  if (skin?.name) return skin.name;
  return packForCode(code)?.label ?? code.toUpperCase();
}

export function describeUsageLook(look: GuideUsageLook): GuideUsageLookView {
  const code = look.code.toUpperCase();
  const pack = packForCode(code);
  return {
    ...look,
    code,
    name: lookName(code),
    motif: SKIN_MOTIF[code] ? MOTIF_LABEL[SKIN_MOTIF[code]!] : null,
    accent: pack?.tokens.accent ?? null,
    surface: pack?.tokens.surface ?? null,
    mode: pack ? (pack.mode === "dark" ? "dark" : "light") : null,
  };
}

function hexSet(guide: BrandGuide): Set<string> {
  const out = new Set<string>();
  for (const group of [guide.primaryColors, guide.secondaryColors, guide.neutrals]) {
    for (const swatch of group ?? []) {
      if (swatch?.hex) out.add(swatch.hex.trim().toLowerCase());
    }
  }
  return out;
}

export interface GuideDriftNote {
  kind: "colour" | "outcome" | "coverage";
  text: string;
}

/**
 * Where the written guide and the real work disagree. Flagged for a brand lead
 * to confirm — never applied automatically.
 */
export function guideUsageDrift(usage: GuideUsage, guide: BrandGuide): GuideDriftNote[] {
  const notes: GuideDriftNote[] = [];
  if (usage.total === 0) return notes;
  const documented = hexSet(guide);
  const views = usage.looks.map(describeUsageLook);

  const offPalette = views.filter(
    (v) => v.count >= 2 && v.accent && !documented.has(v.accent.toLowerCase()),
  );
  if (offPalette.length) {
    const named = offPalette
      .slice(0, 3)
      .map((v) => `${v.name} (${v.accent})`)
      .join(", ");
    notes.push({
      kind: "colour",
      text: `Work in this division keeps using accents this guide doesn't list: ${named}. Confirm them here or move the work back onto the documented palette.`,
    });
  }

  const sentBack = views.filter((v) => v.sentBack > 0 && v.sentBack >= v.approved);
  if (sentBack.length) {
    notes.push({
      kind: "outcome",
      text: `Reviewers send back as much as they approve in: ${sentBack
        .slice(0, 3)
        .map((v) => v.name)
        .join(", ")}. Worth saying in the guide which look this division should lead with.`,
    });
  }

  if (usage.looks.length === 0 && usage.brandSystem > 0) {
    notes.push({
      kind: "coverage",
      text: "Every piece here was built on the approved brand system with no separate look chosen, so there is nothing to learn from yet.",
    });
  }

  return notes;
}
