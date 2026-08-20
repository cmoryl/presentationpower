# Visual regression — module library (per template)

`scripts/visual-regression-library.mjs` opens `/library` in headless Chromium
at each configured responsive breakpoint (mobile / tablet / desktop),
captures a PNG per module-variant card **bucketed by family** so each
template/layout has its own snapshot folder, and runs two overlap checks
against every template:

1. **Stat vs grid-track overlap** — `[data-stat-figure]` boxes that intersect
   a sibling grid/flex track inside the same card.
2. **Stage overflow** — any headline / body / stat that escapes the
   1920×1080 slide stage (`[data-slide-stage]`).

Any finding not whitelisted in `library.baseline.json` fails the run
(exit 1) so template-specific regressions cannot slip in.

## Run locally

```bash
# dev server must be running on :8080
node scripts/visual-regression-library.mjs --mode ab
# → tests/snapshots/library/<breakpoint>/<family>/<variantId>.png + report.json
```

Flags:

- `--mode light|dark|ab` (default `ab`)
- `--breakpoints mobile,tablet,desktop` (default all three)
- `--url http://localhost:8080/library`
- `--out tests/snapshots/library`
- `--baseline tests/snapshots/library.baseline.json`
- `--tolerance 2` (px; ignores hairline anti-alias overlap)

Breakpoint viewports:

| Preset  | Viewport      | Grid tier the library renders |
| ------- | ------------- | ----------------------------- |
| mobile  | 390×1800      | single column                 |
| tablet  | 834×1800      | 2-up                          |
| desktop | 1440×1800     | 3-up                          |

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` overrides the browser binary when the
matching Playwright download is unavailable.

## Baseline

`library.baseline.json` holds a list of accepted overlaps. Entries may be:

- `"MV-FOO"` — accepted on **every** breakpoint
- `"MV-FOO@mobile"` — accepted only on that breakpoint

Add IDs only after design review; empty means zero-tolerance.

---

# Print module PDF snapshots

`scripts/print-module-pdf-snapshots.mjs` exports one representative print
section module **per module family** (8 pages) through the production
`exportPrintAssetAsPdf` path — Letter trim, digital format, vector-text overlay
on — using the `/dev/print-module-pdf` harness, then:

1. asserts PDF geometry with `pdfinfo` (page count + 612 × 792 pt Letter trim),
2. rasterizes each page with `pdftoppm` at a fixed 816 px width,
3. pixel-diffs against `tests/snapshots/print-modules/<moduleId>.<mode>.png`.

Demo copy comes from each module's own `make()` and is generated once per page
load, so runs are byte-stable: repeated runs measure **0.000%** mismatch, while
swapping one section for another measures ~3.5%. Default tolerance is 0.2%.

What this catches: section-renderer layout drift, iconography treatment drift
(size / stroke / accent), vector-text placement drift, trim-geometry changes,
and authoring chrome leaking into an export (the harness deliberately renders a
`data-export-ignore` label that must not appear in the PDF).

What it does **not** prove: how a print vendor's RIP or Acrobat renders the
file. It is a drift detector against our own previous output.

```bash
# dev server must be running on :8080
bun run verify:print-modules            # compare against baselines
bun run verify:print-modules:update     # re-record after an intended change
bun run verify:print-modules:ci         # light + dark, exit 1 on drift
```

Flags: `--id <moduleId>` (repeatable), `--modes light,dark`, `--tolerance`,
`--url`, `--out`. Failures write `actual.*.png` and `diff.*.png` into
`artifacts/print-module-pdf/`.
