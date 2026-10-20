// @vitest-environment jsdom
import { expect, it } from "vitest";
import { SJB_MAJOR_PIECES, groupSjbPiece } from "./sjb-major-pieces";

it("organizes all 293 source shapes exactly once into 13 major pieces plus the foundation reference", () => {
  expect(SJB_MAJOR_PIECES.filter(p => !p.reference)).toHaveLength(13);
  const indices = SJB_MAJOR_PIECES.flatMap(p => p.indices).sort((a,b) => a-b);
  expect(indices).toEqual(Array.from({length:293},(_,i)=>i));
  expect(SJB_MAJOR_PIECES.find(p=>p.id==="fortress")?.indices).toHaveLength(43);
  expect(SJB_MAJOR_PIECES.find(p=>p.id==="birds")?.indices).toEqual([38,292]);
});

it("creates one named selectable group without changing source order, styles or shape geometry", () => {
  const svg = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg"><defs><style>.p{fill:white}</style></defs><g><path d="M1 2L3 4"/></g><polygon points="1,2 3,4 5,6"/></svg>',"image/svg+xml").documentElement as unknown as SVGSVGElement;
  const before = [...svg.querySelectorAll("path,polygon")].map(e=>e.outerHTML);
  groupSjbPiece(svg,{id:"fortress",name:"Fortress",indices:[0,1]});
  expect([...svg.querySelectorAll("path,polygon")].map(e=>e.outerHTML)).toEqual(before);
  expect(svg.querySelector("#sjb-fortress")?.children).toHaveLength(2);
  expect(svg.querySelector("style")?.textContent).toBe(".p{fill:white}");
});