# Harden TransPerfect Element as a local design-system library

## Goal
Make the existing converted application publishable as a local React/Tailwind design-system library without breaking its 161 product routes, editors, exports, or backend integrations.

## What the audit confirmed
- This is a local, app-shaped TanStack project, not a wrapper around an upstream npm design-system package.
- Geist is already bundled through `@fontsource-variable/geist`; there is no Google Fonts import for Geist to remove.
- Current dependency ranges support application maintenance and should not be converted wholesale to exact npm-wrapper pins.
- A root library barrel, design-system metadata, source extraction config, and attach exclusions are missing.
- The current UI/slide surface is highly coupled across `components`, `lib`, `hooks`, `assets`, and backend integrations, so exporting the whole app as a component barrel would ship broken consumer imports.

## Implementation
1. **Add library classification**
   - Create `lovable.toml` with `tech_stack = "custom_design_system_tanstack"`.
   - Create `.lovable/meta.yaml` as React + Tailwind + local source + `custom_design_system` starter.
   - Create `.lovable/system.md` documenting TransPerfect Element’s brand rules, token-only styling, Geist typography, accessibility, and consumer import conventions.

2. **Create a self-contained consumer surface**
   - Add `src/design-system/element/` containing the canonical theme entry, local `cn()` helper, and an initial set of foundational components copied/adapted from the working UI layer.
   - Keep component APIs typed, ref-forwarding, className-composable, semantic, and variant-driven.
   - Ensure this subtree imports nothing from routes, backend integrations, hooks, or app-only `src/lib` modules.

3. **Add the attach barrel and extraction map**
   - Create `src/index.ts` that re-exports only the self-contained Element library surface.
   - Create `.lovable/sources.yaml` pointing token extraction at the canonical theme CSS and component extraction at `src/index.ts`.
   - Add `.dsignore` only for extra preview/application exclusions not already covered by platform defaults; do not exclude anything re-exported by the barrel.

4. **Keep the application operational**
   - Re-point matching foundational UI imports to the canonical library components where this is low-risk, leaving feature-specific slide, print, export, auth, and backend code app-local.
   - Keep all routes and existing visual/editor surfaces intact; no router or backend changes.

5. **Validate**
   - Confirm every barrel export resolves from inside the self-contained subtree.
   - Run focused component tests and inspect the build diagnostics.
   - Browser-check representative dashboard, module-library, and deck-editor routes to ensure the extraction introduced no visual or runtime regression.

## Technical note on rejected reviewer assumptions
- Do not add a missing "upstream design-system dependency": this library is locally authored.
- Do not add `upstream_package`, `stack_packages`, or npm-source paths to metadata.
- Do not convert all package ranges to exact pins; that requirement applies to npm wrappers and would create unnecessary dependency churn here.
- Do not replace packaged Geist with remote font loading; the current local font package is the more reliable consumer-safe implementation.
