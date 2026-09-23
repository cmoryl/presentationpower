// Colour each room on a rebuilt QEII plan, and name the colours in a key.
//
// The panel works the way a marker pen does: pick up a colour once, then click
// the rooms that take it. Only the approved palette is offered. Rooms the issued
// artwork draws as one shape are marked plainly, because their colour shows as a
// tag behind the room name instead of filling the space.

import { useMemo, useState } from "react";
import { Check, RotateCcw, Search, Wand2, X } from "lucide-react";

import {
  QEII_ROOM_GRADIENTS,
  QEII_ROOM_PALETTE,
  qeiiGradientKey,
  qeiiColourByFunction,
  qeiiColourKey,
  qeiiRoomDivisionAccent,
  qeiiRoomDivisionName,
  qeiiRoomFunction,
  qeiiRoomIsExclusive,
  qeiiRoomShapes,
  qeiiRoomTextInk,
  type QeiiRoomColours,
} from "@/lib/next-london-qeii-rooms";
import type { QeiiFloorVector } from "@/lib/next-london-qeii-vectors";

export type QeiiRoomColourPanelProps = {
  floor: QeiiFloorVector;
  colours: QeiiRoomColours;
  onColours: (next: QeiiRoomColours) => void;
  keyLabels: Record<string, string>;
  onKeyLabels: (next: Record<string, string>) => void;
  /** Fill every room with its division's accent and switch the lockups to all white. */
  onColourByDivision?: () => void;
};

/** What the brush is holding: an approved colour, each room's own division accent, or nothing. */
type Brush =
  | { kind: "colour"; hex: string; label: string }
  | { kind: "gradient"; from: string; to: string; label: string }
  | { kind: "division" } | { kind: "none" };

const pill =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]";

/** Plain name for a colour already on the plan. */
function colourName(hex: string): string {
  return QEII_ROOM_PALETTE.find((s) => s.hex.toLowerCase() === hex.toLowerCase())?.label ?? hex;
}

export function QeiiRoomColourPanel({
  floor,
  colours,
  onColours,
  keyLabels,
  onKeyLabels,
  onColourByDivision,
}: QeiiRoomColourPanelProps) {
  const rooms = useMemo(() => qeiiRoomShapes(floor), [floor]);
  const keyRows = useMemo(
    () => qeiiColourKey(floor, colours, keyLabels),
    [floor, colours, keyLabels],
  );
  const [brush, setBrush] = useState<Brush>({
    kind: "colour",
    hex: QEII_ROOM_PALETTE[0]!.hex,
    label: QEII_ROOM_PALETTE[0]!.label,
  });
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter(
      (entry) =>
        entry.room.toLowerCase().includes(q) ||
        (qeiiRoomFunction(entry.room, floor.id) ?? "").toLowerCase().includes(q) ||
        (qeiiRoomDivisionName(entry.room, floor.id) ?? "").toLowerCase().includes(q),
    );
  }, [rooms, query, floor.id]);

  const colouredCount = rooms.filter((entry) => colours[entry.room]).length;

  function write(next: QeiiRoomColours, room: string, hex?: string, to?: string) {
    if (hex) next[room] = hex;
    else delete next[room];
    if (hex && to) next[qeiiGradientKey(room)] = to;
    else delete next[qeiiGradientKey(room)];
  }

  function set(room: string, hex?: string, to?: string) {
    const next = { ...colours };
    write(next, room, hex, to);
    onColours(next);
  }

  /** Paint one room with whatever the brush is holding. */
  function paint(room: string) {
    if (brush.kind === "none") return set(room);
    if (brush.kind === "division") return set(room, qeiiRoomDivisionAccent(room, floor.id));
    if (brush.kind === "gradient") return set(room, brush.from, brush.to);
    return set(room, brush.hex);
  }

  /** Paint every room currently listed, so a search becomes a batch. */
  function paintShown() {
    const next = { ...colours };
    for (const entry of shown) {
      if (brush.kind === "none") write(next, entry.room);
      else if (brush.kind === "division") {
        const accent = qeiiRoomDivisionAccent(entry.room, floor.id);
        if (accent) write(next, entry.room, accent);
      } else if (brush.kind === "gradient") write(next, entry.room, brush.from, brush.to);
      else write(next, entry.room, brush.hex);
    }
    onColours(next);
  }

  /** Take one colour off every room that carries it. */
  function clearColour(hex: string) {
    const next = { ...colours };
    for (const room of Object.keys(next)) {
      if (room.startsWith("gradient-to:")) continue;
      if (next[room]?.toLowerCase() === hex.toLowerCase()) write(next, room);
    }
    onColours(next);
    const labels = { ...keyLabels };
    delete labels[hex];
    onKeyLabels(labels);
  }

  const brushLabel =
    brush.kind === "colour" || brush.kind === "gradient"
      ? brush.label
      : brush.kind === "division"
        ? "each room’s division accent"
        : "no colour";

  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
      {/* Step 1 — pick up a colour. */}
      <div className="rounded-xl border border-[#003FC7]/20 bg-[#EEF1F7] p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-[13px] font-semibold tracking-tight text-[#03002C]">
            1 · Pick a colour
          </h4>
          <p className="text-[11.5px] text-[#03002C]/70">
            Holding <strong className="font-semibold text-[#03002C]">{brushLabel}</strong> — now
            click the rooms below.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {QEII_ROOM_PALETTE.map((swatch) => {
            const on = brush.kind === "colour" && brush.hex === swatch.hex;
            return (
              <button
                key={swatch.id}
                type="button"
                aria-pressed={on}
                title={swatch.label}
                onClick={() => setBrush({ kind: "colour", hex: swatch.hex, label: swatch.label })}
                style={{ backgroundColor: swatch.hex, color: qeiiRoomTextInk(swatch.hex) }}
                className={`${pill} ${on ? "border-[#03002C] ring-2 ring-[#003FC7]/40" : "border-black/15"}`}
              >
                {on ? <Check className="h-3.5 w-3.5" /> : null}
                {swatch.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
            Gradients
          </span>
          {QEII_ROOM_GRADIENTS.map((g) => {
            const on = brush.kind === "gradient" && brush.from === g.from && brush.to === g.to;
            return (
              <button
                key={g.id}
                type="button"
                aria-pressed={on}
                title={g.label}
                onClick={() => setBrush({ kind: "gradient", from: g.from, to: g.to, label: g.label })}
                style={{
                  backgroundImage: `linear-gradient(45deg, ${g.from}, ${g.to})`,
                  color: qeiiRoomTextInk(g.from),
                }}
                className={`${pill} ${on ? "border-[#03002C] ring-2 ring-[#003FC7]/40" : "border-black/15"}`}
              >
                {on ? <Check className="h-3.5 w-3.5" /> : null}
                {g.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={brush.kind === "division"}
            onClick={() => setBrush({ kind: "division" })}
            className={`${pill} ${
              brush.kind === "division"
                ? "border-[#03002C] bg-[#03002C] text-white"
                : "border-black/15 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
            }`}
          >
            Division accent
          </button>
          <button
            type="button"
            aria-pressed={brush.kind === "none"}
            onClick={() => setBrush({ kind: "none" })}
            className={`${pill} ${
              brush.kind === "none"
                ? "border-[#03002C] bg-[#03002C] text-white"
                : "border-black/15 bg-white text-[#03002C] hover:bg-[#F2F2F2]"
            }`}
          >
            Rubber (clear)
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-[13px] font-semibold tracking-tight text-[#03002C]">
              2 · Click a room{" "}
              <span className="font-normal text-[#03002C]/60">
                ({colouredCount} of {rooms.length} coloured)
              </span>
            </h4>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={paintShown}
                className={`${pill} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
              >
                {query.trim() ? `Apply to these ${shown.length}` : "Apply to every room"}
              </button>
              <button
                type="button"
                onClick={() => onColours(qeiiColourByFunction(floor))}
                className={`${pill} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
              >
                <Wand2 className="h-3.5 w-3.5" /> By function
              </button>
              {onColourByDivision ? (
                <button
                  type="button"
                  onClick={onColourByDivision}
                  className={`${pill} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
                >
                  <Wand2 className="h-3.5 w-3.5" /> By division
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onColours({});
                  onKeyLabels({});
                }}
                className={`${pill} border-[#03002C]/20 bg-white text-[#03002C] hover:bg-[#F2F2F2]`}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear all
              </button>
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-xl border border-black/15 px-3 py-2 focus-within:border-[#003FC7]">
            <Search aria-hidden className="h-4 w-4 text-[#03002C]/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a room, a function or a division"
              aria-label="Find a room"
              className="w-full bg-transparent text-[12.5px] text-[#03002C] placeholder:text-[#03002C]/40 focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear the search"
                className="rounded-full p-0.5 text-[#03002C]/60 hover:bg-[#F2F2F2]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </label>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {shown.map((entry) => {
              const fn = qeiiRoomFunction(entry.room, floor.id);
              const chosen = colours[entry.room];
              const division = qeiiRoomDivisionName(entry.room, floor.id);
              return (
                <li key={`${entry.room}-${entry.shapeIndex}`}>
                  <div className="flex items-stretch gap-1">
                    <button
                      type="button"
                      onClick={() => paint(entry.room)}
                      title={`Give ${entry.room} ${brushLabel}`}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-left hover:border-[#003FC7] hover:bg-[#EEF1F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
                    >
                      <span
                        aria-hidden
                        style={{ backgroundColor: chosen ?? "transparent" }}
                        className={`h-7 w-7 shrink-0 rounded-lg border ${
                          chosen ? "border-black/15" : "border-dashed border-black/25"
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[#03002C]">
                          {entry.room}
                        </span>
                        <span className="block truncate text-[11px] text-[#03002C]/60">
                          {chosen ? colourName(chosen) : "No colour yet"}
                          {fn ? ` · ${fn}` : ""}
                          {division ? ` · ${division}` : ""}
                          {qeiiRoomIsExclusive(entry) ? "" : " · colours as a name tag"}
                        </span>
                      </span>
                    </button>
                    {chosen ? (
                      <button
                        type="button"
                        onClick={() => set(entry.room)}
                        aria-label={`Take the colour off ${entry.room}`}
                        title={`Take the colour off ${entry.room}`}
                        className="shrink-0 rounded-xl border border-black/10 px-2 text-[#03002C]/60 hover:bg-[#F2F2F2]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {!shown.length ? (
            <p className="mt-3 text-[12px] text-[#03002C]/60">
              No room on this floor matches “{query}”.
            </p>
          ) : null}
        </div>

        <div>
          <h4 className="text-[13px] font-semibold tracking-tight text-[#03002C]">
            3 · Name the key
          </h4>
          {keyRows.length ? (
            <>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#03002C]/60">
                What each colour means. The key prints beneath the plan and travels with every
                download.
              </p>
              <ul className="mt-3 space-y-2.5">
                {keyRows.map((row) => (
                  <li
                    key={row.hex}
                    className="rounded-xl border border-black/10 bg-white p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        style={{ backgroundColor: row.hex }}
                        className="h-7 w-7 shrink-0 rounded-lg border border-black/15"
                      />
                      <input
                        value={keyLabels[row.hex] ?? ""}
                        placeholder={row.label}
                        onChange={(e) => onKeyLabels({ ...keyLabels, [row.hex]: e.target.value })}
                        aria-label={`What the ${colourName(row.hex)} colour means`}
                        className="w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-[12.5px] text-[#03002C] focus:border-[#003FC7] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => clearColour(row.hex)}
                        aria-label={`Take ${colourName(row.hex)} off every room`}
                        title={`Take ${colourName(row.hex)} off every room`}
                        className="shrink-0 rounded-lg border border-black/10 p-1.5 text-[#03002C]/60 hover:bg-[#F2F2F2]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#03002C]/60">
                      {row.rooms.length} room{row.rooms.length === 1 ? "" : "s"} ·{" "}
                      {row.rooms.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-[12px] leading-relaxed text-[#03002C]/60">
              Nothing coloured yet. Pick a colour above and click a room, or start from “By
              function” to colour the floor by what each space holds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
