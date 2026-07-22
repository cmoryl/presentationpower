## Modules Everywhere — modules as the atom, surfaces as consumers

Pivot: **modules are the source of truth.** Decks are just one surface; brochures, one-pagers, social kits, and emails are peers. Existing decks are untouched — the new surface system runs in parallel and consumes the same module DNA.

---

### Core mental model

```text
                    ┌─────────────────────┐
                    │   MODULE LIBRARY    │   (existing MODULE_VARIANTS + new "My Modules")
                    │   variant + tokens  │
                    └──────────┬──────────┘
                               │
        ┌──────────┬───────────┼───────────┬──────────┐
        ▼          ▼           ▼           ▼          ▼
      DECK     BROCHURE    ONE-PAGER    SOCIAL      EMAIL
     16:9      bi/tri/4pp  8.5×11      1:1/4:5/9:16 responsive
   (untouched)  (new)       (new)       (new)        (new)
```

Every surface is a thin container: an ordered list of **Module Instances**, each with surface-specific hints (crop, safe zone, page break).

---

### 1. Module Instance model (`src/lib/module-instance.ts`)

```text
ModuleInstance
 ├─ id
 ├─ variantId          → MODULE_VARIANTS entry
 ├─ content            → SlideContent (the filled fields)
 ├─ brandMode          → division token override
 ├─ backdrop           → optional deterministic/custom
 ├─ role               → hero | proof | stat | quote | cta | close | logo | data
 ├─ tags               → free-form (division, tone, campaign)
 └─ savedAs            → 'populated' | 'template' | null   ← user's choice
```

New table `saved_modules` (owner FK, `variant_id`, `content` jsonb, `brand_mode`, `backdrop`, `save_kind` enum('populated','template'), `tags text[]`, `title`, `description`, timestamps). Full RLS + GRANT block.

Save flow: any slide/module in any surface → **"Save to My Modules"** dialog offers:
- **Save with content** (populated) — reusable "Acme case-study hero"
- **Save as template** (variant + brand tokens only) — reusable "Aurora orb hero"

---

### 2. Surface store (`src/lib/surface-store.ts`)

Parallel to `deck-store`. Handles Brochure / OnePager / Social / Email.

```text
Surface
 ├─ id, kind ('brochure' | 'onepager' | 'social' | 'email')
 ├─ format  (bi-fold | tri-fold | 4pp | 8pp | letter | linkedin | ig-1x1 | ig-4x5 | ig-9x16 | email-single-column)
 ├─ brandMode, subCompany, clientLogoUrl
 ├─ modules: ModuleInstance[]     ← the atoms
 └─ meta: { title, subject?, preheader?, cta? }
```

New table `surfaces` (owner FK, `kind`, `format`, `brand_mode_id`, `context jsonb`, `modules jsonb`, `meta jsonb`, timestamps). Companion `surface_versions` for undo/history parity with decks.

Existing `deck-store` continues untouched. A small bridge helper `moduleFromSlide()` and `slideFromModule()` lets users pull any deck slide into "My Modules" and vice versa without coupling the stores.

---

### 3. Surface adapters (`src/lib/surface-adapters/`)

Each adapter takes a `ModuleInstance` + surface context and returns render metadata (crop, safe zone, layout hints):

```text
surface-adapters/
 ├─ deck.ts       (identity — proves the abstraction; deck-store stays canonical)
 ├─ brochure.ts   → page + bleed + fold safe zones
 ├─ onepager.ts   → composition zones (hero / body / cta strip)
 ├─ social.ts     → 1:1 / 4:5 / 9:16 / 16:9 crops + safe zones
 └─ email.ts      → responsive HTML block (React Email)
```

Every existing `MODULE_VARIANTS` entry gains a lightweight `surfaces` capability tag:

```ts
surfaces: {
  deck: true, brochure: true, onepager: true,
  social: { '1:1': true, '4:5': true, '9:16': false, '16:9': true },
  email: true,
}
```

Defaults are inferred per family (hero/quote/stat/logo → all surfaces; charts/dashboards → deck+brochure+onepager only; marquee → social+email as scroll strip). No new variants required.

---

### 4. Module Library UX — "My Modules"

Extend `/library` (Atlas):
- New tab **"My Modules"** listing saved instances with thumbnail, kind badge (populated vs template), tags, and division chip.
- Filter by role / division / surface support.
- Drag any module → active surface.
- "Use in…" menu on any module: **New Deck · New Brochure · New One-pager · New Social · New Email**.

---

### 5. Surface Composer (`src/routes/surfaces.$surfaceId.tsx`)

One route, four surface renderers via `kind`:
- **Brochure Composer** — spread view, fold guides, drop zones per page.
- **One-pager Composer** — single canvas with composition guides.
- **Social Composer** — carousel of crops, drag same module across ratios.
- **Email Composer** — vertical block stack, live inbox preview (light/dark).

Left rail = Module Library + My Modules. Right rail = surface inspector (format, brand mode, bleed/safe zones, page numbers). Reuses `SlideChrome`, `VariantRenderer`, ink palette.

---

### 6. Auto-compose (optional AI accelerator)

Server fn `composeSurface({ kind, format, brief? | deckId?, modules? })`:
- Pulls candidate modules (from My Modules first, then MODULE_VARIANTS with content synthesized via existing Narrative Strategist).
- Uses Claude to sequence modules to fit the surface's role pattern.
- Returns a draft surface ready for review.

---

### 7. Exports (`src/lib/surface-export/`)

- `brochure-pdf.ts` — @react-pdf/renderer with bleed + fold marks.
- `onepager-pdf.ts` — single-page @react-pdf.
- `social-png.ts` — html-to-image at target dimensions → zip.
- `email-html.ts` — React Email inline-CSS HTML (and MJML preview).
- Existing PPTX/PDF export in `deck-store` is untouched.

---

### 8. Entry points

- Home Command Center: new **"Create surface"** dropdown (Deck / Brochure / One-pager / Social / Email).
- Deck editor: **"Save slide to My Modules"** on any slide + **"Reuse this deck as…"** menu (opens a surface pre-populated with the deck's modules).
- Library: **"Use in…"** menu on every module.

---

### Technical notes

- **Zero regressions.** `deck-store`, deck routes, deck exports, deck share, Copilot, Art Director, Brand Reviewer — all untouched.
- **Bridge helpers only**: `moduleFromSlide()` (deck → module) and `slideFromModule()` (module → deck). No store coupling.
- **Variant capability tags** are additive metadata; unknown surfaces default to `deck: true` only, so nothing breaks.
- **RLS**: `saved_modules` and `surfaces` scoped to owner; `has_role('admin')` bypass for admin surfaces (matches existing pattern).
- **Storage reuse**: brochure/one-pager/social/email inherit `client_logos`, `division_imagery`, `slide-videos` buckets.
- **PDF fonts**: reuse Geist already embedded for PPTX export.
- **Email**: scaffold Lovable email templates so an email surface can also be *sent* if a domain is configured (optional — email surfaces are always exportable as HTML regardless).

---

### Ship order

1. `saved_modules` + `surfaces` + `surface_versions` migrations (+ GRANT + RLS).
2. `module-instance.ts` + variant capability tags + bridge helpers.
3. "My Modules" tab + Save dialog in Library.
4. `surface-store.ts` + Surface Composer shell (empty, all four kinds).
5. Adapters + renderers per surface (Brochure → OnePager → Social → Email).
6. Exports per surface (PDF → PNG zip → HTML).
7. Auto-compose server fn.
8. Entry points in Home + Deck editor + Library.
9. E2E: save a hero module from the Acme demo deck → drop into a brochure + a social kit + an email → export all three → visual QA.