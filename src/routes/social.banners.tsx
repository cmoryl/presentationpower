// /social/banners — LinkedIn banner studio (approved TP corporate/enterprise look).

import { AppShell } from "@/components/AppShell";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { LinkedInBannerStudio } from "@/components/social/LinkedInBannerStudio";

export const Route = createFileRoute("/social/banners")({
  head: () => ({
    meta: [
      { title: "Social banner studio · TransPerfect" },
      {
        name: "description",
        content:
          "Approved TransPerfect LinkedIn banner backgrounds — aurora light, navy glow, pastel dome and band sweep — editable, expandable and exportable at LinkedIn 1584x396, X 1500x500 and Facebook 1640x856.",
      },
      { property: "og:title", content: "Social banner studio · TransPerfect" },
      {
        property: "og:description",
        content:
          "Recreate and expand the approved corporate LinkedIn banner look, then export ready-to-post PNGs for LinkedIn, X and Facebook.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <BannersView />
    </AppShell>
  ),
});

function BannersView() {
  return (
    <>
      <header className="full-bleed relative -mt-6 overflow-hidden border-b border-black/5 bg-gradient-to-br from-[#C2A3FF22] via-[#A1FBF922] to-white/70 py-12 sm:-mt-10 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/social"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/55 hover:text-[#003FC7]"
          >
            <ArrowLeft size={12} /> Back to social
          </Link>
          <div className="mt-4 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/60">
              <ImageIcon size={12} /> Social · Profile banners
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#03002C] sm:text-5xl">
              Social banner studio.
            </h1>
            <p className="max-w-2xl text-base text-black/65">
              The approved corporate and enterprise banner look — soft aurora meshes and deep navy
              glows — rebuilt as a procedural system. Edit the copy, generate new on-brand variants,
              and export true-size PNGs for LinkedIn, X/Twitter and Facebook.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <LinkedInBannerStudio />
      </div>
    </>
  );
}
