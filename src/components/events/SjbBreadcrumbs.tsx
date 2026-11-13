import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentType } from "react";
import { SjbMasthead } from "./SjbMasthead";

// Bowl area pages without the app shell carry their own trail back to the Bowl
// landing page; when the page renders the app shell (signed-in), its own trail is
// used and this one hides itself via :has() so the two never stack.
const LABELS: Record<string, string> = {
  "brand-kit": "Brand kit",
  designers: "Designer files",
  guide: "Brand guide",
  lettering: "Lettering spec",
  "single-colour": "Single-colour logos",
  billboards: "Digital billboards",
  "set-5-assets": "Set 5 design assets",
  social: "Social posts",
  "social-calendar": "Social calendar",
  "stadium-policies": "Stadium policies",
  stadium: "Stadium",
  badges: "Badges",
  tshirts: "T-shirts",
};

const linkCls = "rounded px-1.5 py-0.5 hover:bg-black/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary";

export function SjbBreadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.replace(/^\/events\/san-juan-bowl\/?/, "").split("/").filter(Boolean);
  return (
    <nav data-sjb-trail-masthead aria-label="Breadcrumb" className="[&:has(+[data-app-shell])]:hidden mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6 pt-4 text-sm text-muted-foreground">
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
        {/* Shell-less pages get the masthead here; SjbShell pages draw it inside their shell. */}
        <div data-sjb-trail-masthead className="px-6"><SjbMasthead /></div>
        <Page {...props} />
      </>
    );
  };
}
