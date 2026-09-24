import { describe, expect, it } from "vitest";
import { contentFromSlide } from "@/lib/cross-format-adapt";

describe("adaptor reads the fields saved modules actually use", () => {
  it("title + subtitle + title/body items", () => {
    const c = contentFromSlide({ content: { title: "One platform", subtitle: "Every market", items: [{ title: "Unified intake", body: "One request surface." }] } });
    expect(c.headline).toBe("One platform");
    expect(c.body).toBe("Every market");
    expect(c.points).toEqual(["Unified intake — One request surface."]);
  });
  it("flat stat + unit, and metric strings", () => {
    expect(contentFromSlide({ content: { title: "x", stat: "40", unit: "%" } }).stat?.value).toBe("40%");
    expect(contentFromSlide({ content: { title: "x", metric: "38% ↓ time to market" } }).stat).toEqual({ value: "38%", label: "↓ time to market" });
    expect(contentFromSlide({ content: { title: "x", metric: "6 wks → 9 days" } }).stat?.value).toBe("6 wks → 9 days");
  });
  it("before/after and people rows", () => {
    expect(contentFromSlide({ content: { title: "x", items: [{ before: "Slow", after: "Fast" }] } }).points).toEqual(["Slow → Fast"]);
    expect(contentFromSlide({ content: { title: "x", items: [{ name: "Alex Rivera", role: "Account Director" }] } }).points).toEqual(["Alex Rivera — Account Director"]);
  });
  it("case-study narrative fields become body", () => {
    expect(contentFromSlide({ content: { clientName: "Acme", narrative: "What we did." } }).body).toBe("What we did.");
  });
  it("photos held as objects or lists carry across", () => {
    expect(contentFromSlide({ content: { title: "x", photo: { url: "/p.jpg" } } }).media).toMatchObject({ kind: "photo", url: "/p.jpg" });
    expect(contentFromSlide({ content: { title: "x", images: [{ src: "/q.jpg" }] } }).media).toMatchObject({ kind: "photo", url: "/q.jpg" });
  });
});
