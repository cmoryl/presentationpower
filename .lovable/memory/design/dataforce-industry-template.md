---
name: DataForce industry template (R03)
description: R03 is DataForce's own industry template; saved tpl- looks override the DataForce colour lock
type: design
---
- R03 lists as **"DataForce · AI & Data Signature"** (reference `DATAFORCE PRODUCT PACK · …`)
  via `OWNED_LOOK_IDENTITY` in `src/lib/industry-skins.ts`. It sits in the Industry
  family of Template Studio (`/looks`), so palette, fields and per-section
  backgrounds are tuned exactly like R01–R30.
- `lookOwnerAccent` / `lookGlyphColor` (`src/lib/look-brand.ts`) only lock the
  **shipped** catalog pack (`skin-r03`). Any admin-saved look (`tpl-…`) owns its own
  palette, so accent edits no longer appear to revert in preview or PPTX export.
