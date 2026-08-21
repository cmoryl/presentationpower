/**
 * Shared e2e helper: restore an authenticated (admin) session into the browser
 * context before visiting gated /admin routes.
 *
 * Session material comes from the sandbox environment (injected by the
 * platform) or from a session file minted with `lovable auth-session --json`.
 * Nothing is ever logged: only a boolean is returned.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { BrowserContext, Page } from "@playwright/test";

type SessionMaterial = {
  storageKey: string;
  sessionJson: string;
  cookies: Array<Record<string, unknown>>;
};

function fromEnv(): SessionMaterial | null {
  const storageKey = process.env["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"];
  const sessionJson = process.env["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"];
  if (!storageKey || !sessionJson) return null;
  const cookiesRaw = process.env["LOVABLE_BROWSER_SUPABASE_COOKIES_JSON"];
  let cookies: Array<Record<string, unknown>> = [];
  try {
    cookies = cookiesRaw ? JSON.parse(cookiesRaw) : [];
  } catch {
    cookies = [];
  }
  return { storageKey, sessionJson, cookies };
}

function fromMintedFile(): SessionMaterial | null {
  const file = path.join(os.homedir(), ".cache", "lovable-auth", "session.json");
  if (!fs.existsSync(file)) return null;
  try {
    const minted = JSON.parse(fs.readFileSync(file, "utf8")) as {
      storage_key?: string;
      session?: unknown;
      cookies?: Array<Record<string, unknown>>;
    };
    if (!minted.storage_key || !minted.session) return null;
    return {
      storageKey: minted.storage_key,
      sessionJson: JSON.stringify(minted.session),
      cookies: Array.isArray(minted.cookies) ? minted.cookies : [],
    };
  } catch {
    return null;
  }
}

export function hasAdminSession(): boolean {
  return Boolean(fromEnv() ?? fromMintedFile());
}

/**
 * Installs the session, then navigates to `path`. Returns false when no
 * session material exists (callers should skip rather than fail).
 */
export async function gotoAsAdmin(
  page: Page,
  context: BrowserContext,
  target: string,
  baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:8080",
): Promise<boolean> {
  const material = fromEnv() ?? fromMintedFile();
  if (!material) return false;

  if (material.cookies.length) {
    await context.addCookies(
      material.cookies.map((c) => ({ ...c, url: baseURL })) as never,
    );
  }

  // Establish the origin first so the localStorage write lands on it.
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key!, value!),
    [material.storageKey, material.sessionJson],
  );

  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);
  return !/\/auth(\?|$|\/)/.test(page.url());
}
