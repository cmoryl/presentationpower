import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { useContrastBoost } from "@/hooks/use-contrast-boost";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [boost, setBoost] = useContrastBoost();
  const [theme, setTheme] = useTheme();
  const [adminOpen, setAdminOpen] = useState(false);
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
    { to: "/admin/icon-studio", label: "Icon Studio" },
  ] as const;
  const footerNav = [
    { to: "/knowledge", label: "Knowledge" },
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
    <div className="min-h-screen bg-[#F5F1EA] text-[#0A0F1C] dark:bg-[#05041A] dark:text-[#E0E8F5]">
      <header
        className={
          "sticky top-0 z-30 border-b border-white/40 " +
          "bg-[#F5F1EA]/50 [backdrop-filter:blur(28px)_saturate(180%)] " +
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_0_0_rgba(0,0,0,0.04),0_20px_50px_-30px_rgba(11,42,74,0.25)] " +
          "dark:!bg-[#07061F]/50 dark:!border-white/10 " +
          "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_1px_0_0_rgba(0,0,0,0.5),0_20px_60px_-30px_rgba(0,63,199,0.4)]"
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
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span
              className="h-2 w-8 shrink-0 bg-[#E85A2C] dark:!bg-transparent"
              style={{}}
            />
            <span
              aria-hidden
              className="hidden h-3 w-8 shrink-0 rounded-full dark:!block"
              style={{
                background:
                  "linear-gradient(90deg, #A1FBF9 0%, #7A5CFF 55%, #0057FF 100%)",
                boxShadow: "0 0 12px rgba(122,92,255,0.55)",
              }}
            />
            <div className="min-w-0 text-center text-sm font-semibold tracking-[0.18em] sm:tracking-[0.25em] dark:text-white">
              TRANSPERFECT · MODULAR
            </div>
          </Link>
          <nav className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full border border-white/40 bg-white/25 p-1 [backdrop-filter:blur(24px)_saturate(160%)] dark:!border-white/10 dark:!bg-white/[0.03]">
            {nav.map((n) => {
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
                      <span aria-hidden className="text-[10px]">▾</span>
                    </Link>
                    {adminOpen && (
                      <div className="absolute left-1/2 top-full z-50 w-52 -translate-x-1/2 pt-2">
                        <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/70 p-1.5 [backdrop-filter:blur(28px)_saturate(180%)] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_20px_60px_-15px_rgba(11,42,74,0.35)] dark:!border-white/10 dark:!bg-[#0B0A2A]/70 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_20px_60px_-15px_rgba(0,0,0,0.8)]">
                          {adminSubnav.map((s) => {
                            const active = pathname === s.to || pathname.startsWith(s.to + "/");
                            return (
                              <Link
                                key={s.to}
                                to={s.to}
                                className={`block rounded-xl px-3.5 py-2 text-sm transition ${
                                  active
                                    ? "bg-white/80 text-[#03002C] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_4px_12px_-4px_rgba(11,42,74,0.3)] dark:!bg-gradient-to-b dark:!from-white/15 dark:!to-white/[0.04] dark:!text-white dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
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
            <div
              role="radiogroup"
              aria-label="Color theme"
              className="ml-1 inline-flex items-center rounded-full border border-white/50 bg-white/40 p-0.5 text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] dark:!border-white/10 dark:!bg-white/[0.04] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
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
                      on
                        ? "bg-white/80 text-[#03002C] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_2px_6px_-2px_rgba(11,42,74,0.3)] dark:!bg-gradient-to-b dark:!from-white/15 dark:!to-white/[0.04] dark:!text-white dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                        : "text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white"
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
              className={`ml-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${
                boost
                  ? "border-white/60 bg-white/80 text-[#03002C] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_4px_12px_-4px_rgba(11,42,74,0.3)] dark:!border-[#A1FBF9]/30 dark:!bg-[#A1FBF9]/10 dark:!text-[#A1FBF9] dark:shadow-[inset_0_1px_0_0_rgba(161,251,249,0.2)]"
                  : "border-white/50 bg-white/40 text-black/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] hover:bg-white/60 dark:!border-white/10 dark:!bg-white/[0.04] dark:text-white/70 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] dark:hover:!bg-white/[0.08]"
              }`}
            >
              <span aria-hidden="true">◐</span>
              <span>Readable</span>
            </button>

          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[1400px] px-3 py-6 sm:px-8 sm:py-10">{children ?? <Outlet />}</main>
      <footer className="border-t border-black/10 bg-[#E8E4DC]/60 dark:!border-white/[0.06] dark:!bg-[#07061F]/70">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-8 py-8 md:flex-row">
          <div className="text-xs text-black/50 dark:text-white/50">TransPerfect Modular · Built for sales enablement</div>
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
