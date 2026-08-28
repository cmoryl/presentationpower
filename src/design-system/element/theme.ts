/**
 * The Element theme as plain token maps.
 *
 * `styles/theme.css` remains the canonical stylesheet — these objects mirror
 * the same values so a consumer can scope the theme to a subtree (a preview
 * pane, a themed island, an embedded widget) by spreading them onto an inline
 * `style`, without the document root having to carry the tokens.
 */
export type ElementThemeTokens = Record<`--${string}`, string>;

export const ELEMENT_LIGHT: ElementThemeTokens = {
  "--radius": "0.625rem",
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.1371 0.0889 271.22)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.1371 0.0889 271.22)",
  "--primary": "oklch(0.42 0.24 265)",
  "--primary-foreground": "oklch(0.99 0 0)",
  "--secondary": "oklch(0.968 0.007 247.896)",
  "--secondary-foreground": "oklch(0.1371 0.0889 271.22)",
  "--muted": "oklch(0.968 0.007 247.896)",
  "--muted-foreground": "oklch(0.554 0.046 257.417)",
  "--accent": "oklch(0.9311 0.0863 193.97)",
  "--accent-foreground": "oklch(0.1371 0.0889 271.22)",
  "--destructive": "oklch(0.611 0.2068 29.48)",
  "--destructive-foreground": "oklch(0.99 0 0)",
  "--border": "oklch(0.929 0.013 255.508)",
  "--input": "oklch(0.929 0.013 255.508)",
  "--chart-1": "oklch(0.42 0.24 265)",
  "--chart-2": "oklch(0.9311 0.0863 193.97)",
  "--chart-3": "oklch(0.7774 0.1318 298.81)",
  "--chart-4": "oklch(0.9316 0.1527 100.8)",
  "--chart-5": "oklch(0.7837 0.1331 43.69)",
  "--sidebar": "oklch(0.984 0.003 247.858)",
  "--sidebar-foreground": "oklch(0.1371 0.0889 271.22)",
  "--ring": "oklch(0.42 0.24 265)",
};

export const ELEMENT_DARK: ElementThemeTokens = {
  "--radius": "0.625rem",
  "--background": "oklch(0.1371 0.0889 271.22)",
  "--foreground": "oklch(0.9288 0.0196 260.17)",
  "--card": "oklch(0.1744 0.0701 276.31)",
  "--card-foreground": "oklch(0.9288 0.0196 260.17)",
  "--primary": "oklch(0.6153 0.181 264.37)",
  "--primary-foreground": "oklch(0.1371 0.0889 271.22)",
  "--secondary": "oklch(0.2136 0.0898 276.53)",
  "--secondary-foreground": "oklch(0.9288 0.0196 260.17)",
  "--muted": "oklch(0.2136 0.0898 276.53)",
  "--muted-foreground": "oklch(0.7511 0.0316 260.17)",
  "--accent": "oklch(0.2614 0.104 276.44)",
  "--accent-foreground": "oklch(0.9311 0.0863 193.97)",
  "--destructive": "oklch(0.611 0.2068 29.48)",
  "--destructive-foreground": "oklch(0.9612 0 89.88)",
  "--border": "oklch(1 0 0 / 12%)",
  "--input": "oklch(1 0 0 / 16%)",
  "--chart-1": "oklch(0.6153 0.181 264.37)",
  "--chart-2": "oklch(0.9311 0.0863 193.97)",
  "--chart-3": "oklch(0.7774 0.1318 298.81)",
  "--chart-4": "oklch(0.9316 0.1527 100.8)",
  "--chart-5": "oklch(0.7837 0.1331 43.69)",
  "--sidebar": "oklch(0.1744 0.0701 276.31)",
  "--sidebar-foreground": "oklch(0.9288 0.0196 260.17)",
  "--ring": "oklch(0.6153 0.181 264.37)",
};
