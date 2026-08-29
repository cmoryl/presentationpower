# Migrating BoothHUB into the Element events area

## Short answer

Yes, it can be migrated — but not as a seamless copy-paste. I read the BoothHUB project. It is a much larger app than a single feature, and it is built on the older stack, so the migration is a staged port with a data import, not a file transfer.

## What BoothHUB actually contains

- 34 top-level screens, including 6 booth screens, 6 event screens, 4 expo/floor-plan screens, plus org portal, onboarding and admin.
- 96 components under booths / event / expo, and 45 files using 3D rendering (`three` / react-three-fiber) for the booth and hall viewers.
- Around 130 database tables in its own backend (booth systems and variants, booth assets and sprites, events, event assets and booths, expo floor plans, zones, placements, inventory, shipments, programs, venues, organizations and members, and more).
- ~100 backend functions (booth AI generation, floor-plan analysis, venue search, scoring, simulations, brand intelligence, and others).

## Why it is not a drop-in

1. **Different stack.** BoothHUB uses the classic React Router structure (`src/App.tsx` + `src/pages`). Element uses file-based routes under `src/routes`. Every screen needs its routing, data loading and head metadata rebuilt; the component bodies mostly survive.
2. **Different backend.** It has its own database and functions. Element's backend has none of those tables, so schema and rows both have to be recreated here.
3. **Backend functions must be re-homed.** Element runs server logic as in-app server functions, not standalone edge functions. Each function BoothHUB actually depends on has to be re-implemented on this side.
4. **Overlapping concepts.** BoothHUB already has `events`, `brands`, `organizations`, `profiles`, `user_roles`, `knowledge_entries`, `oracle_*` and `globallink_config` — and so does Element, with different shapes. These must be reconciled, not duplicated.
5. **Heavy 3D and mapping** (three.js, path tracer, Leaflet) needs to be loaded client-side only, since Element renders on the server first.

## Recommended approach: phased, not big-bang

**Phase 0 — Inventory and cut line (no code).**
Decide what actually moves. My recommendation: move booth systems/variants, booth assets, event↔booth links and the expo floor planner. Leave behind BoothHUB's duplicate brand-intelligence, oracle, knowledge and organization layers and point them at Element's existing equivalents.

**Phase 1 — Schema.**
Recreate only the retained tables in Element's backend under a `booth_` / `expo_` naming prefix, with row-level security and grants matching Element's role model (admin / brand_reviewer / sales / viewer). Map BoothHUB `organizations` to Element's division/brand-scope taxonomy rather than importing a second tenancy model.

**Phase 2 — Data import.**
Export the retained tables from BoothHUB, remap ids (owners, divisions, event references) and import. Copy stored files (booth renders, sprites, gallery photos, floor-plan artwork) into Element storage buckets and rewrite the URLs. Verify counts and spot-check records against the live BoothHUB app.

**Phase 3 — Screens.**
Port screens into `/events/booths/*` and `/events/floor-plan/*` as Element routes, restyled to the TransPerfect Element design system (tokens, Geist, approved palette) rather than pasting BoothHUB's look. 3D and map views load client-side only.

**Phase 4 — Backend logic.**
Re-implement the booth functions that the retained screens call, as Element server functions on the Lovable AI gateway. Anything unused gets dropped rather than ported.

**Phase 5 — Integration.**
Wire booths into the existing events hub: booth kits appear alongside signage, badges, screens and agendas; exports go through Element's existing print/PPTX/PDF pipeline; approvals go through Element's approvals flow.

## What I need from you before Phase 1

- Confirm the cut line: which of booths / expo floor planner / venue+inventory/logistics / booth AI generation are in scope, and which are dropped.
- Confirm that BoothHUB organizations collapse into Element divisions (recommended) rather than becoming a second tenancy system.
- Confirm whether BoothHUB stays live in parallel during the port, or is frozen at a cutover date.

## Realistic expectation

The booth catalog, variants, assets and event links are a clean, contained move. The expo floor planner and the 3D hall viewer are the expensive parts. Nothing here is blocked — it is a multi-stage project rather than a one-shot migration, and it is best done one phase at a time with a working app after each.
