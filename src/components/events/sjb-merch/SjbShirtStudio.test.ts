import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Bowl studio set coverage", () => {
  it("provides a saved six-view studio comp for each of the 25 existing sets", () => {
    const sets = readdirSync(resolve("src/assets/sjb-shirts")).filter((name) => name.startsWith("set-") && name.endsWith(".asset.json"));
    expect(sets).toHaveLength(25);
    const studio = readdirSync(resolve("src/assets/sjb-shirt-studio")).filter((name) => name.startsWith("studio-set-"));
    expect(studio).toHaveLength(25);
    for (const name of sets) {
      expect(studio).toContain(`studio-${name}`);
      const pointer = JSON.parse(readFileSync(resolve("src/assets/sjb-shirt-studio", `studio-${name}`), "utf8"));
      expect(pointer.content_type).toBe("image/jpeg");
      expect(pointer.size).toBeGreaterThan(10000);
      expect(pointer.url).toMatch(/^\/__l5e\/assets-v1\//);
    }
  });
});