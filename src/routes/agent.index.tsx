// Entry point for the PowerPoint agent: send the user to their most recent
// conversation, or start a fresh one.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { createAgentThread, listAgentThreads } from "@/lib/agent/threads";

export const Route = createFileRoute("/agent/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Presentation agent · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Chat with the TransPerfect presentation agent to build, refine and deliver a brand-compliant PowerPoint deck end to end.",
      },
      { property: "og:title", content: "Presentation agent · TransPerfect Modular" },
      {
        property: "og:description",
        content: "Build a brand-compliant PowerPoint deck end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentIndex,
});

function AgentIndex() {
  const userId = useSessionUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!userId || started.current) return;
    started.current = true;
    (async () => {
      try {
        const threads = await listAgentThreads();
        const target = threads[0] ?? (await createAgentThread());
        void navigate({ to: "/agent/$threadId", params: { threadId: target.id }, replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open the agent.");
      }
    })();
  }, [userId, navigate]);

  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-sm text-foreground/55">
        {userId === null
          ? "Sign in to use the presentation agent."
          : (error ?? "Opening your presentation agent…")}
      </div>
    </AppShell>
  );
}
