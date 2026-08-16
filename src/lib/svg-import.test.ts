// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { importSvgMarkup } from "./svg-import";

describe("importSvgMarkup", () => {
  it("keeps geometry and derives aspect from the viewBox", () => {
    const art = importSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100" fill="#003FC7"/></svg>`,
      "client-mark.svg",
    );
    expect(art).not.toBeNull();
    expect(art!.aspect).toBeCloseTo(2);
    expect(art!.src.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(art!.src)).toContain("<rect");
    expect(art!.alt).toBe("client mark graphic");
  });

  it("strips scripts, handlers and external references", () => {
    const art = importSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50">` +
        `<script>alert(1)</script>` +
        `<rect width="50" height="50" onclick="alert(2)" fill="url(https://evil.test/x)"/>` +
        `<image href="https://evil.test/pixel.png"/>` +
        `<use xlink:href="#ok"/>` +
        `</svg>`,
      "dirty.svg",
    );
    const xml = decodeURIComponent(art!.src);
    expect(xml).not.toContain("<script");
    expect(xml).not.toContain("onclick");
    expect(xml).not.toContain("evil.test");
    expect(xml).toContain('href="#ok"');
  });

  it("rejects non-SVG payloads", () => {
    expect(importSvgMarkup("<html><body>nope</body></html>", "x.svg")).toBeNull();
  });
});
