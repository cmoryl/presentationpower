import { describe, expect, it } from "vitest";
import { audienceFor, showElementItem, showTopLink } from "./role-nav";

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
  it("nothing role-specific shows while loading", () => {
    const a = audienceFor(["admin"], true);
    expect(showTopLink("/admin", a)).toBe(false);
    expect(showTopLink("/approvals", a)).toBe(false);
  });
});
