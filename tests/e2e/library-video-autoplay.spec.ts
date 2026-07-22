import { test, expect, type Page } from "@playwright/test";

/**
 * Cross-browser guard: module preview video demos must autoplay
 * on the /library page in Chrome (chromium), Safari (webkit), and Firefox.
 *
 * Every library video-demo card renders as an AB pair — one light preview
 * and one dark preview — so a single page load asserts autoplay in BOTH
 * modes. We require ≥1 light-mode <video> and ≥1 dark-mode <video> to be
 * actively playing (currentTime advances, not paused, readyState >= 2).
 */

const AUTOPLAY_POLL_MS = 12_000;

async function scrollToLoadAll(page: Page) {
  // The library grid uses <LazyMount>, so cards below the fold don't
  // render <video> elements until scrolled into view. Walk the page
  // top-to-bottom to force every video-demo tile to mount.
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.85);
    const max = () =>
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      );
    for (let y = 0; y < max(); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

/**
 * Snapshot each <video> on the page and classify it as light- or
 * dark-mode by walking up the ancestor chain looking for the
 * SlideChrome background token (dark tiles use #03002C / a `.dark`
 * ancestor, light tiles use #F2F2F2 / white surfaces).
 */
async function readVideoState(page: Page) {
  return await page.evaluate(() => {
    const isDarkAncestor = (el: Element | null): boolean => {
      let node: Element | null = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        // Very dark surfaces → dark mode preview
        const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) {
          const [r, g, b] = [+m[1], +m[2], +m[3]];
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (lum < 0.15) return true;
          if (lum > 0.85) return false;
        }
        if (node.classList?.contains("dark")) return true;
        node = node.parentElement;
      }
      return false;
    };

    return Array.from(document.querySelectorAll("video")).map((v) => ({
      src: v.currentSrc || v.src,
      paused: v.paused,
      currentTime: v.currentTime,
      readyState: v.readyState,
      muted: v.muted,
      autoplay: v.autoplay,
      dark: isDarkAncestor(v),
    }));
  });
}

test.describe("Module preview video-demo autoplay matrix", () => {
  test("autoplays in light + dark previews on /library", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    await page.goto("/library", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await scrollToLoadAll(page);

    // Wait for at least one <video> to appear.
    await page.waitForFunction(
      () => document.querySelectorAll("video").length > 0,
      { timeout: 20_000 },
    );

    // Poll until at least one light + one dark video are actively playing.
    const deadline = Date.now() + AUTOPLAY_POLL_MS;
    let snapshot: Awaited<ReturnType<typeof readVideoState>> = [];
    while (Date.now() < deadline) {
      snapshot = await readVideoState(page);
      const playingLight = snapshot.some(
        (v) => !v.dark && !v.paused && v.currentTime > 0.05 && v.readyState >= 2,
      );
      const playingDark = snapshot.some(
        (v) => v.dark && !v.paused && v.currentTime > 0.05 && v.readyState >= 2,
      );
      if (playingLight && playingDark) break;
      await page.waitForTimeout(500);
    }

    await testInfo.attach("video-snapshot.json", {
      body: JSON.stringify(snapshot, null, 2),
      contentType: "application/json",
    });

    const totalVideos = snapshot.length;
    expect(totalVideos, "no <video> elements found on /library").toBeGreaterThan(
      0,
    );

    const playing = snapshot.filter(
      (v) => !v.paused && v.currentTime > 0.05 && v.readyState >= 2,
    );
    const playingLight = playing.filter((v) => !v.dark);
    const playingDark = playing.filter((v) => v.dark);

    expect(
      playingLight.length,
      `no LIGHT-mode video demo autoplayed (of ${totalVideos} videos)`,
    ).toBeGreaterThan(0);
    expect(
      playingDark.length,
      `no DARK-mode video demo autoplayed (of ${totalVideos} videos)`,
    ).toBeGreaterThan(0);

    expect(
      consoleErrors,
      `page errors during autoplay check: ${consoleErrors.join(" | ")}`,
    ).toEqual([]);
  });
});
