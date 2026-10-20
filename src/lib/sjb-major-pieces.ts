import { SJB_COMPONENTS, SJB_SCENE_ELEMENTS, SJB_TRANSPERFECT_INDICES } from "./san-juan-logo-construction";

export interface SjbMajorPiece { id: string; name: string; indices: number[]; reference?: boolean }
const range = (start: number, count: number) => Array.from({ length: count }, (_, i) => start + i);

/** Semantic grouping only: never remove detail or change source stacking order. */
export const SJB_MAJOR_PIECES: SjbMajorPiece[] = [
  ...SJB_SCENE_ELEMENTS.filter(e => e.id !== "scene-bird").map(e => ({ id: e.id, name: e.id === "banner" ? "Ribbon and stars" : e.name, indices: e.id === "banner" ? e.paths.filter(i => !SJB_TRANSPERFECT_INDICES.includes(i)) : [...e.paths] })),
  { id: "transperfect-lettering", name: "TRANSPERFECT lettering", indices: SJB_TRANSPERFECT_INDICES },
  ...SJB_COMPONENTS.filter(e => ["waves-sun-trim", "san-juan-lettering", "bowl-lettering"].includes(e.id)).map(e => {
    const before = SJB_COMPONENTS.filter(p => p.order < e.order).reduce((n, p) => n + p.paths, 0);
    return { id: e.id, name: e.name, indices: range(before, e.paths) };
  }),
  { id: "birds", name: "Bird pair", indices: [38, 292] },
  { id: "source-reference", name: "Source foundation geometry", indices: range(0, 34), reference: true },
];

export function groupSjbPiece(svg: SVGSVGElement, piece: SjbMajorPiece): SVGSVGElement {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("id", `sjb-${piece.id}`);
  group.setAttribute("data-name", piece.name);
  const children = Array.from(svg.children).filter(e => !["defs", "title", "desc"].includes(e.localName));
  children.forEach(e => group.appendChild(e));
  svg.appendChild(group);
  return svg;
}