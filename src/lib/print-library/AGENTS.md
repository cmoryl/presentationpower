# Print library

- Curated print pieces with a supplied PDF render in "Original layout" (`content.layoutMode/original`, data from `scripts/lifesci-original-extract.py` → `src/lib/print-library/lifesci-original-layouts.json`, drawn by `OriginalPageLayout`); the library-layout fields stay in the same content — why: page-for-page fidelity while the cascade keeps reading the structured copy.
- Print library Company / Product filters read `src/lib/print-library/item-tags.ts` (entry's own `company`/`product`, else names it carries, else "Not tagged") — why: one tagging rule for the library and the admin catalogue, never guessed.
