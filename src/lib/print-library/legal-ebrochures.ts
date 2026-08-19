// TransPerfect Legal — recreated e-brochure library.
//
// Source: the TransPerfect Legal e-brochure set (US + UK English editions)
// supplied by marketing. Copy was ingested from the original PDFs and
// re-shaped into the live `EBrochureContent` model; hero photography was
// pulled from each brochure folder, optimized, and re-hosted on the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for
// the signed-in user via createPrintAsset().

import type { EBrochureContent } from "@/lib/print-assets.types";

import heroCorpLang from "@/assets/print-heroes/legal-ebro/legal-ebro-corp-lang.jpg.asset.json";
import heroEdisco from "@/assets/print-heroes/legal-ebro/legal-ebro-ediscovery.jpg.asset.json";
import heroGenai from "@/assets/print-heroes/legal-ebro/legal-ebro-genai.jpg.asset.json";
import heroManagedReview from "@/assets/print-heroes/legal-ebro/legal-ebro-managed-review.jpg.asset.json";
import heroMultilang from "@/assets/print-heroes/legal-ebro/legal-ebro-multilang.jpg.asset.json";
import heroWhy from "@/assets/print-heroes/legal-ebro/legal-ebro-why.jpg.asset.json";
import heroReefPlatform from "@/assets/print-heroes/legal-ebro/legal-ebro-reef-platform.jpg.asset.json";
import heroCourtReporting from "@/assets/print-heroes/legal-ebro/legal-ebro-court-reporting.jpg.asset.json";
import heroQc from "@/assets/print-heroes/legal-ebro/legal-ebro-qc.jpg.asset.json";
import heroIndiaReview from "@/assets/print-heroes/legal-ebro/legal-ebro-india-review.jpg.asset.json";
import heroCost from "@/assets/print-heroes/legal-ebro/legal-ebro-cost.jpg.asset.json";

export const LEGAL_DIVISION_ID = "bm-tp-legal";

export type LegalEbrochureSeed = {
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
  label: "Talk to TransPerfect Legal",
  subhead: "Local support in 140+ cities worldwide — legal@transperfect.com",
  url: "https://www.transperfectlegal.com",
};

const hero = (
  url: string,
  heightPct = 44,
  focalY = 45,
): EBrochureContent["heroMedia"] => ({
  imageUrl: url,
  aspect: "fill",
  heightPct,
  focalY,
});

export const LEGAL_EBROCHURES: LegalEbrochureSeed[] = [
  {
    slug: "ediscovery",
    title: "eDiscovery",
    teaser:
      "The industry's fastest, smartest eDiscovery team — Digital Reef processing, global ESI hubs, and forensic technology.",
    tags: ["ediscovery", "digital reef", "forensics", "esi", "analytics"],
    collection: "eDiscovery & analytics",
    sourceFile: "TPLegal_eDiscovery_eBro_25.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "eDiscovery",
      summary:
        "TransPerfect Legal is home to the industry's fastest, smartest, and most capable eDiscovery team — a trusted partner of Am Law 200 and Global 100 firms and the majority of Fortune 500 corporate legal departments.",
      sections: [
        {
          heading: "Legal technology",
          body: "Digital Reef is the fastest engine on the market, with an intuitive ECA and analytics interface built for rapid searching, analyzing, and advanced filtering — presenting lawyers with a smaller volume of higher-quality documents 40% faster than legacy processing engines.",
          bullets: [
            "Advanced filtering and ECA in one interface",
            "Processing and refinement across 200+ languages",
            "Smaller, higher-quality review populations",
          ],
        },
        {
          heading: "ESI processing and forensics",
          body: "Powerful data processing hubs across eight global locations pair state-of-the-art infrastructure with experts working around the clock. Our forensics team delivers early data assessment, rapid collection deployment, secure evidence storage, and expert consulting — anytime, anywhere.",
          bullets: [
            "Eight global processing hubs",
            "Defensible collection from any modern data source",
            "Secure evidence storage and expert testimony",
          ],
        },
        {
          heading: "Pre-Review Analytics®",
          body: "De-duplication and culling narrow the scope of data, Pre-Review Analytics® evaluates and eliminates digital debris, and review analytics prepare organized data priorities before review begins.",
          bullets: [
            "Reduce total eDiscovery spend by up to 40%",
            "Accelerate early data assessment from weeks to hours",
            "Maximize defensibility and control end to end",
          ],
        },
      ],
      stats: [
        { label: "Faster document delivery", value: "40", unit: "%", caption: "vs. legacy processing engines" },
        { label: "Languages supported", value: "200", unit: "+", caption: "processing and review" },
        { label: "Global processing hubs", value: "8", caption: "around-the-clock coverage" },
        { label: "Cities with local support", value: "140", unit: "+", caption: "worldwide" },
      ],
      discover: {
        body: "eDiscovery matters we support every day:",
        bullets: [
          "Complex commercial disputes and IP litigation",
          "White collar and internal investigations",
          "Antitrust regulatory matters and second requests",
          "Securities class actions and international arbitration",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroEdisco.url, 42, 46),
    },
  },
  {
    slug: "multi-language-ediscovery",
    title: "Multi-Language eDiscovery",
    teaser:
      "Proprietary technology and workflows that cut discovery spend by up to 50% and lift discovery accuracy by 20%.",
    tags: ["multilingual", "ediscovery", "translation", "ocr", "digital reef"],
    collection: "eDiscovery & analytics",
    sourceFile: "TPLegal_Multi-Language_eDisco.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Multi-Language eDiscovery",
      summary:
        "When it comes to multi-language matters, our proprietary technologies and workflows reduce your discovery spend by up to 50% while increasing the accuracy of your discovery by 20%.",
      sections: [
        {
          heading: "Automated translation workflow",
          body: "TransPerfect Legal automates the entire translation request workflow, minimizing manual labor and reducing the potential for human error. Translation memory identifies and reuses previously translated text, eliminating redundant charges across matters.",
          bullets: [
            "Automated translation request routing",
            "Translation memory removes duplicate spend",
            "AI-powered machine translation inside Relativity",
          ],
        },
        {
          heading: "Language-aware discovery",
          body: "Multi-language search term consulting ensures terms are dialectically correct with accurate search syntax, while Digital Reef automatically analyzes every data set by language during ingestion to unlock downstream efficiencies.",
          bullets: [
            "Multi-language search term consulting",
            "Automatic language identification at ingestion",
            "Linguistic OCR with language-sensitive character sets",
          ],
        },
        {
          heading: "Bilingual review capacity",
          body: "Our extensive network of bilingual contract review attorneys — fluent in over 200 languages — is rigorously tested and continuously trained in cultural nuance, trends, and industry-specific terminology.",
          bullets: [
            "200+ languages across review teams",
            "Tested, continuously trained reviewers",
            "Secure, single-vendor language and legal workflow",
          ],
        },
      ],
      stats: [
        { label: "Reduction in discovery spend", value: "50", unit: "%", caption: "up to, with automated workflows" },
        { label: "Increase in discovery accuracy", value: "20", unit: "%", caption: "language-aware search and OCR" },
        { label: "Languages covered", value: "200", unit: "+", caption: "bilingual review attorneys" },
      ],
      cta: CTA,
      heroMedia: hero(heroMultilang.url, 40, 48),
    },
  },
  {
    slug: "generative-ai-powered-ediscovery",
    title: "Generative AI-Powered eDiscovery & Investigations",
    teaser:
      "GenAI document review, RAG-driven investigation, and Early Case Intelligence across relevance, privilege, and PII.",
    tags: ["generative ai", "ediscovery", "rag", "privilege", "pii"],
    collection: "AI & investigations",
    sourceFile: "TPLegal_GenerativeAIPoweredeDiscovery_eBro_25.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Generative AI-Powered eDiscovery & Investigations",
      summary:
        "Leverage the latest GenAI capabilities to streamline document review, privilege review and logging, PII identification, and investigation workflows — with greater speed, accuracy, and insight.",
      sections: [
        {
          heading: "GenAI document review",
          body: "Our GenAI tools follow prompt instructions to review and categorize documents for relevance across up to 15 custom issues, while supporting privilege assessment and PII identification. Reviews generate detailed summaries and explanations for each coding decision.",
          bullets: [
            "Relevance review across up to 15 issues",
            "Privilege review and automated logging",
            "Personal data identification (PII/PHI)",
            "Audio, video, and image file review",
          ],
        },
        {
          heading: "Retrieval-augmented generation (RAG)",
          body: "GenAI-powered RAG tools accelerate data analysis, chronology building, and Q&A-driven exploration of document sets, letting teams extract facts and uncover evidence with citation-backed insights.",
          bullets: [
            "Q&A and document summarization",
            "Automated timeline creation",
            "Investigations and fact-finding exercises",
            "Case strategy and deposition preparation",
          ],
        },
        {
          heading: "Early Case Intelligence (ECI)",
          body: "Submit a brief case narrative and ECI automatically categorizes documents by issue, generates data-driven keyword lists, and identifies relevant materials at the outset of a matter.",
          bullets: [
            "Early case assessment in hours",
            "Custodian analysis",
            "Data-driven keyword generation",
          ],
        },
      ],
      stats: [
        { label: "Custom issues per review pass", value: "15", caption: "applied simultaneously" },
        { label: "Documents reviewed per hour", value: "1,000s", caption: "multilingual support" },
        { label: "Coding decisions explained", value: "100", unit: "%", caption: "summary + rationale per document" },
      ],
      cta: CTA,
      heroMedia: hero(heroGenai.url, 42, 44),
    },
  },
  {
    slug: "genai-solutions-suite",
    title: "Generative AI Solutions for eDiscovery & Investigations",
    teaser:
      "The full GenAI stack — eDiscoveryAI (EDAI), Relativity aiR, Cicero, Reef Translate, image analysis, and AI deposition summaries.",
    tags: ["generative ai", "edai", "relativity air", "cicero", "reef translate"],
    collection: "AI & investigations",
    sourceFile: "TP Legal_GenAI offerings_Ebro_25.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Generative AI Solutions for eDiscovery & Investigations",
      summary:
        "A connected suite of GenAI-powered solutions across review, privilege, privacy, translation, and investigation — deployed inside the platforms your teams already run.",
      sections: [
        {
          heading: "eDiscoveryAI (EDAI)",
          body: "EDAI enhances document review and analysis inside TransPerfect's Relativity Server and RelativityOne environments, with Reef Review availability planned.",
          bullets: [
            "Early Case Intelligence: dataset insights and case memoranda",
            "Relevance: up to 15 simultaneous prompts, images and multimedia",
            "Privilege: identification plus automated privilege log descriptions",
            "Privacy: PII and sensitive health information extraction and redaction",
          ],
        },
        {
          heading: "Relativity aiR and Cicero",
          body: "Relativity aiR adds GenAI relevance, privilege, and case strategy workflows in RelativityOne. Cicero applies LLMs and retrieval augmented generation to summarize documents, run Q&A, build chronologies, and extract key data points with citations.",
          bullets: [
            "aiR for Relevance — up to 10 simultaneous prompts",
            "aiR for Privilege — logging built in",
            "Cicero summarization, investigation, chronology, extraction",
            "Citation-backed answers for defensibility",
          ],
        },
        {
          heading: "Language, image, and deposition AI",
          body: "Reef Translate streamlines machine translation of large document volumes inside Relativity, image analysis adds object recognition, labeling and captioning, and AI deposition summaries deliver concise memoranda from stenographic or digital reporting.",
          bullets: [
            "On-the-fly translation of foreign-language content",
            "Searchable text fields generated from images",
            "Error-free deposition summaries in a fraction of the time",
          ],
        },
      ],
      stats: [
        { label: "EDAI prompts per review pass", value: "15", caption: "applied simultaneously" },
        { label: "aiR prompts per review pass", value: "10", caption: "RelativityOne" },
        { label: "Cicero prompts", value: "Unlimited", caption: "across your datasets" },
      ],
      cta: CTA,
      heroMedia: hero(heroGenai.url, 38, 52),
    },
  },
  {
    slug: "reef-review",
    title: "Reef Review",
    teaser:
      "Speed meets simplicity — the industry's most intuitive and cost-effective processing, ECA, and review platform.",
    tags: ["reef review", "review platform", "eca", "processing", "tar"],
    collection: "Platforms",
    sourceFile: "TPLegal_ReefReview_eBro_r2.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Reef Review",
      summary:
        "Future-proof your eDiscovery with unmatched speed, precision, and efficiency — the industry's fastest processing engine, an intuitive ECA interface, and a streamlined review platform.",
      sections: [
        {
          heading: "Powerful and customizable",
          body: "Reef Review simplifies investigations and reduces review costs with advanced data filtering, lower hosting fees, complimentary user licenses, and trusted security — scaling effortlessly as your matters grow.",
          bullets: [
            "Advanced data filtering",
            "Lower hosting fees",
            "Complimentary user licenses",
            "Trusted security posture",
          ],
        },
        {
          heading: "Processing, ECA, and investigations",
          body: "The fastest processing tool on the market pairs with an intuitive interface for advanced data filtering and internal investigations, simple search term construction, concept clustering, communication grids, interactive histograms, and similarity searching.",
          bullets: [
            "Concept clustering and similarity searching",
            "Communication grids and interactive histograms",
            "Simple search term construction",
          ],
        },
        {
          heading: "Document review",
          body: "Cutting-edge search speed powered by MongoDB and Elasticsearch, expedited data import and export, email threading and near deduplication, TAR and continuous active learning, and an advanced viewer with enhanced SMF and AutoCAD support.",
          bullets: [
            "TAR and continuous active learning",
            "Email threading and near deduplication",
            "Advanced viewer with SMF and AutoCAD support",
            "Smart coding and review management",
          ],
        },
      ],
      stats: [
        { label: "Reduction in review cost", value: "30", unit: "%", caption: "vs. legacy review platforms" },
        { label: "Client response time", value: "15", unit: "min", caption: "the TransPerfect 15-minute rule" },
        { label: "Support coverage", value: "24/7", caption: "follow-the-sun project management" },
      ],
      cta: CTA,
      heroMedia: hero(heroReefPlatform.url, 42, 46),
    },
  },
  {
    slug: "digital-reef-enterprise",
    title: "Digital Reef for Enterprise & Law Firms",
    teaser:
      "Process, investigate, and preview your data 40% faster — up to 17 TB in 24 hours with advanced analytics.",
    tags: ["digital reef", "processing", "eca", "analytics", "enterprise"],
    collection: "Platforms",
    sourceFile: "DR_EnterpriseSales_Firms_eBro.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Process, Investigate & Preview Your Data 40% Faster",
      summary:
        "Digital Reef is the fastest engine on the market, capable of processing up to 17 TB in 24 hours, with an intuitive ECA and analytics interface designed for rapid searching, analyzing, and advanced filtering.",
      sections: [
        {
          heading: "Processing and ECA at scale",
          body: "A grid architecture designed for big data supports over 400 file types, OCR across languages, multi-tenant functionality, customizable user roles, and a multi-matter repository that re-purposes prior work product.",
          bullets: [
            "Grid architecture built for big data",
            "400+ file types supported",
            "Multi-matter repository re-uses work product",
            "Customizable roles and multi-tenant functionality",
          ],
        },
        {
          heading: "Analytics, investigations, and review",
          body: "An intuitive interface brings search filters across keywords, dates and metadata together with interactive visual graphs, a document viewer for review and tagging, concept clustering, SPAM filtering, PII identification, and communications analysis.",
          bullets: [
            "Interactive visual graphs and charts",
            "Concept clustering and find-more-like-this",
            "SPAM and PII identification",
            "Pre-Review Analytics®",
          ],
        },
        {
          heading: "Flexible deployment",
          body: "Run Digital Reef behind your firewall on-premises or in the cloud, as a managed service and SaaS, or portably for sensitive and international matters — backed by TransPerfect Legal's award-winning support professionals.",
          bullets: [
            "Behind firewall (on-prem or cloud)",
            "Managed service and SaaS",
            "Portable for sensitive or international matters",
          ],
        },
      ],
      stats: [
        { label: "Faster to reviewable data", value: "40", unit: "%", caption: "vs. legacy processing engines" },
        { label: "Processing throughput", value: "17", unit: "TB", caption: "in 24 hours" },
        { label: "File types supported", value: "400", unit: "+", caption: "with OCR across languages" },
      ],
      cta: CTA,
      heroMedia: hero(heroReefPlatform.url, 40, 48),
    },
  },
  {
    slug: "digital-court-reporting",
    title: "Digital Court Reporting & Deposition Services",
    teaser:
      "Certified transcripts at 40% the cost, 50% the delivery time, and 99% accuracy.",
    tags: ["depositions", "court reporting", "transcripts", "asr", "litigation support"],
    collection: "Depositions & trial support",
    sourceFile: "TL_Digital Court Reporting_eBrochure v.2.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Digital Court Reporting",
      summary:
        "Deposition services delivering certified transcripts at 40% the cost, 50% the delivery time, and 99% accuracy.",
      sections: [
        {
          heading: "Cost control and accelerated delivery",
          body: "A transparent, predictable hourly billing model with flexible service packages and optional transcript ordering pairs with real-time text streams during proceedings and instant rough drafts for immediate review.",
          bullets: [
            "Save 40% on transcript costs",
            "50% faster delivery of final transcripts",
            "Real-time text streams and instant rough drafts",
            "Streamlined case preparation workflow",
          ],
        },
        {
          heading: "Guaranteed availability and security",
          body: "On-demand qualified expert reporters reduce scheduling conflicts and cancellations by opening access to a global talent pool, with complete end-to-end process management and robust data protection.",
          bullets: [
            "On-demand AAERT-certified reporters",
            "Seamless Zoom, Teams, and Webex integration",
            "TL VideoLink and Reef Exhibit options",
            "Secure cloud storage with multiple backups",
          ],
        },
        {
          heading: "Qualifications and responsibilities",
          body: "Reporters are AAERT certified with specialized training in legal procedure and terminology, licensed as notaries to administer oaths, and supported by professional-grade microphones with AI-powered automatic speech recognition and continuous audio confidence monitoring.",
          bullets: [
            "Administers oaths, captures a verbatim record",
            "Manages exhibits and facilitates readback",
            "Certifies accuracy of the final transcript",
          ],
        },
      ],
      stats: [
        { label: "Transcript cost", value: "40", unit: "%", caption: "of traditional cost" },
        { label: "Faster final delivery", value: "50", unit: "%", caption: "vs. standard turnaround" },
        { label: "Transcript accuracy", value: "99", unit: "%", caption: "certified record" },
      ],
      cta: {
        label: "Transform your deposition workflow",
        subhead: "Contact your TransPerfect Legal expert — digital_depo@transperfect.com",
        url: "https://www.transperfectlegal.com",
      },
      heroMedia: hero(heroCourtReporting.url, 40, 44),
    },
  },
  {
    slug: "managed-review-services-us",
    title: "Managed Review Services (US)",
    teaser:
      "Document review and legal staffing across five continents, with review support in the US, UK/EU, and India.",
    tags: ["managed review", "staffing", "document review", "relativity", "tar"],
    collection: "Managed review & staffing",
    sourceFile: "TPLegal_ManagedReview_25_US.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Managed Review Services",
      summary:
        "TransPerfect Legal expertly meets the worldwide review needs of clients at the majority of Am Law 200 and Global 100 firms, as well as Fortune 500 corporate legal departments.",
      sections: [
        {
          heading: "Experts and technology",
          body: "Licensed attorneys, review managers, paralegals, linguists, and multilingual legal professionals work with TAR 1.0 and 2.0, Blackout, Brainspace, AI-integrated Relativity, Digital Reef, and Reef Central.",
          bullets: [
            "Licensed attorneys and review managers",
            "Multilingual legal professionals and linguists",
            "TAR 1.0/2.0, Brainspace, Blackout, Reef Central",
            "Review support in the US, UK/EU, and India",
          ],
        },
        {
          heading: "Recruiting",
          body: "We nominate candidates for each case based on individual performance history, eDiscovery skills, and subject matter expertise, then verify bar licensure and language fluency before the team is seated.",
          bullets: [
            "Conflicts checks, NDAs, project documentation",
            "Background checks updated on request",
            "Availability confirmed for the project term",
          ],
        },
        {
          heading: "Project management",
          body: "Project managers liaise between management, QC teams, and first-level reviewers, generate status reports, coordinate quality standards and timeline compliance, and perform final quality checks before delivery.",
          bullets: [
            "Status reports and reviewer briefings",
            "Cost-effective technology and workflow advice",
            "Final QC before client deliverable",
          ],
        },
      ],
      stats: [
        { label: "Practice groups supported", value: "12", unit: "+", caption: "antitrust to pharma and biotech" },
        { label: "Review hubs", value: "3", caption: "US, UK/EU, India" },
        { label: "Continents covered", value: "5", caption: "global review network" },
      ],
      discover: {
        body: "Practice groups:",
        bullets: [
          "Antitrust and second request, arbitration",
          "Commercial litigation, construction disputes",
          "Compliance, investigations, and anti-bribery",
          "Data privacy, labor and employment, IP and trade secrets",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroManagedReview.url, 40, 42),
    },
  },
  {
    slug: "managed-review-services-uk",
    title: "Managed Review Services (UK/EU)",
    teaser:
      "UK/EU edition of the managed review and legal staffing brochure, with regional spelling and practice groups.",
    tags: ["managed review", "staffing", "uk", "document review", "relativity"],
    collection: "Managed review & staffing",
    sourceFile: "TPLegal_ManagedReview_25_UK.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Managed Review Services",
      summary:
        "TransPerfect Legal expertly meets the worldwide review needs of clients at the majority of Am Law 200 and Global 100 firms, as well as Fortune 500 corporate legal departments, with review support strategically located in the US, UK/EU and India.",
      sections: [
        {
          heading: "Experts and technology",
          body: "Licensed attorneys, review managers, paralegals, linguists and multilingual legal professionals work with TAR 1.0 and 2.0, Blackout, Brainspace, AI-integrated Relativity, Digital Reef and Reef Central.",
          bullets: [
            "Licensed attorneys and review managers",
            "Multilingual legal professionals and linguists",
            "TAR 1.0/2.0, Brainspace, Blackout, Reef Central",
            "Review support in the US, UK/EU and India",
          ],
        },
        {
          heading: "Recruiting",
          body: "We nominate candidates for each case upon review of individual performance history, eDiscovery skills and subject matter expertise, verifying bar licensure and language fluency before the team is seated.",
          bullets: [
            "Conflicts checks, NDAs and project documentation",
            "Background checks updated when requested",
            "Availability confirmed for the project term",
          ],
        },
        {
          heading: "Project management",
          body: "Project managers liaise between management, QC teams and first-level reviewers, generate status reports, coordinate quality standards and timeline compliance, and perform final quality checks before the deliverable is sent.",
          bullets: [
            "Status reports and reviewer briefings",
            "Cost-effective technology and workflow advice",
            "Final quality checks before delivery",
          ],
        },
      ],
      stats: [
        { label: "Practice groups supported", value: "12", unit: "+", caption: "antitrust to pharma and biotech" },
        { label: "Review hubs", value: "3", caption: "US, UK/EU, India" },
        { label: "Continents covered", value: "5", caption: "global review network" },
      ],
      cta: CTA,
      heroMedia: hero(heroManagedReview.url, 40, 42),
    },
  },
  {
    slug: "managed-review-quality-control",
    title: "Managed Review Services — Quality Control Measures",
    teaser:
      "The tiered supervision model, QC plan, and technology stack behind every TransPerfect Legal managed review.",
    tags: ["managed review", "quality control", "privmatic", "brainspace", "privilege"],
    collection: "Managed review & staffing",
    sourceFile: "TLS_ManagedReviewSolutions.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Quality Control Measures",
      summary:
        "At the onset of a project, TransPerfect Legal project managers connect with supervising counsel to prepare the team for a successful review, developing a comprehensive quality control plan tailored to the matter.",
      sections: [
        {
          heading: "The QC plan",
          body: "Project managers advise on the implementation of best practices and technologies from day one, building robust searches and workflows that provide statistics-based quality assurances.",
          bullets: [
            "Robust searches and workflows with statistical QA",
            "Tailored coding layouts, including event handlers",
            "Streamlined, centralized case communications",
          ],
        },
        {
          heading: "Team structure",
          body: "Each team is structured according to our tiered supervision model, prioritizing specialization and delegation. Review managers work at the direction of the lead project manager and monitor completion and quality at each step.",
          bullets: [
            "First level review and targeted QC searches",
            "Second level and privilege review",
            "Foreign language, technical documents, redaction",
          ],
        },
        {
          heading: "Technology to drive quality",
          body: "Battle-tested review teams apply technology to enhance quality checks and target datasets for faster completion, including our proprietary PrivMatic tool for privilege QC and logging.",
          bullets: [
            "Brainspace and Blackout",
            "Duplicate, near-duplicate and email thread consistency checks",
            "GenAI-assisted QC",
            "PrivMatic privilege QC and logging",
          ],
        },
      ],
      stats: [
        { label: "Supervision tiers", value: "3", caption: "lead PM, review managers, reviewers" },
        { label: "Review workstreams", value: "6", caption: "first level through redaction" },
        { label: "QC coverage", value: "100", unit: "%", caption: "sampled across every reviewer" },
      ],
      cta: CTA,
      heroMedia: hero(heroQc.url, 40, 42),
    },
  },
  {
    slug: "india-managed-document-review",
    title: "India — Managed Document Review",
    teaser:
      "Offshore managed document review from our Delhi-based team: high quality, tiered QC, and cost-effective delivery.",
    tags: ["managed review", "india", "offshore", "quality control", "relativity"],
    collection: "Managed review & staffing",
    sourceFile: "TL_Managed-Document-Review_eBro.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "India — Managed Review Solutions",
      summary:
        "TransPerfect Legal is a leading provider of offshore managed document review services, delivering high-quality, well-organized, and cost-effective legal support from our Delhi-based team of skilled review experts.",
      sections: [
        {
          heading: "Transparent from the start",
          body: "Project managers and consultants work with you to establish guidelines, set turnaround commitments, and forecast total costs — ensuring transparency with key metrics and full visibility into all data-related processes.",
          bullets: [
            "Periodic sample sets provided to counsel",
            "Daily progress and tagging decision reports",
            "Rolling releases to meet production deadlines",
          ],
        },
        {
          heading: "Quality control services",
          body: "A comprehensive managed-review solution customizes searches to maximize efficiency and defensibility, identifies targeted QC procedures, and performs initial QC on a percentage of each reviewer's tagging.",
          bullets: [
            "Customized, defensible search strategies",
            "Targeted QC procedures per matter",
            "Centralized communications for escalation",
          ],
        },
        {
          heading: "Certified project managers",
          body: "Our highly trained, certified team has extensive experience managing review projects for investigations initiated by the CFTC, SEC, FINRA, and other regulatory bodies, spanning securitization, financial fraud, healthcare patents, antitrust, and class action disputes.",
          bullets: [
            "Reviewers trained on FRCP and privilege rules",
            "Relativity-proficient teams with TAR and AI",
            "Multitier quality control process",
          ],
        },
      ],
      stats: [
        { label: "Delivery centre", value: "Delhi", caption: "offshore review hub" },
        { label: "Reporting cadence", value: "Daily", caption: "during US/UK morning hours" },
        { label: "QC tiers", value: "Multi", caption: "sampled per reviewer" },
      ],
      cta: CTA,
      heroMedia: hero(heroIndiaReview.url, 38, 50),
    },
  },
  {
    slug: "corporate-legal-language-services",
    title: "Corporate Legal Language Services",
    teaser:
      "Centralized legal translation across corporate, compliance, IP, and litigation workflows — secure and predictable.",
    tags: ["translation", "language services", "compliance", "ip", "litigation"],
    collection: "Language services",
    sourceFile: "TPLegal_CorpLegalLangServices_LawFirms_eBro.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Corporate Legal Language Services",
      summary:
        "Increase security, reduce costs, and ease coordination of your language services by leveraging TransPerfect for all corporate legal support — consolidating and organizing workflows so your data stays protected end to end.",
      sections: [
        {
          heading: "Centralized translation",
          body: "One partner covers corporate, compliance, intellectual property, and litigation content — from M&A due diligence and contracts through whistleblower hotlines, patent filings, and trial transcripts.",
          bullets: [
            "Corporate: M&A due diligence, contracts, leases",
            "Compliance: training, policies, investigations, ethics",
            "IP: patent applications, EP validation, office actions",
            "Litigation: discovery materials, transcripts, pleadings",
          ],
        },
        {
          heading: "Why TransPerfect",
          body: "ISO 18587:2017, ISO 9001:2015, and ISO 17100:2015 certified, with 24/7/365 dedicated service, 140+ offices worldwide, 20+ global production locations, specialized linguistic resources, and industry-leading technology.",
          bullets: [
            "Triple ISO certified language production",
            "24/7/365 dedicated service teams",
            "140+ offices, 20+ production locations",
            "Legal experts and consultants on staff",
          ],
        },
        {
          heading: "Benefits",
          body: "Predictable legal translation budgets, reusable work product, and a minimized quoting process pair with information rights risk management and control over proprietary documents.",
          bullets: [
            "Predictable budgets and reusable work product",
            "Minimized quoting process",
            "Information rights risk management",
            "Protection against breaches",
          ],
        },
      ],
      stats: [
        { label: "ISO certifications", value: "3", caption: "18587, 9001, 17100" },
        { label: "Offices worldwide", value: "140", unit: "+", caption: "local legal support" },
        { label: "Production locations", value: "20", unit: "+", caption: "global coverage" },
        { label: "Service coverage", value: "24/7/365", caption: "dedicated teams" },
      ],
      cta: CTA,
      heroMedia: hero(heroCorpLang.url, 40, 44),
    },
  },
  {
    slug: "ediscovery-cost-breakdown",
    title: "eDiscovery Cost Breakdown",
    teaser:
      "How a matter is priced phase by phase — collection, processing, hosting and review — with a 91.5% average cull rate.",
    tags: ["pricing", "ediscovery", "budgeting", "processing", "hosting"],
    collection: "eDiscovery & analytics",
    sourceFile: "TL_eDiscovery-Cost-Breakdown_eBro.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "eDiscovery Cost Breakdown",
      summary:
        "TransPerfect Legal offers bespoke cost breakdowns tailored to the subject, client, and budget needs of each case. This is our most popular and flexible line-item model — fixed-fee and all-in models are available on request.",
      sections: [
        {
          heading: "Phase 1 — Forensic data collection",
          body: "Global forensic experts advise on and assist with collecting client data defensibly, facilitating on-site and remote cross-border collection across physical documents, email, mobile data, cloud platforms, and industry-specific software.",
          bullets: [
            "Hourly rate by data complexity",
            "Consultant seniority priced transparently",
            "On-site and remote cross-border collection",
          ],
        },
        {
          heading: "Phase 2 — Data processing",
          body: "Collected data is ingested into Digital Reef to process and cull duplicates and spam before promotion to Relativity. Advanced culling saves clients the cost of promoting unnecessary data.",
          bullets: [
            "One-off fee, separate per-GB ingestion and promotion rates",
            "91.5% average cull rate vs. 80% industry standard",
            "Lower downstream hosting and review costs",
          ],
        },
        {
          heading: "Phase 3 — Hosting and review",
          body: "Promoted data is hosted on Relativity for legal review and issue coding, with multilingual managed review and Brainspace analytics making review faster and more cost efficient.",
          bullets: [
            "Low per-GB rate for unpromoted data on Digital Reef",
            "Per-GB Relativity hosting and per-user licenses",
            "Hourly managed review, project management, and consulting rates",
          ],
        },
      ],
      stats: [
        { label: "Average cull rate", value: "91.5", unit: "%", caption: "vs. 80% industry standard" },
        { label: "Pricing phases", value: "3", caption: "collection, processing, review" },
        { label: "Pricing models", value: "3", caption: "line item, fixed fee, all-in" },
      ],
      cta: CTA,
      heroMedia: hero(heroCost.url, 42, 44),
    },
  },
  {
    slug: "why-transperfect-legal",
    title: "Why TransPerfect Legal",
    teaser:
      "What differentiates us — cutting-edge technology, award-winning service, and global multilingual coverage.",
    tags: ["overview", "credentials", "forensics", "digital reef", "reef review"],
    collection: "Overview",
    sourceFile: "TPLegal_WhyLetter_eBro_ENG.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Why TransPerfect Legal",
      summary:
        "TransPerfect Legal is the global leader in legal technology, AI, and advisory services for compliance investigations, eDiscovery, and linguistic solutions.",
      sections: [
        {
          heading: "Cutting-edge technology",
          body: "We believe in cannibalizing ourselves with technology — if there is a way to reduce our clients' costs through technological solutions, we do it proactively.",
          bullets: [
            "Computer forensics across a dozen leading tools",
            "Digital Reef built for compliance investigations",
            "ECA and analytics cut review costs by up to 40%",
            "Reef Review reduces operational costs by 30%",
          ],
        },
        {
          heading: "Award-winning customer service",
          body: "Our professional support team is recognized in international rankings for excellence, and our 15-Minute Rule guarantees an agile maximum response time — particularly in competition and antitrust, compliance and anti-bribery, international arbitration, and construction disputes.",
          bullets: [
            "15-Minute Rule for client response",
            "Specialist coverage by practice area",
            "Follow-the-sun global service culture",
          ],
        },
        {
          heading: "Global presence and multilingual support",
          body: "With 17 computer forensics laboratories and dozens of production centers across five continents, we are uniquely positioned to support cross-border and multilingual matters with specialists in international investigations, litigation, and data privacy.",
          bullets: [
            "17 computer forensics laboratories",
            "Dozens of production centers on five continents",
            "Specialists in cross-border investigations and privacy",
          ],
        },
      ],
      stats: [
        { label: "Review cost reduction", value: "40", unit: "%", caption: "via ECA and analytics" },
        { label: "Reef Review savings", value: "30", unit: "%", caption: "vs. legacy review platforms" },
        { label: "Forensics laboratories", value: "17", caption: "worldwide" },
        { label: "Response time", value: "15", unit: "min", caption: "the 15-Minute Rule" },
      ],
      discover: {
        body: "Credibility:",
        bullets: [
          "2025 Chambers-ranked eDiscovery provider across five regions",
          "2024 Service Provider of the Year, Australia and New Zealand",
          "#1 end-to-end eDiscovery solution and #1 technology-assisted review",
          "#1 managed eDiscovery, litigation support, and document management",
        ],
      },
      cta: {
        label: "Experience the TransPerfect advantage",
        subhead: "Schedule your consultation today — legal@transperfect.com",
        url: "https://www.transperfectlegal.com",
      },
      heroMedia: hero(heroWhy.url, 40, 40),
    },
  },
];
