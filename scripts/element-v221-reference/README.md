# Supplied ELEMENT v221 regression specifications

These 66 files are preserved unchanged from the styles-and-tests package. They
target the supplied `test.html` mock application, **not** the React app. A clean
reference-harness result does not certify this application's roles, saves,
exports, or visual parity. Never serve or mount the mock application here.

The isolated execution report lives in `docs/claude-v221-styles-audit.json`.
Source tests require Playwright, a sibling `test.html`, pinned export libraries,
and additional photo/production-build fixtures. Keep harness staging, browser
output, and package downloads under `/tmp`; do not import fixture identities or
sign-offs into real records. Port applicable behavior assertions into the
existing Vitest tests alongside each implemented capability.

Original module and shell styles are preserved in
`src/lib/element-update/reference/`. Run `node scripts/scope-v221-canvas.cjs`
to regenerate the **canvas-only** stylesheet. Shell styles are reference-only:
the existing app keeps its navigation, roles and saved-work adapters.