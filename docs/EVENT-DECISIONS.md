# Event design decisions

The tested-and-settled choices behind the event work. The lessons log
(`docs/EVENT-LESSONS.md`) records what went wrong; this file records what we
tried, what we chose, and why — so the next city inherits the reasoning, not
just the result, and nobody undoes a settled choice in good faith.

**How to use it**
- Add an entry the moment a choice is made between real alternatives — during
  the work, not after.
- Always name the options that lost. A decision with no alternatives is a
  preference, not a decision.
- Always state what would change our mind. A decision that cannot be revisited
  is a rule; put those in the lessons log instead.
- Never delete an entry. Supersede it with a new one and mark the old
  `SUPERSEDED by <date/title>`.

Entry format:

```
### YYYY-MM — Title
**Area:** surface, family or system the choice governs.
**Options tested:** the real alternatives, including the ones we rejected.
**Chosen:** the settled option.
**Why:** the reason it won, in terms of the printed or delivered result.
**Would change if:** the condition that would reopen it.
**Applies to:** every venue / London only / a named family.
```

---

## NEXT 2026 London (Job 2281, QEII Centre)

### 2026-09 — Hub cards show flat artwork by default
**Area:** the event hub preview cards.
**Options tested:** in-scene visualisation as the default card image; flat
artwork as the default with in-scene behind a toggle; two cards per sign.
**Chosen:** flat artwork first, in-scene available on the toggle.
**Why:** the in-scene plates were not convincing enough to be the thing a
reviewer approves from, and a card is used to check the design, not the room.
**Would change if:** the in-scene renders come from real venue photography with
measured faces for every surface.
**Applies to:** every venue.

### 2026-09 — Brew signage grounds are gradient only
**Area:** NEXT Brew coffee-bar signage and its live files.
**Options tested:** chevron/vector motif over the gradient; gradient plus a
subtle texture; gradient only.
**Chosen:** gradient only.
**Why:** the motif competed with the lockup at coffee-bar viewing distance and
fought the artwork uploaded into the same face.
**Would change if:** a Brew-specific motif is approved as part of the lockup
rather than sitting behind it.
**Applies to:** the Brew family, every venue.

### 2026-09 — Door vinyls mount to the measured edge, never stretched to cover
**Area:** room door branding and any glazed-door face.
**Options tested:** cover mode (fill the leaf, crop the artwork); stretch to the
leaf; edge mode (anchor to the measured trim, respect aspect ratio).
**Chosen:** edge mode, with cover offered only as an explicit choice.
**Why:** stretching changed the lockup proportions, which is a brand failure,
and cropping lost the strapline on double-leaf doors.
**Would change if:** a door face is supplied as artwork already built to the
leaf, bleed included.
**Applies to:** every venue.

### 2026-09 — Step-and-repeat runs 230mm tiles on half-drop rows
**Area:** step-and-repeat / press walls.
**Options tested:** larger tiles on a straight grid; small dense tiles; 230mm
tiles half-dropped row to row.
**Chosen:** 230mm half-drop.
**Why:** it keeps a full lockup readable behind a person at press distance and
avoids the vertical seams a straight grid shows on a 6.5m-high wall.
**Would change if:** a wall is narrower than one full tile repeat, or a partner
lockup needs a different aspect.
**Applies to:** every venue.

### 2026-09 — Copy in print masters is outlined vector paths
**Area:** every `.ai` / PDF print master.
**Options tested:** embedded fonts; live text with the face supplied to the
vendor; outlined paths.
**Chosen:** outlined paths, and the builder throws when the face is
unavailable rather than substituting.
**Why:** vendors reflowed live text and substituted faces; outlines cannot be
re-flowed or re-substituted at the press.
**Would change if:** a vendor contractually requires editable text, in which
case they receive a separate editable file alongside the outlined master.
**Applies to:** every venue.

### 2026-09 — RGB is the house colour space; CMYK is opt-in
**Area:** all print output.
**Options tested:** convert everything to CMYK at export; offer both freely;
RGB by default with CMYK hidden until every ramp stop has an approved build.
**Chosen:** RGB default, CMYK behind a flag.
**Why:** automatic conversion shifted the brand blues, and a silently wrong
colour is worse than an honest refusal.
**Would change if:** a printer requires CMYK and the approved builds for the
ramp stops in use exist.
**Applies to:** every venue.

### 2026-09 — Accent colour never carries body text
**Area:** all signage and slide typography.
**Options tested:** accent headlines with contrast correction; accent text on
tinted grounds; accent restricted to fills, rules, bars and icons.
**Chosen:** accent for fills only; text is ink, or white on the dark primary.
**Why:** ten of the eleven division accents fail contrast on light grounds, and
the halo correction we tried made type look blurred in print.
**Would change if:** an accent is approved at a darkened value specifically for
text.
**Applies to:** every venue and every surface.

### 2026-09 — Generated in-scene plates are labelled visualisations
**Area:** the scene library.
**Options tested:** present generated plates as venue photography; drop them
entirely and show flat art only; keep them, labelled, with measured faces and
provenance.
**Chosen:** keep and label, with photograph-versus-visualisation stated on every
scene.
**Why:** they are genuinely useful for judging scale, and calling them photos
would put an unverifiable claim in front of a client.
**Would change if:** licensed venue photography replaces a given surface — then
that scene changes provenance.
**Applies to:** every venue.

### 2026-09 — Sizes carry to a new city as provisional
**Area:** the new-city starter and every reused family.
**Options tested:** carry London sizes as defaults; leave sizes blank until
survey; carry them explicitly marked "confirm on survey".
**Chosen:** carry them, marked provisional, with missing families reported as
gaps rather than guessed.
**Why:** a blank schedule is unusable for planning, and an unmarked size gets
printed.
**Would change if:** a venue survey is loaded, at which point the measured
value replaces the precedent.
**Applies to:** every venue after London.

### 2026-09 — Copies are new versions, never overwrites
**Area:** duplicating and resizing a sign.
**Options tested:** edit in place with history; overwrite on save; append-only
copies with unused IDs and cleared overrides.
**Chosen:** append-only copies.
**Why:** vendors hold files that must stay valid, and a resized copy inheriting
the original's placements printed wrong.
**Would change if:** never for a published file; drafts may still be edited in
place.
**Applies to:** every venue.

### 2026-09 — Division signage uses white lockups only
**Area:** division-specific panels.
**Options tested:** full-colour division lockups; accent-tinted lockups; white
lockups with the accent tinting only the light end of the ground.
**Chosen:** white lockups, accent in the ground.
**Why:** it keeps eleven divisions visually one family at the same event, and
the accent still reads as division identity.
**Would change if:** a division lockup has no approved white version.
**Applies to:** every venue.

### 2026-09 — Resize rather than rebuild
**Area:** taking a design to a new size or venue.
**Options tested:** rebuild per size; a fixed set of preset sizes; accept any
real width, height and bleed and re-lay out proportionally.
**Chosen:** accept any real size.
**Why:** venues never repeat sizes, and every rebuild reintroduced the errors
the last one fixed.
**Would change if:** an aspect change is extreme enough that the layout needs a
different composition — then it becomes a new family variant.
**Applies to:** every venue.

### 2026-09 — A broken option is disabled, not re-architected mid-build
**Area:** how we handle failures during a live print job.
**Options tested:** fix in place under deadline; rework the surrounding system;
hide the option behind a flag and fix it after the job.
**Chosen:** disable behind a flag.
**Why:** live print deadlines make large reworks the riskier choice, and a
hidden option cannot produce a wrong file.
**Would change if:** the option is the job's critical path.
**Applies to:** every venue.

### 2026-09 — Knowledge harvest runs in resumable slices
**Area:** the event knowledge store.
**Options tested:** one long harvest request; a background job; forty-record
slices driven from the page.
**Chosen:** resumable slices with visible progress.
**Why:** the whole harvest exceeds a single request's life, and a half-finished
silent harvest leaves records unsearchable with no sign of it.
**Would change if:** the store grows large enough to need a scheduled job.
**Applies to:** every venue.

### 2026-09 — Agenda copy ink is guarded, not restyled

**Area:** Agenda boards (screen preview, PDF/SVG, Word, PowerPoint)
**Options tested:** (a) force a single dark ink on every board; (b) mix inks per
band so each line takes the reading ink for its own patch of gradient; (c) add a
scrim behind the copy column; (d) keep the approved face ink and only substitute
when it drops below its floor.
**Chosen:** (d) — the legibility guard. `agendaCopyInk()` keeps the signed-off
face ink whenever it reads and swaps to the best-reading approved ink only when
it does not; grounds where nothing reads are named and surfaced in the editor.
**Why:** (a) restyles approved boards, (b) prints two ink colours on one board,
(c) alters the approved ground. (d) changes nothing that already reads.
**Would change if:** an approved scrim treatment is signed off for the six
flagged gradients, which would let them carry the dark face.
**Applies to:** every city agenda board, all four export paths.
