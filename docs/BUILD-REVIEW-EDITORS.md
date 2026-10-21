# Build review — duplicate editors (Oct 2026)

Goal: one master editor per kind of thing; every other screen is a read-only view that links to it.

## Venue maps

| Screen | What it did | Status |
| --- | --- | --- |
| `/events/next/maps/$eventId` (map editor) | Floors, looks, room colours, map text, SVG export | **Master** |
| SF event page — Venue meeting space | Hotel sheet + hand-placed colour boxes (`next-sf-venue-zones.ts`), its own look picker | **Done**: now shows the master map (same looks, colours, text) via `EventMapView`, with "Edit in map editor". Hotel sheet shows only if a floor has no saved map. |
| `/events/next/london/maps` | Issued QEII sheets + rebuilt plans (`LondonVenueSheets`, `QeiiFloorPlan`) + `LondonFloorMap` marker map + design/areas panels | **To merge**: London floors should load into the master editor as an event map set; keep the issued sheets as the read-only "as issued" look. |
| `/events/next/venue` (plan a city) | Reuses `LondonFloorMap` + London design/areas panels for a new city draft | **To merge**: new cities should open the master editor. |
| `/events/venues/$slug` | Venue library floors | Stays as the venue's source file store; colours/text belong to events. |

## Other overlaps found

| Area | Editors | Suggestion |
| --- | --- | --- |
| Signs / kiosks | `KioskLayerEditor` (kiosks, sign sets, signs, booths), `LondonPanelLiveEditor` (London panels), `MartSignEditor` (NEXT Mart pillars) | Move London panels and Mart signs onto `KioskLayerEditor` — it already serves four sign routes. |
| Backgrounds | `BackgroundSetEditor` (library sets), `BackgroundOverrideEditor` (per look), `ModuleBackgroundEditor` (per module in a look) | Different scopes; merge into one editor with a scope switch (set / look / module). |

Already single: deck slide editing, social assets (`SocialAssetEditor`), print library.
