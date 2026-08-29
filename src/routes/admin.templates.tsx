// -----------------------------------------------------------------------------
// LEGACY REDIRECT — the admin "Templates" page was a second copy of the same
// <LookStudio /> surface that /looks renders. There is now one Template Studio
// at /looks; this route only keeps old links and bookmarks working.
//
// The redirect runs on the client AFTER mount rather than in `beforeLoad`:
// throwing a redirect there made the server stream the whole /looks document at
// this URL while the client router was still resolving the /looks chunk, so
// hydration compared the rendered studio against a Suspense fallback and threw
// "Hydration failed…". Rendering an inert shell keeps server and client markup
// identical, then navigates.
// -----------------------------------------------------------------------------

import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/templates")({
  head: () => ({
    meta: [
      { title: "Template Studio moved · TransPerfect Element" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TemplatesRedirect,
});

function TemplatesRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/looks", replace: true });
  }, [navigate]);
  return (
    <div className="p-10 text-sm text-black/60 dark:text-white/60">
      Template Studio now lives at /looks — taking you there…
    </div>
  );
}
