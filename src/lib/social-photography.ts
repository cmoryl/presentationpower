// Division-scoped photography examples for the live social demos.
//
// A small, deterministic set of generated brand-appropriate photos, keyed by
// division brand id and grouped by aspect class so any social format can pick
// a correctly-cropped frame. Only some divisions have photography today —
// callers should treat a missing entry as "aurora only" and keep rendering.

import gamingWide from "@/assets/social-photo/gaming-wide.jpg";
import gamingSquare from "@/assets/social-photo/gaming-square.jpg";
import gamingTall from "@/assets/social-photo/gaming-tall.jpg";
import mediaWide from "@/assets/social-photo/media-wide.jpg";
import mediaSquare from "@/assets/social-photo/media-square.jpg";
import mediaTall from "@/assets/social-photo/media-tall.jpg";
import legalWide from "@/assets/social-photo/legal-wide.jpg";
import legalSquare from "@/assets/social-photo/legal-square.jpg";
import legalTall from "@/assets/social-photo/legal-tall.jpg";
import lifesciWide from "@/assets/social-photo/lifesci-wide.jpg";
import lifesciSquare from "@/assets/social-photo/lifesci-square.jpg";
import lifesciTall from "@/assets/social-photo/lifesci-tall.jpg";
import digitalWide from "@/assets/social-photo/digital-wide.jpg";
import digitalSquare from "@/assets/social-photo/digital-square.jpg";
import digitalTall from "@/assets/social-photo/digital-tall.jpg";
import enterpriseWide from "@/assets/social-photo/enterprise-wide.jpg";
import enterpriseSquare from "@/assets/social-photo/enterprise-square.jpg";
import enterpriseTall from "@/assets/social-photo/enterprise-tall.jpg";
import trialWide from "@/assets/social-photo/trial-wide.jpg";
import trialSquare from "@/assets/social-photo/trial-square.jpg";
import trialTall from "@/assets/social-photo/trial-tall.jpg";
import cobrandWide from "@/assets/social-photo/cobrand-wide.jpg";
import cobrandSquare from "@/assets/social-photo/cobrand-square.jpg";
import cobrandTall from "@/assets/social-photo/cobrand-tall.jpg";

// Master TransPerfect — the curated corporate-dark brand backdrop set, used
// in place of a flat gradient for the house-level anthem demos.
import masterWide from "@/assets/backdrops/corporate-dark/bg-02.webp";
import masterSquare from "@/assets/backdrops/corporate-dark/bg-05.webp";
import masterTall from "@/assets/backdrops/corporate-dark/bg-08.webp";

import type { SocialFormat } from "./social-formats";
import { aspectClass } from "./social-formats";

export type PhotoSet = {
  label: string;
  credit: string;
  wide: string;
  square: string;
  tall: string;
};

export const SOCIAL_PHOTO_SETS: Record<string, PhotoSet> = {
  "bm-tp-master": {
    label: "TransPerfect — corporate brand backdrops",
    credit: "TransPerfect master backdrop set · corporate dark",
    wide: masterWide,
    square: masterSquare,
    tall: masterTall,
  },

  "bm-tp-games": {
    label: "Gaming — studio & player",
    credit: "Generated example set · gaming localization",
    wide: gamingWide,
    square: gamingSquare,
    tall: gamingTall,
  },
  "bm-tp-media": {
    label: "Media — dubbing & post",
    credit: "Generated example set · media localization",
    wide: mediaWide,
    square: mediaSquare,
    tall: mediaTall,
  },
  "bm-tp-legal": {
    label: "Legal — review & counsel",
    credit: "Generated example set · legal solutions",
    wide: legalWide,
    square: legalSquare,
    tall: legalTall,
  },
  "bm-tp-lifesci": {
    label: "Life Sciences — lab & clinic",
    credit: "Generated example set · life sciences",
    wide: lifesciWide,
    square: lifesciSquare,
    tall: lifesciTall,
  },
  "bm-tp-digital": {
    label: "Digital — campaign operations",
    credit: "Generated example set · digital marketing",
    wide: digitalWide,
    square: digitalSquare,
    tall: digitalTall,
  },
  "bm-enterprise": {
    label: "Enterprise — leadership & scale",
    credit: "Generated example set · enterprise solutions",
    wide: enterpriseWide,
    square: enterpriseSquare,
    tall: enterpriseTall,
  },
  "bm-trial-interactive": {
    label: "Trial Interactive — clinical sites & eTMF",
    credit: "Generated example set · Trial Interactive",
    wide: trialWide,
    square: trialSquare,
    tall: trialTall,
  },
  "bm-cobrand": {
    label: "Partner co-brand — shared teams",
    credit: "Generated example set · co-branded partnerships",
    wide: cobrandWide,
    square: cobrandSquare,
    tall: cobrandTall,
  },
};

export function getPhotoSet(brandId: string): PhotoSet | undefined {
  return SOCIAL_PHOTO_SETS[brandId];
}

/** Correctly-cropped photo for a given format, or undefined when the
 *  division has no photography set yet. */
export function photoForFormat(brandId: string, format: SocialFormat): string | undefined {
  const set = getPhotoSet(brandId);
  if (!set) return undefined;
  switch (aspectClass(format)) {
    case "landscape-wide":
    case "landscape":
      return set.wide;
    case "square":
      return set.square;
    case "portrait":
    case "portrait-tall":
      return set.tall;
  }
}
