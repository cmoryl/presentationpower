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
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "tests/e2e/**", "**/dist/**", "**/.nitro/**"],
  },
});
