// @vitest-environment jsdom
import { expect, it } from "vitest";
import { extractSjbShapes } from "./sjb-shape-extraction";

it("extracts paths, polygons and polylines without losing inherited colour or coordinates", () => {
  const svg = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg"><defs><style>.p{fill:white}</style></defs><g transform="translate(2 3)"><path d="M1 2L3 4"/><polygon class="p" points="1,2 3,4 5,6"/><polyline points="2,3 4,5"/></g></svg>', "image/svg+xml").documentElement as unknown as SVGSVGElement;
  const result = extractSjbShapes(svg, [1, 2]);
  expect(result.querySelectorAll("path, polygon, polyline")).toHaveLength(2);
  expect(result.querySelector("polygon")?.getAttribute("points")).toBe("1,2 3,4 5,6");
  expect(result.querySelector("g")?.getAttribute("transform")).toBe("translate(2 3)");
  expect(result.querySelector("style")?.textContent).toBe(".p{fill:white}");
  expect(svg.querySelectorAll("path, polygon, polyline")).toHaveLength(3);
});