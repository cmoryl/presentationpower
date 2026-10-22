import { describe, expect, it } from "vitest";
import { moduleLifecycle, moduleReferenceIds, retirementIssue, usageFromReferences, restorePolicy } from "../module-catalogue-core";
import { buildModuleManifests } from "../module-catalogue";
import { PRINT_SECTION_MODULES } from "../print-library/section-modules";
import { SOCIAL_MODULE_LAYOUTS } from "../social-module-layouts";
import { customModuleSlide } from "../custom-modules";

describe("module governance contract", () => {
  it("requires both published and approved for team module availability", () => {
    expect(moduleLifecycle("published", "draft")).toBe("draft");
    expect(moduleLifecycle("published", "approved")).toBe("approved");
    expect(moduleLifecycle("draft", "pending")).toBe("in-review");
    expect(moduleLifecycle("archived", "approved")).toBe("retired");
  });
  it("counts explicit identities, never wording or coincidental names", () => {
    const ids = moduleReferenceIds({ title: "pm-stats-stat-bento-portrait", modules: [{ kind: "stats", variantId: "stat-bento-portrait" }], context: { pageTemplateId: "template-1" }, source_module_ids: ["MV-ONE"], content: { __customModuleId: "custom-1" } });
    expect([...ids].sort()).toEqual(["MV-ONE", "custom-1", "section:stats:stat-bento-portrait", "stat-bento-portrait", "template-1"].sort());
    expect(ids.has("pm-stats-stat-bento-portrait")).toBe(false);
  });
  it("deduplicates repeated module uses within the same saved piece", () => {
    expect(usageFromReferences([{ id: "d1", kind: "decks", title: "Deck", href: null }, { id: "d1", kind: "decks", title: "Deck", href: null }, { id: "t1", kind: "templates", title: "Template", href: null }])).toEqual({ decks: 1, print: 0, templates: 1, social: 0, events: 0 });
  });
  it("blocks retirement with incomplete evidence even after acknowledgment", () => {
    expect(retirementIssue({ decks: 0, print: 0, templates: 0, social: 0, events: 0 }, false, true)).toMatch(/fully checked/);
  });
  it("requires impact acknowledgment when saved pieces reference a module", () => {
    const usage = { decks: 2, print: 1, templates: 0, social: 0, events: 0 };
    expect(retirementIssue(usage, true, false)).toMatch(/saved work/);
    expect(retirementIssue(usage, true, true)).toBeNull();
  });
  it("restoration never bypasses review or publishes a restored page template", () => {
    expect(restorePolicy("custom_modules")).toBe("Restores as a draft; a new review is required.");
    expect(restorePolicy("print_page_templates")).toBe("Restores as a private template; publishing remains an admin decision.");
  });
  it("records custom source identity when inserting a module slide", () => {
    const built = customModuleSlide({ id: "saved-module", module_key: "CM-TEST", name: "Saved", description: "", base_variant_id: "MV-CANVAS-BLANK", family_id: "MF-08", section_id: null, brand_mode: null, tags: [], content: { title: "Authored headline" }, canvas_blocks: [], notes: null, thumbnail_url: null, status: "published" });
    expect(built?.slide.content.__customModuleId).toBe("saved-module");
    expect(built?.slide.content.title).toBe("Authored headline");
  });
});

describe("derived module catalogue", () => {
  it("has one adaptation per real print master, inherits edits and never invents a social registry", () => {
    const first = PRINT_SECTION_MODULES[0]; if (!first) throw new Error("Print registry empty");
    const data = { variants: [], families: [], custom: [], overrides: [{ scope: "print", module_id: first.id, label: "Edited master", hidden: true, updated_at: "2026-10-22T17:00:00Z" }], templates: [], references: {}, history: [], people: {}, errors: [], complete: true, checkedAt: "2026-10-22T17:00:00Z" };
    const records = buildModuleManifests(data, () => ({ owner: null, authority: "unowned" }));
    const adaptations = records.filter((m) => m.classification === "adaptation");
    expect(adaptations.length).toBe(SOCIAL_MODULE_LAYOUTS.length);
    const inherited = adaptations.find((m) => m.id === first.id);
    expect(inherited?.label).toBe("Edited master");
    expect(inherited?.lifecycle).toBe("retired");
    expect(inherited?.dependencies).toEqual([first.id]);
    expect(new Set(records.map((m) => m.key)).size).toBe(records.length);
  });
});