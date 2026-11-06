// Visual demos for brand-guide governance rules.
// Every logo rule in every brand guide gets a visual demonstration, not just
// text: do-rules show the correct treatment, don't-rules show the violation
// applied to the guide's own logo artwork (CSS transforms/filters only — the
// artwork files themselves are never altered). Rendered by
// src/components/brand/LogoRuleVisual.tsx.

export type LogoRuleDemo =
  | "variant-by-background" // do: pick the lockup variant that fits the ground
  | "clear-space" // do: hold the clear-space zone
  | "min-size" // do: respect minimum sizes
  | "vector-crisp" // do: use supplied vectors, never re-trace/screenshot
  | "approved-colors" // do: approved colour variants only
  | "recolor" // don't: recolour/tint/gradient the lockup
  | "respace" // don't: rebuild, re-space or reorder the lockup
  | "distort" // don't: stretch, skew or rotate
  | "effects" // don't: shadows, glows, outlines, keylines
  | "flip" // don't: mirror the artwork
  | "typeface" // don't: re-set the wordmark in another face
  | "low-contrast" // don't: colour lockup on a low-contrast field
  | "busy-bg" // don't: place over complex/busy backgrounds
  | "mix-lockups"; // don't: cram two division lockups into one zone

const MATCHERS: [RegExp, LogoRuleDemo][] = [
  [/mix (two )?.*lockup|two division/i, "mix-lockups"],
  [/variant.*background|background.*variant|pick the variant/i, "variant-by-background"],
  [/clear.?space/i, "clear-space"],
  [/minimum size|min\.? size|respect minimum/i, "min-size"],
  [/vector|re-?trace|screenshot|supplied (file|artwork|vector)/i, "vector-crisp"],
  [/approved colou?r|off-brand colou?r/i, "approved-colors"],
  [/recolou?r|tint|gradient (the|on) (logo|lockup)/i, "recolor"],
  [/re-?space|rebuild|reorder|resize|restack|re-?typeset/i, "respace"],
  [/rotate|skew|distort|stretch|arc/i, "distort"],
  [/effect|keyline|shadow|glow|outline|stroke|bevel/i, "effects"],
  [/flip|mirror/i, "flip"],
  [/typeface|font/i, "typeface"],
  [/low.?contrast/i, "low-contrast"],
  [/complex background|busy|over imagery|over (a )?photo/i, "busy-bg"],
];

/** Map a rule's text to a visual demo. Returns null when nothing matches —
 *  the card then renders text only. */
export function inferLogoRuleDemo(title: string, description = ""): LogoRuleDemo | null {
  const text = `${title} ${description}`;
  for (const [re, demo] of MATCHERS) if (re.test(text)) return demo;
  return null;
}

/** Resolve the demo for a rule: an explicit `demo` field wins, otherwise the
 *  title/description are matched. */
export function logoRuleDemo(rule: {
  title: string;
  description?: string;
  body?: string;
  demo?: LogoRuleDemo;
}): LogoRuleDemo | null {
  return rule.demo ?? inferLogoRuleDemo(rule.title, rule.description ?? rule.body ?? "");
}
