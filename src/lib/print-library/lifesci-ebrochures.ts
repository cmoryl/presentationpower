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
import heroApplanga from "@/assets/print-heroes/lifesci/lifesci-ebro-applanga-ecoa.jpg.asset.json";
import heroLitMonitoring from "@/assets/print-heroes/lifesci/lifesci-ebro-literature-monitoring.jpg.asset.json";
import heroPvSafety from "@/assets/print-heroes/lifesci/lifesci-ebro-pv-safety.jpg.asset.json";
import heroCommercialAi from "@/assets/print-heroes/lifesci/lifesci-ebro-commercial-ai.jpg.asset.json";

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
  {
    slug: "applanga-digital-health-ecoa",
    title: "Applanga for Digital Health & eCOA",
    teaser:
      "A cloud-based localization platform that automates app localization for digital health and eCOA, and stores completed content for re-use across studies.",
    tags: [
      "applanga",
      "digital health",
      "ecoa",
      "app localization",
      "content reuse",
      "platform",
    ],
    collection: "Clinical technology",
    sourceFile: "Life_Sciences_Applanga_for_Digital_Health_and_eCOA_2024.pdf",
    content: {
      eyebrow: "Solutions for",
      title: "Applanga for Digital Health & eCOA",
      summary:
        "A flexible and easy-to-use cloud-based localization platform that automates the app localization process and stores completed content for later re-use — breaking the silos between sponsor, digital vendor, and translation vendor.",
      sections: [
        {
          heading: "Breaking silos between vendors",
          body: "Full integration with Applanga for digital health and COAs connects sponsor, digital vendor, and translation vendor in one workflow.",
          bullets: [
            "60% reduction in costs by leveraging content reuse",
            "Streamlined platform to manage localization workflows",
            "40% faster timelines for translation and in-app context review",
          ],
        },
        {
          heading: "Library functionality to reuse content across apps and studies",
          body: "Content is stored once and reused everywhere, with the audit trail regulators expect.",
          bullets: [
            "Comply with industry best practices for in-context screenshot review",
            "Built-in audit trail of every change",
            "Ensure consistency across studies and applications",
            "Single source of truth for app translation workflows",
            "Platform agnostic, app agnostic — supports every file type, customized per use case",
            "Store certificates of translation and ensure regulatory compliance",
          ],
        },
      ],
      stats: [
        {
          label: "Cost reduction",
          value: "60%",
          caption: "Leveraging content reuse across apps and studies",
        },
        {
          label: "Faster timelines",
          value: "40%",
          caption: "Translation and in-app context review",
        },
        {
          label: "Coverage",
          value: "Any app",
          caption: "Platform agnostic and app agnostic, every file type",
        },
        {
          label: "Compliance",
          value: "Audit trail",
          caption: "Every change tracked; certificates stored",
        },
      ],
      discover: {
        body: "Built for digital health and eCOA teams:",
        bullets: [
          "In-context screenshot review for COA instruments",
          "Reusable translation library across a study portfolio",
          "Single workflow across sponsor and vendor ecosystems",
        ],
      },
      cta: {
        label: "Talk to TransPerfect Life Sciences",
        subhead:
          "A measure of confidence for your global studies — DigitalHealthSolutions@transperfect.com",
        url: "https://lifesciences.transperfect.com",
      },
      heroMedia: hero(heroApplanga.url, 40, 50),
    },
  },
  {
    slug: "local-literature-monitoring",
    title: "Local Literature Monitoring",
    teaser:
      "Centralized, automated literature monitoring with multilingual support across every stage of case processing — increasing safety reporting activities up to 85%.",
    tags: [
      "literature monitoring",
      "pharmacovigilance",
      "safety",
      "automation",
      "case processing",
    ],
    collection: "Pharmacovigilance & safety",
    sourceFile: "Life_Sciences_Literature_Monitoring_Solutions.pdf",
    content: {
      eyebrow: "Solutions for",
      title: "Local Literature Monitoring",
      summary:
        "With multilingual support throughout all stages of case processing, unburden your teams with centralized, automated literature monitoring solutions designed to increase safety reporting activities up to 85%.",
      sections: [
        {
          heading: "Literature monitoring workflow",
          body: "One end-to-end workflow moves local literature from search to reportable outcome.",
          bullets: [
            "Search — automated local database and journal coverage",
            "Review — triage relevant records for PV assessment",
            "Manage documents — centralized, controlled repository",
            "Consolidate — de-duplicate and normalize findings",
            "Route for translation — multilingual content handled inline",
            "Deliver and report — analytics for expedited decision making",
          ],
        },
        {
          heading: "Why local PV teams choose it",
          body: "Leverage end-to-end automation to reduce manual effort for local PV teams and empower them with robust oversight and analytics.",
          bullets: [
            "Speed up timelines by ~40% to identify and action AEs and SUSARs",
            "Reduce volume of content for review by over 40%",
            "Lower costs by up to 35% by cutting manual search hours",
            "Support 170+ languages and all document types",
            "Be audit ready with 21 CFR Part 11 compliant technology",
            "Customize and integrate the back end with existing systems",
          ],
        },
      ],
      stats: [
        {
          label: "Safety reporting lift",
          value: "85%",
          caption: "Increase in safety reporting activities",
        },
        {
          label: "Faster action",
          value: "~40%",
          caption: "To identify and action AEs and SUSARs",
        },
        {
          label: "Cost reduction",
          value: "35%",
          caption: "By cutting manual search hours",
        },
        {
          label: "Languages",
          value: "170+",
          caption: "All document types supported",
        },
      ],
      discover: {
        body: "Where it fits in your PV operation:",
        bullets: [
          "Local literature obligations across every market",
          "Multilingual abstract and full-text triage",
          "Oversight dashboards for inspection readiness",
        ],
      },
      cta: {
        label: "Talk to TransPerfect Life Sciences",
        subhead:
          "A measure of confidence for your global studies — lifesciences@transperfect.com",
        url: "https://lifesciences.transperfect.com",
      },
      heroMedia: hero(heroLitMonitoring.url, 40, 45),
    },
  },
  {
    slug: "global-pharmacovigilance-safety",
    title: "Global Pharmacovigilance & Safety",
    teaser:
      "AI and technology solutions that improve patient safety, maintain compliance, and cut cost across case intake, translation, redaction, and reporting.",
    tags: [
      "pharmacovigilance",
      "patient safety",
      "adverse events",
      "redaction",
      "call center",
      "ai translation",
    ],
    collection: "Pharmacovigilance & safety",
    sourceFile: "Life_Sciences_PV_Safety.pdf",
    content: {
      eyebrow: "Solutions for",
      title: "Global Pharmacovigilance & Safety",
      summary:
        "Equip your organization with AI and technology solutions that improve patient safety, reduce risk, maintain compliance, expedite processes, and reduce operational cost. Achieve world-class patient safety with timely adverse event reporting.",
      sections: [
        {
          heading: "The safety data lifecycle",
          body: "Collect, track, and share safety data from site securely — then translate, redact, and report it.",
          bullets: [
            "Collect, track, and share safety data from site securely",
            "Translate for regulatory submission",
            "Call center support and case intake",
            "Redact safety content",
          ],
        },
        {
          heading: "Solution set",
          body: "Six connected services cover the operational load on drug safety teams.",
          bullets: [
            "Global call center support — licensed healthcare professionals for case intake and processing",
            "Safety database and reporting — 21 CFR Part 11 compliant solution to traffic and distribute safety alerts in real time",
            "AI for translation — safety-specific AI engines and human post-editors reduce translation timelines by half",
            "Redaction services — AI technology and professional specialists reduce time to redact by over 75%",
            "Translation management — 100% confidential, configurable AI-powered solution for safety work streams",
            "Media monitoring for safety — monitor digital media outlets in any language with meaningful reporting",
          ],
        },
      ],
      stats: [
        {
          label: "Translation timelines",
          value: "50%",
          caption: "Reduced with safety-specific AI plus post-editing",
        },
        {
          label: "Time to redact",
          value: "75%+",
          caption: "Faster with AI and professional specialists",
        },
        {
          label: "Compliance",
          value: "Part 11",
          caption: "21 CFR Part 11 compliant safety reporting",
        },
        {
          label: "Coverage",
          value: "Any language",
          caption: "Case intake, translation, and media monitoring",
        },
      ],
      discover: {
        body: "Outcomes this drives:",
        bullets: [
          "Compliance with drug safety reporting timelines",
          "Reduced cycle times and translation costs",
          "Faster redactions across submission-ready content",
        ],
      },
      cta: {
        label: "Talk to TransPerfect Life Sciences",
        subhead:
          "Lab to Launch. Patient to Practitioner. — PVSafetySolutions@transperfect.com",
        url: "https://lifesciences.transperfect.com",
      },
      heroMedia: hero(heroPvSafety.url, 40, 50),
    },
  },
  {
    slug: "commercial-corporate-ai-transformation-program",
    title: "Commercial & Corporate AI Transformation Program",
    teaser:
      "A proven strategy tested with top 10 pharmaceutical companies to transform commercial and corporate content work with machine learning and AI.",
    tags: [
      "ai",
      "generative ai",
      "machine translation",
      "commercial",
      "corporate",
      "workflow",
    ],
    collection: "AI & automation",
    sourceFile: "LifeSci_AI_Programme_One_Pager_for_Commercial_Corporate.pdf",
    content: {
      eyebrow: "Solutions for",
      title: "Commercial & Corporate AI Transformation Program",
      summary:
        "A proven success strategy tested with top 10 pharmaceutical companies to transform your commercial and corporate content work using machine learning and AI.",
      sections: [
        {
          heading: "Program pillars",
          body: "Three pillars carry the transformation from content creation to reporting.",
          bullets: [
            "Generative AI — content creation, optimization, and post-editing efficiency",
            "Neural machine translation — the gold standard in AI translation for commercial and corporate content",
            "Workflow management — integration into major systems with multivendor capability and extensive reporting",
          ],
        },
        {
          heading: "Program overview",
          body: "Start your AI-enabled global content transformation. This program was developed for the specific purpose of helping commercial and corporate teams automate critical content workstreams.",
          bullets: [
            "21 CFR Part 11 solution that connects to the systems where your content lives",
            "AI trained on pharma, biotech, and medical device datasets for a higher baseline of accuracy and quality",
            "Scalable speed with reduced administration",
            "TransPerfect AI experts guide every step, with Tableau-powered reporting and analytics",
          ],
        },
        {
          heading: "Program benefits",
          body: "Benefits land immediately and compound over the life of the program.",
          bullets: [
            "Immediate 15–30% reduction in costs vs. traditional processes",
            "Immediate 15% reduction in time-to-market vs. traditional processes",
            "Continuous, compounding savings and efficiency gains",
            "Pre-validated 21 CFR Part 11 compliant",
            "Early access to innovative new technologies and tools",
            "Extensive reporting for performance optimization",
          ],
        },
      ],
      stats: [
        {
          label: "Cost reduction",
          value: "15–30%",
          caption: "Immediate vs. traditional processes",
        },
        {
          label: "Time-to-market",
          value: "15%",
          caption: "Immediate reduction vs. traditional processes",
        },
        {
          label: "Validation",
          value: "Part 11",
          caption: "Pre-validated 21 CFR Part 11 compliant",
        },
        {
          label: "Proven with",
          value: "Top 10",
          caption: "Tested with top 10 pharmaceutical companies",
        },
      ],
      discover: {
        body: "What the program includes:",
        bullets: [
          "AI expert guidance at every step",
          "Tableau-powered quality, effectiveness, and timeline analytics",
          "Integration with the systems where commercial content lives",
        ],
      },
      cta: {
        label: "Talk to TransPerfect Life Sciences",
        subhead:
          "Commercial & corporate AI transformation — lifesciences@transperfect.com",
        url: "https://lifesciences.transperfect.com",
      },
      heroMedia: hero(heroCommercialAi.url, 38, 50),
    },
  },
];

