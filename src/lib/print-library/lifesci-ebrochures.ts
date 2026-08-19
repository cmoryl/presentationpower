// TransPerfect Life Sciences — recreated e-brochure library.
//
// Source: the TPLS e-brochure set supplied by the division (Illustrator
// packages with the print-ready PDF). Copy was ingested from the originals and
// re-shaped into the live `EBrochureContent` model; hero art is re-hosted on
// the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for
// the signed-in user via createPrintAsset().

import type { EBrochureContent } from "@/lib/print-assets.types";

import heroVeevaRim from "@/assets/print-heroes/lifesci/lifesci-ebro-veeva-rim.jpg.asset.json";

export const LIFESCI_EBRO_DIVISION_ID = "bm-tp-lifesci";

export type LifeSciEbrochureSeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  tags: string[];
  /** Service-line grouping used by the shelf filter. */
  collection: string;
  sourceFile: string;
  content: EBrochureContent;
};

const CTA = {
  label: "Talk to TransPerfect Life Sciences",
  subhead:
    "Lab to Launch. Practitioner to Patient. — lifesciences@transperfect.com",
  url: "https://lifesciences.transperfect.com",
};

const hero = (
  url: string,
  heightPct = 42,
  focalY = 50,
): EBrochureContent["heroMedia"] => ({
  imageUrl: url,
  aspect: "fill",
  heightPct,
  focalY,
});

export const LIFESCI_EBROCHURES: LifeSciEbrochureSeed[] = [
  {
    slug: "globallink-veeva-vault-rim-integration",
    title: "GlobalLink & Veeva Vault RIM Integration",
    teaser:
      "Automate regulatory content translation with a validated integration that keeps every step inspection-ready — without leaving Vault.",
    tags: [
      "veeva vault",
      "rim",
      "regulatory",
      "globallink",
      "automation",
      "integration",
    ],
    collection: "Regulatory & technology",
    sourceFile: "eBro | TPLS | Veeva Vault Integration.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "GlobalLink & Veeva Vault RIM Integration",
      summary:
        "Automate regulatory content translation with a validated integration that keeps every step inspection-ready, all without leaving Vault.",
      sections: [
        {
          heading: "The challenge",
          body: "Organizations managing regulatory content through Veeva Vault RIM face inefficient manual translation workflows — exporting files, emailing LSPs, uploading translations, and maintaining metadata across eight or more manual steps. This consumes time, introduces compliance risk, and strains internal resources.",
          bullets: [
            "Eight or more manual handoff steps per submission",
            "Metadata, relationships, and version control maintained by hand",
            "Compliance risk from email-based file transfers",
          ],
        },
        {
          heading: "The solution",
          body: "TransPerfect's GlobalLink integration with Veeva RIM replaces the manual workflow with a streamlined three-step automated process: submit via Vault, review the translation, finalize. Human-in-the-loop review is combined with industry-leading AI to produce submission-ready files faster, and every step stays inside the Vault ecosystem for full traceability, compliance, and security.",
          bullets: [
            "1. Submit request via Vault",
            "2. Review translation",
            "3. Translation final",
          ],
        },
        {
          heading: "Confidence at every stage of the submission process",
          body: "Content export, file prep and TM analysis, content import, metadata input, relationship setting, and version control all shift from client-owned manual work to automated steps — leaving only translation review with your team.",
          bullets: [
            "Preserves submission-ready structures: relationships, attributes, and context",
            "Shortens cycle times with real-time status visibility and less admin",
            "Eliminates manual file transfers and back-and-forth email chains",
            "Veeva-certified, validated integration with zero critical findings to date",
          ],
        },
      ],
      stats: [
        {
          label: "Project management time",
          value: "Reduced",
          caption: "Admin and rework from metadata loss removed",
        },
        {
          label: "Timelines",
          value: "Accelerated",
          caption: "Three automated steps replace eight-plus manual ones",
        },
        { label: "Costs", value: "Reduced", caption: "AI plus TM leverage" },
        {
          label: "Inspection readiness",
          value: "Continuous",
          caption: "Zero critical findings to date",
        },
      ],
      discover: {
        body: "What automation replaces in the Vault workflow:",
        bullets: [
          "Content export — client → automated",
          "File prep & TM analysis — TransPerfect → automated",
          "Content import and metadata input — client → automated",
          "Set relationships and version control — client → automated",
          "Translation review stays with your team",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroVeevaRim.url, 42, 50),
    },
  },
];
