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
- Master modules is a projection of the existing registries, not a new renderer: social choices inherit print master overrides; registered slide renderers own every shipped variant; retirement checks explicit saved references, while database snapshots restore content without bypassing review — why: one governance view must not duplicate authorities or silently overwrite saved work.
- The Knowledge screens share the `KnowledgeTabs` strip (Entries / Ask Oracle / Oracle KB / Sources); `/admin/knowledge-hub` redirects to `/knowledge`. Why: seven overlapping menu items.
- Event, kiosk, signage, venue-map and logo extraction/viewer rules live in `src/lib/AGENTS.md`.
- San Juan Bowl lettering, logo, guide and brand-kit rules live in `src/components/events/AGENTS.md`.
- Rules for the supplied-file splitter scripts live in `scripts/AGENTS.md`.
- Bowl announced event facts live in `SJB_EVENT`; event registry readiness carries source links rendered by the shared event home — why: directory and overview must agree without duplicating dates or losing provenance.
- Bowl event brand navigation lives in the existing event registry and links to the shared kit/guide bodies; event-home logo guidance reads `SJB_LOGO_RULES` — why: discoverability must not create a second brand authority.

- Every html-to-image capture passes `includeQueryParams: true` — why: proxied images differ only by `?path=`, and without it every download reused the first image fetched.
- Manual Bowl billboard refreshes resolve cleaned immutable asset pointers through sjb-billboard-refresh for originals and scene composites — why: downloads, enlargement and both shared pages must show the same saved Canva pixels without stale cache.

- The corporate deck style is Spectrum (Nov 2026 style guide): spec constants in `SPECTRUM` (src/lib/brand-colors.ts) + `src/lib/spectrum-style.ts`, applied through skin-s06: canvas-only ground (no photo plates/backdrops), frost-card vars, gradient icon tiles/StatFigure, `useSpectrumNumerals` marking hand-drawn figures, and scoped rules in `src/styles/spectrum-pack.css`; sales/agent/division specs coerce to it and the dark corporate look is retired — why: one approved corporate style, no dark corporate pages.
- Spectrum module sweeps enumerate taxonomy variants through the existing dev contact sheet; family-owned full-bleed variants use SpectrumPhotoLayout only in Spectrum, and /library/audit displays recorded measured results with explicit unverified checks — why: preserve renderer authority and never confuse automated checks with full guide certification.
- The living Spectrum reference at /library/spec derives values from brand-colors and spectrum-style through spectrum-spec; guide rules carry source pages and unspecified units remain explicit — why: clickable references must not become a second palette authority or certify implementation.
- Targeted Spectrum typography corrections are scoped through SPECTRUM_REPAIRED_MODULES; family renderers retain layout ownership — why: applying new line metrics to already-passing modules caused regressions.

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
- Corporate icon variants resolve from supplied SVG asset pointers in the division-logo registry, independently of wordmarks and app favicons — why: substituting the app icon changes the approved artwork.

- Send to Canva: one shared team account, tokens only in service-role `canva_shared_connection`; sends the export page's checked .pptx — why: one QA-gated file for PowerPoint and Canva.
- Live editors pin their artwork preview with the `editor-pin` utility (src/styles.css; sits under the AppShell header via `--app-header-h`, extra offset via `--editor-pin-offset`) — why: long settings columns scrolled the preview out of view.
- SF post-event reviews reuse private `event_photos` under `san-francisco`, issued `SF_VENUE` facts and the existing learning approval loop; sources, rights and missing outcomes remain explicit — why: research must not become marketing clearance or approved venue knowledge by implication.
- NEXT visual examples share one gallery across the master guide and kit: staff photos stay in private signed storage, partner shares show registry artwork only, and withdrawn rows stay excluded — why: actual installations must not be confused with proofs or expose uncleared attendee photos.
- Brand-kit PDFs use one section model/layout/export control with brand-specific adapters; prepare before Save, preserve issued originals, link absolute published assets, and never export private photos or hidden Bowl sections — why: selective public downloads must remain branded, consistent and browser-safe.
- Brand-kit PDF usage comparisons keep Do on the left and Don't on the right, reserve each visual pair together, and place clear-space guidance before rules/examples and logo downloads after them — why: readers must compare the same logo topic without hunting between pages.

- Brand-kit section navigation uses the shared BrandKitSectionNav with existing section anchors; conditional guide sections supply only rendered destinations — why: visual navigation must stay consistent without duplicating guide content.

- Online guide application examples share BrandApplicationExamples with brand-specific artwork adapters; keep approved logo files intact and label studies separately from production masters — why: every guide must illustrate the same surfaces without inventing brand artwork or print approval.

- Bowl social pages share the Canva snapshot gallery registry; preserve actual artboard sizes and distinguish unsaved drafts from saved originals — why: a parallel native renderer and assumed sizes misrepresent the Canva artwork.
- Set 5 reusable artwork uses the shared `sjb-set5-assets` registry and asset page under both app/share URLs; CDN originals and lightweight previews stay separate — why: public viewing must not resize downloads or alter saved Canva designs.
- Standalone Set 5 variations enter through `sjb-set5-variety` with `variety-` IDs, native and enlarged downloads labelled separately; they do not belong to existing ZIP packs — why: deletion must not hide unrelated packs or misrepresent generated detail.
- Set 5 high-resolution backgrounds enter that registry through `sjb-set5-hires`; preserve recovered Canva media separately from AI-edited rebuilds and record actual source/export dimensions — why: a larger download must never be represented as recovered native detail.
- Set 5 gallery deletions persist as admin-only RLS-protected removal records; both pages filter them and omit affected static ZIP packs, preserving source/Canva files — why: registry media is shared immutable artwork, not disposable storage.
- Every Bowl social/billboard refresh from Canva must strip export metadata (XMP `ContainsAiGeneratedContent`, IPTC `DigitalSourceType`, EXIF) from the downloadable files before publishing — why: social platforms read that metadata and auto-tag posts as AI-made.
- LogoHub web checks: a daily cron calls `/api/public/hooks/logo-scrub` (token in service-role-only `internal_job_tokens`), which re-checks logos unchecked for 30 days via Firecrawl and only flags changes into `logo_update_checks`, reviewed on `/approvals?tab=logos` — why: logos are never replaced without an admin.
