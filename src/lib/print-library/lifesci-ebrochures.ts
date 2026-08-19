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
import heroTiPlatform from "@/assets/print-heroes/lifesci/lifesci-ebro-ti-platform.jpg.asset.json";
import heroTmfQuality from "@/assets/print-heroes/lifesci/lifesci-ebro-tmf-quality.jpg.asset.json";

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
  {
    slug: "trial-interactive-eclinical-platform",
    title: "Trial Interactive eClinical Platform for Global Product Development",
    teaser:
      "Streamline site activation and clinical management lifecycles, and accelerate timelines to an inspection-ready eTMF across ten connected modules.",
    tags: [
      "trial interactive",
      "eclinical",
      "etmf",
      "ctms",
      "site activation",
      "platform",
    ],
    collection: "Clinical technology",
    sourceFile: "Platform_eBrochure.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "eClinical Platform for Global Product Development",
      summary:
        "Streamline site activation and clinical management lifecycles. Accelerate timelines to the eTMF for inspection readiness — with a platform that is flexible and configurable to requirements, fast to implement, and 21 CFR Part 11, Annex 11, ERES, GxP, and GDPR compliant.",
      sections: [
        {
          heading: "Why Trial Interactive",
          body: "One configurable eClinical platform covers the document and process workstreams that slow trials down, from feasibility through inspection readiness.",
          bullets: [
            "Flexible and configurable to requirements",
            "Expedites site activation and document workstreams",
            "Comprehensive, easy-to-use workflows and a mobile eTMF",
            "Fast implementation and user onboarding / adoption",
            "21 CFR Part 11, Annex 11, ERES, GxP, and GDPR compliant",
          ],
        },
        {
          heading: "Document and TMF modules",
          body: "The document core of the platform keeps TMF and study documentation compliant, mobile, and collaborative.",
          bullets: [
            "eTMF — a practical, secure, compliant single access point for TMF documentation that reduces the time, cost, and risk of TMF management",
            "myTI — capture site documents and key eClinical workstreams anytime, anywhere with a mobile eTMF, saving CRAs weeks of document processing",
            "Collaborate — shared workspaces for sponsors, CROs, and sites, with enforced project workflows for TMF and eISF documentation",
            "Quality Management — an EDMS for SOPs, CAPAs, deviations, and clinical/R&D document workflows",
          ],
        },
        {
          heading: "Start-up and site modules",
          body: "Site selection, activation, and site-facing work run in the same platform as the TMF, so nothing has to be re-keyed.",
          bullets: [
            "eFeasibility — configurable surveys to contact, assess, and prequalify sites, with data saved for future use",
            "Study Start-Up — simplify collection, completion, and finalization of the regulatory documentation needed to bring a site online",
            "Site Portal & eISF — an investigator site solution that digitizes site binder processes and improves speed and compliance",
            "CTMS — mobile-first trial management for planning, tracking, and monitoring, with a single source of truth for clinical operations",
          ],
        },
        {
          heading: "Training and safety modules",
          body: "Compliance-focused learning and safety letter distribution complete the lifecycle.",
          bullets: [
            "GlobalLearn — train site personnel and study teams, orchestrate virtual investigator meetings, and ensure SOP compliance",
            "Safety — simplify safety letter communication between sponsor, CRO, countries, and sites, with a database of regulatory reporting deadlines",
          ],
        },
      ],
      stats: [
        {
          label: "Connected modules",
          value: "10",
          caption: "eTMF, myTI, CTMS, Start-Up, GlobalLearn, and more",
        },
        {
          label: "Industry recognition",
          value: "2023",
          caption: "Best sponsor-facing technology — Citeline Awards",
        },
        {
          label: "Compliance",
          value: "Part 11",
          caption: "Annex 11, ERES, GxP, and GDPR compliant",
        },
        {
          label: "CRA time saved",
          value: "Weeks",
          caption: "Mobile document processing with myTI",
        },
      ],
      discover: {
        body: "Global support for global trials:",
        bullets: [
          "New York | Philadelphia | London | Barcelona | Tokyo",
          "www.trialinteractive.com | info@trialinteractive.com",
          "Best sponsor-facing technology — 2023 Citeline Awards",
        ],
      },
      cta: {
        label: "Talk to Trial Interactive",
        subhead:
          "eClinical platform for global product development — info@trialinteractive.com",
        url: "https://www.trialinteractive.com",
      },
      heroMedia: hero(heroTiPlatform.url, 34, 50),
    },
  },
  {
    slug: "tmf-quality-services",
    title: "TMF Quality Services",
    teaser:
      "System-agnostic TMF professionals who establish best practices, eliminate compliance risks, and keep studies inspection-ready.",
    tags: [
      "tmf",
      "quality",
      "inspection readiness",
      "trial interactive",
      "consulting",
      "compliance",
    ],
    collection: "Clinical technology",
    sourceFile: "TMF_Quality_Services_eBrochure.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "TMF Quality Services",
      summary:
        "TransPerfect offers sponsors and CROs access to TMF professionals who help establish best practices, eliminate compliance risks, and ensure inspection readiness for your study and the greater organization. System-agnostic TMF expertise and resource solutions help you achieve inspection readiness.",
      sections: [
        {
          heading: "How we engage",
          body: "Four service tracks let you plug TMF expertise in exactly where it is needed — for one study or across the organization.",
          bullets: [
            "On-demand inspection readiness consulting",
            "Expert-led best practices workshops",
            "Ongoing quality and completeness reviews",
            "SOP and process consulting",
          ],
        },
        {
          heading: "Feature highlights",
          body: "System-agnostic support that works in whatever TMF platform you already run.",
          bullets: [
            "Inspection readiness and audit support",
            "Quality review and completeness analysis in any system",
            "Paper scanning and document transfer / migrations",
            "Technology configuration and validation",
            "TMF study owner resource / lead",
            "TMF archiving solutions",
            "Review of SOPs and other documentation",
            "TMF document processing in any system",
          ],
        },
        {
          heading: "Scale TMF-focused resources quickly",
          body: "Global solutions supporting global R&D: add TMF experts as study volume grows, without rebuilding your internal team or changing systems.",
          bullets: [
            "Compliant — inspection compliance maintained across studies",
            "Ensure — TMF completeness and inspection readiness",
            "Submit — quality-assured materials guided by TMF experts",
          ],
        },
      ],
      stats: [
        {
          label: "Inspection compliance",
          value: "90%",
          caption: "Compliant TMFs at inspection",
        },
        {
          label: "TMF completeness",
          value: "95%",
          caption: "Completeness and inspection readiness",
        },
        {
          label: "System coverage",
          value: "Agnostic",
          caption: "Quality review and processing in any TMF system",
        },
        {
          label: "Coverage",
          value: "Global",
          caption: "Global solutions supporting global R&D",
        },
      ],
      discover: {
        body: "Where TMF Quality Services fit:",
        bullets: [
          "Before an inspection — readiness assessment and audit support",
          "During a study — ongoing quality and completeness reviews",
          "At close-out — archiving, migrations, and paper scanning",
          "Across the organization — SOP, process, and validation consulting",
        ],
      },
      cta: {
        label: "Talk to Trial Interactive",
        subhead:
          "TMF Quality Services — info@trialinteractive.com",
        url: "https://www.trialinteractive.com",
      },
      heroMedia: hero(heroTmfQuality.url, 38, 50),
    },
  },
];

