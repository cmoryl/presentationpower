// Hyper-real example photography for the homepage demo gallery and the
// /demo/deck landing pages. One distinct plate per demo so no two finished
// examples share the same art.

import demoPresentationImg from "@/assets/showcase/demo-presentation.jpg";
import demoDeckLifesciImg from "@/assets/showcase/demo-deck-lifesci.jpg";
import demoPrintImg from "@/assets/showcase/demo-print.jpg";
import demoPrintLifesciImg from "@/assets/showcase/demo-print-lifesci.jpg";
import demoSocialImg from "@/assets/showcase/demo-social.jpg";
import demoSocialMediaImg from "@/assets/showcase/demo-social-media.jpg";
import demoEventImg from "@/assets/showcase/demo-event.jpg";
import demoEventConferenceImg from "@/assets/showcase/demo-event-conference.jpg";

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
  // Print demos
  "pd-legal-genai": {
    src: demoPrintImg,
    alt: "Printed brochures and a case-study booklet fanned on a studio surface",
  },
  "pd-lifesci-veeva": {
    src: demoPrintLifesciImg,
    alt: "Printed life-sciences briefs and folded leaflets arranged on a white studio surface",
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
  // Event kits
  "sc-launch": {
    src: demoEventImg,
    alt: "Product launch event stage with branded signage and attendees",
  },
  "sc-conference": {
    src: demoEventConferenceImg,
    alt: "Flagship conference main stage with a large LED backdrop and a packed audience",
  },
};

export function showcaseArt(id: string): ShowcaseArt {
  return SHOWCASE_ART[id] ?? SHOWCASE_ART["globallink-enterprise-pitch"];
}
