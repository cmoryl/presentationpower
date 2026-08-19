// TransPerfect Life Sciences — MSA partnership one-pagers.
//
// Source: TP_MSA-Partnership Illustrator/PDF packages supplied by the division
// (Novartis edition). Copy was transcribed from the original artwork and
// re-shaped into the live `MsaPartnershipContent` model.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for
// the signed-in user via createPrintAsset().

import { emptyMsaPartnership, type MsaPartnershipContent } from "@/lib/print-assets.types";

export const LIFESCI_MSA_DIVISION_ID = "bm-tp-lifesci";

export type LifeSciMsaSeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  tags: string[];
  collection: string;
  sourceFile: string;
  content: MsaPartnershipContent;
};

export const LIFESCI_MSA_PARTNERSHIPS: LifeSciMsaSeed[] = [
  {
    slug: "novartis-msa-partnership",
    title: "Novartis × TransPerfect MSA Partnership",
    teaser:
      "Account one-pager for the Novartis master service agreement — relationship metrics, the full solution set, and every department supported.",
    tags: [
      "novartis",
      "msa",
      "partnership",
      "preferred provider",
      "life sciences",
      "account",
    ],
    collection: "Partnership one-pagers",
    sourceFile: "TP_MSA-Partnership_Novartis.ai / Novartis_JW_26.pdf",
    content: emptyMsaPartnership({
      eyebrow: "MSA partnership",
      partner: "Novartis",
      intro:
        "TransPerfect is the world's largest provider of language and technology solutions for global business, and a trusted Novartis partner across the product lifecycle.",
      stats: [
        { label: "Year relationship", value: "15", unit: "+" },
        { label: "Words translated", value: "23", unit: "M" },
        { label: "Cost reduction", value: "39", unit: "%" },
        { label: "Translation memory savings", value: "43", unit: "%" },
        { label: "Projects delivered", value: "1.7", unit: "K+" },
        { label: "Markets supported", value: "39", unit: "" },
      ],
      partnershipNote:
        "As a preferred provider under a global master service agreement, TransPerfect supports Novartis teams from early development through commercialization. The MSA delivers preferred rates, volume discounts, and consistent quality governance across every department, therapeutic area, and market.",
      solutionsTitle: "Discover a world of solutions",
      solutions: [
        { label: "Document Translation", icon: "language" },
        { label: "Linguistic Validation & eCOA", icon: "check" },
        { label: "eClinical & eTMF", icon: "grid" },
        { label: "Medical Writing", icon: "star" },
        { label: "Video Creation", icon: "bolt" },
        { label: "Patient Engagement", icon: "users" },
        { label: "Contact Center Support", icon: "chat" },
        { label: "Interpretation", icon: "globe-alt" },
        { label: "Inspection Readiness", icon: "target" },
        { label: "IMP & Clinical Labeling", icon: "clock" },
        { label: "E-Learning & Training", icon: "learn" },
        { label: "Regulatory Submissions", icon: "trending" },
      ],
      scale: [
        { label: "Languages supported", value: "200", unit: "+" },
        { label: "Certified linguists", value: "4,000", unit: "+" },
        { label: "Cities worldwide", value: "140", unit: "+" },
        { label: "Studies supported", value: "5,000", unit: "+" },
      ],
      departmentsTitle: "Departments supported",
      departments: [
        "Clinical",
        "Regulatory Affairs",
        "Global Drug Development",
        "Marketing & Communications",
        "Drug Safety & Pharmacovigilance",
        "People & Organization",
        "Medical Information",
        "Legal & Privacy",
        "Novartis Technical Operations",
        "Learning & Development",
        "Market Access",
        "Sales Support",
        "Supply Chain",
        "Quality Assurance",
        "Compliance",
        "Digital & Data",
        "OnePSP",
        "Diversity & Inclusion",
      ],
      contacts: {
        title: "Global contacts",
        name: "",
        role: "Global Account Director, Novartis",
        phone: "",
        email: "lifesciences@transperfect.com",
        ctaLabel: "Contact us today:",
        ctaEmail: "lifesciences@transperfect.com",
      },
      footerUrl: "lifesciences.transperfect.com",
    }),
  },
];
