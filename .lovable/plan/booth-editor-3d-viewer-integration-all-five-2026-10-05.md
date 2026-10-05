# Booth editor + 3D viewer integration (all five)

Goal: the 3D booth always shows the live kiosk artwork, and editing, checking, approving and sharing a booth all happen from one place.

## 1. Shared booth registry (foundation)
- New table `event_booths`: event (`next-sf`), London booth id, BoothHub slug, display name, has-TV flag, 3D published flag, sort order.
- Seeded from today's 12 confirmed matches in `sf-kiosk-3d.ts`. Live Conference/Events and Commercial for Life Sciences stay unmatched until you name their BoothHub booth (no guessing).
- Public read through a narrow RPC so BoothHub can read the same list; editing is admin-only.
- `sf-kiosk-3d.ts`, the kiosk cards and the showcase read from this list, with the current hard-coded list kept as the offline fallback.

## 2. Live artwork feed to BoothHub
- When a kiosk revision is saved, render the front and both side strips to PNG (labelled as proofs, not print masters) and store them in storage.
- Public endpoint `/api/public/booths/next-sf/<slug>/art` returns signed image URLs and the revision number for the newest saved revision only (never drafts, no author data).
- BoothHub change (made in BoothHub, not here): fetch that endpoint and put the images on the 3D model's faces. I'll write the exact spec for it.

## 3. One booth workspace
- New route `/events/next/booth/$boothId`: kiosk layer editor on the left, live 3D view on the right (embedded BoothHub single-booth view), with a revision badge.
- Reload the 3D view after each save so the new artwork appears.
- "Open editor in new window" stays; cards get "Open booth workspace".

## 4. 3D check before release
- Add a "Checked in 3D" step to the kiosk release flow: the reviewer opens the 3D view, saves a snapshot, and ticks the check. Releasing is blocked until that's done.
- The snapshot shows next to the kiosk on `/approvals`.
- Existing `gateOnQa` print checks are unchanged and still required.

## 5. Smaller improvements
- 3D thumbnail (latest snapshot or proof) on each kiosk card.
- "Share 3D link" button: copies a direct single-booth link.
- If a booth's 3D isn't published in BoothHub yet, show "3D not published yet" instead of opening the old version.

## Technical details
- Migration: create `event_booths` and `booth_3d_checks` (booth, revision, snapshot path, checked_by, checked_at) → GRANT → ENABLE RLS → policies (admin and brand roles write, everyone signed in reads); `get_event_booths(event)` SECURITY DEFINER for anon; literal INSERT seed rows.
- Private bucket `booth-proofs`; signed URLs only.
- Public route checks the slug against the registry and returns only the revision in force.
- Workspace route: `ssr: false`, `useRequireSignIn`, own `head()`.
- BoothHub needs CORS-friendly JSON; the spec goes in `docs/BOOTHHUB-INTEGRATION.md`.
- Finish with `bunx tsgo --noEmit` and `bunx vitest run`; add tests for the registry fallback and the art endpoint shape.

## Needs from you
- BoothHub booths for Live Conference/Events and Commercial for Life Sciences, if they have one.
- The BoothHub side (step 2) has to be applied in that project.
