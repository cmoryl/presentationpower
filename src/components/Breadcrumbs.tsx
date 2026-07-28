import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { EVENT_PLAYBOOKS } from "@/lib/event-playbooks";
import { SOCIAL_PLAYBOOKS } from "@/lib/social-playbooks";


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
// `/social/demo` are namespaces with no route file, so linking them lands the
// user on the not-found page — those crumbs render as plain text instead.
function isRoutablePath(routePatterns: string[], path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  return routePatterns.some((pattern) => {
    const pat = pattern.split("/").filter(Boolean).filter((p) => !p.startsWith("_"));
    if (pat.length !== parts.length) return false;
    return pat.every((p, i) => p.startsWith("$") || p === parts[i]);
  });
}

export function Breadcrumbs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const decks = useDeckStore((s) => s.decks);

  const routePatterns = useMemo(
    () => Object.keys(router.routesByPath ?? {}),
    [router],
  );


  const crumbs = useMemo(() => {
    // Root has no breadcrumbs — home page speaks for itself.
    if (pathname === "/" || pathname === "")
      return [] as Array<{ label: string; to: string; last: boolean }>;

    const parts = pathname
      .split("/")
      .filter(Boolean)
      .filter((p) => !HIDDEN_SEGMENTS.has(p));
    const items: Array<{ label: string; to: string; last: boolean }> = [];
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
      } else if (prev === "demo" && parts[i - 2] === "events") {
        const p = EVENT_PLAYBOOKS.find((x) => x.id === seg);
        label = p?.name ?? shortenId(seg);
      } else if (prev === "demo" && parts[i - 2] === "social") {
        const p = SOCIAL_PLAYBOOKS.find((x) => x.id === seg);
        label = p?.name ?? shortenId(seg);
      } else if (STATIC_LABELS[seg]) {
        label = STATIC_LABELS[seg];
      } else if (/^[0-9a-f-]{20,}$/i.test(seg) || /^[a-z]+-[a-z0-9-]{10,}/i.test(seg)) {
        // Looks like an opaque ID slug.
        label = shortenId(seg);
      } else {
        label = titleCase(seg);
      }

      items.push({
        label,
        to: acc,
        last: i === parts.length - 1,
        routable: isRoutablePath(routePatterns, acc),
      });
    }
    return items;
  }, [pathname, decks, routePatterns]);


  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-5 flex items-center gap-1.5 overflow-x-auto text-[12px] font-medium text-black/55 dark:text-white/55"
    >
      <Link
        to="/"
        className="rounded-full px-2 py-1 transition hover:bg-white/50 hover:text-black dark:hover:bg-white/[0.06] dark:hover:text-white"
      >
        Home
      </Link>
      {crumbs.map((c) => (
        <span key={c.to} className="flex items-center gap-1.5">
          <span aria-hidden className="text-black/25 dark:text-white/25">
            /
          </span>
          {c.last ? (
            <span
              aria-current="page"
              className="rounded-full bg-white/60 px-2 py-1 text-[#03002C] ring-1 ring-black/[0.04] dark:bg-white/[0.06] dark:text-white dark:ring-white/10"
            >
              {c.label}
            </span>
          ) : (
            // TanStack Router requires typed path params for statically-typed
            // routes. Since breadcrumbs walk arbitrary URLs, cast the string
            // through the loose overload — this is safe because every entry
            // comes from the current matched location.
            <Link
              to={c.to as string}
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
