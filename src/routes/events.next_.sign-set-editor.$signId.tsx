// /events/next/sign-set-editor/$signId — one sign from an event's sign set, in the
// shared layer editor. Its changes are saved to this sign only, never the template.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { KioskLayerEditor } from "@/components/events/KioskLayerEditor";
import { useRequireSignIn } from "@/hooks/use-require-sign-in";
import { liveLayoutById } from "@/lib/next-california-kiosk-live";
import { loadEventSign } from "@/lib/sign-set-data";
import { eventSignEditKey } from "@/lib/sign-set";

export const Route = createFileRoute("/events/next_/sign-set-editor/$signId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign set editor · TransPerfect Element" },
      { name: "description", content: "Edit one sign from an event's sign set, check it for print and download it." },
      { property: "og:title", content: "Sign set editor" },
      { property: "og:description", content: "Layered editor for a sign built from an approved template." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignSetEditor,
});

function Screen({ title, body, eventId }: { title: string; body: string; eventId?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0B0A2A] p-8 text-white" aria-live="polite">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-white/70">{body}</p>
        {eventId ? <Link to="/events/next/signs/$eventId" params={{ eventId }} className="mt-4 inline-block text-sm font-semibold text-[#A1FBF9] hover:underline">Back to the sign set</Link> : null}
      </div>
    </main>
  );
}

function SignSetEditor() {
  const auth = useRequireSignIn();
  const { signId } = Route.useParams();
  const q = useQuery({ queryKey: ["event-sign", signId], queryFn: () => loadEventSign(signId), enabled: auth === "signed-in", retry: false });
  if (auth === "checking") return <Screen title="Opening the sign…" body="Checking you're signed in." />;
  if (auth === "signed-out") return <Screen title="Please sign in to edit signs" body="Taking you to the sign-in page." />;
  if (q.isLoading) return <Screen title="Opening the sign…" body="Loading the sign and its template." />;
  if (q.error) return <Screen title="Couldn't open this sign" body={(q.error as Error).message} />;
  const L = q.data?.template ? liveLayoutById(q.data.template.layout_id) : undefined;
  if (!q.data || !L) return <Screen title="Sign not found" body="This sign isn't in any sign set, or its template's artwork is missing." eventId={q.data?.sign.event_id} />;
  const { sign, spot, template } = q.data;
  return (
    <div className="fixed inset-0 flex flex-col bg-[#0B0A2A]">
      <div className="relative z-[75] flex items-center gap-3 border-b border-white/10 bg-[#070620] px-3 py-1.5 text-[12px] text-white/70">
        <Link to="/events/next/signs/$eventId" params={{ eventId: sign.event_id }} className="font-semibold text-[#A1FBF9] hover:underline">← Sign set</Link>
        <span>Changes save to this sign only; the template “{template?.name}” stays as approved.</span>
      </div>
      <div className="relative flex-1">
        <KioskLayerEditor key={sign.id} layout={L} vendor={spot?.label ?? "Sign"} editKey={eventSignEditKey(sign.id)} embedded />
      </div>
    </div>
  );
}
