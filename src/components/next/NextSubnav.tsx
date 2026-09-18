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
 * (its siblings as pills) plus a "All NEXT pages" panel listing the whole
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

  const pill =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ";
  const idle =
    "border-black/15 bg-white/70 text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] " +
    "dark:border-white/15 dark:bg-white/5 dark:text-white/70 dark:hover:border-[#A1FBF9] dark:hover:text-[#A1FBF9]";
  const active = "border-[#003FC7] bg-[#003FC7] text-white";

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-medium tracking-[0.14em] text-black/45 uppercase dark:text-white/50">
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
              className={pill + (isActive ? active : idle)}
            >
              {p.label}
              {p.scope === "london" ? (
                <span className={isActive ? "text-white/70" : "text-black/35 dark:text-white/40"}>
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
          className={pill + idle}
        >
          {open ? <X size={12} /> : <LayoutGrid size={12} />}
          All NEXT pages
        </button>
      </div>

      {open ? (
        <div className="mt-3 rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
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
                        className="block rounded-lg px-2 py-1.5 hover:bg-[#003FC7]/8 dark:hover:bg-white/10"
                      >
                        <span className="text-sm font-medium">{p.label}</span>
                        {p.scope === "london" ? (
                          <span className="ml-1.5 rounded-full border border-black/15 px-1.5 py-px text-[10px] text-black/50 dark:border-white/15 dark:text-white/50">
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
