# Roadmap — build review (Week 1)

- [x] San Juan Bowl: stadium target switched back to Hiram Bithorn, San Juan per user (21 Oct 2026); Loubriel handoff and geometry superseded.
- [ ] San Juan Bowl stadium connection — BLOCKED: BoothHUB must rebuild/publish Hiram Bithorn and supply its public viewer URL; exact placement requires current venue survey and organiser-approved football conversion. Stadium page gated to "Coming soon" until then.

- [x] San Juan Bowl: default to 14 named major pieces, with TRANSPERFECT lettering separated from ribbon/stars in the viewer and downloads; grouped SVG/ZIP downloads preserve all 293 source shapes; individual-shape view and editor remain optional.

- [x] San Juan Bowl: original white palm highlights verified; all 293 micro-extracted SVGs match source geometry, downloadable individually/ZIP; centered 3D orbit and enlarged interactive dialog tested.

- [x] San Juan Bowl: source-coordinate grid, measured sizing calculator, six preserved original layers and verified ZIP download; composite scene elements are not falsely offered as independent symbols.

- [x] Embed logos in map SVG downloads; all four SF floor downloads contain vector logos with no external image links and render offline. Illustrator itself is unavailable for verification.

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
- [x] Restore original bathroom people symbols on San Francisco Levels 4–5 and verify map previews and SVG downloads.
- [x] Add larger map views with zoom and pan to event maps and San Francisco venue plans; verify enlargement and closing.
- [x] Apply stacked San Francisco room-name defaults and turn the long Level 3 foyer name in previews and SVGs.
- [x] Add TransPerfect San Juan Bowl event: directory card, event home, brand kit with supplied logo variants and palette.
- [x] Link check: 140 signed-in pages crawled, no broken pages; downloads start correctly.
- [x] Main menu trimmed: "Create", "Review" (one reviewer door), Demos admin-only.
- [ ] Stadium 3D view — BLOCKED: BoothHUB's /showcase/san-juan-bowl returns BRAND_NOT_FOUND; must be fixed and published in BoothHUB.
- [x] Plain-language labels on everyday screens (Brand, Approved layouts, Layout).
- [x] One-sentence event kit: already exists in Events agent; tested, reply rules tightened. Open: San Juan Bowl has no own look in the agent (uses NEXT City).
- [x] San Juan Bowl kits: Bowl badge replaces the TP wordmark automatically; made-up hashtag removed.
- [x] Bowl kit assets tinted in Bowl colours (sky accents, navy ink tokens).
- [x] Jobs review: home "What do you need?" box routing to the right agent
- [x] Jobs review: event page Plan → Design → Approve → Print → On site timeline
- [x] Jobs review: split San Juan Bowl brand kit into simple front page + "For designers" page
- [x] Jobs review: stadium page shows "Coming soon" until BoothHUB publishes

# NEXT designer asset system
- [x] One designer pack layout + naming rule (`next26_<division>_<asset>_<variant>`), version + changelog, manifest with checksums, Adobe .ase swatches, icons, EPS/PNG logos
- [x] Designer guide PDF with live links, contents links, real London QEII / San Francisco / template examples, CMYK labelled approved or proof first
- [x] Partner hand-back upload on the share page → /approvals "Partner designs"
- [x] Send to vendor: expiring, revocable vendor links to supplied live files + brief PDF; /events/next/vendor-handoffs list
- [ ] Decide: photography for outside designers; move Dropbox masters into the pack — waiting on owner
