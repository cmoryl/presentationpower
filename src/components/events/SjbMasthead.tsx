// Shared San Juan Bowl micro-site masthead: one dark game-night band (stadium
// plate, grit, Light-social lettering) plus the Bowl section nav, so every Bowl
// page reads as one site inside Element. Facts only from SJB_EVENT.
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/700-italic.css";
import { SJB_EVENT, SJB_COLORS, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_STADIUM_RENDERS } from "@/lib/sjb-stadium-renders";
import { SjbSectionIcon } from "./SjbSectionIcon";
import { SjbHeroLettering } from "./SjbHeroLettering";
import { readSjbHeroColours, SJB_HERO_COLOUR_KEY, SJB_HERO_DEFAULT_COLOURS } from "@/lib/sjb-hero-colours";

export const SJB_BOWL_FONT = '"Barlow Condensed", sans-serif';
export const SJB_GRIT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1.6 -.55'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const hex = (id: string) => SJB_COLORS.find((c) => c.id === id)?.hex ?? "#000";
const PLATE = SJB_STADIUM_RENDERS.find((r) => r.ratio === "2:1") ?? SJB_STADIUM_RENDERS[0];

/** In-app Bowl sections, in site order. */
export const SJB_SITE_NAV: { to: string; label: string; seg: string }[] = [
  { to: "/events/san-juan-bowl", label: "Overview", seg: "" },
  { to: "/events/san-juan-bowl/brand-kit", label: "Brand kit", seg: "brand-kit" },
  { to: "/events/san-juan-bowl/social", label: "Social", seg: "social" },
  { to: "/events/san-juan-bowl/social-calendar", label: "Calendar", seg: "social-calendar" },
  { to: "/events/san-juan-bowl/billboards", label: "Billboards", seg: "billboards" },
  { to: "/events/san-juan-bowl/badges", label: "Badges", seg: "badges" },
  { to: "/events/san-juan-bowl/tshirts", label: "T-shirts", seg: "tshirts" },
  { to: "/events/san-juan-bowl/stadium", label: "Stadium", seg: "stadium" },
  { to: "/events/san-juan-bowl/stadium-policies", label: "Policies", seg: "stadium-policies" },
];

const SECTION: Record<string, string> = {
  "brand-kit": "Brand kit", designers: "Designer files", guide: "Brand guide", lettering: "Lettering spec",
  "single-colour": "Single-colour logos", billboards: "Digital billboards",
  social: "Social posts", "social-calendar": "Social calendar", "stadium-policies": "Stadium policies",
  stadium: "Stadium", badges: "Attendee badges", tshirts: "T-shirts",
};

function useBowlPath() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const share = pathname.startsWith("/share/");
  const parts = pathname.replace(/^\/(events|share)\/san-juan-bowl\/?/, "").split("/").filter(Boolean);
  return { share, parts };
}

/** Section tabs across the Bowl site (app only; share links keep their own tabs).
 *  The row lifts to the top of the screen once its own place scrolls away, so
 *  visitors can jump between Bowl sections without hunting back up the page.
 *  It pins under the Element header where one is rendered, and to the very top
 *  on the shell-less Bowl pages (badges, T-shirts, calendar, policies). */
export function SjbSiteNav({ className = "" }: { className?: string }) {
  const { share, parts } = useBowlPath();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const stuckRef = useRef(false);
  const [line, setLine] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [flowH, setFlowH] = useState(0);

  // Sticky line = the Element header's height, or 0 when the page has none.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-app-shell] > header");
    const measure = () => setLine(header ? Math.round(header.getBoundingClientRect().height) : 0);
    measure();
    if (!header) return;
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, [pathname]);

  // Stick once the row's own slot has scrolled up past the line. A scroll
  // listener (not IntersectionObserver) so it also re-checks after route
  // changes and HMR, where an observer can miss the transition.
  useEffect(() => {
    const update = () => {
      const sentinel = sentinelRef.current;
      if (!sentinel) return;
      const next = sentinel.getBoundingClientRect().top < line;
      stuckRef.current = next;
      setStuck((prev) => (prev === next ? prev : next));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [line]);

  // Height of the row while it still sits in the page: that is the space the
  // placeholder holds open, so lifting the row out never shifts the content below.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const set = () => { if (!stuckRef.current) setFlowH(nav.getBoundingClientRect().height); };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  if (share) return null;
  const top = parts[0] ?? "";
  const navy = hex("navy"), gold = hex("gold");
  const style: CSSProperties = {
    fontFamily: SJB_BOWL_FONT,
    background: stuck ? navy : `${navy}e6`,
    ...(stuck
      ? { position: "fixed", top: line, left: 0, right: 0, zIndex: 20, boxShadow: "0 14px 30px rgb(0 0 0 / .5)" }
      : null),
  };
  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      {stuck && <div aria-hidden style={{ height: flowH }} />}
      <nav ref={navRef} aria-label="San Juan Bowl sections"
        className={`sjb-site-nav relative overflow-x-auto border-t border-white/15 ${stuck ? "sjb-site-nav--stuck" : ""} ${className}`}
        style={style}>
        <ul className="mx-auto flex w-max min-w-full justify-center gap-1 px-4 sm:px-8">
          {SJB_SITE_NAV.map((n) => {
            const active = n.seg === top;
            return (
              <li key={n.to}>
                <Link to={n.to as string} aria-current={active ? "page" : undefined}
                  className="sjb-site-nav-link flex min-w-20 flex-col items-center gap-2 border-b-[3px] px-3 py-4 text-[15px] font-bold italic uppercase tracking-normal text-white/75 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                  style={{ borderColor: active ? gold : "transparent", color: active ? gold : undefined }}>
                  <SjbSectionIcon section={n.seg} className="size-6 shrink-0" />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function SjbMasthead() {
  const { parts } = useBowlPath();
  const [colours, setColours] = useState(SJB_HERO_DEFAULT_COLOURS);
  useEffect(() => {
    const refresh = () => {
      try { setColours(readSjbHeroColours(localStorage.getItem(SJB_HERO_COLOUR_KEY))); } catch { /* Storage may be disabled. */ }
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const seg = parts[parts.length - 1] ?? "brand-kit";
  const title = SECTION[seg] ?? "Brand kit";
  const navy = hex("navy"), gold = hex("gold"), sky = hex("sky");
  const logo = SJB_LOGOS.find((l) => l.id === "dark");
  return (
    <header data-sjb-masthead className="sjb-site-band relative overflow-hidden text-white" style={{ background: navy, fontFamily: SJB_BOWL_FONT }}>
      {PLATE && <img src={PLATE.src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[center_60%] opacity-80" />}
      <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${navy} 20%, ${navy}cc 50%, transparent 95%)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay" style={{ backgroundImage: SJB_GRIT }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 120px 20px rgb(0 0 0 / 0.5)" }} />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-10 sm:px-8 sm:py-14">
        <div className="min-w-0 flex-1">
          <SjbHeroLettering face={colours.face} shadow={colours.shadow}
            role="img" aria-label={SJB_EVENT.shortName} className="block h-auto w-full max-w-[440px]" />
          <p className="mt-4 text-5xl font-bold italic uppercase leading-[0.95] sm:text-7xl">
            {title}
          </p>
          <p className="mt-2 text-base font-medium uppercase tracking-wide text-white/85">
            {SJB_EVENT.datesLabel} · {SJB_EVENT.venue} · {SJB_EVENT.city}
          </p>
        </div>
        {logo && <img src={logo.svg} alt="San Juan Bowl logo" className="h-20 w-20 shrink-0 object-contain sm:h-40 sm:w-40" />}
      </div>
      <SjbSiteNav />
    </header>
  );
}
