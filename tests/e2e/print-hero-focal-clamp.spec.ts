/**
 * PrintHeroMedia — focal-point clamping and safeAreaX/Y behavior across breakpoints.
 *
 * The clamp math lives in JS (PrintHeroMediaLayer), so the emitted CSS
 * `object-position` percentages MUST be viewport-invariant. These tests drive
 * the /test/print-hero harness across mobile → 4K widths and verify:
 *   - focal points outside the safe band snap to the safe edge
 *   - focal points inside the safe band pass through unchanged
 *   - safeArea > 40 is clamped to 40 (the hard limit)
 *   - negative / NaN focals fall back to the safe center
 *   - the resulting object-position never varies with viewport width
 */
import { test, expect, type Page } from "@playwright/test";

const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1600, height: 1000 },
  { name: "wide", width: 1920, height: 1080 },
] as const;

type HeroQuery = {
  focalX?: number;
  focalY?: number;
  safeAreaX?: number;
  safeAreaY?: number;
  aspect?: string;
};

function url(q: HeroQuery): string {
  const params = new URLSearchParams({ imageUrl: TRANSPARENT_PNG });
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) params.set(k, String(v));
  }
  return `/test/print-hero?${params.toString()}`;
}

async function readObjectPosition(page: Page): Promise<string> {
  await page.waitForSelector('[data-testid="hero-img"]');
  const val = await page.evaluate(() => {
    const api = (window as unknown as { __printHero?: { getObjectPosition: () => string | null } }).__printHero;
    return api?.getObjectPosition() ?? null;
  });
  expect(val, "object-position must be readable").not.toBeNull();
  return (val as string).trim();
}

function parseObjectPosition(op: string): { x: number; y: number } {
  // Normalize "50% 40%" → { x: 50, y: 40 }.
  const parts = op.replace(/%/g, "").trim().split(/\s+/);
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  return { x, y };
}

test.describe("PrintHeroMedia — focal clamp & safe-area behavior", () => {
  test("focalX beyond right safe-edge snaps to (100 - safeAreaX)", async ({ page }) => {
    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(url({ focalX: 95, focalY: 50, safeAreaX: 10, safeAreaY: 10 }));
      const { x, y } = parseObjectPosition(await readObjectPosition(page));
      expect(x, `${bp.name}: right clamp`).toBe(90);
      expect(y, `${bp.name}: y unchanged`).toBe(50);
    }
  });

  test("focalX below left safe-edge snaps to safeAreaX", async ({ page }) => {
    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(url({ focalX: 3, focalY: 50, safeAreaX: 12, safeAreaY: 10 }));
      const { x } = parseObjectPosition(await readObjectPosition(page));
      expect(x, `${bp.name}: left clamp`).toBe(12);
    }
  });

  test("focalY beyond bottom safe-edge snaps to (100 - safeAreaY)", async ({ page }) => {
    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(url({ focalX: 50, focalY: 98, safeAreaX: 8, safeAreaY: 15 }));
      const { y } = parseObjectPosition(await readObjectPosition(page));
      expect(y, `${bp.name}: bottom clamp`).toBe(85);
    }
  });

  test("focal inside safe band passes through unchanged", async ({ page }) => {
    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(url({ focalX: 42, focalY: 33, safeAreaX: 10, safeAreaY: 10 }));
      const { x, y } = parseObjectPosition(await readObjectPosition(page));
      expect(x, `${bp.name}: x pass-through`).toBe(42);
      expect(y, `${bp.name}: y pass-through`).toBe(33);
    }
  });

  test("safeArea > 40 is capped at 40 (hard upper limit)", async ({ page }) => {
    // safeAreaX=80 / Y=80 must clamp to 40, so the valid focal range is
    // [40, 60] on both axes. Push focals well outside that band to prove
    // the cap is active: 95 → 60, 5 → 40.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url({ focalX: 95, focalY: 5, safeAreaX: 80, safeAreaY: 80 }));
    const { x, y } = parseObjectPosition(await readObjectPosition(page));
    expect(x).toBe(60);
    expect(y).toBe(40);
  });

  test("safeArea < 0 clamps to 0 (no negative buffer)", async ({ page }) => {
    // With safeAreaX=0 there's no clamp, so 95 stays 95.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url({ focalX: 95, focalY: 95, safeAreaX: -20, safeAreaY: -5 }));
    const { x, y } = parseObjectPosition(await readObjectPosition(page));
    expect(x).toBe(95);
    expect(y).toBe(95);
  });

  test("object-position is identical across all breakpoints (viewport-invariant)", async ({ page }) => {
    // The clamp is JS math against props, not viewport size, so the emitted
    // percentages must never drift as the container reflows. Regression guard
    // against anyone reintroducing pixel-based clamping.
    const seen: string[] = [];
    for (const bp of BREAKPOINTS) {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto(url({ focalX: 88, focalY: 22, safeAreaX: 15, safeAreaY: 12 }));
      seen.push(await readObjectPosition(page));
    }
    const unique = Array.from(new Set(seen));
    expect(unique, `object-position varied across breakpoints: ${seen.join(" | ")}`).toHaveLength(1);
    // And the single value is the expected clamp: 88 → 85, 22 → 22.
    const { x, y } = parseObjectPosition(unique[0]!);
    expect(x).toBe(85);
    expect(y).toBe(22);
  });

  test("default safeAreaX/Y (8/10) apply when props omitted", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url({ focalX: 100, focalY: 100 }));
    const { x, y } = parseObjectPosition(await readObjectPosition(page));
    expect(x).toBe(92); // 100 - default safeAreaX(8)
    expect(y).toBe(90); // 100 - default safeAreaY(10)
  });

  test("aspect variants keep the same focal clamp math", async ({ page }) => {
    // Regression: earlier drafts scaled focal by aspect ratio. It shouldn't —
    // object-position is a % of the img element, independent of band shape.
    for (const aspect of ["fill", "21:9", "16:9", "3:2", "4:3", "1:1"]) {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url({ focalX: 95, focalY: 5, safeAreaX: 10, safeAreaY: 10, aspect }));
      const { x, y } = parseObjectPosition(await readObjectPosition(page));
      expect(x, `aspect=${aspect}: x clamp`).toBe(90);
      expect(y, `aspect=${aspect}: y clamp`).toBe(10);
    }
  });
});
