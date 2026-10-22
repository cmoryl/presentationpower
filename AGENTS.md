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

- Admin menu lives only in `src/lib/admin-nav.ts` (ADMIN_NAV_GROUPS); AdminShell sidebar and AppShell Admin dropdown both render it; who sees which main-menu entry is decided only in `src/lib/role-nav.ts` — why: hand-kept lists drift.
- Admin pages outside the `/admin` layout (e.g. `admin_.canvas`) wrap in `RequireAdmin` from AdminShell — why: they skip the `/admin` gate otherwise.
- Approvals live on one page, `/approvals`: Brand (`approval_requests`), Modules (`custom_modules.review_status`), Sign templates (`sign_templates`); DB triggers enforce reviewer-only decisions — why: the old module queue read a table nothing wrote to.
- The Knowledge screens share the `KnowledgeTabs` strip (Entries / Ask Oracle / Oracle KB / Sources); `/admin/knowledge-hub` redirects to `/knowledge`. Why: seven overlapping menu items.
- Event, kiosk, signage, venue-map and logo extraction/viewer rules live in `src/lib/AGENTS.md`.

- Every html-to-image capture passes `includeQueryParams: true` — why: proxied images differ only by `?path=`, and without it every download reused the first image fetched.

- Print/PDF pages of another shape (letter, A4, tabloid, A3) render with `pageFit` on ScaledSlide: `PageFitBody` (src/components/slide/PageFit.tsx) picks the largest CSS zoom that keeps text unclipped, non-overlapping and graphics unshrunk — why: one generic relayout instead of per-page hand tuning; module-specific portrait layouts still go in `[data-portrait]` rules.

- Master decks: admins may add/remove/reorder slides (save guard + order trigger skip admins); "(cont.)" splits are refused for everyone; every master save first checkpoints the prior state via `checkpointMaster` (one per 10 min), and pruning keeps at least 3 — why: admins need full editing without losing a way back.
- Look explorer line looks render per-slide grounds in the browser from `src/lib/look-occupancy.json` (measured content map) via `src/lib/look-ground.ts` — why: backgrounds must avoid each slide's content; re-measure the map if master layouts change.

- Learning loop: edits, approvals, reports, design/number fixes, MCP slide edits, module/print/event decisions and debriefs log best-effort to `learning_signals`; admins distill them on `/approvals?tab=learning` into `learning_suggestions`; only approved ones become `knowledge_entries` (tag `learned`) or, for events, `event_venue_knowledge` (source `learned`) — why: the system grows from use while admins keep brand control.

- Every AI model id lives only in `src/lib/ai-models.ts` (AI_MODELS by area); candidates are compared with `scripts/model-bakeoff.py` before switching — why: per-file model strings had drifted behind.
- Print library rules live in `src/lib/print-library/AGENTS.md`.
- Sign-in is deny-by-default (open list in `src/lib/sign-out.ts`); gated pages render nothing until a session is confirmed — why: the published audience is public.
- Sign-up is limited to @transperfect.com (plus the shared team account) by the `enforce_signup_domain` trigger on auth.users — why: the UI alone can be bypassed.
- `generate_deck` is retry-safe via `deck_jobs` (key = hash of user + inputs; `get_deck_job`) — why: retries made duplicate decks.
- `compliance-check.ts` flags unsourced figures/banned words (`/admin/needs-source`); `approved-figures.ts` is the one matcher every check, export and the generator use — why: invented stats, and editor/export must agree.

- Brand colours live only in `src/lib/brand-colors.ts`; CSS tokens are generated into `src/styles/brand-tokens.css` (`bun scripts/gen-brand-css.ts`) and feeders import it; parity tests block drift — why: one change must reach every format.

- Send to Canva: one shared team account, tokens only in service-role `canva_shared_connection`; sends the export page's checked .pptx — why: one QA-gated file for PowerPoint and Canva.
- Live editors pin their artwork preview with the `editor-pin` utility (src/styles.css; sits under the AppShell header via `--app-header-h`, extra offset via `--editor-pin-offset`) — why: long settings columns scrolled the preview out of view.
