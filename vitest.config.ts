import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Vitest config — the Playwright e2e specs under `tests/e2e/` import from
 * `@playwright/test` and are only executed by the Playwright runner
 * (`bunx playwright test`), not by vitest. Exclude that directory so
 * `bunx vitest run` reports a clean unit-test pass.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ["tests/support/london-font.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // `src/routes/library.spec.tsx` is the /library/spec page — a TanStack
    // route file whose name matches the test glob but holds no tests, so
    // vitest reported "No test suite found". Route files are never tests.
    exclude: ["**/node_modules/**", "tests/e2e/**", "**/dist/**", "**/.nitro/**", "src/routes/**"],
    // Several suites sweep whole catalogs (150+ signage panels, 200+ module
    // variants, the full layout-arbiter combination space). They do real work,
    // so vitest's 5s default failed purely because the catalogs grew — a
    // timeout that looked identical to a product regression. Give them room;
    // genuinely hung tests still fail well inside CI limits.
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
