import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/AdminShell";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ElementLockup } from "@/components/brand/ElementLogo";

// Pages that live outside /admin/* but are linked from the admin console.
// When the user reaches them from an admin context, keep the admin sidebar visible.
const ADMIN_LINKED_PATTERNS = [
  /^\/analytics(\/|$)/,
  /^\/looks(\/|$)/,
  /^\/templates(\/|$)/,
  /^\/knowledge(\/|$)/,
];

function matchesAdminLinked(pathname: string): boolean {
  return ADMIN_LINKED_PATTERNS.some((re) => re.test(pathname));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const locSearch = useRouterState({ select: (s) => s.location.searchStr });

  const [adminOpen, setAdminOpen] = useState(false);
  const [presOpen, setPresOpen] = useState(false);
  
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLinked = matchesAdminLinked(pathname);
  const [adminCtx, setAdminCtx] = useState(false);

  // One-time cleanup: the legacy "Readable" (contrast-boost) toggle was
  // removed from the nav. Purge any stored preference and strip the lingering
  // `.contrast-boost` class from <html> so existing sessions fall back to
  // the default styles without requiring a hard refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("tp:contrast-boost");
    } catch {
      /* ignore */
    }
    document.documentElement.classList.remove("contrast-boost");
  }, []);

  // Dark mode is retired from the main navigation: the app ships light-only for
  // now, so pin any stored preference (including old "dark" sessions) to light.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("tp:theme-mode", "light");
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (inAdmin) {
      sessionStorage.setItem("tpm.adminCtx", "1");
      setAdminCtx(true);
    } else if (isAdminLinked) {
      setAdminCtx(sessionStorage.getItem("tpm.adminCtx") === "1");
    } else {
      sessionStorage.removeItem("tpm.adminCtx");
      setAdminCtx(false);
    }
  }, [pathname, inAdmin, isAdminLinked]);

  const showAdminChrome = !inAdmin && isAdminLinked && adminCtx;
  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/brief/new", label: "New brief" },

    { to: "/elements", label: "Elements" },

    { to: "/files", label: "My files" },
    { to: "/admin", label: "Admin" },
  ] as const;

  // Elements mega-menu: the four output channels and their sub-options.
  const elementGroups: ReadonlyArray<{
    label: string;
    to: string;
    items: ReadonlyArray<{ to: string; label: string; search?: Record<string, string> }>;
  }> = [
    {
      label: "Presentation",
      to: "/library",
      items: [
        { to: "/library", label: "Slide modules" },
        { to: "/library/my", label: "My decks" },
        { to: "/decks", label: "All decks" },
        { to: "/library/imported", label: "Imported decks" },
        { to: "/agent", label: "Deck agent" },
        { to: "/admin/canvas", label: "Canvas creator" },
      ],
    },
    {
      label: "Print",
      to: "/library/print",
      items: [
        { to: "/library/print", label: "Print templates" },
        { to: "/library/print", label: "Case studies", search: { type: "case-study" } },
        { to: "/library/print", label: "Client spotlights", search: { type: "spotlight" } },
        { to: "/library/print", label: "E-brochures", search: { type: "ebrochure" } },
        { to: "/library/print/modules", label: "Section modules" },
        { to: "/library/print/heroes", label: "Hero openers" },
      ],
    },
    {
      label: "Events",
      to: "/events",
      items: [
        { to: "/events", label: "Event assets" },
        { to: "/events/new", label: "New event asset" },
        { to: "/events/presets", label: "Presets" },
        { to: "/events/next", label: "Next-gen builder" },
      ],
    },
    {
      label: "Social",
      to: "/social",
      items: [
        { to: "/social", label: "Social assets" },
        { to: "/social/new", label: "New social asset" },
        { to: "/social/presets", label: "Presets" },
        { to: "/social/banners", label: "Banners" },
      ],
    },
  ];



  const adminGroups: ReadonlyArray<{
    label: string;
    items: ReadonlyArray<{ to: string; label: string }>;
  }> = [
    {
      label: "Overview",
      items: [
        { to: "/admin", label: "Command center" },
        { to: "/atlas", label: "Atlas" },
        { to: "/looks", label: "Alternate looks" },
        { to: "/templates", label: "Templates" },
        { to: "/library/print", label: "Print Studio" },
        { to: "/admin/audit", label: "Audit log" },
      ],
    },

    {
      label: "Analytics",
      items: [
        { to: "/admin/analytics", label: "Master analytics" },
        { to: "/analytics", label: "Deck engagement" },
        { to: "/admin/ai", label: "AI usage & cost" },
        { to: "/admin/imagery-analytics", label: "Imagery analytics" },
      ],
    },
    {
      label: "Knowledge",
      items: [
        { to: "/admin/knowledge-hub", label: "Knowledge hub" },
        { to: "/knowledge", label: "Browse entries" },
        { to: "/knowledge/ask", label: "Ask Oracle" },
        { to: "/admin/oracle", label: "Oracle KB" },
        { to: "/admin/knowledge", label: "KB manager" },
        { to: "/admin/approvals", label: "Approvals" },
      ],
    },
    {
      label: "Brand assets",
      items: [
        { to: "/admin/brand-assets", label: "Brand assets" },
        { to: "/knowledge/brand-guides", label: "Brand guides" },
        { to: "/admin/logohub", label: "LogoHub" },
        { to: "/admin/icon-studio", label: "Icon Studio" },
        { to: "/admin/pdf-ingest", label: "PDF ingestion" },
      ],
    },
    {
      label: "Translation",
      items: [
        { to: "/admin/translation", label: "Translation" },
        { to: "/admin/globallink", label: "GlobalLink · Translate" },
        { to: "/admin/globallink-share", label: "GlobalLink · Share" },
      ],
    },
    {
      label: "Governance",
      items: [{ to: "/admin/users", label: "Users & roles" }],
    },
  ];
  const footerNav = [
    { to: "/about", label: "About" },
    { to: "/faq", label: "FAQ" },
  ] as const;

  // Sleek liquid-glass pills — hairline rings, gradient wash on active, no drop-shadow stacks.
  const pillIdle =
    "relative text-black/65 hover:text-black hover:bg-white/40 " +
    "dark:text-white/70 dark:hover:text-white dark:hover:!bg-white/[0.05]";
  const pillActive =
    "relative text-[#03002C] bg-white/60 ring-1 ring-black/[0.04] " +
    "dark:!text-white dark:!bg-white/[0.06] dark:!ring-white/10 " +
    // Aqua→violet underline glow instead of a heavy drop shadow
    "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-[3px] after:h-px " +
    "after:bg-gradient-to-r after:from-transparent after:via-[#0057FF]/60 after:to-transparent " +
    "dark:after:via-[#A1FBF9]/70";

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#03002C] dark:bg-[#05041A] dark:text-[#E0E8F5]">
      <header
        className={
          "sticky top-0 z-30 border-b border-white/30 " +
          "bg-[#F5F1EA]/60 [backdrop-filter:blur(28px)_saturate(180%)] " +
          "dark:!bg-[#07061F]/60 dark:!border-white/[0.08]"
        }
      >
        {/* Aurora sheen — sits over the glass, adds depth/refraction */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-70"
          style={{
            background:
              "radial-gradient(120% 100% at 15% 0%, rgba(161,251,249,0.18) 0%, transparent 55%), radial-gradient(100% 100% at 85% 0%, rgba(122,92,255,0.18) 0%, transparent 55%)",
          }}
        />
        {/* Top edge highlight — the meniscus */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 20%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.7) 80%, transparent 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-px dark:block"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(161,251,249,0.4) 20%, rgba(122,92,255,0.5) 50%, rgba(0,63,199,0.4) 80%, transparent 100%)",
          }}
        />
        <div className="relative mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-4 lg:flex-row lg:px-8 lg:py-5">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            aria-label="TransPerfect Element — home"
          >
            <ElementLockup
              layout="horizontal"
              tone="auto"
              markSize={88}
              image
              className="min-w-0 text-[#03002C] dark:text-white"
            />
          </Link>

          <nav className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-white/40 bg-white/25 p-1 [backdrop-filter:blur(24px)_saturate(160%)] dark:!border-white/10 dark:!bg-white/[0.03]">
            {nav.map((n) => {
              if (n.to === "/elements") {
                const elementsActive = elementGroups.some((g) =>
                  g.items.some((s) => pathname === s.to || pathname.startsWith(s.to + "/")),
                );
                return (
                  <div
                    key={n.to}
                    className="relative"
                    onMouseEnter={() => setPresOpen(true)}
                    onMouseLeave={() => setPresOpen(false)}
                  >
                    <Link
                      to={n.to}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition sm:px-4 ${
                        elementsActive ? pillActive : pillIdle
                      }`}
                      onClick={() => setPresOpen(false)}
                    >
                      {n.label}
                      <span aria-hidden className="text-[10px]">
                        ▾
                      </span>
                    </Link>
                    {presOpen && (
                      <div className="absolute left-1/2 top-full z-50 w-[760px] max-w-[94vw] -translate-x-1/2 pt-2">
                        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-2xl border border-white/50 bg-white/70 p-3 [backdrop-filter:blur(28px)_saturate(180%)] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_20px_60px_-15px_rgba(11,42,74,0.35)] sm:grid-cols-4 dark:!border-white/10 dark:!bg-[#0B0A2A]/80 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_20px_60px_-15px_rgba(0,0,0,0.8)]">
                          {elementGroups.map((g) => (
                            <div key={g.label} className="min-w-0">
                              <Link
                                to={g.to}
                                onClick={() => setPresOpen(false)}
                                className="block px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 transition hover:text-[#003FC7] dark:text-white/45 dark:hover:!text-[#A1FBF9]"
                              >
                                {g.label}
                              </Link>
                              <div className="flex flex-col gap-0.5">
                                {g.items.map((s) => {
                                  const params = new URLSearchParams(locSearch || "");
                                  const searchMatches = s.search
                                    ? Object.entries(s.search).every(
                                        ([k, v]) => params.get(k) === v,
                                      )
                                    : ["type", "sub", "collection"].every((k) => !params.get(k));
                                  const exact =
                                    s.to === "/library" ||
                                    s.to === "/library/print" ||
                                    s.to === "/events" ||
                                    s.to === "/social" ||
                                    s.to === "/decks";
                                  const pathMatches = exact
                                    ? pathname === s.to
                                    : pathname === s.to || pathname.startsWith(s.to + "/");
                                  const active = pathMatches && searchMatches;
                                  return (
                                    <Link
                                      key={`${s.to}:${s.label}`}
                                      to={s.to}
                                      search={s.search ?? {}}
                                      className={`block rounded-lg px-2.5 py-1.5 text-[13px] leading-tight transition ${
                                        active
                                          ? "bg-white/80 text-[#03002C] dark:!bg-white/10 dark:!text-white"
                                          : "text-black/70 hover:bg-white/50 hover:text-black dark:text-white/75 dark:hover:!bg-white/[0.06] dark:hover:text-white"
                                      }`}
                                      onClick={() => setPresOpen(false)}
                                    >
                                      {s.label}
                                    </Link>
                                  );

                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              if (n.to === "/admin") {
                const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");
                return (
                  <div
                    key={n.to}
                    className="relative"
                    onMouseEnter={() => setAdminOpen(true)}
                    onMouseLeave={() => setAdminOpen(false)}
                  >
                    <Link
                      to={n.to}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition sm:px-4 ${
                        adminActive ? pillActive : pillIdle
                      }`}
                      onClick={() => setAdminOpen(false)}
                    >
                      {n.label}
                      <span aria-hidden className="text-[10px]">
                        ▾
                      </span>
                    </Link>
                    {adminOpen && (
                      <div className="absolute left-1/2 top-full z-50 w-[720px] max-w-[92vw] -translate-x-1/2 pt-2">
                        <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-2xl border border-white/50 bg-white/70 p-3 [backdrop-filter:blur(28px)_saturate(180%)] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_20px_60px_-15px_rgba(11,42,74,0.35)] dark:!border-white/10 dark:!bg-[#0B0A2A]/80 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_20px_60px_-15px_rgba(0,0,0,0.8)]">
                          {adminGroups.map((g) => (
                            <div key={g.label} className="min-w-0">
                              <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                                {g.label}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                {g.items.map((s) => {
                                  const active =
                                    pathname === s.to || pathname.startsWith(s.to + "/");
                                  return (
                                    <Link
                                      key={s.to}
                                      to={s.to}
                                      className={`block rounded-lg px-2.5 py-1.5 text-[13px] leading-tight transition ${
                                        active
                                          ? "bg-white/80 text-[#03002C] shadow-[inset_0_1px_0_0_rgba(255,255,255,1)] dark:!bg-white/10 dark:!text-white"
                                          : "text-black/70 hover:bg-white/50 hover:text-black dark:text-white/75 dark:hover:!bg-white/[0.06] dark:hover:text-white"
                                      }`}
                                      onClick={() => setAdminOpen(false)}
                                    >
                                      {s.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-full px-3 py-1.5 text-sm transition sm:px-4 ${active ? pillActive : pillIdle}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[1400px] px-3 py-6 sm:px-8 sm:py-10">
        {showAdminChrome ? (
          <div className="flex flex-col gap-6 md:flex-row">
            <AdminSidebar />
            <div className="min-w-0 flex-1">
              <Breadcrumbs />
              {children ?? <Outlet />}
            </div>
          </div>
        ) : (
          <>
            <Breadcrumbs />
            {children ?? <Outlet />}
          </>
        )}
      </main>
      <footer className="border-t border-black/10 bg-[#E8E4DC]/60 dark:!border-white/[0.06] dark:!bg-[#07061F]/70">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-8 py-8 md:flex-row">
          <div className="text-xs text-black/50 dark:text-white/50">
            TransPerfect Element · Built for sales enablement
          </div>
          <nav className="flex items-center gap-1">
            {footerNav.map((n) => {
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-full px-4 py-2 text-sm transition ${active ? pillActive : pillIdle}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </footer>
    </div>
  );
}
