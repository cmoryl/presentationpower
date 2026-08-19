// DataForce — recreated case study library.
//
// Source: the DataForce client-mention case studies supplied by the division
// (Aapya Solutions computer vision, zeroG jet-engine blade annotation). Copy was
// transcribed from the original PDFs and re-shaped into the live
// `CaseStudyContent` model; hero imagery was extracted and re-hosted on the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for the
// signed-in user via createPrintAsset().

import type { CaseStudyContent } from "@/lib/print-assets.types";

import heroAapya from "@/assets/print-heroes/dataforce/df-cs-aapya-shelves.jpg.asset.json";
import heroZeroG from "@/assets/print-heroes/dataforce/df-cs-zerog-jet-engine.jpg.asset.json";

export const DATAFORCE_DIVISION_ID = "bm-product";

export type DataForceCaseStudySeed = {
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
  links: ["dataforce.ai", "dataforce@transperfect.com"],
};

const CTA = {
  label: "Talk to DataForce",
  subhead: "AI training data, collection, and annotation at global scale.",
  buttonLabel: "Start a conversation",
  url: "https://dataforce.ai",
};

export const C_CV = "Computer vision";
export const C_GENAI = "Generative AI & LLMs";
export const C_COLLECTION = "Data collection & user studies";

export const DATAFORCE_CASE_STUDIES: DataForceCaseStudySeed[] = [
  {
    slug: "aapya-computer-vision-inventory",
    title: "Leveraging Computer Vision for Intelligent Inventory Management",
    teaser:
      "Aapya Solutions trained its Vision-37 shelf-monitoring model to 90–95% detection accuracy with a custom DataForce collection and annotation pipeline.",
    collection: C_CV,
    tags: ["computer vision", "annotation", "retail", "data collection", "YOLOv8"],
    sourceFile: "DataForce_Aapya_Computer_Vision.pdf",
    content: {
      eyebrow: "Case study",
      client: "Aapya Solutions Inc.",
      industry: "Retail technology / computer vision",
      audience: "AI product, data, and ML engineering leads",
      summary:
        "A custom photo-collection and segmentation pipeline that gave an intelligent inventory startup the high-quality training data its shelf-monitoring model needed.",
      challenge: {
        heading: "The challenge",
        body: "Aapya Solutions built Eyes on Shelves, an intelligent inventory system powered by its proprietary Vision-37 Inventory Intelligence Platform. Retailers struggle daily with inventory accuracy, real-time shelf visibility, product loss, and planogram compliance — and manual shelf audits are expensive. Aapya needed a partner to accelerate turnaround and collect high-quality data to train its model for 24/7/365 shelf monitoring, while protecting customer data as an emerging startup.",
      },
      solution: {
        heading: "Our solution",
        body: "DataForce built a custom data collection pipeline and QA process near Aapya's Tampa Bay headquarters, sourcing a local community member to photograph 300+ liquor products and their barcodes over three days. Photos flowed straight into our cloud through DataForce Contribute, our mobile app. Scope covered aisle-segment and individual bottle photos, up to eight attributes per bottle, and segmentation of every bottle (polygons) and barcode (bounding boxes). A three-coordinate workflow — aisle segment, shelf number, position on shelf — let attributes be entered once and transposed across photo types, cutting collection and annotation time and cost. Our technology team scripted the attribute transposition and generated YOLOv8 format output, a first for DataForce.",
      },
      result: {
        heading: "The result",
        body: "Six aisle-segment photos and 350 individual bottle photos produced 356 photos, 2,800 attributes, and 700 segmentations, plus an additional 468 segmentations and 1,404 attributes from two wide-angle images. Sampling of 80% on collection and 84% on annotation returned pass rates of 98% and 97% respectively, for a 99.8% customer pass rate — all delivered in under one month. Aapya's dataset now models 300+ liquor products at 90–95% detection accuracy, positioning the platform to scale locally, regionally, and nationally.",
      },
      stats: [
        { label: "Customer pass rate", value: "99.8", unit: "%", caption: "Across collection and annotation" },
        { label: "Detection accuracy", value: "90–95", unit: "%", caption: "On 300+ liquor products" },
        { label: "Segmentations delivered", value: "1,168", caption: "Polygons and bounding boxes" },
        { label: "Attributes captured", value: "4,204", caption: "Up to eight per bottle" },
        { label: "Time to delivery", value: "<1", unit: "mo", caption: "Full collection to delivery" },
      ],
      quote: {
        text: "DataForce is a great company to work with! The team has been highly organized, responsive, and accommodating to changing requests and requirements. This has helped us model our dataset of 300+ liquor products to 90%–95% accuracy for detection.",
        author: "Ramesh Tirumala",
        role: "CEO",
        company: "Aapya Solutions",
      },
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Photos of aisle segments plus matching individual bottle barcodes",
          "Up to eight attributes provided per bottle",
          "Polygon segmentation for bottles, bounding boxes for barcodes",
          "Three-coordinate workflow removes duplicate attribute entry",
          "Script-based YOLOv8 export built for the client's pipeline",
        ],
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: {
        imageUrl: heroAapya.url,
        aspect: "fill",
        heightPct: 40,
        focalY: 50,
      },
    },
  },
  {
    slug: "zerog-jet-engine-blade-annotation",
    title: "Jet Engine Blade Defect Annotation for Aviation ML",
    teaser:
      "zeroG trained a defect-detection model on 25,000+ accurately labeled jet engine frames with a DataForce-managed annotation team.",
    collection: C_CV,
    tags: ["computer vision", "annotation", "aviation", "defect detection", "managed team"],
    sourceFile: "DataForce_ZeroG_CaseStudy.pdf",
    content: {
      eyebrow: "Case study",
      client: "zeroG",
      industry: "Aviation / machine learning",
      audience: "ML engineering and MRO inspection leads",
      summary:
        "A recruited, trained, and DataForce-managed annotation team labeled over 25,000 jet engine frames inside the client's own platform.",
      challenge: {
        heading: "The challenge",
        body: "zeroG is the expert center for data-driven AI and machine learning solutions in aviation, helping organizations gain insights, make better decisions, and automate repetitive processes. One line of business is jet engine maintenance, where manual inspection is labor-intensive, prone to omission errors, and high-risk. zeroG's experts needed a partner to help train an ML model that detects defects on jet engine blades automatically to support specialist engineers — which required large volumes of very accurately labeled data.",
      },
      solution: {
        heading: "Our solution",
        body: "Having experimented with internal and external labeling options, zeroG turned to DataForce for its high-quality output and breadth of project experience. zeroG chose to continue working in the third-party platform it already used, so DataForce recruited, hired, trained, and managed the annotators inside that tool against zeroG's guidelines. Bounding boxes were drawn around defects and assigned to one of 11 defect categories. Experienced labelers ran a QA pass before images went to zeroG's experts for control, and client feedback was folded back into the guidelines so teams could be retrained throughout the project.",
      },
      result: {
        heading: "The result",
        body: "DataForce oversaw the annotation of more than 25,000 frames of jet engines, delivering on both timeline and quality. Just as importantly, the collaborative model — feedback exchanged in-platform, over email, and on calls — gave zeroG a higher level of control over an externally supplied project, and the partnership is now expanding into new use cases.",
      },
      stats: [
        { label: "Frames annotated", value: "25,000", unit: "+", caption: "Jet engine inspection imagery" },
        { label: "Defect categories", value: "11", caption: "Assigned via bounding boxes" },
        { label: "Delivery", value: "On time", caption: "Timeline and quality targets met" },
        { label: "QA layers", value: "2", caption: "DataForce pass plus client control" },
      ],
      quote: {
        text: "It was great working with DataForce. They were very flexible in adapting to our requirements to deliver the best possible result.",
        author: "Alexander Appel",
        role: "Principal Solution Architect",
        company: "zeroG",
      },
      engagement: {
        title: "Engagement snapshot",
        bullets: [
          "Annotators recruited, hired, trained, and managed by DataForce",
          "Work performed in the client's existing third-party platform",
          "Bounding boxes across 11 provided defect categories",
          "Experienced labelers ran QA before client control review",
          "Guidelines iterated from client feedback with team retraining",
        ],
      },
      expert: {
        name: "Dorota Iskra",
        role: "Senior Director, DataForce",
        email: "dataforce@transperfect.com",
      },
      cta: CTA,
      footer: FOOTER,
      heroMedia: {
        imageUrl: heroZeroG.url,
        aspect: "fill",
        heightPct: 40,
        focalY: 50,
      },
    },
  },
];
