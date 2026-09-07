// Hyper-real in-situ visualisation of a partner booth.
//
// The two supplied trade-booth shells (screen wall / full graphic wall) each
// carry a photoreal render of that build standing in a room of this type. The
// booth's own supplied artwork is laid onto the wall face inside the render, so
// a vendor sees their finished stand rather than a flat proof — and the screen
// wall draws the monitor over the artwork at the measured aperture, which is
// exactly the area that must stay clear of copy.
//
// This is a visualisation, never a survey photograph and never a dimensional
// reference: the trim and bleed geometry on the panel card is the authority.

import { useState } from "react";

import {
  LONDON_BOOTH_SHELLS,
  boothShell,
  type LondonBoothShell,
} from "@/lib/next-london-booth-shells";
import type { LondonPanel } from "@/lib/next-london-signage";
import { londonBoothArtworkUrl, londonBoothShell } from "@/lib/next-london-signage";

export type BoothRenderPreviewProps = {
  panel: LondonPanel;
};

const DISCLAIMER =
  "Visualisation only — the artwork shown in a room of this type, not a survey photograph. Build and print to the trim and bleed above.";

export function BoothRenderPreview({ panel }: BoothRenderPreviewProps) {
  const panelShell = londonBoothShell(panel.id);
  const [shellId, setShellId] = useState<string>(
    panelShell?.id ?? LONDON_BOOTH_SHELLS[0]!.id,
  );
  const shell: LondonBoothShell = boothShell(shellId);
  const art = londonBoothArtworkUrl(panel.id);
  const face = shell.renderFace;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
            Hyper-real render
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[#03002C]">{shell.label}</p>
        </div>
        <div
          className="inline-flex rounded-full border border-black/10 bg-[#F2F2F2] p-0.5"
          role="group"
          aria-label="Booth wall type"
        >
          {LONDON_BOOTH_SHELLS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setShellId(option.id)}
              aria-pressed={option.id === shell.id}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                option.id === shell.id
                  ? "bg-[#03002C] text-white"
                  : "text-[#03002C]/70 hover:text-[#03002C]"
              }`}
            >
              {option.hasScreen ? "With TV" : "No TV"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-3 overflow-hidden rounded-lg border border-black/10 bg-[#E0E8F5]">
        <img
          src={shell.renderUrl}
          alt={`${panel.name} booth visualised on the ${shell.label} in a conference centre`}
          className="block h-auto w-full"
          width={1536}
          height={1024}
          loading="lazy"
        />
        {art ? (
          <div
            className="pointer-events-none absolute overflow-hidden"
            style={{
              left: `${face.x * 100}%`,
              top: `${face.y * 100}%`,
              width: `${face.w * 100}%`,
              height: `${face.h * 100}%`,
            }}
          >
            <img
              src={art}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
              style={{ opacity: 0.96 }}
              loading="lazy"
            />
            {/* Room light falling across the printed face. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 42%, rgba(3,0,44,0.18) 100%)",
              }}
            />
            {shell.screen ? (
              <div
                className="absolute rounded-[2px] bg-[#0A0A0C]"
                style={{
                  left: `${shell.screen.x * 100}%`,
                  top: `${shell.screen.y * 100}%`,
                  width: `${shell.screen.w * 100}%`,
                  height: `${shell.screen.h * 100}%`,
                  boxShadow: "0 10px 24px rgba(3,0,44,0.45)",
                }}
              >
                <div
                  className="absolute inset-[1.5%]"
                  style={{
                    background:
                      "linear-gradient(135deg, #03002C 0%, #003FC7 65%, #0A5BF0 100%)",
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[#03002C]/70">{shell.note}</p>
      <p className="mt-1 font-mono text-[11px] text-[#03002C]/50">{DISCLAIMER}</p>
    </section>
  );
}
