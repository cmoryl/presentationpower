// Governance layer for email signatures.
//
// Signature Craft (the ported engine) lets a person pick any colour, face and
// logo. Element does not: every signature renders in the approved palette of a
// brand mode, with an approved division lockup, in an email-safe face. Admins
// can unlock the styling controls for a genuine exception — everyone else gets
// the locked look, and the layout templates are the only choice on offer.

import { BRAND_MODES } from "@/lib/taxonomy";
import { normalizeBrandModeTokens } from "@/lib/brand-profiles";
import { divisionLogoSlug } from "@/lib/division-logo-slugs";
import type { SignatureData } from "@/lib/signature/types";

/**
 * Absolute origin used for images inside a signature. Email clients cannot
 * resolve a relative path, so every lockup URL must be fully qualified and
 * must point at a public, permanently hosted file.
 */
export const SIGNATURE_ORIGIN = "https://transperfectelement.lovable.app";

/**
 * The approved face, written as an email-safe stack. Geist is the house
 * typeface but is not installed on mail clients, so Arial carries the
 * fallback — the same order the brand guide allows for email.
 */
export const SIGNATURE_FONT = "Geist, Arial, Helvetica, sans-serif";

/** Dark Gray from the approved neutrals — the only secondary text colour. */
export const SIGNATURE_SECONDARY_INK = "#666666";

/** Brand modes a signature may be built in. */
export const SIGNATURE_BRAND_MODES = BRAND_MODES.map(normalizeBrandModeTokens);

export type SignatureBrandLook = {
  brandModeId: string;
  brandName: string;
  /** Name, labels and rules. */
  primaryColor: string;
  /** Body / contact lines. */
  secondaryColor: string;
  /** Accent bars, dividers and borders. Never used for body text. */
  accentColor: string;
  fontFamily: string;
  cardBackground: string;
};

export function brandSignatureLook(brandModeId: string): SignatureBrandLook {
  const brand =
    SIGNATURE_BRAND_MODES.find((b) => b.id === brandModeId) ?? SIGNATURE_BRAND_MODES[0];
  return {
    brandModeId: brand.id,
    brandName: brand.name,
    primaryColor: brand.tokens.primary,
    secondaryColor: SIGNATURE_SECONDARY_INK,
    accentColor: brand.tokens.accent,
    fontFamily: SIGNATURE_FONT,
    cardBackground: "#FFFFFF",
  };
}

/**
 * Natural proportions of each approved horizontal lockup, measured from the
 * files in /public/brand-logos. A lockup is only ever scaled by these figures
 * so it can never be stretched.
 */
const LOCKUP_ASPECT: Record<string, number> = {
  tp: 1600 / 163,
  globallink: 2500 / 507,
  legal: 2500 / 734,
  lifesci: 2500 / 640,
  media: 2500 / 700,
  games: 2500 / 636,
  digital: 2500 / 676,
  dataforce: 2500 / 436,
};

export type SignatureLockup = {
  slug: string;
  url: string;
  /** width ÷ height of the artwork. */
  aspect: number;
};

/**
 * The approved lockup for a brand mode, as an absolute image URL. Returns null
 * when the division has no email-safe raster lockup on file (Trial Interactive
 * ships as SVG only, which Outlook will not draw) — the caller must say so
 * rather than substitute another division's mark.
 */
/**
 * Which approved artwork file carries each lockup in a signature. The master
 * TransPerfect `-color` file is the NEXT event lockup, which must never stand in
 * for the corporate wordmark on business email, so the master brands use the
 * approved black wordmark instead. It is used as supplied — never recoloured.
 */
const LOCKUP_FILE: Record<string, string> = {
  tp: "tp-black",
};

export function signatureLockup(brandModeId: string): SignatureLockup | null {
  const slug = divisionLogoSlug(brandModeId);
  if (!slug) return null;
  const aspect = LOCKUP_ASPECT[slug];
  if (!aspect) return null;
  const file = LOCKUP_FILE[slug] ?? `${slug}-color`;
  return { slug, url: `${SIGNATURE_ORIGIN}/brand-logos/${file}.png`, aspect };
}

/** Lockup height, in px, for a requested printed width. */
export function lockupBox(lockup: SignatureLockup, width: number): { width: number; height: number } {
  const w = Math.max(60, Math.min(320, Math.round(width)));
  return { width: w, height: Math.max(12, Math.round(w / lockup.aspect)) };
}

/**
 * Force a signature into the approved look of a brand mode. Layout, content
 * and spacing are left alone — only colour, face, card background and the
 * lockup are governed.
 */
export function applyBrandLock(
  signature: SignatureData,
  brandModeId: string,
  options: { lockupWidth?: number; keepLogo?: boolean } = {},
): SignatureData {
  const look = brandSignatureLook(brandModeId);
  const lockup = signatureLockup(brandModeId);
  const logo = lockup
    ? {
        ...signature.logo,
        ...lockupBox(lockup, options.lockupWidth ?? signature.logo.width ?? 150),
        url: options.keepLogo && signature.logo.url ? signature.logo.url : lockup.url,
        shape: "square" as const,
      }
    : { ...signature.logo, url: options.keepLogo ? signature.logo.url : "" };
  return {
    ...signature,
    logo,
    styling: {
      ...signature.styling,
      primaryColor: look.primaryColor,
      secondaryColor: look.secondaryColor,
      fontFamily: look.fontFamily,
      divider: { ...signature.styling.divider, color: look.accentColor },
      border: { ...signature.styling.border, color: look.accentColor },
      card: {
        ...(signature.styling.card ?? { shadow: "none", radius: 0 }),
        background: look.cardBackground,
      },
    },
  };
}

/**
 * Plain-language list of everything in a signature that departs from the
 * approved look. Empty means the signature is on brand.
 */
export function signatureBrandNotes(signature: SignatureData, brandModeId: string): string[] {
  const look = brandSignatureLook(brandModeId);
  const lockup = signatureLockup(brandModeId);
  const notes: string[] = [];
  const s = signature.styling;
  if (s.primaryColor.toUpperCase() !== look.primaryColor.toUpperCase()) {
    notes.push(`Name colour is ${s.primaryColor}, not the approved ${look.primaryColor}.`);
  }
  if (s.secondaryColor.toUpperCase() !== look.secondaryColor.toUpperCase()) {
    notes.push(`Contact text is ${s.secondaryColor}, not the approved ${look.secondaryColor}.`);
  }
  if (s.fontFamily !== look.fontFamily) {
    notes.push(`Typeface is "${s.fontFamily}", not the approved email face.`);
  }
  if ((s.card?.background ?? "#FFFFFF").toUpperCase() !== look.cardBackground) {
    notes.push(`Card background is ${s.card?.background}, not white.`);
  }
  if (lockup && signature.logo.url && signature.logo.url !== lockup.url) {
    notes.push("The logo is not the approved lockup for this brand.");
  }
  if (lockup && signature.logo.url === lockup.url) {
    const box = lockupBox(lockup, signature.logo.width);
    if (box.height !== signature.logo.height) {
      notes.push("The lockup is off its own proportions — it would print stretched.");
    }
  }
  if (!lockup) {
    notes.push(
      "This brand has no email-safe lockup on file, so the signature prints without a logo.",
    );
  }
  return notes;
}
