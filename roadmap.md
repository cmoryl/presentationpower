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
- [ ] P7. Print preflight (low-res images, bleed/trim, fonts; RGB-only and thin-stroke warnings)
- [ ] P6. "Show alternatives" variant shuffle on deck slides
- [ ] P5. Live brand checks panel (contrast, safe area, banned words, overflow, off-palette)
- [ ] M3. Accent-on-dark-only usage rule enforced by the linter
- [ ] M5. Provenance fields (source file/page, verified by/at) + "unverified" badge on venue rooms and print pieces
- [ ] L2. division_imagery null columns backfill
- [ ] H2b. Background generation (queue + worker + stuck-job cron)
- [ ] C1. Cited two-pass generation with server-side figure validator
- [ ] C2. One token file → generated outputs (scoped by the retired-division-colours rule)
- [ ] H4 / Quarter items (.potx masters, Office add-in, Canva autofill, C2PA, role-split nav) — larger projects
- [ ] H5. GitHub sync + protected main — owner action in Lovable settings
