import { defineConfig, devices } from "@playwright/test";
import { chromiumLaunchOptions } from "./tests/support/resolve-chromium";

/**
 * Cross-browser matrix for module preview video-demo autoplay.
 * The /library route renders each video demo card as an AB pair
 * (light + dark previews side-by-side), so a single page load
 * exercises both modes per browser.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // Launch the browser once before any spec: a resolution/launch failure must
  // fail the run explicitly instead of degrading into instant spec timeouts.
  globalSetup: "./tests/support/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // Deck-creation specs (brief → deck → editor hydration) are slow; running
  // many of them concurrently starves the dev server and produces navigation
  // timeouts that are pure infrastructure flake, not product regressions.
  workers: 2,
  retries: 1,

  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080",
    viewport: { width: 1280, height: 1800 },
    ignoreHTTPSErrors: true,
    video: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // No hardcoded build numbers: resolution is Playwright's own default
        // when its expected build is installed, otherwise the newest chromium
        // found in the browser caches, otherwise an explicit loud failure.
        launchOptions: chromiumLaunchOptions(),
      },
    },
    // NOTE: Firefox and WebKit runners are intentionally NOT enabled here.
    // Playwright doesn't ship their binaries by default in this sandbox and
    // installing them isn't permitted, so listing them as projects would
    // silently no-op or fail. When "full Playwright suite" is invoked, only
    // Chromium runs — that's the honest scope of local + CI coverage.
  ],
});

