// -----------------------------------------------------------------------------
// LEGACY REDIRECT — the admin "Templates" page was a second copy of the same
// <LookStudio /> surface that /looks renders. There is now one Template Studio
// at /looks; this route only keeps old links and bookmarks working.
// -----------------------------------------------------------------------------

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/templates")({
  beforeLoad: () => {
    throw redirect({ to: "/looks", replace: true });
  },
});
