// Shared San Juan Bowl micro-site masthead: one dark game-night band (stadium
// plate, grit, Light-social lettering) plus the Bowl section nav, so every Bowl
// page reads as one site inside Element. Facts only from SJB_EVENT.
import { Link, useRouterState } from "@tanstack/react-router";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/700-italic.css";
import { SJB_EVENT, SJB_COLORS, SJB_LOGOS } from "@/lib/san-juan-bowl";
import { SJB_STADIUM_RENDERS } from "@/lib/sjb-stadium-renders";

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

/** Section tabs across the Bowl site (app only; share links keep their own tabs). */
export function SjbSiteNav({ className = "" }: { className?: string }) {
  const { share, parts } = useBowlPath();
  if (share) return null;
  const top = parts[0] ?? "";
  const navy = hex("navy"), gold = hex("gold");
  return (
    <nav aria-label="San Juan Bowl sections" className={`relative overflow-x-auto border-t border-white/15 ${className}`} style={{ background: `${navy}e6`, fontFamily: SJB_BOWL_FONT }}>
      <ul className="flex w-max gap-1 px-4 sm:px-8">
        {SJB_SITE_NAV.map((n) => {
          const active = n.seg === top;
          return (
            <li key={n.to}>
              <Link to={n.to as string} aria-current={active ? "page" : undefined}
                className="block border-b-[3px] px-3 py-2.5 text-[15px] font-bold italic uppercase tracking-wide text-white/75 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                style={{ borderColor: active ? gold : "transparent", color: active ? gold : undefined }}>
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SjbMasthead() {
  const { parts } = useBowlPath();
  const seg = parts[parts.length - 1] ?? "brand-kit";
  const title = SECTION[seg] ?? "Brand kit";
  const navy = hex("navy"), gold = hex("gold"), sky = hex("sky");
  const logo = SJB_LOGOS.find((l) => l.id === "dark");
  return (
    <header data-sjb-masthead className="relative mx-auto mt-4 max-w-6xl overflow-hidden rounded-xl text-white" style={{ background: navy, fontFamily: SJB_BOWL_FONT }}>
      {PLATE && <img src={PLATE.src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-60" />}
      <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${navy} 20%, ${navy}cc 50%, transparent 95%)` }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-overlay" style={{ backgroundImage: SJB_GRIT }} />
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 120px 20px rgb(0 0 0 / 0.5)" }} />
      <div className="relative flex items-center justify-between gap-6 px-6 py-6 sm:px-8 sm:py-7">
        <div className="min-w-0">
          <p className="text-sm font-bold italic uppercase tracking-wide" style={{ color: gold }}>{SJB_EVENT.name}</p>
          <p className="mt-1 text-5xl font-bold italic uppercase leading-[0.9] sm:text-6xl"
            style={{ backgroundImage: `linear-gradient(100deg, #ffffff 30%, ${sky} 70%, ${gold})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            {title}
          </p>
          <p className="mt-2 text-base font-medium uppercase tracking-wide text-white/85">
            {SJB_EVENT.datesLabel} · {SJB_EVENT.venue} · {SJB_EVENT.city}
          </p>
        </div>
        {logo && <img src={logo.svg} alt="San Juan Bowl logo" className="hidden h-24 w-auto shrink-0 sm:block sm:h-28" />}
      </div>
      <SjbSiteNav />
    </header>
  );
}
