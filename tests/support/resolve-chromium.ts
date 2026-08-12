/**
 * Chromium resolution for Playwright runs.
 *
 * Why this exists: the sandbox / CI image ships a browser cache whose build
 * number does not always match the pinned `playwright` package (e.g. the
 * package wants chromium-1187 while the image has chromium-1194). Playwright's
 * own default resolution then hard-fails with "Executable doesn't exist".
 *
 * Resolution order — no build numbers are ever hardcoded:
 *   1. PLAYWRIGHT_CHROMIUM_PATH (explicit override). If set but missing → throw.
 *   2. Playwright's own default resolution, when that executable exists.
 *   3. Any chromium* build present under PLAYWRIGHT_BROWSERS_PATH (or the
 *      default cache locations), newest build number first.
 *   4. Nothing found → return undefined and let the caller fail loudly.
 */
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const RELATIVE_EXES = [
  "chrome-linux/chrome",
  "chrome-linux/headless_shell",
  "chrome-win/chrome.exe",
  "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
];

function browserRoots(): string[] {
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/ms-playwright"];
  const home = os.homedir();
  if (home) {
    roots.push(path.join(home, ".cache/ms-playwright"));
    roots.push(path.join(home, "Library/Caches/ms-playwright"));
    roots.push(path.join(home, "AppData/Local/ms-playwright"));
  }
  return roots.filter((r): r is string => !!r && r !== "0" && existsSync(r));
}

/** Build number descending, so the newest available cache wins. */
function buildNumber(dir: string): number {
  const m = /(\d+)$/.exec(dir);
  return m ? Number(m[1]) : 0;
}

function scanCaches(): string | undefined {
  for (const root of browserRoots()) {
    const dirs = readdirSync(root)
      .filter((d) => d.startsWith("chromium"))
      // prefer full chromium over headless_shell at equal build numbers
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

export function resolveChromiumExecutable(): string | undefined {
  const override = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (override && override.length > 0) {
    if (!existsSync(override)) {
      throw new Error(
        `PLAYWRIGHT_CHROMIUM_PATH is set to "${override}" but no executable exists there.`,
      );
    }
    return override;
  }

  // Let Playwright resolve itself when its expected build is actually present.
  try {
    // Lazy require so this module stays usable without @playwright/test loaded.
    const { chromium } = require("@playwright/test") as typeof import("@playwright/test");
    const own = chromium.executablePath();
    if (own && existsSync(own)) return undefined; // undefined = use Playwright default
  } catch {
    /* fall through to cache scan */
  }

  return scanCaches();
}

/**
 * launchOptions fragment for playwright.config.ts. Returns `{}` when
 * Playwright's own resolution is good, so we never pin a build number.
 */
export function chromiumLaunchOptions(): { executablePath?: string } {
  const exe = resolveChromiumExecutable();
  return exe ? { executablePath: exe } : {};
}
