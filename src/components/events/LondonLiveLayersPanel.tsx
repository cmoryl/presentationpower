// London signage — LAYERS FOUND INSIDE THE FINISHED FILE.
//
// Reads the layer list the kit recorded when the finished file was put in, and
// lets the designer decide, layer by layer, whether the file keeps it or the kit
// rebuilds it as an editable layer on top. Anything the file keeps is never
// painted twice, which is what fixes the doubled lockups and headlines on cards.

import { Layers, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

import {
  parseLondonLiveFileLayers,
  setLondonLayerRebuilt,
  setLondonLiveLayers,
  useLondonLiveLayerMap,
  type LondonLiveLayerKind,
} from "@/lib/next-london-live-layers";
import type { LondonPanel } from "@/lib/next-london-signage";

const KIND_LABEL: Record<LondonLiveLayerKind, string> = {
  ground: "Background",
  lockup: "NEXT logo",
  copy: "Wording",
  qr: "QR code",
  art: "Artwork",
  other: "Other",
};

export interface LondonLiveLayersPanelProps {
  panel: LondonPanel;
  /** Link to the finished file, so its layers can be re-read on demand. */
  fileUrl?: string | null;
  /** Name/version of the file in force, used to tie layers to that file. */
  fileKey?: string | null;
  className?: string;
}

export function LondonLiveLayersPanel({
  panel,
  fileUrl,
  fileKey,
  className,
}: LondonLiveLayersPanelProps) {
  const map = useLondonLiveLayerMap();
  const state = map[panel.id] ?? null;
  const [busy, setBusy] = useState(false);
  const grouped = useMemo(() => {
    const out = new Map<LondonLiveLayerKind, { name: string; rebuilt: boolean }[]>();
    for (const layer of state?.layers ?? []) {
      const list = out.get(layer.kind) ?? [];
      list.push({ name: layer.name, rebuilt: !!state?.rebuilt.includes(layer.name) });
      out.set(layer.kind, list);
    }
    return [...out.entries()];
  }, [state]);

  const reread = async () => {
    if (!fileUrl) return;
    setBusy(true);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("The finished file could not be read.");
      const layers = parseLondonLiveFileLayers(await response.arrayBuffer(), fileKey ?? panel.id);
      setLondonLiveLayers(panel.id, fileKey ?? "file", layers);
      toast.success(
        layers.length
          ? `${layers.length} layer${layers.length === 1 ? "" : "s"} found in the finished file`
          : "No named layers in that file — it is treated as finished artwork",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That file could not be read.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-xl border border-black/10 p-4 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Layers className="h-3.5 w-3.5 text-[#003FC7]" />
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
          Layers in the finished file
        </p>
        {fileUrl ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void reread()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-[11px] font-semibold text-[#03002C] hover:bg-[#F2F2F2] disabled:opacity-45"
          >
            <RefreshCw className="h-3 w-3" />
            {busy ? "Reading…" : state ? "Read again" : "Read the layers"}
          </button>
        ) : null}
      </div>

      {!state || state.layers.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-[#03002C]/70">
          No named layers have been read for this sign, so the finished file is treated as complete
          artwork: the kit does not add its own logo or wording over the top. Use the buttons in the
          editor if you want to add either back.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-[#03002C]/70">
            These layers came from the finished file. Anything left as “in the file” is printed
            straight from it. Switch a layer to “edit here” and the kit rebuilds it as a live,
            movable layer on top instead.
          </p>
          <div className="mt-3 space-y-3">
            {grouped.map(([kind, layers]) => (
              <div key={kind}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#03002C]/50">
                  {KIND_LABEL[kind]}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {layers.map((layer) => (
                    <li
                      key={layer.name}
                      className="flex flex-wrap items-center gap-2 rounded-lg bg-[#F2F2F2] px-2.5 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#03002C]">
                        {layer.name}
                      </span>
                      <button
                        type="button"
                        aria-pressed={!layer.rebuilt}
                        onClick={() => setLondonLayerRebuilt(panel.id, layer.name, false)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          layer.rebuilt
                            ? "border border-black/15 text-[#03002C]/70 hover:bg-white"
                            : "bg-[#003FC7] text-white"
                        }`}
                      >
                        In the file
                      </button>
                      <button
                        type="button"
                        aria-pressed={layer.rebuilt}
                        onClick={() => setLondonLayerRebuilt(panel.id, layer.name, true)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          layer.rebuilt
                            ? "bg-[#003FC7] text-white"
                            : "border border-black/15 text-[#03002C]/70 hover:bg-white"
                        }`}
                      >
                        Edit here
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
