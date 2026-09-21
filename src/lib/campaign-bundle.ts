// ---------------------------------------------------------------------------
// Multi-channel campaign bundler.
//
// One campaign lands in several places at once: a deck for the meeting, social
// cards for the channels, print collateral for the stand. This packages all of
// them into a single structured ZIP with a manifest that says exactly what each
// file is, what format it is in, and at what resolution.
//
//   campaign-name/
//     manifest.json        every asset, format, resolution, byte size
//     README.txt           the same in plain language
//     presentations/       .pptx decks
//     social/              platform-sized cards (PNG at native pixels)
//     print/               press-bound collateral
//
// The heavy libraries (JSZip, the PowerPoint writer, the DOM rasteriser) are
// imported lazily inside the bundling call, so nothing here is evaluated during
// server rendering.
//
// Honesty rule: anything rasterised from the DOM is a proof, not a press
// master, and the manifest says so per asset.
// ---------------------------------------------------------------------------

export type BundleChannel = "presentations" | "social" | "print" | "email";

export const BUNDLE_CHANNEL_LABEL: Record<BundleChannel, string> = {
  presentations: "Presentations",
  social: "Social cards",
  print: "Print collateral",
  email: "Email",
};

/** Which folder a platform-sized asset belongs in. */
export function channelForPlatform(platform: string | null | undefined): BundleChannel {
  switch ((platform ?? "").toLowerCase()) {
    case "email":
      return "email";
    case "signage":
    case "print":
      return "print";
    default:
      return "social";
  }
}

export function bundleSlug(value: string | null | undefined, fallback = "campaign"): string {
  const slug = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

export function bundleEntryName(opts: {
  index: number;
  label?: string | null;
  width?: number | null;
  height?: number | null;
  ext: string;
}): string {
  const n = String(opts.index).padStart(2, "0");
  const size = opts.width && opts.height ? `-${opts.width}x${opts.height}` : "";
  return `${n}-${bundleSlug(opts.label, "asset")}${size}.${opts.ext.replace(/^\./, "")}`;
}

export type BundleAsset = {
  channel: BundleChannel;
  /** Path inside the zip, relative to the bundle folder. */
  file: string;
  label: string;
  /** File format, e.g. "pptx", "png", "pdf". */
  format: string;
  width: number | null;
  height: number | null;
  bytes: number;
  /** "vector" for a real editable/vector file, "proof" for a DOM raster. */
  fidelity: "vector" | "proof";
  notes?: string;
};

export type CampaignManifest = {
  bundle: string;
  campaign: string;
  brandId: string | null;
  exportedAt: string;
  channels: Array<{ channel: BundleChannel; label: string; count: number }>;
  assets: BundleAsset[];
  totalBytes: number;
};

export function buildCampaignManifest(input: {
  campaign: string;
  brandId?: string | null;
  assets: BundleAsset[];
  exportedAt?: Date;
}): CampaignManifest {
  const bundle = bundleSlug(input.campaign);
  const channels = (Object.keys(BUNDLE_CHANNEL_LABEL) as BundleChannel[])
    .map((channel) => ({
      channel,
      label: BUNDLE_CHANNEL_LABEL[channel],
      count: input.assets.filter((a) => a.channel === channel).length,
    }))
    .filter((c) => c.count > 0);
  return {
    bundle,
    campaign: input.campaign,
    brandId: input.brandId ?? null,
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    channels,
    assets: input.assets,
    totalBytes: input.assets.reduce((sum, a) => sum + a.bytes, 0),
  };
}

export function manifestReadme(m: CampaignManifest): string {
  const lines: string[] = [];
  lines.push(`${m.campaign} — campaign bundle`);
  lines.push(`Exported ${m.exportedAt}`);
  if (m.brandId) lines.push(`Brand mode: ${m.brandId}`);
  lines.push("");
  for (const c of m.channels) {
    lines.push(`${c.label} (${c.count})`);
    for (const a of m.assets.filter((x) => x.channel === c.channel)) {
      const size = a.width && a.height ? `${a.width}×${a.height}` : "—";
      const kind = a.fidelity === "proof" ? "proof (not a press master)" : "editable / vector";
      lines.push(`  ${a.file} · ${a.label} · ${a.format.toUpperCase()} · ${size} · ${kind}`);
    }
    lines.push("");
  }
  lines.push("manifest.json carries the same list in machine-readable form.");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------

export type BundleSource =
  /** A blob produced by a real exporter (PowerPoint, PDF, .ai). */
  | {
      kind: "file";
      channel: BundleChannel;
      label: string;
      ext: string;
      fidelity?: "vector" | "proof";
      width?: number | null;
      height?: number | null;
      notes?: string;
      blob: () => Promise<Blob>;
    }
  /** A live DOM frame, rasterised at its native pixel size. */
  | {
      kind: "capture";
      channel: BundleChannel;
      label: string;
      node: HTMLElement;
      width: number;
      height: number;
      notes?: string;
    };

/**
 * Build the bundle. Returns the zip blob and the manifest so the caller can
 * report honestly (including any asset that failed).
 */
export async function bundleCampaign(input: {
  campaign: string;
  brandId?: string | null;
  sources: BundleSource[];
  onProgress?: (done: number, total: number, label: string) => void;
}): Promise<{ blob: Blob; manifest: CampaignManifest; failed: Array<{ label: string; reason: string }> }> {
  if (input.sources.length === 0) throw new Error("bundleCampaign: nothing to bundle");
  const [{ default: JSZip }, assetExport] = await Promise.all([
    import("jszip"),
    import("@/lib/asset-export"),
  ]);

  const bundle = bundleSlug(input.campaign);
  const zip = new JSZip();
  const root = zip.folder(bundle)!;
  const assets: BundleAsset[] = [];
  const failed: Array<{ label: string; reason: string }> = [];
  const counters: Record<string, number> = {};

  for (let i = 0; i < input.sources.length; i++) {
    const src = input.sources[i]!;
    input.onProgress?.(i, input.sources.length, src.label);
    counters[src.channel] = (counters[src.channel] ?? 0) + 1;
    const index = counters[src.channel]!;
    try {
      let blob: Blob;
      let ext: string;
      let width: number | null;
      let height: number | null;
      let fidelity: "vector" | "proof";
      if (src.kind === "file") {
        blob = await src.blob();
        ext = src.ext;
        width = src.width ?? null;
        height = src.height ?? null;
        fidelity = src.fidelity ?? "vector";
      } else {
        blob = await assetExport.exportAssetImage(
          { node: src.node, width: src.width, height: src.height, label: src.label },
          { format: "png", scale: 1 },
        );
        ext = "png";
        width = src.width;
        height = src.height;
        fidelity = "proof";
      }
      if (blob.size === 0) throw new Error("exporter returned an empty file");
      const name = bundleEntryName({ index, label: src.label, width, height, ext });
      root.folder(src.channel)!.file(name, blob);
      assets.push({
        channel: src.channel,
        file: `${src.channel}/${name}`,
        label: src.label,
        format: ext.replace(/^\./, ""),
        width,
        height,
        bytes: blob.size,
        fidelity,
        ...(src.notes ? { notes: src.notes } : {}),
      });
    } catch (err) {
      failed.push({ label: src.label, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  if (assets.length === 0) {
    throw new Error(
      `Nothing could be exported: ${failed.map((f) => `${f.label} (${f.reason})`).join("; ")}`,
    );
  }

  const manifest = buildCampaignManifest({
    campaign: input.campaign,
    brandId: input.brandId ?? null,
    assets,
  });
  root.file("manifest.json", JSON.stringify({ ...manifest, failed }, null, 2));
  root.file("README.txt", manifestReadme(manifest));
  input.onProgress?.(input.sources.length, input.sources.length, "Zipping");
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, manifest, failed };
}
