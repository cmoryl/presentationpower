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
 * dark-mode using the explicit `[data-preview-mode]` marker set by the
 * library preview container. This is the source of truth for which
 * mode a preview is rendering in — no ancestor luminance heuristics.
 * A video without such an ancestor is reported as `mode: "unknown"` so
 * the test can surface unexpected renders instead of silently miscounting.
 */
async function readVideoState(page: Page) {
  return await page.evaluate(() => {
    const modeOf = (el: Element | null): "light" | "dark" | "unknown" => {
      const host = el?.closest("[data-preview-mode]") as HTMLElement | null;
      const v = host?.dataset.previewMode;
      return v === "light" || v === "dark" ? v : "unknown";
    };

    return Array.from(document.querySelectorAll("video")).map((v) => ({
      src: v.currentSrc || v.src,
      paused: v.paused,
      currentTime: v.currentTime,
      readyState: v.readyState,
      muted: v.muted,
      autoplay: v.autoplay,
      mode: modeOf(v),
    }));
  });
}


test.describe("Module preview video-demo autoplay matrix", () => {
  test("autoplays in light + dark previews on /library", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (err) => {
      consoleErrors.push(String(err));
    });

    await page.goto("/library?eager=1", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);

    // Sample fixtures are WebM/VP9 (see src/lib/video-slide-examples.ts).
    // Every Chromium build — including Playwright's bundled OSS build —
    // supports VP9, so the autoplay path actually runs in CI rather than
    // skipping (as it did when fixtures were H.264 mp4). If a browser
    // ever lands here without VP9, surface that as a real failure.
    const canPlayVP9 = await page.evaluate(() => {
      const v = document.createElement("video");
      return Boolean(v.canPlayType('video/webm; codecs="vp9"'));
    });
    expect(canPlayVP9, "browser lacks VP9 WebM support for sample media").toBe(true);

    // Imagery is off by default on /library (perf: 156 modules). A real user
    // toggles it on to see video-demo backdrops — do that here explicitly
    // instead of flipping the product default just to make the test pass.
    const imageryToggle = page.getByTestId("library-imagery-toggle");
    await expect(imageryToggle).toBeVisible({ timeout: 10_000 });
    if ((await imageryToggle.getAttribute("aria-pressed")) !== "true") {
      await imageryToggle.click();
      await expect(imageryToggle).toHaveAttribute("aria-pressed", "true");
    }

    // Default preview mode is Light-only. To exercise BOTH light and dark
    // autoplay paths in a single load, flip the preview to A/B mode so
    // each variant renders light + dark previews side-by-side.
    const abToggle = page.getByRole("button", { name: /A\/B/ });
    await expect(abToggle).toBeVisible({ timeout: 10_000 });
    if ((await abToggle.getAttribute("aria-pressed")) !== "true") {
      await abToggle.click();
      await expect(abToggle).toHaveAttribute("aria-pressed", "true");
    }

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
      const isPlaying = (v: (typeof snapshot)[number]) =>
        !v.paused && v.currentTime > 0.05 && v.readyState >= 2;
      const playingLight = snapshot.some((v) => v.mode === "light" && isPlaying(v));
      const playingDark = snapshot.some((v) => v.mode === "dark" && isPlaying(v));
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

    const unknownMode = snapshot.filter((v) => v.mode === "unknown");
    expect(
      unknownMode.length,
      `videos rendered outside a [data-preview-mode] container: ${unknownMode
        .map((v) => v.src)
        .join(", ")}`,
    ).toBe(0);

    const playing = snapshot.filter(
      (v) => !v.paused && v.currentTime > 0.05 && v.readyState >= 2,
    );
    const playingLight = playing.filter((v) => v.mode === "light");
    const playingDark = playing.filter((v) => v.mode === "dark");

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
