import { defineConfig, devices } from "@playwright/test";

/**
 * Cross-browser matrix for module preview video-demo autoplay.
 * The /library route renders each video demo card as an AB pair
 * (light + dark previews side-by-side), so a single page load
 * exercises both modes per browser.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
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
        launchOptions: (() => {
          // Use bundled sandbox chromium locally; fall back to Playwright's
          // own install in CI (env var unset or empty).
          const custom = process.env.PLAYWRIGHT_CHROMIUM_PATH;
          const sandbox = "/chromium-1194/chrome-linux/chrome";
          const executablePath =
            custom && custom.length > 0
              ? custom
              : process.env.CI
                ? undefined
                : sandbox;
          return executablePath ? { executablePath } : {};
        })(),
      },
    },
    // NOTE: Firefox and WebKit runners are intentionally NOT enabled here.
    // Playwright doesn't ship their binaries by default in this sandbox and
    // installing them isn't permitted, so listing them as projects would
    // silently no-op or fail. When "full Playwright suite" is invoked, only
    // Chromium runs — that's the honest scope of local + CI coverage.
  ],
});
