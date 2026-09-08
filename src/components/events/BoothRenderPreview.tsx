// Hyper-real in-situ visualisation of a partner booth.
//
// Geometry contract — this is the part that has to be exact:
//   • `shell.renderFace` is the printed TRIM face of the wall, measured off a
//     blank-face plate of that build, in fractions of the render plate.
//   • The vendor proof is the full BLEED page (trim + the panel's live bleed), so it
//     is scaled up by (trim + 2×bleed)/trim and offset by -bleed/trim, which
//     lands the trim box of the artwork exactly on the trim face of the wall.
//   • The measured monitor aperture is the outside dimension of the installed
//     display. The physical bezel and screen are rendered inside that box.
//
// A visualisation, never a survey photograph and never a dimensional reference:
// the trim and bleed geometry on the panel card remains the authority.

import { useState } from "react";

import nextTvContent from "@/assets/london-booths/renders/next-tv-content.jpg";
import {
  LONDON_BOOTH_SHELLS,
  boothShell,
  boothScreenDiagonalIn,
  type LondonBoothShell,
} from "@/lib/next-london-booth-shells";
import type { LondonPanel } from "@/lib/next-london-signage";
import { londonBoothArtworkUrl, londonBoothShell } from "@/lib/next-london-signage";

export type BoothRenderPreviewProps = {
  panel: LondonPanel;
};

const DISCLAIMER =
  "Visualisation only — the artwork shown in a room of this type, not a survey photograph. Build and print to the trim and bleed above.";

function PhysicalDisplay({ shell }: { shell: LondonBoothShell }) {
  const screen = shell.screen;
  if (!screen) return null;

  return (
    <div
      className="absolute z-10 bg-black p-[0.7%] shadow-2xl ring-1 ring-white/25"
      style={{
        left: `${screen.x * 100}%`,
        top: `${screen.y * 100}%`,
        width: `${screen.w * 100}%`,
        height: `${screen.h * 100}%`,
      }}
      aria-label={`${boothScreenDiagonalIn(shell)}-inch wall-mounted display`}
    >
      <div className="relative h-full w-full overflow-hidden bg-black">
        <img
          src={nextTvContent}
          alt="NEXT event presentation playing on the booth display"
          className="h-full w-full object-cover"
          width={1024}
          height={576}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/20" />
        <div className="absolute bottom-[2%] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white/50" />
      </div>
      <div className="absolute left-[8%] right-[8%] top-full h-[3%] bg-black/40 blur-[2px]" />
    </div>
  );
}

/** Bleed-page geometry expressed against this panel's live trim box. */
function bleedFrame(panel: Pick<LondonPanel, "trimW" | "trimH" | "bleedEdge">) {
  const px = panel.bleedEdge / panel.trimW;
  const py = panel.bleedEdge / panel.trimH;
  return {
    left: `${-px * 100}%`,
    top: `${-py * 100}%`,
    width: `${(1 + px * 2) * 100}%`,
    height: `${(1 + py * 2) * 100}%`,
  };
}

export function BoothRenderPreview({ panel }: BoothRenderPreviewProps) {
  const panelShell = londonBoothShell(panel.id);
  const [shellId, setShellId] = useState<string>(
    panelShell?.id ?? LONDON_BOOTH_SHELLS[0]!.id,
  );
  const [guides, setGuides] = useState(false);
  const shell: LondonBoothShell = boothShell(shellId);
  const art = londonBoothArtworkUrl(panel.id);
  const face = shell.renderFace;
  const page = bleedFrame(panel);

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
            Hyper-real render
          </p>
          <p className="mt-1 text-[13px] font-semibold text-[#03002C]">{shell.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={() => setGuides((v) => !v)}
            aria-pressed={guides}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              guides
                ? "border-[#03002C] bg-[#03002C] text-white"
                : "border-black/15 text-[#03002C]/70 hover:text-[#03002C]"
            }`}
          >
            Print guides
          </button>
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
        {/* The printed trim face. Everything below is measured against it. */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: `${face.x * 100}%`,
            top: `${face.y * 100}%`,
            width: `${face.w * 100}%`,
            height: `${face.h * 100}%`,
          }}
        >
          {art ? (
            <div className="absolute inset-0 overflow-hidden">
              {/* Bleed page, positioned so its trim box lands on the face. */}
              <img
                src={art}
                alt=""
                aria-hidden="true"
                className="absolute block max-w-none"
                style={{ ...page, maxWidth: "none", opacity: 0.96 }}
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
            </div>
          ) : null}

          <PhysicalDisplay shell={shell} />

          {guides ? (
            <div className="absolute inset-0" data-export-ignore="true">
              {/* Bleed edge, outside trim. */}
              <div
                className="absolute border border-dashed border-[#EC388A]/80"
                style={page}
              />
              {/* Trim edge. */}
              <div className="absolute inset-0 border border-[#FFEB66]" />
              {/* Safe area, 60 mm inside trim. */}
              <div
                className="absolute border border-dotted border-[#A6FA87]"
                style={{
                  left: `${(60 / panel.trimW) * 100}%`,
                  top: `${(60 / panel.trimH) * 100}%`,
                  right: `${(60 / panel.trimW) * 100}%`,
                  bottom: `${(60 / panel.trimH) * 100}%`,
                }}
              />
              {shell.screen ? (
                <div
                  className="absolute border border-[#EC388A]"
                  style={{
                    left: `${shell.screen.x * 100}%`,
                    top: `${shell.screen.y * 100}%`,
                    width: `${shell.screen.w * 100}%`,
                    height: `${shell.screen.h * 100}%`,
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[#03002C]/70">{shell.note}</p>
      <p className="mt-1 font-mono text-[11px] text-[#03002C]/60">
        Full wall at true {panel.trimW} × {panel.trimH} mm proportion
        {shell.hasScreen
          ? ` · ${boothScreenDiagonalIn(shell)} in 16:9 display at measured mounting position`
          : " · no display fitted"}
      </p>
      {guides ? (
        <p className="mt-1 font-mono text-[11px] text-[#03002C]/60">
          Yellow = trim {panel.trimW} × {panel.trimH} mm · pink dash = {panel.bleedEdge} mm bleed ·
          green = 60 mm safe area{shell.screen ? " · pink = monitor keep-clear" : ""}
        </p>
      ) : null}
      <p className="mt-1 font-mono text-[11px] text-[#03002C]/50">{DISCLAIMER}</p>
    </section>
  );
}
