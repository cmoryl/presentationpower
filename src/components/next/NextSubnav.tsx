import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Building2, CalendarDays, Compass, FileText, Flag, Images, Layers, LayoutGrid, Map, MapPin, Route, Signpost, Stamp, X } from "lucide-react";
import { Button } from "@/design-system/element";
import {
  NEXT_WORKSPACE_GROUPS, NEXT_WORKSPACE_PAGES, isNextWorkspacePath,
  nextWorkspaceMenu, nextWorkspaceMenuPath, nextWorkspacePageFor,
  nextWorkspaceLocations, isNextLocationPage,
  type NextWorkspacePath,
} from "@/lib/next-workspace";

const GROUP_ICONS = { plan: Compass, programme: CalendarDays, signage: Signpost, london: MapPin, "san-francisco": MapPin, reference: BookOpen };
const GROUP_LABELS = { plan: "Plan the event", programme: "Programme", signage: "Signage & badges", london: "London", "san-francisco": "San Francisco", reference: "Reference" };
const CITY_STEPS: Array<{ label: string; to: NextWorkspacePath; hash?: string }> = [
  { label: "Venue record", to: "/events/next/locations" },
  { label: "Floor plans", to: "/events/next/venue" },
  { label: "Sign schedule", to: "/events/next/city" },
  { label: "City templates", to: "/events/next/city", hash: "city-templates" },
];

function locationPageIcon(path: string) {
  if (path.endsWith("/maps")) return Map;
  if (path.endsWith("/photos")) return Images;
  if (path.endsWith("/template")) return Layers;
  if (path.endsWith("/revise")) return Stamp;
  if (path.endsWith("/booklet")) return BookOpen;
  if (path.endsWith("/california")) return Signpost;
  return Building2;
}

/** Registry-driven global sections and local siblings, visible before scrolling. */
export function NextSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const current = nextWorkspacePageFor(pathname);
  const groupId = current?.group ?? "plan";
  const locationPage = isNextLocationPage(current);
  const locations = nextWorkspaceLocations();
  const city = locations.find((l) => l.pages.some((p) => p.to === current?.to));
  const home = pathname === "/events/next";
  const menuPath = nextWorkspaceMenuPath(current);
  const folded = NEXT_WORKSPACE_PAGES.filter((p) => p.to === menuPath || p.navAs === menuPath);
  const sentinel = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [top, setTop] = useState(0);
  const [height, setHeight] = useState(0);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-shell] > header");
    const update = () => {
      const line = header?.getBoundingClientRect().height ?? 0;
      setTop(line);
      setStuck((sentinel.current?.getBoundingClientRect().top ?? line) < line);
      setHeight(nav.current?.getBoundingClientRect().height ?? 0);
    };
    const ro = new ResizeObserver(update);
    if (header) ro.observe(header);
    if (nav.current) ro.observe(nav.current);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { ro.disconnect(); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [pathname]);
  if (!isNextWorkspacePath(pathname)) return null;
  const showSteps = menuPath === "/events/next/city";
  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      {stuck && <div aria-hidden style={{ height }} />}
      <div ref={nav} data-next-site-nav className={`next-site-nav z-20 ${stuck ? "next-site-nav--stuck fixed inset-x-0" : "relative"}`} style={stuck ? { top } : undefined}>
        <nav aria-label="NEXT sections" className="next-site-nav-row overflow-x-auto">
          <div className="mx-auto flex w-max min-w-full justify-center px-3 sm:px-6">
            <Link to="/events/next" data-active={home} aria-current={home ? "page" : undefined} className="next-site-link flex min-w-20 flex-col items-center gap-2 px-4 py-4 text-xs font-semibold"><Flag className="size-5" />Main event</Link>
            <Link to="/events/next/locations" data-active={locationPage} aria-current={locationPage ? "page" : undefined} className="next-site-link flex min-w-24 flex-col items-center gap-2 px-4 py-4 text-xs font-semibold"><MapPin className="size-5" />Locations</Link>
            <Button variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="next-all-pages" className="my-auto ml-2 h-12 text-inherit hover:bg-white/10 hover:text-inherit">{open ? <X /> : <LayoutGrid />}Resources</Button>
          </div>
        </nav>
        {!home && !city && !locationPage && <nav aria-label="NEXT section pages" className="next-site-secondary border-b border-border">
          <div className="mx-auto flex max-w-[1400px] gap-5 overflow-x-auto px-6 sm:px-8">
            {nextWorkspaceMenu(groupId).filter((p) => p.to !== "/events/next").map((p) => <Link key={p.to} to={p.to} data-active={menuPath === p.to} aria-current={menuPath === p.to ? "page" : undefined} className="shrink-0 border-b-2 border-transparent py-3 text-xs font-medium">{p.label}</Link>)}
          </div>
        </nav>}
        {city && <nav aria-label={`${GROUP_LABELS[city.group.id]} location pages`} className="next-location-tools border-b border-border">
          <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-6 sm:px-8">
            {city.pages.map((p) => {
              const Icon = locationPageIcon(p.to);
              return <Link key={p.to} to={p.to} data-active={current?.to === p.to} aria-current={current?.to === p.to ? "page" : undefined} className="next-location-tool"><Icon aria-hidden />{p.label}</Link>;
            })}
          </div>
        </nav>}
        {open && <div id="next-all-pages" className="next-site-secondary max-h-[60vh] overflow-y-auto border-b border-border shadow-lg">
          <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
            {NEXT_WORKSPACE_GROUPS.filter((g) => g.id !== "london" && g.id !== "san-francisco").map((g) => <section key={g.id}>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">{GROUP_LABELS[g.id]}</h2>
              <ul className="mt-2 space-y-1">{nextWorkspaceMenu(g.id).map((p) => <li key={p.to}><Link to={p.to} onClick={() => setOpen(false)} className="block py-2 text-sm hover:underline">{p.label}</Link></li>)}</ul>
            </section>)}
            <section>
              <h2 className="border-b border-border pb-2 text-sm font-semibold">Locations</h2>
              <Link to="/events/next/locations" onClick={() => setOpen(false)} className="block py-2 text-sm hover:underline">Venue directory</Link>
              {locations.map((l) => <div key={l.group.id} className="mt-3">
                <h3 className="text-xs font-semibold">{GROUP_LABELS[l.group.id]}</h3>
                <ul className="mt-1 space-y-1">{l.pages.map((p) => <li key={p.to}><Link to={p.to} onClick={() => setOpen(false)} className="block py-1.5 text-sm hover:underline">{p.label}</Link></li>)}</ul>
              </div>)}
            </section>
          </div>
        </div>}
      </div>
      {(showSteps || (!locationPage && folded.length > 1)) && <nav aria-label={showSteps ? "Plan a new city — steps" : "NEXT subsection pages"} className="next-location-tools border-b border-border">
        <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-6 sm:px-8">
          {showSteps ? CITY_STEPS.map((s, i) => {
            const Icon = [Building2, Map, FileText, Layers][i] ?? Route;
            return <Link key={s.label} to={s.to} hash={s.hash} className="next-location-tool"><Icon aria-hidden /><span className="text-muted-foreground">{i + 1}.</span>{s.label}</Link>;
          })
            : folded.map((p) => <Link key={p.to} to={p.to} aria-current={current?.to === p.to ? "page" : undefined} className="shrink-0 text-xs hover:underline">{p.label}</Link>)}
        </div>
      </nav>}
    </>
  );
}