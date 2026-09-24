// Old address for the social-kit builder. It moved to /social/kit so marketing
// users never need an admin page; keep old links and bookmarks working.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/campaigns_/kit")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/social/kit", search: search as Record<string, string>, replace: true });
  },
});
