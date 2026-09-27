// /events/next/kiosk-editor/$boothId — the partner kiosk editor in its own
// window, opened from the California / San Francisco kiosk list.

import { createFileRoute, Link } from "@tanstack/react-router";

import { KioskLayerEditor } from "@/components/events/KioskLayerEditor";
import { CALIFORNIA_KIOSKS, californiaKioskSourceBoothId } from "@/lib/next-california-kiosks";
import { kioskLiveLayout } from "@/lib/next-california-kiosk-live";
import { useRequireSignIn } from "@/hooks/use-require-sign-in";

export const Route = createFileRoute("/events/next_/kiosk-editor/$boothId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Kiosk editor · NEXT San Francisco · TransPerfect Element" },
      { name: "description", content: "Edit a NEXT partner kiosk front and side strips, check it for print and download live files." },
      { property: "og:title", content: "Kiosk editor · NEXT San Francisco" },
      { property: "og:description", content: "Layered editor for the NEXT partner kiosks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KioskEditorWindow,
});

function KioskEditorWindow() {
  useRequireSignIn();
  const { boothId } = Route.useParams();
  const layout = kioskLiveLayout(californiaKioskSourceBoothId(boothId));
  const vendor = CALIFORNIA_KIOSKS.find((k) => k.id === boothId)?.vendor ?? "Partner";

  if (!layout) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0B0A2A] p-8 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">This kiosk has no layered editor</h1>
          <p className="mt-2 text-sm text-white/70">It isn't rebuilt from a live London file, so it's edited on the kiosk page instead.</p>
          <Link to="/events/next/california" className="mt-4 inline-block text-sm font-semibold text-[#A1FBF9] hover:underline">Back to partner kiosks</Link>
        </div>
      </main>
    );
  }
  return <KioskLayerEditor layout={layout} vendor={vendor} fill />;
}
