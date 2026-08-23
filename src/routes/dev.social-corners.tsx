// -----------------------------------------------------------------------------
// Social corner-rounding harness (dev only)
//
// Renders the SocialRenderer once per format for a single template style, at a
// fixed display size, with a stable photo and stable copy — so the only thing
// that can change between runs is geometry. The copy plate's corner radius is
// the value under test: `plateRadiusPct` is a PERCENT of the short edge and a
// past regression multiplied it by the raw pixel edge, which browsers clamp to
// 50% and paint as a giant ellipse.
//
// Driven by scripts/visual-regression-social-corners.mjs:
//   /dev/social-corners?style=<socialStyleId>
// Each frame is tagged `data-corner-case="<styleId>__<formatId>"`, and the
// plate inside it is tagged `data-social-plate`.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";

import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { SOCIAL_FORMATS } from "@/lib/social-formats";
import { SOCIAL_STYLES, DEFAULT_SOCIAL_STYLE_ID, type SocialStyleId } from "@/lib/social-styles";
import { SOCIAL_CORNER_SWEEP, sweepPlan } from "@/lib/social-corner-sweep";
import type { CampaignCopy } from "@/lib/campaigns";

type Search = { style: SocialStyleId; mode: "light" | "dark"; brand: string };

export const Route = createFileRoute("/dev/social-corners")({
  component: SocialCornersHarness,
  validateSearch: (search: Record<string, unknown>): Search => {
    const style = String(search.style ?? "") as SocialStyleId;
    const mode = search.mode === "dark" ? "dark" : "light";
    return {
      style: SOCIAL_STYLES.some((s) => s.id === style) ? style : DEFAULT_SOCIAL_STYLE_ID,
      mode,
      brand: typeof search.brand === "string" && search.brand ? search.brand : "bm-enterprise",
    };
  },
  head: () => ({
    meta: [
      { title: "Social corner-rounding harness · TransPerfect Element" },
      {
        name: "description",
        content:
          "Internal harness that renders every social format for one template style so corner rounding can be pixel-diffed against a golden baseline.",
      },
      { property: "og:title", content: "Social corner-rounding harness" },
      {
        property: "og:description",
        content:
          "Renders every social aspect ratio for one style to verify copy-plate corner rounding.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/**
 * Stable display short edge — corner radius is measured relative to it. Comes
 * from the shared sweep config so the harness and the script can never drift.
 */
export const HARNESS_SHORT_EDGE = SOCIAL_CORNER_SWEEP.shortEdge;

/** Fixed copy: no dates, no randomness, so runs are byte-stable. */
const COPY: CampaignCopy = {
  eyebrow: "Corner sweep",
  title: "Every aspect ratio rounds the same way",
  summary: "Plate corners are a percent of the short edge, capped at six percent.",
  cta: "Verify geometry",
  stat: { value: "6%", label: "max corner" },
};

/**
 * Deterministic flat photo stand-in. A real photo would make the PNG diff
 * depend on decode/scaling, so the sweep paints a plain SVG gradient instead —
 * the plate corner is still the only silhouette in the crop.
 */
const PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#03002C"/><stop offset="1" stop-color="#003FC7"/></linearGradient></defs><rect width="1200" height="1200" fill="url(#g)"/></svg>`,
  );

function SocialCornersHarness() {
  const { style, mode, brand } = Route.useSearch();

  // Publish the derived coverage matrix so the sweep script can enumerate
  // styles/formats/modes/brands without hard-coding any of them.
  const plan = sweepPlan();
  if (typeof window !== "undefined") {
    (window as unknown as { __SOCIAL_CORNER_SWEEP__?: unknown }).__SOCIAL_CORNER_SWEEP__ = plan;
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <h1 className="mb-4 text-lg font-semibold">
        Corner sweep · {style} · {mode}
      </h1>
      <p data-corner-plan className="mb-4 text-xs text-muted-foreground">
        {plan.counts.styles} styles × {plan.counts.formats} formats × {plan.counts.modes} modes ×{" "}
        {plan.counts.brands} brands = {plan.counts.cases} cases · fp {plan.fingerprint}
      </p>
      <div data-corner-grid className="flex flex-wrap items-start gap-6">
        {SOCIAL_FORMATS.map((format) => (
          <figure
            key={format.id}
            data-corner-case={`${style}__${format.id}`}
            data-corner-format={format.id}
            data-corner-aspect={String(format.aspect)}
            className="m-0"
          >
            <SocialRenderer
              format={format}
              brandId={brand}
              mode={mode}
              copy={COPY}
              imageUrl={PHOTO}
              imageLayout="bleed"
              styleId={style}
              displayShortEdge={HARNESS_SHORT_EDGE}
            />
            <figcaption className="mt-1 text-[11px] text-muted-foreground">
              {format.label} · {format.width}×{format.height}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
