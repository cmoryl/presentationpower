// Entry point for the Print Agent: open the most recent print conversation or
// start a fresh one.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useSessionUser } from "@/hooks/use-session-user";
import { createPrintThread, listPrintThreads } from "@/lib/print-agent/threads";

export const Route = createFileRoute("/print-agent/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Print agent · TransPerfect Element" },
      {
        name: "description",
        content:
          "Chat with the Element print agent to build case studies, spotlights, e-brochures and solution proposals from the print module library.",
      },
      { property: "og:title", content: "Print agent · TransPerfect Element" },
      {
        property: "og:description",
        content: "Build brand-compliant print pieces end to end in one conversation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrintAgentIndex,
});

function PrintAgentIndex() {
  const userId = useSessionUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!userId || started.current) return;
    started.current = true;
    (async () => {
      try {
        const threads = await listPrintThreads();
        const target = threads[0] ?? (await createPrintThread());
        void navigate({ to: "/print-agent/$threadId", params: { threadId: target.id }, replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open the print agent.");
      }
    })();
  }, [userId, navigate]);

  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center p-10 text-sm text-foreground/55">
        {userId === null ? "Sign in to use the print agent." : (error ?? "Opening your print agent…")}
      </div>
    </AppShell>
  );
}
