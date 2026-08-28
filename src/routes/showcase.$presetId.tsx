// Permanent shareable URL for a preset module set:
// `/showcase/dataforce` → the module library scoped to DataForce with the
// DataForce template applied. The preset only carries library search state, so
// the view can never drift from the library itself.
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { libraryPresetBySlug, presetSearch } from "@/lib/library-presets";

export const Route = createFileRoute("/showcase/$presetId")({
  beforeLoad: ({ params }) => {
    const preset = libraryPresetBySlug(params.presetId);
    if (!preset) throw notFound();
    throw redirect({ to: "/library", search: presetSearch(preset) });
  },
  component: () => null,
  notFoundComponent: () => (
    <div className="p-10 text-sm">
      That showcase link doesn’t exist. See <a href="/showcase">all preset links</a>.
    </div>
  ),
});
