// -----------------------------------------------------------------------------
// TEMPLATE STUDIO / ALTERNATE LOOKS — the single studio surface for deck looks.
// (/admin/templates redirects here.) Browsing is open; editing needs an admin role.
// -----------------------------------------------------------------------------

import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LookStudio } from "@/components/templates/LookStudio";

export const Route = createFileRoute("/looks")({
  head: () => ({
    meta: [
      { title: "Alternate Looks · Browse, edit and publish deck styles" },
      {
        name: "description",
        content:
          "Every deck look in one place: preview the curated catalog by section, edit palettes and geometry, retune backgrounds, and publish new looks from brand uploads.",
      },
      { property: "og:title", content: "Alternate Looks studio" },
      {
        property: "og:description",
        content:
          "Browse, preview, customise and publish every alternate deck look from a single page.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LooksPage,
});

function LooksPage() {
  return (
    <AppShell>
      <LookStudio
        heading={
          <header className="relative overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-[#E0E8F5] via-white to-[#F2F2F2] p-6 dark:border-white/10 dark:from-[#03002C] dark:via-[#050427] dark:to-[#0A0A2E]">
            <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7] dark:text-[#A1FBF9]">
              Design system
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em]">Template Studio — alternate looks</h1>
            <p className="mt-2 max-w-3xl text-sm text-black/65 dark:text-white/65">
              Every look a deck can wear, with live section previews — click any slide to view it
              larger. Admins can edit palettes and geometry, retune each section background, fork a
              catalog skin, or publish a brand-new look from uploaded brand files.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Link
                to="/library"
                className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 font-medium text-white hover:opacity-90"
              >
                <Sparkles size={14} /> Use a look in the library
              </Link>
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 hover:border-[#003FC7] dark:border-white/20"
              >
                Admin command center
              </Link>
            </div>
          </header>
        }
      />
    </AppShell>
  );
}
