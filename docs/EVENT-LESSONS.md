# Event lessons log

A running record of judgement calls, near-misses and "we tried this and it was wrong"
from real event builds. Tests lock in fixed bugs; this file carries the reasoning that
tests cannot express. Read it before starting a new city, venue or signage family.

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
