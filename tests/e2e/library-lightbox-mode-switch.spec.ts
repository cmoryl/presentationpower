import { test, expect, type Page } from "@playwright/test";

/**
 * Verifies persistent, isolated video playback in the library lightbox:
 *
 *  1. Open a video-demo card into the lightbox (starts in LIGHT mode).
 *  2. Let the light preview autoplay and record its currentTime.
 *  3. Switch to DARK using the in-lightbox theme toggle.
 *  4. Assert the previous (light) video is no longer playing.
 *  5. Assert the new (dark) video resumes from the persisted currentTime
 *     (per videoPlaybackStore in VariantRenderer), not from 0.
 */

const LIGHTBOX = '[data-preview-role="module-lightbox"]';

async function scrollToLoadAll(page: Page) {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight * 0.85);
    const max = () =>
      Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y < max(); y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  });
}

async function readActiveVideo(page: Page, mode: "light" | "dark") {
  return await page.evaluate((m) => {
    const stage = document.querySelector(
      `[data-preview-role="module-lightbox"][data-preview-mode="${m}"]`,
    );
    if (!stage) return null;
    const v = stage.querySelector("video") as HTMLVideoElement | null;
    if (!v) return null;
    return {
      src: v.currentSrc || v.src,
      paused: v.paused,
      currentTime: v.currentTime,
      readyState: v.readyState,
    };
  }, mode);
}

async function waitForPlaying(page: Page, mode: "light" | "dark", timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snap = await readActiveVideo(page, mode);
    if (snap && !snap.paused && snap.currentTime > 0.05 && snap.readyState >= 2) {
      return snap;
    }
    await page.waitForTimeout(200);
  }
  throw new Error(`No ${mode}-mode video started playing within ${timeoutMs}ms`);
}

test.describe("Library lightbox mode switch", () => {
  test("pauses previous-mode video and resumes new-mode video from persisted time", async ({
    page,
  }) => {
    await page.goto("/library?eager=1", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => undefined);

    // Sample fixtures are WebM/VP9 (see src/lib/video-slide-examples.ts) —
    // Chromium OSS decodes VP9 natively, so this test RUNS in CI instead
    // of skipping the way it did when fixtures were H.264 mp4.
    const canPlayVP9 = await page.evaluate(() => {
      const v = document.createElement("video");
      return Boolean(v.canPlayType('video/webm; codecs="vp9"'));
    });
    expect(canPlayVP9, "browser lacks VP9 WebM support for sample media").toBe(true);

    // Imagery is off by default on /library — toggle it on so video-demo
    // Zoom affordances render (they gate on imagery being visible).
    const imageryToggle = page.getByTestId("library-imagery-toggle");
    await expect(imageryToggle).toBeVisible({ timeout: 10_000 });
    if ((await imageryToggle.getAttribute("aria-pressed")) !== "true") {
      await imageryToggle.click();
      await expect(imageryToggle).toHaveAttribute("aria-pressed", "true");
    }

    await scrollToLoadAll(page);

    // Video-demo cards render a "Zoom" affordance (non-video cards say "Details").
    const zoomCard = page
      .locator('button:has(span:has-text("Zoom"))')
      .first();
    await expect(zoomCard, "no video-demo card with a Zoom affordance").toBeVisible({
      timeout: 15_000,
    });
    await zoomCard.scrollIntoViewIfNeeded();
    await zoomCard.click();

    // Lightbox mounts in LIGHT mode.
    const lightStage = page.locator(`${LIGHTBOX}[data-preview-mode="light"]`);
    await expect(lightStage).toBeVisible({ timeout: 10_000 });

    // Wait for the light video to autoplay, then let it advance so
    // videoPlaybackStore captures a non-zero currentTime on unmount.
    const lightSnap = await waitForPlaying(page, "light");
    await page.waitForTimeout(1500);
    const lightBeforeSwitch = await readActiveVideo(page, "light");
    expect(lightBeforeSwitch).not.toBeNull();
    const persistedTime = lightBeforeSwitch!.currentTime;
    expect(persistedTime, "light video did not advance before switch").toBeGreaterThan(
      0.3,
    );
    const lightSrc = lightSnap.src;

    // Flip the in-lightbox toggle to DARK (scope to lightbox — the page
    // header also has a "☾ Dark" button that would trip strict mode).
    await page.getByLabel("Enlarged slide preview").getByRole("button", { name: /Dark/ }).click();

    // Dark stage takes over; the light stage should no longer exist.
    const darkStage = page.locator(`${LIGHTBOX}[data-preview-mode="dark"]`);
    await expect(darkStage).toBeVisible({ timeout: 10_000 });
    await expect(lightStage).toHaveCount(0);

    // No LIGHT-mode video may still be playing inside the lightbox after
    // the switch. The dark stage's <video> shares the same src (light +
    // dark previews reuse the media URL), so we scope by preview-mode,
    // not by src.
    void lightSrc;
    const stalePlaying = await page.evaluate(() => {
      const box = document.querySelector('[aria-label="Enlarged slide preview"]');
      if (!box) return [];
      const lightStage = box.querySelector('[data-preview-mode="light"]');
      if (!lightStage) return [];
      return Array.from(lightStage.querySelectorAll("video"))
        .filter((v) => !v.paused && v.currentTime > 0.05)
        .map((v) => ({ src: v.currentSrc || v.src, t: v.currentTime }));
    });
    expect(
      stalePlaying,
      `previous-mode video kept playing after switch: ${JSON.stringify(stalePlaying)}`,
    ).toEqual([]);

    // Dark video must resume — not reset — from the persisted currentTime.
    const darkSnap = await waitForPlaying(page, "dark");
    // Same underlying media URL (light + dark previews share the video).
    expect(darkSnap.src).toBe(lightSrc);
    // Allow a small tolerance for the brief mount/seek window.
    expect(
      darkSnap.currentTime,
      `dark video started at ${darkSnap.currentTime}s but expected to resume near ${persistedTime}s`,
    ).toBeGreaterThanOrEqual(Math.max(0.1, persistedTime - 0.75));
  });
});
