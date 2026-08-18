// TransPerfect Legal — recreated case study library.
//
// Source: the TransPerfect Legal case-study PDF set (US English editions).
// Copy was ingested from the originals and re-shaped into the live
// `CaseStudyContent` model; hero photography was pulled from each case-study
// folder, optimized, and re-hosted on the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for
// the signed-in user via createPrintAsset().

import type { CaseStudyContent } from "@/lib/print-assets.types";

import heros1254454795 from "@/assets/print-heroes/legal/legal-cs-s1254454795.jpg.asset.json";
import heros1794151417 from "@/assets/print-heroes/legal/legal-cs-s1794151417.jpg.asset.json";
import heros1896527446 from "@/assets/print-heroes/legal/legal-cs-s1896527446.jpg.asset.json";
import heros1936992919 from "@/assets/print-heroes/legal/legal-cs-s1936992919.jpg.asset.json";
import heros2079263023 from "@/assets/print-heroes/legal/legal-cs-s2079263023.jpg.asset.json";
import heros2089683652 from "@/assets/print-heroes/legal/legal-cs-s2089683652.jpg.asset.json";
import heros2089683652b from "@/assets/print-heroes/legal/legal-cs-s2089683652b.jpg.asset.json";
import heros2109008366 from "@/assets/print-heroes/legal/legal-cs-s2109008366.jpg.asset.json";
import heros2141020743 from "@/assets/print-heroes/legal/legal-cs-s2141020743.jpg.asset.json";
import heros2161895303 from "@/assets/print-heroes/legal/legal-cs-s2161895303.jpg.asset.json";
import heros2206794445 from "@/assets/print-heroes/legal/legal-cs-s2206794445.jpg.asset.json";
import heros2240028013 from "@/assets/print-heroes/legal/legal-cs-s2240028013.jpg.asset.json";
import heros2258652483 from "@/assets/print-heroes/legal/legal-cs-s2258652483.jpg.asset.json";
import heros2259155317 from "@/assets/print-heroes/legal/legal-cs-s2259155317.jpg.asset.json";
import heros2284126663 from "@/assets/print-heroes/legal/legal-cs-s2284126663.jpg.asset.json";
import heros2375103051 from "@/assets/print-heroes/legal/legal-cs-s2375103051.jpg.asset.json";
import heros2420928037 from "@/assets/print-heroes/legal/legal-cs-s2420928037.jpg.asset.json";
import heros2442735163 from "@/assets/print-heroes/legal/legal-cs-s2442735163.jpg.asset.json";
import heros2476618655 from "@/assets/print-heroes/legal/legal-cs-s2476618655.jpg.asset.json";
import heros2505197575 from "@/assets/print-heroes/legal/legal-cs-s2505197575.jpg.asset.json";
import heros2521949015 from "@/assets/print-heroes/legal/legal-cs-s2521949015.jpg.asset.json";
import heros2522030523 from "@/assets/print-heroes/legal/legal-cs-s2522030523.jpg.asset.json";
import heros2527743411 from "@/assets/print-heroes/legal/legal-cs-s2527743411.jpg.asset.json";
import heros2573753075 from "@/assets/print-heroes/legal/legal-cs-s2573753075.jpg.asset.json";
import heros2609377563 from "@/assets/print-heroes/legal/legal-cs-s2609377563.jpg.asset.json";
import heros2666716055 from "@/assets/print-heroes/legal/legal-cs-s2666716055.jpg.asset.json";
import heros669170719 from "@/assets/print-heroes/legal/legal-cs-s669170719.jpg.asset.json";

export const LEGAL_DIVISION_ID = "bm-tp-legal";

export type LegalCaseStudySeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  tags: string[];
  /** Practice area grouping used by the shelf filter. */
  practice: string;
  sourceFile: string;
  content: CaseStudyContent;
};

const FOOTER = { links: ["legal@transperfect.com", "www.transperfectlegal.com"] };
const CTA = {
  label: "Talk to TransPerfect Legal",
  subhead:
    "AI, analytics, and multi-language technology across eDiscovery, forensics, due diligence, privacy, and managed review.",
  buttonLabel: "Start a conversation",
  url: "https://www.transperfectlegal.com",
};

export const LEGAL_CASE_STUDIES: LegalCaseStudySeed[] = [
  {
    slug: "accelerated-doj-second-request",
    title: "Accelerated DOJ Second Request: Data Analytics & TAR",
    teaser: "Our client, an Am Law 10 firm, met a 60-day DOJ second request deadline with innovative data analytics and TAR.",
    tags: ["ediscovery", "doj", "tar", "analytics", "mergers"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_AcceleratedDOJSecondRequest_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Am Law 10 law firm for global entertainment company",
      industry: "Legal / Entertainment",
      audience: "Legal professionals facing tight eDiscovery deadlines and large data volumes.",
      summary: "TransPerfect Legal partnered with an Am Law 10 firm to manage a 30+ TB DOJ second request, successfully meeting a 60-day deadline using advanced data analytics and TAR protocols.",
      challenge: {
        heading: "The Challenge",
        body: "More than 30 terabytes of data were collected for a DOJ second request, with only 60 days to complete collection, processing, review, and production. A cloud-based backup system also generated an unusually high volume of duplicative files.",
      },
      solution: {
        heading: "Our approach",
        body: "We designed a customized workflow using forensic deduplication prior to ingestion, reducing the dataset to under 650 GB. Our Pre-Review Analytics® platform further refined the data to 410 GB, and we then negotiated and implemented TAR protocols with DOJ approval, coding 85% of documents using logistic regression.",
      },
      result: {
        heading: "The result",
        body: "The project achieved a 98%+ reduction in data volume, from 30+ TB to 410 GB, and successfully identified 222,000 documents for production. The 60-day second request deadline was met with full DOJ approval, delivering significant savings through defensible filtering and automation.",
      },
      stats: [
        { label: "Data volume reduction", value: "98", unit: "%", caption: "from 30+ TB to 410 GB" },
        { label: "Documents coded using TAR", value: "85", unit: "%", caption: "of total population" },
        { label: "Documents identified", value: "222,000", caption: "for production" },
        { label: "Deadline met", value: "60 DAYS", caption: "DOJ second request" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Forensic deduplication prior to ingestion",
          "Pre-Review Analytics® for data refinement",
          "Negotiated and implemented TAR protocols",
          "Met 60-day DOJ second request deadline",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2284126663.url, aspect: "fill", heightPct: 46, focalY: 42 },
    },
  },
  {
    slug: "accelerating-document-review-genai",
    title: "Accelerating Document Review Using Generative AI",
    teaser: "A US financial institution leverages generative AI for rapid, cost-effective document review in complex litigation.",
    tags: ["generative ai", "ediscovery", "document review", "litigation", "legal tech"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_AcceleratingDocReviewGenerativeAI_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "US financial institution",
      industry: "Financial Services",
      audience: "Legal professionals facing complex, high-volume eDiscovery",
      summary: "TransPerfect Legal deployed generative AI to accelerate document review for a US financial institution, addressing an urgent disclosure request with high accuracy and significant cost savings.",
      challenge: {
        heading: "The challenges",
        body: "The client faced an unbudgeted additional disclosure of over 18,000 documents with a short timeline and budget. The dispute also involved multiple complex legal and factual issues, difficult for traditional CAL workflows.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal consultants used prompt engineering, converting existing review protocols into detailed prompts for relevancy, privilege, and 12 distinct issue codes. These prompts were tested and refined over five rounds, achieving high recall and precision rates. The solution delivered each document with a summary and text-grounded explanation for every coding decision.",
      },
      result: {
        heading: "The result",
        body: "The final review of over 18,000 documents was completed in less than one day, costing only one-third of the estimated expense for contract lawyers. The GenAI review achieved a 93.9% precision rate in responsiveness coding decisions, validated through statistical sampling and elusion testing by TransPerfect Legal consultants.",
      },
      stats: [
        { label: "Reduction in review costs", value: "66", unit: "%", caption: "compared to traditional methods" },
        { label: "Precision rate", value: "93.9", unit: "%", caption: "in GenAI responsiveness coding" },
        { label: "Documents reviewed", value: "18,000+", caption: "in less than one day" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Generative AI-driven document review",
          "Prompt engineering and iterative refinement",
          "Statistical sampling and validation",
          "Complex litigation support",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2375103051.url, aspect: "fill", heightPct: 46, focalY: 46 },
    },
  },
  {
    slug: "merger-control-ai-translation",
    title: "Accelerating a Billion-Dollar Merger With Custom AI Translation",
    teaser: "Our custom AI translation workflow helped two Asia-headquartered companies meet tight DOJ and EC merger control deadlines.",
    tags: ["e-discovery", "ai translation", "mergers", "cjk languages", "regulatory compliance"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_EuropeanMergerControlGlobalExpertise,LocalPresence_CaseStudy2_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Two Asia-headquartered companies",
      industry: "Mergers and Acquisitions",
      audience: "Legal professionals managing multi-jurisdictional mergers and e-discovery",
      summary: "TransPerfect Legal supported a billion-dollar acquisition, successfully navigating Second Request and Phase 2 investigations by the DOJ and EC with custom AI translation solutions.",
      challenge: {
        heading: "The Challenge",
        body: "A billion-dollar merger between two Asia-headquartered companies triggered a DOJ Second Request and an EC Phase 2 investigation. Over one million responsive CJK documents (26 billion words) required translation, but the DOJ initially rejected machine translation due to quality concerns, while human translation was cost-prohibitive and too slow for tight deadlines.",
      },
      solution: {
        heading: "Our approach",
        body: "We developed a custom MT-based workflow in close coordination with DOJ attorneys, leveraging proprietary, industry- and language-specific MT models. Expert linguists and AI engineers refined translation quality using industry-relevant training data, ensuring regulatory quality standards were met without relying on time- and cost-prohibitive human translation.",
      },
      result: {
        heading: "The result",
        body: "The custom AI translation solution enabled the client to achieve satisfactory DOJ compliance deadline completion and fulfill EC requirements within just two weeks. This approach saved millions in potential translation costs while maintaining the required quality for regulatory approval.",
      },
      stats: [
        { label: "Saved in translation costs", value: "$MILLIONS", caption: "potential translation costs" },
        { label: "EC requirements fulfillment", value: "TWO-WEEK", caption: "EC requirements fulfillment" },
        { label: "DOJ compliance deadline", value: "SATISFACTORY", caption: "DOJ compliance deadline completion" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Supported a billion-dollar acquisition",
          "Managed DOJ and EC regulatory investigations",
          "Translated 26 billion CJK words",
          "Deployed custom AI translation workflow",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2527743411.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "advanced-analytics-mass-efficiency",
    title: "Advanced Analytics Drives Massive Efficiency in Product Defect Class Action",
    teaser: "By leveraging advanced analytics, TransPerfect Legal helped a global manufacturer significantly reduce eDiscovery costs and review time in a product defect class action.",
    tags: ["ediscovery", "analytics", "cost-reduction", "class-action", "product-liability"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_AdvancedAnalyticsDrivesMassiveEfficiencyinProductDefectClassAction_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global manufacturer",
      industry: "Manufacturing",
      audience: "Legal professionals, corporate counsel, eDiscovery managers",
      summary: "TransPerfect Legal partnered with a global manufacturer to streamline eDiscovery in a high-stakes class action, dramatically reducing the document review volume through advanced analytics.",
      challenge: {
        heading: "The challenges",
        body: "The client faced a product defect class action with an initial 8.4 million documents. Even after standard culling, over 1.6 million documents remained, projecting review costs exceeding $1.1 million and requiring 138 business days.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal deployed Digital Reef’s Pre-Review Analytics, applying intelligent pattern recognition and relevance modeling. This created a second layer of culling, further reducing the document set and maintaining defensibility.",
      },
      result: {
        heading: "The Results",
        body: "The client saved over $1.1 million in review costs and eliminated 27,747 hours from the review cycle. This allowed the legal team to accelerate discovery and focus on the broader litigation strategy with a significantly smaller, defensible document set.",
      },
      stats: [
        { label: "Saved in review costs", value: "$1,165,374", caption: "through analytics-driven review optimization" },
        { label: "Hours eliminated", value: "27,747", caption: "from review cycle, freeing nearly 140 business days" },
        { label: "Review volume reduced by", value: "96.4", unit: "%", caption: "while maintaining defensible litigation strategy" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Initial dataset of 8.4 million documents",
          "Standard culling reduced volume by 80.5%",
          "Advanced analytics further reduced volume by 1.3 million documents",
          "Achieved 96.4% overall reduction in review volume",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros669170719.url, aspect: "fill", heightPct: 46, focalY: 54 },
    },
  },
  {
    slug: "behind-the-firewall",
    title: "Behind the Firewall: Navigating South Korean Data Privacy",
    teaser: "An SEC investigation required a global financial institution to perform eDiscovery on-site due to strict South Korean data privacy laws.",
    tags: ["data privacy", "on-site ediscovery", "financial services", "cross-border"],
    practice: "Investigations & compliance",
    sourceFile: "TPLegal_BehindtheFirewall_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "global financial institution",
      industry: "financial services",
      audience: "legal professionals handling cross-border investigations",
      summary: "TransPerfect Legal provided on-site eDiscovery services in Seoul, South Korea, enabling a global financial institution to comply with local data privacy laws and SEC requirements.",
      challenge: {
        heading: "The challenges",
        body: "Strict South Korean privacy and banking laws, coupled with the client's internal security policies, prevented data from leaving their network. A large dataset from multiple sources required a tight turnaround for SEC compliance.",
      },
      solution: {
        heading: "Our approach",
        body: "A senior forensics specialist deployed TransPerfect Legal's proprietary mobile eDiscovery server, Digital Reef, on-site in Seoul. This allowed for collection, processing, and filtering of over two million documents without data leaving the client's network. Reviewers accessed data directly through laptops connected to the Digital Reef server, creating a secure, closed-loop environment for first and second-level review.",
      },
      result: {
        heading: "The result",
        body: "TransPerfect Legal ingested 2.3 million documents on-site, achieving a 99.47% cull rate to reduce the review set to just over 12,000 documents. This enabled the client to produce 3,055 responsive documents to the SEC. The entire review was completed on time, behind the firewall, with zero impact to the client's internal network infrastructure.",
      },
      stats: [
        { label: "Documents ingested", value: "2.3 million", caption: "on site" },
        { label: "Cull rate", value: "99.47", unit: "%", caption: "reducing the review set" },
        { label: "Documents produced", value: "3,055", caption: "to the SEC" },
        { label: "Impact to internal network", value: "zero", caption: "during the project" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "On-site collection and processing of 1 TB of data",
          "Strict compliance with South Korean data privacy laws",
          "Secure, closed-loop review environment behind the firewall",
          "Timely completion for SEC compliance",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2420928037.url, aspect: "fill", heightPct: 46, focalY: 58 },
    },
  },
  {
    slug: "coordinated-ediscovery-private-equity",
    title: "Coordinated eDiscovery for a Global Private Equity Firm",
    teaser: "A global private equity firm consolidated eDiscovery providers to achieve significant cost savings and streamline complex litigation workflows.",
    tags: ["ediscovery", "private equity", "cost savings", "litigation management"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_UnlockingScaleCoordinatedeDiscoveryforaGlobalPrivateEquityFirm_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global private equity firm",
      industry: "Financial Services",
      audience: "Legal professionals, eDiscovery managers, private equity firms",
      summary: "This case study details how a major global private equity firm centralized its eDiscovery operations, moving from a fragmented approach to a single, coordinated solution. The firm achieved substantial cost reductions and operational efficiencies across its fund and numerous portfolio companies.",
      challenge: {
        heading: "The challenges",
        body: "Dozens of outside law firms used different eDiscovery providers, leading to inconsistent workflows, redundant data collections, and missed opportunities for economies of scale, driving up costs and inefficiencies.",
      },
      solution: {
        heading: "Our approach",
        body: "The firm engaged TransPerfect Legal as its sole eDiscovery partner. Leveraging a consolidated approach, both the fund and its portfolio companies pooled their collective litigation activity to unlock preferred pricing and annual spend discounts. This was powered by our Private Equity Litigation Solutions (PELS) program.",
      },
      result: {
        heading: "The result",
        body: "The firm achieved a 25% reduction in eDiscovery costs across 19 separate matters. Streamlined workflows eliminated redundant collections, and greater visibility was gained over enterprise-wide litigation spend, maximizing value at scale.",
      },
      stats: [
        { label: "Cost reduction", value: "25", unit: "%", caption: "across 19 matters" },
        { label: "Saved vs. ad-hoc approach", value: "MILLIONS", caption: "compared to an ad-hoc vendor approach" },
        { label: "Workflows", value: "STREAMLINED", caption: "eliminating redundant collections" },
        { label: "Visibility & control", value: "GREATER", caption: "over enterprise-wide litigation spend" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Sole eDiscovery partner",
          "Consolidated approach across entities",
          "Private Equity Litigation Solutions (PELS) program",
          "Achieved preferred pricing and discounts",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2573753075.url, aspect: "fill", heightPct: 46, focalY: 42 },
    },
  },
  {
    slug: "cross-border-clarity",
    title: "Cross-Border Clarity: Multilingual eDiscovery for Dual",
    teaser: "Navigating simultaneous regulatory reviews for an acquisition across the US and EU requires precise multilingual eDiscovery.",
    tags: ["multilingual ediscovery", "antitrust", "regulatory compliance", "cross-border"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_Cross-BorderClarity_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "US-headquartered company",
      industry: "Mergers & Acquisitions",
      audience: "Legal professionals facing international regulatory scrutiny.",
      summary: "TransPerfect Legal provided multilingual eDiscovery and managed review for a US company facing dual regulatory reviews from the DOJ and European Commission for a cross-border acquisition.",
      challenge: {
        heading: "The challenge",
        body: "A US company acquiring a Swiss manufacturer faced simultaneous Second Request from the US Department of Justice and an RFI from the European Commission, necessitating accurate multilingual review of data in French and German under tight timelines.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal's Antitrust Practice Group deployed a proprietary multi-language workflow for eDiscovery and managed review. This included automatic language identification, linguistic OCR for French and German, and expert-assisted search term refinement, all coordinated under centralized oversight to ensure accuracy and compliance.",
      },
      result: {
        heading: "The result",
        body: "The project achieved 20% cost savings through optimized execution and delivered accurate, linguistically validated multilingual review. This streamlined coordination across jurisdictions ensured full regulatory compliance for both US and EU proceedings.",
      },
      stats: [
        { label: "Cost savings", value: "20", unit: "%", caption: "through optimized project execution" },
        { label: "Multilingual review", value: "ACCURATE", caption: "linguistically validated" },
        { label: "Coordination", value: "STREAMLINED", caption: "across jurisdictions" },
        { label: "Regulatory compliance", value: "FULL" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Simultaneous DOJ Second Request and EU RFI",
          "Multilingual data in French and German",
          "Proprietary multi-language workflow deployed",
          "Centralized oversight for coordination",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros1794151417.url, aspect: "fill", heightPct: 46, focalY: 46 },
    },
  },
  {
    slug: "automotive-class-action-cross-border",
    title: "Cross-Border Support for Automotive Class Action",
    teaser: "TransPerfect Legal provided multi-jurisdictional eDiscovery support for a complex automotive class action lawsuit.",
    tags: ["ediscovery", "multilingual", "automotive", "class-action"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_Cross-BorderSupportforAutomotiveClassAction_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Australian car dealerships",
      industry: "Automotive & Franchising",
      audience: "Legal professionals involved in cross-border litigation",
      summary: "TransPerfect Legal supported a group of Australian car dealerships in a class action against a German automotive manufacturer, navigating complex cross-border data challenges and tight deadlines.",
      challenge: {
        heading: "The challenges",
        body: "The case involved over 1 TB of data from Germany and Australia, a strict 8-month deadline for submission, and stringent confidentiality and privacy requirements across jurisdictions, with 40% of the data in German.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal’s team created a defensible collection process, ensuring GDPR compliance with EU servers. They used ECA to cull 1 TB+ of data to 76 GB and staffed bilingual German reviewers. AI-powered translation and redaction tools expedited the process, ensuring timely and secure data transfer and review.",
      },
      result: {
        heading: "The Results",
        body: "The project met the tight 8-month deadline, saving the client over $50,000 in technology and hosting fees. Additionally, 2,413 hours were saved in human review due to efficient data culling and multilingual review strategies.",
      },
      stats: [
        { label: "Saved in technology and hosting fees", value: "$50K+", caption: "Project cost savings" },
        { label: "Hours saved in human review", value: "2,413", caption: "Efficiency gains" },
        { label: "Deadline met", value: "8-MONTH", caption: "Project completion" },
        { label: "Data reduction", value: "1 TB+ to 76 GB", caption: "Initial data culled" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Cross-border data collection (1 TB+)",
          "Multilingual review (German)",
          "EU data hosting & GDPR compliance",
          "Tight 8-month deadline",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros1254454795.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "defense-industry-99-percent-data-reduction",
    title: "Defense Industry Manufacturer Achieves 99% Data Reduction",
    teaser: "A defense industry manufacturer achieved 99% data reduction in a classified environment to meet a critical production deadline.",
    tags: ["e-discovery", "data reduction", "classified data", "digital reef"],
    practice: "eDiscovery technology",
    sourceFile: "TPLegal_DefenseIndustryManufacturerAchieves99%DataReductioninClassifiedEnvironment_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Major defense industry manufacturer (via Am Law 50 firm)",
      industry: "Defense",
      audience: "Legal professionals, e-discovery specialists, IT security managers",
      summary: "TransPerfect Legal helped a defense industry manufacturer achieve over 99% data reduction for a sensitive dataset in a classified environment, meeting a critical 10-day deadline.",
      challenge: {
        heading: "The challenges",
        body: "The client needed to process 3 TB of sensitive data, including uncommon file types like Lotus Notes, within a tight 10-day turnaround to avoid court sanctions. Strict ECA security protocols required an on-site deployment of the solution.",
      },
      solution: {
        heading: "Our approach",
        body: "Our team established a remote Digital Reef data center directly within the client’s classified facility, processing 3 TB of data in under 14 hours. Digital Reef quickly identified an ambiguous term responsible for over 90% of the dataset, enabling significant data reduction before review. Documents and load files were then delivered to the client’s internal Concordance review environment.",
      },
      result: {
        heading: "The result",
        body: "TransPerfect Legal processed 2.8 million documents and identified 26,500 documents relevant for litigation. This process achieved over 99% data reduction through targeted filtering, allowing the client to meet their production deadline and avoid costly third-party hosting.",
      },
      stats: [
        { label: "Documents processed", value: "2.8M", caption: "Total documents processed" },
        { label: "Data reduction achieved", value: "99", unit: "%", caption: "Through targeted filtering" },
        { label: "Processing time", value: "14 hours", caption: "For 3 TB of data" },
        { label: "Relevant documents", value: "26,500", caption: "Identified for litigation" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "On-site deployment in a classified facility",
          "Fast processing of 3 TB of data",
          "Significant data reduction using Digital Reef",
          "Delivery to internal review environment",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2476618655.url, aspect: "fill", heightPct: 46, focalY: 54 },
    },
  },
  {
    slug: "on-premise-digital-reef-data-protection",
    title: "Deploying On-Premise Digital Reef to Protect Confidential Data",
    teaser: "An Am Law 10 firm leveraged on-premise eDiscovery to protect sensitive client data across multiple, complex custodian locations.",
    tags: ["ediscovery", "on-premise", "data privacy", "legal tech"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_DeployingOn-PremiseDigitalReeftoProtectConfidentialData_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Am Law 10 law firm",
      industry: "Legal services",
      audience: "Legal professionals, eDiscovery teams, IT security teams",
      summary: "TransPerfect Legal deployed a bespoke, on-premise eDiscovery solution for an Am Law 10 firm facing shareholder litigation, protecting highly confidential data across multiple custodian locations with strict deadlines.",
      challenge: {
        heading: "The challenge",
        body: "Outside board members held highly sensitive information that needed to be identified and excluded on-site without leaving their offices. This required strict turnaround times for processing, filtering, and review in multiple cities within 48 hours, with each site demanding customized workflows for distinct data sources.",
      },
      solution: {
        heading: "Our approach",
        body: "After initial forensic collections, TransPerfect Legal addressed privacy concerns by deploying our proprietary Digital Reef on-premise eDiscovery solution. Expert technicians arrived at the first custodian’s location within 48 hours with a mobile eDiscovery server, implementing a customized workflow. The process was replicated for a second custodian the very next day, ensuring rapid response and tailored solutions for complex data types.",
      },
      result: {
        heading: "The result",
        body: "TransPerfect Legal successfully delivered a complex, high-security, on-premise eDiscovery solution across two cities on short notice. This met aggressive deadlines while ensuring privacy, streamlining workflows, maintaining forensic defensibility, and controlling costs for the client. The sensitive data was secured and ultimately wiped from collection media and review environments.",
      },
      stats: [
        { label: "Deployment Location", value: "On-premise", caption: "Complex, high-security solution" },
        { label: "Cities involved", value: "Two", caption: "eDiscovery solution deployed" },
        { label: "Time to deploy", value: "Short notice", caption: "Meeting aggressive deadlines" },
        { label: "Data Confidentiality", value: "Ensured", caption: "Forensically wiped collection media" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "On-premise Digital Reef deployment",
          "Forensic collection of mobile devices and webmail",
          "Customized workflows for distinct data sources",
          "Secure on-site review environment",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2240028013.url, aspect: "fill", heightPct: 46, focalY: 58 },
    },
  },
  {
    slug: "end-to-end-digital-forensics",
    title: "Digital Forensics for Stolen Trade Secrets",
    teaser: "TransPerfect Legal provided end-to-end digital forensics, from investigation to remediation, for a federal trade secret litigation.",
    tags: ["digital forensics", "trade secrets", "e-discovery", "litigation support"],
    practice: "Forensics & investigations",
    sourceFile: "TPLegal_End-to-EndDigitalForensics_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "international manufacturer",
      industry: "manufacturing",
      audience: "Legal professionals, corporate counsel, eDiscovery specialists",
      summary: "Our team supported a federal litigation for an international manufacturer against a former employee accused of sharing trade secrets. We delivered comprehensive forensic services from initial assessment through to data remediation.",
      challenge: {
        heading: "The challenges",
        body: "The client needed to conduct a pre-litigation forensic assessment, preserve highly dynamic data across multiple sources, and accurately forecast project scope. A key challenge was executing comprehensive remediation of misappropriated data from the competitor’s IT infrastructure.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal's global digital forensics team led the strategic and technical aspects. We conducted a forensic assessment with data mapping, preserved diverse data sources, and provided detailed project milestones. Our team delivered forensic analysis, expert reports, affidavits, and testimony, successfully rebutting opposing counsel’s claims.",
      },
      result: {
        heading: "The results",
        body: "Early forensic planning ensured defensible data preservation and strengthened the client's legal position. A settlement secured full remediation of misappropriated trade secrets. Our team designed and executed a comprehensive, verifiable remediation protocol with minimal business disruption, ensuring complete intellectual property containment.",
      },
      stats: [
        { label: "Defensible Preservation", value: "ESTABLISHED", caption: "Early forensic planning" },
        { label: "Legal Position", value: "STRENGTHENED", caption: "Expert support" },
        { label: "Remediation of Trade Secrets", value: "SECURED", caption: "Settlement" },
        { label: "Operational Impact", value: "MINIMAL", caption: "Remediation completed quickly" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Early forensic planning established defensible preservation",
          "Expert support strengthened the client’s legal position",
          "Settlement secured full remediation of misappropriated trade secrets",
          "Remediation completed quickly with minimal operational impact",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2521949015.url, aspect: "fill", heightPct: 46, focalY: 42 },
    },
  },
  {
    slug: "eu-whistleblower-bribery-investigation",
    title: "EU Whistleblower Directive: Cost Savings in Bribery",
    teaser: "An advanced analytics approach cut review costs and time in a complex bribery investigation for a medical device company.",
    tags: ["bribery investigation", "e-discovery", "cost savings", "whistleblower"],
    practice: "Investigations & compliance",
    sourceFile: "TPLegal_EUWhistleblowerDirective_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "global medical device company",
      industry: "medical devices",
      audience: "Legal professionals, compliance officers, eDiscovery managers",
      summary: "A global medical device company needed to investigate a bribery allegation in its Ukrainian subsidiary. TransPerfect Legal used advanced analytics and language expertise to conduct a thorough and cost-effective review.",
      challenge: {
        heading: "The challenge",
        body: "The client faced an investigation into bribery allegations with all relevant documents in Ukrainian, a language no team member spoke. With a tight budget of €6,000, manually reviewing 70,000 documents was impractical and costly.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal recommended an analytics-driven approach. We conducted stakeholder interviews, then deployed Pre-Review Analytics® within Digital Reef to map findings to data, develop Ukrainian search terms, and sharply focus the review. This included reducing the document set and using a Ukrainian-speaking attorney with AI-powered conceptual review tools.",
      },
      result: {
        heading: "The result",
        body: "The investigation was completed within 33 hours and delivered on time, staying within the €6,000 budget. TransPerfect Legal's approach yielded an estimated €50,000 in cost savings by reducing the final review volume by 96%, ensuring an efficient and successful resolution for the client.",
      },
      stats: [
        { label: "Review completed in", value: "33 hours", caption: "Time to complete the review" },
        { label: "Cost savings", value: "50,000 €", caption: "Estimated savings due to efficient process" },
        { label: "Review volume reduced by", value: "96", unit: "%", caption: "Reduction in documents needing review" },
        { label: "Budget, delivered on time", value: "6,000 €", caption: "Project budget maintained" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "In-depth stakeholder interviews",
          "Pre-Review Analytics® with Digital Reef",
          "Ukrainian-speaking contract attorney",
          "AI-powered conceptual review",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2258652483.url, aspect: "fill", heightPct: 46, focalY: 46 },
    },
  },
  {
    slug: "efficiency-at-scale",
    title: "Efficiency at Scale: Reef Review Delivers Big Results",
    teaser: "Reef Review provided a national law firm with a cost-effective and feature-rich eDiscovery platform for matters of all sizes.",
    tags: ["e-discovery", "managed-review", "cost-savings", "legal-tech"],
    practice: "eDiscovery technology",
    sourceFile: "TPLegal_EfficiencyatScale_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "National US law firm",
      industry: "Legal services",
      audience: "Law firms, legal professionals, eDiscovery managers",
      summary: "TransPerfect Legal introduced its Reef Review platform to a national law firm, addressing their need for an advanced yet affordable eDiscovery solution. This allowed the firm to efficiently manage diverse cases, from small to complex, without compromising functionality or support.",
      challenge: {
        heading: "The challenges",
        body: "The firm struggled with existing eDiscovery platforms that were either too costly for many clients or lacked advanced features and expert support for complex cases. They needed a solution that balanced affordability with comprehensive functionality across all matter sizes.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal introduced the firm to Reef Review, a streamlined and intuitive eDiscovery platform designed for speed and cost-efficiency without compromising functionality. Following a successful trial, the firm subscribed, migrating nearly 100 projects to leverage its faster processing, flexible search capabilities, and clean user interface, backed by TransPerfect Legal's award-winning global service team.",
      },
      result: {
        heading: "The results",
        body: "The firm achieved significant technology cost savings and an impressive cull rate. Reef Review provided the power and support needed to manage review and production efficiently across matters of all sizes, ensuring on-time delivery for all projects and enhancing overall operational effectiveness.",
      },
      stats: [
        { label: "Technology cost savings", value: "$50,000", caption: "achieved with Reef Review" },
        { label: "Cull rate", value: "90", unit: "%", caption: "achieved through optimized processing" },
        { label: "Delivery", value: "On-time", caption: "across all projects" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Addressed cost-efficiency in eDiscovery",
          "Introduced Reef Review platform",
          "Migrated nearly 100 projects",
          "Provided award-winning global service",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2609377563.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "efficient-data-handling-transit",
    title: "Efficient Data Handling for Transit Authority Land",
    teaser: "A rapid-transit rail system faced a tight deadline to produce documents for land acquisition, requiring efficient data handling.",
    tags: ["ediscovery", "data processing", "analytics", "rail transport"],
    practice: "eDiscovery technology",
    sourceFile: "TPLegal_EfficientDataHandlingforTransitAuthorityLandAcquisition_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "rapid-transit rail system",
      industry: "government and public sector",
      audience: "Legal professionals managing eDiscovery for large-scale land acquisition or infrastructure projects.",
      summary: "TransPerfect Legal assisted a transit authority in responding to a document request for land acquisition, handling over a terabyte of data under a tight deadline. Leveraging advanced analytics, they significantly culled the dataset and enabled the client to meet their production requirements efficiently.",
      challenge: {
        heading: "The challenges",
        body: "The client faced a request related to land acquisition for a new transit line, requiring them to manage over 1,300 GB of data from multiple sources. This project had a tight two-month deadline, which spanned the Christmas holiday period.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal’s Digital Forensics team conducted a scoping call to identify relevant data repositories. A total of 1,301 GB of data was collected from various Microsoft sources and fully ingested within 48 hours. Advanced analytics and AI tools were then used to narrow down the review set significantly.",
      },
      result: {
        heading: "The Results",
        body: "The client achieved a 90% cull rate, reducing the data exported for review to 130 GB, far exceeding the industry average. This efficiency led to substantial cost savings in technology fees and eliminated thousands of hours of review time. The critical deadline was successfully met despite the holiday timeframe.",
      },
      stats: [
        { label: "Data collected", value: "1,301 GB", caption: "from Microsoft 365, Teams, and OneDrive" },
        { label: "Cull rate achieved", value: "90", unit: "%", caption: "significantly exceeding industry average" },
        { label: "Review time eliminated", value: "4,900 Hours", caption: "due to advanced analytics" },
        { label: "Technology fees saved", value: "40 K", caption: "through advanced analytics" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "1,301 GB of data collected and ingested",
          "90% cull rate achieved, exporting 130 GB for review",
          "$40K saved in technology fees",
          "4,900 hours of review time eliminated",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2259155317.url, aspect: "fill", heightPct: 46, focalY: 54 },
    },
  },
  {
    slug: "european-merger-control",
    title: "European Merger Control: Global Expertise, Local Presence",
    teaser: "Seamlessly navigate complex European merger control investigations with expert e-discovery and managed review.",
    tags: ["merger control", "e-discovery", "managed review", "compliance"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_EuropeanMergerControlGlobalExpertise,LocalPresence_CaseStudy1_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global medical company",
      industry: "Life sciences",
      audience: "Legal professionals facing international regulatory scrutiny",
      summary: "TransPerfect Legal supported a global medical company acquiring a European-headquartered target through in-depth merger control investigations by the CMA and ACCC, ensuring timely disclosure.",
      challenge: {
        heading: "The Challenge",
        body: "The UK CMA and Australian ACCC launched in-depth investigations into a proposed merger, issuing requests for information (RFIs) with aggressive timelines, demanding review and disclosure of a large dataset within two weeks or less.",
      },
      solution: {
        heading: "Our Approach",
        body: "TransPerfect Legal collected over 2 TB of data, processing it within 24 hours. We staffed the first-level review with experienced lawyers, optimized the dataset through expert search term consulting and custom deduplication, and hosted documents in Relativity. We partnered with outside counsel for multi-level QC and directly with regulators for handling sensitive documents.",
      },
      result: {
        heading: "The Result",
        body: "TransPerfect Legal achieved over £300K in cost savings through reduced review volume, a 99% document reduction minimizing review burden, and ensured on-time CMA and ACCC disclosure. This led to regulatory approval of the technical report and overall approach.",
      },
      stats: [
        { label: "Cost savings", value: "300000 £", caption: "Through reduced review volume" },
        { label: "Document reduction", value: "99", unit: "%", caption: "Minimizing review burden" },
        { label: "Data processed", value: "2 TB", caption: "Collected from international servers" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "In-depth merger control investigations",
          "Aggressive RFI timelines met",
          "Data collection and processing",
          "Managed review and QC",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2109008366.url, aspect: "fill", heightPct: 46, focalY: 58 },
    },
  },
  {
    slug: "ec-dawn-raid-defense",
    title: "Fast Response, Full Compliance: EC Dawn Raid Defense",
    teaser: "Seamlessly supporting a boutique law firm through a fast-moving EC dawn raid investigation with end-to-end forensic and review solutions.",
    tags: ["antitrust", "dawn raid", "forensics", "multilingual review", "eDiscovery"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_FastResponseFullCompliance_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Boutique law firm representing a commodities cartel member",
      industry: "Legal services",
      audience: "Legal professionals, corporate legal departments",
      summary: "TransPerfect Legal partnered with a boutique law firm to provide urgent support during an unannounced EC dawn raid, ensuring full compliance and facilitating a leniency application.",
      challenge: {
        heading: "The challenge",
        body: "The client needed to respond quickly to an unannounced EC dawn raid, manage a large volume of data, support post-raid interviews, preserve digital evidence, and meet stringent deadlines for a leniency application while coordinating multilingual review.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal deployed forensic experts onsite within 48 hours to capture forensic images and support interviews. Data was processed within 24 hours using Digital Reef, and a bespoke analytics workflow narrowed the review universe. Multi-language and AI-powered workflows enabled native-language review, culminating in a 50-page technical report for the EC.",
      },
      result: {
        heading: "The result",
        body: "The client successfully navigated an unprecedented EC investigation with rapid response times and comprehensive data management. The coordinated multilingual review and custom analytics solution facilitated efficient compliance, supporting the client's leniency application with critical evidence and timely reporting.",
      },
      stats: [
        { label: "Turnaround for data processing", value: "24 HOUR", caption: "for data processing and review" },
        { label: "Multilingual review completed", value: "AI-assisted", caption: "with AI-assisted workflows" },
        { label: "Custom analytics solution", value: "reduced", caption: "review universe" },
        { label: "Technical report to EC", value: "50 page", caption: "for leniency application" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "24-HOUR turnaround for data processing and review",
          "MULTILINGUAL review completed with AI-assisted workflows",
          "CUSTOM analytics solution reduced the review universe",
          "Submission of a 50-page technical report to the EC",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2089683652.url, aspect: "fill", heightPct: 46, focalY: 42 },
    },
  },
  {
    slug: "from-risk-to-readiness",
    title: "From Risk to Readiness: Proactive Data Remediation",
    teaser: "This case study details a pharmaceutical company's journey to organize, remediate, and protect its vast stores of corporate data.",
    tags: ["data governance", "remediation", "risk management", "pharmaceutical", "information management"],
    practice: "Forensics & investigations",
    sourceFile: "TPLegal_FromRisktoReadiness_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "US subsidiary of a large pharmaceutical manufacturer",
      industry: "Pharmaceutical",
      audience: "Legal and IT professionals, data governance specialists",
      summary: "TransPerfect Legal helped a major pharmaceutical company implement a comprehensive data remediation program to reduce risk and protect trade secrets. The initiative aimed to organize valuable data while defensibly disposing of redundant or irrelevant content.",
      challenge: {
        heading: "The Challenge",
        body: "Our client's vast stores of corporate, research, and clinical data were disorganized, unmanaged, and posed serious operational, legal, and security risks. The team lacked a clear strategy for taking proactive control of its data landscape.",
      },
      solution: {
        heading: "Our Approach",
        body: "We designed and implemented a comprehensive data remediation program. Consultants mapped data creation and storage, developing a data map and updated retention schedule. A proprietary information governance tool then scanned, indexed, and analyzed the primary data repository to identify valuable content.",
      },
      result: {
        heading: "The Result",
        body: "The program led to a significant reduction in the client's total data footprint by up to 75%. This improved organization of key data eliminated non-essential files, reducing risk exposure and costs, and strengthening legal/regulatory alignment through updated retention policies.",
      },
      stats: [
        { label: "Reduction of total data footprint", value: "75", unit: "%", caption: "Defensible reduction achieved" },
        { label: "Data identified as duplicates", value: "50", unit: "%", caption: "From primary data repository" },
        { label: "Data identified as digital debris", value: "25", unit: "%", caption: "No legal, regulatory, or business value" },
        { label: "Meaningful data retained", value: "25", unit: "%", caption: "Valuable for business or compliance" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Data mapping & retention schedule",
          "Information governance tool deployment",
          "Data analysis & remediation",
          "Reorganized data structure",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2442735163.url, aspect: "fill", heightPct: 46, focalY: 46 },
    },
  },
  {
    slug: "global-data-collection-corruption-investigation",
    title: "Global Data Collection for Corruption Investigation",
    teaser: "TransPerfect Legal provided on-site forensic data collection and processing for a global corruption investigation, ensuring strict security and compliance.",
    tags: ["forensics", "ediscovery", "data collection", "compliance"],
    practice: "Forensics & investigations",
    sourceFile: "TPLegal_GlobalDataCollectionwithOn-SiteProcessingforCorruptionInvestigation_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Fortune 500 manufacturer",
      industry: "manufacturing",
      audience: "Legal professionals, eDiscovery managers, corporate counsel",
      summary: "TransPerfect Legal assisted a Fortune 500 manufacturer facing a global corruption investigation by deploying on-site data collection and processing across multiple international locations. The solution ensured data security and compliance with strict internal protocols.",
      challenge: {
        heading: "The challenge",
        body: "The client faced a global corruption investigation with responsive data spread across facilities in Taiwan, Australia, Japan, and the US. Strict security protocols prevented data removal from client premises, requiring a rapid, on-site solution for collection, processing, and review.",
      },
      solution: {
        heading: "Our approach",
        body: "A team of forensic experts collected data from global offices and deployed our proprietary Digital Reef eDiscovery platform on-site at the client's Taiwan data center. This enabled full on-site processing, analytics, and review, ensuring all documents remained behind the client's firewall. The team processed 1 TB of data from 15 custodians in just seven hours, allowing outside counsel to reduce the dataset by 98% within two weeks.",
      },
      result: {
        heading: "The result",
        body: "The client achieved 100% compliance with internal and regulatory protocols by keeping all data on-site using the Digital Reef platform. This approach resulted in a 98% data reduction and saved $500,000 in attorney review costs, all while maintaining the highest level of security and data retention.",
      },
      stats: [
        { label: "Attorney review costs saved", value: "$500,000", caption: "Saved in attorney review costs" },
        { label: "Data reduction", value: "98", unit: "%", caption: "Reduction of the dataset" },
        { label: "Data retention", value: "98", unit: "%", caption: "Data retention on client premises" },
        { label: "Compliance", value: "100", unit: "%", caption: "Compliance with protocols" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "On-site Digital Reef deployment",
          "Global forensic support",
          "Strict security and compliance",
          "Significant cost savings",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros1936992919.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "healthcare-data-repository",
    title: "Healthcare Client Saves Over $400,000 With Multi-Matter Repository",
    teaser: "A multi-billion-dollar healthcare provider saved over $400,000 by centralizing their legal data in a multi-matter repository.",
    tags: ["ediscovery", "datamanagement", "costefficiency", "healthcare"],
    practice: "eDiscovery technology",
    sourceFile: "TPLegal_EnterpriseClientSavesOver$400,000_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "multi-billion-dollar healthcare services provider",
      industry: "Healthcare",
      audience: "Legal professionals, eDiscovery managers, IT managers",
      summary: "TransPerfect Legal helped a healthcare client recover and centralize 10 TB of corrupted legal data into a multi-matter repository, enabling significant cost savings and faster insights across numerous legal matters.",
      challenge: {
        heading: "The challenges",
        body: "The client faced a corrupted processing database containing over 10 terabytes of data for multiple matters. Existing recovery proposals were too costly, prompting the search for a more efficient and cost-effective solution for data reprocessing and management.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal recommended a Multi-Matter Repository solution, designed to reduce rework and accelerate timelines. Using proprietary Digital Reef technology, we quickly reprocessed the 10 TB of data, centralizing it in a single environment. Matter-specific 'sub-cases' were then created, enabling targeted culling and instant data availability for new matters.",
      },
      result: {
        heading: "The result",
        body: "The client saved over $410,000 in processing costs within the first three months. The centralized repository eliminated the need to re-collect and reprocess redundant datasets, significantly reducing IT burden and providing faster insights for outside counsel, leading to more informed legal strategies.",
      },
      stats: [
        { label: "Processing costs saved", value: "$410,000", caption: "in the first three months" },
        { label: "Data reprocessed and centralized", value: "10 TB", caption: "of corrupted data" },
        { label: "Time savings", value: "Significant", caption: "and reduced IT burden" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Multi-billion-dollar healthcare client",
          "10 TB of corrupted data recovered",
          "Multi-matter repository implemented",
          "Over $410,000 saved in 3 months",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2206794445.url, aspect: "fill", heightPct: 46, focalY: 54 },
    },
  },
  {
    slug: "navigating-european-regulatory-challenges",
    title: "Navigating Complex European Regulatory Challenges",
    teaser: "An international private equity firm successfully met stringent EC regulatory obligations with expert support and rapid document review.",
    tags: ["antitrust", "regulatory compliance", "due diligence", "eDiscovery", "managed review"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_NavigatingComplexEuropeanRegulatoryChallenges_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "International private equity firm",
      industry: "Private equity",
      audience: "Legal professionals facing complex regulatory or cross-border M&A challenges.",
      summary: "TransPerfect Legal assisted an international private equity firm with urgent due diligence for a European acquisition, successfully navigating multiple, simultaneous EC Requests for Information (RFIs). Despite tight deadlines and complex privilege concerns, all regulatory obligations were met on time without delay.",
      challenge: {
        heading: "The challenges",
        body: "The client faced multiple, simultaneous Requests for Information (RFIs) from the European Commission (EC) with tight deadlines and complex privilege concerns. Their outside counsel had limited review capacity, and the sensitivity of documents precluded the use of technology assisted review (TAR).",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal’s Antitrust Practice Group (APG) rapidly mobilized, processing data and recruiting 37 antitrust review specialists within 48 hours. A multi-pass linear review, including full linear review, accuracy and privilege validation, and final client review, was implemented. eDiscovery project managers worked overnight to ensure quality control, delivering the RFI response by hand on the deadline morning.",
      },
      result: {
        heading: "The results",
        body: "With 37 reviewers onboarded in 48 hours, 300,000 documents were reviewed without TAR, ensuring precision. All EC RFIs were answered on time, and the client successfully met all regulatory obligations without delay, facilitating their critical acquisition.",
      },
      stats: [
        { label: "Reviewers onboarded", value: "37", caption: "within 48 hours" },
        { label: "Documents reviewed", value: "300,000", caption: "without TAR" },
        { label: "EC RFIs", value: "All", caption: "answered on time" },
        { label: "Regulatory obligations", value: "Met", caption: "without delay" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Rapid mobilization of antitrust review specialists.",
          "Managed complex privilege concerns with multi-pass review.",
          "Expedited data processing and quality control.",
          "Ensured timely submission of critical regulatory responses.",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros1794151417.url, aspect: "fill", heightPct: 46, focalY: 58 },
    },
  },
  {
    slug: "construction-disputes-case-study",
    title: "Navigating Complex Multilingual Construction Disputes",
    teaser: "Optimized collection, processing, and AI-enhanced review of multilingual data for parallel litigation in complex construction disputes.",
    tags: ["construction", "multilingual", "e-discovery", "ai-review", "litigation"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_ConstructionDisputesPracticeGroup_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "EU-headquartered international construction conglomerate",
      industry: "Construction",
      audience: "Legal professionals managing large-scale, multilingual litigation",
      summary: "TransPerfect Legal's Construction Disputes Practice Group (CDPG) handled the complex data challenges of parallel litigation for an international construction conglomerate, optimizing multilingual data collection, processing, and AI-enhanced review.",
      challenge: {
        heading: "The challenges",
        body: "The client faced a multi-terabyte data universe comprising English and two Western European languages, spread across disparate sources like email servers and construction-specific data management systems. A key challenge was avoiding duplication of work across two parallel but distinct litigation claims relying on the same underlying data.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal deployed bespoke workflows to ensure efficiency across both matters. This included industry-specialized forensic collection from construction-specific databases, multilingual search term consulting to achieve a high cull rate, and an AI image recognition solution to identify relevant photos. Managed first-level review by legally trained bilingual reviewers, combined with Technology Assisted Review (TAR), further streamlined the process.",
      },
      result: {
        heading: "The result",
        body: "The end client achieved significant cost savings, approximately 50% on review costs, by avoiding duplicative work. Targeted keyword searches led to a 95% initial data cull rate, and AI-enhanced workflows reduced second-level review by over 50%. The project successfully managed a vast multilingual dataset, identifying critical evidence efficiently.",
      },
      stats: [
        { label: "Cost savings on review", value: "50", unit: "%", caption: "by avoiding duplicative work" },
        { label: "Initial data cull rate", value: "95", unit: "%", caption: "achieved through targeted keyword searches" },
        { label: "Documents reviewed by bilingual staff", value: "300,000", caption: "by TransPerfect Legal contract reviewers" },
        { label: "Reduction in second-level review", value: "50 %+", caption: "via AI-enhanced TAR workflows" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Optimized collection and processing of multi-TB multilingual data.",
          "Managed review for two parallel litigation claims.",
          "Achieved significant cost savings and efficiency.",
          "Deployed AI for image recognition and review.",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2089683652.url, aspect: "fill", heightPct: 46, focalY: 42 },
    },
  },
  {
    slug: "navigating-data-infrastructure",
    title: "Navigating Data In Infrastructure Disputes",
    teaser: "A Middle Eastern EPC and FM contractor faced tight deadlines for a substantial claim in an international airport construction project.",
    tags: ["ediscovery", "forensics", "managed review", "analytics"],
    practice: "Forensics & investigations",
    sourceFile: "TPLegal_NavigatingDatainInfrastructureDisputes_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Middle Eastern EPC and FM contractor",
      industry: "Infrastructure & Construction",
      audience: "Legal professionals, eDiscovery managers, construction companies",
      summary: "TransPerfect Legal enabled a contractor to manage a complex international infrastructure dispute, despite 15 million records, multi-global teams, and tight deadlines. Our forensic and analytical approach significantly reduced data volume and expedited review.",
      challenge: {
        heading: "The challenges",
        body: "The client faced a complex dispute with 15 million records from disparate sources, large construction-specific documents, and Arabic-language data. Teams were spread globally, and there were tight deadlines to respond to Redfern requests.",
      },
      solution: {
        heading: "Our approach",
        body: "Our forensic experts defensibly collected data, deploying a bespoke Aconex tool and generating reports to flag irrelevant files. We then used Pre-Review Analytics® to quickly identify patterns and cull non-essential data. Documents were hosted in Relativity with advanced analytics, including email threading and continuous active learning, reducing the review population by 30%. We also provided five contract paralegals for first-level review.",
      },
      result: {
        heading: "The results",
        body: "A traditional process would have taken 35,000 hours. By leveraging TransPerfect Legal's integrated workflow, the entire project, including managed review, was completed in just 600 hours. This delivered a 98% reduction in document review costs.",
      },
      stats: [
        { label: "Initial records collected", value: "15 million", caption: "from disparate sources" },
        { label: "Project completion", value: "600 hours", caption: "vs. 35,000 traditional hours" },
        { label: "Reduction in review costs", value: "98", unit: "%", caption: "achieved through integrated workflow" },
        { label: "Reduction in review population", value: "30", unit: "%", caption: "due to email threading alone" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Forensic reporting and Aconex collection",
          "Advanced data culling with Digital Reef",
          "Relativity hosting and advanced analytics",
          "Managed review support with contract paralegals",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2522030523.url, aspect: "fill", heightPct: 46, focalY: 46 },
    },
  },
  {
    slug: "navigating-sec-investigations",
    title: "Navigating SEC Investigations with Custom Fact-Finding",
    teaser: "A major law firm leveraged custom fact-finding workflows to navigate a complex SEC investigation with a tight deadline.",
    tags: ["e-discovery", "managed review", "sec investigation", "fact-finding", "bilingual review"],
    practice: "Investigations & compliance",
    sourceFile: "TPLegal_NavigatingSECInvestigationswithCustomFact-FindingWorkflows_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Major law firm for a financial institution",
      industry: "Legal services, Financial services",
      audience: "Legal professionals facing complex regulatory investigations",
      summary: "TransPerfect Legal partnered with a major law firm to conduct a rapid, multi-language review for a critical SEC investigation, delivering results under significant time pressure.",
      challenge: {
        heading: "The challenges",
        body: "The firm faced a tight, six-week deadline to review over eight million documents for an SEC presentation. A critical subset of these documents was in Chinese, requiring specialized bilingual review expertise.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal built a solution combining expert team construction, powerful analytics, and flexible, issue-specific workflows. A bilingual review team, led by an experienced project manager, identified documents in both languages and surfaced hidden content. Using Brainspace, we visualized communication patterns and deployed parallel workflows for efficiency.",
      },
      result: {
        heading: "The result",
        body: "The custom fact-finding workflow enabled the identification and production of 20,000 key documents to the SEC. This approach led to a 70% total cost savings for the client. All deliverables were on-time under the strict six-week deadline.",
      },
      stats: [
        { label: "Documents identified and produced", value: "20,000", caption: "to the SEC" },
        { label: "Total cost savings", value: "70", unit: "%", caption: "through custom workflow" },
        { label: "Delivery", value: "ON-TIME", caption: "under a six-week deadline" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Rapid review of 8M+ documents",
          "Bilingual Chinese/English team",
          "Custom fact-finding workflows",
          "On-time delivery, 70% cost savings",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2161895303.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "plaintiff-fact-sheet-mdl-review",
    title: "Optimizing Plaintiff Fact Sheet Review in Multi-District Litigations",
    teaser: "A global law firm faced challenges reviewing plaintiff fact sheets in a multi-district litigation, requiring adaptable solutions.",
    tags: ["e-discovery", "managed review", "litigation support", "mdl"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_OptimizingPlaintiffFactSheetReviewinMDLs_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Global law firm",
      industry: "Legal services",
      audience: "Legal professionals facing complex multi-district litigations",
      summary: "TransPerfect Legal partnered with a global law firm to optimize plaintiff fact sheet review in a multi-district litigation, ensuring compliance and achieving significant cost savings.",
      challenge: {
        heading: "The challenges",
        body: "The client needed to efficiently review 726 plaintiff fact sheets in an MDL with an evolving review protocol. Disorganized uploads, inconsistent naming, and manual records hindered efficiency and risked inconsistencies.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal provided expertise and offshore capabilities, leveraging India-based teams. They implemented adaptable deficiency review, managed documents with a hybrid Relativity workflow, and streamlined processes with robust QA. A continuously trained team met evolving demands, ensuring timely deficiency letters and follow-ups.",
      },
      result: {
        heading: "The results",
        body: "The collaboration led to approximately 45% cost savings for the client. All 726 plaintiff fact sheets were reviewed for accuracy and compliance. The project was delivered on time, meeting the complex demands of the MDL.",
      },
      stats: [
        { label: "Cost savings", value: "45", unit: "%", caption: "achieved through offshore review" },
        { label: "Plaintiff fact sheets", value: "726", caption: "reviewed for accuracy and compliance" },
        { label: "Delivery", value: "On-time", caption: "for the entire project" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Deficiency review & compliance",
          "Document management & tracking",
          "Streamlined workflow with QA",
          "Scalable & trained offshore team",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2089683652b.url, aspect: "fill", heightPct: 46, focalY: 54 },
    },
  },
  {
    slug: "second-request-challenges",
    title: "Overcoming Second Request Challenges",
    teaser: "TransPerfect Legal helped an Am Law 25 firm meet a tight DOJ production deadline for a second request, despite last-minute scope changes.",
    tags: ["ediscovery", "antitrust", "doj", "datacollection", "managedreview"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_OvercomingSecondRequestChallenges_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Am Law 25 law firm",
      industry: "Legal services, Media & Entertainment",
      audience: "Legal professionals facing complex regulatory eDiscovery",
      summary: "An Am Law 25 law firm representing a global media company faced a challenging second request from the DOJ with multiple data sources and tight deadlines. TransPerfect Legal provided rapid forensic data collection, processing, and managed review solutions to ensure timely production.",
      challenge: {
        heading: "The challenges",
        body: "The client had 60 days to complete collection, processing, review, and production of nine data sources from 32 custodians. Last-minute DOJ requests included text messages from an additional 18 custodians and audio files previously out of scope.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal mobilized a global forensics team to collect data on-site and remotely from diverse sources, ingesting it into Digital Reef for processing. For the additional 18 custodians, technicians rapidly completed iCloud backup collections, then used a custom script to export mobile data into Relativity-compatible load files. When audio files were added, we identified them in Digital Reef and used a Relativity plug-in for in-platform media review and real-time transcription.",
      },
      result: {
        heading: "The result",
        body: "Despite last-minute scope changes and the addition of multiple data sources, TransPerfect Legal helped our client meet the DOJ’s hard production deadline. This success was thanks to rapid response, customized technical workflows, and efficient cross-functional coordination, demonstrating our ability to handle complex and dynamic eDiscovery challenges.",
      },
      stats: [
        { label: "Days to complete initial production", value: "60 days", caption: "Initial deadline for collection, processing, review, and production" },
        { label: "Additional custodians for text messages", value: "18", caption: "Last-minute DOJ request for mobile data" },
        { label: "Custodians for initial data collection", value: "32", caption: "Number of custodians for diverse data sources" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Rapid data collection from diverse sources",
          "Efficient processing and ECA using Digital Reef",
          "Custom scripting for mobile data export",
          "In-platform media review with real-time transcription",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros1896527446.url, aspect: "fill", heightPct: 46, focalY: 58 },
    },
  },
  {
    slug: "parallel-sec-doj-investigations",
    title: "Parallel SEC and DOJ Investigations",
    teaser: "Faced with parallel SEC and DOJ investigations, an investment company required an on-premise, air-gapped eDiscovery solution.",
    tags: ["e-discovery", "compliance", "investigations", "on-premise"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_ComplianceInvestigationsAntiBriberyPracticeGroup_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "US investment company",
      industry: "Financial Services",
      audience: "Legal professionals, Compliance officers, Financial institutions",
      summary: "TransPerfect Legal provided an on-premise, air-gapped eDiscovery and review solution for a US investment company facing parallel SEC and DOJ investigations.",
      challenge: {
        heading: "The challenge",
        body: "The client was subject to parallel SEC and DOJ investigations, requiring them to search, review, and produce large volumes of data. Due to high-level security concerns, the client could not transfer its data externally and needed an on-premise, offline (air-gapped) investigation setup.",
      },
      solution: {
        heading: "Our approach",
        body: "Experts from TransPerfect Legal designed and executed a comprehensive, defensible investigative process entirely onsite. Personnel arrived with a proprietary mobile eDiscovery server, equipped with Digital Reef for investigation and Relativity for document review. A closed, offline network of workstations was set up for the Relativity review by investigators.",
      },
      result: {
        heading: "The result",
        body: "Only responsive, non-privileged data was saved to an encrypted thumb drive for production, enabling the client to execute a streamlined and defensible investigation from behind their corporate firewall. This approach saved $50,000 in technology fees and achieved a 90% cull rate.",
      },
      stats: [
        { label: "Technology fees", value: "$50,000", caption: "saved in technology fees" },
        { label: "Cull rate", value: "90", unit: "%", caption: "data volume reduction" },
        { label: "Delivery", value: "ON-TIME", caption: "project completion" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "On-premise, air-gapped eDiscovery",
          "Mobile eDiscovery server with Digital Reef and Relativity",
          "Side-by-side work with outside counsel",
          "Secure, encrypted data production",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2089683652.url, aspect: "fill", heightPct: 46, focalY: 42 },
    },
  },
  {
    slug: "proactive-digital-forensics-ip",
    title: "Proactive Digital Forensics Prevents IP Theft",
    teaser: "A global medical device manufacturer implemented a proactive digital forensics program to prevent intellectual property theft during employee departures.",
    tags: ["digital forensics", "intellectual property", "data security", "employee departure"],
    practice: "Forensics & investigations",
    sourceFile: "TPLegal_ProactiveDigitalForensicsProgramPreventsIntellectualPropertyTheft_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "global medical device manufacturer",
      industry: "Medical Devices",
      audience: "Legal and IT professionals concerned with IP protection",
      summary: "TransPerfect Legal developed and implemented a custom Employee Departure Program (EDP) for a medical device manufacturer, leveraging forensic technology to prevent intellectual property theft. This program provides proactive protection against data loss during employee transitions.",
      challenge: {
        heading: "The challenge",
        body: "Our client discovered that departing employees were taking proprietary information, ranging from strategic documents to protected trade secrets. They needed a proactive solution to help prevent data loss and protect confidential business information during employee departures, rather than solely relying on costly litigation.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal’s FTAC team implemented a custom Employee Departure Program (EDP). We are notified when a departing employee meets a predetermined risk threshold, then conduct a forensic investigation tailored to the client’s IT environment. Our experts preserve and analyze data sources for red flags like USB activity, file transfers, and cloud storage access, delivering a formal report with findings and recommended next steps.",
      },
      result: {
        heading: "The result",
        body: "Multiple investigations confirmed misappropriation of confidential information, which was then recovered or neutralized without triggering costly litigation. Risk-based triggers enabled consistent, defensible oversight of employee departures, giving the client peace of mind through proactive IP protection at scale.",
      },
      stats: [
        { label: "Investigations confirmed", value: "MULTIPLE", caption: "misappropriation of confidential info" },
        { label: "Data recovery/neutralization", value: "WITHOUT", caption: "triggering costly litigation" },
        { label: "Risk-based triggers enabled", value: "DEFENSIBLE", caption: "consistent oversight of departures" },
        { label: "Client gained peace of mind", value: "PROACTIVE", caption: "IP protection at scale" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Custom Employee Departure Program (EDP)",
          "Forensic investigation and data analysis",
          "Identification of data misappropriation",
          "Mitigation of IP theft risk",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2505197575.url, aspect: "fill", heightPct: 46, focalY: 46 },
    },
  },
  {
    slug: "reef-express-self-service-ediscovery",
    title: "Reef Express: Self-Service eDiscovery for Legal Teams",
    teaser: "A boutique law firm found an affordable, full-featured eDiscovery solution for small datasets and budget-sensitive clients.",
    tags: ["ediscovery", "self-service", "cost-savings", "litigation", "legal-tech"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_ReefExpressSelf-ServiceeDiscovery_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "East Coast boutique Labor & Employment law firm",
      industry: "Legal services",
      audience: "Cost-conscious legal teams, law firms, legal professionals",
      summary: "This boutique law firm needed an eDiscovery solution that could handle small, budget-sensitive cases without sacrificing advanced features. They adopted Reef Express to gain access to powerful tools like Digital Reef and Relativity affordably.",
      challenge: {
        heading: "The challenges",
        body: "The firm handled many cases with small datasets and budget-sensitive clients, making leading eDiscovery platforms too expensive. Their previous mid-market solution lacked the advanced features needed to streamline document review and efficient case management.",
      },
      solution: {
        heading: "The solution",
        body: "The firm licensed Reef Express, TransPerfect Legal’s proprietary self-service eDiscovery platform, providing full access to Digital Reef for data processing and Relativity for full-scale document review. They uploaded data directly to Digital Reef for culling, then promoted relevant files to Relativity for review. Global project management support was also included due to limited internal resources.",
      },
      result: {
        heading: "The Results",
        body: "Reef Express delivered significant cost savings and efficiency. The firm saved $50,000 in technology fees and achieved a 90% cull rate, dramatically reducing the volume of documents requiring review. This allowed them to manage cases more effectively and affordably for their clients.",
      },
      stats: [
        { label: "Saved in technology fees", value: "$50,000", caption: "annual savings" },
        { label: "Cull rate achieved", value: "90", unit: "%", caption: "reducing review volume" },
        { label: "Support", value: "Expert-led", caption: "through global project management" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Proprietary self-service eDiscovery platform",
          "Access to Digital Reef and Relativity",
          "Data processing, filtering, ECA, and document review",
          "Global project management support",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2079263023.url, aspect: "fill", heightPct: 46, focalY: 50 },
    },
  },
  {
    slug: "sec-mobile-device-sweep",
    title: "SEC Mobile Device Sweep: Fast, Secure Collection",
    teaser: "TransPerfect Legal enabled a US investment advisor to quickly collect and review mobile device data for an SEC investigation.",
    tags: ["ediscovery", "mobile forensics", "regulatory compliance", "data privacy"],
    practice: "Antitrust & competition",
    sourceFile: "TPLegal_SECMobileDeviceSweep_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "US-based investment advisor",
      industry: "Financial Services",
      audience: "Legal professionals, Compliance officers, eDiscovery managers",
      summary: "Our team provided rapid, secure mobile device collection and review services for an investment advisor under SEC investigation, ensuring compliance and data privacy.",
      challenge: {
        heading: "The challenges",
        body: "The client faced a compressed timeline to collect data from over 50 mobile devices, including C-suite executives, nationwide. This required careful identification and exclusion of sensitive personal data, along with a fast, defensible, and privacy-conscious review of hundreds of thousands of messages to meet SEC expectations.",
      },
      solution: {
        heading: "Our approach",
        body: "We deployed forensic specialists for rolling on-site collection of 50+ devices, performing exclusionary filtering for executive data to protect personal content. Remote devices were handled with Mobile Remote Kits and iCloud backups. Filtered data was ingested into TransPerfect's proprietary Mobile and Short Message Viewer within Relativity, where messages were deduplicated, threaded, and participant-filtered to prioritize relevant content. Semi-automated redaction was used to protect privacy and accelerate review.",
      },
      result: {
        heading: "The result",
        body: "TransPerfect Legal successfully collected over 50 mobile devices in under two weeks, protecting executive data through secure on-site filtering. This approach saved hundreds of review hours through automated redaction, resulting in a streamlined, defensible review and production that fully met SEC expectations.",
      },
      stats: [
        { label: "Mobile devices collected", value: "50+", caption: "in under two weeks" },
        { label: "Review hours saved", value: "Hundreds", caption: "through automated redaction" },
        { label: "Executive data", value: "Protected", caption: "through secure, on-site filtering" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "50+ mobile devices collected",
          "Executive data protected through filtering",
          "Hundreds of review hours saved",
          "Streamlined, defensible review",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2666716055.url, aspect: "fill", heightPct: 46, focalY: 54 },
    },
  },
  {
    slug: "scalable-resources-anti-corruption",
    title: "Scalable Resources for Anti-Corruption Investigations",
    teaser: "We provided secure, high-quality translations for a global pharmaceutical company navigating multiple concurrent anti-corruption investigations.",
    tags: ["anti-corruption", "translations", "eDiscovery", "pharmaceutical"],
    practice: "Investigations & compliance",
    sourceFile: "TPLegal_ScalableResourcesforAnti-CorruptionInvestigations_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Fortune 500 pharmaceutical company",
      industry: "Pharmaceutical",
      audience: "Legal professionals, corporate legal departments",
      summary: "TransPerfect Legal partnered with a Fortune 500 pharmaceutical company to provide secure, high-quality translations for multiple anti-corruption investigations. Our centralized workflow ensured consistent quality and faster review cycles across 10 languages.",
      challenge: {
        heading: "The challenges",
        body: "The client faced high requirements for electronically stored information (ESI), multiple investigations running concurrently, and coordination across several law firms, all under stringent turnaround times.",
      },
      solution: {
        heading: "Our approach",
        body: "We provided secure, high-quality translations across 10 languages for US-based counsel, coordinating with four law firms. A centralized workflow with strict security and quality protocols was established, with over 80 linguists working in monitored environments. Completed translations were transferred via encrypted protocols to ensure confidentiality.",
      },
      result: {
        heading: "The results",
        body: "Our solution ensured consistent translation quality and reduced data risk through secure workflows, leading to faster review cycles. The client experienced significant time and cost savings by leveraging our global team and avoiding additional in-country service costs. We consistently exceeded performance expectations.",
      },
      stats: [
        { label: "Average SLA overperformance", value: "130", unit: "%", caption: "Delivering faster turnaround times" },
        { label: "Languages translated", value: "10", caption: "Across EU, APAC, and South America" },
        { label: "Linguists deployed", value: "80", caption: "Working remotely and on-site" },
        { label: "Law firms coordinated", value: "4", caption: "Including three Am Law 100 firms" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Consistent translation quality across 10 languages",
          "Reduced data risk with secure, locked-down workflows",
          "Faster review cycles via immediate access to translated evidence",
          "Significant time and cost savings via centralized translation",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2141020743.url, aspect: "fill", heightPct: 46, focalY: 58 },
    },
  },
  {
    slug: "mdl-complaint-analysis",
    title: "Streamlining Complaint Analysis Across Multi-District Litigation",
    teaser: "A global law firm leveraged TransPerfect Legal to manage a high-volume, multi-district litigation review, achieving significant cost savings.",
    tags: ["ediscovery", "managed review", "litigation support", "mdl"],
    practice: "Litigation & class actions",
    sourceFile: "TPLegal_StreamliningComplaintAnalysisAcrossMDL_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "global law firm",
      industry: "legal services",
      audience: "law firms, legal departments",
      summary: "TransPerfect Legal supported a global law firm with a large-scale, multi-district litigation review involving over 1.7 million documents. Our managed review services ensured accurate categorization, privilege redactions, and timely production.",
      challenge: {
        heading: "The challenge",
        body: "The client faced managing a high-volume multi-district litigation review of over 1.7 million documents, requiring accurate categorization, privilege redactions, and timely responses to RFPs. Maintaining consistency and efficiency across evolving case requirements was complex.",
      },
      solution: {
        heading: "Our approach",
        body: "TransPerfect Legal provided a focused offshore team, initially 10 reviewers, to handle initial categorization. As the scope expanded to 1.7 million documents, the team scaled to 64, supporting multiple review phases including privilege redactions. Continuous training and robust QC ensured quality and consistent, on-time deliverables.",
      },
      result: {
        heading: "The result",
        body: "The client achieved approximately 45% cost savings through leveraging offshore managed review, while maintaining high speed and accuracy. TransPerfect Legal successfully processed and reviewed 1.7 million documents, ensuring on-time delivery across all project phases.",
      },
      stats: [
        { label: "Cost savings", value: "45", unit: "%", caption: "achieved through offshore managed review" },
        { label: "Documents processed and reviewed", value: "1.7 MILLION", caption: "total documents handled in the litigation" },
        { label: "Review team members", value: "64", caption: "scaled offshore team" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "High-volume multi-district litigation",
          "Offshore managed review team",
          "Accurate categorization and redactions",
          "45% cost savings and on-time delivery",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2089683652.url, aspect: "fill", heightPct: 46, focalY: 42 },
    },
  },
  {
    slug: "streamline-ediscovery-healthcare",
    title: "Streamlining eDiscovery for Healthcare Labor Matters",
    teaser: "A Fortune 50 healthcare company optimized eDiscovery workflows for labor and employment matters with a unified platform.",
    tags: ["ediscovery", "healthcare", "labor-employment", "digital-reef"],
    practice: "eDiscovery technology",
    sourceFile: "TPLegal_GlobalHealthcareProviderDigitalReef_CaseStudy_US.pdf",
    content: {
      eyebrow: "Case study",
      client: "Fortune 50 pharmaceutical and healthcare company",
      industry: "Healthcare",
      audience: "Legal professionals in healthcare, corporate counsel, eDiscovery specialists",
      summary: "TransPerfect Legal helped a global healthcare provider streamline eDiscovery for labor and employment matters by implementing Digital Reef as its primary technology solution. This enabled efficient processing, analysis, and review of data within a single platform.",
      challenge: {
        heading: "The Challenge",
        body: "The client's labor and employment legal group needed an eDiscovery platform for quick processing, searching, and analysis, as well as conducting document review for small matters. Their primary objective was to avoid the expense and burden of using multiple platforms for different stages of eDiscovery.",
      },
      solution: {
        heading: "Our Approach",
        body: "The client onboarded Digital Reef as their primary eDiscovery technology solution for labor and employment matters. They self-collect relevant data and ingest it into Digital Reef, where paralegals or in-house attorneys run searches and analytics to define the review set. Review is then conducted within Digital Reef by either in-house or outside counsel.",
      },
      result: {
        heading: "The Result",
        body: "In 24 months, the client processed almost 10 TBs of data across several dozen matters using Digital Reef. More than 97% of this data remained within Digital Reef for processing, searching, filtering, and review, eliminating the need to export to a second eDiscovery platform. This user-friendly approach optimized workflows.",
      },
      stats: [
        { label: "Data processed", value: "10 TB", caption: "Total data processed in 24 months" },
        { label: "Data retained in-platform", value: "97", unit: "%", caption: "Data not requiring export to secondary platform" },
        { label: "Matters handled", value: "Several dozen", caption: "Projects run through Digital Reef" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Streamlined eDiscovery workflow",
          "Unified platform for processing and review",
          "Self-collection and in-house review capabilities",
          "Efficient handling of labor & employment matters",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heros2375103051.url, aspect: "fill", heightPct: 46, focalY: 46 },
    },
  },
];

export const LEGAL_PRACTICE_AREAS: string[] = Array.from(
  new Set(LEGAL_CASE_STUDIES.map((c) => c.practice)),
).sort();

export function findLegalCaseStudy(slug: string): LegalCaseStudySeed | undefined {
  return LEGAL_CASE_STUDIES.find((c) => c.slug === slug);
}
