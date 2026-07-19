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
# → tests/snapshots/library/<breakpoint>/*.png + report.json
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
