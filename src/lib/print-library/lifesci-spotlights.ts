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
import heroVivacy from "@/assets/print-heroes/lifesci/lifesci-spot-vivacy-readability.jpg.asset.json";
import heroNovoNordisk from "@/assets/print-heroes/lifesci/lifesci-spot-novo-nordisk-aem.jpg.asset.json";
import heroTakeda from "@/assets/print-heroes/lifesci/lifesci-spot-takeda-gamification.jpg.asset.json";
import heroUbc from "@/assets/print-heroes/lifesci/lifesci-spot-ubc-connect.jpg.asset.json";

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
  {
    slug: "vivacy-patient-material-readability",
    title: "Vivacy validates the readability of key patient materials",
    teaser:
      "Laboratoires Vivacy validated SSCP IFP and PIL readability with patients under MDR, then extended user testing to HCPs to improve its IFU.",
    collection: "Regulatory & compliance",
    tags: [
      "vivacy",
      "readability",
      "user testing",
      "mdr",
      "patient materials",
      "spotlight",
    ],
    sourceFile: "Life_Sci_Vivacy_Spotlight.pdf",
    content: {
      eyebrow: "Spotlight",
      productName: "Readability & User Testing",
      tagline:
        "Vivacy successfully ensures and validates the readability of key patient materials",
      summary:
        "Laboratoires Vivacy was searching for a vendor to test the readability of their summary of safety and clinical performance (SSCP) information for patients (IFP), patient information leaflets (PILs), and instructions for use (IFU).",
      capabilities: [
        {
          heading: "The challenge",
          body: "Vivacy needed a partner to test the readability of SSCP information for patients, patient information leaflets, and instructions for use — with evidence that would stand up to MDR scrutiny.",
        },
        {
          heading: "The solution",
          body: "Vivacy reached out to TransPerfect to recruit patients and healthcare professionals (HCPs) to review the SSCP IFP, PIL, and IFU. To gather meaningful insights, TransPerfect developed custom questionnaires for users to complete while reviewing each document.",
        },
        {
          heading: "Verification and certification",
          body: "TransPerfect compiled the questionnaire results into verification reports that validated user testing and captured key HCP and patient insights, and provided readability certificates for each document.",
        },
        {
          heading: "The results",
          body: "The project was completed successfully according to timelines, so Vivacy requested TransPerfect's support on another user testing project involving both patients and HCPs. Vivacy validated that the SSCP IFP and PIL were reviewed by patients according to MDR requirements, and gained HCP feedback to improve the IFU for physicians.",
        },
      ],
      stats: [
        {
          label: "Documents validated",
          value: "3",
          caption: "SSCP IFP, PIL, and IFU",
        },
        {
          label: "Delivery",
          value: "On time",
          caption: "Completed according to project timelines",
        },
        {
          label: "Compliance",
          value: "MDR",
          caption: "Patient review evidence per MDR requirements",
        },
        {
          label: "Follow-on work",
          value: "2nd",
          unit: "project",
          caption: "Extended user testing with patients and HCPs",
        },
      ],
      quote: {
        text: "The TransPerfect team has been very reactive since the first meeting and during the whole project, which enabled us to start and finish the readability tests of the documents on time.",
        author: "Laboratoires Vivacy",
        role: "Regulatory team",
      },
      expert: {
        name: "TransPerfect Life Sciences",
        role: "Readability and user testing services",
        email: "lifesciences@transperfect.com",
      },
      cta: {
        label: "Talk to TransPerfect Life Sciences",
        url: "https://lifesciences.transperfect.com",
      },
      heroMedia: {
        imageUrl: heroVivacy.url,
        aspect: "fill",
        heightPct: 40,
        focalX: 55,
        focalY: 45,
      },
    },
  },
  {
    slug: "novo-nordisk-globallink-adobe-aem",
    title: "Novo Nordisk delivers multilingual digital experiences with GlobalLink and Adobe",
    teaser:
      "By implementing GlobalLink Connect for Adobe Experience Manager, Novo Nordisk streamlined digital content translation inside the system its teams already use.",
    collection: "GlobalLink Web",
    tags: [
      "novo nordisk",
      "globallink connect",
      "adobe experience manager",
      "aem",
      "digital experience",
      "spotlight",
    ],
    sourceFile: "Technology_GL_Adobe_Novo_Nordisk_Spotlight.pdf",
    content: {
      eyebrow: "Customer Spotlight",
      productName: "GlobalLink Connect for Adobe Experience Manager",
      tagline:
        "Novo Nordisk delivers multilingual digital experiences through GlobalLink and Adobe",
      summary:
        "Novo Nordisk is a global healthcare company with over 95 years of innovation and leadership in diabetes care. Headquartered in Denmark, it develops biological medicines and markets its products in over 80 countries around the world.",
      capabilities: [
        {
          heading: "The challenge",
          body: "Before GlobalLink for AEM, translation processes were managed outside Adobe Experience Manager, adding an extra layer of processes and approval flows into the digital work stream.",
        },
        {
          heading: "The solution",
          body: "By implementing GlobalLink Connect for Adobe Experience Manager, Novo Nordisk streamlined the translation workflow for digital content — everything now happens inside the same system.",
        },
        {
          heading: "The result",
          body: "Translation and approval flows are smoother, enabling Novo Nordisk to quickly deliver multilingual experiences to their customers across every market they serve.",
        },
      ],
      stats: [
        {
          label: "Markets served",
          value: "80+",
          unit: "countries",
          caption: "Products marketed around the world",
        },
        {
          label: "Heritage",
          value: "95+",
          unit: "years",
          caption: "Innovation and leadership in diabetes care",
        },
        {
          label: "Systems",
          value: "1",
          caption: "Translation and approvals inside Adobe AEM",
        },
        {
          label: "Workflow",
          value: "Connected",
          caption: "GlobalLink Connect removes external hand-offs",
        },
      ],
      quote: {
        text: "Before GlobalLink for AEM we had to manage translation processes outside AEM, adding an extra layer of processes and approval flows into our work stream. Now it all happens within the same system, making translation and approvals flows smoother.",
        author: "Advanced Business Analyst",
        role: "Novo Nordisk",
      },
      expert: {
        name: "GlobalLink",
        role: "Translation technology for Adobe Experience Manager",
        email: "info@globallink.com",
      },
      cta: {
        label: "Explore GlobalLink",
        url: "https://globallink.translations.com",
      },
      heroMedia: {
        imageUrl: heroNovoNordisk.url,
        aspect: "fill",
        heightPct: 40,
        focalX: 50,
        focalY: 45,
      },
    },
  },
  {
    slug: "takeda-supply-chain-gamification",
    title: "TransPerfect supports Takeda supply chain training with gamification",
    teaser:
      "An interactive escape room e-learning module replaced text-heavy PDF and in-person KPI training — trackable, localization-friendly, and rolled out globally.",
    collection: "Training & e-learning",
    tags: [
      "takeda",
      "e-learning",
      "gamification",
      "supply chain",
      "training",
      "spotlight",
    ],
    sourceFile: "TPT_Life_Sciences_Spotlight_Takeda.pdf",
    content: {
      eyebrow: "Spotlight",
      productName: "TransPerfect E-Learning",
      tagline:
        "TransPerfect supports Takeda supply chain training with gamification",
      summary:
        "Takeda's supply chain team is responsible for knowing how to collect data and calculate KPIs. The training available for those accountabilities was excessively time consuming and impossible to track.",
      capabilities: [
        {
          heading: "The challenge",
          body: "Training materials lived in PDF and PPT format, with much of the training conducted in person. There was no way of tracking whether materials had been reviewed, and the available documentation was text-heavy and cumbersome to read.",
        },
        {
          heading: "The solution",
          body: "TransPerfect presented a variety of options and Takeda chose an interactive escape room module that follows an animated character through different stages — more personal and easier to relate to the team's responsibilities.",
        },
        {
          heading: "Built for scale",
          body: "TransPerfect's e-learning team designed and developed the learning model, enabling Takeda to train their workforce in a way that was both memorable and enjoyable — and localization friendly so it could be rolled out to teams around the world.",
        },
        {
          heading: "The results",
          body: "Takeda was extremely happy with the escape room experience. Teams saved time by completing their learning remotely, eliminating in-person training. Senior management saw the interactive approach as an important enhancement to their training strategy and immediately began considering other areas of the business that would benefit.",
        },
      ],
      stats: [
        {
          label: "Format shift",
          value: "PDF → interactive",
          caption: "From text-heavy documents to a gamified module",
        },
        {
          label: "In-person training",
          value: "Eliminated",
          caption: "Learning completed remotely",
        },
        {
          label: "Rollout",
          value: "Global",
          caption: "Localization-friendly by design",
        },
        {
          label: "Tracking",
          value: "Full",
          caption: "Completion visibility that PDFs could not provide",
        },
      ],
      quote: {
        text: "TransPerfect supported us on building a great learning experience for our community. Elements of gaming like point scoring and competition with others are incorporated in a training to learn our KPI definitions and targets.",
        author: "Arnau Sauleda",
        role: "Lead Capability Building, Takeda Pharmaceuticals International AG",
      },
      expert: {
        name: "TransPerfect Life Sciences",
        role: "E-learning design and development",
        email: "lifesciences@transperfect.com",
      },
      cta: {
        label: "Talk to TransPerfect Life Sciences",
        url: "https://lifesciences.transperfect.com",
      },
      heroMedia: {
        imageUrl: heroTakeda.url,
        aspect: "fill",
        heightPct: 40,
        focalX: 50,
        focalY: 50,
      },
    },
  },
  {
    slug: "ubc-contact-center-transperfect-connect",
    title: "UBC expedites administration and contact center response times",
    teaser:
      "TransPerfect Connect staffed certified, in-language resources who worked as UBC employees — cutting administrative load on a large pharma call center program.",
    collection: "Patient & contact center",
    tags: [
      "ubc",
      "transperfect connect",
      "call center",
      "contact center",
      "staffing",
      "spotlight",
    ],
    sourceFile: "TPT_Life_Sciences_Spotlight_UBC_Pharma.pdf",
    content: {
      eyebrow: "Spotlight",
      productName: "TransPerfect Connect",
      tagline:
        "UBC expedites administration tasks and contact center response times with TransPerfect Connect",
      summary:
        "UBC was awarded a call center opportunity with a large pharmaceutical client and needed a partner who could scale with them quickly.",
      capabilities: [
        {
          heading: "The challenge",
          body: "UBC needed a partner to assist with responding to incoming inquiries, making outbound calls, and reducing administrative tasks — and that partner had to be onboarded and trained quickly.",
        },
        {
          heading: "The solution",
          body: "TransPerfect Connect staffed certified resources who worked directly as UBC employees to answer calls and inquiries.",
        },
        {
          heading: "Why the model worked",
          body: "This outsourced staffing model efficiently supported UBC with additional resources who fulfilled their requirements by replying in language to queries and ensuring compliance with the call center process and workflows.",
        },
      ],
      stats: [
        {
          label: "Model",
          value: "Embedded",
          caption: "Certified agents working as UBC employees",
        },
        {
          label: "Onboarding",
          value: "Rapid",
          caption: "Trained quickly for the program",
        },
        {
          label: "Coverage",
          value: "In language",
          caption: "Inbound inquiries and outbound calls",
        },
        {
          label: "Compliance",
          value: "Process-aligned",
          caption: "Call center processes and workflows followed",
        },
      ],
      quote: {
        text: "The TransPerfect management team was always willing to support however needed. They became a part of our project 'family' very quickly — they were a perfect fit with the US CCA team. We will definitely keep the TransPerfect team in our 'back pocket' as a great resource for future programs.",
        author: "Heather Morris",
        role: "CCA Manager, UBC",
      },
      expert: {
        name: "TransPerfect Connect",
        role: "Contact center and interpretation staffing",
        email: "lifesciences@transperfect.com",
      },
      cta: {
        label: "Talk to TransPerfect Life Sciences",
        url: "https://lifesciences.transperfect.com",
      },
      heroMedia: {
        imageUrl: heroUbc.url,
        aspect: "fill",
        heightPct: 40,
        focalX: 55,
        focalY: 45,
      },
    },
  },
];
