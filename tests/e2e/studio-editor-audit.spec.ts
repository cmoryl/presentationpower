/**
 * STUDIO + EDITOR AUDIT — one pass over every authoring surface in the build.
 *
 * For each studio/editor route this gate checks the things a real user would
 * notice first, in order:
 *
 *   1. it RENDERS: the route mounts, an <h1> lands, and the body carries text
 *      (catches blank routes, loader throws, and gate redirects);
 *   2. it is INTERACTIVE: the surface exposes editable controls
 *      (input/textarea/select/contenteditable/role=slider/button count);
 *   3. it can COMMIT: a save / apply / publish affordance exists, so an edit is
 *      not a dead end;
 *   4. it is CLEAN: no uncaught runtime error and no console error while the
 *      surface settles.
 *
 * Findings print as one table so a regression is readable without a trace.
 */
import { test, expect } from "@playwright/test";
import { gotoAsAdmin, hasAdminSession } from "./helpers/admin-session";

type Surface = {
  path: string;
  label: string;
  /** false for read-mostly consoles that legitimately have no save button. */
  commits?: boolean;
  /** set when the path is a legacy alias that must land somewhere else. */
  redirectsTo?: string;

};

const SURFACES: Surface[] = [
  { path: "/admin/module-studio", label: "Module Studio" },
  { path: "/admin/icon-studio", label: "Icon Studio", commits: false },
  // Legacy alias: intentionally lands on the single Template Studio at /looks.
  { path: "/admin/templates", label: "Template Studio", redirectsTo: "/looks" },
  { path: "/admin/canvas", label: "Free canvas" },
  { path: "/admin/imagery", label: "Imagery Studio" },
  { path: "/admin/brand-assets", label: "Brand assets" },
  { path: "/admin/knowledge-hub", label: "Knowledge hub", commits: false },
  { path: "/admin/logohub", label: "Logo hub", commits: false },
  { path: "/admin/print-library", label: "Print library", commits: false },
  { path: "/admin/viz-lab", label: "Viz lab", commits: false },
  { path: "/looks", label: "Looks / skin catalog", commits: false },
  { path: "/library/overrides", label: "Override Inspector", commits: false },
  { path: "/library/my", label: "My modules", commits: false },
  { path: "/library/print/modules", label: "Print modules", commits: false },
  { path: "/events/next/pillars", label: "Pillar Studio" },
  { path: "/events/next/agendas", label: "Agenda Studio" },
  { path: "/events/next/mart", label: "Mart artwork studio" },
  { path: "/events/next/city-badges", label: "City badge studio" },
  { path: "/social/banners", label: "LinkedIn banner studio" },
];

type Finding = {
  label: string;
  path: string;
  h1: string;
  chars: number;
  controls: number;
  buttons: number;
  save: string;
  consoleErrors: string[];
  pageErrors: string[];
  problems: string[];
};

test.describe("studio + editor audit", () => {
  test("every authoring surface renders, edits and can commit", async ({ page, context }) => {
    test.skip(!hasAdminSession(), "no admin session material available");
    test.setTimeout(600_000);

    const findings: Finding[] = [];
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 200)));

    for (const surface of SURFACES) {
      consoleErrors.length = 0;
      pageErrors.length = 0;

      const ok = await gotoAsAdmin(page, context, surface.path);
      expect(ok, "admin session install failed").toBe(true);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);

      const probe = await page.evaluate(() => {
        // A studio "commits" through whichever affordance it owns: an explicit
        // save/publish, an upload/ingest (asset studios), an add-to-pack, or a
        // download/export of the artifact being edited.
        const commit =
          /save|apply|publish|update|commit|export|upload|ingest|download|add to|generate|attach/i;
        const buttons = [...document.querySelectorAll("button")];
        const saveBtn = buttons.find((b) => commit.test(b.textContent ?? ""));
        // Asset studios commit through a file input rather than a button.
        const fileInput = document.querySelector<HTMLInputElement>("input[type='file']");
        return {
          h1: document.querySelector("h1")?.textContent?.trim().slice(0, 80) ?? "",
          chars: (document.body.innerText ?? "").trim().length,
          controls: document.querySelectorAll(
            "input, textarea, select, [contenteditable='true'], [role='slider'], [role='switch']",
          ).length,
          buttons: buttons.length,
          save: saveBtn?.textContent?.trim().slice(0, 40) ?? (fileInput ? "file upload input" : ""),
          url: location.pathname,
        };
      });

      const problems: string[] = [];
      const expectedPath = surface.redirectsTo ?? surface.path;
      if (!probe.url.startsWith(expectedPath)) problems.push(`redirected to ${probe.url}`);
      if (!probe.h1) problems.push("no <h1> heading");
      if (probe.chars < 200) problems.push(`near-empty body (${probe.chars} chars)`);
      if (probe.controls + probe.buttons < 3) problems.push("no interactive controls");
      if (surface.commits !== false && !probe.save) problems.push("no save/apply affordance");
      if (pageErrors.length) problems.push(`runtime error: ${pageErrors[0]}`);
      // Network noise (404 on optional media) is not an editor defect; only
      // React/JS console errors are.
      // Aborted media prefetches and dev-server HMR requests surface as
      // "TypeError: Failed to fetch" when the harness navigates away mid-flight;
      // that is transport noise, not an editor defect.
      const realConsole = consoleErrors.filter(
        (t) => !/Failed to load resource|404|Failed to fetch/i.test(t),
      );
      if (realConsole.length) problems.push(`console error: ${realConsole[0]}`);

      findings.push({
        label: surface.label,
        path: surface.path,
        h1: probe.h1,
        chars: probe.chars,
        controls: probe.controls,
        buttons: probe.buttons,
        save: probe.save,
        consoleErrors: [...realConsole],
        pageErrors: [...pageErrors],
        problems,
      });
    }

    for (const f of findings) {
      const status = f.problems.length ? `FAIL ${f.problems.join("; ")}` : "ok";
      console.log(
        `${f.label.padEnd(26)} ${f.path.padEnd(28)} h1="${f.h1}" ctrl=${f.controls} btn=${f.buttons} save="${f.save}" -> ${status}`,
      );
    }

    const broken = findings.filter((f) => f.problems.length);
    expect(
      broken.map((f) => `${f.label}: ${f.problems.join("; ")}`),
      "studio/editor surfaces with problems",
    ).toEqual([]);
  });
});
