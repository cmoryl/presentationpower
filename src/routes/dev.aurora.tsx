// Temporary dev-only preview harness used for Aurora v2 visual verification.
// Renders a plain aurora backdrop and specific variants across brands/modes
// so Playwright can snapshot each cell in isolation.
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { AuroraLayer } from "@/components/slide/flagship";
import { SlideModeContext } from "@/components/slide/SlideChrome";
import { MODULE_VARIANTS, BRAND_MODES, byId } from "@/lib/taxonomy";

type Search = {
  variant?: string;
  brand?: string;
  mode?: "dark" | "light";
  bg?: "1" | "0";
};

export const Route = createFileRoute("/dev/aurora")({
  component: AuroraDevPreview,
  validateSearch: (s: Record<string, unknown>): Search => ({
    variant: typeof s.variant === "string" ? s.variant : undefined,
    brand: typeof s.brand === "string" ? s.brand : undefined,
    mode: s.mode === "light" ? "light" : "dark",
    bg: s.bg === "0" ? "0" : "1",
  }),
});

// Simple content payloads keyed by variant id — good enough for a legibility
// check across a cover, a text-heavy variant, and a case-study prose block.
const SAMPLE_CONTENT: Record<string, Record<string, unknown>> = {
  "MV-KPI-DASHBOARD": {
    title: "Impact snapshot",
    items: [
      { value: "100", unit: "%", label: "Global teams empowered", icon: "handshake", delta: "+12", trend: "up" },
      { value: "48",  unit: "%", label: "Reduction in localization cost", icon: "trending-down", delta: "-8", trend: "down" },
      { value: "98",  unit: "%", label: "Translation quality score", icon: "check-circle", delta: "+3", trend: "up" },
      { value: "35",  unit: "+", label: "Markets supported", icon: "globe" },
      { value: "3.4", unit: "×", label: "Faster time-to-market", icon: "gauge", delta: "+0.4", trend: "up" },
    ],
  },
  "MV-OP-COVER-MINIMAL": {
    kicker: "Global Case Study",
    title: "Localization at the speed of product",
    subtitle: "How one enterprise unified 42 markets on a single content stack.",
    presenter: "TransPerfect · Enterprise",
    date: "2026",
  },
  "MV-TEXT-TWO-COL": {
    title: "Why this approach works",
    left: {
      heading: "The challenge",
      body:
        "Content operations were fragmented across 42 markets, each with its own vendor, tooling, and QA cycle. The cost of coordination outweighed the cost of translation itself, and every product launch pushed against a wall of unresolved regional variants.",
    },
    right: {
      heading: "The response",
      body:
        "We consolidated onto a single content stack, moved review into an in-context editor for every language, and instrumented every step so leadership could see where a launch actually was — not where the last status meeting said it was. Within a quarter, the fragmentation problem was gone.",
    },
  },
  "MV-CASE-STORY": {
    kicker: "Case study",
    title: "A single content stack, 42 markets",
    challenge:
      "Global operations were spending more time coordinating vendors than translating content. Each market had its own tooling, its own QA cycle, and its own idea of what 'done' meant. Launches slipped by weeks because no one could see the real state of any given language on any given day.",
    solution:
      "We consolidated the entire pipeline onto a single content stack. In-context review moved into the same editor for every language. Every checkpoint was instrumented so leadership had a live view of where a launch was — not where the last status meeting said it was. Localization stopped being a black box.",
    result:
      "Time-to-market fell by 48%. Translation quality scores held at 98%. Coordination overhead — the actual bottleneck — dropped by an order of magnitude. The team ships into 35+ markets now on the same day product ships in English.",
  },
};

function AuroraDevPreview() {
  const search = useSearch({ from: "/dev/aurora" });
  const brand = BRAND_MODES.find((b) => b.id === search.brand) ?? BRAND_MODES[0]!;
  const mode = search.mode ?? "dark";
  const isBgOnly = !search.variant || search.variant === "__bg__";

  if (isBgOnly) {
    return (
      <div
        data-aurora-shot="ready"
        data-preview-mode={mode}
        style={{ width: 1920, height: 1080, position: "relative", overflow: "hidden" }}
      >
        <SlideModeContext.Provider value={mode}>
          <AuroraLayer seed="MV-OP-COVER-MINIMAL" brand={brand} />
        </SlideModeContext.Provider>
      </div>
    );
  }

  const variant = byId(MODULE_VARIANTS, search.variant!);
  if (!variant) {
    return <div style={{ color: "white", padding: 40 }}>Unknown variant: {search.variant}</div>;
  }
  const content = SAMPLE_CONTENT[variant.id] ?? { title: variant.name };
  const slide = { id: "dev-aurora", variantId: variant.id, content } as unknown as Parameters<typeof VariantRenderer>[0]["slide"];

  return (
    <div
      data-aurora-shot="ready"
      data-preview-mode={mode}
      style={{ width: 1920, height: 1080, position: "relative", overflow: "hidden" }}
    >
      <ScaledSlide width={1920} height={1080}>
        <VariantRenderer slide={slide} variant={variant} brand={brand} pageNumber={1} mode={mode} />
      </ScaledSlide>
    </div>
  );
}
