// -----------------------------------------------------------------------------
// Social shape sweep harness (dev only)
//
// Renders EVERY library module into one social format at thumbnail size and
// exposes the fit engine's own verdict on each tile (`data-social-fit`,
// fill %, overflow %, relief rung, reflow target, full-bleed kind). A headless
// pass over `?format=<id>` for each shape is the sweep: no clicking, no picker,
// one mount per format.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";

import { SocialModuleFrame } from "@/components/campaigns/SocialModuleFrame";
import {
  SOCIAL_MODULE_LAYOUTS,
  buildSocialModuleSection,
} from "@/lib/social-module-layouts";
import { SOCIAL_FORMATS, getFormat } from "@/lib/social-formats";
import { reliefAt } from "@/lib/social-module-fit";

const search = z.object({
  format: z.string().optional(),
  mode: z.enum(["light", "dark"]).optional(),
  only: z.string().optional(),
});

export const Route = createFileRoute("/dev/social-sweep")({
  validateSearch: search,
  component: SocialSweepHarness,
  head: () => ({
    meta: [
      { title: "Social shape sweep harness · TransPerfect Element" },
      {
        name: "description",
        content:
          "Internal harness that renders every Element module into one social format and reports the fit engine's verdict per tile.",
      },
      { property: "og:title", content: "Social shape sweep harness" },
      {
        property: "og:description",
        content: "Per-module fit, fill and overflow readings for one social shape.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const COPY = {
  eyebrow: "TransPerfect Element",
  title: "Every language. Every content type. One partner.",
  summary:
    "One connected content pipeline across 200+ languages — from clinical trials to gaming to enterprise operations.",
  cta: "See how we work",
  stat: { value: "200+", label: "Markets supported end-to-end" },
};

function SocialSweepHarness() {
  const { format: formatId, mode = "dark", only } = Route.useSearch();
  const format = getFormat(formatId ?? "") ?? SOCIAL_FORMATS[0];
  const layouts = useMemo(
    () => (only ? SOCIAL_MODULE_LAYOUTS.filter((l) => l.variantId === only) : SOCIAL_MODULE_LAYOUTS),
    [only],
  );

  return (
    <main className="min-h-screen bg-[#F2F2F2] p-6">
      <h1 className="text-sm font-semibold uppercase tracking-widest text-[#03002C]">
        Shape sweep · {format.label} · {layouts.length} modules
      </h1>
      <div data-sweep-format={format.id} className="mt-5 flex flex-wrap gap-4">
        {layouts.map((layout) => {
          const section = buildSocialModuleSection({
            layout,
            copy: COPY,
            relief: reliefAt(0),
          });
          return (
            <div key={layout.id} data-sweep-tile={layout.variantId}>
              <SocialModuleFrame
                format={format}
                section={section}
                brandId="bm-tp-master"
                mode={mode}
                displayShortEdge={180}
                density={layout.density}
                hideLockup
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
