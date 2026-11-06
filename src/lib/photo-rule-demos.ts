// Maps a brand-guide photography rule (do or don't) to a visual demonstration
// kind rendered by PhotoRuleVisual. Matching is keyword-based so a rule with no
// explicit demo still gets the closest visual; unmatched rules fall back to a
// plain photography panel with a do/don't badge.

export type PhotoRuleDemo =
  | "real-people"
  | "soft-light-dof"
  | "open-space"
  | "gradient-wash"
  | "product-first"
  | "humans-in-frame"
  | "clean-surfaces"
  | "legible-crop"
  | "consent-privacy"
  | "stock-cliche"
  | "no-recolor-skin"
  | "scrim"
  | "logo-placement"
  | "no-ai-stock"
  | "off-brand-ui"
  | "illegible-crop"
  | "no-sterile-stock"
  | "no-false-claim"
  | "color-not-approval"
  | "no-invented-chart"
  | "generic-photo";

type Matcher = { pattern: RegExp; demo: PhotoRuleDemo };

// Order matters: the first matching pattern wins. Don't-specific patterns are
// checked before do-patterns so a shared word ("legible", "consent") lands on
// the violation visual when the rule is a prohibition.
const MATCHERS: Matcher[] = [
  { pattern: /stock clich|handshake|globe|floating binary|staged boardroom/i, demo: "stock-cliche" },
  { pattern: /recolou?r skin|saturation/i, demo: "no-recolor-skin" },
  { pattern: /scrim|busy area|busy part/i, demo: "scrim" },
  { pattern: /logo over|complex part/i, demo: "logo-placement" },
  { pattern: /ai stock|synthetic ai|ai imagery|glowing|robot|android|neural/i, demo: "no-ai-stock" },
  { pattern: /off-brand colou?r|product palette/i, demo: "off-brand-ui" },
  { pattern: /stops being legible|crop a product screen/i, demo: "illegible-crop" },
  { pattern: /sterile|gloved hands|vial/i, demo: "no-sterile-stock" },
  { pattern: /imply .*outcome|cannot support/i, demo: "no-false-claim" },
  { pattern: /green as a badge|regulatory approval/i, demo: "color-not-approval" },
  { pattern: /invent a chart|no dataset/i, demo: "no-invented-chart" },
  { pattern: /consent|identifiable|privacy/i, demo: "consent-privacy" },
  { pattern: /real people|collaboration|hands on screens|contributor network|annotator|recording rig|real clinical|real workspaces/i, demo: "real-people" },
  { pattern: /soft .*light|depth of field/i, demo: "soft-light-dof" },
  { pattern: /open space|clear of faces/i, demo: "open-space" },
  { pattern: /gradient wash|soft-transition/i, demo: "gradient-wash" },
  { pattern: /lead with the product|real ui|connector map|dashboard/i, demo: "product-first" },
  { pattern: /people alongside|person in the frame|human-first|show humans/i, demo: "humans-in-frame" },
  { pattern: /light and uncluttered|surfaces light/i, demo: "clean-surfaces" },
  { pattern: /legible|readable metric/i, demo: "legible-crop" },
];

/** Pick the visual demonstration for a photography rule line. */
export function inferPhotoRuleDemo(rule: string): PhotoRuleDemo {
  for (const { pattern, demo } of MATCHERS) {
    if (pattern.test(rule)) return demo;
  }
  return "generic-photo";
}
