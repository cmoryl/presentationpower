// Bespoke scenic build pack, per floor — the units the crew installs alongside
// the printed signage, with the artwork faces we owe the print partner.
//
// The plan tiles for these units come from next-london-bespoke.ts, so anything
// listed here is also drawn on the floor sheet and printed on the plan set.

import { useState } from "react";
import { Download, Maximize2, X } from "lucide-react";

import { runWithExportFeedback } from "@/lib/export-feedback";
import {
  BESPOKE_PACK,
  bespokeFloorDrawing,
  bespokeFootprintLabel,
  bespokeSizeLabel,
  bespokeArtworkCsv,
  bespokeUnitsOnFloor,
  type BespokeUnit,
} from "@/lib/next-london-bespoke";
import { BESPOKE_RENDER_DISCLAIMER, bespokeRender } from "@/lib/next-london-bespoke-renders";
import { londonBespokeFacePanel, type LondonFloorId } from "@/lib/next-london-signage";

export type LondonBespokePanelProps = {
  floor: LondonFloorId;
  floorLabel: string;
};

function downloadCsv(units: readonly BespokeUnit[], floor: string) {
  const blob = new Blob([bespokeArtworkCsv(units)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `next-london-${floor.toLowerCase()}-scenic-artwork.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LondonBespokePanel({ floor, floorLabel }: LondonBespokePanelProps) {
  const units = bespokeUnitsOnFloor(floor);
  const drawing = bespokeFloorDrawing(floor);
  const [zoom, setZoom] = useState<{ src: string; label: string } | null>(null);

  return (
    <section className="rounded-2xl border border-black/10 bg-white/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#03002C]">
            Scenic build — {floorLabel}
          </h2>
          <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-[#03002C]/70">
            {BESPOKE_PACK.producer} GA pack, project {BESPOKE_PACK.jobCode}
            {drawing ? ` · ${drawing.title} rev ${drawing.rev}, ${drawing.date}` : ""}. Every unit
            below is drawn on this floor sheet in its scheduled room. {BESPOKE_PACK.note}
          </p>
        </div>
        {units.length ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#03002C]/25 bg-white/70 px-4 py-2 text-[13px] font-semibold text-[#03002C] transition-colors hover:bg-white"
            onClick={() =>
              runWithExportFeedback(
                {
                  pending: "Building the artwork schedule…",
                  success: "Artwork schedule downloaded",
                  failure: "Artwork schedule failed",
                },
                async () => downloadCsv(units, floor),
              )
            }
          >
            <Download className="h-4 w-4" /> Artwork schedule (CSV)
          </button>
        ) : null}
      </div>

      {!units.length ? (
        <p className="mt-4 text-[13px] text-[#03002C]/60">
          No scenic build scheduled on this floor in the Bespoke pack — signage only.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {units.map((u) => {
            const render = bespokeRender(u.id);
            return (
              <li
                key={u.id}
                className="overflow-hidden rounded-xl border border-black/10 bg-white"
              >
                {render ? (
                  <button
                    type="button"
                    className="group relative block w-full"
                    onClick={() => setZoom({ src: render, label: u.name })}
                    aria-label={`Enlarge the ${u.name} visualisation`}
                  >
                    <img
                      src={render}
                      alt={`Visualisation of the ${u.name} in place`}
                      loading="lazy"
                      width={1280}
                      height={800}
                      className="aspect-[16/10] w-full object-cover"
                    />
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#03002C]/80 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Maximize2 className="h-3 w-3" /> Enlarge
                    </span>
                  </button>
                ) : null}
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[15px] font-semibold text-[#03002C]">{u.name}</h3>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                      {u.room}
                      {u.rev ? ` · rev ${u.rev}` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-[#03002C]/70">
                    {bespokeFootprintLabel(u)}
                    {u.screensIn?.length
                      ? ` · ${u.screensIn.map((s) => `${s}"`).join(" + ")} screens`
                      : ""}
                  </p>
                  {u.notes ? (
                    <p className="mt-1 text-[12.5px] text-[#03002C]/60">{u.notes}</p>
                  ) : null}
                  <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    Parts
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {u.components.map((c) => (
                      <li
                        key={c}
                        className="rounded-full bg-[#EEF1F7] px-2.5 py-1 text-[11.5px] text-[#03002C]/80"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/55">
                    Artwork we supply
                  </p>
                  <p className="mt-1 text-[12px] text-[#03002C]/55">
                    Faces marked as a template are built by us — headline, subhead, body and logo
                    are editable in the signage editor and export as live Illustrator vector. Faces
                    with a size to confirm carry no template until Bespoke publishes the dimension.
                  </p>
                  <ul className="mt-1 space-y-1">
                    {u.artwork.map((p) => {
                      const facePanel = londonBespokeFacePanel(u.id, p.label);
                      return (
                        <li key={p.label} className="text-[12.5px] text-[#03002C]/75">
                          <span className="font-medium text-[#03002C]">
                            {p.qty > 1 ? `${p.qty} × ` : ""}
                            {p.label}
                          </span>{" "}
                          — {bespokeSizeLabel(p.wMm, p.hMm)}
                          {p.note ? (
                            <span className="text-[#03002C]/55"> · {p.note}</span>
                          ) : null}
                          {facePanel ? (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-[#003FC7]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#003FC7]">
                              Editable template · {facePanel.id}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {zoom ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#03002C]/85 p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${zoom.label} visualisation`}
          onClick={() => setZoom(null)}
        >
          <div className="max-h-full w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 pb-3">
              <p className="text-sm font-semibold text-white">{zoom.label}</p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-white/25"
                onClick={() => setZoom(null)}
              >
                <X className="h-3.5 w-3.5" /> Close
              </button>
            </div>
            <img
              src={zoom.src}
              alt={`Visualisation of the ${zoom.label} in place`}
              className="max-h-[76vh] w-full rounded-xl object-contain"
            />
            <p className="pt-3 text-[12px] text-white/70">{BESPOKE_RENDER_DISCLAIMER}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
