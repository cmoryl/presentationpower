// Gradient grounds reference for the London kit.
//
// Two listings: the house treatments, and the DIVISION-SPECIFIC grounds that
// actually print at this venue (a division accent tinted into a house ramp).
// Clicking any card opens the full colour readout — every stop with its ramp
// position, hex, RGB, HSL and luminance, the gradient axis and angle used in the
// masters, the accent and tint recipe behind a division ramp, the other approved
// tint strengths for that division, and the panels it prints on.

import { useMemo, useRef, useState } from "react";
import { Copy, Info, Layers, Palette } from "lucide-react";
import { toast } from "sonner";

import { useModalA11y } from "@/hooks/use-modal-a11y";
import { isLondonDoorItem } from "@/lib/next-london-division";
import {
  londonDivisionGrounds,
  londonHouseGrounds,
  londonTintVariants,
  type LondonColorReadout,
  type LondonGroundInfo,
} from "@/lib/next-london-gradient-info";
import type { LondonPanel } from "@/lib/next-london-signage";

const MONO = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55";

function copy(text: string, what: string) {
  void navigator.clipboard
    ?.writeText(text)
    .then(() => toast.success(`${what} copied`))
    .catch(() => toast.error(`Could not copy the ${what.toLowerCase()}`));
}

function GroundCard({ info, onOpen }: { info: LondonGroundInfo; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="overflow-hidden rounded-xl border border-black/10 bg-white text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
    >
      <div className="h-20 w-full" style={{ background: info.css }} />
      <div className="p-4">
        <p className={MONO}>{info.code}</p>
        <h3 className="mt-1 text-sm font-semibold text-[#03002C]">{info.label}</h3>
        <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-relaxed text-[#03002C]/65">
          {info.note}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {info.colors.map((c) => (
            <span
              key={`${info.key}-${c.hex}-${c.position}`}
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ background: c.hex }}
              title={c.hex}
            />
          ))}
          {info.accent ? (
            <span className="ml-1 rounded-full bg-[#03002C]/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#03002C]/70">
              {info.accent.hex}
            </span>
          ) : null}
        </div>
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#03002C]/55">
          {info.panels.length} panels · {info.colors.length} stops · {info.angle}°
          <Info className="h-3 w-3" />
        </p>
      </div>
    </button>
  );
}

function StopRow({ c }: { c: LondonColorReadout }) {
  return (
    <tr className="border-t border-black/5">
      <td className="py-1.5 pr-2">
        <span
          className="inline-block h-4 w-8 rounded border border-black/10 align-middle"
          style={{ background: c.hex }}
        />
      </td>
      <td className="py-1.5 pr-3 font-mono text-[11.5px] text-[#03002C]">{c.hex}</td>
      <td className="py-1.5 pr-3 font-mono text-[11.5px] text-[#03002C]/70">{c.position}%</td>
      <td className="py-1.5 pr-3 font-mono text-[11.5px] text-[#03002C]/70">{c.rgb}</td>
      <td className="py-1.5 pr-3 font-mono text-[11.5px] text-[#03002C]/70">{c.hsl}</td>
      <td className="py-1.5 font-mono text-[11.5px] text-[#03002C]/70">{c.luminance}</td>
    </tr>
  );
}

function GroundDetail({ info, onClose }: { info: LondonGroundInfo; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open: true, onClose, containerRef: ref });
  const variants = useMemo(() => londonTintVariants(info), [info]);
  const hexList = info.colors.map((c) => c.hex).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#03002C]/60 p-4 sm:p-8">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ground-detail-title"
        tabIndex={-1}
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={MONO}>{info.code}</p>
            <h3 id="ground-detail-title" className="mt-1 text-xl font-semibold text-[#03002C]">
              {info.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/15 px-3 py-1 text-sm font-semibold text-[#03002C] hover:bg-black/5"
          >
            Close
          </button>
        </div>

        <div
          className="mt-4 h-32 w-full rounded-xl border border-black/10"
          style={{ background: info.css }}
        />
        <p className="mt-3 text-[13px] leading-relaxed text-[#03002C]/70">{info.note}</p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            { k: "Treatment", v: info.styleLabel },
            { k: "Gradient angle", v: `${info.angle}°` },
            { k: "Stops", v: String(info.colors.length) },
            { k: "Panels", v: String(info.panels.length) },
          ].map((s) => (
            <div key={s.k}>
              <dd className="text-sm font-semibold text-[#03002C]">{s.v}</dd>
              <dt className={MONO}>{s.k}</dt>
            </div>
          ))}
        </dl>

        <h4 className="mt-5 text-sm font-semibold text-[#03002C]">Colour stops</h4>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {["", "Hex", "Position", "RGB", "HSL", "Luminance"].map((h) => (
                  <th key={h} className={`pb-1 ${MONO}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {info.colors.map((c) => (
                <StopRow key={`${c.hex}-${c.position}`} c={c} />
              ))}
            </tbody>
          </table>
        </div>

        {info.accent && info.tint ? (
          <>
            <h4 className="mt-5 text-sm font-semibold text-[#03002C]">
              Division accent and tint recipe
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
              <span
                className="h-8 w-8 rounded-full border border-black/10"
                style={{ background: info.accent.hex }}
              />
              <div>
                <p className="text-sm font-semibold text-[#03002C]">{info.accent.label}</p>
                <p className="font-mono text-[11.5px] text-[#03002C]/70">{info.accent.hex}</p>
              </div>
              <div className="ml-auto grid grid-cols-2 gap-x-5 gap-y-1 sm:grid-cols-5">
                {[
                  { k: "Preset", v: info.tint.label },
                  { k: "Weight", v: info.tint.weight.toFixed(2) },
                  { k: "Curve", v: info.tint.curve.toFixed(2) },
                  { k: "Soften", v: info.tint.soften.toFixed(2) },
                  { k: "Guard", v: info.tint.clearance.toFixed(2) },
                ].map((s) => (
                  <div key={s.k}>
                    <p className="font-mono text-[11.5px] text-[#03002C]">{s.v}</p>
                    <p className={MONO}>{s.k}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#03002C]/65">{info.tint.note}</p>

            <h4 className="mt-5 text-sm font-semibold text-[#03002C]">
              Other approved strengths for {info.accent.label}
            </h4>
            <ul className="mt-2 space-y-2">
              {variants.map((v) => (
                <li key={v.tint.id} className="flex items-center gap-3">
                  <span
                    className="h-8 w-24 shrink-0 rounded border border-black/10"
                    style={{ background: v.css }}
                  />
                  <span className="text-[12.5px] font-semibold text-[#03002C]">{v.tint.label}</span>
                  <span className="font-mono text-[11px] text-[#03002C]/60">
                    {v.colors.map((c) => c.hex).join(" → ")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <h4 className="mt-5 text-sm font-semibold text-[#03002C]">Gradient definition</h4>
        <pre className="mt-1 overflow-x-auto rounded-xl bg-[#03002C]/[0.04] p-3 font-mono text-[11.5px] text-[#03002C]">
{info.css}
{"\n"}SVG axis (objectBoundingBox): x1={info.axis.x1} y1={info.axis.y1} x2={info.axis.x2} y2=
          {info.axis.y2}
        </pre>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copy(info.css, "Gradient CSS")}
            className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 px-4 py-1.5 text-[13px] font-semibold text-[#03002C] hover:bg-black/5"
          >
            <Copy className="h-3.5 w-3.5" /> Copy CSS
          </button>
          <button
            type="button"
            onClick={() => copy(hexList, "Hex list")}
            className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 px-4 py-1.5 text-[13px] font-semibold text-[#03002C] hover:bg-black/5"
          >
            <Copy className="h-3.5 w-3.5" /> Copy hex values
          </button>
        </div>

        <h4 className="mt-5 text-sm font-semibold text-[#03002C]">Prints on</h4>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#03002C]/70">
          {info.panels
            .slice(0, 24)
            .map((p) => p.name)
            .join(" · ")}
          {info.panels.length > 24 ? ` · +${info.panels.length - 24} more` : ""}
        </p>
      </div>
    </div>
  );
}

export function LondonGradientGrounds({ panels }: { panels: LondonPanel[] }) {
  const house = useMemo(() => londonHouseGrounds(panels), [panels]);
  const divisions = useMemo(
    () => londonDivisionGrounds(panels, (p) => isLondonDoorItem(p.room, p.name)),
    [panels],
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = [...house, ...divisions].find((g) => g.key === openKey) ?? null;

  return (
    <div className="mt-4">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-[#03002C]">
        <Palette className="h-4 w-4 text-[#003FC7]" /> House grounds
        <span className="font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-[#03002C]/55">
          {house.length} in this location
        </span>
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {house.map((info) => (
          <GroundCard key={info.key} info={info} onOpen={() => setOpenKey(info.key)} />
        ))}
      </div>

      <h3 className="mt-7 flex items-center gap-2 text-[13px] font-semibold text-[#03002C]">
        <Layers className="h-4 w-4 text-[#003FC7]" /> Division grounds
        <span className="font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-[#03002C]/55">
          {divisions.length} accent-tinted ramps
        </span>
      </h3>
      <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-[#03002C]/65">
        Each one is a house treatment with its division accent tinted into the light end only. The
        dark head of every ramp is untouched, which is what holds the white lockup at full contrast.
        Open a ground for its exact stops, colour codes and tint recipe.
      </p>
      {divisions.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[#03002C]/60">
          No division-branded panels print in this location.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {divisions.map((info) => (
            <GroundCard key={info.key} info={info} onOpen={() => setOpenKey(info.key)} />
          ))}
        </div>
      )}

      {open ? <GroundDetail info={open} onClose={() => setOpenKey(null)} /> : null}
    </div>
  );
}
