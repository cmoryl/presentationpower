// Hyper-real example photography for the homepage demo gallery and the
// /demo/deck + /demo/print landing pages. One distinct plate per demo so no two
// finished examples share the same art.

import demoPresentationImg from "@/assets/showcase/demo-presentation.jpg";
import demoDeckLifesciImg from "@/assets/showcase/demo-deck-lifesci.jpg";
import demoDeckLegalImg from "@/assets/showcase/demo-deck-legal.jpg";
import demoDeckGamingImg from "@/assets/showcase/demo-deck-gaming.jpg";
import demoDeckDigitalImg from "@/assets/showcase/demo-deck-digital.jpg";
import demoPrintImg from "@/assets/showcase/demo-print.jpg";
import demoPrintLifesciImg from "@/assets/showcase/demo-print-lifesci.jpg";
import demoPrintMediaImg from "@/assets/showcase/demo-print-media.jpg";
import demoPrintProposalImg from "@/assets/showcase/demo-print-proposal.jpg";
import demoSocialImg from "@/assets/showcase/demo-social.jpg";
import demoSocialMediaImg from "@/assets/showcase/demo-social-media.jpg";
import demoSocialLegalImg from "@/assets/showcase/demo-social-legal.jpg";
import demoSocialGamingImg from "@/assets/showcase/demo-social-gaming.jpg";
import demoEventImg from "@/assets/showcase/demo-event.jpg";
import demoEventConferenceImg from "@/assets/showcase/demo-event-conference.jpg";
import demoEventLegaltechImg from "@/assets/showcase/demo-event-legaltech.jpg";
import demoEventGamingImg from "@/assets/showcase/demo-event-gaming.jpg";

export type ShowcaseArt = { src: string; alt: string };

export const SHOWCASE_ART: Record<string, ShowcaseArt> = {
  // Presentation demos
  "globallink-enterprise-pitch": {
    src: demoPresentationImg,
    alt: "Executive team reviewing a finished Element deck on a boardroom display",
  },
  "lifesci-regulated-program": {
    src: demoDeckLifesciImg,
    alt: "Clinical program team reviewing a regulated submission deck in a bright glass meeting room",
  },
  "legal-ediscovery-review": {
    src: demoDeckLegalImg,
    alt: "Litigation team reviewing document boxes and laptops in a law-firm war room",
  },
  "gaming-sim-ship-launch": {
    src: demoDeckGamingImg,
    alt: "Game studio team reviewing gameplay on a large screen in a darkened review room",
  },
  "digital-growth-localization": {
    src: demoDeckDigitalImg,
    alt: "Digital marketing team reviewing a multilingual website on desktop and mobile",
  },
  // Print demos
  "pd-legal-genai": {
    src: demoPrintImg,
    alt: "Printed brochures and a case-study booklet fanned on a studio surface",
  },
  "pd-lifesci-veeva": {
    src: demoPrintLifesciImg,
    alt: "Printed life-sciences briefs and folded leaflets arranged on a white studio surface",
  },
  "pd-media-genai": {
    src: demoPrintMediaImg,
    alt: "Printed media case-study booklets on a dark slate surface with pink accent light",
  },
  "pd-legal-proposal": {
    src: demoPrintProposalImg,
    alt: "A printed proposal document open on a desk beside a bound cover and pen",
  },
  // Social kits
  "sc-anthem": {
    src: demoSocialImg,
    alt: "Social campaign assets displayed on phones and screens in a studio setting",
  },
  "sc-media": {
    src: demoSocialMediaImg,
    alt: "Sound engineer mixing a dubbed programme in a darkened post-production studio",
  },
  "sc-legal": {
    src: demoSocialLegalImg,
    alt: "Phone showing a dark legal-sector social post held in a law office",
  },
  "sc-gaming": {
    src: demoSocialGamingImg,
    alt: "Neon-lit gaming desk with vertical social content on phone and monitor",
  },
  // Event kits
  "sc-launch": {
    src: demoEventImg,
    alt: "Product launch event stage with branded signage and attendees",
  },
  "sc-conference": {
    src: demoEventConferenceImg,
    alt: "Flagship conference main stage with a large LED backdrop and a packed audience",
  },
  "sc-legaltech": {
    src: demoEventLegaltechImg,
    alt: "Legal technology roundtable with a seated panel and attendees at round tables",
  },
  "sc-gaming-party": {
    src: demoEventGamingImg,
    alt: "Game launch party venue at night with LED walls, confetti and a large crowd",
  },
};

export function showcaseArt(id: string): ShowcaseArt {
  return SHOWCASE_ART[id] ?? SHOWCASE_ART["globallink-enterprise-pitch"];
}
