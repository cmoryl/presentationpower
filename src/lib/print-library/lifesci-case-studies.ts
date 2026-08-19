// TransPerfect Life Sciences — recreated case study / spotlight library.
//
// Source: the LifeSci spotlight PDFs supplied by the division (Blinded AZ,
// In-Study Interviews, two top-10 pharma web localization studies, regulatory
// translation automation, United Imaging Healthcare, Laboratoires Vivacy).
// Copy was transcribed from the originals and re-shaped into the live
// `CaseStudyContent` model; hero imagery was extracted from each PDF and
// re-hosted on the CDN.
//
// These are read-only seeds. "Create editable copy" writes one into
// `print_assets` for the signed-in user via createPrintAsset().

import type { CaseStudyContent } from "@/lib/print-assets.types";

import heroBlindedAz from "@/assets/print-heroes/lifesci/lifesci-cs-blinded-az.jpg.asset.json";
import heroIsi from "@/assets/print-heroes/lifesci/lifesci-cs-in-study-interviews.jpg.asset.json";
import heroTrialSite from "@/assets/print-heroes/lifesci/lifesci-cs-trial-site.jpg.asset.json";
import heroCareersSite from "@/assets/print-heroes/lifesci/lifesci-cs-careers-site.jpg.asset.json";
import heroAutomation from "@/assets/print-heroes/lifesci/lifesci-cs-pharma-automation.jpg.asset.json";
import heroUnitedImaging from "@/assets/print-heroes/lifesci/lifesci-cs-united-imaging.jpg.asset.json";
import heroVivacy from "@/assets/print-heroes/lifesci/lifesci-cs-vivacy.jpg.asset.json";

export const LIFESCI_DIVISION_ID = "bm-tp-lifesci";

export type LifeSciCaseStudySeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  /** Sub-folder inside the division × type folder. */
  collection: string;
  tags: string[];
  sourceFile: string;
  content: CaseStudyContent;
};

const FOOTER = {
  links: ["lifesciences.transperfect.com", "lifesciences@transperfect.com"],
};
const CTA = {
  label: "Talk to TransPerfect Life Sciences",
  subhead: "Lab to launch. Practitioner to patient.",
  buttonLabel: "Start a conversation",
  url: "https://lifesciences.transperfect.com",
};

const C_WEB = "Web & content localization";
const C_REG = "Regulatory & quality";
const C_CLINICAL = "Clinical & patient research";
const C_TRAINING = "Training & interpreting";

export const LIFESCI_CASE_STUDIES: LifeSciCaseStudySeed[] = [
  {
    slug: "top10-pharma-trial-site-nine-languages",
    title: "From Local to Global",
    teaser:
      "A top-10 pharma leader delivered clinical trial access in nine languages in only three months.",
    collection: C_WEB,
    tags: ["GlobalLink Web JS", "clinical trials", "website localization", "cost savings"],
    sourceFile: "LifeSci_J&J_CaseStudy_1.pdf",
    content: {
      eyebrow: "Spotlight",
      client: "Top 10 pharmaceutical organization",
      industry: "Pharmaceuticals",
      audience: "Digital, clinical operations, and global content leads",
      summary:
        "Making clinical trials more accessible to global patient populations by launching a trial website in nine languages simultaneously.",
      challenge: {
        heading: "The challenge",
        body: "A leading pharmaceutical organization wanted to make clinical trials more accessible to global patient populations through its website, launching the site in nine languages simultaneously. Two major hurdles stood in the way: limited resources for global content review and site management, and uncertainty caused by a changing content management system. Together these created the risk of higher costs and significant launch delays.",
      },
      solution: {
        heading: "Our solution",
        body: "TransPerfect implemented GlobalLink Web JS technology as part of a turnkey solution. The team translated more than two million words across nine languages, localized site imagery, and completed both linguistic and cultural reviews, while also supporting engineering, testing, and quality assurance. Combining translation automation with expert project management delivered a fast and reliable rollout.",
      },
      result: {
        heading: "The result",
        body: "In just three months the organization localized its website in nine languages — cutting the expected timeline by 70%. The project generated $2.4 million in cost savings and more than $80,000 in upsell value. Most importantly, patients around the world now have faster access to clinical trial information in their preferred languages, improving inclusivity and supporting recruitment.",
      },
      stats: [
        { label: "Generated in cost savings", value: "$2.4M", caption: "Against expected spend" },
        { label: "Reduction in time to launch", value: "70", unit: "%", caption: "Three months total" },
        { label: "Languages launched", value: "9", caption: "Simultaneous release" },
        { label: "Words translated", value: "2M+", caption: "Plus localized imagery" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "GlobalLink Web JS turnkey deployment",
          "Linguistic and cultural review in every market",
          "Engineering, testing, and QA support included",
          "Resilient to an in-flight CMS migration",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroTrialSite.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "top10-pharma-careers-site-15-languages",
    title: "Opening Doors Worldwide",
    teaser: "Launching a top-10 pharma's careers site in 15 languages in under three months.",
    collection: C_WEB,
    tags: ["GlobalLink Web", "employer brand", "translation memory", "managed services"],
    sourceFile: "LifeSci_J&J_CaseStudy_2.pdf",
    content: {
      eyebrow: "Spotlight",
      client: "Top 10 pharmaceutical company",
      industry: "Pharmaceuticals",
      audience: "Talent acquisition, digital, and IT leads",
      summary:
        "An automated website localization program that gave candidates worldwide access to job opportunities in their preferred language.",
      challenge: {
        heading: "The challenge",
        body: "A top 10 pharmaceutical company set out to launch its careers site in 15 languages within just three months — an ambitious timeline requiring fast, easy access to job opportunities in each candidate's preferred language. Internal IT resources were stretched thin, local country teams had limited capacity to review content, and there was little bandwidth to manage frequent updates. Outsourcing everything to consultancies would have added cost and slowed progress, putting the deadline at risk.",
      },
      solution: {
        heading: "Our solution",
        body: "To move quickly without sacrificing quality, the multinational partnered with TransPerfect to implement GlobalLink Web, an automated website localization platform. GlobalLink removed manual copy/paste work, reduced IT involvement, and let teams review content directly in context. The scope was significant — 1.6 million words, 91 URLs, and 92 images — but automation and content re-use kept the workload manageable while ensuring linguistic accuracy and consistency. TransPerfect's Managed Services team handled testing and validation so every page launched accurate and polished.",
      },
      result: {
        heading: "The result",
        body: "The careers site went live in under three months across all 15 languages, letting candidates worldwide explore opportunities in their preferred language. Compared with a traditional manual approach, the project cut time to market by 88% and generated $250,000 in cost savings through translation memory optimization, testing, and validation management — while strengthening the organization's global employer brand.",
      },
      stats: [
        {
          label: "Generated in savings through translation memory",
          value: "$250K",
          caption: "TM optimization + validation",
        },
        { label: "Reduction in time to market", value: "88", unit: "%", caption: "Vs. manual approach" },
        { label: "Languages live", value: "15", caption: "In under three months" },
        { label: "Words, URLs, images", value: "1.6M", caption: "91 URLs, 92 images" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "GlobalLink Web automated localization platform",
          "In-context review for local country teams",
          "Minimal internal IT involvement required",
          "Managed Services testing and validation",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroCareersSite.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "pharma-regulatory-translation-automation",
    title: "Saving $1 Million with Regulatory Translation Automation",
    teaser: "Veeva RIM + GlobalLink centralization, AI workflows, and 50% average monthly TM savings.",
    collection: C_REG,
    tags: ["regulatory affairs", "Veeva RIM", "GlobalLink", "AI workflows", "automation"],
    sourceFile: "LifeSci_LeadingPharmaAutomating_Spotlight.pdf",
    content: {
      eyebrow: "Spotlight",
      client: "Leading global pharmaceutical organization",
      industry: "Pharmaceuticals — regulatory affairs",
      audience: "Regulatory affairs and translation program owners",
      summary:
        "Centralizing decentralized regulatory translation into one automated, measurable global program.",
      challenge: {
        heading: "The challenge",
        body: "A leading pharmaceutical client was struggling to efficiently manage a decentralized translation process, causing issues with translation quality, project deadlines, and visibility into spend and project metrics. They sought a partnership that would implement an efficient, scalable global strategy to save time and resources.",
      },
      solution: {
        heading: "The solution",
        body: "TransPerfect designed a customized solution centralizing all regulatory affairs global translations, powered by a direct integration between Veeva's RIM and GlobalLink to reduce project management by up to 60%, with accurate real-time KPI tracking through Tableau. AI-powered workflows reduced costs and shortened timelines while scaling to the large content volumes required for global regulatory approvals.",
      },
      result: {
        heading: "The result",
        body: "After just six months, the client drastically increased translation efficiency and reduced the burden on project management teams, seeing $107,000 in savings and a 53% reduction in price per word. A year and a half into the centralization journey, they were averaging 50% TM savings per month — a total of $1M across 20M words translated — with AI-powered workflows and high TM leverage cutting cycle time for large NDAs by up to 70%.",
      },
      stats: [
        { label: "Total savings", value: "$1M", caption: "Across 20M words translated" },
        { label: "Price per word reduction", value: "53", unit: "%", caption: "First six months" },
        { label: "Average monthly TM savings", value: "50", unit: "%", caption: "18 months in" },
        { label: "Cycle time reduction on large NDAs", value: "70", unit: "%", caption: "AI-powered workflows" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Direct Veeva RIM ↔ GlobalLink integration",
          "Project management effort reduced by up to 60%",
          "Real-time KPI and spend visibility via Tableau",
          "AI-powered workflows built for regulatory volume",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroAutomation.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "united-imaging-labeling-quality-control",
    title: "Labeling Language Quality Control for United Imaging Healthcare",
    teaser: "Automated LQA error categorization across 45 languages of IFU and labeling content.",
    collection: C_REG,
    tags: ["medical devices", "labeling", "IFU", "GlobalLink Enterprise", "LQA"],
    sourceFile: "LifeSci_UnitedImaging_Spotlight.pdf",
    content: {
      eyebrow: "Spotlight",
      client: "United Imaging Healthcare",
      industry: "Medical devices",
      audience: "Regulatory, labeling, and quality leads",
      summary:
        "Streamlining labeling quality control and global content evaluation for regulatory compliance across 45 languages.",
      challenge: {
        heading: "The challenge",
        body: "Ranked as one of the leading medical device companies in China, United Imaging Healthcare provides high-end medical equipment and services to customers. The company didn't have sufficient internal resources to assess the quality of 45 languages in its labeling process, and needed a way to streamline labeling quality control and global content evaluation for regulatory compliance.",
      },
      solution: {
        heading: "The solution",
        body: "The TransPerfect team worked with United Imaging Healthcare to streamline language quality control across IFU and labels, including product nameplates and safety signs. Leveraging GlobalLink Enterprise and Project Director, the client automated translation error categorization and handled content updates within a centralized translation management system. Linguistic Quality Assurance PMs exported error lists and score cards for client review, then used the same details to prepare the final approved output.",
      },
      result: {
        heading: "The result",
        body: "Through these automations, United Imaging Healthcare's team was able to ensure its multilingual content was at a high quality level, mitigating risk and ensuring regulatory compliance across global markets. The client achieved increased content accuracy for global product registration and clearer visibility into the quality of its content.",
      },
      quote: {
        text: "TransPerfect has been instrumental in addressing our growing needs for language quality services. Their quality process has enabled us to have a clearer understanding of the content quality of our products, allowing us to better evaluate and manage our content for global markets.",
        author: "United Imaging Healthcare",
        role: "Language quality stakeholder",
      },
      stats: [
        { label: "Languages under quality control", value: "45", caption: "IFU, labels, safety signs" },
        { label: "Multilingual quality", value: "Improved", caption: "Risk mitigated" },
        { label: "Client visibility on global language quality", value: "Increased", caption: "Error lists + score cards" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "GlobalLink Enterprise + Project Director deployment",
          "Automated translation error categorization",
          "Centralized TMS for labeling content updates",
          "LQA score cards fed straight into final output",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroUnitedImaging.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "vivacy-readability-validation",
    title: "Validating the Readability of Key Patient Materials",
    teaser: "Patient and HCP user testing that validated SSCP IFP, PIL, and IFU against MDR requirements.",
    collection: C_CLINICAL,
    tags: ["MDR", "readability testing", "SSCP", "patient materials", "HCP research"],
    sourceFile: "LifeSci_Vivacy_Spotlight.pdf",
    content: {
      eyebrow: "Spotlight",
      client: "Laboratoires Vivacy",
      industry: "Medical devices & aesthetics",
      audience: "Regulatory affairs and medical writing leads",
      summary:
        "Recruiting patients and healthcare professionals to test and certify the readability of regulated patient documentation.",
      challenge: {
        heading: "The challenge",
        body: "Laboratoires Vivacy was searching for a vendor to test the readability of their summary of safety and clinical performance (SSCP) information for patients (IFP), patient information leaflets (PILs), and instructions for use (IFU).",
      },
      solution: {
        heading: "The solution",
        body: "Vivacy reached out to TransPerfect to recruit patients and healthcare professionals (HCPs) to review the SSCP IFP, PIL, and IFU. To gather meaningful insights, TransPerfect developed custom questionnaires for users to complete while reviewing each document, then compiled the results into verification reports that validated user testing and captured key HCP and patient insights — alongside readability certificates for each document.",
      },
      result: {
        heading: "The results",
        body: "The project was completed successfully according to timelines, so Vivacy requested TransPerfect's support on another user testing project involving both patients and HCPs. As a result, Vivacy validated that the SSCP IFP and PIL were reviewed by patients according to MDR requirements, and gained HCP feedback to improve the IFU for physicians.",
      },
      quote: {
        text: "The TransPerfect team has been very reactive since the first meeting and during the whole project, which enabled us to start and finish the readability tests of the documents on time.",
        author: "Laboratoires Vivacy",
        role: "Project stakeholder",
      },
      stats: [
        { label: "Document types tested", value: "3", caption: "SSCP IFP, PIL, IFU" },
        { label: "MDR patient review", value: "Validated", caption: "Verification reports issued" },
        { label: "Readability certificates", value: "Per document", caption: "Delivered with reports" },
        { label: "Follow-on projects", value: "Expanded", caption: "Patients and HCPs" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Patient and HCP recruitment handled end to end",
          "Custom questionnaires per document type",
          "Verification reports validating user testing",
          "Readability certificates for regulatory files",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroVivacy.url, aspect: "fill", heightPct: 40, focalY: 45 },
    },
  },
  {
    slug: "in-study-interviews-patient-voice",
    title: "In-Study Interviews Amplify the Patient's Voice",
    teaser: "Real-time patient data across five new EU markets, with translation planned around FPI dates.",
    collection: C_CLINICAL,
    tags: ["COA", "in-study interviews", "clinical research", "interpreting", "EU markets"],
    sourceFile: "LifeSci_InStudyInterview_Spotlight.pdf",
    content: {
      eyebrow: "Spotlight",
      client: "Global clinical research sponsor",
      industry: "Clinical research",
      audience: "Clinical outcome assessment and study design leads",
      summary:
        "Treating in-study interviews as part of protocol design to capture real-time treatment data and speed regulatory submission.",
      challenge: {
        heading: "The challenge",
        body: "A sponsor conducting global clinical research planned to expand initiatives across five new EU markets, streamlining approvals while ensuring high-quality patient input aligned with regulatory expectations. Post-study patient interviews have historically been an afterthought — often unplanned, and carrying risk from time, resource, and cost constraints. Collected data tends to be less dynamic than optimal, affected by subjectivity and recall bias, with further risk in test questions, data input errors, and data quality. In-study interviews (ISIs) capture real-time treatment data with pre-defined collection parameters that reduce subjectivity and response shift and can indicate safety signals.",
      },
      solution: {
        heading: "The solution",
        body: "The sponsor, working with a COA subject matter expert from TransPerfect, affirmed the value of treating ISIs as part of the protocol design process, with additional consideration for planning in-person and remote interviews around cultural and geographical factors. Study-specific countries and languages were triaged against established first patient-in (FPI) dates, and the team mapped timelines and resource requirements for translating study questions, prioritizing languages by FPI expectations. The team also consulted on selecting and scheduling in-person and teleconference interpreters, with diversity and patient cohort cultural origins integral to every decision.",
      },
      result: {
        heading: "The result",
        body: "The sponsor successfully conducted ISIs across five markets and submitted high-quality, real-world patient data to regulatory bodies, augmenting submission approval timelines. By proactively accounting for translation and interpretation requirements, the sponsor mitigated the risks associated with rush translations while keeping costs low.",
      },
      stats: [
        { label: "New EU markets", value: "5", caption: "ISIs conducted" },
        { label: "Submission approval timelines", value: "Augmented", caption: "Real-world patient data" },
        { label: "Rush translation risk", value: "Mitigated", caption: "Planned against FPI dates" },
        { label: "Interview modes", value: "In-person + remote", caption: "Interpreter scheduling included" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "COA SME embedded in protocol design",
          "Country and language triage against FPI dates",
          "Interpreter selection for in-person and teleconference",
          "Cultural cohort considerations throughout",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroIsi.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
  {
    slug: "pharma-multilingual-employee-training-apac-emea",
    title: "Multilingual Multichannel Employee Training in APAC and EMEA",
    teaser: "40,000 words in under two weeks, subtitled videos, and four interpreted live sessions.",
    collection: C_TRAINING,
    tags: ["employee training", "subtitling", "live interpreting", "SAP", "APAC", "EMEA"],
    sourceFile: "LifeSci_BlindedAZ_Spotlight.pdf",
    content: {
      eyebrow: "Spotlight",
      client: "Leading pharmaceutical organization",
      industry: "Pharmaceuticals",
      audience: "Learning & development and change management leads",
      summary:
        "Localized documents, subtitled training video, and live interpretation to roll out a new SAP platform to Korean and Japanese employees.",
      challenge: {
        heading: "The challenge",
        body: "A leading pharma needed to train Korean and Japanese employees on a new SAP Master Data Governance platform. The training was complex: employees had to review multiple documents, watch training videos, and attend live Q&A sessions, and the content required detailed planning plus supplemental content adaptation to complete localization. With many moving parts and a tight timeframe, the client needed an agile vendor who could translate with local team review before deploying the program.",
      },
      solution: {
        heading: "The solution",
        body: "The client selected TransPerfect to adapt the content and translate standard documents within their dedicated platform, leveraging desktop publishing and formatting tools. For the video training, the team translated and added subtitles in Japanese and Korean. For in-person training, live interpretation was provided across four sessions. Because timelines varied by workstream, specialized production teams worked in parallel, with progress tracked through weekly meetings between the project management and pharma teams.",
      },
      result: {
        heading: "The result",
        body: "A total of 40,000 words were translated in under two weeks, culminating in four successful live training sessions with accompanying documentation and training videos. The full process and multistakeholder review were completed within an aggressive launch timeline despite multiple reviewers and feedback loops — and the training program was subsequently expanded to additional EMEA regions.",
      },
      stats: [
        { label: "Words translated in under two weeks", value: "40,000", caption: "Documents + video" },
        { label: "Interpreted live sessions", value: "4", caption: "In-person Q&A" },
        { label: "Subtitled languages", value: "2", caption: "Japanese and Korean" },
        { label: "Program expansion", value: "EMEA", caption: "After APAC success" },
      ],
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Content adaptation plus DTP and formatting",
          "Subtitled training video in JA and KO",
          "Live interpretation across four sessions",
          "Parallel production teams with weekly governance",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: { imageUrl: heroBlindedAz.url, aspect: "fill", heightPct: 42, focalY: 45 },
    },
  },
];
