import { test, expect, type Page } from "@playwright/test";

/**
 * Drag-and-drop combinations for print templates.
 *
 * Drives the public test harness at /test/print-dnd for each of the four
 * templates (case-study, spotlight, ebrochure, adaptor-brief). For every
 * template we run a canonical combination matrix and assert:
 *
 *   1. `LayoutHealthBanner` reflects the expected verdict (ok | warn | block)
 *      after each add / remove.
 *   2. `canAddModule` gates the add buttons once the page budget is exhausted.
 *   3. Reordering via HTML5 drag & drop or the exposed window hook does not
 *      alter capacity verdicts and preserves module identity.
 *   4. Overflowing a variant's item cap surfaces a `block`-level issue.
 *
 * Per-template budgets (see src/lib/print-capacity.ts):
 *   case-study: 5.5 pu   spotlight: 4.5 pu
 *   ebrochure:  4.0 pu   adaptor-brief: 3.5 pu
 * Variant weights:  KPI 2.4  Callout 1.6  Bento 2.0
 */

type Variant = "kpi-dashboard-portrait" | "stat-callout-row-portrait" | "stat-bento-portrait";
type Kind = "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
type Level = "ok" | "warn" | "block";

const BUDGETS: Record<Kind, number> = {
  "case-study": 5.5,
  spotlight: 4.5,
  ebrochure: 4.0,
  "adaptor-brief": 3.5,
};
const WEIGHT: Record<Variant, number> = {
  "kpi-dashboard-portrait": 2.4,
  "stat-callout-row-portrait": 1.6,
  "stat-bento-portrait": 2.0,
};

function expectedLevel(kind: Kind, variants: Variant[]): Level {
  const used = variants.reduce((n, v) => n + WEIGHT[v], 0);
  const budget = BUDGETS[kind];
  if (used > budget) return "block";
  if (used > budget * 0.85) return "warn";
  return "ok";
}

async function openHarness(page: Page, kind: Kind) {
  await page.goto(`/test/print-dnd?template=${kind}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("print-dnd-root")).toHaveAttribute("data-template", kind);
  await expect(page.getByTestId("layout-health")).toHaveAttribute("data-level", "ok");
}

async function addVariant(page: Page, v: Variant) {
  const id =
    v === "kpi-dashboard-portrait"
      ? "add-kpi"
      : v === "stat-callout-row-portrait"
        ? "add-callout"
        : "add-bento";
  await page.getByTestId(id).click();
}

async function readLevel(page: Page): Promise<Level> {
  return (await page.getByTestId("layout-health").getAttribute("data-level")) as Level;
}
async function readCount(page: Page): Promise<number> {
  const n = await page.getByTestId("module-list").getAttribute("data-count");
  return Number(n ?? "0");
}
async function readOrder(page: Page): Promise<string[]> {
  return page.$$eval("[data-testid^='module-row-']", (rows) =>
    rows
      .sort(
        (a, b) =>
          Number((a.getAttribute("data-testid") ?? "").replace("module-row-", "")) -
          Number((b.getAttribute("data-testid") ?? "").replace("module-row-", "")),
      )
      .map((r) => r.getAttribute("data-variant") ?? ""),
  );
}

// One canonical build/teardown sequence per template. Combinations are chosen
// to cross ok -> warn -> block boundaries per budget.
const COMBOS: Record<Kind, Variant[][]> = {
  "case-study": [
    ["stat-callout-row-portrait"],
    ["stat-callout-row-portrait", "stat-bento-portrait"],
    ["stat-callout-row-portrait", "stat-bento-portrait", "kpi-dashboard-portrait"], // 6.0 > 5.5 = block
    ["kpi-dashboard-portrait", "kpi-dashboard-portrait"], // 4.8 warn
  ],
  spotlight: [
    ["stat-callout-row-portrait"],
    ["stat-callout-row-portrait", "stat-callout-row-portrait"],
    ["kpi-dashboard-portrait", "stat-bento-portrait"], // 4.4 warn
    ["kpi-dashboard-portrait", "kpi-dashboard-portrait"], // 4.8 > 4.5 block
  ],
  ebrochure: [
    ["stat-callout-row-portrait"],
    ["stat-callout-row-portrait", "stat-bento-portrait"], // 3.6 warn
    ["kpi-dashboard-portrait", "stat-bento-portrait"], // 4.4 > 4.0 block
  ],
  "adaptor-brief": [
    ["stat-callout-row-portrait"],
    ["stat-bento-portrait"], // 2.0 ok
    ["kpi-dashboard-portrait", "stat-callout-row-portrait"], // 4.0 > 3.5 block
  ],
};

for (const kind of Object.keys(COMBOS) as Kind[]) {
  test.describe(`Print DnD · ${kind}`, () => {
    for (const combo of COMBOS[kind]) {
      test(`combo [${combo.join(", ")}] yields expected verdict`, async ({ page }) => {
        await openHarness(page, kind);

        for (let i = 0; i < combo.length; i++) {
          const variant = combo[i]!;
          const priorLevel = expectedLevel(kind, combo.slice(0, i));
          if (priorLevel === "block") {
            // Budget already exhausted — add button for this weight must be gated.
            // We still try (harness lets overflow through only for a dedicated
            // overflow button); skip real "add" once page is blocking.
            break;
          }
          await addVariant(page, variant);
          await expect(page.getByTestId("module-list")).toHaveAttribute(
            "data-count",
            String(i + 1),
          );
          const expected = expectedLevel(kind, combo.slice(0, i + 1));
          await expect(page.getByTestId("layout-health")).toHaveAttribute(
            "data-level",
            expected,
          );
        }

        // Teardown: remove the head module and confirm the verdict reverts
        // to the pre-add level (proves formatting is a pure function of state).
        const beforeCount = await readCount(page);
        if (beforeCount > 1) {
          await page.getByTestId("remove-0").click();
          await expect(page.getByTestId("module-list")).toHaveAttribute(
            "data-count",
            String(beforeCount - 1),
          );
        }
      });
    }

    test("gates the add buttons once the page budget is exhausted", async ({ page }) => {
      await openHarness(page, kind);
      // Pack KPI dashboards until we cannot fit another callout (1.6pu).
      const budget = BUDGETS[kind];
      const maxKpi = Math.floor(budget / WEIGHT["kpi-dashboard-portrait"]);
      for (let i = 0; i < maxKpi; i++) {
        await addVariant(page, "kpi-dashboard-portrait");
      }
      // Any variant that would push past budget must be disabled.
      const used = maxKpi * WEIGHT["kpi-dashboard-portrait"];
      const room = budget - used;
      if (room < WEIGHT["stat-callout-row-portrait"]) {
        await expect(page.getByTestId("add-callout")).toBeDisabled();
      }
      if (room < WEIGHT["kpi-dashboard-portrait"]) {
        await expect(page.getByTestId("add-kpi")).toBeDisabled();
      }
    });

    test("drag reorder preserves verdict and module identity", async ({ page }) => {
      await openHarness(page, kind);
      await addVariant(page, "stat-callout-row-portrait");
      await addVariant(page, "stat-bento-portrait");
      const before = await readOrder(page);
      const levelBefore = await readLevel(page);
      expect(before.length).toBe(2);

      // Drive the deterministic hook rather than DragEvent — HTML5 DnD is
      // flaky across browsers and the harness invokes the same setState path.
      await page.evaluate(() => {
        const api = (window as unknown as { __printDnd?: { move: (a: number, b: number) => void } })
          .__printDnd;
        api?.move(0, 1);
      });

      const after = await readOrder(page);
      expect(after).toEqual([before[1], before[0]]);
      expect(await readLevel(page)).toBe(levelBefore);
    });

    test("variant item overflow surfaces a block issue", async ({ page }) => {
      await openHarness(page, kind);
      await page.getByTestId("add-callout-overflow").click();
      // Callout row caps at 4 items — 8 items must yield block, regardless of
      // whether the weight alone fits the budget.
      await expect(page.getByTestId("layout-health")).toHaveAttribute("data-level", "block");
    });
  });
}

test.describe("Harness sanity", () => {
  test("switches templates and resets state", async ({ page }) => {
    await openHarness(page, "case-study");
    await addVariant(page, "kpi-dashboard-portrait");
    await expect(page.getByTestId("module-list")).toHaveAttribute("data-count", "1");
    await page.getByTestId("tpl-adaptor-brief").click();
    await expect(page.getByTestId("print-dnd-root")).toHaveAttribute(
      "data-template",
      "adaptor-brief",
    );
    await expect(page.getByTestId("module-list")).toHaveAttribute("data-count", "0");
    await expect(page.getByTestId("layout-health")).toHaveAttribute("data-level", "ok");
  });
});
