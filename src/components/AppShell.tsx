import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useContrastBoost } from "@/hooks/use-contrast-boost";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [boost, setBoost] = useContrastBoost();
  const [theme, setTheme] = useTheme();
  const themes: { id: ThemeMode; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark",  label: "Dark" },
  ];
  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/brief/new", label: "New brief" },
    { to: "/atlas", label: "Atlas" },
    { to: "/library", label: "Library" },
    { to: "/admin", label: "Admin" },
  ] as const;
  const adminSubnav = [
    { to: "/admin", label: "Overview" },
    { to: "/admin/imagery", label: "Imagery" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/approvals", label: "Knowledgebase" },
    { to: "/admin/oracle", label: "Oracle KB" },
    { to: "/admin/brand-assets", label: "Brand assets" },
    { to: "/admin/logohub", label: "LogoHub" },
  ] as const;
  const footerNav = [
    { to: "/knowledge", label: "Knowledge" },
    { to: "/about", label: "About" },
    { to: "/faq", label: "FAQ" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#0A0F1C]">
      <header className="glass sticky top-0 z-30 !rounded-none border-l-0 border-r-0 border-t-0">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-4 lg:flex-row lg:px-8 lg:py-5">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <div className="h-2 w-8 shrink-0 bg-[#E85A2C]" />
            <div className="min-w-0 text-center text-sm font-semibold tracking-[0.18em] sm:tracking-[0.25em]">
              TRANSPERFECT · MODULAR
            </div>
          </Link>
          <nav className="flex max-w-full flex-wrap items-center justify-center gap-1">
            {nav.map((n) => {
              const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-full px-3 py-2 text-sm transition sm:px-4 ${active ? "bg-[#0B2A4A] text-white shadow-lg" : "text-black/60 hover:bg-white/40 hover:text-black"}`}
                >
                  {n.label}
                </Link>
              );
            })}
            <div
              role="radiogroup"
              aria-label="Color theme"
              className="inline-flex items-center rounded-full border border-black/20 bg-white/40 p-0.5 text-xs sm:ml-2"
            >
              {themes.map((t) => {
                const on = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTheme(t.id)}
                    className={`rounded-full px-2.5 py-1 transition ${
                      on ? "bg-[#03002C] text-white" : "text-black/70 hover:text-black"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setBoost(!boost)}
              aria-pressed={boost}
              aria-label={boost ? "Disable high contrast mode" : "Enable high contrast mode"}
              title="Auto-adjust text contrast on glass surfaces (WCAG AA)"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition sm:ml-2 ${
                boost
                  ? "border-[#03002C] bg-[#03002C] text-white"
                  : "border-black/20 bg-white/40 text-black/70 hover:bg-white/70"
              }`}
            >
              <span aria-hidden="true">◐</span>
              <span>Readable</span>
            </button>

          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[1400px] px-3 py-6 sm:px-8 sm:py-10">{children ?? <Outlet />}</main>
      <footer className="border-t border-black/10 bg-[#E8E4DC]/60">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-8 py-8 md:flex-row">
          <div className="text-xs text-black/50">TransPerfect Modular · Built for sales enablement</div>
          <nav className="flex items-center gap-1">
            {footerNav.map((n) => {
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-full px-4 py-2 text-sm transition ${active ? "bg-[#0B2A4A] text-white shadow-lg" : "text-black/60 hover:bg-white/40 hover:text-black"}`}
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
