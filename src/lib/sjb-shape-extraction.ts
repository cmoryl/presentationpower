/** Extract unchanged source shapes, including inherited styles and transforms. Browser-only calls. */
export const SJB_SHAPE_SELECTOR = "path, polygon, polyline";

export function extractSjbShapes(source: SVGSVGElement, indices: readonly number[]): SVGSVGElement {
  const clone = source.cloneNode(true) as SVGSVGElement;
  const keep = new Set(indices);
  Array.from(clone.querySelectorAll(SJB_SHAPE_SELECTOR)).forEach((shape, index) => {
    if (!keep.has(index)) shape.remove();
    else shape.removeAttribute("data-i");
  });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("viewBox", "0 0 1254 1254");
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  return clone;
}

export function downloadSjbSvg(svg: SVGSVGElement, filename: string) {
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}