import { describe, expect, it } from "vitest";
import { audienceFor, showElementItem, showTopLink, showBuildDestination } from "./role-nav";

describe("role-split menu", () => {
  it("sales sees create entries, not authoring or admin", () => {
    const a = audienceFor(["sales"], false);
    expect(showTopLink("/admin", a)).toBe(false);
    expect(showTopLink("/approvals", a)).toBe(false);
    expect(showElementItem("/convert", a)).toBe(false);
    expect(showElementItem("/agent", a)).toBe(true);
  });
  it("brand leads get review links but not Admin", () => {
    const a = audienceFor(["brand_lead"], false);
    expect(showTopLink("/approvals", a)).toBe(true);
    expect(showTopLink("/admin", a)).toBe(false);
    expect(showElementItem("/convert", a)).toBe(true);
  });
  it("admins see Admin, not duplicate review links", () => {
    const a = audienceFor(["admin", "brand_lead"], false);
    expect(showTopLink("/admin", a)).toBe(true);
    expect(showTopLink("/approvals", a)).toBe(false);
    expect(showElementItem("/admin/canvas", a)).toBe(true);
  });
  it("only admins see Demos in the main menu", () => {
    expect(showTopLink("/demos", audienceFor(["editor"], false))).toBe(false);
    expect(showTopLink("/demos", audienceFor(["sales"], false))).toBe(false);
    expect(showTopLink("/demos", audienceFor(["admin"], false))).toBe(true);
  });
  it("nothing role-specific shows while loading", () => {
    const a = audienceFor(["admin"], true);
    expect(showTopLink("/admin", a)).toBe(false);
    expect(showTopLink("/approvals", a)).toBe(false);
  });
  it("build navigation keeps source authoring away from create-only roles", () => {
    const a = audienceFor(["sales"], false);
    expect(showBuildDestination("modules", a)).toBe(false);
    expect(showBuildDestination("print", a)).toBe(true);
    expect(showElementItem("/social/modules", a)).toBe(false);
  });
  it("build review is visible only to confirmed reviewers", () => {
    expect(showBuildDestination("review", audienceFor(["admin"], false))).toBe(true);
    expect(showBuildDestination("review", audienceFor(["brand_reviewer"], false))).toBe(true);
    expect(showBuildDestination("review", audienceFor(["editor"], false))).toBe(false);
    expect(showBuildDestination("review", audienceFor(["admin"], true))).toBe(false);
  });
});
