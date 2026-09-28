// One tab strip across the four Knowledge screens so they read as a single
// area: Entries, Ask Oracle, Oracle KB, Sources. Old addresses keep working.
// Oracle KB and Sources are admin screens, so only admins see those tabs.
import { Link, useRouterState } from "@tanstack/react-router";
import { useIsAdmin } from "@/lib/use-is-admin";

const TABS = [
  { to: "/knowledge", label: "Entries", exact: true, admin: false },
  { to: "/knowledge/ask", label: "Ask Oracle", admin: false },
  { to: "/admin/oracle", label: "Oracle KB", admin: true },
  { to: "/admin/knowledge", label: "Sources", admin: true },
] as const;

export function KnowledgeTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") || "/" });
  const { isAdmin } = useIsAdmin();
  return (
    <nav aria-label="Knowledge" className="mx-auto mb-6 flex w-full max-w-6xl flex-wrap gap-1 border-b border-border px-4 pt-4 sm:px-6">
      {TABS.filter((t) => !t.admin || isAdmin).map((t) => {
        const on = "exact" in t && t.exact ? path === t.to : path === t.to || path.startsWith(`${t.to}/`);
        return (
          <Link
            key={t.to}
            to={t.to}
            aria-current={on ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${
              on ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
