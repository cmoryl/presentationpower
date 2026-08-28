# TransPerfect Element design system

TransPerfect Element is a precise, modular system for enterprise presentation, print, and brand-governance products. Interfaces should feel assured and editorial rather than decorative: strong information hierarchy, generous but purposeful space, crisp alignment, and restrained use of brand accents.

## Core requirements

- Build React 19 components with TypeScript and Tailwind CSS v4.
- Import the canonical theme once from `@/design-system/element/styles/theme.css`.
- Import public components from `@/design-system/element` or its local component paths. Do not reach into application routes, backend integrations, or product-only helpers.
- Use semantic tokens and token-backed utilities for colors, typography, radius, shadows, and spacing. Never hardcode brand colors in component code.
- Geist Variable is the default sans-serif face and Geist Mono Variable is the monospace face. The font files are supplied by the packaged `@fontsource-variable` dependencies; do not replace them with remote font URLs.
- Use the TransPerfect enterprise palette as the default. Blue is the principal action color. Aqua and lavender are secondary accents and should remain a small portion of the composition. Tertiary colors are deliberate data or status signals, not decoration.
- The product name is **TransPerfect Element**. “Modular Design System” is a descriptor, never part of the product name.

## Component conventions

Every public component must have a PascalCase named export and a named props interface. Components forward refs, accept and merge `className`, spread native element props, and take content through `children` or explicit slots. Visual choices use fixed `variant` and `size` options with defaults; do not introduce one-off booleans such as `primary` or `large`.

Prefer composition over duplication:

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/design-system/element";

export function ApprovalPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review ready</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Approve</Button>
      </CardContent>
    </Card>
  );
}
```

Do not create raw styled buttons when `Button` fits. Do not put cards inside cards or use cards as generic page-section wrappers. Keep page sections unframed and reserve cards for discrete repeated items, tools, and dialogs.

## Accessibility

- Use semantic HTML elements and native interaction behavior.
- All controls must be keyboard reachable with a visible focus treatment.
- Icon-only controls require an accessible name and a tooltip when the symbol is not universally understood.
- Labels must be programmatically associated with their inputs.
- Preserve WCAG AA contrast for text and meaningful graphics in light and dark contexts.
- Motion must respect `prefers-reduced-motion`.

## Visual language

Use a compact radius, controlled shadows, and clear surface separation. Body typography uses comfortable leading; headings use a tight line height without negative letter spacing in application UI. Avoid ornamental gradients, floating color blobs, excessive pills, and monochromatic blue layouts. Brand imagery and logos must remain undistorted, unrecolored, and clear of complex backgrounds.

See the generated design-token and component references in the Design System tab for the current catalog and supported APIs.