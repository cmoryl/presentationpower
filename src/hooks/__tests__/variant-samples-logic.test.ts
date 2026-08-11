// Logic audit for the module (variant sample) editor's data layer.
//
// These are the invariants the Slide Studio relies on:
//  1. reserved keys (__ink / __inkScope / __modes) never render as copy
//  2. a light-only / dark-only layer patches copy only in that mode
//  3. bulk apply carries style, never words
//  4. the diff view reports added / removed / changed leaves
import { describe, expect, it } from "vitest";
import {
  INK_KEY,
  INK_SCOPE_KEY,
  MODES_KEY,
  applyModeCopy,
  countSampleStyle,
  diffSampleContent,
  extractSampleStyle,
  mergeModeInk,
  splitSampleContent,
} from "../use-variant-samples";

const payload = {
  title: "Shared title",
  items: [{ kind: "media", mediaUrl: "a.jpg" }, { kind: "stat", value: "42" }],
  [INK_KEY]: { title: "#003FC7" },
  [INK_SCOPE_KEY]: { heading: "#03002C" },
  [MODES_KEY]: {
    dark: { copy: { title: "Dark title", "items[0].mediaUrl": "b.jpg" }, ink: { title: "#A1FBF9" } },
  },
} as Record<string, unknown>;

describe("sample payload split", () => {
  it("keeps reserved keys out of renderable copy", () => {
    const { copy, ink, modes } = splitSampleContent(payload);
    expect(Object.keys(copy).sort()).toEqual(["items", "title"]);
    expect(ink.inkOverrides).toEqual({ title: "#003FC7" });
    expect(ink.inkScopeOverrides).toEqual({ heading: "#03002C" });
    expect(modes.dark?.copy?.title).toBe("Dark title");
  });

  it("tolerates a payload with no overrides at all", () => {
    const { copy, ink, modes } = splitSampleContent({ title: "x" });
    expect(copy).toEqual({ title: "x" });
    expect(ink.inkOverrides).toBeUndefined();
    expect(modes).toEqual({});
  });
});

describe("appearance-mode layers", () => {
  const { copy, ink, modes } = splitSampleContent(payload);

  it("applies dark-only copy without touching the shared payload", () => {
    const dark = applyModeCopy(copy, modes.dark);
    expect(dark.title).toBe("Dark title");
    expect((dark.items as { mediaUrl: string }[])[0].mediaUrl).toBe("b.jpg");
    // Source object untouched (studio depends on this for "shared" edits).
    expect(copy.title).toBe("Shared title");
    expect((copy.items as { mediaUrl: string }[])[0].mediaUrl).toBe("a.jpg");
  });

  it("returns the same copy object when the mode has no patches", () => {
    expect(applyModeCopy(copy, undefined)).toBe(copy);
    expect(applyModeCopy(copy, { copy: {} })).toBe(copy);
  });

  it("lets mode ink win over shared ink", () => {
    expect(mergeModeInk(ink, modes.dark).inkOverrides).toEqual({ title: "#A1FBF9" });
    expect(mergeModeInk(ink, modes.light).inkOverrides).toEqual({ title: "#003FC7" });
  });
});

describe("bulk style apply", () => {
  it("extracts colours and mode ink but never copy", () => {
    const style = extractSampleStyle(payload);
    expect(style.ink).toEqual({ title: "#003FC7" });
    expect(style.inkScope).toEqual({ heading: "#03002C" });
    expect(style.modes?.dark).toEqual({ ink: { title: "#A1FBF9" } });
    expect(JSON.stringify(style)).not.toContain("Dark title");
    expect(JSON.stringify(style)).not.toContain("mediaUrl");
  });

  it("counts every individual rule for the UI badge", () => {
    expect(countSampleStyle(extractSampleStyle(payload))).toBe(3);
    expect(countSampleStyle({})).toBe(0);
  });
});

describe("version diff", () => {
  it("classifies added, removed and changed leaves", () => {
    const rows = diffSampleContent(
      { title: "Old", gone: "bye", items: [{ value: "1" }] },
      { title: "New", items: [{ value: "1" }], extra: "hi" },
    );
    expect(rows.map((r) => [r.path, r.kind])).toEqual([
      ["extra", "added"],
      ["gone", "removed"],
      ["title", "changed"],
    ]);
  });

  it("reports nothing for identical payloads", () => {
    expect(diffSampleContent(payload, structuredClone(payload))).toEqual([]);
  });
});
