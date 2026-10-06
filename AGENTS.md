<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Admin menu lives only in `src/lib/admin-nav.ts` (ADMIN_NAV_GROUPS); AdminShell sidebar and AppShell Admin dropdown both render it — why: the two hand-kept lists had drifted apart.
- Admin pages outside the `/admin` layout (e.g. `admin_.canvas`) wrap in `RequireAdmin` from AdminShell — why: they skip the `/admin` gate otherwise.
- Approvals live on one page, `/approvals`: Brand (`approval_requests`), Modules (`custom_modules.review_status`), Sign templates (`sign_templates`); DB triggers enforce reviewer-only decisions — why: the old module queue read a table nothing wrote to.
- The Knowledge screens share the `KnowledgeTabs` strip (Entries / Ask Oracle / Oracle KB / Sources); `/admin/knowledge-hub` redirects to `/knowledge`. Why: seven overlapping menu items.
- Event, kiosk, signage and venue-map rules live in `src/lib/AGENTS.md`.

- Every html-to-image capture passes `includeQueryParams: true` — why: proxied images differ only by `?path=`, and without it every download reused the first image fetched.

- Print/PDF pages of another shape (letter, A4, tabloid, A3) render with `pageFit` on ScaledSlide: `PageFitBody` (src/components/slide/PageFit.tsx) picks the largest CSS zoom that keeps text unclipped, non-overlapping and graphics unshrunk — why: one generic relayout instead of per-page hand tuning; module-specific portrait layouts still go in `[data-portrait]` rules.

- Master decks: admins may add/remove/reorder slides (save guard + order trigger skip admins); "(cont.)" splits are refused for everyone; every master save first checkpoints the prior state via `checkpointMaster` (one per 10 min), and pruning keeps at least 3 — why: admins need full editing without losing a way back.
- Look explorer line looks render per-slide grounds in the browser from `src/lib/look-occupancy.json` (measured content map) via `src/lib/look-ground.ts` — why: backgrounds must avoid each slide's content; re-measure the map if master layouts change.

- Booth↔BoothHub pairing lives in `event_booths` (bundled `SF_BOOTH_FALLBACK` is offline-only); saved kiosks push PNG proofs to `booth_art`, served to BoothHub by `/api/public/booths/$event` — why: one list, and 3D always shows the latest saved art.
- Designer-supplied NEXT division templates join the registry only via `src/lib/next-supplied-templates.ts` (live desk files via `DIVISION_LIVE_SIGNS` with a `preview`) — why: the assets listing, division tiles and counts all read `loadNextRegistry()`, so one entry shows everywhere.
