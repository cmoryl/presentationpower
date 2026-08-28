# TransPerfect I Element — Guidelines

## Components

The design system exports these components — import them from `@ws-j1cbjbusjjn6dms0imd9/c88f7719-c0c5-420f-915f-a154f8270b06` and compose them before building anything from scratch:

`Badge`, `Button`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle`, `Card`, `Input`, `Textarea`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-j1cbjbusjjn6dms0imd9/c88f7719-c0c5-420f-915f-a154f8270b06/design-system/element/styles/theme.css` (source — preferred import)
- `@ws-j1cbjbusjjn6dms0imd9/c88f7719-c0c5-420f-915f-a154f8270b06/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

