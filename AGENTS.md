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
- Approvals live on one page, `/approvals`, with a Brand tab (`approval_requests`) and a Modules tab (`custom_modules.review_status`). DB triggers enforce reviewer-only decisions. Why: the old module queue read a table nothing wrote to.
- The Knowledge screens share the `KnowledgeTabs` strip (Entries / Ask Oracle / Oracle KB / Sources); `/admin/knowledge-hub` redirects to `/knowledge`. Why: seven overlapping menu items.
- Designer-supplied SF kiosk CMYK masters (SWOP v2) live in `src/assets/california-kiosks/cmyk/` and are served byte-for-byte via `next-california-kiosk-cmyk-masters.ts` — why: CMYK must never be re-rendered or converted by the app.
- SF kiosk side strips are native faces (`native.faces` + `kioskFaceLayout`), split one object per page from the native PDF and edited by the same editor/export path as the front; strip edits save under `<kiosk>--left|right` — why: one editor and one CMYK export path for every face.

- Legal NEXT signage templates (`legalnext-*` layouts in `src/lib/legal-next-signage-layouts.json`, registry `src/lib/legal-next-signage.ts`) reuse the kiosk layer editor/export via `layout.sign`, kept out of `KIOSK_LIVE_LAYOUTS` (use `liveLayoutById`) — why: one editor/export path, kiosk list stays kiosks only.
