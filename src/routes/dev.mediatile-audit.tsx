import { createFileRoute } from "@tanstack/react-router";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { MODULE_VARIANTS, BRAND_MODES, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/dev/mediatile-audit")({
  component: Audit,
});

// Every variant that passes `className="absolute inset-0"` (or equivalent)
// to MediaTile. These are the exact call sites affected by the MediaTile
// className fix (relative dropped when absolute/fixed present). Rendering
// each here confirms media fills the parent SlideFrame and content sits on
// top correctly, with no offscreen push / clipping.
const CASES = [
  { id: "MV-OP-COVER-MEDIA", content: { title: "Cover · media", subtitle: "Regression sweep", clientName: "acme" } },
  { id: "MV-OP-COVER-GRADIENT", content: { title: "Cover · gradient", subtitle: "Regression sweep", clientName: "acme" } },
  { id: "MV-IMG-FULL-BLEED", content: { title: "Image · full bleed", body: "Regression sweep", mediaSeed: "hero" } },
  { id: "MV-IMG-QUOTE-BG", content: { quote: "Media should fill the bleed and the quote should sit on top.", attribution: "— Audit" } },
  { id: "MV-ED-HERO-BLEED", content: { title: "Editorial hero bleed", mediaSeed: "editorial" } },
  { id: "MV-ED-STAT-PHOTO", content: { value: "94", unit: "%", label: "Stat · photo backdrop", mediaSeed: "stat" } },
  { id: "MV-ED-QUOTE-BLEED", content: { quote: "The best interfaces get out of the way.", attribution: "Verified last pass", mediaSeed: "quote" } },
  // Bento tile with a media cell — the MediaTile lives inside a `relative -m-10` parent, not SlideFrame.
  { id: "MV-BENTO-STATS", content: {
      title: "Bento · media cell",
      items: [
        { kind: "stat", label: "Speed", value: "3.2", unit: "×", icon: "zap" },
        { kind: "media", title: "In-market", mediaSeed: "bento-media" },
        { kind: "stat", label: "Adoption", value: "88", unit: "%", icon: "users" },
        { kind: "media", title: "Studio", mediaSeed: "bento-media-2" },
      ],
    } },
] as const;

function Audit() {
  const brand = BRAND_MODES.find((b) => b.id === "bm-enterprise")!;
  return (
    <div className="min-h-screen bg-neutral-950 p-6 space-y-10">
      <div className="text-sm font-semibold text-white">MediaTile absolute-inset-0 regression sweep</div>
      {CASES.map((c) => {
        const variant = byId(MODULE_VARIANTS, c.id);
        if (!variant) {
          return (
            <div key={c.id} className="text-red-400 text-xs">Missing variant: {c.id}</div>
          );
        }
        const slide = {
          id: `audit-${c.id}`,
          variantId: variant.id,
          sectionId: "sec-audit",
          order: 1,
          position: 0,
          layoutId: null,
          changes: [],
          content: c.content,
        } as unknown as Parameters<typeof VariantRenderer>[0]["slide"];
        return (
          <div key={c.id} className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-white/60">{c.id}</div>
            <div id={`slot-${c.id}`} className="aspect-[16/9] w-full max-w-[1400px]">
              <ScaledSlide>
                <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode="dark" />
              </ScaledSlide>
            </div>
          </div>
        );
      })}
    </div>
  );
}
