import { describe, expect, it } from "vitest";
import {
  findTemplateProject, SPXL_PROJECT, SPXL_PROJECT_WAS,
  SPXT_PROJECT, SPXT_PROJECT_WAS, TEMPLATE_NAV, templateDestination,
} from "../element-update/template-navigation";

describe("v221 template project compatibility", () => {
  it("finds existing example projects under either exact name without renaming", () => {
    for (const name of ["Example: Templates", "Example: Spectrum templates"]) {
      const project = Object.freeze({ id: "example", name });
      expect(findTemplateProject([project], "example")).toBe(project);
      expect(project.name).toBe(name);
    }
    expect(SPXL_PROJECT).toBe("Example: Templates");
    expect(SPXL_PROJECT_WAS).toBe("Example: Spectrum templates");
  });
  it("finds existing masters under either exact name without renaming", () => {
    for (const name of ["Template masters", "Spectrum template masters"]) {
      const project = Object.freeze({ id: "master", name });
      expect(findTemplateProject([project], "masters")).toBe(project);
      expect(project.name).toBe(name);
    }
    expect(SPXT_PROJECT).toBe("Template masters");
    expect(SPXT_PROJECT_WAS).toBe("Spectrum template masters");
  });
  it("excludes deleted matches and preserves first-live-match ordering", () => {
    const old = { name: "Example: Spectrum templates", id: "old" };
    const next = { name: "Example: Templates", id: "new" };
    expect(findTemplateProject([{ ...next, deletedAt: "2026-11-15" }, old, next], "example")).toBe(old);
    expect(findTemplateProject([next, old], "example")).toBe(next);
  });
  it("does not cross-match project groups or fuzzy names", () => {
    expect(findTemplateProject([{ name: "Template masters" }], "example")).toBeUndefined();
    expect(findTemplateProject([{ name: "Example: Spectrum" }], "example")).toBeUndefined();
    expect(findTemplateProject(undefined, "masters")).toBeUndefined();
  });
  it("both spoken names resolve to the unchanged source key and existing destination", () => {
    expect(templateDestination("templates")).toBe(TEMPLATE_NAV);
    expect(templateDestination("spectrum")).toBe(TEMPLATE_NAV);
    expect(TEMPLATE_NAV.key).toBe("spectrum");
    expect(TEMPLATE_NAV.iconKey).toBe("nav-spx");
    expect(TEMPLATE_NAV.order).toBe(4);
    expect(TEMPLATE_NAV.to).toBe("/library/print");
    expect(templateDestination("modules")).toBeUndefined();
  });
});