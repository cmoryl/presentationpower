import { createFileRoute, redirect } from "@tanstack/react-router";

// Module review now lives on the shared Approvals page (Modules tab).
export const Route = createFileRoute("/admin/approvals")({
  head: () => ({ meta: [{ title: "Module review · Admin · TransPerfect Element" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/approvals", search: { tab: "modules" } });
  },
});
