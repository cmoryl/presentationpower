// /events/next/sign-editor/$signId — Legal NEXT signage template in the layer editor.

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { KioskLayerEditor } from "@/components/events/KioskLayerEditor";
import { legalSign, legalSignLayout } from "@/lib/legal-next-signage";
import { useRequireSignIn } from "@/hooks/use-require-sign-in";

export const Route = createFileRoute("/events/next_/sign-editor/$signId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Legal NEXT sign editor · TransPerfect Element" },
      { name: "description", content: "Edit a Legal NEXT signage template, check it for print and download live files." },
      { property: "og:title", content: "Legal NEXT sign editor" },
      { property: "og:description", content: "Layered editor for the Legal NEXT signage templates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignEditorWindow,
});

function Screen({ title, body }: { title: string; body: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0B0A2A] p-8 text-white" aria-live="polite">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/70">{body}</p>
        <Link to="/events/next/divisions/$divisionId" params={{ divisionId: "legal" }} className="mt-4 inline-block text-sm font-semibold text-[#A1FBF9] hover:underline">Back to Legal signage</Link>
      </div>
    </main>
  );
}

function SignEditorWindow() {
  const auth = useRequireSignIn();
  const { signId } = Route.useParams();
  const sign = legalSign(signId);
  const [faceId, setFaceId] = useState(sign?.faces[0]?.id ?? "");
  if (auth === "checking") return <Screen title="Opening the sign editor…" body="Checking you're signed in." />;
  if (auth === "signed-out") return <Screen title="Please sign in to edit signs" body="Taking you to the sign-in page." />;
  const layout = legalSignLayout(faceId);
  if (!sign || !layout) return <Screen title="Sign not found" body="This Legal NEXT sign template doesn't exist." />;
  const face = sign.faces.find((f) => f.id === faceId);
  return (
    <div className="fixed inset-0 flex flex-col bg-[#0B0A2A]">
      {sign.faces.length > 1 ? (
        <div role="tablist" aria-label="Sign face" className="relative z-[75] flex gap-1 border-b border-white/10 bg-[#070620] px-3 py-1.5">
          {sign.faces.map((f) => (
            <button key={f.id} role="tab" type="button" aria-selected={f.id === faceId} onClick={() => setFaceId(f.id)}
              className="rounded-sm px-3 py-1 text-[12px] font-semibold text-white/60 hover:text-white aria-selected:bg-white/15 aria-selected:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]">
              {f.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative flex-1">
        <KioskLayerEditor key={faceId} layout={layout} vendor={`${sign.title}${sign.faces.length > 1 ? ` · ${face?.label}` : ""}`} embedded />
      </div>
    </div>
  );
}
