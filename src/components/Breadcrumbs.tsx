import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { useWorkspacePersona } from "@/hooks/use-workspace-persona";
import { personaById } from "@/lib/workspace-persona";

// The playbook catalogs are large data modules. Breadcrumbs render in the app
// shell on every route, so importing them statically drags all of that data
// into the entry chunk to label two demo segments. Resolve them on demand and
// fall back to the shortened id until the catalog lands.
const playbookNames = new Map<string, string>();

async function loadPlaybookNames(kind: "events" | "social") {
  const entries =
    kind === "events"
      ? (await import("@/lib/event-playbooks")).EVENT_PLAYBOOKS
      : (await import("@/lib/social-playbooks")).SOCIAL_PLAYBOOKS;
  for (const p of entries) playbookNames.set(`${kind}:${p.id}`, p.name);
}

// Static label overrides for known path segments. Anything not listed falls
// back to a title-cased version of the URL segment (e.g. `brand-assets` →
// "Brand Assets").
const STATIC_LABELS: Record<string, string> = {
  "": "Home",
  admin: "Admin",
  library: "Presentation",
  print: "Print",
  events: "Event",
  social: "Social",
  brief: "Brief",
  new: "New",
  decks: "Decks",
  import: "Import",
  atlas: "Atlas",
  templates: "Templates",
  knowledge: "Knowledge",
  ask: "Ask Oracle",
  "brand-guides": "Brand guides",
  analytics: "Analytics",
  ai: "AI usage",
  ab: "A/B testing",
  "imagery-analytics": "Imagery analytics",
  "knowledge-hub": "Knowledge hub",
  oracle: "Oracle KB",
  approvals: "Approvals",
  "brand-assets": "Brand assets",
  logohub: "LogoHub",
  "icon-studio": "Icon Studio",
  "pdf-ingest": "PDF ingestion",
  translation: "Translation",
  globallink: "GlobalLink",
  "globallink-share": "GlobalLink share",
  users: "Users & roles",
  audit: "Audit log",
  campaigns: "Campaigns",
  kit: "Kit",
  demo: "Demo",
  asset: "Asset",
  faq: "FAQ",
  about: "About",
  auth: "Sign in",
  agent: "Deck agent",
  "print-agent": "Print agent",
  "events-agent": "Events agent",
  "social-agent": "Social agent",
  // Role marketing pages (/for/admin, /for/marketing, /for/sales).
  for: "Element by role",
  marketing: "Marketing",
  sales: "Sales",
  // `dashboard` is resolved dynamically from the active persona below.
};

// Segments that should be hidden from the trail entirely (they're internal
// routing artifacts, not meaningful location context for the user).
const HIDDEN_SEGMENTS = new Set(["api", "_authenticated"]);

function titleCase(seg: string): string {
  return seg.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortenId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}…${id.slice(-3)}`;
}

// True when `path` corresponds to a real route. Intermediate URL segments like
// `/social/demo` are namespaces with no route file, so linking them directly
// lands the user on the not-found page.
function isRoutablePath(routePatterns: string[], path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  return routePatterns.some((pattern) => {
    const pat = pattern
      .split("/")
      .filter(Boolean)
      .filter((p) => !p.startsWith("_"));
    if (pat.length !== parts.length) return false;
    return pat.every((p, i) => p.startsWith("$") || p === parts[i]);
  });
}

// Every crumb should be a working "back" target. When a segment is a bare
// namespace (`/social/demo`, `/demo/deck`), walk up until we find the closest
// ancestor that does resolve to a route so the crumb still navigates somewhere
// sensible instead of rendering as dead text.
function nearestRoutableAncestor(routePatterns: string[], path: string): string {
  const parts = path.split("/").filter(Boolean);
  for (let n = parts.length - 1; n > 0; n -= 1) {
    const candidate = `/${parts.slice(0, n).join("/")}`;
    if (isRoutablePath(routePatterns, candidate)) return candidate;
  }
  return "/";
}

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const decks = useDeckStore((s) => s.decks);
  const { persona } = useWorkspacePersona();
  // The /dashboard crumb follows the active persona so the trail always names
  // the dashboard the user actually sees (Sales / MarOps / Admin dashboard).
  const dashboardLabel = personaById(persona).label;

  const routePatterns = useMemo(() => Object.keys(router.routesByPath ?? {}), [router]);

  // Only demo routes need a playbook name; load that catalog lazily and
  // re-label once it resolves.
  const [catalogVersion, setCatalogVersion] = useState(0);
  const demoKind: "events" | "social" | null = pathname.startsWith("/events/demo/")
    ? "events"
    : pathname.startsWith("/social/demo/")
      ? "social"
      : null;
  useEffect(() => {
    if (!demoKind) return;
    let cancelled = false;
    void loadPlaybookNames(demoKind).then(() => {
      if (!cancelled) setCatalogVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [demoKind]);

  const crumbs = useMemo(() => {
    // Root has no breadcrumbs — home page speaks for itself.
    if (pathname === "/" || pathname === "")
      return [] as Array<{ label: string; to: string; last: boolean; href: string }>;

    const parts = pathname
      .split("/")
      .filter(Boolean)
      .filter((p) => !HIDDEN_SEGMENTS.has(p));
    const items: Array<{ label: string; to: string; last: boolean; href: string }> = [];
    let acc = "";
    for (let i = 0; i < parts.length; i += 1) {
      const seg = parts[i];
      const prev = parts[i - 1];
      acc += `/${seg}`;
      let label: string;

      // Dynamic-segment resolvers: try to give the user a friendly label
      // instead of a raw ID. Falls back to a shortened id.
      if (prev === "decks" && decks[seg]) {
        label = decks[seg]!.title || shortenId(seg);
      } else if (prev === "asset") {
        label = shortenId(seg);
      } else if (prev === "demo" && (parts[i - 2] === "events" || parts[i - 2] === "social")) {
        const kind = parts[i - 2] as "events" | "social";
        label = playbookNames.get(`${kind}:${seg}`) ?? shortenId(seg);
      } else if (seg === "dashboard") {
        label = dashboardLabel;
      } else if (STATIC_LABELS[seg]) {
        label = STATIC_LABELS[seg];
      } else if (/^[0-9a-f-]{20,}$/i.test(seg) || /^[a-z]+-[a-z0-9-]{10,}/i.test(seg)) {
        // Looks like an opaque ID slug.
        label = shortenId(seg);
      } else {
        label = titleCase(seg);
      }

      const routable = isRoutablePath(routePatterns, acc);
      items.push({
        label,
        to: acc,
        last: i === parts.length - 1,
        // Namespace crumbs still navigate — up to their closest real route.
        href: routable ? acc : nearestRoutableAncestor(routePatterns, acc),
      });
    }
    return items;
  }, [pathname, decks, routePatterns, catalogVersion, dashboardLabel]);

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-2.5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[12px] font-medium text-black/55 dark:text-white/55"
    >
      <Link
        to="/"
        className="shrink-0 rounded-full px-2 py-1 transition hover:bg-white/50 hover:text-black dark:hover:bg-white/[0.06] dark:hover:text-white"
      >
        Home
      </Link>
      {crumbs.map((c) => (
        <span key={c.to} className="flex min-w-0 items-center gap-1.5">
          <span aria-hidden className="shrink-0 text-black/25 dark:text-white/25">
            /
          </span>
          {c.last ? (
            <span
              aria-current="page"
              title={c.label}
              className="max-w-[60vw] truncate rounded-full bg-white/60 px-2 py-1 text-[#03002C] ring-1 ring-black/[0.04] sm:max-w-none dark:bg-white/[0.06] dark:text-white dark:ring-white/10"
            >
              {c.label}
            </span>
          ) : (

            // TanStack Router requires typed path params for statically-typed
            // routes. Since breadcrumbs walk arbitrary URLs, cast the string
            // through the loose overload — this is safe because every href is
            // resolved to a real route above.
            <Link
              to={c.href as string}
              className="rounded-full px-2 py-1 transition hover:bg-white/50 hover:text-black dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
