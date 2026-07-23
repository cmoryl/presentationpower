
## Goal

Consolidate scattered admin surfaces behind a proper sidebar-driven Admin console. Analytics disappears from the top nav and becomes one Admin section that unifies usage / AI / imagery. Knowledge disappears from the footer and becomes one Admin section that unifies browse / ask / KB / approvals.

## What changes

### 1. Top-level nav cleanup (`src/components/AppShell.tsx`)

- Remove `Analytics` from the header nav row.
- Remove `Knowledge` and `Ask Oracle` from the footer nav (footer keeps About + FAQ only).
- Trim the Admin hover menu to the new sidebar's top-level groups so it hints at structure without duplicating it.

### 2. New AdminShell — left sidebar layout (`src/components/AdminShell.tsx`)

Replace the horizontal tab strip with a collapsible left sidebar (shadcn `Sidebar` with `collapsible="icon"`, active-route highlight via `useRouterState`). Groups:

```text
Overview       → /admin
Analytics      → /admin/analytics          (master)
Knowledge      → /admin/knowledge          (master, replaces /admin/knowledge browser)
Assets         → Brand assets · LogoHub · Icon Studio · PDF ingest
Translation    → Translation · GlobalLink · GlobalLink Share
Governance     → Users · Approvals · Audit log
Experiments    → A/B color testing
```

Session/role banner stays but slides to the top of the content pane instead of hovering above the strip. Sidebar remembers collapsed state via the existing sidebar cookie.

### 3. Master Analytics — `/admin/analytics`

New route file. In-page tab switcher (Usage · AI · Imagery). Each tab renders a panel component extracted from the existing route body:

- Usage panel: extracted from `src/routes/analytics.tsx` (hero trimmed, AppShell removed — it's already inside AdminShell).
- AI panel: current body of `src/routes/admin.ai.tsx`.
- Imagery panel: current body of `src/routes/admin.imagery-analytics.tsx`.

Existing routes become thin redirects:

- `/analytics` → `/admin/analytics?tab=usage`
- `/admin/ai` → `/admin/analytics?tab=ai`
- `/admin/imagery-analytics` → `/admin/analytics?tab=imagery`

### 4. Master Knowledge — `/admin/knowledge`

Rebuild the existing `admin.knowledge.tsx` shell into a hub with tabs (Browse · Ask Oracle · Oracle KB · Approvals). Each tab renders a panel:

- Browse panel: extracted from `src/routes/knowledge.index.tsx` body (drop AppShell).
- Ask Oracle panel: extracted from `src/routes/knowledge.ask.tsx` body.
- Oracle KB panel: current `admin.oracle.tsx` body.
- Approvals panel: current `admin.approvals.tsx` body.

The current `/admin/knowledge` browser view moves into the KB-management tab so nothing is lost.

Redirects:

- `/knowledge` → `/admin/knowledge?tab=browse`
- `/knowledge/ask` → `/admin/knowledge?tab=ask`
- `/admin/oracle` → `/admin/knowledge?tab=oracle`
- `/admin/approvals` → `/admin/knowledge?tab=approvals`

Deep-link routes that show individual knowledge items (`/knowledge/$entryId`, `/knowledge/brand-guides/*`, `/knowledge/new`) stay put — they're detail pages, not nav destinations.

### 5. Locations & cleanup pass

- Remove dead links to `/analytics` and `/knowledge` in `src/routes/index.tsx`, `src/routes/decks.$deckId.index.tsx`, `src/routes/faq.tsx`, `src/routes/library.imported.tsx`, `src/routes/logohub.tsx`, `src/routes/admin.index.tsx`, `src/routes/admin.icon-studio.tsx` — repoint each to the new master hubs.
- Delete now-unused files: none; keep `analytics.tsx`, `admin.ai.tsx`, `admin.imagery-analytics.tsx`, `admin.approvals.tsx`, `admin.oracle.tsx`, `knowledge.index.tsx`, `knowledge.ask.tsx` as thin redirect shells so existing bookmarks and internal links don't 404.

## Technical notes

- Tabs use URL search param `?tab=` (deep-linkable, back-button friendly). Panels lazy-mount only when their tab is active so heavy queries (imagery, oracle) don't fire on load.
- Sidebar is `collapsible="icon"` — mini strip on collapse per shadcn-sidebar guidance. Trigger sits in the AdminShell header row so it's always visible.
- Extracted panel components live next to their route file as named exports (`export function AnalyticsUsagePanel()` etc.) — no new folder.
- No DB changes.
- No changes to individual detail routes under `/knowledge/*` or admin asset/translation/governance leaves.

## Out of scope

- No visual redesign of individual panels (their internals stay identical).
- No renaming of asset/translation/governance sub-routes.
- No changes to `/atlas`, `/library`, `/templates`, `/brief`.
