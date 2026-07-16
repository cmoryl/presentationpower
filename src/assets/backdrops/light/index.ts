import light1 from "./light-01.jpg";
import light2 from "./light-02.jpg";
import light3 from "./light-03.jpg";
import light4 from "./light-04.jpg";
import light5 from "./light-05.jpg";
import light6 from "./light-06.jpg";

/**
 * White-mode imagery set — near-white, high-key backdrops used for library
 * previews and slide chrome when the mode is "light". Shared across brands
 * so light mode reads consistently airy; brand accent still comes through
 * via the SlideChrome tint.
 */
export const LIGHT_IMAGERY = {
  photos: [light1, light2, light4, light5],
  abstracts: [light3, light6, light2, light1],
} as const;

export const LIGHT_TINT = "#FFFFFF";
