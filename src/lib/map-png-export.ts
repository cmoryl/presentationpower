// Rasterize a DOM node (map + inline legend) to a PNG file download.
// Uses html-to-image, loaded dynamically so it never runs during SSR.
export async function exportMapNodeAsPng(
  node: HTMLElement,
  filename = "world-stats.png",
  backgroundColor = "#ffffff",
): Promise<void> {
  if (typeof window === "undefined") return;
  const { toPng } = await import("html-to-image");
  const { withExportChrome, isAuthoringChrome } = await import("./export-chrome-suppress");
  // Hide the export button itself in the snapshot.
  const dataUrl = await withExportChrome(() =>
    toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor,
      filter: (el) => {
        if (!(el instanceof HTMLElement)) return true;
        if (el.getAttribute("aria-label") === "Export map as PNG") return false;
        if (isAuthoringChrome(el)) return false;
        return true;
      },
    }),
  );
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
