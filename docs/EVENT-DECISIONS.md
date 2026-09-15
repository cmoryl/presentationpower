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

### 2026-09 — CMYK signage masters ship as a labelled, opt-in pack
**Area:** Print colour management (London / all NEXT venues)
**Options tested:** (a) convert every signage master to CMYK and ship CMYK as the default; (b) stay RGB-only and refuse CMYK; (c) ship a parallel CMYK pack where every colour build is labelled approved-brand-build or machine-conversion, with a printer sign-off sheet.
**Chosen:** (c). `scripts/export-london-cmyk-pack.ts` builds one DeviceCMYK `.ai` plus a marks-bearing print PDF per panel (154 panels, 308 files), audited by `london-signage-qa` in CMYK mode. `printer-colour-sign-off.csv` lists all 57 distinct print colours: 3 approved brand builds, 54 machine conversions awaiting sign-off.
**Why:** Brand colour is never silently converted, but printers do ask for CMYK. Labelling makes the risk explicit instead of hiding it, and the ledger doubles as the approval sheet.
**Would change if:** the print house signs off the remaining 54 builds — then those move into `APPROVED` in `next-london-cmyk.ts` and the sign-off warning disappears on its own.
**Applies to:** any venue reusing the London sign families; supplied vendor/venue masters are still handed on untouched in their own colour space.

### 2026-09 — NEXT pillar CMYK is built per pillar with its own sign-off sheet
**Area:** Print colour management (NEXT pillar signs, both templates, all cities)
**Options tested:** (a) route pillars through the London signage CMYK pack; (b) approve the NEXT ascent violet→aqua ramp centrally and treat pillars as approved; (c) build pillars in DeviceCMYK on demand from the studio, with a per-pillar ledger and its own printer sign-off CSV.
**Chosen:** (c). `buildPillarVectorPdf(config, { colorSpace: "cmyk" })` paints ground mesh, chevron device, lockup, outlined type and QR in DeviceCMYK (`pdf-mesh-shading` now emits 4-component Gouraud meshes); `next-pillar-cmyk.ts` reports every colour with its role — ground, chevron device, division lockup, headline + sub-line, QR modules, QR plate — and writes `printer-colour-sign-off.csv` plus an all-templates roll-up. RGB stays the default in the studio and both export paths.
**Why:** Pillar colour is not London panel colour — the ascent template's ramp and chevron ink come off the supplied Canva master and have never been on press, so they must show as conversions. A per-pillar sheet keeps the chevron device approvable on its own line instead of buried in a 57-row signage ledger. (a) mislabels pillar stops; (b) approves colour no printer has proofed.
**Would change if:** the print house signs off the ascent ramp and chevron ink — those hexes move into `APPROVED` in `next-london-cmyk.ts` and the pillar ledger reports fully approved with no code change.
**Applies to:** classic column and NEXT ascent pillars, single and batch exports, every city reusing the pillar families.

### 2026-09 — Unapproved CMYK builds are solved against a press model, not converted by formula
**Area:** Print colour management (all NEXT venues, signage + pillars + live files)
**Options tested:** (a) keep the hand-tuned formula (saturation pre-boost, value lift, skeletal black); (b) hand each gradient to a language model and ask it for "more vibrant" ink values; (c) carry a forward press model and search for the build whose *predicted printed colour* lands closest to the brand colour.
**Chosen:** (c). `src/lib/cmyk-gamut-solver.ts` models a coated commercial sheet — Neugebauer primaries, Demichel mixing in linear light, dot gain, black as a separate layer — then runs a deterministic coordinate descent in OKLab: stage one finds the closest printable match, stage two finds the most saturated build still that close, with hard guard rails on lightness (0.03 L) and hue arc. Gradients go through `solveCmykRamp`, which clamps interior stops between their neighbours in every ink the source ramp runs one way, so hue cannot wander between stops. Wired into `vibrantCmyk`; `vibrance = 0` still gives the plain textbook conversion. `cmykToHex` now uses the same forward model, so the on-screen soft proof shows what the sheet will hold.
**Why:** Measured on the NEXT ramp colours the formula flattened worst, the solver loses 42% of chroma against the formula's 60%, *and* lands closer overall (mean OKLab error 0.067 vs 0.085) — more vivid and more accurate, not one bought with the other. Independently re-measured through poppler's CMYK preview across all 57 London grounds, mean saturation now reads 53% *higher* than the RGB patch rather than 16% lower, at a 7% brightness cost. (a) had no idea what it was printing, so it guessed the same way for every hue. (b) is unrepeatable and unaccountable: a signed-off build must be reproducible byte for byte, and a model cannot predict a press.
**Would change if:** the print house supplies a characterisation (ICC or measured patch set) for the actual stock and press — then the forward model is replaced by that data and every build is re-solved, or the resulting builds are simply signed off and move into `APPROVED`.
**Applies to:** every generated CMYK ground, chevron, lockup and outlined-type build in every city. Approved brand builds are still used verbatim, supplied vendor and venue masters are still handed on untouched, and a solved build stays labelled a machine conversion until a printer proofs it. Locked by `src/lib/__tests__/cmyk-gamut-solver.test.ts` (beats the formula on both vividness and accuracy, TAC ≤ 300, no black under saturated colour, 100K near-neutral dark, deterministic, ramp cannot seam).

### 2026-09 — Ground gradients ship as shading patterns on a path, not `sh` or a mesh

**Area:** Print masters (London signage `.ai`, NEXT pillars, agenda boards), RGB and CMYK.
**Options tested:** (1) `sh` operator inside a clip — the original; (2) Type 4 Gouraud mesh — reopens as a gradient *mesh*; (3) analytic Type 2/3 shading referenced by a PatternType 2 pattern, filling a real rectangle.
**Chosen:** (3), in both colour spaces.
**Why:** only (3) reopens in Illustrator as a selectable path with a live, editable gradient — stops, angle and colour builds all retunable. (1) leaves no path to select; (2) leaves a grid of colour points a designer cannot retype a brand hex into. Print output is identical in all three; colour builds are unchanged. Pattern space is measured from the page origin, so the slug offset is added to the gradient geometry.
**Would change if:** a printer's RIP mis-renders a shading pattern (none seen; poppler renders all three surfaces correctly).
**Applies to:** every venue and every future city — all grounds go through the same builders.

### 2026-09 — A re-issued live file becomes a new version, and only when it is newer

**Area:** Live files (London QEII, and every city the same store serves)
**Options tested:** (a) overwrite the file in force wherever the hand-back folder has a file of the same name; (b) load the whole folder as a fresh issue and retire everything before it; (c) compare the hand-back file against the version in force and publish a new version only where the supplied file is newer, leaving the rest untouched.
**Chosen:** (c). The 15 Sept 2026 Dropbox hand-back was matched sign by sign against `london_live_files`: 21 signs had a genuinely newer master and got a v2; 30 signs whose files were unchanged since the 11 Sept issue were left exactly as they were; 14 assets in the folder had no sign at all and were appended to `LONDON_VENUE_ITEMS` (ids `ldn-v66`, `ldn-v74`–`ldn-v86`) with trims read off the supplied artboards.
**Why:** a print vendor must always be handed the newest signed-off artwork, but re-publishing an unchanged file burns a version number and makes the history lie about when a sign was last changed. Matching on filename alone (a) is not enough — two different signs shared the basename `Lifts_Template.ai` (lift door vs lift walls), so the mapping is by folder path, not name. (b) would have retired files that are still the ones in force.
**Would change if:** a hand-back arrives with no reliable file dates — then the comparison falls back to content hash against the stored object.
**Applies to:** every venue hand-back. Old versions are never deleted: they stay in `london_live_files` with `is_active = false`, so a sign can always be rolled back.
