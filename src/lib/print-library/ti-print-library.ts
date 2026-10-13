// Trial Interactive print set — supplied by the TI team (InDesign packages with
// the print-ready PDF). Each piece opens in "Original layout" (page-for-page
// from the designer's PDF, see scripts/lifesci-original-extract.py); the copy
// below is the same wording, re-shaped into the library-layout model so the
// social / print-size / slide cascade can read it. Nothing is invented: every
// figure and quote comes from the supplied file.

import type { LifeSciCaseStudySeed } from "@/lib/print-library/lifesci-case-studies";
import type { LifeSciEbrochureSeed } from "@/lib/print-library/lifesci-ebrochures";
import { originalLayoutFor } from "@/lib/print-library/original-layout";

export const TI_PRINT_DIVISION_ID = "bm-trial-interactive";

const CTA = {
  label: "Talk to Trial Interactive",
  subhead: "www.trialinteractive.com — info@trialinteractive.com",
  url: "https://www.trialinteractive.com",
};
const FOOTER = { links: ["www.trialinteractive.com", "info@trialinteractive.com"] };

/** Page-one artwork of the supplied file, used as the library-layout hero. */
const hero = (slug: string) => {
  const p = originalLayoutFor(slug)?.pages[0];
  const url = p?.legacyGround ?? p?.ground;
  return url ? { imageUrl: url, aspect: "fill" as const, heightPct: 42, focalY: 30 } : undefined;
};

export const TI_CASE_STUDIES: LifeSciCaseStudySeed[] = [
  {
    slug: "ti-ethris-case-study",
    title: "Ethris Strengthening Clinical Operations with Trial Interactive",
    teaser:
      "A lean biotech moves training, quality and sponsor-owned eTMF/eISF records onto one integrated Trial Interactive environment.",
    collection: "Case studies",
    tags: ["trial interactive", "etmf", "eisf", "lms", "qdms", "tmf services", "biotech"],
    sourceFile: "Trial_Interactive_Ethris-Case-Study_F.pdf",
    content: {
      eyebrow: "Case study",
      client: "Ethris",
      industry: "Biotech",
      summary: "Ethris Strengthening Clinical Operations with Trial Interactive",
      challenge: {
        heading: "The Challenge",
        body:
          "As Ethris prepared for their first clinical trials, they recognized the need for a more streamlined and future-ready approach to managing clinical recordation. Their internal processes for training and quality were entirely paper-based, with SOP training requiring in-person signatures and manual filing. On the clinical side, Ethris had no internal eTMF or eISF system yet, and they wanted to ensure full visibility, long-term access and proper oversight of their sponsor recordation.",
      },
      solution: {
        heading: "The Solution",
        body:
          "Ethris selected Trial Interactive’s eTMF, eISF, LMS, QDMS, and TMF Services as a single, integrated environment to support both current needs and future expansion — a dedicated, sponsor-owned eTMF for consistent archiving, secure access and inspection readiness, and a true eISF environment with the ability to move records between eTMF and eISF.",
      },
      result: {
        heading: "The Impact",
        body:
          "Simplified training and record workflows: employees can complete training electronically, from anywhere, without in-person signatures or manual follow-up. Better preparedness for future growth: a strong, compliant foundation as the clinical program expands. Clear potential for greater efficiency at scale as Ethris moves into multi-site and multi-country trials.",
      },
      stats: [],
      quote: {
        text:
          "Having ownership and control over all active and archived eTMFs within a program is hugely efficient and beneficial for oversight and regulatory purposes.",
        author: "Nigel Tomkinson",
        role: "Executive Director Clinical Operations",
        company: "Ethris",
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: hero("ti-ethris-case-study"),
    },
  },
  {
    slug: "ti-protas-case-study",
    title: "How Protas Revolutionizes Clinical Trials for Common Diseases with 100% Site Adoption of Digital Documentation",
    teaser:
      "A not-for-profit trials organisation replaces paper site files with Trial Interactive’s eISF — 100% site adoption and remote ISF review.",
    collection: "Case studies",
    tags: ["trial interactive", "eisf", "site adoption", "not-for-profit", "remote review"],
    sourceFile: "Trial_Interactive_Protas_Case-Study_F.pdf",
    content: {
      eyebrow: "Case study",
      client: "Protas",
      industry: "Not-for-profit clinical research",
      summary:
        "How Protas Revolutionizes Clinical Trials for Common Diseases with 100% Site Adoption of Digital Documentation",
      challenge: {
        heading: "The Challenge",
        body:
          "As a new not-for-profit organization setting up foundational systems, Protas needed a document management solution that would align with their mission to make trials more efficient and accessible. Having worked with paper-based systems, the team knew the obstacles firsthand: storage and archiving issues, missing or misfiled documents, environmental costs and, critically, the lack of direct access to site documents between monitoring visits.",
      },
      solution: {
        heading: "The Solution",
        body:
          "Trial Interactive provided Protas with an electronic ISF system, delivering a user-friendly platform that transformed how sites and central teams manage GCP essential documentation. The system enabled remote document review, real-time upload capabilities across multiple sites, and immediate identification of issues like duplicate documents.",
      },
      result: {
        heading: "The Impact",
        body:
          "Achieved 100% site adoption with overwhelmingly positive feedback on user-friendliness. Eliminated travel costs for document review — CRAs can now review ISFs remotely. Accelerated site setup timelines, enabled immediate detection and correction of documentation issues, reduced environmental impact and improved documentation quality.",
      },
      stats: [{ value: "100%", label: "Site adoption" }],
      quote: {
        text:
          "Using an eISF for the first time with Trial Interactive has been a really positive experience. It saves a lot of time, it increases the quality of what’s happening, and because it’s such a user-friendly interface, it’s really well received by sites and by central staff.",
        author: "Jen Dumbleton",
        role: "Head of Trial Management and Product Owner",
        company: "Protas",
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: hero("ti-protas-case-study"),
    },
  },
];

export const TI_EBROCHURES: LifeSciEbrochureSeed[] = [
  {
    slug: "ti-etmf-ebrochure",
    title: "Trial Interactive eTMF: The Practical, Compliant, Always-Current TMF for Modern Clinical Operations",
    teaser:
      "The cloud-based Trial Master File built for accuracy, speed and audit confidence — auto-indexing, milestone placeholders, TMF health dashboards.",
    tags: ["trial interactive", "etmf", "tmf", "inspection readiness", "ebrochure"],
    collection: "E-brochures",
    sourceFile: "eTMF eBrochure | Trial Interactive_Print_F.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Trial Interactive eTMF: The Practical, Compliant, Always-Current TMF for Modern Clinical Operations",
      summary:
        "Trial Interactive eTMF is the cloud-based Trial Master File built for global clinical teams seeking accuracy, speed, and audit confidence at every stage of a study.",
      sections: [
        {
          heading: "Built For Accuracy & Study Momentum",
          body:
            "eTMF streamlines daily operations by automating critical steps that traditionally slow clinical teams down.",
          bullets: [
            "Machine learning auto-indexing & metadata extraction",
            "Milestone & event manager",
            "Duplicate detection & comparison",
            "TMF health & KPI dashboards",
          ],
        },
        {
          heading: "Stay Inspection-Ready",
          body:
            "An integrated audit trail, standardized monitoring documentation, deviation/issue workflows and connected eTMF support continuous readiness. No last-minute data collection. No manual hunting.",
          bullets: [],
        },
        {
          heading: "Made For Global Collaboration & Faster Submission Workflows",
          body:
            "eTMF connects contributors, sponsors, CROs, sites, and CRAs through flexible intake channels that preserve provenance and streamline QC.",
          bullets: [],
        },
      ],
      stats: [],
      cta: CTA,
      heroMedia: hero("ti-etmf-ebrochure"),
    },
  },
  {
    slug: "ti-ctms-health-check-checklist",
    title: "CTMS Health Check: 10-Point Diagnostic Worksheet",
    teaser:
      "A vendor-agnostic worksheet that helps sponsors and CROs spot the real causes of CTMS slowdowns before they become inspection findings.",
    tags: ["trial interactive", "ctms", "checklist", "worksheet", "governance"],
    collection: "Checklists",
    sourceFile: "Trial_Interactive_Checklist-CTMS-Health-Check_F.pdf",
    content: {
      eyebrow: "Checklist",
      title: "CTMS Health Check: 10-Point Diagnostic Worksheet",
      summary:
        "This 10-point CTMS Health Check helps sponsors and CROs spot the real causes of slowdowns, such as process issues and owner gaps, before they become inspection findings.",
      sections: [
        {
          heading: "What it covers",
          body:
            "The framework is vendor-agnostic and focuses on elements you can verify today, including:",
          bullets: [
            "Named governance and RACI assignments",
            "Fit-for-purpose study and site status transitions",
            "Feasibility intake that doesn’t require re-keying",
            "SSU readiness with controlled document versions",
            "Contemporaneous CTMS-to-eTMF filing with required metadata",
          ],
        },
        {
          heading: "How to use it",
          body:
            "Use this worksheet to confirm that what’s recorded in CTMS reflects how work actually moves, and to establish clear accountability where it doesn’t. For each item, mark Meets (1) or Needs Work (0) and note the accountable owner.",
          bullets: [],
        },
        {
          heading: "Your score",
          body: "Sum your score (0-10). 0-3 Lagging; 4-7 Progressing; 8-10 Optimized.",
          bullets: [],
        },
      ],
      stats: [],
      cta: CTA,
      heroMedia: hero("ti-ctms-health-check-checklist"),
    },
  },
  {
    slug: "ti-ssu-compression-guide",
    title: "SSU Compression Guide: From Feasibility to Site Activation in 10 Steps",
    teaser:
      "A vendor-agnostic guide that keeps study start-up moving — defensible site choices, versioned documents and traceable handoffs.",
    tags: ["trial interactive", "ssu", "study start-up", "site activation", "guide", "eisf"],
    collection: "Guides",
    sourceFile: "Trial_Interactive_SSU-Compression-Guide_F.pdf",
    content: {
      eyebrow: "Guide",
      title: "SSU Compression Guide: From Feasibility to Site Activation in 10 Steps",
      summary:
        "This guide keeps the energy flowing so decisions turn into action without stalls, rework, or inbox archaeology.",
      sections: [
        {
          heading: "Controls you can defend",
          body: "It’s vendor-agnostic on purpose and uses controls you can defend in any inspection:",
          bullets: [
            "Time-zone-aware timestamps",
            "Versioned documents",
            "Clear ownership",
            "Traceable handoffs into CTMS, eISF, and eTMF",
          ],
        },
        {
          heading: "Start where you are, instead of where you wish you were",
          body:
            "Before you move a single status, gather what you already have: the ranked site list, the notes behind those rankings, and the supporting files. Write down who made the call and when.",
          bullets: [],
        },
        {
          heading: "Make the site choice defensible in one page",
          body:
            "Capture each selection or deferral using a simple decision sheet: study ID, site ID, what you decided, why you decided it, which data you used, who approved, and the approval timestamp.",
          bullets: [],
        },
      ],
      stats: [],
      cta: CTA,
      heroMedia: hero("ti-ssu-compression-guide"),
    },
  },
];
