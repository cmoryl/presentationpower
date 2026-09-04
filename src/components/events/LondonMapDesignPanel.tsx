// Design controls for the London floor maps — look and colour, sheet setup,
// titles and notes, pins and labels. Everything here writes into one MapDesign
// object, which the interactive map previews and every export reads, so the
// sheet on screen is the sheet that prints.

import { RotateCcw } from "lucide-react";

import {
  DEFAULT_MAP_DESIGN,
  MAP_ACCENT_SWATCHES,
  MAP_THEME_LABEL,
  mapPalette,
  type MapDesign,
  type MapLabelMode,
  type MapLegendMode,
  type MapOrientation,
  type MapPaper,
  type MapPinShape,
  type MapThemeId,
} from "@/lib/next-london-floormap-design";
import { MAP_LOGO_LABEL, type MapLogoId } from "@/lib/next-london-floormap-logos";
import { LONDON_VENUE } from "@/lib/next-london-signage";

export type LondonMapDesignPanelProps = {
  design: MapDesign;
  onChange: (next: MapDesign) => void;
  /** Attendee sheets have no pins, so the pin group is hidden. */
  roomsOnly?: boolean;
};

const chip =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors";
const on = "border-[#003FC7] bg-[#003FC7] text-white";
const off = "border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]";
const label =
  "block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#03002C]/55";
const field =
  "mt-1 w-full rounded-lg border border-[#03002C]/15 bg-white px-2.5 py-1.5 text-[12.5px] text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#03002C]/10 pt-3.5 first:border-0 first:pt-0">
      <h4 className={label}>{title}</h4>
      <div className="mt-2.5 space-y-2.5">{children}</div>
    </section>
  );
}

function Slider({
  id,
  title,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  id: string;
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[12px] font-medium text-[#03002C]/75">
          {title}
        </label>
        <span className="font-mono text-[11px] tabular-nums text-[#03002C]/55">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[#003FC7]"
      />
    </div>
  );
}

function Toggle({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${chip} ${active ? on : off}`}
    >
      {title}
    </button>
  );
}

export function LondonMapDesignPanel({ design, onChange, roomsOnly }: LondonMapDesignPanelProps) {
  const set = <K extends keyof MapDesign>(key: K, value: MapDesign[K]) =>
    onChange({ ...design, [key]: value });
  const palette = mapPalette(design);

  return (
    <div className="rounded-2xl border border-[#C9D5EA] bg-[#F5F8FD] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-[#03002C]">Map design</h3>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_MAP_DESIGN })}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#03002C]/20 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#03002C]/75 hover:bg-[#F2F2F2]"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <div className="mt-3.5 space-y-3.5">
        <Group title="Brand">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MAP_LOGO_LABEL) as MapLogoId[]).map((id) => (
              <Toggle
                key={id}
                title={MAP_LOGO_LABEL[id]}
                active={design.logo === id}
                onClick={() => set("logo", id)}
              />
            ))}
          </div>
          {design.logo !== "none" ? (
            <>
              <Slider
                id="map-logo-scale"
                title="Logo height"
                value={design.logoScale}
                min={12}
                max={46}
                step={1}
                suffix=" px"
                onChange={(v) => set("logoScale", v)}
              />
              <Toggle
                title="Single-ink logo"
                active={design.logoMono}
                onClick={() => set("logoMono", !design.logoMono)}
              />
            </>
          ) : null}
          <div>
            <label htmlFor="map-venue" className={label}>
              Venue name
            </label>
            <input
              id="map-venue"
              value={design.venueName}
              onChange={(e) => set("venueName", e.target.value)}
              placeholder={LONDON_VENUE.venue}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="map-event" className={label}>
              Event name
            </label>
            <input
              id="map-event"
              value={design.eventName}
              onChange={(e) => set("eventName", e.target.value)}
              placeholder="TransPerfect NEXT 2026"
              className={field}
            />
          </div>
          <Toggle
            title="Brand colour strip"
            active={design.brandBar}
            onClick={() => set("brandBar", !design.brandBar)}
          />
        </Group>

        <Group title="Look and colour">

          <div className="flex flex-wrap gap-2">
            {(Object.keys(MAP_THEME_LABEL) as MapThemeId[]).map((t) => (
              <Toggle
                key={t}
                title={MAP_THEME_LABEL[t]}
                active={design.theme === t}
                onClick={() => set("theme", t)}
              />
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="map-accent" className={label}>
                Accent override
              </label>
              <input
                id="map-accent"
                value={design.accent}
                onChange={(e) => set("accent", e.target.value.trim())}
                placeholder={palette.accent}
                spellCheck={false}
                className={`${field} font-mono`}
              />
            </div>
            <span
              aria-hidden="true"
              className="mb-0.5 block h-8 w-8 shrink-0 rounded-lg border border-[#03002C]/15"
              style={{ background: palette.accent }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MAP_ACCENT_SWATCHES.map((s) => (
              <button
                key={s.hex}
                type="button"
                title={`${s.name} ${s.hex}`}
                aria-label={`${s.name} accent`}
                aria-pressed={design.accent.toUpperCase() === s.hex}
                onClick={() => set("accent", design.accent.toUpperCase() === s.hex ? "" : s.hex)}
                className={`h-6 w-6 rounded-md border ${
                  design.accent.toUpperCase() === s.hex
                    ? "border-[#03002C] ring-2 ring-[#003FC7]/35"
                    : "border-[#03002C]/20"
                }`}
                style={{ background: s.hex }}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Toggle
              title="Room colour bars"
              active={design.roomTint}
              onClick={() => set("roomTint", !design.roomTint)}
            />
            <Toggle
              title="Metre grid"
              active={design.grid}
              onClick={() => set("grid", !design.grid)}
            />
            <Toggle
              title="Scale + north"
              active={design.compass}
              onClick={() => set("compass", !design.compass)}
            />
            <Toggle
              title="Area icons"
              active={design.icons}
              onClick={() => set("icons", !design.icons)}
            />
            <Toggle
              title="Room sizes"
              active={design.roomDims}
              onClick={() => set("roomDims", !design.roomDims)}
            />
          </div>
        </Group>

        <Group title="Sheet setup">
          <Slider
            id="map-ppm"
            title="Drawing scale"
            value={design.ppm}
            min={10}
            max={34}
            step={1}
            suffix=" px/m"
            onChange={(v) => set("ppm", v)}
          />
          <Slider
            id="map-margin"
            title="Sheet margin"
            value={design.margin}
            min={16}
            max={96}
            step={2}
            suffix=" px"
            onChange={(v) => set("margin", v)}
          />
          <div className="flex flex-wrap gap-2">
            {(["A4", "A3", "A2", "sheet"] as MapPaper[]).map((p) => (
              <Toggle
                key={p}
                title={p === "sheet" ? "Fit artwork" : p}
                active={design.paper === p}
                onClick={() => set("paper", p)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["landscape", "portrait"] as MapOrientation[]).map((o) => (
              <Toggle
                key={o}
                title={o === "landscape" ? "Landscape" : "Portrait"}
                active={design.orientation === o}
                onClick={() => set("orientation", o)}
              />
            ))}
          </div>
          <Slider
            id="map-scale"
            title="Image resolution"
            value={design.exportScale}
            min={1.5}
            max={4}
            step={0.5}
            suffix="×"
            onChange={(v) => set("exportScale", v)}
          />
        </Group>

        {roomsOnly ? null : (
          <Group title="Pins and labels">
            <div className="flex flex-wrap gap-2">
              {(["pin", "dot", "square"] as MapPinShape[]).map((s) => (
                <Toggle
                  key={s}
                  title={s === "pin" ? "Drop pin" : s === "dot" ? "Dot" : "Square"}
                  active={design.pinShape === s}
                  onClick={() => set("pinShape", s)}
                />
              ))}
            </div>
            <Slider
              id="map-pin"
              title="Pin size"
              value={design.pinScale}
              min={0.7}
              max={1.6}
              step={0.1}
              suffix="×"
              onChange={(v) => set("pinScale", v)}
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["numbered", "Numbered + index"],
                  ["named", "Names on plan"],
                  ["none", "Pins only"],
                ] as [MapLabelMode, string][]
              ).map(([m, t]) => (
                <Toggle
                  key={m}
                  title={t}
                  active={design.labelMode === m}
                  onClick={() => set("labelMode", m)}
                />
              ))}
            </div>
            <p className="text-[11.5px] leading-relaxed text-[#03002C]/55">
              Numbered pins with an index read best on busy floors; names on the plan suit sparse
              floors and single-zone sheets.
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["key", "Show key"],
                  ["none", "No key"],
                ] as [MapLegendMode, string][]
              ).map(([m, t]) => (
                <Toggle
                  key={m}
                  title={t}
                  active={design.legend === m}
                  onClick={() => set("legend", m)}
                />
              ))}
            </div>
          </Group>
        )}

        <Group title="Titles and notes">
          <Slider
            id="map-room-label"
            title="Room name size"
            value={design.roomLabelScale}
            min={0.8}
            max={1.6}
            step={0.1}
            suffix="×"
            onChange={(v) => set("roomLabelScale", v)}
          />
          {(
            [
              ["eyebrow", "Eyebrow"],
              ["title", "Title"],
              ["subtitle", "Subtitle"],
              ["legendTitle", "Key heading"],
              ["footerNote", "Footer note"],
            ] as [keyof MapDesign & string, string][]
          ).map(([key, title]) => (
            <div key={key}>
              <label htmlFor={`map-${key}`} className={label}>
                {title}
              </label>
              <input
                id={`map-${key}`}
                value={String(design[key] ?? "")}
                onChange={(e) => onChange({ ...design, [key]: e.target.value })}
                placeholder="Built-in wording"
                className={field}
              />
            </div>
          ))}
        </Group>
      </div>
    </div>
  );
}
