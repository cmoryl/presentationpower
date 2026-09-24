import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { LayoutGrid, X } from "lucide-react";

import {
  NEXT_WORKSPACE_GROUPS,
  isNextWorkspacePath,
  nextWorkspaceGroup,
  nextWorkspacePageFor,
} from "@/lib/next-workspace";

/**
 * The shared NEXT navigation spine.
 *
 * Mounted once by AppShell for every `/events/next*` route, so no NEXT page can
 * drift out of the structure. It shows the group the current page belongs to
 * (its siblings as underlined tabs) plus a "All NEXT pages" panel listing the whole
 * workspace — the single place to find anything.
 */
export function NextSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  if (!isNextWorkspacePath(pathname)) return null;
  const current = nextWorkspacePageFor(pathname);
  const groupId = current?.group ?? "plan";
  const group = NEXT_WORKSPACE_GROUPS.find((g) => g.id === groupId) ?? NEXT_WORKSPACE_GROUPS[0];
  const siblings = nextWorkspaceGroup(group.id);

  const tab =
    "relative inline-flex items-center gap-1.5 border-b-2 px-1 pb-2 pt-1 text-[13px] font-medium transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] ";
  const idle =
    "border-transparent text-black/70 hover:border-black/30 hover:text-black dark:text-white/75 dark:hover:border-white/40 dark:hover:text-white";
  const active =
    "border-[#003FC7] text-[#03002C] font-semibold dark:border-[#A1FBF9] dark:text-white";

  return (
    <div className="mb-5">
      <span className="block pb-1 text-[11px] font-semibold tracking-[0.14em] text-black/60 uppercase md:hidden dark:text-white/65">
        {group.label}
      </span>
      <nav
        aria-label={group.label}
        className="-mx-1 flex flex-nowrap items-end gap-x-5 overflow-x-auto whitespace-nowrap border-b border-black/10 px-1 pt-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:gap-y-1 md:overflow-visible md:px-0 md:whitespace-normal dark:border-white/15"
      >
        <span className="hidden pb-2 text-[11px] font-semibold tracking-[0.14em] text-black/60 uppercase md:inline dark:text-white/65">
          {group.label}
        </span>
        {siblings.map((p) => {
          const isActive = current?.to === p.to;
          return (
            <Link
              key={p.to}
              to={p.to}
              title={p.purpose}
              aria-current={isActive ? "page" : undefined}
              className={tab + (isActive ? active : idle)}
            >
              {p.label}
              {p.scope === "london" ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-black/50 dark:text-white/55">
                  London
                </span>
              ) : null}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={tab + idle + " ml-auto"}
        >
          {open ? <X size={12} aria-hidden /> : <LayoutGrid size={12} aria-hidden />}
          All NEXT pages
        </button>
      </nav>

      {open ? (
        <div className="mt-3 rounded-md border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {NEXT_WORKSPACE_GROUPS.map((g) => (
              <div key={g.id}>
                <div className="text-[11px] font-medium tracking-[0.14em] text-[#003FC7] uppercase dark:text-[#A1FBF9]">
                  {g.label}
                </div>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">{g.blurb}</p>
                <ul className="mt-2 space-y-1.5">
                  {nextWorkspaceGroup(g.id).map((p) => (
                    <li key={p.to}>
                      <Link
                        to={p.to}
                        onClick={() => setOpen(false)}
                        className="block rounded-sm px-2 py-1.5 hover:bg-[#003FC7]/8 dark:hover:bg-white/10"
                      >
                        <span className="text-sm font-medium">{p.label}</span>
                        {p.scope === "london" ? (
                          <span className="ml-1.5 font-mono text-[10px] uppercase text-black/50 dark:border-white/15 dark:text-white/50">
                            London
                          </span>
                        ) : null}
                        <span className="block text-xs text-black/55 dark:text-white/55">
                          {p.purpose}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
