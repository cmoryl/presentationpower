# BrandHub reference

Source files copied verbatim from the BrandHub project as reference. Not wired into this app.

- `KnowledgeBase.tsx` — original BrandHub FAQ / tutorials page. Depends on BrandHub-only
  components (`AppSettingsContext`, `AppBreadcrumbs`, `help/IconKitSection`,
  `help/BiasAccessibilitySection`, tutorial video assets, `react-router-dom`). Kept here
  outside `src/` so the build ignores it. Port piecewise if we want a similar page.

The Oracle hook (`src/hooks/useOracleBrain.ts`) was ported into the app directly — it
reads `oracle_intelligence` and `oracle_knowledge_base` (seeded from
`public/knowledge-export/database-seed.json`). The synthesis/add/delete actions call an
`oracle-brain` edge function that is not ported, so those are effectively read-only
until synthesis is rebuilt.
