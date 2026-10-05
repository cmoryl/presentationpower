import { useRef, useState } from "react";
import { Box, ExternalLink, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORIGIN = "https://boothhub.lovable.app/showcase/next-sf";
const BASE = `${ORIGIN}?chromeless=1`;

/** BoothHub's single-partner 3D view: `?kiosk=<slug>&single=1`. */
export function sfKiosk3dUrl(slug: string, embed = false): string {
  return `${ORIGIN}?${embed ? "chromeless=1&" : ""}kiosk=${encodeURIComponent(slug)}&single=1`;
}

// Slugs and names as BoothHub publishes them (src/data/nextSfKiosks.ts there).
export const SF_PARTNER_KIOSKS = [
  { slug: "globallink", name: "GlobalLink Digital Experience" },
  { slug: "veeva", name: "Veeva Vault Certified Translations" },
  { slug: "coa-live-life-sci", name: "COA — Where Science Meets Digital Health" },
  { slug: "med-writing-life-sci", name: "Medical Writing" },
  { slug: "connect-contact-center-life-sci", name: "Connect Contact Center" },
  { slug: "r-d-comm-tp", name: "R&D Communications" },
  { slug: "gl-live-confrence", name: "GlobalLink Live Conference" },
  { slug: "livecustomerconnectuni", name: "Live Customer Connect" },
  { slug: "global-content-delivery", name: "Global Content Delivery" },
  { slug: "media", name: "Media Subtitling, Dubbing & Distribution" },
  { slug: "learning", name: "Learning Solutions" },
  { slug: "legal-support", name: "Legal Support" },
  { slug: "stearling", name: "Sterling Share — Dealmaking & File Sharing" },
] as const;

export const SF_PARTNER_KIOSK_SLUGS = SF_PARTNER_KIOSKS.map((k) => k.slug);

export function SfPartnerKioskShowcase() {
  const [kiosk, setKiosk] = useState("");
  const [single, setSingle] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const src = kiosk
    ? single
      ? sfKiosk3dUrl(kiosk, true)
      : `${BASE}&kiosk=${encodeURIComponent(kiosk)}`
    : BASE;

  const view3d = (slug: string) => {
    setKiosk(slug);
    setSingle(true);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      ref={sectionRef}
      id="sf-partner-showcase"
      className="mt-12 scroll-mt-24"
      aria-labelledby="sf-partner-showcase-h"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#03002C]/10 pb-3">
        <h2 id="sf-partner-showcase-h" className="text-lg font-semibold text-[#03002C]">
          NEXT SF partner kiosks
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sf-partner-kiosk" className="text-[13px] text-[#03002C]/70">
            Open on
          </label>
          <select
            id="sf-partner-kiosk"
            value={kiosk}
            onChange={(e) => {
              setKiosk(e.target.value);
              if (!e.target.value) setSingle(false);
            }}
            className="h-9 rounded-md border border-[#03002C]/20 bg-background px-2 text-sm"
          >
            <option value="">All partners</option>
            {SF_PARTNER_KIOSKS.map((k) => (
              <option key={k.slug} value={k.slug}>
                {k.name}
              </option>
            ))}
          </select>
          {kiosk ? (
            <Button variant="outline" size="sm" onClick={() => setSingle((s) => !s)} aria-pressed={single}>
              <Box className="mr-1.5 h-4 w-4" aria-hidden />
              {single ? "Show in showroom" : "This booth only"}
            </Button>
          ) : null}
          {kiosk ? (
            <Button variant="outline" size="sm" asChild>
              <a href={sfKiosk3dUrl(kiosk)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                Open 3D in new tab
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => frameRef.current?.requestFullscreen?.()}
          >
            <Maximize2 className="mr-1.5 h-4 w-4" aria-hidden />
            Fullscreen
          </Button>
        </div>
      </div>
      <iframe
        ref={frameRef}
        key={src}
        src={src}
        title="NEXT SF partner kiosks"
        allow="fullscreen"
        allowFullScreen
        className="mt-5 block h-[70vh] w-full rounded-md border border-[#03002C]/10 bg-white"
      />

      <h3 className="mt-6 text-sm font-semibold text-[#03002C]">View each partner booth in 3D</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SF_PARTNER_KIOSKS.map((k) => (
          <li
            key={k.slug}
            className="flex items-center justify-between gap-2 rounded-md border border-[#03002C]/10 bg-white px-3 py-2"
          >
            <span className="min-w-0 truncate text-[13px] text-[#03002C]">{k.name}</span>
            <span className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => view3d(k.slug)}>
                <Box className="mr-1 h-4 w-4" aria-hidden />
                View in 3D
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={sfKiosk3dUrl(k.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${k.name} 3D view in a new tab`}
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
