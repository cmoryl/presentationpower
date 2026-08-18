/**
 * /admin/industry-scene-qa — internal QA viewer for the authored background
 * system. Renders the real engine output with grayscale, thumbnail, safe-zone,
 * visual-mass and region-metadata instrumentation, plus contact and comparison
 * sheets for the duplicate-cluster checks.
 */

import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SceneQaViewer } from "@/components/library/SceneQaViewer";

const TITLE = "Industry Scene QA · Admin · TransPerfect";
const DESC =
  "Review the authored OnDeck background scenes: contact sheets, grayscale distinctness, thumbnail-size checks and layout region metadata.";

export const Route = createFileRoute("/admin/industry-scene-qa")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: "Industry Scene QA · Admin" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SceneQaPage,
});

function SceneQaPage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-[1600px] px-6 py-10">
        <header className="mb-6">
          <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7]">Admin</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em]">Industry Scene QA</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Every tile is the live background engine output — the same layers the slide stage and the
            PPTX/PDF/PNG exporters paint. Use grayscale to confirm each industry stays distinct by
            silhouette alone, and thumbnail size to check the art survives the /library card.
          </p>
        </header>
        <SceneQaViewer />
      </main>
    </AppShell>
  );
}
