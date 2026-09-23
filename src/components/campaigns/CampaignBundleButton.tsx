// ---------------------------------------------------------------------------
// "Bundle campaign" — one click, one structured ZIP.
//
// Collects the social cards rendered on the surface, any print collateral the
// caller supplies, and optionally a deck exported to PowerPoint, and hands back
// a single archive with a manifest. Failures are named, never swallowed.
// ---------------------------------------------------------------------------
import * as React from "react";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { useDeckStore } from "@/lib/deck-store";
import { bundleCampaign, bundleSlug, type BundleSource } from "@/lib/campaign-bundle";
import { downloadAssetBlob } from "@/lib/asset-export";
import { resolveBrandMode } from "@/lib/brand-profiles";

export type CampaignBundleButtonProps = {
  campaignName: string;
  brandId?: string | null;
  /** Resolved at click time so the DOM frames are the ones on screen. */
  resolveSources: () => BundleSource[];
  /** Offer the deck picker (defaults to true). */
  includeDecks?: boolean;
  className?: string;
};

export function CampaignBundleButton({
  campaignName,
  brandId,
  resolveSources,
  includeDecks = true,
  className,
}: CampaignBundleButtonProps) {
  const decks = useDeckStore((s) => s.decks);
  const deckList = React.useMemo(
    () =>
      Object.values(decks)
        .filter((d) => d.slides.length > 0)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 40),
    [decks],
  );
  const [deckId, setDeckId] = React.useState<string>("");
  const [busy, setBusy] = React.useState<string | null>(null);

  const run = async () => {
    const sources = resolveSources().filter(Boolean);
    const deck = deckId ? decks[deckId] : undefined;
    if (deck) {
      const brand = resolveBrandMode(deck.brandModeId, deck.subCompany);
      sources.unshift({
        kind: "file",
        channel: "presentations",
        label: deck.title || "Deck",
        ext: "pptx",
        fidelity: "vector",
        notes: `${deck.slides.length} slides`,
        blob: async () => {
          const { exportDeckToPptx } = await import("@/lib/pptx-export");
          const { blob, warnings } = await exportDeckToPptx(deck, brand, { output: "blob" });
          if (!blob) throw new Error("PowerPoint export returned no file");
          const { toastExportWarnings } = await import("@/lib/export-warning-toast");
          toastExportWarnings(warnings);
          return blob;
        },
      });
    }
    if (sources.length === 0) {
      toast.error("Nothing to bundle yet", {
        description: "Generate the kit assets (or pick a deck) first.",
      });
      return;
    }
    setBusy("Starting…");
    try {
      const { blob, manifest, failed } = await bundleCampaign({
        campaign: campaignName || "campaign",
        brandId: brandId ?? null,
        sources,
        onProgress: (done, total, label) => setBusy(`${done}/${total} · ${label}`),
      });
      downloadAssetBlob(blob, `${bundleSlug(campaignName)}-bundle.zip`);
      const counts = manifest.channels.map((c) => `${c.count} ${c.label.toLowerCase()}`).join(", ");
      if (failed.length > 0) {
        toast.warning(`Bundle ready with ${failed.length} missing`, {
          description: `${counts}. Left out: ${failed.map((f) => f.label).join(", ")}.`,
        });
      } else {
        toast.success("Campaign bundle downloaded", { description: counts });
      }
    } catch (err) {
      toast.error("Bundle failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {includeDecks && deckList.length > 0 ? (
          <label className="flex items-center gap-1.5 text-[11px] text-black/60">
            <span className="uppercase tracking-widest">Deck</span>
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="max-w-[190px] rounded-full border border-black/15 bg-white px-2 py-1 text-xs text-black/80"
            >
              <option value="">None</option>
              {deckList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || "Untitled deck"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={run}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#03002C] disabled:opacity-60"
        >
          <Package size={12} /> {busy ? busy : "Bundle campaign (ZIP)"}
        </button>
      </div>
    </div>
  );
}
