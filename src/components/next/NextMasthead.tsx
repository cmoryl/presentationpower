import { forwardRef, type HTMLAttributes } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/design-system/element";
import { nextLockupSuite } from "@/lib/next-event-logos";
import { isNextWorkspacePath, nextWorkspacePageFor } from "@/lib/next-workspace";
import ground from "@/assets/next-workspace/issued-cover-ground.jpg";
import { NextSubnav } from "./NextSubnav";
import "./next-workspace.css";

export interface NextMastheadProps extends HTMLAttributes<HTMLElement> {}

/** One issued-artwork header for the NEXT workspace; city facts stay on city pages. */
export const NextMasthead = forwardRef<HTMLElement, NextMastheadProps>(function NextMasthead(
  { className = "", children, ...props }, ref,
) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!isNextWorkspacePath(pathname)) return null;
  const home = pathname.replace(/\/+$/, "") === "/events/next";
  const current = nextWorkspacePageFor(pathname);
  const logo = nextLockupSuite("transperfect")?.wideWhite;
  return (
    <section ref={ref} data-next-masthead className={`next-masthead relative ${className}`} {...props}>
      <div className="relative overflow-hidden">
        <img src={ground} alt="" aria-hidden className="next-masthead-ground absolute inset-0 h-full w-full object-cover" />
        <div className="relative mx-auto max-w-[1400px] px-6 py-9 sm:px-8 sm:py-12">
          <Link to="/events/next" aria-label="TransPerfect NEXT — event home" className="inline-block max-w-full">
            {logo && <img src={logo.url} alt="TransPerfect NEXT" className="h-auto w-[340px] max-w-full sm:w-[440px]" />}
          </Link>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="next-masthead-copy max-w-2xl">
              <p className="mb-2 text-xs font-medium uppercase">{home ? "Event workspace · 2026" : "Event workspace"}</p>
              {home ? <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">TransPerfect NEXT events</h1>
                : <p className="text-3xl font-semibold leading-tight sm:text-4xl">{current?.label ?? "NEXT event assets"}</p>}
              <p className="mt-3 text-sm leading-relaxed opacity-85">{home ? "City editions · Division templates · On-site assets" : current?.purpose}</p>
            </div>
            {home && <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/events/next" hash="editions">City editions <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link to="/events/next/brand-kit">Master brand kit <ArrowRight /></Link></Button>
            </div>}
          </div>
          {children}
        </div>
      </div>
      <NextSubnav />
    </section>
  );
});