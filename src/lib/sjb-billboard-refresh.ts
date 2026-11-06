/** Immutable cleaned Canva exports and scene composites for the current manual refresh. */
const pointers = import.meta.glob<{ default: { url: string } }>(
  "../assets/sjb-billboard-refresh/*.asset.json", { eager: true },
);

export function refreshedBillboardFile(path: string): string {
  const name = path.replace(/^\/sjb-billboards\//, "").replaceAll("/", "--");
  return pointers[`../assets/sjb-billboard-refresh/${name}.asset.json`]?.default.url ?? path;
}