// -----------------------------------------------------------------------------
// TEMPLATE STUDIO — one cohesive home for every alternate look.
//
// Browse the full catalog, preview each section live (click to enlarge), author
// or fork a look, retune its backgrounds, publish from brand uploads, and read
// the runbook. All of it lives in <LookStudio />, shared with /looks.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { LookStudio } from "@/components/templates/LookStudio";

export const Route = createFileRoute("/admin/templates")({
  head: () => ({
    meta: [
      { title: "Template Studio · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Author, fork and publish deck looks, run the readiness suite, retune section backgrounds, and preview every slide section full screen.",
      },
      { property: "og:title", content: "Template Studio · Admin" },
      {
        property: "og:description",
        content:
          "One studio for every alternate look: build, test, tune backgrounds and publish deck templates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemplateStudio,
});

function TemplateStudio() {
  return (
    <LookStudio
      heading={
        <header>
          <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7]">Admin</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em]">
            Template Studio — alternate looks
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-black/60 dark:text-white/60">
            Every look in one place. Pick one from the rail to preview its sections (click a slide to
            view it larger), edit its palette, type and geometry, retune its backgrounds, or start a
            brand-new look from scratch or from uploaded brand files. Published looks appear
            everywhere a look can be chosen — library, agent, present, share and PowerPoint export.
          </p>
        </header>
      }
    />
  );
}
