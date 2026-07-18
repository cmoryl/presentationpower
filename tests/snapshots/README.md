# Visual regression — module library

`scripts/visual-regression-library.mjs` opens `/library` in headless Chromium,
captures a PNG per module-variant card, and inspects every `[data-stat-figure]`
for bounding-box overlap against sibling grid tracks. Any overlap not
whitelisted in `library.baseline.json` fails the run (exit 1) so CI catches
stat/layout regressions like the "$220k ↔ Included list" case.

## Run locally

```bash
# dev server must be running on :8080
node scripts/visual-regression-library.mjs --mode ab
# → tests/snapshots/library/*.png + report.json
```

Flags:

- `--mode light|dark|ab` (default `ab`)
- `--url http://localhost:8080/library`
- `--out tests/snapshots/library`
- `--baseline tests/snapshots/library.baseline.json`
- `--tolerance 2` (pixels; ignores hairline anti-alias overlap)

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` overrides the browser binary when the
matching Playwright download is unavailable.

## Baseline

`library.baseline.json` holds a list of variantIds where an overlap is
intentional (e.g. an artistic overhang). Add IDs there only after a design
review; empty means zero-tolerance.
