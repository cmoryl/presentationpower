# Deck & Slide Translation

Ship a full translation surface for decks and slides using **TransPerfect GlobalLink** as the engine, with a protected brand glossary and four workflows (in-place, per-slide, translated copy, batch multi-language).

## 1. GlobalLink connection

No standard connector exists for GlobalLink in this workspace. We'll wire it as a first-class integration using project secrets:

- `GLOBALLINK_API_BASE_URL` (e.g. `https://connect.translations.com` or the tenant's endpoint)
- `GLOBALLINK_API_KEY` (or `GLOBALLINK_CLIENT_ID` + `GLOBALLINK_CLIENT_SECRET` for OAuth-style — I'll adapt to whichever your GlobalLink tenant uses)
- `GLOBALLINK_SUBMITTER` / project code (optional metadata for job routing)

I'll request these via `add_secret` after this plan is approved. Until they're in place, the UI shows a "Connect GlobalLink" empty state in `/admin` and translation actions stay disabled — no fake/mock fallback.

**Engine abstraction.** Server code goes through a `TranslationEngine` interface so we can swap in DeepL/Google later without touching UI. First implementation: `globallink.ts` (MT + submit-for-human-review supported).

## 2. Data model (one migration)

```text
languages            id text pk, label text, native text, rtl bool, active bool
deck_translations    id, source_deck_id, target_lang, status(draft|translating|ready|failed),
                     engine text, job_ref text, translated_deck_id, error, created_by, timestamps
slide_translations   id, slide_id, target_lang, source_hash, translated_content jsonb,
                     status, engine, job_ref, timestamps  (unique slide_id+target_lang)
glossary_terms       id, term, do_not_translate bool, translations jsonb (per-lang overrides),
                     scope('global'|'division'|'deck'), scope_id text, notes, created_by, timestamps
```

All tables get RLS + GRANTs. Seed `languages` with ~40 major locales (es, fr, de, it, pt-BR, pt-PT, nl, pl, cs, sv, da, fi, no, tr, ru, uk, ar, he, ja, ko, zh-CN, zh-TW, th, vi, id, ms, hi, bn, ta, ur, fa, el, ro, hu, bg, sk, sl, hr, sr, et, lv, lt).

Glossary seed: `TransPerfect`, all 10 division names, product names (GlobalLink, Ai Studio, Wordfast, etc.) as `do_not_translate=true, scope='global'`.

## 3. Server functions (`src/lib/translation.functions.ts`)

- `listLanguages()` — active locales for pickers
- `translateSlide({ slideId, targetLang, engine, glossaryScope })` — single slide, returns translated content
- `translateDeckInPlace({ deckId, targetLang })` — overwrites current deck; auto-snapshots version first
- `translateDeckToCopy({ deckId, targetLang })` — duplicates deck, translates copy, returns new `deckId`
- `translateDeckBatch({ deckId, targetLangs[] })` — parallel copies; returns `{ lang → deckId | error }`
- `getTranslationStatus({ jobId })` — poll GlobalLink jobs
- `listGlossary({ scope, scopeId })`, `upsertGlossaryTerm(...)`, `deleteGlossaryTerm(...)` — admin CRUD

**Translation flow per slide**
1. Extract user-visible strings from `slide.content` (title, subtitle, body, bullets, quotes, stat labels/values where non-numeric, cell text, captions, notes).
2. Wrap protected terms in `<span translate="no">…</span>` using glossary matches (case-insensitive, word-boundary).
3. Send batched string array to GlobalLink; receive translated array with tags preserved.
4. Unwrap protections, map results back to structured `content` shape, persist to `slide_translations` and (for in-place / copy) into `deck_slides.content`.
5. Auto-tag RTL languages so `SlideChrome` flips text direction.

Version snapshot is captured **before** in-place translation so undo is possible.

## 4. UI

**Editor (`decks.$deckId`)**
- New "Translate" button in header menu → drawer with:
  - Target language picker (searchable, flags, RTL badge)
  - Mode radio: `In-place` / `New copy` / `Multi-language batch` (multi-select langs)
  - Glossary preview ("12 protected terms")
  - "Submit for human review" checkbox (routes as GlobalLink human job vs MT)
- Per-slide context menu → **Translate this slide** → inline preview with accept/reject
- Progress toast + status pill (`Translating 4/12 slides…`)

**Deck list (`/decks`)**
- Row action: **Translate deck** (same drawer)
- Language badge on cards when deck has translations; click reveals language variants

**Admin (`/admin/translation` — new)**
- GlobalLink connection status + secrets check
- Glossary manager (global, per-division, per-deck) with import/export CSV
- Translation jobs log (filter by status, language, engine, retry failed)
- Language activation toggles

**Present / Share**
- Language switcher in `/present` and `/share/$token` when translated copies exist

## 5. Export fidelity

`pptx-export.ts` and `/print` already read `deck_slides.content`, so translated copies export correctly with zero changes. RTL languages set slide-level `dir="rtl"` and mirror hero image alignment. Font stack falls back to Noto Sans (CJK / Arabic / Hebrew) via `<link>` in `__root.tsx` to avoid missing-glyph boxes.

## 6. Tests / verification

- Simulate a 12-slide deck → translate in-place to Spanish → verify glossary protection kept "TransPerfect" and "GlobalLink" untranslated, snapshot exists, undo restores English.
- Batch translate to `[es, fr, de, ja, ar]` → verify 5 new deck rows, RTL flag on Arabic.
- Per-slide translation preview accept/reject round-trip.
- PPTX export of Japanese copy renders with CJK font.

## 7. What I need from you after approval

1. Confirm you have a GlobalLink tenant + API credentials, and which auth style (bearer key vs OAuth client id/secret).
2. I'll open `add_secret` prompts for the values above.
3. Optional: a CSV of extra do-not-translate terms specific to your accounts — otherwise glossary starts with brand + divisions + product names.

## Out of scope (call out for a future pass)

- Live TM/TB sync back to GlobalLink projects
- In-context reviewer round-trips inside GlobalLink UI
- Locale-specific imagery swaps