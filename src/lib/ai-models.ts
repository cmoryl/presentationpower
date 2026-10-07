// Single source of truth for which AI model each area of Element uses.
// Change a model here, never in a feature file. Values are the current
// production picks; candidates are compared side-by-side before switching
// (see scripts/model-bakeoff.py).
export const AI_MODELS = {
  /** Presentation Agent (deck builder). Won the Oct 2026 bake-off: no invented figures. */
  deckAgent: "openai/gpt-6-astra",
  /** Kit / print agents: planning, layout picks, writing. */
  agent: "google/gemini-3.6-flash",
  /** Quick one-shot jobs: slide fixes, re-fits, tidy-ups, extraction. */
  quick: "google/gemini-2.5-flash",
  /** Very cheap high-volume jobs. */
  lite: "google/gemini-2.5-flash-lite",
  /** Slide pictures and imagery. */
  image: "openai/gpt-image-2",
  /** Look / skin backgrounds. */
  backdrop: "google/gemini-3.1-flash-image",
} as const;

export type AiModelArea = keyof typeof AI_MODELS;
