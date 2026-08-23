// -----------------------------------------------------------------------------
// Chromium resolution for headless verification scripts.
//
// Fresh environments (CI images, new sandboxes, a teammate's laptop) often have
// the `playwright` package but no browser binary — or a browser cache whose
// build number doesn't match the pinned package. Either way `chromium.launch()`
// dies with "Executable doesn't exist".
//
// Order:
//   1. PLAYWRIGHT_CHROMIUM_PATH override (must exist, else throw).
//   2. Playwright's own resolution, when that executable is present.
//   3. Any chromium* build in the known browser caches, newest build first.
//   4. Auto-install (`playwright install chromium`) unless opted out.
//   5. Clear, actionable setup instructions.
// -----------------------------------------------------------------------------

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

const RELATIVE_EXES = [
  "chrome-linux/chrome",
  "chrome-linux/headless_shell",
  "chrome-win/chrome.exe",
  "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
];

const SETUP_HINT = [
  "Chromium is not available for Playwright.",
  "",
  "Fix it with either:",
  "  bunx playwright install --with-deps chromium",
  "  npx playwright install --with-deps chromium",
  "",
  "Or point at an existing browser:",
  "  PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome bun run verify:export-audit",
  "",
  "Set PLAYWRIGHT_SKIP_BROWSER_INSTALL=1 to disable the automatic install attempt.",
].join("\n");

function browserRoots() {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/ms-playwright"];
  const home = os.homedir();
  if (home) {
    roots.push(path.join(home, ".cache/ms-playwright"));
    roots.push(path.join(home, "Library/Caches/ms-playwright"));
    roots.push(path.join(home, "AppData/Local/ms-playwright"));
  }
  return roots.filter((r) => !!r && r !== "0" && existsSync(r));
}

const buildNumber = (dir) => {
  const m = /(\d+)$/.exec(dir);
  return m ? Number(m[1]) : 0;
};

function scanCaches() {
  for (const root of browserRoots()) {
    const dirs = readdirSync(root)
      .filter((d) => d.startsWith("chromium"))
      .sort(
        (a, b) =>
          buildNumber(b) - buildNumber(a) ||
          Number(a.includes("headless_shell")) - Number(b.includes("headless_shell")),
      );
    for (const dir of dirs) {
      for (const rel of RELATIVE_EXES) {
        const exe = path.join(root, dir, rel);
        if (existsSync(exe)) return exe;
      }
    }
  }
  return undefined;
}

async function playwrightOwnPath() {
  try {
    const { chromium } = await import("playwright");
    const own = chromium.executablePath();
    return own && existsSync(own) ? own : undefined;
  } catch {
    return undefined;
  }
}

function tryInstall() {
  const runners = [
    ["bunx", ["playwright", "install", "chromium"]],
    ["npx", ["--yes", "playwright", "install", "chromium"]],
  ];
  for (const [cmd, args] of runners) {
    console.log(`· installing Chromium via \`${cmd} ${args.join(" ")}\` (one-time)…`);
    const res = spawnSync(cmd, args, { stdio: "inherit" });
    if (res.status === 0) return true;
  }
  return false;
}

/**
 * Returns launch options for chromium.launch(): `{}` when Playwright's own
 * resolution works, `{ executablePath }` when we found/installed a build
 * elsewhere. Throws with setup instructions when nothing is usable.
 */
export async function ensureChromiumLaunchOptions() {
  const override = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (override) {
    if (!existsSync(override)) {
      throw new Error(
        `PLAYWRIGHT_CHROMIUM_PATH is set to "${override}" but no executable exists there.`,
      );
    }
    return { executablePath: override };
  }

  if (await playwrightOwnPath()) return {};

  const cached = scanCaches();
  if (cached) {
    console.log(`· using Chromium found at ${cached}`);
    return { executablePath: cached };
  }

  if (process.env.PLAYWRIGHT_SKIP_BROWSER_INSTALL === "1") {
    throw new Error(SETUP_HINT);
  }

  if (tryInstall()) {
    if (await playwrightOwnPath()) return {};
    const after = scanCaches();
    if (after) return { executablePath: after };
  }

  throw new Error(SETUP_HINT);
}
