# Roadmap — build review (Week 1)

- [x] 1. Access lockdown: deny-by-default sign-in wall, @transperfect.com sign-up trigger, buckets private, signed-out probe
- [x] 2. Compliance check: banned words + unsourced figures check, "Needs source" admin page
- [x] 2b. Downloads blocked on banned words / unsourced figures (deck PowerPoint + image/PDF/ZIP menu); live character counter on slide text
- [x] 3. Palette fix — closed: owner kept division accent colours retired
- [x] 4. Retry-safe generate_deck: deck_jobs table + idempotency key + get_deck_job; duplicate-call test
- [x] 5. Role access audit script (`scripts/rls-role-audit.sh`)
- [x] 6. Trial Interactive logos checked: already vector in every page
- [x] 7. AI infographic + Baxter source files checked: picture parts match pictures embedded in the designers' files

# Build review — remaining (Weeks 1–4 + Quarter)

- [x] 2c. Export gate: brief wording on cover/closing blocked; new-deck covers no longer copy the meeting objective (capacity already blocked by export QA)
- [x] H3. Search index checked: fast index already exists; gap is coverage (Legal, Games, Media, Trial Interactive have no PowerPoint material; Trial Interactive has 3 pieces)
- [x] P7. Print preflight: press PDFs blocked on low-res images (<150 ppi), missing bleed, unloaded fonts; warns thin strokes + RGB (src/lib/press-preflight.ts)
- [x] P6. "Show alternatives" in the deck Swap panel: 3 section layouts with content flowed in + Shuffle
- [x] P5. Live "Checks" tab in the deck inspector: banned words, unsourced figures + this slide's QA (contrast, capacity)
- [x] M3. Accent-on-dark-only: Aqua/Lavender/Yellow/Green/Peach on a light slide warn "dark backgrounds only" (qa.ts)
- [x] M5. Provenance: source file/page + checked-by on room lists and print pieces; "Unverified" badge; only admins/brand leads can sign off (DB trigger)
- [x] L2. Abstract backgrounds added for divisions with none (Legal, Digital, Trial Interactive, Games, Division, Sub-company) — awaiting approval
- [ ] H2b. Background generation — BLOCKED: no timed-job support on this project (no managed HTTP schedules, no pg_cron) and the server cannot keep working after replying. Retry-safety + 15-min stuck detection already in place.
- [x] C1. Server-side figure validator: AI-written figures not found in the brief facts or knowledge snippets become "[figure needed]" (figure-validator.ts)
- [x] C2. One token file → generated outputs (scoped by the retired-division-colours rule)
- [ ] H4 / Quarter items (.potx masters, Office add-in, Canva autofill, C2PA, role-split nav — done) — larger projects
- [ ] NEXT VIP dinner invitation creation option with logo, location and copy editing — BLOCKED: supplied Canva design requires access; awaiting an uploaded PDF/SVG or access for the connected Canva account.
- [ ] Import supplied NEXT A5 touchpoint flyers as editable event templates with QR codes, register in NEXT assets, and verify editing/export — BLOCKED: Canva share link allows 35 page previews but denies source export; awaiting PDF Print export.
- [x] H5. GitHub sync — owner connected
- [x] Map labels: resizing, rotation and positioning controls with saved adjustments; fix clipped San Francisco labels and verify SVG export.
