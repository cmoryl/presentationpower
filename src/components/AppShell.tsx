import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useContrastBoost } from "@/hooks/use-contrast-boost";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [boost, setBoost] = useContrastBoost();
  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/brief/new", label: "New brief" },
    { to: "/atlas", label: "Atlas" },
    { to: "/library", label: "Library" },
    { to: "/imagery", label: "Imagery" },
    { to: "/knowledge", label: "Knowledge" },
    { to: "/admin/approvals", label: "Approvals" },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#0A0F1C]">
      <header className="glass sticky top-0 z-30 !rounded-none border-l-0 border-r-0 border-t-0">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-2 w-8 bg-[#E85A2C]" />
            <div className="text-sm font-semibold tracking-[0.25em]">TRANSPERFECT · MODULAR</div>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((n) => {
              const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
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
            <button
              type="button"
              onClick={() => setBoost(!boost)}
              aria-pressed={boost}
              aria-label={boost ? "Disable high contrast mode" : "Enable high contrast mode"}
              title="Auto-adjust text contrast on glass surfaces"
              className={`ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
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
      <main className="relative z-10 mx-auto max-w-[1400px] px-8 py-10">{children ?? <Outlet />}</main>
    </div>
  );
}
