import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = "https://boothhub.lovable.app/showcase/next-sf?chromeless=1";

export const SF_PARTNER_KIOSK_SLUGS = [
  "globallink",
  "veeva",
  "coa-live-life-sci",
  "med-writing-life-sci",
  "connect-contact-center-life-sci",
  "r-d-comm-tp",
  "gl-live-confrence",
  "livecustomerconnectuni",
  "global-content-delivery",
  "media",
  "learning",
  "legal-support",
  "stearling",
] as const;

export function SfPartnerKioskShowcase() {
  const [kiosk, setKiosk] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);
  const src = kiosk ? `${BASE}&kiosk=${encodeURIComponent(kiosk)}` : BASE;

  return (
    <section id="sf-partner-showcase" className="mt-12 scroll-mt-24" aria-labelledby="sf-partner-showcase-h">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#03002C]/10 pb-3">
        <h2 id="sf-partner-showcase-h" className="text-lg font-semibold text-[#03002C]">
          NEXT SF partner kiosks
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="sf-partner-kiosk" className="text-[13px] text-[#03002C]/70">
            Open on
          </label>
          <select
            id="sf-partner-kiosk"
            value={kiosk}
            onChange={(e) => setKiosk(e.target.value)}
            className="h-9 rounded-md border border-[#03002C]/20 bg-background px-2 text-sm"
          >
            <option value="">All partners</option>
            {SF_PARTNER_KIOSK_SLUGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
    </section>
  );
}
