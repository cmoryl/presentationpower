// -----------------------------------------------------------------------------
// BACKGROUND OVERRIDE EDITOR — retune one look's section backgrounds.
//
// Works for ANY look code: the 58 catalog skins as well as published custom
// looks. Two ways in:
//   • All sections — the pack listing, for batch moves and a quick audit
//   • Tune live    — <BackgroundTuner />, a single screen that repaints as you
//                    drag and autosaves
//
// Either way the edit wraps the authored ground rather than replacing it, so
// present, share and PPTX stay on the same layer contract.
// -----------------------------------------------------------------------------

import { useState } from "react";
import type { TemplateBackgroundOverride } from "@/lib/template-registry";
import type { SkinScene } from "@/lib/skin-backgrounds";
import type { StylePack } from "@/lib/style-packs";
import { BackdropLightbox, type BackdropShot } from "./BackdropLightbox";
import { BackgroundPackGrid } from "./BackgroundPackGrid";
import { BackgroundTuner } from "./BackgroundTuner";

export function BackgroundOverrideEditor({
  code,
  pack,
  overrides,
  onChanged,
}: {
  /** Look code the override belongs to, e.g. "S02", "R14", "C01". */
  code: string;
  /** The look's pack (already carrying any saved override). */
  pack: StylePack;
  overrides: TemplateBackgroundOverride[];
  onChanged: () => void;
}) {
  const [scene, setScene] = useState<SkinScene>("cover");
  const [view, setView] = useState<"all" | "one">("one");
  const [shot, setShot] = useState<BackdropShot | null>(null);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Background editing mode"
        className="inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/15 dark:bg-white/[0.03]"
      >
        {(
          [
            ["one", "Tune live", "One section at a time, repaints as you drag"],
            ["all", "All sections", "List and batch-update the whole look"],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            title={hint}
            onClick={() => setView(id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              view === id ? "bg-[#003FC7] text-white shadow-sm" : "opacity-65 hover:opacity-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "all" ? (
        <BackgroundPackGrid
          code={code}
          pack={pack}
          overrides={overrides}
          onChanged={onChanged}
          onTune={(s) => {
            setScene(s as SkinScene);
            setView("one");
          }}
          onZoom={setShot}
        />
      ) : (
        <BackgroundTuner
          code={code}
          pack={pack}
          overrides={overrides}
          onChanged={onChanged}
          onZoom={setShot}
          initialScene={scene}
        />
      )}

      <BackdropLightbox shot={shot} onClose={() => setShot(null)} />
    </div>
  );
}
