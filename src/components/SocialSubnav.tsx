import { Link, useRouterState } from "@tanstack/react-router";

// One social home: every social tool shares this tab strip (mounted by AppShell).
const TABS = [
  { to: "/social", label: "Overview", exact: true },
  { to: "/social/new", label: "New kit" },
  { to: "/social/kit", label: "Kit builder" },
  { to: "/social/modules", label: "Modules" },
  { to: "/social/presets", label: "Presets" },
  { to: "/social/banners", label: "Banners" },
  { to: "/social-agent", label: "Social agent" },
] as const;

export function SocialSubnav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // Guided demos and playbooks are full-screen stories; keep them unframed.
  const inSocial =
    path === "/social" || path.startsWith("/social/") || path.startsWith("/social-agent");
  if (!inSocial || path.startsWith("/social/demo/")) return null;
  return (
    <nav aria-label="Social tools" className="mb-4 border-b border-border">
      <ul className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active =
            "exact" in t ? path === t.to || path === `${t.to}/` : path.startsWith(t.to);
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                activeOptions={{ exact: "exact" in t }}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
