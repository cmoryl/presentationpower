// DataForce — recreated spotlight library.
//
// Source: the blinded DataForce generative AI spotlight on query and response
// evaluation and ranking for an LLM chatbot. Copy was transcribed from the
// original PDF and re-shaped into the live `SpotlightContent` model; hero art is
// re-hosted on the CDN.
//
// Read-only seeds. "Create editable copy" writes one into `print_assets` for the
// signed-in user via createPrintAsset().

import type { SpotlightContent } from "@/lib/print-assets.types";

import heroLlmEval from "@/assets/print-heroes/dataforce/df-spotlight-llm-eval.jpg.asset.json";

export const DATAFORCE_SPOTLIGHT_DIVISION_ID = "bm-product";

export type DataForceSpotlightSeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  collection: string;
  tags: string[];
  sourceFile: string;
  content: SpotlightContent;
};

export const DATAFORCE_SPOTLIGHTS: DataForceSpotlightSeed[] = [
  {
    slug: "generative-ai-query-response-evaluation-ranking",
    title: "Query & Response Evaluation and Ranking for Generative AI Chatbot",
    teaser:
      "An offshore, screened annotation team double-evaluated every LLM prompt and response, with a third annotator as tie-breaker.",
    collection: "Generative AI & LLMs",
    tags: ["llm", "generative ai", "evaluation", "ranking", "annotation", "qa"],
    sourceFile: "DataForce_Generative_AI_Query_Response_Evaluation_Ranking.pdf",
    content: {
      eyebrow: "Spotlight",
      productName: "Query & Response Evaluation and Ranking",
      tagline: "Training a generative AI chatbot on relevance and accuracy",
      summary:
        "An international technology company needed a partner to train its LLM on the relevance and accuracy of prompt query and response interactions — with a qualified contributor pool that could analyze, categorize, and rank the data in detail.",
      capabilities: [
        {
          heading: "Query evaluation",
          body: "Every query was reviewed to confirm it is answerable before responses entered the ranking pipeline.",
        },
        {
          heading: "Response evaluation",
          body: "Each response was checked for correctness, understandability, and completeness against the client's rubric.",
        },
        {
          heading: "Response ranking",
          body: "Responses were ranked for naturalness and relevance to the original query, producing the preference data the model needed.",
        },
        {
          heading: "Sourced and screened team",
          body: "DataForce built an offshore team from its global network with the flexibility to add contributors as the project grew. Applicants were screened to confirm they could answer prompts from the perspective of someone living in the United States, then trained on detailed evaluation and ranking instructions.",
        },
        {
          heading: "Quality assurance by design",
          body: "Each query and response was evaluated and ranked twice to find agreement and yield the highest-quality data. When annotators disagreed, a third annotator was brought in as tie-breaker, and the disagreement rate itself became a live signal that a prompt was too difficult to reach an agreeable state.",
        },
      ],
      stats: [
        { label: "Independent evaluations per item", value: "2", unit: "×", caption: "Plus a third-annotator tie-break" },
        { label: "Evaluation goals", value: "3", caption: "Query, response, ranking" },
        { label: "Feedback loop", value: "Real time", caption: "Disagreement rate surfaced weekly" },
        { label: "Follow-on scope", value: "Multiple batches", caption: "Added after the initial pilot" },
      ],
      quote: {
        text: "Real-time feedback from the disagreement rate revealed when a posed question was simply too difficult to reach an agreeable state — so requirements could be refined mid-flight.",
        author: "DataForce project team",
        role: "Generative AI evaluation program",
      },
      expert: {
        name: "DataForce",
        role: "Generative AI data services",
        email: "dataforce@transperfect.com",
      },
      cta: { label: "Talk to DataForce", url: "https://dataforce.ai" },
      heroMedia: {
        imageUrl: heroLlmEval.url,
        aspect: "fill",
        heightPct: 38,
        focalY: 50,
      },
    },
  },
];
