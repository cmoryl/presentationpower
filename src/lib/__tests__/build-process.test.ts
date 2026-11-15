import { describe, expect, it } from "vitest";
import { BUILD_DESTINATIONS, BUILD_CHANNELS } from "../build-workspace";
import { sourceBuildChecks, sourceMaterialChannel } from "../element-update/process";
import { blankSourceModule } from "../element-update/registry";

describe("source build process", () => {
  it("selected variation retains layout configuration without example copy", () => {
    const module = blankSourceModule("hero", { layout: "right", title: "Sample claim", photo: { elib: "sample.jpg" }, align: "center" });
    expect(module.data.layout).toBe("right");
    expect(module.data.align).toBe("center");
    expect(module.data.title).toBe("");
    expect(module.data.photo).toBeNull();
  });
  it("empty materials cannot pass proof checks", () => {
    expect(sourceBuildChecks({ modules: [] })).toEqual([{ key: "empty", message: "Add a module before preparing a proof." }]);
  });
  it("unfinished quote content cannot pass proof checks", () => {
    expect(sourceBuildChecks({ modules: [{ type: "quote", data: { quote: "" } }] }).map(c => c.key)).toContain("0-quote");
    expect(sourceBuildChecks({ modules: [{ type: "quote", data: { quote: "Exact supplied quote" } }] })).toEqual([]);
  });
  it("material navigation follows actual output size", () => {
    expect(sourceMaterialChannel("slide")).toBe("slides");
    expect(sourceMaterialChannel("story")).toBe("social");
    expect(sourceMaterialChannel("a4")).toBe("print");
  });
  it("checks unfinished content inside nested flexible rows", () => {
    const checks = sourceBuildChecks({ modules: [{ type: "row", data: { slots: [{ type: "quote", data: { quote: "" } }] } }] });
    expect(checks.map(c => c.key)).toContain("0-slot-0-quote");
  });
  it("the build stages link to existing saved work and approval authorities", () => {
    expect(BUILD_DESTINATIONS.map(d => d.to)).toEqual(["/build", "/library", "/library/print", "/files", "/approvals"]);
    expect(BUILD_CHANNELS.find(c => c.id === "events")?.to).toBe("/events");
  });
});