// TransPerfect Life Sciences — recreated spotlight library.
//
// Source: the Trial Interactive client spotlight set supplied by the division
// (print-ready PDFs). Copy was transcribed from the originals and re-shaped into
// the live `SpotlightContent` model; hero art is re-hosted on the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for the
// signed-in user via createPrintAsset().

import type { SpotlightContent } from "@/lib/print-assets.types";

import heroGeicam from "@/assets/print-heroes/lifesci/lifesci-spot-geicam.jpg.asset.json";

export const LIFESCI_SPOTLIGHT_DIVISION_ID = "bm-tp-lifesci";

export type LifeSciSpotlightSeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  collection: string;
  tags: string[];
  sourceFile: string;
  content: SpotlightContent;
};

export const LIFESCI_SPOTLIGHTS: LifeSciSpotlightSeed[] = [
  {
    slug: "geicam-trial-interactive-etmf",
    title: "GEICAM simplifies and streamlines TMF management",
    teaser:
      "Spain's leading academic breast cancer research group standardized TMF management on Trial Interactive's eTMF — study setups in under four weeks and 50% less project management time.",
    collection: "Clinical technology",
    tags: [
      "trial interactive",
      "etmf",
      "tmf",
      "clinical trials",
      "oncology",
      "spotlight",
    ],
    sourceFile: "GEICAM_Spotlight.pdf",
    content: {
      eyebrow: "Client Spotlight",
      productName: "Trial Interactive eTMF",
      tagline:
        "GEICAM simplifies and streamlines TMF management with Trial Interactive's eTMF and TMF-related services and support",
      summary:
        "Active for more than 27 years, GEICAM is the leading academic group in clinical, epidemiological, and translational breast cancer research in Spain, and is highly recognized internationally. Running large global trials made document collaboration and compliance central to its day-to-day operations.",
      capabilities: [
        {
          heading: "The challenge",
          body: "Given the large clinical trials GEICAM conducts globally, document collaboration and compliance were key aspects of daily operations. GEICAM needed a transparent TMF pulse — completeness and timeline metrics — plus the ability to control TMF quality anytime, anywhere.",
        },
        {
          heading: "Trial Interactive solution",
          body: "TransPerfect's Trial Interactive eTMF was implemented to easily and quickly support upcoming studies. TMF study setups are now ready in less than four weeks.",
        },
        {
          heading: "Standardized TMF management",
          body: "By following an owned TMF Reference Model across all studies, GEICAM achieved TMF management standardization, which reduced project management time by 50%.",
        },
        {
          heading: "Continuous quality control",
          body: "Through the quality review module in Trial Interactive, GEICAM controls its owned TMF health periodically and in a compliant way.",
        },
      ],
      stats: [
        {
          label: "Study setup time",
          value: "<4",
          unit: "weeks",
          caption: "From kickoff to a ready TMF study structure",
        },
        {
          label: "Project management time",
          value: "50",
          unit: "%",
          caption: "Reduced through TMF standardization",
        },
        {
          label: "Research leadership",
          value: "27+",
          unit: "years",
          caption: "Leading academic breast cancer group in Spain",
        },
        {
          label: "TMF health",
          value: "Periodic",
          caption: "Quality review module keeps the TMF inspection-ready",
        },
      ],
      quote: {
        text: "As collaboration is an important element of GEICAM's organization, we needed a partner who could be flexible and adapt to our specific needs. We chose Trial Interactive because TMF experience and support are key to helping us scale and guide, and TransPerfect offers the best of both.",
        author: "Gema Sanz",
        role: "Head of Clinical Operations, GEICAM",
      },
      expert: {
        name: "Trial Interactive",
        role: "eTMF and TMF services, TransPerfect Life Sciences",
        email: "info@trialinteractive.com",
      },
      cta: {
        label: "Talk to Trial Interactive",
        url: "https://www.trialinteractive.com",
      },
      heroMedia: {
        imageUrl: heroGeicam.url,
        aspect: "fill",
        heightPct: 40,
        focalX: 40,
        focalY: 45,
      },
    },
  },
];
