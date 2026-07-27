// Kit export — capture each rendered SocialRenderer asset at native
// resolution and bundle the PNGs plus a manifest.json into a downloadable
// zip. Runs client-side only.
import JSZip from "jszip";
import { toPng } from "html-to-image";
import type { CampaignAsset } from "@/lib/campaigns";

function slug(s: string) {
  return (s || "kit")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function captureAsset(asset: CampaignAsset): Promise<Blob | null> {
  const root = document.querySelector<HTMLElement>(`[data-kit-asset-id="${asset.id}"]`);
  if (!root) return null;
  // The scaled inner frame — SocialRenderer renders it as the first
  // descendant with an inline transform.
  const inner =
    root.querySelector<HTMLElement>("[data-kit-asset-frame]") ??
    (root.firstElementChild as HTMLElement | null);
  if (!inner) return null;

  const dataUrl = await toPng(inner, {
    width: asset.format.width,
    height: asset.format.height,
    canvasWidth: asset.format.width,
    canvasHeight: asset.format.height,
    pixelRatio: 1,
    cacheBust: true,
    style: {
      transform: "none",
      width: `${asset.format.width}px`,
      height: `${asset.format.height}px`,
    },
  });
  const res = await fetch(dataUrl);
  return await res.blob();
}

export async function exportKitZip(
  assets: CampaignAsset[],
  kitName: string,
  onProgress?: (done: number, total: number) => void,
) {
  if (!assets.length) throw new Error("No assets to export.");
  const zip = new JSZip();
  const folder = zip.folder(slug(kitName) || "kit")!;
  const manifest: Array<Record<string, unknown>> = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    try {
      const blob = await captureAsset(asset);
      if (blob) {
        const filename = `${String(i + 1).padStart(2, "0")}-${slug(asset.format.label)}-${asset.format.width}x${asset.format.height}.png`;
        folder.file(filename, blob);
        manifest.push({
          file: filename,
          formatId: asset.format.id,
          label: asset.format.label,
          width: asset.format.width,
          height: asset.format.height,
          mode: asset.mode,
          brandId: asset.brandId,
          copy: asset.copy,
        });
      }
    } catch (err) {
      console.error("[kit-export] capture failed", asset.id, err);
    }
    onProgress?.(i + 1, assets.length);
  }

  folder.file(
    "manifest.json",
    JSON.stringify(
      { name: kitName, exportedAt: new Date().toISOString(), assets: manifest },
      null,
      2,
    ),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(kitName) || "kit"}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
