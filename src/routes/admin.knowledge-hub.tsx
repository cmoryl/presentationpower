import { createFileRoute, redirect } from "@tanstack/react-router";

// The hub was a page of links; the Knowledge screens now share one tab strip.
export const Route = createFileRoute("/admin/knowledge-hub")({
  head: () => ({ meta: [{ title: "Knowledge · Admin · TransPerfect Element" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/knowledge" });
  },
});
