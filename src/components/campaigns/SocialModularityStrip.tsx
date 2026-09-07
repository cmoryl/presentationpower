// Modularity showcase for the live social demos.
//
// The demo gallery proves the campaign; this strip proves the SYSTEM: the same
// campaign copy dropped into several presentation modules, rendered at three
// social shapes, so a viewer can see one story re-layout itself across the
// build rather than being told it does.

import { useMemo } from "react";
import type { CampaignCopy } from "@/lib/campaigns";
import { SOCIAL_FORMATS_BY_ID, type SocialFormat } from "@/lib/social-formats";
import {
  buildSocialModuleSection,
  socialModulesForFormat,
  type SocialModuleLayout,
} from "@/lib/social-module-layouts";
import { SocialModuleFrame } from "./SocialModuleFrame";

const SHAPES: { formatId: string; label: string }[] = [
  { formatId: "linkedin-link-1200x627", label: "Wide" },
  { formatId: "square-1080", label: "Square" },
  { formatId: "story-1080x1920", label: "Story" },
];

const RELIEF = { maxItems: 4, dropSummary: false, dropMeta: false };

export function SocialModularityStrip({
  copy,
  brandId,
  lookCode,
  modules = 3,
}: {
  copy: CampaignCopy;
  brandId: string;
  lookCode?: string | null;
  /** How many modules to show (each renders at all three shapes). */
  modules?: number;
}) {
  const shapes = useMemo(
    () =>
      SHAPES.map((s) => ({ ...s, format: SOCIAL_FORMATS_BY_ID[s.formatId] })).filter(
        (s): s is { formatId: string; label: string; format: SocialFormat } => Boolean(s.format),
      ),
    [],
  );

  // Pick modules that read well on the square frame — the middle case — so the
  // same three modules stay stable across the row.
  const picks = useMemo<SocialModuleLayout[]>(() => {
    const square = shapes.find((s) => s.formatId === "square-1080")?.format;
    if (!square) return [];
    return socialModulesForFormat(square).slice(0, Math.max(1, modules));
  }, [shapes, modules]);

  if (!picks.length || !shapes.length) return null;

  return (
    <div className="space-y-8">
      {picks.map((layout) => (
        <div key={layout.id} className="rounded-2xl border border-black/10 bg-white/70 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#003FC7]">
                {layout.label}
              </div>
              <p className="mt-0.5 max-w-2xl text-xs text-black/60">{layout.description}</p>
            </div>
            <span className="font-mono text-[10px] text-black/40">{layout.variantId}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-center gap-5">
            {shapes.map(({ formatId, label, format }, i) => {
              const section = buildSocialModuleSection({ layout, copy, relief: RELIEF });
              // Alternate light and dark across the row so the strip shows both
              // faces of every module without doubling the tile count.
              const mode: "light" | "dark" = i === 1 ? "dark" : "light";
              return (
                <figure key={formatId} className="space-y-2">
                  <div className="flex items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-black/[0.03] p-3">
                    <SocialModuleFrame
                      format={format}
                      section={section}
                      brandId={brandId}
                      mode={mode}
                      displayShortEdge={format.width > format.height ? 150 : 230}
                      lookCode={lookCode ?? null}
                    />
                  </div>
                  <figcaption className="text-center text-[10px] uppercase tracking-widest text-black/45">
                    {label} · {format.width}×{format.height} · {mode}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
