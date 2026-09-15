# Event lessons log

A running record of judgement calls, near-misses and "we tried this and it was wrong"
from real event builds. Tests lock in fixed bugs; this file carries the reasoning that
tests cannot express. Read it before starting a new city, venue or signage family.

Its companion is `docs/EVENT-DECISIONS.md`: this file records what went wrong, that one
records the choices we tested and settled on. Both are harvested into the searchable
event knowledge store, so a new city can ask them in plain language.

**How to use it**
- Add an entry the moment something is learned — during the work, not after.
- One entry per lesson. Keep it short and decision-shaped: what happened, what we do now.
- Never delete an entry. If a rule is superseded, add a new entry and mark the old one
  `SUPERSEDED by <date/title>`.
- If a lesson can be enforced in code, add the test/gate too and link it here.

Entry format:

```
### YYYY-MM-DD — Title
**Context:** which event / surface / file.
**What happened:** the mistake, near-miss or rejected approach.
**Rule now:** the thing to do going forward.
**Enforced by:** test, QA gate, or "judgement only".
```

---

## NEXT 2026 London (Job 2281, QEII Centre)

### 2026-09 — Preview correctness is not press correctness
**Context:** London signage `.ai` / PDF masters.
**What happened:** files that opened cleanly in LibreOffice, python-pptx and lxml still
failed to open, or printed wrong, in Illustrator and PowerPoint.
**Rule now:** only Office/Illustrator prove a file. Every signage file passes
`gateOnQa()` before it is written; no download path may bypass it.
**Enforced by:** `src/lib/london-signage-qa.ts` + panel-audit suites.

### 2026-09 — Never stamp a revision number that has not been published
**Context:** file naming across the signage kit.
**What happened:** draft exports carried a revision number and vendors printed from them.
**Rule now:** files are `r<NNN>-<slug>` from the revision in force, or `rdraft-` when
unpublished.
**Enforced by:** naming tests.

### 2026-09 — Finished supplied artwork must not be over-drawn
**Context:** hub cards and sign editors.
**What happened:** the kit drew its own logo and headline on top of a finished vendor file,
so previews and exports disagreed with the approved design.
**Rule now:** when a supplied file owns the lockup or copy layer, the kit's own lockup and
copy default off. Layers become editable only when the user switches them to "Edit here".
**Enforced by:** `londonBrandingPlan()` layer-claim logic + live-layer tests.

### 2026-09 — Hyper-realistic in-scene renders are not the default card image
**Context:** London hub preview cards.
**What happened:** visualisations read as approved venue photography and misled reviewers
about how the print would actually look.
**Rule now:** cards default to flat artwork; in-scene renders sit behind a toggle and are
labelled as visualisations unless the plate is a real, sourced venue photograph with
provenance metadata.
**Enforced by:** scene provenance fields in `next-london-scenes.ts`; judgement otherwise.

### 2026-09 — Measure the surface, do not guess it
**Context:** scene face quads, door leaves, screens.
**What happened:** artwork was stretched onto faces with invented proportions; double doors
were rendered as single leaves.
**Rule now:** every scene face carries measured dimensions and a mount mode; artwork is
fitted to the measured face, never stretched to fill. Assumed dimensions are flagged as
assumed.
**Enforced by:** `scene-face-fit.ts`, `next-london-doors.ts`, scene alignment tests.

### 2026-09 — Accent colour never carries body text
**Context:** division signage and slides.
**What happened:** 10 of 11 division accents fail WCAG on light grounds.
**Rule now:** accent is for fills, rules, bars and icons. Text is ink, or white on primary.
**Enforced by:** WCAG helpers + contrast tests.

### 2026-09 — QR codes are print-critical
**Context:** step-and-repeat walls.
**What happened:** overscan tiling clipped QR plates and destroyed quiet zones on export.
**Rule now:** QR plates and quiet zones survive every tiling, bleed and artboard clip; QA
warns and offers a one-click scannability fix; a failed QR check blocks the download.
**Enforced by:** `stepRepeatQrScanBlockers()` + export tests.

### 2026-09 — Disable before rebuild
**Context:** several broken options during the signage push.
**What happened:** re-architecting a broken feature mid-job risked the print deadline.
**Rule now:** a broken option is hidden behind a flag and reported honestly, not rebuilt
under time pressure.
**Enforced by:** judgement only.

### 2026-09 — Carry sizes forward as provisional, not as fact
**Context:** next-city starter reusing London families.
**What happened:** London trim/bleed sizes risked being treated as the new venue's truth.
**Rule now:** carried sizes are labelled "carried from London — confirm on survey", and a
missing family is reported as a gap rather than substituted.
**Enforced by:** `next-city-starter.ts` gap reporting.

### 2026-09 — Never silently convert colour space
**Context:** CMYK export.
**What happened:** automatic RGB→CMYK conversion produced unapproved brand builds.
**Rule now:** RGB is the house space. CMYK stays opt-in and hidden until every ramp stop has
an approved build; a failed wrap surfaces to the user instead of falling back.
**Enforced by:** `next-london-cmyk.ts APPROVED` + CMYK metadata tests.

### 2026-09 — Copy in print masters is outlined vector, and outlines must be exact
**Context:** `.ai` masters.
**What happened:** quadratic curve segments were approximated, so outlined text exported at
visibly low quality.
**Rule now:** no `<text>`, no `/Font`, no `Tj` in a master; builders throw if the face is
unavailable; quadratic→cubic conversion is exact.
**Enforced by:** `vector-path-pdf.ts` tests + master content checks.

### 2026-09 — Anything rasterised from the DOM is a proof, not a master
**Context:** badges, production studio, kits.
**Rule now:** label DOM-rasterised output as a proof. Guides carry
`data-export-ignore="true"` or they print.
**Enforced by:** export-ignore tests.

### 2026-10 — Written-down knowledge only helps if it can be asked
**Context:** carrying the London build forward to the next NEXT venue.
**What happened:** the specs, template families, grounds and lessons all existed, but
answering "how big were the room door vinyls" still meant reading 154 rows by hand, so
people re-derived sizes instead of reusing them — and near-misses stayed in chat history.
**Rule now:** everything a venue teaches is harvested into the event knowledge store and
embedded, so it is searchable in plain language at `/events/next/knowledge`. Publishing a
live file records what actually shipped. Precedent answers always carry "confirm on
survey" — a past venue's size is a sanity check, never the new venue's truth. Records that
fail to index are shown as pending, never silently dropped.
**Enforced by:** `src/lib/__tests__/event-knowledge.test.ts`; fingerprints keep one row per
fact so revisions update instead of twinning.

### 2026-09 — A settled choice is not knowledge until the losing options are written down
**Context:** hub card renders, Brew grounds, door mounting, colour space — all chosen after
testing alternatives.
**What happened:** the chosen option survived only as the current state of the code. Nothing
recorded what it beat or why, so a later change could reverse it in good faith and a new city
could re-test a rejected approach from scratch.
**Rule now:** a choice between real alternatives gets an entry in `docs/EVENT-DECISIONS.md`
at the moment it is made, naming the options it beat and the condition that would reopen it.
Decisions are harvested into the knowledge store alongside lessons and specs.
**Enforced by:** `src/lib/__tests__/event-knowledge.test.ts` (decision log suite).

### 2026-09 — Agenda copy inks were never contrast-checked

Only the QR code was gated for contrast; the printed copy inks were a free
choice, so white copy could land on the pale end of a gradient ground and stop
reading. Swept every ground the agenda editor can build (11 gradients x 2 faces
x every division) against the face inks and the approved headline inks, judging
each band where it actually prints. Six dark grounds have no approved ink that
reads across the whole board and are now named in `AGENDA_GUARD_GAPS`.

**Enforced by:** `src/lib/__tests__/agenda-contrast.test.ts`

### 2026-09 — The agenda page-fit model only added up on tall formats

**Context:** an end-to-end sweep of every combination the agenda studio can build
(12 division areas x 11 grounds x 2 faces x 10 formats x 3 band treatments x 2 row
looks x 2 QR anchors = 31,680 boards), each one also checked page by page.
**What happened:** on the short, wide screen formats (16:9 and 21:9) the programme
bands printed over the footer band. The band heights were scaled proportionally and
then each band was raised to a legible floor — floored bands kept their new height
while nothing else gave any back, so the column added up to more than the band it
had to fit in. Pagination did not save it, because the page carried the same sum.
Separately, a typed line break in a session note crashed the press PDF build on the
ruled list: the single-line fitter measured the newline as an unencodable glyph.
**Rule now:** band heights are water-filled — bands that hit the legible floor are
pinned at it and taken out of the budget, and the rest re-share what is left, so the
column can never exceed the band. When even the floor no longer fits, every band sits
on the floor and the fit report / page capacity says "over" out loud. The single-line
fitter collapses line breaks and tabs before measuring.
**Enforced by:** `src/lib/__tests__/agenda-full-matrix.test.ts` — the full combination
sweep plus a real press PDF, Word and PowerPoint build for every option value.

## Two signs can share a live-file name — map by folder, never by filename

**What happened:** the September hand-back folder contained `Lifts_Template.ai` twice —
once under `GF/Lift Door Template/` (unchanged) and once under `GF/Lift Walls Template/`
(newly finished). A basename match would have given the lift doors the wall artwork and
missed the wall update entirely.

**Rule:** map a hand-back file to a sign by its full path inside the pack, and record that
path in the version note so the next issue can be diffed against it. Where a supplied
artboard is a 1:10 proof, scale the trim up ×10 and say so in `dimsSource`.
