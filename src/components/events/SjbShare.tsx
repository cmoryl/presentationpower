// Shared-view plumbing for the San Juan Bowl brand guides.
// The same page bodies render inside the app (AppShell) and on the public
// share link (/share/san-juan-bowl/*), where the only navigation is between
// the guide pages themselves — no menu, no links into the rest of Element.
import { createContext, forwardRef, useContext, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Check, Link2 } from "lucide-react";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";
import logoColor from "@/assets/san-juan-bowl/sjb-logo-color.svg.asset.json";

const SjbShareCtx = createContext(false);
export const useSjbShare = () => useContext(SjbShareCtx);

export type SjbPage = "event" | "kit" | "designers" | "single" | "lettering" | "stadium";

const APP_PATHS = {
  kit: "/events/san-juan-bowl/brand-kit",
  designers: "/events/san-juan-bowl/brand-kit/designers",
  single: "/events/san-juan-bowl/brand-kit/single-colour",
  lettering: "/events/san-juan-bowl/brand-kit/lettering",
  stadium: "/events/san-juan-bowl/stadium",
} as const;
const SHARE_PATHS = {
  kit: "/share/san-juan-bowl",
  designers: "/share/san-juan-bowl/designers",
  single: "/share/san-juan-bowl/single-colour",
  lettering: "/share/san-juan-bowl/lettering",
  stadium: "/share/san-juan-bowl/stadium",
} as const;

/** Link between Bowl guide pages; in the share view it stays inside the share link
 *  and links to the app's event home are dropped. */
export const SjbLink = forwardRef<HTMLAnchorElement, { page: SjbPage } & AnchorHTMLAttributes<HTMLAnchorElement>>(
  function SjbLink({ page, children, ...rest }, ref) {
    const share = useSjbShare();
    if (page === "event") {
      if (share) return null;
      return <Link ref={ref} {...rest} to="/events/$eventId" params={{ eventId: "san-juan-bowl" }}>{children}</Link>;
    }
    return <Link ref={ref} {...rest} to={(share ? SHARE_PATHS : APP_PATHS)[page]}>{children}</Link>;
  },
);

/** Public address of the share link (works signed out). */
export const SJB_SHARE_PATH = SHARE_PATHS.kit;

const TABS: { page: Exclude<SjbPage, "event">; label: string }[] = [
  { page: "kit", label: "Brand kit" },
  { page: "designers", label: "For designers" },
  { page: "single", label: "Single colour" },
  { page: "lettering", label: "Lettering spec" },
  { page: "stadium", label: "Stadium 3D" },
];

function ShareShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-white text-[#03002C]">
      <header className="sticky top-0 z-20 border-b border-[#03002C]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={logoColor.url} alt="" className="h-9 w-9" />
            <span className="text-[15px] font-bold">TransPerfect San Juan Bowl</span>
          </div>
          <nav aria-label="Brand guide" className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <Link
                key={t.page}
                to={SHARE_PATHS[t.page]}
                activeOptions={{ exact: true }}
                className="rounded-md px-3 py-1.5 text-[13px] font-semibold text-[#03002C]/70 hover:bg-[#F2F2F2] hover:text-[#03002C]"
                activeProps={{ className: "bg-[#F2F2F2] !text-[#03002C]" }}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

/** AppShell inside Element; the menu-free share frame on the share link. */
export function SjbShell({ children }: { children: ReactNode }) {
  return useSjbShare() ? <ShareShell>{children}</ShareShell> : <AppShell>{children}</AppShell>;
}

export function SjbShareProvider({ children }: { children: ReactNode }) {
  return <SjbShareCtx.Provider value>{children}</SjbShareCtx.Provider>;
}

/** In-app only: copies the public share link (guides + 3D, no Element menu). */
export function SjbShareLinkButton() {
  const share = useSjbShare();
  const [copied, setCopied] = useState(false);
  if (share) return null;
  const url = `${NEXT_APP_ORIGIN}${SJB_SHARE_PATH}`;
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
        catch { window.prompt("Copy this share link", url); }
      }}
      className="mt-3 ml-2 inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/25 px-4 py-2 text-[13px] font-semibold hover:bg-[#F2F2F2]"
      title={url}
    >
      {copied ? <Check className="h-4 w-4 text-[#003FC7]" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Share link copied" : "Copy share link"}
    </button>
  );
}
