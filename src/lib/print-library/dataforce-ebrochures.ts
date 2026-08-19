// DataForce — recreated e-brochure library.
//
// Sources: the DataForce generative AI training data e-brochure, the scalable
// data collection / user studies e-brochure, and the multi-sensor computer
// vision solution brief. Copy was transcribed from the originals and re-shaped
// into the live `EBrochureContent` model; hero art is re-hosted on the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for the
// signed-in user via createPrintAsset().

import type { EBrochureContent } from "@/lib/print-assets.types";

import heroGenAi from "@/assets/print-heroes/dataforce/df-ebro-generative-ai.jpg.asset.json";
import heroCollection from "@/assets/print-heroes/dataforce/df-ebro-data-collection.jpg.asset.json";
import heroComputerVision from "@/assets/print-heroes/dataforce/df-ebro-computer-vision.jpg.asset.json";

export const DATAFORCE_EBRO_DIVISION_ID = "bm-product";

export type DataForceEbrochureSeed = {
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
  label: "Talk to DataForce",
  subhead:
    "All data is unique — dataforce@transperfect.com",
  url: "https://dataforce.ai",
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

export const DATAFORCE_EBROCHURES: DataForceEbrochureSeed[] = [
  {
    slug: "generative-ai-training-data-services",
    title: "Generative AI Training Data & Services",
    teaser:
      "Maximize data accuracy and relevance for generative AI models across speech, audio, text, image, and video.",
    tags: ["generative ai", "llm", "rlhf", "training data", "multimodal"],
    collection: "Generative AI & LLMs",
    sourceFile: "DataForce_GenerativeAI_EBro.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Generative AI Training Data & Services",
      summary:
        "Maximize data accuracy and relevance for generative AI models with customized data services across speech, audio, text, image, and video.",
      sections: [
        {
          heading: "The challenge",
          body: "Businesses of every size are using generative AI to solve complex problems, create novel designs, and produce unique content — but output quality is capped by data quality. Whether you are developing new foundational models such as large language models (LLMs) or customizing an existing model for a new use case, each organization faces its own data challenges across modalities.",
          bullets: [
            "Multimodal data needs: text, image, video, audio, and speech",
            "Demonstration and preference data required for precision tuning",
            "Relevance, toxicity, and legality must be controlled at scale",
          ],
        },
        {
          heading: "Our services",
          body: "DataForce delivers holistic AI/ML data services for tuning generative models: reinforcement learning from human feedback (RLHF) for LLMs, data relevance, data rating, data moderation, localization, audio data, and image and video data. Programs scale across text, text + image, text + video, and text + audio.",
          bullets: [
            "RLHF for style, tone, legality, and toxicity-free output",
            "Q&A pairs: prompt plus optimal output creation",
            "Ranking and evaluation of generated images and videos from prompts",
            "Image captioning, object relationships, and customized labeling",
            "Video summary, timestamping, MOS and MUSHRA audio evaluations",
          ],
        },
        {
          heading: "Foundational models",
          body: "Foundational models are large-scale machine learning models used as a starting point and then scaled for specificity. DataForce provides the scale and structure to build them: large-scale collection, reformatting, and post-processing across every modality.",
          bullets: [
            "Large-scale collection in text, audio, image, and video from varied sources",
            "Data reformatting, cleaning, and categorization",
            "Post-processing data at scale",
          ],
        },
      ],
      stats: [
        { label: "Collaborator network", value: "1M", unit: "+", caption: "Global contributor community" },
        { label: "Languages covered", value: "250", caption: "Across every service line" },
        { label: "Cities worldwide", value: "140", unit: "+", caption: "In 46 countries" },
        { label: "Enterprise trust", value: "Fortune 100", caption: "Trusted by top companies" },
      ],
      discover: {
        body: "Why DataForce?",
        bullets: [
          "Trusted by the top Fortune 100 companies",
          "Network of over 1,000,000 collaborators",
          "Coverage of 250 languages",
          "Presence in 140+ cities and 46 countries worldwide",
          "Protocol design and implementation",
          "Compliance and security including GDPR, SOC 2, ISO 20001, and HIPAA",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroGenAi.url, 40, 45),
    },
  },
  {
    slug: "scalable-data-collection-user-studies",
    title: "Scalable Data Collection for Unbiased Model Training and Testing",
    teaser:
      "Global, in-person or remote data collection and user studies from a 1.3 million-strong contributor community.",
    tags: ["data collection", "user studies", "asr", "tts", "bias mitigation"],
    collection: "Data collection & user studies",
    sourceFile: "DataForce_Data_Collection_User_Studies.pdf",
    content: {
      eyebrow: "eBrochure",
      title: "Scalable Data Collection for Unbiased Model Training and Testing",
      summary:
        "AI needs data to perform. DataForce is a scalable, secure platform and workforce for teams developing, improving, and growing AI products.",
      sections: [
        {
          heading: "Data collection",
          body: "Quality training data is necessary for machine learning models to work properly and without bias. We leverage a global community of 1.3 million contributors and proprietary data-labeling technology to maximize the efficiency, relevance, and diversity of data for AI models, supported by an extensive network of studios and offices.",
          bullets: [
            "Automatic speech recognition (ASR) and text-to-speech (TTS)",
            "Natural language processing (NLP) and computer vision",
            "DataForce Contribute mobile app and remote cloud recording",
            "State-of-the-art recording studios and onsite services",
          ],
        },
        {
          heading: "User studies",
          body: "Before your AI-powered product hits the market, it needs to be tested by humans. We collect data on how well your products and technology work — both in the real world and in targeted scenarios — using our global footprint to build a personalized study experience and capture the feedback you need.",
          bullets: [
            "Moderated, on-premises, and real-world environment studies",
            "Remote studies, questionnaires, and user experience research",
            "Piloted, situational, and custom study designs",
            "Focus on client feedback to improve machine learning models",
          ],
        },
        {
          heading: "Why DataForce",
          body: "Collection runs to client demographic and technical specifications, in our secure facilities, at remote locations, or on client premises — backed by TransPerfect, the world's largest provider of translation and technology services for global business.",
          bullets: [
            "Cutting-edge collection and labeling methods, including augmented reality",
            "Protocol design and implementation",
            "Quality assurance built to comply with client SLAs",
            "Compliance and security policies across every program",
          ],
        },
      ],
      stats: [
        { label: "Contributor community", value: "1.3M", caption: "Global, vetted collaborators" },
        { label: "Cities with offices", value: "120", unit: "+", caption: "Across 46 countries" },
        { label: "Languages covered", value: "250", unit: "+", caption: "Collection and annotation" },
        { label: "Study formats", value: "6", caption: "Moderated to fully remote" },
      ],
      discover: {
        body: "Collection modalities we support:",
        bullets: [
          "Text data collection at volume",
          "Speech and audio capture in studio or remote",
          "Image and video collection via Contribute",
          "Global user studies and onsite services",
          "Custom demographic and technical specifications",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroCollection.url, 38, 50),
    },
  },
  {
    slug: "multi-sensor-data-collection-and-labeling",
    title: "Efficient Multi-Sensor Data Collection and Labeling",
    teaser:
      "Computer vision solution brief: proprietary collection app, advanced labeling platform, and 3D point cloud annotation.",
    tags: ["computer vision", "3d point cloud", "annotation", "solution brief", "rlhf"],
    collection: "Computer vision",
    sourceFile: "DataForce_ComputerVision_SB_2.pdf",
    content: {
      eyebrow: "Solution brief",
      title: "Efficient Multi-Sensor Data Collection and Labeling",
      summary:
        "Integrate human touch while augmenting your AI model with the latest innovations — including 3D point cloud annotation for perception applications.",
      sections: [
        {
          heading: "Running out of data?",
          body: "In the rapidly evolving landscape of computer vision, robust high-quality training and measurement data is more critical than ever. Our proprietary collection app combines modern mobile cameras with a managed community of 1.3 million people ready to harvest images and video anywhere in the world, on any device.",
          bullets: [
            "Automatic image analysis and validation for guaranteed accuracy",
            "Geo-location and IP verification on every contribution",
            "Clean, relevant data collection tuned to your model",
          ],
        },
        {
          heading: "Labeling platform",
          body: "Our image and video labeling platform supports detailed, precise annotation for sophisticated models, and our newest 3D point cloud tool handles cuboid object detection and tracking, depth perception, and spatial awareness. Automated labeling, post-processing, and other productivity features eliminate up to 80% of human labeling time.",
          bullets: [
            "Image and video classification with multiple labels and custom attributes",
            "Object detection via bounding boxes, polygons, or points",
            "Semantic segmentation with superpixels, SAM, or poly2mask",
            "Frame-perfect video labeling at native resolution and frame rate",
            "Video interpolation between keyframes for faster throughput",
          ],
        },
        {
          heading: "Why DataForce",
          body: "A systematized human-in-the-loop approach surfaces the edge cases that boost model performance, backed by a skilled workforce, continuous tool updates, tailored workflows, and dedicated consultancy — priced for a high return on investment.",
          bullets: [
            "Accuracy and precision from a highly skilled workforce",
            "Regular tool updates to meet evolving industry standards",
            "Streamlined workflow and customization for fast scaling",
            "Time and resource savings across collection and annotation",
          ],
        },
      ],
      stats: [
        { label: "Human labeling time removed", value: "80", unit: "%", caption: "Via automation and post-processing" },
        { label: "Collection community", value: "1.3M", caption: "Managed global contributors" },
        { label: "Annotation modalities", value: "3D", caption: "Point cloud, image, and video" },
        { label: "Verification layers", value: "3", caption: "Analysis, geo-location, IP" },
      ],
      discover: {
        body: "What are you developing?",
        bullets: [
          "Robotics, surgical robotics, and medical imaging",
          "Autonomous vehicles, full self-driving, and last mile",
          "Computer vision manufacturing and agriculture",
          "Security applications and energy, oil, and gas",
          "Gaming and AR/VR experiences",
        ],
      },
      cta: CTA,
      heroMedia: hero(heroComputerVision.url, 42, 50),
    },
  },
];
