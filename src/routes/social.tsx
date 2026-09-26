import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";

// One social home: every social tool sits behind the same tab strip, so users
// move between them without hunting. Every existing address keeps working.
const TABS = [
  { to: "/social", label: "Overview", exact: true },
  { to: "/social/new", label: "New kit" },
  { to: "/social/kit", label: "Kit builder" },
  { to: "/social/modules", label: "Modules" },
  { to: "/social/presets", label: "Presets" },
  { to: "/social/banners", label: "Banners" },
  { to: "/social-agent", label: "Social agent" },
] as const;

function SocialLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // Guided demos and playbooks are full-screen stories; keep them unframed.
  const bare = path.startsWith("/social/demo/");
  return (
    <>
      {bare ? null : (
        <nav
          aria-label="Social tools"
          className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur"
        >
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
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
      )}
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/social")({
  component: SocialLayout,
});
