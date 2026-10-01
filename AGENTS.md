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
