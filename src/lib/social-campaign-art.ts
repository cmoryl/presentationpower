// Campaign-specific demo imagery for the live social playbook demos.
//
// The division photo sets in social-photography.ts are brand-level: every
// playbook for a division wore the same three crops, so two campaigns from the
// same division looked identical. This module is keyed on the PLAYBOOK, with a
// purpose-shot wide / square / tall crop per campaign, so each demo reads as
// its own piece of creative while staying in the enterprise palette.
//
// Falls back to the division photo set when a playbook has no art of its own.

import cobrandPartnershipSquare from "@/assets/social-campaign/cobrand-partnership-square.jpg";
import cobrandPartnershipTall from "@/assets/social-campaign/cobrand-partnership-tall.jpg";
import cobrandPartnershipWide from "@/assets/social-campaign/cobrand-partnership-wide.jpg";
import digitalGloballinkTeaseSquare from "@/assets/social-campaign/digital-globallink-tease-square.jpg";
import digitalGloballinkTeaseTall from "@/assets/social-campaign/digital-globallink-tease-tall.jpg";
import digitalGloballinkTeaseWide from "@/assets/social-campaign/digital-globallink-tease-wide.jpg";
import digitalGloballinkWebinarSquare from "@/assets/social-campaign/digital-globallink-webinar-square.jpg";
import digitalGloballinkWebinarTall from "@/assets/social-campaign/digital-globallink-webinar-tall.jpg";
import digitalGloballinkWebinarWide from "@/assets/social-campaign/digital-globallink-webinar-wide.jpg";
import enterpriseInvestorUpdateSquare from "@/assets/social-campaign/enterprise-investor-update-square.jpg";
import enterpriseInvestorUpdateTall from "@/assets/social-campaign/enterprise-investor-update-tall.jpg";
import enterpriseInvestorUpdateWide from "@/assets/social-campaign/enterprise-investor-update-wide.jpg";
import gamesLaunchDropSquare from "@/assets/social-campaign/games-launch-drop-square.jpg";
import gamesLaunchDropTall from "@/assets/social-campaign/games-launch-drop-tall.jpg";
import gamesLaunchDropWide from "@/assets/social-campaign/games-launch-drop-wide.jpg";
import gamingScaleDropSquare from "@/assets/social-campaign/gaming-scale-drop-square.jpg";
import gamingScaleDropTall from "@/assets/social-campaign/gaming-scale-drop-tall.jpg";
import gamingScaleDropWide from "@/assets/social-campaign/gaming-scale-drop-wide.jpg";
import legalCaseWinSpotlightSquare from "@/assets/social-campaign/legal-case-win-spotlight-square.jpg";
import legalCaseWinSpotlightTall from "@/assets/social-campaign/legal-case-win-spotlight-tall.jpg";
import legalCaseWinSpotlightWide from "@/assets/social-campaign/legal-case-win-spotlight-wide.jpg";
import legalEdiscoveryInsightSquare from "@/assets/social-campaign/legal-ediscovery-insight-square.jpg";
import legalEdiscoveryInsightTall from "@/assets/social-campaign/legal-ediscovery-insight-tall.jpg";
import legalEdiscoveryInsightWide from "@/assets/social-campaign/legal-ediscovery-insight-wide.jpg";
import lifesciRegulatoryMilestoneSquare from "@/assets/social-campaign/lifesci-regulatory-milestone-square.jpg";
import lifesciRegulatoryMilestoneTall from "@/assets/social-campaign/lifesci-regulatory-milestone-tall.jpg";
import lifesciRegulatoryMilestoneWide from "@/assets/social-campaign/lifesci-regulatory-milestone-wide.jpg";
import lifesciTrialRecruitPushSquare from "@/assets/social-campaign/lifesci-trial-recruit-push-square.jpg";
import lifesciTrialRecruitPushTall from "@/assets/social-campaign/lifesci-trial-recruit-push-tall.jpg";
import lifesciTrialRecruitPushWide from "@/assets/social-campaign/lifesci-trial-recruit-push-wide.jpg";
import masterBrandAnthemSquare from "@/assets/social-campaign/master-brand-anthem-square.jpg";
import masterBrandAnthemTall from "@/assets/social-campaign/master-brand-anthem-tall.jpg";
import masterBrandAnthemWide from "@/assets/social-campaign/master-brand-anthem-wide.jpg";
import mediaAwardNomSquare from "@/assets/social-campaign/media-award-nom-square.jpg";
import mediaAwardNomTall from "@/assets/social-campaign/media-award-nom-tall.jpg";
import mediaAwardNomWide from "@/assets/social-campaign/media-award-nom-wide.jpg";
import mediaLocalizationSpotlightSquare from "@/assets/social-campaign/media-localization-spotlight-square.jpg";
import mediaLocalizationSpotlightTall from "@/assets/social-campaign/media-localization-spotlight-tall.jpg";
import mediaLocalizationSpotlightWide from "@/assets/social-campaign/media-localization-spotlight-wide.jpg";
import trialInteractiveMilestoneSquare from "@/assets/social-campaign/trial-interactive-milestone-square.jpg";
import trialInteractiveMilestoneTall from "@/assets/social-campaign/trial-interactive-milestone-tall.jpg";
import trialInteractiveMilestoneWide from "@/assets/social-campaign/trial-interactive-milestone-wide.jpg";
import trialInteractiveRecruitmentSquare from "@/assets/social-campaign/trial-interactive-recruitment-square.jpg";
import trialInteractiveRecruitmentTall from "@/assets/social-campaign/trial-interactive-recruitment-tall.jpg";
import trialInteractiveRecruitmentWide from "@/assets/social-campaign/trial-interactive-recruitment-wide.jpg";

import type { SocialFormat } from "./social-formats";
import { aspectClass } from "./social-formats";
import { getPhotoSet, photoForFormat, type PhotoSet } from "./social-photography";

export type CampaignArt = {
  /** One line on what the creative shows — surfaced in the demo art-direction bar. */
  note: string;
  wide: string;
  square: string;
  tall: string;
};

export const SOCIAL_CAMPAIGN_ART: Record<string, CampaignArt> = {
  "master-brand-anthem": {
    note: "House anthem — global night skyline and connected light paths",
    wide: masterBrandAnthemWide,
    square: masterBrandAnthemSquare,
    tall: masterBrandAnthemTall,
  },
  "media-localization-spotlight": {
    note: "Dubbing stage — booth, console and screen light",
    wide: mediaLocalizationSpotlightWide,
    square: mediaLocalizationSpotlightSquare,
    tall: mediaLocalizationSpotlightTall,
  },
  "legal-ediscovery-insight": {
    note: "Review floor — evidence sets under counsel review",
    wide: legalEdiscoveryInsightWide,
    square: legalEdiscoveryInsightSquare,
    tall: legalEdiscoveryInsightTall,
  },
  "gaming-scale-drop": {
    note: "Studio scale — player-facing worlds shipping in parallel",
    wide: gamingScaleDropWide,
    square: gamingScaleDropSquare,
    tall: gamingScaleDropTall,
  },
  "digital-globallink-tease": {
    note: "Platform tease — campaign operations in low blue light",
    wide: digitalGloballinkTeaseWide,
    square: digitalGloballinkTeaseSquare,
    tall: digitalGloballinkTeaseTall,
  },
  "lifesci-regulatory-milestone": {
    note: "Regulatory milestone — submission-ready lab and clinic",
    wide: lifesciRegulatoryMilestoneWide,
    square: lifesciRegulatoryMilestoneSquare,
    tall: lifesciRegulatoryMilestoneTall,
  },
  "trial-interactive-recruitment": {
    note: "Site activation — eTMF and study teams at work",
    wide: trialInteractiveRecruitmentWide,
    square: trialInteractiveRecruitmentSquare,
    tall: trialInteractiveRecruitmentTall,
  },
  "enterprise-investor-update": {
    note: "Investor update — leadership scale and reporting rhythm",
    wide: enterpriseInvestorUpdateWide,
    square: enterpriseInvestorUpdateSquare,
    tall: enterpriseInvestorUpdateTall,
  },
  "cobrand-partnership": {
    note: "Partnership — two teams sharing one delivery floor",
    wide: cobrandPartnershipWide,
    square: cobrandPartnershipSquare,
    tall: cobrandPartnershipTall,
  },
  "lifesci-trial-recruit-push": {
    note: "Recruitment push — participants and site staff in daylight",
    wide: lifesciTrialRecruitPushWide,
    square: lifesciTrialRecruitPushSquare,
    tall: lifesciTrialRecruitPushTall,
  },
  "legal-case-win-spotlight": {
    note: "Case win — the war room after the filing lands",
    wide: legalCaseWinSpotlightWide,
    square: legalCaseWinSpotlightSquare,
    tall: legalCaseWinSpotlightTall,
  },
  "games-launch-drop": {
    note: "Launch drop — key-art hero at the portal",
    wide: gamesLaunchDropWide,
    square: gamesLaunchDropSquare,
    tall: gamesLaunchDropTall,
  },
  "digital-globallink-webinar": {
    note: "Webinar — host, headset and screen glow in studio dark",
    wide: digitalGloballinkWebinarWide,
    square: digitalGloballinkWebinarSquare,
    tall: digitalGloballinkWebinarTall,
  },
  "media-award-nom": {
    note: "Award night — spotlit stage and crystal trophy",
    wide: mediaAwardNomWide,
    square: mediaAwardNomSquare,
    tall: mediaAwardNomTall,
  },
  "trial-interactive-milestone": {
    note: "Milestone — global site coverage as live data",
    wide: trialInteractiveMilestoneWide,
    square: trialInteractiveMilestoneSquare,
    tall: trialInteractiveMilestoneTall,
  },
};

export function getCampaignArt(playbookId: string): CampaignArt | undefined {
  return SOCIAL_CAMPAIGN_ART[playbookId];
}

/** Correct crop for a format, preferring the campaign's own creative and
 *  falling back to the division photo set. */
export function campaignImageForFormat(
  playbookId: string,
  brandId: string,
  format: SocialFormat,
): string | undefined {
  const art = getCampaignArt(playbookId);
  if (!art) return photoForFormat(brandId, format);
  switch (aspectClass(format)) {
    case "landscape-wide":
    case "landscape":
      return art.wide;
    case "square":
      return art.square;
    case "portrait":
    case "portrait-tall":
      return art.tall;
  }
}

/** Label for the imagery credit line: campaign creative when present,
 *  otherwise the division photo set. */
export function campaignArtCredit(
  playbookId: string,
  brandId: string,
): { label: string; credit: string } | undefined {
  const art = getCampaignArt(playbookId);
  if (art) return { label: "Campaign creative", credit: art.note };
  const set: PhotoSet | undefined = getPhotoSet(brandId);
  return set ? { label: set.label, credit: set.credit } : undefined;
}
