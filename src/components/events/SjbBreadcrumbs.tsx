import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType } from "react";

// Bowl area pages render without the app shell (they are public), so they
// carry their own trail back to the Bowl landing page.
const LABELS: Record<string, string> = {
  "brand-kit": "Brand kit",
  designers: "Designer files",
  guide: "Brand guide",
  lettering: "Lettering spec",
  "single-colour": "Single-colour logos",
  billboards: "Digital billboards",
  "set-5-assets": "Set 5 design assets",
  social: "Social posts",
  "stadium-policies": "Stadium policies",
  stadium: "Stadium",
};

const linkCls = "rounded px-1.5 py-0.5 hover:bg-black/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary";

export function SjbBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.replace(/^\/events\/san-juan-bowl\/?/, "").split("/").filter(Boolean);
  return (
    <nav aria-label="Breadcrumb" className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6 pt-4 text-sm text-muted-foreground">
      <Link to="/events/$eventId" params={{ eventId: "san-juan-bowl" }} className={linkCls}>
        San Juan Bowl
      </Link>
      {parts.map((seg, i) => {
        const last = i === parts.length - 1;
        const label = LABELS[seg] ?? seg;
        const href = `/events/san-juan-bowl/${parts.slice(0, i + 1).join("/")}`;
        return (
          <span key={href} className="flex items-center gap-1">
            <span aria-hidden>/</span>
            {last ? (
              <span aria-current="page" className="px-1.5 py-0.5 font-medium text-foreground">{label}</span>
            ) : (
              <Link to={href as string} className={linkCls}>{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function withSjbTrail<P extends object>(Page: ComponentType<P>) {
  return function SjbTrailPage(props: P) {
    return (
      <>
        <SjbBreadcrumbs />
        <Page {...props} />
      </>
    );
  };
}
