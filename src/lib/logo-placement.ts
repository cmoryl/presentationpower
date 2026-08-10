import type { CSSProperties } from "react";

// Logo-placement contract for the slide chrome.
//
// Every rendered slide places the brand lockup in exactly one of these named
// zones. The zone is derived automatically from the slide's chrome variant
// (cover / content / divider / close) and can be overridden per layout
// framework or per module variant when a specific composition demands it.

export type LogoPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "hidden";

// Orientation of the brand lockup. The deck-wide default is limited to
// `horizontal | stacked`; the rotated + mark-only orientations below are
// per-slide options for editorial spreads, portrait features, and dense
// content slides where a full lockup would compete with the content.
export type LogoOrientation =
  | "horizontal"
  | "stacked"
  | "vertical-left"
  | "vertical-right"
  | "mark-only";
export type DeckLogoOrientation = "horizontal" | "stacked";
export type SlideLogoOrientationInput = LogoOrientation | "auto";

export const LOGO_ORIENTATION_META: Array<{ id: LogoOrientation; name: string; hint: string }> = [
  { id: "horizontal", name: "Horizontal", hint: "Side-by-side mark + wordmark (default)" },
  { id: "stacked", name: "Stacked", hint: "Mark above wordmark — covers, heroes" },
  { id: "vertical-left", name: "Vertical · left", hint: "Rotated −90°, pinned to the left edge" },
  {
    id: "vertical-right",
    name: "Vertical · right",
    hint: "Rotated +90°, pinned to the right edge",
  },
  { id: "mark-only", name: "Mark only", hint: "Monogram / symbol only, no wordmark" },
];

// Chrome variants align to SlideFrame's `variant` prop.
export type ChromeVariant = "cover" | "content" | "divider" | "close";

// Default approved placement per chrome variant. Content slides sit in the
// top-right so titles can breathe; covers center for the hero moment;
// dividers use the top-left flush with the section number; closes sign off
// bottom-right.
export const DEFAULT_LOGO_POSITION: Record<ChromeVariant, LogoPosition> = {
  cover: "top-center",
  content: "top-right",
  divider: "top-left",
  close: "bottom-right",
};

// Per-layout-framework overrides. Full-bleed / poster / editorial layouts
// need dedicated positions so the lockup never collides with hero media or
// oversized type.
export const LOGO_POSITION_BY_LAYOUT: Record<string, LogoPosition> = {
  "LF-05": "bottom-left", // Full-bleed media — logo tucks bottom-left over the image
  "LF-25": "top-left", // Editorial spread — flush with the kicker
  "LF-27": "bottom-left", // Portrait feature — logo under the narrative panel
  "LF-28": "bottom-center", // Poster type — centered signature under the block
  "LF-20": "bottom-center", // Quote focus — centered attribution area
  "LF-19": "top-center", // Logo wall — brand centered above the client logos
  "LF-24": "bottom-center", // Closing / CTA — centered sign-off
  "LF-29": "bottom-right", // Framed media — quiet corner
};

// Per-module-variant overrides. These beat the layout map, because a single
// layout framework (e.g. LF-05 full-bleed) is shared by modules whose type
// blocks sit in different places. Consulted by every surface — editor,
// present, share, print and PPTX export — so the lockup never drifts.
export const LOGO_POSITION_BY_VARIANT: Record<string, LogoPosition> = {
  // Full-bleed cover: title + meta stack occupies the lower-left, so the
  // lockup signs off in the clear upper-right corner instead.
  "MV-OP-COVER-MEDIA": "top-right",
};


export type LogoPlacementSpec = {
  position: LogoPosition;
  source: "layout-override" | "chrome-default" | "hidden";
  rationale: string;
};

// Resolve the effective placement for a given chrome variant and layout id.
// `layoutId` may be undefined for chrome that isn't tied to a specific LF
// (e.g. presenter mode); the chrome default is used in that case.
export function resolveLogoPlacement(
  chrome: ChromeVariant,
  layoutId?: string,
  override?: LogoPosition,
): LogoPlacementSpec {
  if (override) {
    return {
      position: override,
      source: "layout-override",
      rationale: "Explicit variant override",
    };
  }
  if (layoutId && LOGO_POSITION_BY_LAYOUT[layoutId]) {
    return {
      position: LOGO_POSITION_BY_LAYOUT[layoutId],
      source: "layout-override",
      rationale: `Layout ${layoutId} pins the lockup`,
    };
  }
  const pos = DEFAULT_LOGO_POSITION[chrome];
  return {
    position: pos,
    source: pos === "hidden" ? "hidden" : "chrome-default",
    rationale: `${chrome} chrome default`,
  };
}

// Absolute-position styles for a given zone. Insets are tuned so the lockup
// never collides with the locked footer (bottom band ≈ 40-70px) or the
// hairline brand bar (top 2px). Bottom zones sit ABOVE the footer with a
// visible gap; top zones stay tight against the hairline.
export function logoPositionStyles(position: LogoPosition): CSSProperties {
  const inset = { top: 48, bottom: 96, left: 64, right: 64 };
  switch (position) {
    case "top-left":
      return { position: "absolute", top: inset.top, left: inset.left };
    case "top-right":
      return { position: "absolute", top: inset.top, right: inset.right };
    case "top-center":
      return { position: "absolute", top: inset.top, left: "50%", transform: "translateX(-50%)" };
    case "bottom-left":
      return { position: "absolute", bottom: inset.bottom, left: inset.left };
    case "bottom-right":
      return { position: "absolute", bottom: inset.bottom, right: inset.right };
    case "bottom-center":
      return {
        position: "absolute",
        bottom: inset.bottom,
        left: "50%",
        transform: "translateX(-50%)",
      };

    case "hidden":
      return { display: "none" };
  }
}

// Metadata for the Atlas showcase.
export const LOGO_POSITIONS_META: Array<{ id: LogoPosition; name: string; typicalIn: string }> = [
  { id: "top-left", name: "Top left", typicalIn: "Dividers, editorial spreads" },
  { id: "top-center", name: "Top center", typicalIn: "Covers, logo walls" },
  { id: "top-right", name: "Top right", typicalIn: "Standard content (default)" },
  { id: "bottom-left", name: "Bottom left", typicalIn: "Full-bleed media, portrait feature" },
  {
    id: "bottom-center",
    name: "Bottom center",
    typicalIn: "Poster type, closing / CTA, quote focus",
  },
  { id: "bottom-right", name: "Bottom right", typicalIn: "Close / sign-off, framed media" },
  { id: "hidden", name: "Hidden", typicalIn: "Rare — reserved for full-bleed poster moments" },
];
