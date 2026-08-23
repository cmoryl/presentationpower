// Entry point for the Events Agent: open the most recent event conversation or
// start a fresh one.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { createKitThread, listKitThreads } from "@/lib/kit-agent/threads";
import { AgentSignInGate } from "@/components/AgentSignInGate";

export const Route = createFileRoute("/events-agent/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Events agent · TransPerfect Element" },
      {
        name: "description",
        content:
          "Chat with the Element events agent to build booth, signage, screen, badge and event-social kits from the approved presets.",
      },
      { property: "og:title", content: "Events agent · TransPerfect Element" },
      {
        property: "og:description",
        content: "Build brand-compliant event kits end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsAgentIndex,
});

function EventsAgentIndex() {
  const userId = useSessionUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!userId || started.current) return;
    started.current = true;
    (async () => {
      try {
        const threads = await listKitThreads("event");
        const target = threads[0] ?? (await createKitThread("event"));
        void navigate({
          to: "/events-agent/$threadId",
          params: { threadId: target.id },
          replace: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open the events agent.");
      }
    })();
  }, [userId, navigate]);

  if (userId === null)
    return (
      <AppShell>
        <AgentSignInGate label="events agent" />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-sm text-foreground/55">
        {error ?? "Opening your events agent…"}
      </div>
    </AppShell>
  );
}
