// Entry point for the Social Agent: open the most recent social conversation or
// start a fresh one.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { createKitThread, listKitThreads } from "@/lib/kit-agent/threads";

export const Route = createFileRoute("/social-agent/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Social agent · TransPerfect Element" },
      {
        name: "description",
        content:
          "Chat with the Element social agent to build platform-sized social kits from the approved format presets and playbook library.",
      },
      { property: "og:title", content: "Social agent · TransPerfect Element" },
      {
        property: "og:description",
        content: "Build brand-compliant social kits end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SocialAgentIndex,
});

function SocialAgentIndex() {
  const userId = useSessionUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!userId || started.current) return;
    started.current = true;
    (async () => {
      try {
        const threads = await listKitThreads("social");
        const target = threads[0] ?? (await createKitThread("social"));
        void navigate({
          to: "/social-agent/$threadId",
          params: { threadId: target.id },
          replace: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open the social agent.");
      }
    })();
  }, [userId, navigate]);

  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-sm text-foreground/55">
        {userId === null
          ? "Sign in to use the social agent."
          : (error ?? "Opening your social agent…")}
      </div>
    </AppShell>
  );
}
