import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = [
    { to: "/", label: "Dashboard" },
    { to: "/brief/new", label: "New brief" },
    { to: "/atlas", label: "Atlas" },
    { to: "/library", label: "Library" },
  ] as const;
  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#0A0F1C]">
      <header className="border-b border-black/10 bg-white">
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
                  className={`rounded-full px-4 py-2 text-sm ${active ? "bg-[#0B2A4A] text-white" : "text-black/60 hover:text-black"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-8 py-10">{children ?? <Outlet />}</main>
    </div>
  );
}
