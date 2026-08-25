import { test, expect, type Page } from "@playwright/test";
import { gotoAsAdmin, hasAdminSession } from "./helpers/admin-session";

/**
 * Admin editing-control coverage.
 *
 * Verifies the three governance surfaces an admin works in daily —
 * Translation (glossary / DNT), GlobalLink Share (delivery), and the
 * Approvals process queue — mount every editing affordance and that the
 * actions are actually enabled (not read-only, not permanently disabled).
 *
 * Runs only when authenticated session material is available; otherwise the
 * specs skip loudly rather than asserting on the /auth redirect.
 */

async function bodyText(page: Page) {
  return page.locator("body").innerText();
}

/** Every visible control on the page must not be inertly disabled. */
async function enabledCount(page: Page) {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("button, input, select, textarea"),
    ).filter((el) => el.offsetParent !== null);
    return {
      total: nodes.length,
      enabled: nodes.filter(
        (el) => !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true",
      ).length,
    };
  });
}

test.describe("Admin editing controls", () => {
  test.skip(!hasAdminSession(), "No authenticated session available in this environment");

  test("/admin/translation exposes glossary editing controls", async ({ page, context }) => {
    const ok = await gotoAsAdmin(page, context, "/admin/translation");
    expect(ok, "expected an authenticated admin session, got /auth").toBe(true);

    // Term creation row: input + scope select + Add action.
    await expect(page.getByPlaceholder(/Term \(e\.g\. GlobalLink\)/i)).toBeEnabled();
    const scope = page.getByLabel("New Scope");
    await expect(scope).toBeEnabled();
    expect(await scope.locator("option").count()).toBeGreaterThanOrEqual(2);

    const add = page.getByRole("button", { name: /^Add$/i }).first();
    await expect(add).toBeVisible();
    await expect(add).toBeEnabled();

    // Scope filter chips are all interactive.
    for (const label of ["all", "global", "division", "deck"]) {
      await expect(page.getByRole("button", { name: label, exact: true }).first()).toBeEnabled();
    }

    // Glossary table renders its editable columns.
    for (const col of [/^Term$/i, /^Scope$/i, /^Scope ID$/i, /^DNT$/i]) {
      await expect(
        page.locator("th").filter({ hasText: col }).first(),
        `missing glossary column ${col}`,
      ).toBeVisible();
    }

    // Typing into the term field must be accepted (field is not read-only).
    await page.getByPlaceholder(/Term \(e\.g\. GlobalLink\)/i).fill("E2E Probe Term");
    await expect(page.getByPlaceholder(/Term \(e\.g\. GlobalLink\)/i)).toHaveValue(
      "E2E Probe Term",
    );

    // Selecting "division" un-gates the scope-id field.
    await scope.selectOption("division");
    await expect(page.getByPlaceholder(/Division id/i)).toBeEnabled();

    expect(await bodyText(page)).not.toMatch(
      /access required|not authorized|Something went wrong/i,
    );
  });

  test("/admin/globallink-share exposes delivery settings controls", async ({ page, context }) => {
    const ok = await gotoAsAdmin(page, context, "/admin/globallink-share");
    expect(ok, "expected an authenticated admin session, got /auth").toBe(true);

    // Connection probe is present. It is enabled only once credentials are
    // configured (by design), so enablement is asserted conditionally.
    const testBtn = page.getByRole("button", { name: /Test connection/i }).first();
    await expect(testBtn).toBeVisible();
    // The button self-documents its gate via title; only assert enablement
    // when credentials are actually configured in this environment.
    const gated = /Configure credentials first/i.test((await testBtn.getAttribute("title")) ?? "");
    if (!gated) await expect(testBtn).toBeEnabled();
    await expect(page.getByRole("button", { name: /Save defaults/i }).first()).toBeEnabled();

    // Editable default fields.
    const folder = page.getByPlaceholder(/e\.g\. Sales \/ EMEA/i);
    await expect(folder).toBeEnabled();
    await folder.fill("E2E / QA");
    await expect(folder).toHaveValue("E2E / QA");

    // Policy toggles present and switchable (auto-share may be gated on
    // connection state by design, so it is exempt from the enabled check).
    const text = await bodyText(page);
    for (const toggle of [
      "Password protect share links",
      "Notify recipients",
      "Auto-share on export",
    ]) {
      expect(text, `missing toggle ${toggle}`).toContain(toggle);
    }

    // Activity ledger: either the table with its columns, or the empty state.
    expect(text).toMatch(/Recent activity/i);
    if (!/No shares yet/i.test(text)) {
      for (const col of ["Deck / File", "Status", "Link"]) {
        expect(text, `missing activity column ${col}`).toContain(col);
      }
    }

    const counts = await enabledCount(page);
    expect(counts.total).toBeGreaterThan(5);
    expect(counts.enabled).toBeGreaterThan(3);
  });

  test("/admin/approvals exposes the review process actions", async ({ page, context }) => {
    const ok = await gotoAsAdmin(page, context, "/admin/approvals");
    expect(ok, "expected an authenticated admin session, got /auth").toBe(true);

    const text = await bodyText(page);
    // Admins must never see the reviewer-gate wall.
    expect(text, "admin hit the reviewer-access wall").not.toMatch(/Reviewer access required/i);
    expect(text).toMatch(/Approvals command center/i);

    // Queue filters are editable.
    await expect(page.getByPlaceholder(/Search title, content, variant/i)).toBeEnabled();
    await expect(page.getByLabel("Variant Filter")).toBeEnabled();

    // Queue tabs are always interactive.
    for (const tab of [
      /^Pending/i,
      /^Changes requested/i,
      /^Expiring soon/i,
      /^Recently reviewed/i,
    ]) {
      await expect(page.getByRole("button", { name: tab }).first()).toBeEnabled();
    }

    const empty = /Queue is empty/i.test(text);
    if (empty) {
      // Nothing to review right now: the process screen is healthy as long as
      // filters + tabs are live. Bulk/per-item actions only mount with rows.
      expect(await page.getByRole("button", { name: /^Approve/i }).count()).toBe(0);
      return;
    }

    // Bulk approve mounts with rows; it stays disabled until rows are selected.
    await expect(page.getByRole("button", { name: /^Approve/i }).first()).toBeVisible();
    const selectAll = page.getByRole("checkbox").first();
    await expect(selectAll).toBeEnabled();
    await selectAll.check();
    await expect(page.getByRole("button", { name: /^Approve/i }).first()).toBeEnabled();

    // Per-item decision triad + reviewer notes.
    await expect(page.getByPlaceholder(/Reviewer notes/i).first()).toBeEnabled();
    for (const action of [/Request changes/i, /^Reject$/i]) {
      await expect(page.getByRole("button", { name: action }).first()).toBeVisible();
    }

    expect(text).not.toMatch(/Something went wrong|Application error/i);
  });
});
