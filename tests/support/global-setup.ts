/**
 * Fail-loud preflight.
 *
 * A browser that cannot launch used to surface as every spec "timing out" in a
 * few milliseconds — indistinguishable from a product regression, and easy to
 * mistake for a pass when specs are skipped. Launching once here turns any
 * resolution/launch problem into a single explicit run-level failure before the
 * first spec executes.
 */
import { chromium } from "@playwright/test";
import { chromiumLaunchOptions, resolveChromiumExecutable } from "./resolve-chromium";

export default async function globalSetup() {
  const opts = chromiumLaunchOptions();
  try {
    const browser = await chromium.launch({ headless: true, ...opts });
    const version = browser.version();
    await browser.close();
    console.log(
      `[playwright] chromium ${version} via ${
        opts.executablePath ?? "playwright default resolution"
      }`,
    );
  } catch (err) {
    const resolved = (() => {
      try {
        return resolveChromiumExecutable() ?? "playwright default";
      } catch (e) {
        return `resolution error: ${String(e)}`;
      }
    })();
    throw new Error(
      `Playwright cannot launch Chromium — aborting the whole run so this is not ` +
        `mistaken for passing tests.\n` +
        `  resolved executable: ${resolved}\n` +
        `  PLAYWRIGHT_BROWSERS_PATH: ${process.env.PLAYWRIGHT_BROWSERS_PATH ?? "<unset>"}\n` +
        `  PLAYWRIGHT_CHROMIUM_PATH: ${process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "<unset>"}\n` +
        `  Fix: run \`npx playwright install chromium\` or point ` +
        `PLAYWRIGHT_CHROMIUM_PATH at a real binary.\n` +
        `  underlying error: ${String(err)}`,
    );
  }
}
