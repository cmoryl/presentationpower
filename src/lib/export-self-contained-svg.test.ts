// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { selfContainedSvg } from "./export-self-contained-svg";
import { NEXT_APP_ORIGIN } from "./next-event";

afterEach(() => vi.unstubAllGlobals());

it("embeds the actual GlobalLink NEXT logo as vectors without linked images", async () => {
  const logo = readFileSync("public/next-2026/logos/globallink-side-by-side-color.svg", "utf8");
  const fetcher = vi.fn(async () => ({ ok: true, blob: async () => ({ type: "image/svg+xml", text: async () => logo }) }));
  vi.stubGlobal("fetch", fetcher);
  const result = await selfContainedSvg(`<svg xmlns="http://www.w3.org/2000/svg"><text>Pacific Terrace</text><image href="${NEXT_APP_ORIGIN}/next-2026/logos/globallink-side-by-side-color.svg" x="10" y="20" width="230" height="100"/></svg>`);
  const doc = new DOMParser().parseFromString(result, "image/svg+xml");
  expect(doc.querySelector("parsererror")).toBeNull();
  expect(doc.querySelectorAll("image")).toHaveLength(0);
  expect(doc.querySelectorAll("svg svg path").length).toBeGreaterThan(0);
  expect(doc.querySelector("svg svg")?.getAttribute("x")).toBe("10");
  expect(doc.querySelector("svg svg")?.getAttribute("width")).toBe("230");
  expect(doc.querySelector("text")?.textContent).toBe("Pacific Terrace");
  expect(fetcher).toHaveBeenCalledWith("/next-2026/logos/globallink-side-by-side-color.svg");
});

it("keeps duplicate logo gradients and clip IDs separate and preserves transforms", async () => {
  vi.stubGlobal("fetch", async () => ({ ok: true, blob: async () => ({ type: "image/svg+xml", text: async () => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="paint"/></defs><path fill="url(#paint)" d="M0 0h10v10z"/></svg>' }) }));
  const output = await selfContainedSvg('<svg xmlns="http://www.w3.org/2000/svg"><image href="/logo.svg" transform="rotate(90)" width="20" height="20"/><image href="/logo.svg" width="20" height="20"/></svg>');
  const doc = new DOMParser().parseFromString(output, "image/svg+xml");
  const ids = Array.from(doc.querySelectorAll("[id]")).map((node) => node.id);
  expect(new Set(ids).size).toBe(2);
  expect(doc.querySelector("g")?.getAttribute("transform")).toBe("rotate(90)");
  for (const path of Array.from(doc.querySelectorAll("path"))) {
    const id = path.getAttribute("fill")?.slice(5, -1);
    expect(ids).toContain(id);
  }
});

it("blocks download preparation when a logo cannot be fetched", async () => {
  vi.stubGlobal("fetch", async () => ({ ok: false, status: 404 }));
  await expect(selfContainedSvg('<svg xmlns="http://www.w3.org/2000/svg"><image href="/missing.svg"/></svg>')).rejects.toThrow("404");
});